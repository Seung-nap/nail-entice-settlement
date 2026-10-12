// 엑셀 업로드 파싱 · 방문(고객 1회 방문) 묶기 · 집계 유틸
import ExcelJS from 'exceljs';
import { PAY_KEYS, PayKey, SaleLine, Visit, AppData } from './model';

const EPOCH = Date.UTC(1899, 11, 30);
export const toSerial = (y: number, m: number, d: number, h = 0, mi = 0) => (Date.UTC(y, m - 1, d, h, mi) - EPOCH) / 86400000;
export function serialToParts(s: number) {
  const dt = new Date(EPOCH + Math.round(s * 86400000));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), wd: dt.getUTCDay() };
}
export const pad = (n: number) => String(n).padStart(2, '0');
export const dateToSerial = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return toSerial(y, m, d); };
export const serialToIso = (s: number) => { const p = serialToParts(s); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const monthKeyOf = (iso: string) => Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7));
export const monthLabel = (k: number) => `${Math.floor(k / 100)}.${pad(k % 100)}`;
export const monthShort = (k: number) => `${k % 100}월`;
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** 시술명 정규화 — 공백 정리, '전체' 표기 통일 */
export function normService(s: string) {
  let t = String(s ?? '').replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*\(\s*/g, ' (').replace(/\s*\)/g, ')');
  t = t.replace(/^(.*\S)\s+(전체|\d+개)$/, '$1 ($2)');
  return t || '(시술명 없음)';
}

const HEADER: Record<string, string[]> = {
  dt: ['판매일시', '일시', '결제일시', '판매일'],
  customer: ['고객명', '이름'],
  phone: ['휴대폰', '연락처', '전화번호'],
  cat: ['구분1차', '구분'],
  service: ['구분2차', '시술명', '상품명'],
  unit: ['단가'],
  qty: ['개수', '수량'],
  point: ['포인트차감'],
  paid: ['결제액(받을금액)', '결제액', '받을금액'],
  total: ['총금액'],
  cash: ['현금'], card: ['카드'], transfer: ['계좌이체'], naver: ['네이버페이'],
  etc1: ['기타1'], etc2: ['기타2'], etc3: ['기타3'], etc4: ['기타4'], etc5: ['기타5'], posDisc: ['할인'],
  unpaid: ['미수'], memo: ['메모'],
};

const num = (v: unknown) => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v && 'result' in (v as any)) return num((v as any).result);
  const n = Number(String(v).replace(/[,\s원]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as any;
    if (o.richText) return o.richText.map((r: any) => r.text).join('');
    if ('result' in o) return str(o.result);
    if (o.text) return String(o.text);
  }
  return String(v);
};

