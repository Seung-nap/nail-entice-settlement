// 앱 상태 — 데이터(원본) → 통합문서 정의 → HyperFormula 엔진. 변경은 셀 단위 diff로 실시간 반영.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppData, Entry, emptyData, uid, PAY_KEYS, PayKey, UNASSIGNED, DEFAULT_SETTINGS } from './lib/model';
import { buildWorkbook, Built, SH, SETTINGS_LAYOUT } from './lib/workbook';
import { Engine, rawOf, normalize } from './lib/engine';
import { mergeLines, parseSalesWorkbook, ParseResult, dateToSerial, serialToIso, monthKeyOf } from './lib/data';
import { exportWorkbook } from './lib/exporter';

declare global {
  interface Window {
    api?: {
      load: () => Promise<string | null>;
      save: (json: string) => Promise<void>;
      saveSync: (json: string) => void;
      backup: (json: string, tag: string) => Promise<void>;
      saveFile: (name: string, data: ArrayBuffer, kind: 'xlsx' | 'json') => Promise<string | null>;
      openDataFolder: () => Promise<void>;
      platform: string;
    };
  }
}

const LS_KEY = 'nail-entice-data-v1';

async function loadData(): Promise<AppData> {
  try {
    const raw = window.api ? await window.api.load() : localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw) as AppData;
      const base = emptyData();
      return { ...base, ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings, payLabels: { ...DEFAULT_SETTINGS.payLabels, ...d.settings?.payLabels }, payRates: { ...DEFAULT_SETTINGS.payRates, ...d.settings?.payRates } } };
    }
  } catch (e) { console.warn('load failed', e); }
  return emptyData();
}
let saveTimer: number | undefined;
let pendingSave: AppData | null = null;
function saveData(d: AppData) {
  pendingSave = d;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    pendingSave = null;
    const json = JSON.stringify(d);
    if (window.api) window.api.save(json); else try { localStorage.setItem(LS_KEY, json); } catch { /* 용량 초과 */ }
  }, 250);
}
// 창을 닫을 때 아직 저장 안 된 변경을 동기로 기록
window.addEventListener('beforeunload', () => {
  if (!pendingSave) return;
  const json = JSON.stringify(pendingSave); pendingSave = null;
  if (window.api) window.api.saveSync(json); else try { localStorage.setItem(LS_KEY, json); } catch { /* */ }
});

export type MonthSel = number | 'all';
export interface Toast { id: string; text: string; tone?: 'ok' | 'warn' | 'err'; icon?: string; }

interface Ctx {
  ready: boolean;
  computing: string | null;
  data: AppData;
  built: Built | null;
  eng: Engine | null;
  tick: number;
  month: MonthSel;
  setMonth: (m: MonthSel) => void;
  months: number[];
  prepareImport: (f: File) => Promise<ParseResult & { replaced: number; fileName: string }>;
  commitImport: (pr: ParseResult & { fileName: string }) => Promise<void>;
  update: (fn: (d: AppData) => void, msg?: string) => void;
  addEntry: (e: Omit<Entry, 'id'>) => void;
  editCell: (sheet: string, r: number, c: number, input: string) => string | null;
  exportXlsx: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone'], icon?: string) => void;
  sv: (key: string, m?: MonthSel) => number;   // 월말정산 값 읽기
}

const C = createContext<Ctx>(null!);
export const useApp = () => useContext(C);

