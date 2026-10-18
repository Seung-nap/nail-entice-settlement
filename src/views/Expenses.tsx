import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { CountUp, Empty, Modal, Seg, Stagger, Strip, spring } from '../components/ui';
import { EXPENSE_GROUPS, INCOME_GROUPS, ENTRY_METHODS, Entry, EntryKind, FixedCost, Group, uid } from '../lib/model';
import { monthKeyOf, todayIso, wonShort, pad } from '../lib/data';
import { allEntries, amountFor, activeIn, baseAmount, newFixed, parseFixedKey, prevYm } from '../lib/fixed';
import { WD, groupMeta } from './common';

const AMT_CHIPS = [10000, 50000, 100000, 500000];
type CostType = '변동' | '고정';
// 이런 항목은 보통 매달 같은 금액 → 고정비로 먼저 제안
const FIXED_HINT = ['월세', '관리비', '주차비(월정)', '인터넷·통신비', '휴대폰 요금', '예약·POS 프로그램', '매장 음악', '디자인·편집 앱', '클라우드·저장공간', '카드단말기·VAN', '세무 기장료', '화재·배상보험', '대출 이자', '급여', '4대보험'];
const keyOf = (e: Pick<Entry, 'kind' | 'group' | 'item' | 'title'>) => `${e.kind}|${e.group}|${e.item}|${e.title}`;
const monthLabel = (k: number) => `${k % 100}월`;
const lastDay = (k: number) => new Date(Math.floor(k / 100), k % 100, 0).getDate();
const dateIn = (k: number, day: number) => `${Math.floor(k / 100)}-${pad(k % 100)}-${pad(Math.min(day, lastDay(k)))}`;

function GroupIcon({ g, size = 38 }: { g: Group; size?: number }) {
  return <span style={{ width: size, display: 'grid', placeItems: 'center', color: 'var(--ink-60)', flex: 'none' }}><Icon name={g.icon} size={18} /></span>;
}

function MoneyInput({ value, onCommit, width = 104, bold = true }: { value: number; onCommit: (n: number) => void; width?: number; bold?: boolean }) {
  return (
    <input key={value} className="inp sm num" style={{ width, textAlign: 'right', background: 'transparent', boxShadow: 'none', fontWeight: bold ? 600 : 400 }} defaultValue={value.toLocaleString()}
      onFocus={(ev) => (ev.target.value = String(value))}
      onBlur={(ev) => { const n = Number(ev.target.value.replace(/[,\s원]/g, '')); if (Number.isFinite(n) && n !== value) onCommit(n); else ev.target.value = value.toLocaleString(); }}
      onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()} />
  );
}

function EntryLine({ e, onChange, onDelete }: { e: Entry; onChange: (p: Partial<Entry>) => void; onDelete: () => void }) {
  const d = new Date(e.date + 'T00:00:00');
  const fixed = !!e.fixedId;
  return (
    <motion.div layout className="entry-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={spring}>
      <span className="dt num">{d.getMonth() + 1}.{pad(d.getDate())} <span>({WD[d.getDay()]})</span></span>
      <span className="ti" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <b>{e.item}</b>
        {fixed
          ? <span className="muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
          : <input className="inp sm" style={{ background: 'transparent', boxShadow: 'none', height: 26, padding: '0 4px', flex: 1, minWidth: 40, color: 'var(--ink-80)' }} defaultValue={e.title} placeholder="내용 추가…"
              onBlur={(ev) => ev.target.value !== e.title && onChange({ title: ev.target.value })} onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()} />}
        {fixed && <span className="tag reg" title="매월 자동으로 들어가는 고정비"><Icon name="repeat" size={11} stroke={2.2} /> 고정</span>}
      </span>
      <span className="muted" style={{ fontSize: 13 }}>{e.method}</span>
      <MoneyInput value={e.amount} onCommit={(n) => onChange({ amount: n })} />
      <button className="icon-btn" onClick={onDelete} title={fixed ? '이번 달만 빼기' : '삭제'}><Icon name={fixed ? 'minus' : 'trash'} size={15} /></button>
    </motion.div>
  );
}

