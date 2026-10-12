import { useMemo } from 'react';
import { useApp } from '../store';
import { SH, VCOL } from '../lib/workbook';
import { UNASSIGNED, PAY_KEYS, PayKey, EXPENSE_GROUPS, INCOME_GROUPS } from '../lib/model';
import { serialToParts, customerKey } from '../lib/data';

export const PAY_META: Record<PayKey, { icon: string; color: string; bg: string }> = {
  cash: { icon: 'cash', color: '#6F8F5E', bg: '#E8F0E3' },
  card: { icon: 'card', color: '#B9636C', bg: '#F8E4E2' },
  transfer: { icon: 'bank', color: '#5E7FA6', bg: '#E5EDF6' },
  naver: { icon: 'naver', color: '#2E9E55', bg: '#E1F3E6' },
  etc1: { icon: 'coin', color: '#A0763F', bg: '#FBEBDC' },
  etc2: { icon: 'coin', color: '#8C6BA8', bg: '#EFE6F5' },
  etc3: { icon: 'coin', color: '#7A8C99', bg: '#E9EEF1' },
  unpaid: { icon: 'hourglass', color: '#C8575F', bg: '#FBE6E5' },
};
export const DONUT_COLORS: Record<PayKey, string> = { cash: '#A9C79F', card: '#D9878F', transfer: '#93AED0', naver: '#5DBB7E', etc1: '#EDBE95', etc2: '#B9A0CF', etc3: '#A9B6C0', unpaid: '#E2A3A6' };
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