/** 두 정의의 '구조'가 같은지 — 같으면 셀 diff만으로 반영 가능 */
function sameShape(a: Built, b: Built) {
  if (a.months.join() !== b.months.join() || a.sheets.length !== b.sheets.length) return false;
  for (let i = 0; i < a.sheets.length; i++) {
    const x = a.sheets[i], y = b.sheets[i];
    if (x.name !== y.name) return false;
    if (x.bind.type === 'entries' || x.bind.type === 'free') continue; // 입력 시트는 행 수가 바뀌어도 OK
    if (x.rows.length !== y.rows.length) return false;
  }
  return true;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [computing, setComputing] = useState<string | null>('정산 준비 중');
  const [tick, setTick] = useState(0);
  const [month, setMonth] = useState<MonthSel>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const builtRef = useRef<Built | null>(null);
  const engRef = useRef<Engine | null>(null);
  const dataRef = useRef(data);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok', icon?: string) => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, text, tone, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const fullRebuild = useCallback(async (d: AppData, label = '정산 계산 중') => {
    setComputing(label);
    await new Promise((r) => setTimeout(r, 60)); // 오버레이가 먼저 그려지도록
    const built = buildWorkbook(d);
    engRef.current?.destroy();
    engRef.current = new Engine(built);
    builtRef.current = built;
    if (import.meta.env.DEV) (window as any).__app = { eng: engRef.current, built };
    setComputing(null);
    setTick((t) => t + 1);
  }, []);

  /** 데이터 변경 → 새 정의 생성 → 구조 같으면 셀 diff, 다르면 전체 재구축 */
  const apply = useCallback((d: AppData) => {
    dataRef.current = d;
    setData(d);
    saveData(d);
    const old = builtRef.current, eng = engRef.current;
    const next = buildWorkbook(d);
    if (!old || !eng || !sameShape(old, next)) { fullRebuild(d); return; }
    next.sheets.forEach(normalize);
    eng.hf.batch(() => {
      next.sheets.forEach((s, i) => {
        const o = old.sheets[i];
        const sid = eng.sheetId(s.name);
        const h = Math.max(s.rows.length, o.rows.length);
        for (let r = 0; r < h; r++) {
          const w = Math.max(s.rows[r]?.length ?? 0, o.rows[r]?.length ?? 0);
          for (let c = 0; c < w; c++) {
            const a = rawOf(o.rows[r]?.[c]), b = rawOf(s.rows[r]?.[c]);
            if (a !== b) eng.hf.setCellContents({ sheet: sid, row: r, col: c }, [[b]]);
          }
        }
      });
    });
    eng.built = next;
    builtRef.current = next;
    if (import.meta.env.DEV) (window as any).__app = { eng, built: next };
    setTick((t) => t + 1);
  }, [fullRebuild]);

  useEffect(() => {
    (async () => {
      const d = await loadData();
      // 개발용: ?demo 로 열면 샘플 엑셀 자동 로드
      if (import.meta.env.DEV && location.search.includes('demo') && !d.lines.length) {
        try {
          const res = await fetch('/data-sample/' + encodeURIComponent('네일엔티스_20261012041258.xlsx'));
          const pr = await parseSalesWorkbook(await res.arrayBuffer());
          d.lines = mergeLines([], pr).merged; d.sourceName = 'demo'; d.importedAt = new Date().toISOString();
        } catch (e) { console.warn(e); }
      }
      dataRef.current = d; setData(d);
      await fullRebuild(d, '정산 준비 중');
      const b = builtRef.current!;
      const now = new Date(); const cur = now.getFullYear() * 100 + now.getMonth() + 1;
      setMonth(b.months.includes(cur) ? cur : b.months[b.months.length - 1] ?? 'all');
      setReady(true);
    })();
  }, [fullRebuild]);

  const update = useCallback((fn: (d: AppData) => void, msg?: string) => {
    const d = structuredClone(dataRef.current);
    fn(d);
    apply(d);
    if (msg) toast(msg);
  }, [apply, toast]);

  const prepareImport = useCallback(async (f: File) => {
    const pr = await parseSalesWorkbook(await f.arrayBuffer());
    const { replaced } = mergeLines(dataRef.current.lines, pr);
    return { ...pr, replaced, fileName: f.name };
  }, []);

  const commitImport = useCallback(async (pr: ParseResult & { fileName: string }) => {
    const cur = dataRef.current;
    if (window.api && cur.lines.length) await window.api.backup(JSON.stringify(cur), 'before-import');
    const d = structuredClone(cur);
    d.lines = mergeLines(cur.lines, pr).merged;
    d.importedAt = new Date().toISOString();
    d.sourceName = pr.fileName;
    dataRef.current = d; setData(d); saveData(d);
    await fullRebuild(d, '매출을 정산하는 중');
    const b = builtRef.current!;
    const last = b.months.filter((m) => m <= monthKeyOf(serialToIso(pr.maxDt))).pop();
    if (last) setMonth(last);
    toast(`매출 ${pr.lines.length.toLocaleString()}건을 반영했어요`, 'ok', 'sparkle');
  }, [fullRebuild, toast]);

  const addEntry = useCallback((e: Omit<Entry, 'id'>) => {
    update((d) => { d.entries.push({ ...e, id: uid() }); }, `${e.kind === '수입' ? '수입' : '지출'} ${e.amount.toLocaleString()}원을 기록했어요`);
  }, [update]);

  /** 스프레드시트 셀 편집 → 원본 데이터에 반영. 반환: 오류 메시지 또는 null */
  const editCell = useCallback((sheet: string, r: number, c: number, input: string): string | null => {
    const b = builtRef.current; if (!b) return '준비 중';
    const def = b.sheets.find((s) => s.name === sheet)!;
    const bind = def.bind;
    const t = input.trim();
    const parseMoney = (s: string) => { const n = Number(s.replace(/[,\s원₩]/g, '')); return Number.isFinite(n) ? n : NaN; };
    const parseRate = (s: string) => {
      const pctSign = s.includes('%'); const n = Number(s.replace(/[%\s,]/g, ''));
      if (!Number.isFinite(n)) return NaN;
      return pctSign || n >= 0.1 ? n / 100 : n; // 0.4 → 0.4% 로 해석 (수수료가 10%를 넘을 일은 없다)
    };
    const parseDate = (s: string) => {
      let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
      if (m) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
      m = s.match(/^(\d{1,2})[-./](\d{1,2})$/);
      if (m) { const y = typeof month === 'number' ? Math.floor(month / 100) : new Date().getFullYear(); return `${y}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`; }
      if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 30000) return serialToIso(Number(s));
      return null;
    };
    if (bind.type === 'free') {
      update((d) => {
        if (!Object.keys(d.freeSheet).length) // 처음 편집이면 화면에 보이던 예시 내용을 먼저 보존
          def.rows.forEach((row, ri) => row.forEach((cell, ci) => { if (cell?.v != null && cell.v !== '') d.freeSheet[`${ri},${ci}`] = String(cell.v); }));
        if (t === '') delete d.freeSheet[`${r},${c}`]; else d.freeSheet[`${r},${c}`] = input;
        if (!Object.keys(d.freeSheet).length) d.freeSheet['0,0'] = '';
      });
      return null;
    }
    if (bind.type === 'cardAssign') {
      if (c !== bind.col || r < bind.startRow) return '이 칸은 자동 계산돼요';
      const key = bind.keys[r - bind.startRow]; if (!key) return null;
      const names = [UNASSIGNED, ...dataRef.current.settings.cards.map((x) => x.name)];
      const hit = names.find((n) => n === t) ?? names.find((n) => t && n.includes(t));
      if (!hit) return `카드사 목록에 없어요: ${names.join(', ')}`;
      update((d) => { if (hit === UNASSIGNED) delete d.cardAssign[key]; else d.cardAssign[key] = hit; });
      return null;
    }
    if (bind.type === 'settings') {
      const { PAY_ROW, CARD_TOP } = SETTINGS_LAYOUT;
      const payKey = (Object.keys(PAY_ROW) as PayKey[]).find((k) => PAY_ROW[k] === r);
      if (payKey && (c === 1 || c === 2)) {
        if (c === 1) { update((d) => { d.settings.payLabels[payKey] = t || payKey; }); return null; }
        const v = parseRate(t); if (isNaN(v)) return '수수료율은 0.4% 처럼 입력해주세요';
        update((d) => { d.settings.payRates[payKey] = v; }); return null;
      }
      const ci = r - CARD_TOP - 1;
      if (ci >= 0 && ci < dataRef.current.settings.cards.length && (c === 0 || c === 1)) {
        if (c === 0) {
          if (!t) return '카드사 이름을 입력해주세요';
          const oldName = dataRef.current.settings.cards[ci].name;
          update((d) => { d.settings.cards[ci].name = t; for (const k in d.cardAssign) if (d.cardAssign[k] === oldName) d.cardAssign[k] = t; });
          return null;
        }
        const v = parseRate(t); if (isNaN(v)) return '수수료율은 0.4% 처럼 입력해주세요';
        update((d) => { d.settings.cards[ci].rate = v; }); return null;
      }
      return '이 칸은 수정할 수 없어요';
    }
    if (bind.type === 'entries') {
      if (r < bind.startRow) return '머리글은 수정할 수 없어요';
      const id = bind.ids[r - bind.startRow];
      const fields = ['date', 'kind', 'group', 'item', 'title', 'amount', 'method', 'recurring', 'memo'] as const;
      const field = fields[c]; if (!field) return null;
      let value: unknown = t;
      if (field === 'date') { const d = parseDate(t); if (!d) return '날짜는 2026-10-12 처럼 입력해주세요'; value = d; }
      if (field === 'amount') { const n = parseMoney(t); if (isNaN(n)) return '금액은 숫자로 입력해주세요'; value = n; }
      if (field === 'kind') { if (!['지출', '수입'].includes(t)) return '구분은 "지출" 또는 "수입"'; }
      if (field === 'recurring') value = /^(y|yes|o|1|true|예|고정|✓)$/i.test(t);
      if (id) {
        update((d) => {
          const e = d.entries.find((x) => x.id === id); if (!e) return;
          if (field === 'title' && t === '' && c === 4) { /* 내용 비우기 허용 */ }
          (e as any)[field] = value;
        });
      } else {
        if (t === '') return null;
        const today = typeof month === 'number' ? `${Math.floor(month / 100)}-${String(month % 100).padStart(2, '0')}-01` : new Date().toISOString().slice(0, 10);
        const e: Entry = { id: uid(), date: today, kind: '지출', group: '기타 지출', item: '기타', title: '', amount: 0, method: '카드', recurring: false, memo: '' };
        (e as any)[field] = value;
        update((d) => { d.entries.push(e); }, '새 줄을 추가했어요');
      }
      return null;
    }
    return '자동 계산 시트예요 — 원본(수입지출·설정·방문내역 카드사)을 수정하면 바로 반영돼요';
  }, [update, month]);

  const exportXlsx = useCallback(async () => {
    const b = builtRef.current, eng = engRef.current; if (!b || !eng) return;
    setComputing('엑셀 파일 만드는 중');
    await new Promise((r) => setTimeout(r, 50));
    try {
      const buf = await exportWorkbook(b, eng);
      const ts = new Date(); const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}`;
      const name = `네일엔티스_월말정산_${stamp}.xlsx`;
      if (window.api) {
        const p = await window.api.saveFile(name, buf, 'xlsx');
        if (p) toast('엑셀로 저장했어요 — 수식이 그대로 살아있어요', 'ok', 'download');
      } else {
        const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('엑셀 파일을 내려받았어요', 'ok', 'download');
      }
    } catch (e: any) { toast(`내보내기 실패: ${e.message}`, 'err'); }
    setComputing(null);
  }, [toast]);

  const sv = useCallback((key: string, m: MonthSel = month) => {
    const b = builtRef.current, eng = engRef.current; if (!b || !eng) return 0;
    const r = b.summaryRow[key]; if (r == null) return 0;
    const c = m === 'all' ? b.months.length + 1 : b.summaryCol(m);
    if (c < 1) return 0;
    return eng.num(SH.M, r, c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tick]);

  const value = useMemo<Ctx>(() => ({
    ready, computing, data, built: builtRef.current, eng: engRef.current, tick, month, setMonth,
    months: builtRef.current?.months ?? [], prepareImport, commitImport, update, addEntry, editCell, exportXlsx, toasts, toast, sv,
  }), [ready, computing, data, tick, month, prepareImport, commitImport, update, addEntry, editCell, exportXlsx, toasts, toast, sv]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export { PAY_KEYS, dateToSerial };
