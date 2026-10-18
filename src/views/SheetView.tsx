// 앱 내장 스프레드시트 — HyperFormula 실시간 계산, 엑셀과 같은 시트·수식
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { spring } from '../components/ui';
import { colL, Fmt, SH } from '../lib/workbook';
import type { Val } from '../lib/engine';
import { serialToParts, pad } from '../lib/data';
import { parseFixedKey } from '../lib/fixed';

const RH = 28, HH = 26, RW = 46;

export function fmtVal(v: Val, f?: Fmt): { t: string; num: boolean; neg?: boolean; err?: boolean } {
  if (v == null || v === '') return { t: '', num: false };
  if (typeof v === 'object') return { t: v.error.startsWith('#') ? v.error : `#${v.error}`, num: false, err: true };
  if (typeof v === 'boolean') return { t: v ? 'TRUE' : 'FALSE', num: false };
  if (typeof v === 'string') return { t: v, num: false };
  const neg = v < 0;
  switch (f) {
    case 'won': case 'int': return { t: v === 0 ? '-' : Math.round(v).toLocaleString('ko-KR'), num: true, neg };
    case 'pct': return { t: `${(v * 100).toFixed(2)}%`, num: true, neg };
    case 'dt': { const p = serialToParts(v); return { t: `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`, num: true }; }
    case 'date': { const p = serialToParts(v); return { t: `${p.y}-${pad(p.m)}-${pad(p.d)}`, num: true }; }
    case 'month': { if (v > 100000 && v < 1000000) return { t: `${Math.floor(v / 100)}.${pad(v % 100)}`, num: true }; const p = serialToParts(v); return { t: `${p.y}.${pad(p.m)}`, num: true }; }
    case 'vid': return { t: `V${String(v).padStart(4, '0')}`, num: false };
    case 'cid': return { t: `C${String(v).padStart(3, '0')}`, num: false };
    case 'sid': return { t: `S${String(v).padStart(2, '0')}`, num: false };
    default: {
      const t = Number.isInteger(v) ? v.toLocaleString('ko-KR') : Math.abs(v) < 1 ? String(+v.toFixed(6)) : (+v.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
      return { t, num: true, neg };
    }
  }
}

type Pos = { r: number; c: number };

export default function SheetView() {
  const { built, eng, tick, editCell, exportXlsx, update, toast } = useApp();
  const [idx, setIdx] = useState(0);
  const [act, setAct] = useState<Pos>({ r: 0, c: 0 });
  const [anc, setAnc] = useState<Pos>({ r: 0, c: 0 });
  const [editing, setEditing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [scroll, setScroll] = useState({ top: 0, h: 600 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sinkRef = useRef<HTMLInputElement>(null);
  const fxRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  const composing = useRef(false);

  const sheets = built?.sheets ?? [];
  const def = sheets[idx];
  const name = def?.name ?? '';
  const dims = useMemo(() => (eng && def ? eng.size(name) : { width: 1, height: 1 }), [eng, def, name, tick]);
  const nCols = Math.max(def?.widths.length ?? 0, dims.width, def?.bind.type === 'free' ? 26 : 0) + (def?.bind.type === 'free' ? 0 : 1);
  const nRows = Math.max(dims.height, def?.rows.length ?? 0) + (def?.bind.type === 'entries' || def?.bind.type === 'free' ? 40 : 4);
  const widths = useMemo(() => Array.from({ length: nCols }, (_, c) => def?.widths[c] ?? 92), [def, nCols]);
  const xs = useMemo(() => { const a = [0]; widths.forEach((w) => a.push(a[a.length - 1] + w)); return a; }, [widths]);
  const fr = def?.freeze.r ?? 0, fc = def?.freeze.c ?? 0;

  const editable = useCallback((r: number, c: number) => {
    if (!def) return false;
    const b = def.bind;
    if (b.type === 'free') return true;
    if (b.type === 'entries') return r >= 1 && c < 9;
    return !!def.rows[r]?.[c]?.e;
  }, [def]);

  useEffect(() => { setAct({ r: fr, c: fc }); setAnc({ r: fr, c: fc }); setEditing(null); setMsg(''); scrollRef.current?.scrollTo({ top: 0, left: 0 }); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setScroll((s) => ({ ...s, h: el.clientHeight })));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => { if (editing == null) sinkRef.current?.focus({ preventScroll: true }); }, [act, editing, idx]);

  const raw = (r: number, c: number) => (eng && def ? eng.formula(name, r, c) : '');
  const ensureVisible = (p: Pos) => {
    const el = scrollRef.current; if (!el) return;
    const top = HH + p.r * RH, frozenH = HH + fr * RH;
    if (p.r >= fr) {
      if (top < el.scrollTop + frozenH) el.scrollTop = top - frozenH;
      else if (top + RH > el.scrollTop + el.clientHeight) el.scrollTop = top + RH - el.clientHeight + 2;
    }
    const left = RW + xs[p.c], frozenW = RW + xs[fc];
    if (p.c >= fc) {
      if (left < el.scrollLeft + frozenW) el.scrollLeft = left - frozenW;
      else if (left + widths[p.c] > el.scrollLeft + el.clientWidth) el.scrollLeft = left + widths[p.c] - el.clientWidth + 2;
    }
  };
  const move = (p: Pos, extend = false) => {
    const q = { r: Math.max(0, Math.min(nRows - 1, p.r)), c: Math.max(0, Math.min(nCols - 1, p.c)) };
    setAct(q); if (!extend) setAnc(q); ensureVisible(q);
  };

  const commit = (val: string, then?: Pos) => {
    const err = editCell(name, act.r, act.c, val);
    setEditing(null);
    if (sinkRef.current) sinkRef.current.value = '';
    setMsg(err ?? '');
    if (then) move(then);
  };
  const startEdit = (init?: string) => {
    if (!editable(act.r, act.c)) { setMsg(def?.bind.type === 'none' ? '자동 계산 시트예요 — 수입지출·설정·자유계산 시트나 방문내역의 [카드사] 칸에서 수정할 수 있어요' : '이 칸은 수식으로 계산돼요'); return false; }
    const v = init ?? raw(act.r, act.c);
    setEditing(v);
    if (sinkRef.current) sinkRef.current.value = v;
    return true;
  };

  const range = { r1: Math.min(act.r, anc.r), r2: Math.max(act.r, anc.r), c1: Math.min(act.c, anc.c), c2: Math.max(act.c, anc.c) };
  const inRange = (r: number, c: number) => r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;

  const copy = () => {
    if (!eng) return;
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      const cells: string[] = [];
      for (let c = range.c1; c <= range.c2; c++) { const v = eng.value(name, r, c); cells.push(v == null ? '' : typeof v === 'object' ? v.error : String(v)); }
      lines.push(cells.join('\t'));
    }
    navigator.clipboard.writeText(lines.join('\n')); toast(`${(range.r2 - range.r1 + 1) * (range.c2 - range.c1 + 1)}칸을 복사했어요`, 'ok', 'copy');
  };
  const paste = async () => {
    const txt = await navigator.clipboard.readText(); if (!txt) return;
    const rows = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
    let n = 0, err = '';
    rows.forEach((row, i) => row.forEach((v, j) => { const r = act.r + i, c = act.c + j; if (editable(r, c)) { const e = editCell(name, r, c, v); if (e) err = e; else n++; } }));
    setMsg(err); if (n) toast(`${n}칸을 붙여넣었어요`, 'ok', 'copy');
  };
  const clearRange = () => {
    let n = 0;
    for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) if (editable(r, c) && raw(r, c) !== '') {
      if (def?.bind.type === 'entries' && (c === 0 || c === 1)) continue; else { editCell(name, r, c, ''); n++; }
    }
    if (n) setMsg('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (composing.current || e.nativeEvent.isComposing) return;
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (editing != null) {
      if (k === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value, { r: act.r + (e.shiftKey ? -1 : 1), c: act.c }); }
      else if (k === 'Tab') { e.preventDefault(); commit((e.target as HTMLInputElement).value, { r: act.r, c: act.c + (e.shiftKey ? -1 : 1) }); }
      else if (k === 'Escape') { e.preventDefault(); setEditing(null); (e.target as HTMLInputElement).value = ''; }
      return;
    }
    const d: Record<string, Pos> = { ArrowUp: { r: -1, c: 0 }, ArrowDown: { r: 1, c: 0 }, ArrowLeft: { r: 0, c: -1 }, ArrowRight: { r: 0, c: 1 } };
    if (d[k]) { e.preventDefault(); const j = ctrl ? 50 : 1; move({ r: act.r + d[k].r * j, c: act.c + d[k].c * j }, e.shiftKey); return; }
    if (k === 'Enter') { e.preventDefault(); move({ r: act.r + (e.shiftKey ? -1 : 1), c: act.c }); return; }
    if (k === 'Tab') { e.preventDefault(); move({ r: act.r, c: act.c + (e.shiftKey ? -1 : 1) }); return; }
    if (k === 'F2') { e.preventDefault(); startEdit(); return; }
    if (k === 'Home') { e.preventDefault(); move({ r: ctrl ? 0 : act.r, c: 0 }); return; }
    if (k === 'PageDown' || k === 'PageUp') { e.preventDefault(); move({ r: act.r + (k === 'PageDown' ? 20 : -20), c: act.c }); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); clearRange(); return; }
    if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); copy(); return; }
    if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); paste(); return; }
    if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); setAnc({ r: 0, c: 0 }); setAct({ r: nRows - 1, c: nCols - 1 }); return; }
    if (k === 'Escape') { setMsg(''); return; }
  };
  // 타자(한글 IME 포함)는 sink input 으로 들어온다 → 입력이 생기면 편집 모드로
  const onSinkInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = (e.target as HTMLInputElement).value;
    if (editing == null) { if (!startEdit(v)) (e.target as HTMLInputElement).value = ''; }
    else setEditing(v);
  };

  if (!def || !eng) return null;

  const visStart = Math.max(fr, Math.floor((scroll.top) / RH) - 4);
  const visEnd = Math.min(nRows, Math.ceil((scroll.top + scroll.h) / RH) + 6);
  const totalW = RW + xs[nCols];

  const cellNode = (r: number, c: number) => {
    const cd = def.rows[r]?.[c];
    const v = eng.value(name, r, c);
    const f = fmtVal(v, cd?.f);
    const isAct = r === act.r && c === act.c;
    const isEd = editable(r, c);
    const ovf = (cd?.s === 'title' || cd?.s === 'sub') && !f.num;
    const cls = ['ss-c', f.num ? 'r' : '', f.neg && cd?.f === 'won' ? 'neg' : '', f.err ? 'err' : '', cd?.s ? `s-${cd.s}` : '', isEd && !cd?.s ? 'edit' : '', ovf ? 'ovf' : ''].join(' ');
    const sty: React.CSSProperties = { width: widths[c] };
    if (c < fc) { sty.position = 'sticky'; sty.left = RW + xs[c]; sty.zIndex = 2; }
    if (inRange(r, c) && !(isAct && range.r1 === range.r2 && range.c1 === range.c2)) sty.boxShadow = 'inset 0 0 0 999px rgba(74,46,31,.08)';
    if (isAct) { sty.boxShadow = 'inset 0 0 0 2px #6B4A36'; sty.position = sty.position ?? 'relative'; sty.zIndex = 3; sty.overflow = 'visible'; }
    return (
      <div key={c} className={cls} style={sty}
        onMouseDown={(e) => { if (editing != null && !isAct) commit(sinkRef.current?.value ?? ''); dragging.current = true; e.shiftKey ? setAct({ r, c }) : (setAct({ r, c }), setAnc({ r, c })); if (!isAct) setMsg(''); }}
        onMouseEnter={() => { if (dragging.current) setAct({ r, c }); }}
        onDoubleClick={() => startEdit()}>
        {isAct ? (
          <>
            <span style={{ visibility: editing != null ? 'hidden' : 'visible' }}>{f.t}</span>
            <input ref={sinkRef} className="ss-editor" defaultValue={editing ?? ''}
              style={{ left: -2, top: -2, height: RH + 3, minWidth: widths[c] + 4, width: Math.max(widths[c] + 4, (editing?.length ?? 0) * 8 + 24), opacity: editing != null ? 1 : 0, caretColor: editing != null ? undefined : 'transparent', pointerEvents: editing != null ? 'auto' : 'none' }}
              onKeyDown={onKey} onInput={onSinkInput}
              onCompositionStart={() => { composing.current = true; if (editing == null) startEdit(''); }}
              onCompositionEnd={(e) => { composing.current = false; setEditing((e.target as HTMLInputElement).value); }} />
          </>
        ) : f.t}
      </div>
    );
  };
  const rowNode = (r: number, top?: number) => (
    <div key={r} className="ss-row" style={top != null ? { position: 'absolute', top, left: 0 } : undefined}>
      <div className={`ss-c ss-rh ${r >= range.r1 && r <= range.r2 ? 'sel' : ''}`} style={{ width: RW, position: 'sticky', left: 0, zIndex: 3 }}>{r + 1}</div>
      {widths.map((_, c) => cellNode(r, c))}
    </div>
  );

  // 상태바: 선택 영역 합계/평균/개수
  let sum = 0, cnt = 0, numCnt = 0;
  if (range.r2 - range.r1 + range.c2 - range.c1 > 0) {
    for (let r = range.r1; r <= Math.min(range.r2, range.r1 + 3000); r++) for (let c = range.c1; c <= range.c2; c++) { const v = eng.value(name, r, c); if (v != null && v !== '') cnt++; if (typeof v === 'number') { sum += v; numCnt++; } }
  }
  const actRaw = editing ?? raw(act.r, act.c);
  const canEdit = editable(act.r, act.c);
  const entryRowSel = def.bind.type === 'entries' && range.r1 >= 1 && def.bind.ids[range.r1 - 1];

  return (
    <div className="ss" onMouseUp={() => (dragging.current = false)} onMouseLeave={() => (dragging.current = false)}>
      <div className="ss-bar">
        <div className="ss-name">{colL(act.c)}{act.r + 1}</div>
        <div className="ss-fx"><Icon name="fx" size={18} /></div>
        <input ref={fxRef} className="ss-input" value={actRaw} readOnly={!canEdit}
          onFocus={() => { if (canEdit && editing == null) setEditing(raw(act.r, act.c)); }}
          onChange={(e) => { setEditing(e.target.value); if (sinkRef.current) sinkRef.current.value = e.target.value; }}
          onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value, { r: act.r + 1, c: act.c }); } if (e.key === 'Escape') { setEditing(null); sinkRef.current?.focus(); } }}
          placeholder={canEdit ? '값이나 =수식 을 입력하세요' : ''} />
        <span className={`ss-lock ${canEdit ? 'edit' : ''}`}><Icon name={canEdit ? 'pencil' : 'lock'} size={13} />{canEdit ? '입력 가능' : '자동 계산'}</span>
        {entryRowSel && (
          <button className="btn sm ghost" onClick={() => { const ids = def.bind.type === 'entries' ? def.bind.ids.slice(range.r1 - 1, range.r2) : []; update((d) => { d.entries = d.entries.filter((x) => !ids.includes(x.id)); for (const id of ids) if (id.startsWith('fx:')) { const { id: fid, month: fm } = parseFixedKey(id); const fc = d.fixed.find((x) => x.id === fid); if (fc && !fc.skip.includes(fm)) fc.skip.push(fm); } }, `${ids.length}줄을 삭제했어요 (고정비는 그 달만 제외)`); }}><Icon name="trash" size={14} />선택 줄 삭제</button>
        )}
        <button className="btn sm primary" onClick={exportXlsx}><Icon name="download" size={14} />엑셀로 내보내기</button>
      </div>
      <div className="ss-scroll" ref={scrollRef} onScroll={(e) => { const t = (e.target as HTMLDivElement).scrollTop; requestAnimationFrame(() => setScroll((s) => (s.top === t ? s : { ...s, top: t }))); }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) sinkRef.current?.focus(); }}>
        <div className="ss-grid" style={{ width: totalW, height: HH + nRows * RH }}>
          <div className="ss-sticky-top" style={{ width: totalW }}>
            <div className="ss-row" style={{ height: HH }}>
              <div className="ss-c ss-ch" style={{ width: RW, height: HH, lineHeight: `${HH - 1}px`, position: 'sticky', left: 0, zIndex: 4 }} />
              {widths.map((w, c) => <div key={c} className={`ss-c ss-ch ${c >= range.c1 && c <= range.c2 ? 'sel' : ''}`} style={{ width: w, height: HH, lineHeight: `${HH - 1}px`, ...(c < fc ? { position: 'sticky', left: RW + xs[c], zIndex: 4 } : {}) }}>{colL(c)}</div>)}
            </div>
            {Array.from({ length: fr }, (_, r) => rowNode(r))}
          </div>
          <div style={{ position: 'relative', height: (nRows - fr) * RH }}>
            {Array.from({ length: Math.max(0, visEnd - visStart) }, (_, i) => visStart + i).map((r) => rowNode(r, (r - fr) * RH))}
          </div>
        </div>
      </div>
      <div className="ss-status">
        <span className="muted">{def.desc}</span>
        {msg && <span className="msg">{msg}</span>}
        <span style={{ marginLeft: 'auto' }} />
        {cnt > 1 && <><span>개수 <b className="num">{cnt.toLocaleString()}</b></span>{numCnt > 0 && <><span>합계 <b className="num">{(+sum.toFixed(4)).toLocaleString()}</b></span><span>평균 <b className="num">{(+(sum / numCnt).toFixed(2)).toLocaleString()}</b></span></>}</>}
      </div>
      <div className="ss-tabs">
        {sheets.map((s, i) => (
          <button key={s.name} className={`ss-tab ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)}>
            {i === idx && <motion.div layoutId="ss-tab" className="tb" transition={spring} />}
            <Icon name={s.icon} size={14} /><span>{s.name}</span>
            <span className="dot" style={{ background: s.bind.type === 'none' ? '#6B4A36' : '#C9AE8F' }} title={s.bind.type === 'none' ? '자동 계산' : '입력 가능'} />
          </button>
        ))}
        <span className="note" style={{ marginLeft: 'auto', whiteSpace: 'nowrap', paddingRight: 6 }}><span className="dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#6B4A36', marginRight: 5 }} />자동 계산 &nbsp;&nbsp;<span className="dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#C9AE8F', marginRight: 5 }} />입력 가능</span>
      </div>
    </div>
  );
}

export { SH };
