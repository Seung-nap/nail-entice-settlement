import { useMemo } from 'react';
import { useApp } from '../store';
import { SH, VCOL } from '../lib/workbook';
import { UNASSIGNED, PAY_KEYS, PayKey, EXPENSE_GROUPS, INCOME_GROUPS } from '../lib/model';
import { serialToParts, customerKey } from '../lib/data';

export const PAY_META: Record<PayKey, { icon: string }> = {
  cash: { icon: 'cash' }, card: { icon: 'card' }, transfer: { icon: 'bank' }, naver: { icon: 'naver' },
  etc1: { icon: 'coin' }, etc2: { icon: 'coin' }, etc3: { icon: 'coin' }, unpaid: { icon: 'hourglass' },
};
export const DONUT_COLORS: Record<PayKey, string> = { card: '#4A2E1F', naver: '#8C6E58', transfer: '#B89A80', cash: '#D9CBBB', etc1: '#6B4A36', etc2: '#A68B76', etc3: '#E6DCCF', unpaid: '#AE3F36' };
export const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const groupMeta = (name: string) => [...EXPENSE_GROUPS, ...INCOME_GROUPS].find((g) => g.name === name) ?? EXPENSE_GROUPS[EXPENSE_GROUPS.length - 1];

export function useVisitRows() {
  const { built, eng, tick, data } = useApp();
  return useMemo(() => {
    if (!built || !eng) return [];
    return built.visits.map((v, i) => {
      const r = i + 1;
      const p = serialToParts(v.dt);
      return {
        ...v, cust: customerKey(v), day: p.d, wd: p.wd, hour: p.h, dateKey: `${p.y}-${p.m}-${p.d}`,
        cardCo: data.cardAssign[v.key] ?? UNASSIGNED,
        cardRate: eng.num(SH.V, r, VCOL.cardRate), cardFee: eng.num(SH.V, r, VCOL.cardFee), easyFee: eng.num(SH.V, r, VCOL.easyFee),
        fee: eng.num(SH.V, r, VCOL.fee), net: eng.num(SH.V, r, VCOL.net), isNew: eng.num(SH.V, r, VCOL.isNew) === 1,
      };
    });
  }, [built, eng, tick, data.cardAssign]); // eslint-disable-line react-hooks/exhaustive-deps
}
export type VisitRow = ReturnType<typeof useVisitRows>[number];

export function useMonthVisits() {
  const rows = useVisitRows();
  const { month } = useApp();
  return useMemo(() => (month === 'all' ? rows : rows.filter((v) => v.month === month)), [rows, month]);
}

export function prevMonthOf(months: number[], m: number | 'all') {
  if (m === 'all') return null;
  const i = months.indexOf(m);
  return i > 0 ? months[i - 1] : null;
}

export const daysIn = (m: number) => new Date(Math.floor(m / 100), m % 100, 0).getDate();
export { PAY_KEYS };
