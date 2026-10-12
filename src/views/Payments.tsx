import React, { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Icon } from '../components/Icons';
import { CountUp, Stagger, Strip } from '../components/ui';
import { useMonthVisits, PAY_KEYS, DONUT_COLORS } from './common';
import { UNASSIGNED } from '../lib/model';
import { wonShort, pct } from '../lib/data';

export function RateInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [t, setT] = useState<string | null>(null);
  const shown = t ?? (value * 100).toFixed(2).replace(/\.?0+$/, '');
  const commit = () => { if (t == null) return; const n = Number(t.replace(/[%\s]/g, '')); if (Number.isFinite(n) && n >= 0 && n < 100) onCommit(n / 100); setT(null); };
  return (
    <span className="flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
      <input className="inp sm rate-inp num" value={shown} onChange={(e) => setT(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setT(null); }} />
      <span className="muted b">%</span>
    </span>
  );
}

export default function Payments() {
  const { data, update, sv } = useApp();
  const visits = useMonthVisits();
  const st = data.settings;
  const paid = sv('paid');

  const byCard = useMemo(() => {
    const m = new Map<string, { n: number; amt: number; fee: number }>();
    for (const v of visits) if (v.pay.card > 0) { const x = m.get(v.cardCo) ?? { n: 0, amt: 0, fee: 0 }; x.n++; x.amt += v.pay.card; x.fee += v.cardFee; m.set(v.cardCo, x); }
    return m;
  }, [visits]);
  const unassigned = byCard.get(UNASSIGNED);

  return (
    <div className="grid g-12">
      <div className="span-12">
        <Strip items={PAY_KEYS.filter((k) => sv(`pay_${k}`) > 0 || ['cash', 'card', 'transfer', 'naver'].includes(k)).map((k) => {
          const amt = sv(`pay_${k}`);
          const fee = k === 'card' ? sv('cardFee') : Math.round(amt * st.payRates[k]);
          return {
            l: <span className="flex" style={{ justifyContent: 'space-between' }}><span>{st.payLabels[k]}</span><span className="num">{pct(amt / (paid || 1), 0)}</span></span>,
            v: <><CountUp value={amt} /><small>원</small></>,
            sub: <>
              <div className="bar-track" style={{ margin: '2px 0 10px' }}><div className="bar-fill" style={{ transform: `scaleX(${amt / (paid || 1)})`, background: DONUT_COLORS[k], transition: 'transform .8s cubic-bezier(.16,1,.3,1)' }} /></div>
              수수료 <b className="num">{fee.toLocaleString()}원</b>{k !== 'card' && <> ({pct(st.payRates[k], 2)})</>}
            </>,
          };
        })} />
      </div>
      <Stagger i={1} className="span-8">
        <div className="card">
          <div className="card-h"><div><div className="card-t">카드사별 수수료</div><div className="card-d">방문 내역에서 카드사를 지정하면 그 카드사 요율로 계산돼요</div></div>
            <div className="right"><span className="card-d">카드 수수료 합계 <b className="num" style={{ color: '#4A2E1F' }}>{sv('cardFee').toLocaleString()}원</b></span></div></div>
          <table className="tbl">
            <thead><tr><th>카드사</th><th className="r">수수료율</th><th className="r">건수</th><th className="r">카드 결제액</th><th className="r">수수료</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>
              <tr>
                <td><b>카드사 미지정</b><div className="muted" style={{ fontSize: 13 }}>카드 기본율 적용</div></td>
                <td className="r"><RateInput value={st.payRates.card} onCommit={(v) => update((d) => { d.settings.payRates.card = v; }, '카드 기본 수수료율을 바꿨어요')} /></td>
                <td className="r num">{unassigned?.n ?? 0}</td><td className="r num">{(unassigned?.amt ?? 0).toLocaleString()}</td><td className="r num b">{(unassigned?.fee ?? 0).toLocaleString()}</td><td />
              </tr>
              {st.cards.map((c, i) => {
                const x = byCard.get(c.name);
                return (
                  <tr key={c.name + i}>
                    <td><input className="inp sm" style={{ width: 140, background: 'transparent', boxShadow: 'none', fontWeight: 700, padding: 0 }} defaultValue={c.name}
                      onBlur={(e) => { const n = e.target.value.trim(); if (!n || n === c.name) { e.target.value = c.name; return; } update((d) => { const old = d.settings.cards[i].name; d.settings.cards[i].name = n; for (const k in d.cardAssign) if (d.cardAssign[k] === old) d.cardAssign[k] = n; }, '카드사 이름을 바꿨어요'); }} /></td>
                    <td className="r"><RateInput value={c.rate} onCommit={(v) => update((d) => { d.settings.cards[i].rate = v; }, `${c.name} 수수료율 ${pct(v, 2)}`)} /></td>
                    <td className="r num">{x?.n ?? 0}</td><td className="r num">{(x?.amt ?? 0).toLocaleString()}</td><td className="r num b">{(x?.fee ?? 0).toLocaleString()}</td>
                    <td><button className="icon-btn" title="카드사 삭제" onClick={() => update((d) => { const nm = d.settings.cards[i].name; d.settings.cards.splice(i, 1); for (const k in d.cardAssign) if (d.cardAssign[k] === nm) delete d.cardAssign[k]; }, `${c.name}를 목록에서 뺐어요`)}><Icon name="trash" size={15} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="btn sm soft" style={{ marginTop: 12 }} onClick={() => update((d) => { d.settings.cards.push({ name: `새 카드사 ${d.settings.cards.length + 1}`, rate: d.settings.payRates.card }); }, '카드사를 추가했어요')}><Icon name="plus" size={14} />카드사 추가</button>
        </div>
      </Stagger>
      <Stagger i={2} className="span-4">
        <div className="card" style={{ height: '100%' }}>
          <div className="card-h"><div><div className="card-t">수수료율 기준</div><div className="card-d">가게 상황에 맞게 바꿔주세요</div></div></div>
          <table className="tbl" style={{ marginBottom: 12 }}>
            <tbody>
              {PAY_KEYS.filter((k) => k !== 'card' && k !== 'unpaid').map((k) => (
                <tr key={k}><td><b>{st.payLabels[k]}</b></td><td className="r"><RateInput value={st.payRates[k]} onCommit={(v) => update((d) => { d.settings.payRates[k] = v; }, `${st.payLabels[k]} 수수료율 ${pct(v, 2)}`)} /></td></tr>
              ))}
            </tbody>
          </table>
          <div className="note">
            · <b>카드</b>: 연매출 3억 이하 영세가맹점 우대율 <b>신용 0.40% · 체크 0.15%</b>(2026년 하반기 기준). 개업 초기엔 일반 요율이 먼저 빠지고, 영세 판정 후 차액이 환급돼요.<br />
            · <b>네이버페이</b>: 기본값 2.00%는 <b>추정치</b>예요. 스마트플레이스·네이버페이센터 정산 내역의 실제 요율로 바꿔주세요.<br />
            · 수수료율을 바꾸면 모든 달의 정산이 즉시 다시 계산돼요.
          </div>
          <div className="hr" />
          <div className="flex" style={{ justifyContent: 'space-between', fontSize: 13 }}><span className="muted">이 기간 수수료 합계</span><b className="num">{wonShort(sv('fee'))}원</b></div>
          <div className="flex" style={{ justifyContent: 'space-between', fontSize: 13, marginTop: 6 }}><span className="muted">매출 대비</span><b className="num">{pct(sv('feeRate'), 2)}</b></div>
        </div>
      </Stagger>
    </div>
  );
}
