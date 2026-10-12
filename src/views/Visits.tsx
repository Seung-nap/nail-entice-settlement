import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { Avatar, Empty, spring } from '../components/ui';
import { useMonthVisits, PAY_META, PAY_KEYS, WD, VisitRow } from './common';
import { UNASSIGNED, PayKey } from '../lib/model';
import { wonShort, pct } from '../lib/data';

export default function Visits() {
  const { data, update } = useApp();
  const visits = useMonthVisits();
  const [q, setQ] = useState('');
  const [pf, setPf] = useState<PayKey | 'all' | 'unassigned'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(60);
  const labels = data.settings.payLabels;

  const filtered = useMemo(() => {
    const s = q.trim();
    return visits.filter((v) => (!s || v.customer.includes(s) || v.services.includes(s) || v.phone.includes(s.replace(/-/g, '')) || v.memo.includes(s))
      && (pf === 'all' || (pf === 'unassigned' ? v.pay.card > 0 && v.cardCo === UNASSIGNED : v.pay[pf] > 0)));
  }, [visits, q, pf]);
  const days = useMemo(() => {
    const m = new Map<string, VisitRow[]>();
    [...filtered].reverse().forEach((v) => { const a = m.get(v.dateKey) ?? []; a.push(v); m.set(v.dateKey, a); });
    return [...m.entries()];
  }, [filtered]);

  const custVisits = useMemo(() => { const m = new Map<string, number>(); data.lines.length; for (const v of visits) m.set(v.cust, (m.get(v.cust) ?? 0) + 1); return m; }, [visits, data.lines.length]);
  const unassigned = visits.filter((v) => v.pay.card > 0 && v.cardCo === UNASSIGNED).length;
  const used = PAY_KEYS.filter((k) => visits.some((v) => v.pay[k] > 0));
  const cards = [UNASSIGNED, ...data.settings.cards.map((c) => c.name)];
  const total = filtered.reduce((a, v) => a + v.paid, 0), totalFee = filtered.reduce((a, v) => a + v.fee, 0);

  let shown = 0;
  return (
    <div>
      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input placeholder="고객 · 시술 · 메모 검색" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button onClick={() => setQ('')}><Icon name="x" size={14} /></button>}</div>
        <div className="pills">
          <button className={`pill-btn ${pf === 'all' ? 'on' : ''}`} onClick={() => setPf('all')}>전체</button>
          {used.map((k) => <button key={k} className={`pill-btn ${pf === k ? 'on' : ''}`} onClick={() => setPf(k)}><Icon name={PAY_META[k].icon} size={13} />{labels[k]}</button>)}
          {unassigned > 0 && <button className={`pill-btn ${pf === 'unassigned' ? 'on' : ''}`} onClick={() => setPf('unassigned')} style={pf === 'unassigned' ? {} : { color: '#4A2E1F' }}>카드사 미지정 {unassigned}</button>}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-80)' }}>
          <b className="num" style={{ color: '#4A2E1F' }}>{filtered.length}</b>건 · <b className="num" style={{ color: '#4A2E1F' }}>{total.toLocaleString()}</b>원 · 수수료 <b className="num">{totalFee.toLocaleString()}</b>원
        </div>
      </div>
      {pf === 'unassigned' && unassigned > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: '#FBF8F3' }}>
          <Icon name="info" size={18} style={{ color: '#4A2E1F' }} />
          <div style={{ fontSize: 13, color: 'var(--ink-80)', flex: 1 }}>카드사를 모르면 그대로 두어도 돼요 — <b>카드 기본 수수료율({pct(data.settings.payRates.card, 2)})</b>로 계산돼요. 한 번에 지정하려면:</div>
          <select className="mini" defaultValue="" onChange={(e) => {
            const co = e.target.value; if (!co) return;
            const keys = filtered.filter((v) => v.pay.card > 0 && v.cardCo === UNASSIGNED).map((v) => v.key);
            update((d) => { keys.forEach((k) => (d.cardAssign[k] = co)); }, `${keys.length}건을 ${co}로 지정했어요`);
            e.target.value = '';
          }}><option value="">일괄 지정…</option>{cards.slice(1).map((c) => <option key={c}>{c}</option>)}</select>
        </div>
      )}
      {!days.length && <Empty icon="calendar" title="조건에 맞는 방문이 없어요" />}
      {days.map(([dk, vs]) => {
        if (shown > limit) return null;
        shown += vs.length;
        const v0 = vs[0];
        return (
          <div className="day-group" key={dk}>
            <div className="day-head"><span className="d">{v0.month % 100}월 {v0.day}일</span><span className="w" style={{ color: v0.wd === 0 ? '#AE3F36' : v0.wd === 6 ? '#5A483D' : undefined }}>{WD[v0.wd]}요일 · {vs.length}건</span><span className="t num">{vs.reduce((a, v) => a + v.paid, 0).toLocaleString()}원</span></div>
            {vs.map((v) => {
              const isOpen = open === v.key; const cnt = custVisits.get(v.cust) ?? 1;
              return (
                <motion.div layout="position" className="visit" key={v.key} transition={spring}>
                  <div className="visit-main" onClick={() => setOpen(isOpen ? null : v.key)}>
                    <div className="time num">{String(v.hour).padStart(2, '0')}:{v.dtText.slice(-2)}</div>
                    <Avatar name={v.customer} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cust-name">{v.customer}{v.isNew && <span className="tag new">첫 방문</span>}{!v.isNew && cnt >= 3 && <span className="tag reg">단골</span>}</div>
                      <div className="cust-sub num">{v.phone ? `${v.phone.slice(0, 3)}-****-${v.phone.slice(-4)}` : '연락처 없음'}</div>
                    </div>
                    <div className="svc-chips">{v.lines.map((l, i) => <span key={i} className={`svc-chip ${l.cat === '패디' ? 'pedi' : ''}`}>{l.service}{l.qty > 1 ? ` ×${l.qty}` : ''}</span>)}</div>
                    <div className="pay-badges" onClick={(e) => e.stopPropagation()}>
                      {PAY_KEYS.filter((k) => v.pay[k] > 0).map((k) => (
                        <span key={k} className="pay-badge"><Icon name={PAY_META[k].icon} size={12} stroke={2} />{wonShort(v.pay[k])}</span>
                      ))}
                      {v.pay.card > 0 && (
                        <select className={`mini ${v.cardCo === UNASSIGNED ? 'unset' : ''}`} value={v.cardCo} title="카드사 지정 → 수수료 자동 계산"
                          onChange={(e) => { const co = e.target.value; update((d) => { if (co === UNASSIGNED) delete d.cardAssign[v.key]; else d.cardAssign[v.key] = co; }); }}>
                          {cards.map((c) => <option key={c} value={c}>{c === UNASSIGNED ? '카드사 미지정' : c}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="amount num">{v.paid.toLocaleString()}<small>{v.fee ? `수수료 ${v.fee.toLocaleString()}` : v.discount > 0 ? `할인 ${v.discount.toLocaleString()}` : ' '}</small></div>
                    <Icon name="chevron" size={16} style={{ color: '#6E625A', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .3s' }} />
                  </div>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} style={{ overflow: 'hidden' }}>
                        <div className="visit-detail">
                          <table className="line-table"><tbody>
                            {v.lines.map((l, i) => (
                              <tr key={i}><td>{l.cat} · {l.service}{l.qty > 1 ? ` ×${l.qty}` : ''}</td><td className="muted" style={{ textAlign: 'right', fontWeight: 400 }}>정가 {(l.unit * l.qty).toLocaleString()}{l.unit * l.qty - l.paid - l.point > 0 ? ` · 할인 ${(l.unit * l.qty - l.paid - l.point).toLocaleString()}` : ''}{l.point ? ` · 포인트 ${l.point.toLocaleString()}` : ''}</td><td>{l.paid.toLocaleString()}원</td></tr>
                            ))}
                            <tr><td className="b">결제 합계</td><td className="muted" style={{ textAlign: 'right' }}>카드 {pct(v.cardRate, 2)} {v.cardFee ? `= ${v.cardFee.toLocaleString()}` : ''}{v.easyFee ? ` · 간편결제 ${v.easyFee.toLocaleString()}` : ''}</td><td>{v.paid.toLocaleString()}원</td></tr>
                            <tr><td className="b" style={{ color: '#2D6A45' }}>순입금</td><td /><td style={{ color: '#2D6A45' }}>{v.net.toLocaleString()}원</td></tr>
                          </tbody></table>
                          <div className="memo-box">{v.memo ? v.memo : <span className="muted">메모 없음</span>}<div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{v.id} · 이 고객 {cnt}번째 방문(이 기간)</div></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        );
      })}
      {shown > limit && <div style={{ textAlign: 'center', marginTop: 10 }}><button className="btn ghost" onClick={() => setLimit((l) => l + 80)}>더 보기</button></div>}
    </div>
  );
}