export default function Expenses() {
  const { data, month, addEntry, update, toast } = useApp();
  const m = typeof month === 'number' ? month : Number(todayIso().slice(0, 7).replace('-', ''));
  const curKey = Number(todayIso().slice(0, 7).replace('-', ''));
  const defDate = m === curKey ? todayIso() : `${Math.floor(m / 100)}-${pad(m % 100)}-01`;

  const [kind, setKind] = useState<EntryKind>('지출');
  const [costType, setCostType] = useState<CostType>('변동');
  const groups = kind === '지출' ? EXPENSE_GROUPS : INCOME_GROUPS;
  const [group, setGroup] = useState(groups[0].name);
  const [item, setItem] = useState(groups[0].items[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defDate);
  const [day, setDay] = useState(Number(todayIso().slice(8, 10)));
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState('카드');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showRecent, setShowRecent] = useState(false);
  const [recentQ, setRecentQ] = useState('');
  const [showEnded, setShowEnded] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [newAmt, setNewAmt] = useState('');
  const [confirmDel, setConfirmDel] = useState<FixedCost | null>(null);
  const amtRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDate(defDate); }, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const g = groups.find((x) => x.name === group) ?? groups[0]; setGroup(g.name); if (!g.items.includes(item)) setItem(g.items[0]); if (kind === '수입') setCostType('변동'); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const every = useMemo(() => allEntries(data), [data]);
  const monthEntries = useMemo(() => every.filter((e) => monthKeyOf(e.date) === m).sort((a, b) => a.date.localeCompare(b.date)), [every, m]);
  const expTotal = monthEntries.filter((e) => e.kind === '지출').reduce((a, e) => a + e.amount, 0);
  const fixedTotal = monthEntries.filter((e) => e.fixedId).reduce((a, e) => a + e.amount, 0);
  const incTotal = monthEntries.filter((e) => e.kind === '수입').reduce((a, e) => a + e.amount, 0);

  const fixedNow = useMemo(() => data.fixed.filter((f) => activeIn(f, m)).sort((a, b) => a.day - b.day), [data.fixed, m]);
  const fixedEnded = useMemo(() => data.fixed.filter((f) => !activeIn(f, m)), [data.fixed, m]);

  // 지난달 변동비 중 이번 달에 아직 없는 것 → 체크해서 한 번에 기입
  const prev = prevYm(m);
  const prevVars = useMemo(() => {
    const have = new Set(monthEntries.map(keyOf));
    const seen = new Set<string>();
    return data.entries.filter((e) => monthKeyOf(e.date) === prev && e.kind === '지출' && !have.has(keyOf(e)) && !seen.has(keyOf(e)) && seen.add(keyOf(e)));
  }, [data.entries, monthEntries, prev]);
  const [carry, setCarry] = useState<Record<string, { on: boolean; amt: string }>>({});
  useEffect(() => { setCarry(Object.fromEntries(prevVars.map((e) => [e.id, { on: true, amt: String(e.amount) }]))); }, [prevVars]);

  // 예전에 기입한 내용 (같은 분류·항목·내용은 하나로, 최근 순)
  const recent = useMemo(() => {
    const mp = new Map<string, { e: Entry; n: number }>();
    for (const e of [...data.entries].sort((a, b) => a.date.localeCompare(b.date))) { const k = `${keyOf(e)}|${e.method}`; mp.set(k, { e, n: (mp.get(k)?.n ?? 0) + 1 }); }
    const q = recentQ.trim();
    return [...mp.values()].reverse().filter(({ e }) => !q || [e.group, e.item, e.title, e.method].some((x) => x.includes(q))).slice(0, 14);
  }, [data.entries, recentQ]);

  const amt = Number(amount.replace(/[,\s]/g, '')) || 0;
  const submit = () => {
    if (!amt) { amtRef.current?.focus(); toast('금액을 입력해주세요', 'warn', 'info'); return; }
    if (kind === '지출' && costType === '고정') {
      const fc = newFixed({ group, item, title: title.trim(), method, day, from: m, memo: '', amount: amt });
      update((d) => { d.fixed.push(fc); }, `고정비 ${item} ${amt.toLocaleString()}원 — ${monthLabel(m)}부터 매달 자동으로 들어가요`);
    } else {
      if (!date) return;
      addEntry({ date, kind, group, item, title: title.trim(), amount: amt, method, recurring: false, memo: '' });
    }
    setAmount(''); setTitle('');
    setOpen((o) => ({ ...o, [group]: true }));
    amtRef.current?.focus();
  };
  const pick = (g: Group, it: string, k: EntryKind) => {
    setKind(k); setGroup(g.name); setItem(it);
    if (k === '지출') { const fx = FIXED_HINT.includes(it); setCostType(fx ? '고정' : '변동'); if (fx) setMethod('자동이체'); }
    quickRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => amtRef.current?.focus(), 250);
  };
  const fill = (e: Entry) => {
    setKind(e.kind); setCostType('변동'); setGroup(e.group); setItem(e.item); setTitle(e.title); setMethod(e.method); setAmount(String(e.amount));
    setShowRecent(false); setTimeout(() => amtRef.current?.focus(), 50);
  };
  const updFixed = (id: string, fn: (f: FixedCost) => void, msg?: string) => update((d) => { const f = d.fixed.find((x) => x.id === id); if (f) fn(f); }, msg);
  const carryNow = () => {
    const picks = prevVars.filter((e) => carry[e.id]?.on && Number(carry[e.id].amt.replace(/\D/g, '')) > 0);
    if (!picks.length) return;
    update((d) => { for (const e of picks) d.entries.push({ ...e, id: uid(), date: dateIn(m, Number(e.date.slice(8, 10))), amount: Number(carry[e.id].amt.replace(/\D/g, '')) }); },
      `지난달 변동비 ${picks.length}건을 ${monthLabel(m)}에 기입했어요`);
  };
  // 펼친 행 편집: 고정비는 '이번 달만', 변동비는 그 기록 자체
  const changeRow = (e: Entry, p: Partial<Entry>) => {
    if (!e.fixedId) { update((d) => { Object.assign(d.entries.find((x) => x.id === e.id)!, p); }, '수정했어요'); return; }
    const { month: fm } = parseFixedKey(e.id);
    if (p.amount != null) updFixed(e.fixedId, (f) => { if (p.amount === baseAmount(f, fm)) delete f.overrides[String(fm)]; else f.overrides[String(fm)] = p.amount!; }, `${monthLabel(fm)} ${e.item}만 ${p.amount.toLocaleString()}원으로`);
  };
  const removeRow = (e: Entry) => {
    if (!e.fixedId) { update((d) => { d.entries = d.entries.filter((x) => x.id !== e.id); }, '삭제했어요'); return; }
    const { month: fm } = parseFixedKey(e.id);
    updFixed(e.fixedId, (f) => { if (!f.skip.includes(fm)) f.skip.push(fm); }, `${monthLabel(fm)}만 ${e.item}을(를) 뺐어요 — 고정비 목록에서 다시 넣을 수 있어요`);
  };

  const byDate = useMemo(() => { const mp = new Map<string, Entry[]>(); for (const e of monthEntries) { const a = mp.get(e.date) ?? []; a.push(e); mp.set(e.date, a); } return [...mp.entries()].reverse(); }, [monthEntries]);
  const g = groupMeta(group);
  const isFixedForm = kind === '지출' && costType === '고정';

  const renderGroup = (gr: Group, k: EntryKind, i: number) => {
    const es = monthEntries.filter((e) => e.group === gr.name && e.kind === k);
    const sum = es.reduce((a, e) => a + e.amount, 0);
    const isOpen = !!open[gr.name];
    return (
      <Stagger i={i} key={gr.name}>
        <div className={`tg ${isOpen ? 'open' : ''}`}>
          <div className="tg-head" onClick={() => setOpen((o) => ({ ...o, [gr.name]: !o[gr.name] }))}>
            <GroupIcon g={gr} />
            <div><div className="ttl">{gr.name}</div><div className="hint">{gr.hint}</div></div>
            <div className="sum">{sum ? <><b className="num" style={{ color: k === '수입' ? 'var(--pos)' : undefined }}>{k === '수입' ? '+' : ''}{sum.toLocaleString()}원</b><span>{es.length}건{es.some((e) => e.fixedId) ? ' · 고정 포함' : ''}</span></> : <span>아직 없음</span>}</div>
            <Icon name="chevron" size={18} className="chev" />
          </div>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }} style={{ overflow: 'hidden' }}>
                <div className="tg-body">
                  <div className="item-chips">
                    {gr.items.map((it) => <button key={it} className={`item-chip ${group === gr.name && item === it ? 'on' : ''}`} onClick={() => pick(gr, it, k)}><Icon name="plus" size={12} stroke={2.2} />{it}</button>)}
                  </div>
                  <AnimatePresence initial={false}>
                    {es.map((e) => <EntryLine key={e.id} e={e} onChange={(p) => changeRow(e, p)} onDelete={() => removeRow(e)} />)}
                  </AnimatePresence>
                  {!es.length && <div className="note" style={{ padding: '4px 2px' }}>위 항목을 누르면 바로 기입할 수 있어요.</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Stagger>
    );
  };

  return (
    <div>
      <Strip items={[
        { l: `${monthLabel(m)} 지출`, v: <><CountUp value={expTotal} /><small>원</small></> },
        { l: '고정비 (매월 자동)', v: <><CountUp value={fixedTotal} /><small>원</small></>, sub: `${fixedNow.length}개 규칙` },
        { l: '변동비 (이번 달 기입)', v: <><CountUp value={expTotal - fixedTotal} /><small>원</small></> },
        { l: '기타 수입', v: <><CountUp value={incTotal} /><small>원</small></> },
      ]} />

      <div className="exp-layout">
        <div>
          <motion.div ref={quickRef} className="quick" layout>
            <div className="flex" style={{ marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
              <GroupIcon g={g} size={30} />
              <div style={{ flex: 1, minWidth: 180 }}><div className="b" style={{ fontSize: 15 }}>빠른 기입</div>
                <div className="note">{isFixedForm ? `한 번만 등록하면 ${monthLabel(m)}부터 매달 자동으로 들어가요` : kind === '지출' ? '이번 달에만 들어가는 지출이에요 · Enter로 저장' : '시술 외에 들어온 돈 · Enter로 저장'}</div></div>
              <Seg id="kind" value={kind} onChange={setKind} options={[{ v: '지출', l: '지출' }, { v: '수입', l: '기타 수입' }]} />
              {kind === '지출' && <Seg id="ctype" value={costType} onChange={setCostType} options={[{ v: '변동', l: '변동비' }, { v: '고정', l: '고정비' }]} />}
            </div>
            <div className="quick-row" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'SELECT' && submit()}>
              <div className="field"><label>대분류</label>
                <select className="inp" value={group} onChange={(e) => { setGroup(e.target.value); setItem(groupMeta(e.target.value).items[0]); }} style={{ width: 150 }}>
                  {groups.map((x) => <option key={x.name}>{x.name}</option>)}
                </select></div>
              <div className="field"><label>항목</label>
                <input className="inp" list="items-dl" value={item} onChange={(e) => setItem(e.target.value)} style={{ width: 160 }} />
                <datalist id="items-dl">{groupMeta(group).items.map((x) => <option key={x} value={x} />)}</datalist></div>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label>내용 (선택)</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isFixedForm ? '예) 상가 월세' : '예) 젤 20병'} /></div>
              {isFixedForm
                ? <div className="field"><label>매월 납부일</label>
                    <select className="inp" value={day} onChange={(e) => setDay(Number(e.target.value))} style={{ width: 110 }}>
                      {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}일{i + 1 >= 29 ? ' (말일)' : ''}</option>)}
                    </select></div>
                : <div className="field"><label>날짜</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 150 }} /></div>}
            </div>
            <div className="quick-row" style={{ marginTop: 10, alignItems: 'flex-end' }} onKeyDown={(e) => e.key === 'Enter' && submit()}>
              <div className="field"><label>{isFixedForm ? '매달 금액' : '금액'}</label>
                <div style={{ position: 'relative' }}>
                  <input ref={amtRef} className="inp amount-inp num" inputMode="numeric" value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString() : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ paddingRight: 34 }} />
                  <span style={{ position: 'absolute', right: 13, top: 12, fontWeight: 600, color: 'var(--ink-60)' }}>원</span>
                </div></div>
              <div className="field"><label>결제수단</label>
                <select className="inp" value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 120 }}>{ENTRY_METHODS.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div style={{ flex: 1 }} />
              <button className="btn primary" style={{ height: 44, padding: '0 22px' }} onClick={submit}><Icon name={isFixedForm ? 'repeat' : 'check'} size={16} stroke={2.2} />{isFixedForm ? '고정비 등록' : '기록하기'}</button>
            </div>
            <div className="quick-chips">
              {AMT_CHIPS.map((a) => <button key={a} className="amt-chip" onClick={() => setAmount(String(amt + a))}>+{wonShort(a)}</button>)}
              {amount && <button className="amt-chip" onClick={() => setAmount('')}>지우기</button>}
              <span style={{ flex: 1 }} />
              <button className={`amt-chip ${showRecent ? 'on' : ''}`} onClick={() => setShowRecent((v) => !v)} disabled={!data.entries.length}><Icon name="list" size={12} /> 이전 기입 불러오기</button>
            </div>
            <AnimatePresence initial={false}>
              {showRecent && (
                <motion.div className="recent" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }}>
                  <div className="search" style={{ minWidth: 0, margin: '14px 0 10px' }}><Icon name="search" size={15} /><input autoFocus placeholder="항목 · 내용으로 찾기" value={recentQ} onChange={(e) => setRecentQ(e.target.value)} /></div>
                  {recent.length ? recent.map(({ e, n }) => (
                    <button key={e.id} className="recent-row" onClick={() => fill(e)}>
                      <span className="b">{e.item}</span>
                      <span className="muted" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title || e.group} · {e.method}</span>
                      <span className="muted num">{e.date.slice(5).replace('-', '.')}{n > 1 ? ` · ${n}번` : ''}</span>
                      <span className="b num">{e.amount.toLocaleString()}원</span>
                    </button>
                  )) : <div className="note">찾는 내용이 없어요.</div>}
                  <div className="note" style={{ marginTop: 8 }}>고르면 위 칸이 채워져요 — 금액·날짜만 확인하고 기록하기.</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {prevVars.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-h"><div><div className="card-t">지난달 변동비 불러오기</div><div className="card-d">{monthLabel(prev)}에 기입했고 {monthLabel(m)}엔 아직 없는 변동비 {prevVars.length}건 — 이번 달 금액으로 고쳐서 넣으세요</div></div>
                <div className="right"><button className="btn sm primary" onClick={carryNow}>선택한 {prevVars.filter((e) => carry[e.id]?.on).length}건 기입</button></div></div>
              {prevVars.map((e) => (
                <label key={e.id} className="entry-row" style={{ gridTemplateColumns: '28px 1fr auto auto', cursor: 'pointer' }}>
                  <input type="checkbox" className="chk" checked={!!carry[e.id]?.on} onChange={(ev) => setCarry((c) => ({ ...c, [e.id]: { ...c[e.id], on: ev.target.checked } }))} />
                  <span className="ti"><b>{e.item}</b>{e.title && <span>{e.title}</span>}</span>
                  <span className="muted" style={{ fontSize: 13 }}>지난달 {e.amount.toLocaleString()}원 →</span>
                  <input className="inp sm num" style={{ width: 120, textAlign: 'right' }} inputMode="numeric" value={carry[e.id] ? Number(carry[e.id].amt.replace(/\D/g, '') || 0).toLocaleString() : ''} onChange={(ev) => setCarry((c) => ({ ...c, [e.id]: { on: true, amt: ev.target.value.replace(/\D/g, '') } }))} />
                </label>
              ))}
            </div>
          )}

          <div className="toggle-list">
            {EXPENSE_GROUPS.map((gr, i) => renderGroup(gr, '지출', i))}
            <div className="nav-label">수입</div>
            {INCOME_GROUPS.map((gr, i) => renderGroup(gr, '수입', i + EXPENSE_GROUPS.length))}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-h"><div><div className="card-t">고정비 · 매월 자동</div><div className="card-d">{fixedNow.length ? `${monthLabel(m)} ${fixedTotal.toLocaleString()}원 · 금액을 누르면 이번 달만 바꿔요` : '월세·관리비·구독료를 한 번 등록해두세요'}</div></div></div>
            {fixedNow.map((f) => {
              const a = amountFor(f, m), skipped = a == null, over = f.overrides[String(m)] != null;
              return (
                <div key={f.id} className={`fx-row ${skipped ? 'off' : ''}`}>
                  <div className="flex" style={{ gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="b" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.item}{f.title && <span className="muted" style={{ fontWeight: 400 }}> · {f.title}</span>}</div>
                      <div className="note">매월 {f.day}일 · {f.method} · {Math.floor(f.from / 100) % 100}.{pad(f.from % 100)}부터{over ? ` · 기본 ${baseAmount(f, m).toLocaleString()}원` : ''}</div>
                    </div>
                    {skipped ? <span className="muted">이번 달 제외</span>
                      : <MoneyInput value={a!} width={110} onCommit={(n) => updFixed(f.id, (x) => { if (n === baseAmount(x, m)) delete x.overrides[String(m)]; else x.overrides[String(m)] = n; }, `${monthLabel(m)}만 ${n.toLocaleString()}원으로`)} />}
                  </div>
                  {changing === f.id ? (
                    <div className="flex" style={{ marginTop: 8 }}>
                      <input autoFocus className="inp sm num" style={{ width: 120, textAlign: 'right' }} placeholder={baseAmount(f, m).toLocaleString()} inputMode="numeric" value={newAmt ? Number(newAmt).toLocaleString() : ''} onChange={(e) => setNewAmt(e.target.value.replace(/\D/g, ''))} />
                      <button className="btn sm primary" disabled={!Number(newAmt)} onClick={() => { const n = Number(newAmt); updFixed(f.id, (x) => { x.amounts = [...x.amounts.filter((h) => h.from !== m), { from: m, amount: n }]; delete x.overrides[String(m)]; }, `${f.item} ${monthLabel(m)}부터 ${n.toLocaleString()}원`); setChanging(null); setNewAmt(''); }}>{monthLabel(m)}부터 적용</button>
                      <button className="btn sm ghost" onClick={() => { setChanging(null); setNewAmt(''); }}>취소</button>
                    </div>
                  ) : (
                    <div className="fx-acts">
                      <button onClick={() => updFixed(f.id, (x) => { x.skip = skipped ? x.skip.filter((k) => k !== m) : [...x.skip, m]; }, skipped ? `${monthLabel(m)}에 다시 넣었어요` : `${monthLabel(m)}만 뺐어요`)}>{skipped ? '이번 달 다시 넣기' : '이번 달만 빼기'}</button>
                      <button onClick={() => setChanging(f.id)}>금액 변경</button>
                      <button onClick={() => updFixed(f.id, (x) => { x.to = m; }, `${f.item} — ${monthLabel(m)}까지만 내고 끝`)}>{monthLabel(m)}까지만</button>
                    </div>
                  )}
                </div>
              );
            })}
            {!fixedNow.length && <Empty icon="repeat" title="등록된 고정비가 없어요">빠른 기입에서 <b>고정비</b>를 고르고 금액을 넣으면 매달 자동으로 들어가요</Empty>}
            {fixedEnded.length > 0 && (
              <>
                <button className="note" style={{ marginTop: 12, textDecoration: 'underline', textUnderlineOffset: 3 }} onClick={() => setShowEnded((v) => !v)}>{showEnded ? '접기' : `이 달엔 없는 고정비 ${fixedEnded.length}개 보기`}</button>
                {showEnded && fixedEnded.map((f) => (
                  <div key={f.id} className="fx-row off">
                    <div className="flex"><div style={{ flex: 1 }}><div className="b">{f.item}{f.title && <span className="muted" style={{ fontWeight: 400 }}> · {f.title}</span>}</div>
                      <div className="note">{f.from > m ? `${Math.floor(f.from / 100) % 100}.${pad(f.from % 100)}부터 시작` : `${Math.floor(f.to! / 100) % 100}.${pad(f.to! % 100)}까지`} · {baseAmount(f, f.to ?? f.from).toLocaleString()}원</div></div></div>
                    <div className="fx-acts">
                      {f.to != null && f.to < m && <button onClick={() => updFixed(f.id, (x) => { x.to = null; x.skip = x.skip.filter((k) => k <= f.to!); }, `${f.item} 다시 매달 들어가요`)}>다시 시작</button>}
                      <button className="danger" onClick={() => setConfirmDel(f)}>기록에서 완전히 지우기</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="card">
            <div className="card-h"><div><div className="card-t">날짜별 정리</div><div className="card-d">{monthLabel(m)} · {monthEntries.length}건</div></div></div>
            {byDate.length ? (
              <div className="timeline" style={{ maxHeight: 'calc(100vh - 420px)', overflow: 'auto', margin: '0 -6px', padding: '0 6px' }}>
                {byDate.map(([dt, es]) => {
                  const d = new Date(dt + 'T00:00:00');
                  return (
                    <div className="tl-day" key={dt}>
                      <div className="tl-d"><span>{d.getMonth() + 1}월 {d.getDate()}일 {WD[d.getDay()]}요일</span><span className="num">{es.reduce((a, e) => a + (e.kind === '수입' ? e.amount : -e.amount), 0).toLocaleString()}</span></div>
                      {es.map((e) => (
                        <div className="tl-item" key={e.id}><span className="dotc" /><span><b style={{ fontWeight: 600 }}>{e.item}</b>{e.fixedId && <span className="muted"> · 고정</span>}{e.title && <span className="muted"> · {e.title}</span>}</span><span className="am num" style={{ color: e.kind === '수입' ? 'var(--pos)' : undefined }}>{e.kind === '수입' ? '+' : '−'}{e.amount.toLocaleString()}</span></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : <Empty icon="wallet" title={`${monthLabel(m)} 기록이 없어요`}>왼쪽에서 첫 지출을 기입해보세요</Empty>}
            <div className="hr" />
            <div className="flex" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="muted">수입 − 지출</span><b className="num" style={{ color: incTotal - expTotal < 0 ? 'var(--neg)' : incTotal - expTotal > 0 ? 'var(--pos)' : 'var(--ink)' }}>{(incTotal - expTotal).toLocaleString()}원</b></div>
            <div className="note" style={{ marginTop: 10 }}>고정비·변동비 모두 스프레드시트 <b>수입지출</b> 시트와 <b>월말정산</b>(고정비·변동비 줄)에 바로 반영돼요.</div>
          </div>
        </div>
      </div>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)}>
        {confirmDel && (
          <div>
            <h2>{confirmDel.item} 고정비를 지울까요?</h2>
            <p>이 고정비가 들어갔던 <b>지난 모든 달</b>에서도 빠져서 그 달 순이익이 바뀌어요. 그만 낼 거라면 지우지 말고 ‘끝난 고정비’로 두는 게 안전해요.</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setConfirmDel(null)}>취소</button>
              <button className="btn" style={{ background: 'var(--neg)', color: '#fff' }} onClick={() => { const id = confirmDel.id; update((d) => { d.fixed = d.fixed.filter((x) => x.id !== id); }, '고정비를 기록에서 지웠어요'); setConfirmDel(null); }}>완전히 지우기</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
