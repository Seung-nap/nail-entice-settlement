import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { CountUp, Empty, Seg, Stagger, Strip, Switch, spring } from '../components/ui';
import { EXPENSE_GROUPS, INCOME_GROUPS, ENTRY_METHODS, Entry, EntryKind, Group } from '../lib/model';
import { monthKeyOf, todayIso, wonShort, pad } from '../lib/data';
import { WD, groupMeta } from './common';

const AMT_CHIPS = [10000, 50000, 100000, 500000];

function GroupIcon({ g, size = 38 }: { g: Group; size?: number }) {
  return <span style={{ width: size, display: 'grid', placeItems: 'center', color: 'var(--ink-60)', flex: 'none' }}><Icon name={g.icon} size={18} /></span>;
}

function EntryLine({ e, onChange, onDelete }: { e: Entry; onChange: (p: Partial<Entry>) => void; onDelete: () => void }) {
  const d = new Date(e.date + 'T00:00:00');
  return (
    <motion.div layout className="entry-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={spring}>
      <span className="dt num">{d.getMonth() + 1}.{pad(d.getDate())} <span style={{ fontWeight: 400 }}>({WD[d.getDay()]})</span></span>
      <span className="ti" style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <b>{e.item}</b>
        <input className="inp sm" style={{ background: 'transparent', boxShadow: 'none', height: 26, padding: '0 4px', flex: 1, minWidth: 40, color: 'var(--ink-80)', fontWeight: 400 }} defaultValue={e.title} placeholder="내용 추가…"
          onBlur={(ev) => ev.target.value !== e.title && onChange({ title: ev.target.value })} onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()} />
        {e.recurring && <span className="tag reg" title="매월 고정"><Icon name="repeat" size={10} stroke={2.4} /> 고정</span>}
      </span>
      <span className="muted" style={{ fontSize: 13 }}>{e.method}</span>
      <input className="inp sm num am" style={{ width: 104, textAlign: 'right', background: 'transparent', boxShadow: 'none', fontWeight: 700 }} defaultValue={e.amount.toLocaleString()}
        onFocus={(ev) => (ev.target.value = String(e.amount))}
        onBlur={(ev) => { const n = Number(ev.target.value.replace(/[,\s원]/g, '')); if (Number.isFinite(n) && n !== e.amount) onChange({ amount: n }); else ev.target.value = e.amount.toLocaleString(); }}
        onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()} />
      <button className="icon-btn" onClick={onDelete} title="삭제"><Icon name="trash" size={15} /></button>
    </motion.div>
  );
}