function parseDt(v: unknown): { serial: number; text: string } | null {
  if (v instanceof Date) {
    const s = toSerial(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes());
    return { serial: s, text: fmtDt(s) };
  }
  if (typeof v === 'number') return { serial: v, text: fmtDt(v) };
  const m = str(v).trim().match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const s = toSerial(+m[1], +m[2], +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  return { serial: s, text: fmtDt(s) };
}
export const fmtDt = (s: number) => { const p = serialToParts(s); return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`; };

export interface ParseResult { lines: SaleLine[]; warnings: string[]; minDt: number; maxDt: number; sheetName: string; }

export async function parseSalesWorkbook(buf: ArrayBuffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const warnings: string[] = [];
  for (const ws of wb.worksheets) {
    // 헤더 행 찾기(처음 10행 중 '판매일시'+'고객명' 이 있는 행)
    let headerRow = -1; let map: Record<string, number> = {};
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const vals = (ws.getRow(r).values as unknown[]).map((v) => str(v).trim());
      const m: Record<string, number> = {};
      for (const [key, names] of Object.entries(HEADER)) {
        const idx = vals.findIndex((v) => names.includes(v));
        if (idx > 0) m[key] = idx;
      }
      if (m.dt && m.customer && (m.paid || m.total)) { headerRow = r; map = m; break; }
    }
    if (headerRow < 0) continue;
    const lines: SaleLine[] = [];
    let minDt = Infinity, maxDt = -Infinity;
    ws.eachRow((row, r) => {
      if (r <= headerRow) return;
      const g = (k: string) => (map[k] ? row.getCell(map[k]).value : null);
      const d = parseDt(g('dt'));
      if (!d) return;
      const pay = {} as Record<PayKey, number>;
      pay.cash = num(g('cash')); pay.card = num(g('card')); pay.transfer = num(g('transfer')); pay.naver = num(g('naver'));
      pay.etc1 = num(g('etc1')); pay.etc2 = num(g('etc2'));
      pay.etc3 = num(g('etc3')) + num(g('etc4')) + num(g('etc5')) + num(g('posDisc'));
      pay.unpaid = num(g('unpaid'));
      const paid = map.paid ? num(g('paid')) : num(g('total')) - num(g('point'));
      const sumPay = PAY_KEYS.reduce((a, k) => a + pay[k], 0);
      if (Math.abs(sumPay - paid) > 1) warnings.push(`${d.text} ${str(g('customer'))}: 결제수단 합(${sumPay.toLocaleString()})과 결제액(${paid.toLocaleString()})이 달라요`);
      minDt = Math.min(minDt, d.serial); maxDt = Math.max(maxDt, d.serial);
      lines.push({
        dt: d.serial, dtText: d.text,
        customer: str(g('customer')).trim() || '(미등록)',
        phone: str(g('phone')).replace(/\D/g, ''),
        cat: str(g('cat')).trim() || '기타',
        service: normService(str(g('service'))),
        unit: num(g('unit')), qty: num(g('qty')) || 1,
        point: num(g('point')), paid, pay,
        memo: str(g('memo')).trim(), visitId: '',
      });
    });
    if (!lines.length) continue;
    return { lines, warnings, minDt, maxDt, sheetName: ws.name };
  }
  throw new Error('매출 내역 시트를 찾지 못했어요. 첫 행에 "판매일시 · 고객명 · 결제액" 열이 있는 POS 매출 엑셀인지 확인해주세요.');
}

/** 업로드 병합: 업로드 파일이 덮는 기간(최소~최대 날짜)의 기존 데이터를 새 데이터로 교체 */
export function mergeLines(old: SaleLine[], incoming: ParseResult) {
  const lo = Math.floor(incoming.minDt), hi = Math.floor(incoming.maxDt) + 1;
  const kept = old.filter((l) => l.dt < lo || l.dt >= hi);
  const merged = [...kept, ...incoming.lines].sort((a, b) => a.dt - b.dt || a.phone.localeCompare(b.phone));
  return { merged, replaced: old.length - kept.length };
}

export const visitKey = (l: Pick<SaleLine, 'dtText' | 'phone' | 'customer'>) => `${l.dtText}|${l.phone || l.customer}`;
export const customerKey = (l: Pick<SaleLine, 'phone' | 'customer'>) => l.phone || `name:${l.customer}`;

/** 같은 일시·같은 고객의 시술 여러 줄 → 방문 1건 */
export function buildVisits(lines: SaleLine[]): { visits: (Visit & { key: string })[]; lines: SaleLine[] } {
  const sorted = [...lines].sort((a, b) => a.dt - b.dt || (a.phone + a.customer).localeCompare(b.phone + b.customer));
  const byKey = new Map<string, Visit & { key: string }>();
  const visits: (Visit & { key: string })[] = [];
  const outLines: SaleLine[] = [];
  for (const l of sorted) {
    const key = visitKey(l);
    let v = byKey.get(key);
    if (!v) {
      const p = serialToParts(l.dt);
      v = {
        key, id: `V${String(visits.length + 1).padStart(4, '0')}`, dt: l.dt, dtText: l.dtText, month: p.y * 100 + p.m,
        customer: l.customer, phone: l.phone, lines: [], services: '', list: 0, discount: 0, point: 0, paid: 0,
        pay: Object.fromEntries(PAY_KEYS.map((k) => [k, 0])) as Record<PayKey, number>, memo: '',
      };
      byKey.set(key, v); visits.push(v);
    }
    const line = { ...l, visitId: v.id };
    outLines.push(line);
    v.lines.push(line);
    v.list += l.unit * l.qty; v.point += l.point; v.paid += l.paid;
    v.discount += l.unit * l.qty - l.point - l.paid;
    for (const k of PAY_KEYS) v.pay[k] += l.pay[k];
    if (l.memo && !v.memo) v.memo = l.memo;
  }
  for (const v of visits) v.services = v.lines.map((l) => (l.qty > 1 ? `${l.service}×${l.qty}` : l.service)).join(' + ');
  return { visits, lines: outLines };
}

export function monthsOf(data: AppData, visits: Visit[]) {
  const s = new Set<number>(visits.map((v) => v.month));
  for (const e of data.entries) s.add(monthKeyOf(e.date));
  return [...s].sort((a, b) => a - b);
}

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const wonShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e8) return `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}억`;
  if (a >= 1e4) return `${(n / 1e4).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '')}만`;
  return Math.round(n).toLocaleString('ko-KR');
};
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
export const maskPhone = (p: string) => (p.length >= 10 ? `${p.slice(0, 3)}-${p.slice(3, p.length - 4)}-${p.slice(-4)}` : p);
