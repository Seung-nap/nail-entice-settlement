import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store';
import { Icon, Heart } from '../components/Icons';
import { Avatar, Empty, Modal, Seg, Stagger } from '../components/ui';
import { BarChart } from '../components/Charts';
import { useVisitRows, VisitRow } from './common';
import { monthShort, wonShort, serialToIso, maskPhone } from '../lib/data';

interface Cust { key: string; name: string; phone: string; visits: VisitRow[]; all: VisitRow[]; total: number; allTotal: number; first: number; last: number; byMonth: Map<number, { n: number; v: number }>; }

export default function Customers() {
  const { month, months } = useApp();
  const rows = useVisitRows();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'total' | 'visits' | 'recent' | 'avg'>('total');
  const [sel, setSel] = useState<Cust | null>(null);

  const custs = useMemo(() => {
    const m = new Map<string, Cust>();
    for (const v of rows) {
      const c = m.get(v.cust) ?? { key: v.cust, name: v.customer, phone: v.phone, visits: [] as VisitRow[], all: [] as VisitRow[], total: 0, allTotal: 0, first: v.dt, last: v.dt, byMonth: new Map() };
      c.all.push(v); c.allTotal += v.paid; c.last = Math.max(c.last, v.dt); c.first = Math.min(c.first, v.dt); c.name = v.customer;
      const bm = c.byMonth.get(v.month) ?? { n: 0, v: 0 }; bm.n++; bm.v += v.paid; c.byMonth.set(v.month, bm);
      if (month === 'all' || v.month === month) { c.visits.push(v); c.total += v.paid; }
      m.set(v.cust, c);
    }
    return [...m.values()].filter((c) => c.visits.length);
  }, [rows, month]);

  const list = useMemo(() => {
    const s = q.trim();
    const f = custs.filter((c) => !s || c.name.includes(s) || c.phone.includes(s.replace(/-/g, '')));
    const key = { total: (c: Cust) => c.total, visits: (c: Cust) => c.visits.length * 1e9 + c.total, recent: (c: Cust) => c.last, avg: (c: Cust) => c.total / c.visits.length }[sort];
    return f.sort((a, b) => key(b) - key(a));
  }, [custs, q, sort]);

  const total = custs.reduce((a, c) => a + c.total, 0);
  const newCnt = custs.filter((c) => month !== 'all' && Math.floor(serialToIso(c.first).slice(0, 7).replace('-', '') as unknown as number) === month).length;
  const regular = custs.filter((c) => c.all.length >= 3).length;
  const maxN = Math.max(...custs.flatMap((c) => [...c.byMonth.values()].map((x) => x.n)), 1);

  return (
    <div>
      <div className="grid g-12" style={{ marginBottom: 16 }}>
        {[
          { l: '방문 고객', v: `${custs.length}명`, ic: 'people', t: '#8E9CC4' },
          { l: month === 'all' ? '전체 고객' : '이 달 신규', v: `${month === 'all' ? custs.length : newCnt}명`, ic: 'sparkle', t: '#E3A86B' },
          { l: '단골 (누적 3회+)', v: `${regular}명`, ic: 'heart', t: '#D9878F' },
          { l: '1인당 결제', v: `${wonShort(total / (custs.length || 1))}원`, ic: 'coin', t: '#7FA37A' },
        ].map((x, i) => (
          <Stagger key={x.l} i={i} className="span-3"><div className="card hover"><div className="kpi-label"><span className="chip-ic" style={{ width: 26, height: 26, borderRadius: 8, background: `${x.t}22`, color: x.t }}><Icon name={x.ic} size={15} /></span>{x.l}</div><div className="kpi-value" style={{ fontSize: 24 }}>{x.v}</div></div></Stagger>
        ))}
      </div>
      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input placeholder="이름 · 전화번호 검색" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Seg id="csort" value={sort} onChange={setSort} options={[{ v: 'total', l: '결제순' }, { v: 'visits', l: '방문순' }, { v: 'avg', l: '객단가순' }, { v: 'recent', l: '최근순' }]} />
        <div style={{ marginLeft: 'auto' }} className="note">점 하나 = 그 달 방문 횟수 (진할수록 많이)</div>
      </div>
      <div className="card" style={{ padding: '14px 10px' }}>
        {list.length ? (
          <table className="tbl">
            <thead><tr><th style={{ width: 40 }}>#</th><th>고객</th><th className="r">방문</th><th className="r">결제</th><th className="r">객단가</th><th>월별 방문</th><th className="r">최근 방문</th></tr></thead>
            <tbody>
              {list.slice(0, 300).map((c, i) => (
                <motion.tr key={c.key} className="click" onClick={() => setSel(c)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * .015 }}>
                  <td className="b" style={{ color: i < 3 ? '#B9636C' : '#B5A496' }}>{i + 1}</td>
                  <td><div className="flex" style={{ gap: 10 }}><Avatar name={c.name} size={32} /><div><div className="cust-name">{c.name}{c.all.length >= 3 && <span className="tag reg">단골</span>}{i === 0 && sort === 'total' && <Heart size={11} />}</div><div className="cust-sub">{c.phone ? maskPhone(c.phone).replace(/-(\d+)-/, '-****-') : '연락처 없음'}</div></div></div></td>
                  <td className="r b num">{c.visits.length}회</td>
                  <td className="r b num">{c.total.toLocaleString()}원</td>
                  <td className="r num muted">{Math.round(c.total / c.visits.length).toLocaleString()}</td>
                  <td><div className="mdots">{months.map((m) => { const x = c.byMonth.get(m); const a = x ? .25 + .75 * (x.n / maxN) : 0; return <span key={m} className="mdot" title={`${monthShort(m)} ${x ? `${x.n}회 · ${x.v.toLocaleString()}원` : '방문 없음'}`} style={x ? { background: `rgba(217,135,143,${a})`, outline: m === month ? '2px solid #4A2E1F' : undefined } : { outline: m === month ? '2px solid #E2D6C8' : undefined }}>{x && x.n > 1 ? x.n : ''}</span>; })}</div></td>
                  <td className="r muted num">{serialToIso(c.last).slice(5).replace('-', '.')}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : <Empty icon="people" title="고객이 없어요" />}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div>
            <div className="flex" style={{ gap: 14 }}><Avatar name={sel.name} size={52} /><div><h2>{sel.name}</h2><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{sel.phone ? maskPhone(sel.phone) : '연락처 없음'} · 첫 방문 {serialToIso(sel.first)}</div></div>
              <button className="btn icon ghost" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}><Icon name="x" size={16} /></button></div>
            <div className="stat-grid">
              <div className="stat"><div className="l">누적 방문</div><div className="v">{sel.all.length}회</div></div>
              <div className="stat"><div className="l">누적 결제</div><div className="v">{wonShort(sel.allTotal)}원</div></div>
              <div className="stat"><div className="l">평균 주기</div><div className="v">{sel.all.length > 1 ? `${Math.round((sel.last - sel.first) / (sel.all.length - 1))}일` : '—'}</div></div>
            </div>
            <BarChart height={150} data={months.map((m) => ({ label: monthShort(m), value: sel.byMonth.get(m)?.v ?? 0, sub: `${monthShort(m)} · ${sel.byMonth.get(m)?.n ?? 0}회`, dim: !sel.byMonth.get(m) }))} />
            <div className="hr" />
            <div style={{ maxHeight: 260, overflow: 'auto' }}>
              {[...sel.all].reverse().map((v) => (
                <div key={v.key} className="entry-row" style={{ gridTemplateColumns: '92px 1fr auto' }}>
                  <span className="dt num">{v.dtText.slice(2, 10).replace(/-/g, '.')}</span>
                  <span className="ti" style={{ minWidth: 0 }}><b>{v.services}</b>{v.memo && <span>{v.memo.split('\n')[0].slice(0, 26)}</span>}</span>
                  <span className="am num">{v.paid.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
