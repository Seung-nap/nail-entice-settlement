import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { Empty, Stagger, Seg, Strip } from '../components/ui';
import { Spark } from '../components/Charts';
import { useVisitRows } from './common';
import { wonShort, pct, monthShort } from '../lib/data';

const CAT_COLOR: Record<string, string> = { 네일: '#4A2E1F', 패디: '#B89A80' };

export default function Services() {
  const { month, months } = useApp();
  const rows = useVisitRows();
  const [cat, setCat] = useState<'all' | string>('all');
  const [metric, setMetric] = useState<'rev' | 'cnt'>('rev');

  const { svcs, cats, total, totalCnt } = useMemo(() => {
    const m = new Map<string, { svc: string; cat: string; rev: number; cnt: number; list: number; byMonth: Map<number, number> }>();
    const cats = new Map<string, { rev: number; cnt: number }>();
    let total = 0, totalCnt = 0;
    for (const v of rows) for (const l of v.lines) {
      const k = `${l.cat}|${l.service}`;
      const x = m.get(k) ?? { svc: l.service, cat: l.cat, rev: 0, cnt: 0, list: 0, byMonth: new Map() };
      x.byMonth.set(v.month, (x.byMonth.get(v.month) ?? 0) + l.paid);
      if (month === 'all' || v.month === month) {
        x.rev += l.paid; x.cnt++; x.list += l.unit * l.qty; total += l.paid; totalCnt++;
        const c = cats.get(l.cat) ?? { rev: 0, cnt: 0 }; c.rev += l.paid; c.cnt++; cats.set(l.cat, c);
      }
      m.set(k, x);
    }
    return { svcs: [...m.values()].filter((x) => x.cnt), cats, total, totalCnt };
  }, [rows, month]);

  const list = svcs.filter((s) => cat === 'all' || s.cat === cat).sort((a, b) => (metric === 'rev' ? b.rev - a.rev : b.cnt - a.cnt));
  const max = Math.max(...list.map((s) => (metric === 'rev' ? s.rev : s.cnt)), 1);

  return (
    <div className="grid g-12">
      <div className="span-12">
        <Strip items={[
          { l: '시술 매출', v: <>{wonShort(total)}<small>원</small></>, sub: `시술 ${totalCnt}건 · 건당 ${wonShort(total / (totalCnt || 1))}원` },
          ...[...cats.entries()].filter(() => cats.size > 1).map(([k, v]) => ({ l: k, v: <>{wonShort(v.rev)}<small>원</small></>, sub: `${v.cnt}건 · 매출의 ${pct(v.rev / (total || 1), 0)}` })),
          ...(svcs.length ? [{ l: '매출 1위 시술', v: <span style={{ fontSize: 22 }}>{[...svcs].sort((x, y) => y.rev - x.rev)[0].svc}</span>, sub: `${wonShort([...svcs].sort((x, y) => y.rev - x.rev)[0].rev)}원` }] : []),
        ]} />
      </div>
      <Stagger i={2} className="span-12">
        <div className="card">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Seg id="scat" value={cat} onChange={setCat} options={[{ v: 'all', l: '전체' }, ...[...cats.keys()].map((k) => ({ v: k, l: k }))]} />
            <Seg id="smetric" value={metric} onChange={setMetric} options={[{ v: 'rev', l: '매출순' }, { v: 'cnt', l: '건수순' }]} />
            <span className="note" style={{ marginLeft: 'auto' }}>오른쪽 작은 그래프 = 월별 매출 추이 ({months.map(monthShort).join(' → ')})</span>
          </div>
          {list.length ? (
            <table className="tbl">
              <thead><tr><th style={{ width: 36 }}>#</th><th>시술</th><th style={{ width: '32%' }}>{metric === 'rev' ? '매출' : '건수'}</th><th className="r">건수</th><th className="r">실결제</th><th className="r">건당 평균</th><th className="r">할인율</th><th className="r">추이</th></tr></thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.cat + s.svc}>
                    <td className="b" style={{ color: i < 3 ? '#4A2E1F' : '#6E625A' }}>{i + 1}</td>
                    <td><span className="tag" style={{ background: `${CAT_COLOR[s.cat] ?? '#B89A80'}22`, color: CAT_COLOR[s.cat] ?? '#6B4A36', marginRight: 7 }}>{s.cat}</span><b>{s.svc}</b></td>
                    <td><div className="bar-track" style={{ height: 9 }}><motion.div className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: (metric === 'rev' ? s.rev : s.cnt) / max }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: i * .03 }} /></div></td>
                    <td className="r num b">{s.cnt}</td>
                    <td className="r num b">{s.rev.toLocaleString()}</td>
                    <td className="r num">{Math.round(s.rev / s.cnt).toLocaleString()}</td>
                    <td className="r num muted">{s.list ? pct(1 - s.rev / s.list, 0) : '—'}</td>
                    <td className="r"><Spark values={months.map((m) => s.byMonth.get(m) ?? 0)} w={70} h={22} color={CAT_COLOR[s.cat] ?? '#6B4A36'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty icon="polish" title="시술 내역이 없어요" />}
        </div>
      </Stagger>
    </div>
  );
}
