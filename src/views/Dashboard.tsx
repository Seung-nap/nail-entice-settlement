import React, { useMemo } from 'react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { CountUp, Delta, Stagger, Empty, Avatar } from '../components/ui';
import { BarChart, Donut, Waterfall, LineChart, BarList } from '../components/Charts';
import { useMonthVisits, useVisitRows, prevMonthOf, PAY_KEYS, DONUT_COLORS, daysIn, WD } from './common';
import { monthShort, wonShort, pct, toSerial, serialToParts, monthKeyOf } from '../lib/data';
import { EXPENSE_GROUPS } from '../lib/model';

export default function Dashboard({ go }: { go: (p: string) => void }) {
  const { sv, month, months, data } = useApp();
  const visits = useMonthVisits();
  const all = useVisitRows();
  const prev = prevMonthOf(months, month);

  // 진행 중인 달(데이터가 말일 전에 끝남)은 지난달 '같은 날짜까지'와 비교한다
  const lastSalesMonth = all.length ? all[all.length - 1].month : null;
  const cutoff = month === 'all' ? 0 : Math.max(0, ...visits.map((v) => v.day));
  const partial = month !== 'all' && month === lastSalesMonth && cutoff > 0 && cutoff < daysIn(month);
  const same = useMemo(() => {
    if (!partial || !prev) return null;
    const pv = all.filter((v) => v.month === prev && v.day <= cutoff);
    const paid = pv.reduce((a, v) => a + v.paid, 0), fee = pv.reduce((a, v) => a + v.fee, 0), unpaid = pv.reduce((a, v) => a + v.pay.unpaid, 0);
    const es = data.entries.filter((e) => monthKeyOf(e.date) === prev && Number(e.date.slice(8, 10)) <= cutoff);
    const exp = es.filter((e) => e.kind === '지출').reduce((a, e) => a + e.amount, 0), inc = es.filter((e) => e.kind === '수입').reduce((a, e) => a + e.amount, 0);
    return { paid, visits: pv.length, avg: pv.length ? paid / pv.length : 0, profit: paid - fee - unpaid + inc - exp } as Record<string, number>;
  }, [partial, prev, cutoff, all, data.entries]);
  const P = (k: string) => (!prev ? null : same ? same[k] ?? null : sv(k, prev));
  const vsLabel = same ? '전월 동기 대비' : '전월 대비';
  const prevHasExp = prev != null && data.entries.some((e) => e.kind === '지출' && monthKeyOf(e.date) === prev && (!same || Number(e.date.slice(8, 10)) <= cutoff));
  const skipProfitDelta = month !== 'all' && sv('expense') === 0 && prevHasExp;
  const label = month === 'all' ? '전체 기간' : `${Math.floor(month / 100)}년 ${month % 100}월${partial ? ` (${cutoff}일까지)` : ''}`;
  const recent = useMemo(() => [...visits].sort((a, b) => b.dt - a.dt).slice(0, 6), [visits]);

  const paid = sv('paid'), profit = sv('profit'), fee = sv('fee'), expense = sv('expense'), inc = sv('otherIncome');
  const visitsN = sv('visits'), custN = sv('customers'), newN = sv('newCustomers'), avg = sv('avg');

  const daily = useMemo(() => {
    if (month === 'all') return months.map((m) => ({ label: monthShort(m), value: sv('paid', m), sub: `${Math.floor(m / 100)}년 ${m % 100}월` }));
    const n = daysIn(month), arr = Array.from({ length: n }, (_, i) => {
      const p = serialToParts(toSerial(Math.floor(month / 100), month % 100, i + 1));
      return { label: String(i + 1), value: 0, sub: `${month % 100}월 ${i + 1}일 (${WD[p.wd]})`, dim: false, cnt: 0 };
    });
    for (const v of visits) { arr[v.day - 1].value += v.paid; arr[v.day - 1].cnt++; }
    arr.forEach((a) => { a.dim = a.value === 0; a.sub += a.cnt ? ` · ${a.cnt}건` : ''; });
    return arr;
  }, [visits, month, months, sv]);

  const payData = PAY_KEYS.map((k) => ({ label: data.settings.payLabels[k], value: sv(`pay_${k}`), color: DONUT_COLORS[k] })).filter((d) => d.value > 0);

  const topSvc = useMemo(() => {
    const m = new Map<string, { v: number; n: number }>();
    for (const v of visits) for (const l of v.lines) { const x = m.get(l.service) ?? { v: 0, n: 0 }; x.v += l.paid; x.n++; m.set(l.service, x); }
    return [...m.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5).map(([name, x]) => ({ name, value: x.v, sub: `${x.n}건` }));
  }, [visits]);
  const topCust = useMemo(() => {
    const m = new Map<string, { name: string; v: number; n: number }>();
    for (const v of visits) { const x = m.get(v.cust) ?? { name: v.customer, v: 0, n: 0 }; x.v += v.paid; x.n++; m.set(v.cust, x); }
    return [...m.values()].sort((a, b) => b.v - a.v).slice(0, 5);
  }, [visits]);
  const expRows = EXPENSE_GROUPS.map((g) => ({ name: g.name, value: sv(`exp_${g.name}`) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const trendPaid = months.map((m) => sv('paid', m)), trendProfit = months.map((m) => sv('profit', m));

  const revenue = sv('revenue'), cogs = sv('cogs'), sga = sv('sga'), opProfit = sv('opProfit');
  const nonop = sv('nonopInc') - sv('nonopExp'), tax = sv('incomeTax');
  const steps = [
    { label: '매출액', value: revenue, kind: 'start' as const },
    ...(cogs ? [{ label: '매출원가', value: cogs, kind: 'minus' as const }] : []),
    { label: '판관비', value: sga, kind: 'minus' as const },
    ...(nonop ? [{ label: '영업외', value: Math.abs(nonop), kind: nonop > 0 ? 'plus' as const : 'minus' as const }] : []),
    ...(tax ? [{ label: '소득세', value: tax, kind: 'minus' as const }] : []),
    { label: '당기순이익', value: profit, kind: 'total' as const },
  ];
  return (
    <div className="grid g-12">
      <Stagger i={0} className="span-5" style={{ display: 'flex' }}>
        <div className="card hero hover" style={{ flex: 1 }}>
          <div className="kpi-label">{label} 당기순이익</div>
          <div className={`kpi-value ${profit < 0 ? 'neg' : ''}`}><CountUp value={profit} /><span className="unit">원</span></div>
          <div className="kpi-foot">{skipProfitDelta ? <span>이번 달 지출을 기입하면 지난달과 비교해드려요</span> : <Delta cur={profit} prev={P('profit')} suffix={vsLabel} />}</div>
          <div className="flex" style={{ marginTop: 18, justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-80)', lineHeight: 1.7 }}>
              영업이익 <b className="num">{wonShort(opProfit)}원</b> · 순이익률 <b className="num">{pct(sv('margin'))}</b><br />
              {expense === 0 ? <span>아직 기입된 지출이 없어요 — <button className="b" style={{ color: '#4A2E1F', textDecoration: 'underline' }} onClick={() => go('expenses')}>지출 기입하기</button></span> : <>지출 <b className="num">{wonShort(expense)}원</b> · 매출 대비 {pct(sv('expRate'))}</>}
            </div>
          </div>
        </div>
      </Stagger>
      <div className="span-7 grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {[
          { l: '실결제 매출', v: paid, k: 'paid', ic: 'coin', tone: '#6B4A36', foot: <>정가 {wonShort(sv('list'))}원 · 할인 {pct(sv('discountRate'))}</> },
          { l: '방문 · 고객', v: visitsN, k: 'visits', ic: 'people', tone: '#8C6E58', unit: '건', foot: <>고객 {custN}명 · 신규 {newN}명</> },
          { l: '객단가', v: avg, k: 'avg', ic: 'polish', tone: '#8C6E58', foot: <>시술 {sv('services')}건</> },
        ].map((x, i) => (
          <Stagger key={x.k} i={i + 1} style={{ display: 'flex' }}>
            <div className="card hover" style={{ flex: 1 }}>
              <div className="kpi-label">{x.l}</div>
              <div className="kpi-value"><CountUp value={x.v} /><span className="unit">{x.unit ?? '원'}</span></div>
              <div className="kpi-foot" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}><Delta cur={x.v} prev={P(x.k)} suffix={vsLabel} /><span>{x.foot}</span></div>
            </div>
          </Stagger>
        ))}
      </div>

      <Stagger i={4} className="span-8">
        <div className="card">
          <div className="card-h"><div><div className="card-t">손익 흐름</div><div className="card-d">매출액에서 비용을 빼 당기순이익이 되기까지</div></div>
            <div className="right"><span className="card-d">영업이익률 <b style={{ color: 'var(--ink)' }} className="num">{pct(sv('opMargin'))}</b></span></div></div>
          {revenue || expense ? <Waterfall steps={steps} /> : <Empty icon="flow" title="이 달은 아직 데이터가 없어요" />}
        </div>
      </Stagger>
      <Stagger i={5} className="span-4" style={{ display: 'flex' }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-h"><div><div className="card-t">결제수단</div><div className="card-d">수수료 {wonShort(fee)}원</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('payments')}>자세히</button></div></div>
          {payData.length ? (
            <div className="flex" style={{ gap: 18, alignItems: 'center' }}>
              <Donut data={payData} size={132} thick={18} center={<div><div style={{ fontSize: 13, color: 'var(--ink-60)', fontWeight: 700 }}>결제 합계</div><div style={{ fontSize: 17, fontWeight: 700 }}>{wonShort(paid)}</div></div>} />
              <div className="legend" style={{ flex: 1, minWidth: 0 }}>
                {payData.map((d) => <div key={d.label} className="legend-row"><span className="dot" style={{ background: d.color }} />{d.label}<span className="val num">{wonShort(d.value)}</span><span className="sub">{pct(d.value / (paid || 1), 0)}</span></div>)}
              </div>
            </div>
          ) : <Empty icon="card" title="결제 내역 없음" />}
        </div>
      </Stagger>

      <Stagger i={6} className="span-8">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><div><div className="card-t">최근 방문</div><div className="card-d">{month === 'all' ? '전체 기간' : `${month % 100}월`} 마지막 방문부터</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('visits')}>전체 보기</button></div></div>
          {recent.length ? (
            <table className="tbl"><tbody>
              {recent.map((v) => (
                <tr key={v.key} className="click" onClick={() => go('visits')}>
                  <td className="muted num" style={{ width: 120, whiteSpace: 'nowrap' }}>{v.month % 100}.{String(v.day).padStart(2, '0')} {v.dtText.slice(11)}</td>
                  <td style={{ width: 90, whiteSpace: 'nowrap' }}><b>{v.customer}</b></td>
                  <td className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0, width: '100%' }}>{v.services}</td>
                  <td className="r b num" style={{ whiteSpace: 'nowrap' }}>{v.paid.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody></table>
          ) : <Empty icon="calendar" title="방문 내역이 없어요" />}
        </div>
      </Stagger>
      <Stagger i={7} className="span-4" style={{ display: 'flex' }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-h"><div><div className="card-t">지출 구성</div><div className="card-d">합계 {wonShort(expense)}원</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('expenses')}><Icon name="plus" size={14} />기입</button></div></div>
          {expRows.length ? <BarList rows={expRows.slice(0, 6).map((r) => ({ ...r, extra: null, sub: pct(r.value / (expense || 1), 0) }))} />
            : <Empty icon="wallet" title="지출을 기입하면 당기순이익이 정확해져요">월세·재료비·공과금부터 시작해보세요</Empty>}
          {expRows.length > 0 && <div className="note" style={{ marginTop: 12 }}>가장 큰 지출: <b>{expRows[0].name}</b></div>}
        </div>
      </Stagger>

      <Stagger i={8} className="span-12">
        <div className="card">
          <div className="card-h"><div><div className="card-t">{month === 'all' ? '월별 매출' : '일별 매출'}</div><div className="card-d">{month === 'all' ? '월별 실결제 합계' : '하루 실결제 합계 · 막대에 마우스를 올려보세요'}</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('visits')}>방문 내역</button></div></div>
          <BarChart data={daily} />
        </div>
      </Stagger>
      <Stagger i={8} className="span-4">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><div><div className="card-t">인기 시술 TOP 5</div><div className="card-d">실결제 기준</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('services')}>전체</button></div></div>
          {topSvc.length ? <BarList rows={topSvc} /> : <Empty icon="polish" title="시술 내역 없음" />}
        </div>
      </Stagger>
      <Stagger i={9} className="span-4">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><div><div className="card-t">고객 TOP 5</div><div className="card-d">결제 금액 기준</div></div>
            <div className="right"><button className="btn sm ghost" onClick={() => go('customers')}>전체</button></div></div>
          <div className="bar-list">
            {topCust.map((c, i) => (
              <div key={c.name + i} className="flex" style={{ gap: 11 }}>
                <Avatar name={c.name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}><div className="b" style={{ fontSize: 14 }}>{c.name}</div><div className="muted" style={{ fontSize: 13 }}>{c.n}회 방문</div></div>
                <div className="b num">{wonShort(c.v)}원</div>
              </div>
            ))}
            {!topCust.length && <Empty icon="people" title="고객 없음" />}
          </div>
        </div>
      </Stagger>
      <Stagger i={10} className="span-4">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><div><div className="card-t">월별 추이</div><div className="card-d">실결제 · 당기순이익</div></div></div>
          <LineChart labels={months.map(monthShort)} active={month === 'all' ? undefined : months.indexOf(month)}
            series={[{ name: '실결제', color: '#B89A80', values: trendPaid }, { name: '당기순이익', color: '#4A2E1F', values: trendProfit }]} height={190} />
        </div>
      </Stagger>
    </div>
  );
}