export default function Expenses() {
  const { data, month, addEntry, update, toast } = useApp();
  const m = typeof month === 'number' ? month : Number(todayIso().slice(0, 7).replace('-', ''));
  const curKey = Number(todayIso().slice(0, 7).replace('-', ''));
  const defDate = m === curKey ? todayIso() : `${Math.floor(m / 100)}-${pad(m % 100)}-01`;

  const [kind, setKind] = useState<EntryKind>('지출');
  const groups = kind === '지출' ? EXPENSE_GROUPS : INCOME_GROUPS;
  const [group, setGroup] = useState(groups[0].name);
  const [item, setItem] = useState(groups[0].items[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defDate);
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState('카드');
  const [recurring, setRecurring] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ [EXPENSE_GROUPS[0].name]: true });
  const amtRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDate(defDate); }, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const g = groups.find((x) => x.name === group) ?? groups[0]; setGroup(g.name); if (!g.items.includes(item)) setItem(g.items[0]); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthEntries = useMemo(() => data.entries.filter((e) => monthKeyOf(e.date) === m).sort((a, b) => a.date.localeCompare(b.date)), [data.entries, m]);
  const expTotal = monthEntries.filter((e) => e.kind === '지출').reduce((a, e) => a + e.amount, 0);
  const incTotal = monthEntries.filter((e) => e.kind === '수입').reduce((a, e) => a + e.amount, 0);
  const fixedTotal = monthEntries.filter((e) => e.kind === '지출' && e.recurring).reduce((a, e) => a + e.amount, 0);

  // 고정비 템플릿: 이전 달들의 '매월고정' 항목 중 이번 달에 아직 없는 것
  const recurringTemplates = useMemo(() => {
    const seen = new Map<string, Entry>();
    for (const e of [...data.entries].sort((a, b) => a.date.localeCompare(b.date))) if (e.recurring && monthKeyOf(e.date) < m) seen.set(`${e.kind}|${e.group}|${e.item}|${e.title}`, e);
    const have = new Set(monthEntries.map((e) => `${e.kind}|${e.group}|${e.item}|${e.title}`));
    return [...seen.entries()].filter(([k]) => !have.has(k)).map(([, e]) => e);
  }, [data.entries, monthEntries, m]);

  const amt = Number(amount.replace(/[,\s]/g, '')) || 0;
  const submit = () => {
    if (!amt) { amtRef.current?.focus(); toast('금액을 입력해주세요', 'warn', 'info'); return; }
    if (!date) return;
    addEntry({ date, kind, group, item, title: title.trim(), amount: amt, method, recurring, memo: '' });
    setAmount(''); setTitle(''); setRecurring(false);
    setOpen((o) => ({ ...o, [group]: true }));
    amtRef.current?.focus();
  };
  const pick = (g: Group, it: string, k: EntryKind) => {
    setKind(k); setGroup(g.name); setItem(it);
    if (['월세', '관리비', '인터넷·통신비', '예약·POS 프로그램', '매장 음악', '세무 기장료', '카드단말기·VAN', '휴대폰 요금'].includes(it)) { setRecurring(true); setMethod('자동이체'); }
    quickRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => amtRef.current?.focus(), 250);
  };
  const loadRecurring = () => {
    const [y, mm] = [Math.floor(m / 100), m % 100];
    const last = new Date(y, mm, 0).getDate();
    update((d) => {
      for (const e of recurringTemplates) {
        const day = Math.min(Number(e.date.slice(8, 10)), last);
        d.entries.push({ ...e, id: Math.random().toString(36).slice(2, 10), date: `${y}-${pad(mm)}-${pad(day)}` });
      }
    }, `고정비 ${recurringTemplates.length}건을 ${mm}월로 불러왔어요`);
  };

  const byDate = useMemo(() => { const mp = new Map<string, Entry[]>(); for (const e of monthEntries) { const a = mp.get(e.date) ?? []; a.push(e); mp.set(e.date, a); } return [...mp.entries()].reverse(); }, [monthEntries]);
  const g = groupMeta(group);

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
            <div className="sum">{sum ? <><b className="num" style={{ color: k === '수입' ? '#2D6A45' : undefined }}>{k === '수입' ? '+' : ''}{sum.toLocaleString()}원</b><span>{es.length}건</span></> : <span>아직 없음</span>}</div>
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
                    {es.map((e) => <EntryLine key={e.id} e={e} onChange={(p) => update((d) => { Object.assign(d.entries.find((x) => x.id === e.id)!, p); }, '수정했어요')} onDelete={() => update((d) => { d.entries = d.entries.filter((x) => x.id !== e.id); }, '삭제했어요')} />)}
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
        { l: `${m % 100}월 지출`, v: <><CountUp value={expTotal} /><small>원</small></> },
        { l: '그중 고정비', v: <><CountUp value={fixedTotal} /><small>원</small></> },
        { l: '기타 수입', v: <><CountUp value={incTotal} /><small>원</small></> },
        {
          l: '고정비 불러오기',
          v: recurringTemplates.length ? <>{recurringTemplates.length}<small>건 · {wonShort(recurringTemplates.reduce((x, e) => x + e.amount, 0))}원</small></> : <small style={{ marginLeft: 0 }}>없음</small>,
          sub: recurringTemplates.length
            ? <button className="btn sm primary" onClick={loadRecurring}><Icon name="repeat" size={14} />{m % 100}월로 복사</button>
            : '‘매월 고정’으로 기록하면 다음 달에 한 번에 불러와요',
        },
      ]} />

      <div className="exp-layout">
        <div>
          <motion.div ref={quickRef} className="quick" layout>
            <div className="flex" style={{ marginBottom: 14, gap: 10 }}>
              <GroupIcon g={g} size={34} />
              <div style={{ flex: 1 }}><div className="b" style={{ fontSize: 15 }}>빠른 기입</div><div className="note">아래 분류에서 항목을 고르거나 여기서 바로 입력하세요 · Enter로 저장</div></div>
              <Seg id="kind" value={kind} onChange={setKind} options={[{ v: '지출', l: '지출' }, { v: '수입', l: '기타 수입' }]} />
            </div>
            <div className="quick-row" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'SELECT' && submit()}>
              <div className="field"><label>대분류</label>
                <select className="inp" value={group} onChange={(e) => { setGroup(e.target.value); setItem(groupMeta(e.target.value).items[0]); }} style={{ width: 150 }}>
                  {groups.map((x) => <option key={x.name}>{x.name}</option>)}
                </select></div>
              <div className="field"><label>항목</label>
                <input className="inp" list="items-dl" value={item} onChange={(e) => setItem(e.target.value)} style={{ width: 160 }} />
                <datalist id="items-dl">{groupMeta(group).items.map((x) => <option key={x} value={x} />)}</datalist></div>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label>내용 (선택)</label><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 10월 월세, 젤 20병" /></div>
              <div className="field"><label>날짜</label><input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 150 }} /></div>
            </div>
            <div className="quick-row" style={{ marginTop: 10, alignItems: 'flex-end' }} onKeyDown={(e) => e.key === 'Enter' && submit()}>
              <div className="field"><label>금액</label>
                <div style={{ position: 'relative' }}>
                  <input ref={amtRef} className="inp amount-inp num" inputMode="numeric" value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString() : ''} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ paddingRight: 34 }} />
                  <span style={{ position: 'absolute', right: 13, top: 12, fontWeight: 700, color: 'var(--ink-60)' }}>원</span>
                </div></div>
              <div className="field"><label>결제수단</label>
                <select className="inp" value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: 120 }}>{ENTRY_METHODS.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="field"><label>매월 고정</label><div style={{ height: 44, display: 'flex', alignItems: 'center' }}><Switch on={recurring} onChange={setRecurring} label="매월 고정" /></div></div>
              <div style={{ flex: 1 }} />
              <button className="btn primary" style={{ height: 44, padding: '0 22px' }} onClick={submit}><Icon name="check" size={16} stroke={2.4} />기록하기</button>
            </div>
            <div className="quick-chips">
              {AMT_CHIPS.map((a) => <button key={a} className="amt-chip" onClick={() => setAmount(String(amt + a))}>+{wonShort(a)}</button>)}
              {amount && <button className="amt-chip" onClick={() => setAmount('')}>지우기</button>}
            </div>
          </motion.div>

          <div className="toggle-list">
            {EXPENSE_GROUPS.map((gr, i) => renderGroup(gr, '지출', i))}
            <div className="nav-label" style={{ padding: '10px 4px 0' }}>수입</div>
            {INCOME_GROUPS.map((gr, i) => renderGroup(gr, '수입', i + EXPENSE_GROUPS.length))}
          </div>
        </div>

        <div style={{ position: 'sticky', top: 0 }}>
          <div className="card">
            <div className="card-h"><div><div className="card-t">날짜별 정리</div><div className="card-d">{m % 100}월 · {monthEntries.length}건</div></div></div>
            {byDate.length ? (
              <div className="timeline" style={{ maxHeight: 'calc(100vh - 330px)', overflow: 'auto', margin: '0 -6px', padding: '0 6px' }}>
                {byDate.map(([dt, es]) => {
                  const d = new Date(dt + 'T00:00:00');
                  return (
                    <div className="tl-day" key={dt}>
                      <div className="tl-d"><span>{d.getMonth() + 1}월 {d.getDate()}일 {WD[d.getDay()]}요일</span><span className="num">{es.reduce((a, e) => a + (e.kind === '수입' ? e.amount : -e.amount), 0).toLocaleString()}</span></div>
                      {es.map((e) => (
                        <div className="tl-item" key={e.id}><span className="dotc"  /><span><b style={{ fontWeight: 600 }}>{e.item}</b>{e.title && <span className="muted"> · {e.title}</span>}</span><span className="am num" style={{ color: e.kind === '수입' ? '#2D6A45' : undefined }}>{e.kind === '수입' ? '+' : '−'}{e.amount.toLocaleString()}</span></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : <Empty icon="wallet" title={`${m % 100}월 기록이 없어요`}>왼쪽에서 첫 지출을 기입해보세요</Empty>}
            <div className="hr" />
            <div className="flex" style={{ justifyContent: 'space-between', fontSize: 14 }}><span className="muted">수입 − 지출</span><b className="num" style={{ color: incTotal - expTotal < 0 ? 'var(--neg)' : incTotal - expTotal > 0 ? 'var(--pos)' : 'var(--ink)' }}>{(incTotal - expTotal).toLocaleString()}원</b></div>
            <div className="note" style={{ marginTop: 10 }}>기입한 내용은 스프레드시트의 <b>수입지출</b> 시트와 <b>월말정산</b>에 즉시 반영돼요.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
