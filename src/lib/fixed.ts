// 고정비 — 한 번 등록하면 매달 자동으로 들어가는 지출 (월세·관리비·구독료 등)
// 저장은 '규칙' 하나(FixedCost), 화면·스프레드시트·엑셀에는 달마다 펼친 행으로 보인다.
import { AppData, Entry, FixedCost, uid } from './model';
import { pad } from './data';

export const ym = (y: number, m: number) => y * 100 + m;
export const nextYm = (k: number) => (k % 100 === 12 ? ym(Math.floor(k / 100) + 1, 1) : k + 1);
export const prevYm = (k: number) => (k % 100 === 1 ? ym(Math.floor(k / 100) - 1, 12) : k - 1);
export const ymOf = (iso: string) => Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7));
export const nowYm = () => { const d = new Date(); return ym(d.getFullYear(), d.getMonth() + 1); };
const lastDay = (k: number) => new Date(Math.floor(k / 100), k % 100, 0).getDate();
export const fixedKey = (id: string, k: number) => `fx:${id}:${k}`;
export const parseFixedKey = (key: string) => { const [, id, k] = key.split(':'); return { id, month: Number(k) }; };

/** 그 달의 기본 금액(이력 중 그 달 이전에 시작된 마지막 금액) */
export function baseAmount(fc: FixedCost, k: number) {
  let a = fc.amounts[0]?.amount ?? 0;
  for (const h of [...fc.amounts].sort((x, y) => x.from - y.from)) if (h.from <= k) a = h.amount;
  return a;
}
/** 그 달 실제 금액 — 제외한 달이면 null */
export function amountFor(fc: FixedCost, k: number): number | null {
  if (k < fc.from || (fc.to != null && k > fc.to) || fc.skip.includes(k)) return null;
  const o = fc.overrides[String(k)];
  return o != null ? o : baseAmount(fc, k);
}
export const activeIn = (fc: FixedCost, k: number) => k >= fc.from && (fc.to == null || k <= fc.to);

/** 고정비를 펼칠 마지막 달: 이번 달 · 마지막 매출 달 · 마지막 기입 달 중 가장 늦은 달 */
export function horizon(data: AppData) {
  let h = nowYm();
  for (const l of data.lines) { const k = ymOf(l.dtText); if (k > h) h = k; }
  for (const e of data.entries) { const k = ymOf(e.date); if (k > h) h = k; }
  return h;
}

export function expandFixed(data: AppData, until = horizon(data)): Entry[] {
  const out: Entry[] = [];
  for (const fc of data.fixed ?? []) {
    for (let k = fc.from; k <= until && (fc.to == null || k <= fc.to); k = nextYm(k)) {
      const amount = amountFor(fc, k);
      if (amount == null) continue;
      out.push({
        id: fixedKey(fc.id, k), date: `${Math.floor(k / 100)}-${pad(k % 100)}-${pad(Math.min(fc.day, lastDay(k)))}`,
        kind: '지출', group: fc.group, item: fc.item, title: fc.title, amount, method: fc.method, recurring: true, memo: fc.memo, fixedId: fc.id,
      });
    }
  }
  return out;
}

/** 직접 기입한 지출·수입 + 고정비 펼친 행 */
export const allEntries = (data: AppData) => [...data.entries, ...expandFixed(data)];

export function newFixed(p: Pick<FixedCost, 'group' | 'item' | 'title' | 'method' | 'day' | 'from' | 'memo'> & { amount: number }): FixedCost {
  return { id: uid(), group: p.group, item: p.item, title: p.title, method: p.method, day: p.day, from: p.from, to: null, amounts: [{ from: p.from, amount: p.amount }], skip: [], overrides: {}, memo: p.memo };
}

/**
 * v1 → v2: 예전 '매월 고정' 표시를 붙인 지출을 고정비 규칙으로 바꾼다. 금액 손실 없이:
 * 처음 달부터 금액이 바뀐 달마다 이력을 남기고, 기록이 없던 중간 달은 '제외'로 표시해 과거 합계를 그대로 유지한다.
 */
export function migrateToV2(d: AppData): boolean {
  if ((d.version ?? 1) >= 2 && Array.isArray(d.fixed)) return false;
  d.fixed = d.fixed ?? [];
  const groups = new Map<string, Entry[]>();
  for (const e of d.entries) if (e.recurring && e.kind === '지출') {
    const k = `${e.group}|${e.item}|${e.title}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const moved = new Set<string>();
  for (const es of groups.values()) {
    es.sort((a, b) => a.date.localeCompare(b.date));
    const byMonth = new Map<number, Entry>();
    for (const e of es) { const k = ymOf(e.date); if (byMonth.has(k)) continue; byMonth.set(k, e); moved.add(e.id); }  // 같은 달 중복분은 일반 지출로 남김
    const months = [...byMonth.keys()].sort((a, b) => a - b);
    const first = byMonth.get(months[0])!;
    const fc = newFixed({ group: first.group, item: first.item, title: first.title, method: first.method, day: Number(first.date.slice(8, 10)), from: months[0], memo: first.memo, amount: first.amount });
    fc.amounts = [];
    let prevAmt: number | null = null;
    for (let k = months[0]; k <= months[months.length - 1]; k = nextYm(k)) {
      const e = byMonth.get(k);
      if (!e) { fc.skip.push(k); continue; }
      if (e.amount !== prevAmt) { fc.amounts.push({ from: k, amount: e.amount }); prevAmt = e.amount; }
    }
    d.fixed.push(fc);
  }
  d.entries = d.entries.filter((e) => !moved.has(e.id)).map((e) => ({ ...e, recurring: false }));
  d.version = 2;
  return true;
}
