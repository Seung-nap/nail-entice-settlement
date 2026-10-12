import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { Empty, Stagger, Seg } from '../components/ui';
import { Donut, Spark } from '../components/Charts';
import { useVisitRows } from './common';
import { wonShort, pct, monthShort } from '../lib/data';

const CAT_COLOR: Record<string, string> = { 네일: '#D9878F', 패디: '#93AED0' };

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
      <Stagger i={0} className="span-4">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><span className="chip-ic" style={{ background: '#F8E4E2', color: '#B9636C' }}><Icon name="polish" size={17} /></span><div><div className="card-t">네일 · 패디 비중</div><div className="card-d">시술 {totalCnt}건 · {wonShort(total)}원</div></div></div>
          <div className="flex" style={{ gap: 18 }}>
            <Donut size={140} thick={18} data={[...cats.entries()].map(([k, v]) => ({ label: k, value: v.rev, color: CAT_COLOR[k] ?? '#EDBE95' }))}
              center={<div><div style={{ fontSize: 11.5, color: '#A88C78', fontWeight: 700 }}>시술 매출</div><div style={{ fontSize: 16, fontWeight: 800 }}>{wonShort(total)}</div></div>} />
            <div className="legend" style={{ flex: 1 }}>
              {[...cats.entries()].map(([k, v]) => (
                <div key={k} className="legend-row" style={{ flexWrap: 'wrap' }}><span className="dot" style={{ background: CAT_COLOR[k] ?? '#EDBE95' }} /><b>{k}</b><span className="val num">{wonShort(v.rev)}</span>
                  <div className="muted" style={{ width: '100%', fontSize: 11.5, paddingLeft: 18 }}>{v.cnt}건 · 건당 {wonShort(v.rev / v.cnt)} · {pct(v.rev / (total || 1), 0)}</div></div>
              ))}
            </div>
          </div>
        </div>
      </Stagger>
      <Stagger i={1} className="span-8">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><span className="chip-ic" style={{ background: '#FBEBDC', color: '#A86E3D' }}><Icon name="sparkle" size={17} /></span><div><div className="card-t">한눈에 보는 시술 성적표</div><div className="card-d">건당 평균은 할인·포인트 반영 후 실결제 기준</div></div></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[...svcs].sort((a, b) => b.rev - a.rev).slice(0, 3).map((s, i) => (
              <div key={s.svc + s.cat} className="stat" style={{ background: i === 0 ? 'linear-gradient(135deg,#FBEBDC,#F8E4E2)' : undefined }}>
                <div className="l">{['매출 1위', '매출 2위', '매출 3위'][i]} · {s.cat}</div>
                <div className="v" style={{ fontSize: 16, marginTop: 6 }}>{s.svc}</div>
                <div className="flex" style={{ justifyContent: 'space-between', marginTop: 8, alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 12, color: '#7A5A47' }}><b className="num">{wonShort(s.rev)}원</b><br />{s.cnt}건 · 건당 {wonShort(s.rev / s.cnt)}</div>
                  <Spark values={months.map((m) => s.byMonth.get(m) ?? 0)} w={70} h={30} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Stagger>
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
                    <td className="b" style={{ color: i < 3 ? '#B9636C' : '#B5A496' }}>{i + 1}</td>
                    <td><span className="tag" style={{ background: `${CAT_COLOR[s.cat] ?? '#EDBE95'}22`, color: CAT_COLOR[s.cat] ?? '#A86E3D', marginRight: 7 }}>{s.cat}</span><b>{s.svc}</b></td>
                    <td><div className="bar-track" style={{ height: 9 }}><motion.div className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: (metric === 'rev' ? s.rev : s.cnt) / max }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: i * .03 }} style={{ background: `linear-gradient(90deg, #EDBE95, ${CAT_COLOR[s.cat] ?? '#D9878F'})` }} /></div></td>
                    <td className="r num b">{s.cnt}</td>
                    <td className="r num b">{s.rev.toLocaleString()}</td>
                    <td className="r num">{Math.round(s.rev / s.cnt).toLocaleString()}</td>
                    <td className="r num muted">{s.list ? pct(1 - s.rev / s.list, 0) : '—'}</td>
                    <td className="r"><Spark values={months.map((m) => s.byMonth.get(m) ?? 0)} w={70} h={22} color={CAT_COLOR[s.cat] ?? '#D9878F'} /></td>
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
