// 정산 통합문서 정의 — 앱 내 스프레드시트(HyperFormula)와 엑셀 내보내기가 같은 정의를 공유한다.
// 모든 집계 셀은 '수식'이다. 원본 값은 매출원장·수입지출·설정 시트에만 있다.
import { AppData, PAY_KEYS, PayKey, EXPENSE_GROUPS, INCOME_GROUPS, UNASSIGNED, Visit } from './model';
import { buildVisits, customerKey, dateToSerial, monthKeyOf, toSerial } from './data';

export type Fmt = 'won' | 'int' | 'pct' | 'dt' | 'date' | 'month' | 'text' | 'num' | 'vid' | 'cid' | 'sid';
export type Sty = 'title' | 'sub' | 'head' | 'section' | 'total' | 'key' | 'input' | 'muted' | 'strong' | 'net';

export interface Cell { v: string | number | null; f?: Fmt; s?: Sty; e?: boolean; }
export type Bind =
  | { type: 'entries'; startRow: number; ids: string[] }
  | { type: 'cardAssign'; startRow: number; col: number; keys: string[] }
  | { type: 'settings' }
  | { type: 'free' }
  | { type: 'none' };

export interface SheetDef {
  name: string;
  desc: string;
  icon: string;
  rows: Cell[][];
  widths: number[];
  freeze: { r: number; c: number };
  bind: Bind;
  validations?: { col: number; fromRow: number; toRow: number; list: string }[];
}

export const VCOL = { id: 0, dt: 1, month: 2, name: 3, key: 4, svcs: 5, cnt: 6, list: 7, disc: 8, point: 9, paid: 10, pay0: 11, cardCo: 19, cardRate: 20, cardFee: 21, easyFee: 22, fee: 23, net: 24, mFirst: 25, isNew: 26, memo: 27, phone: 28 } as const;
export const SH = { M: '월말정산', V: '방문내역', L: '매출원장', C: '고객별', S: '시술별', F: '결제수수료', E: '수입지출', T: '설정', X: '자유계산' } as const;
const q = (s: string) => `'${s}'`;
export const colL = (c: number) => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const A = (c: number, r: number, absC = false, absR = false) => `${absC ? '$' : ''}${colL(c)}${absR ? '$' : ''}${r + 1}`;

const text = (v: string, s?: Sty): Cell => ({ v, f: 'text', s });
const head = (v: string): Cell => ({ v, f: 'text', s: 'head' });

// 설정 시트 고정 좌표 (0-based row)
const PAY_ROW: Record<PayKey, number> = { cash: 3, card: 4, transfer: 5, naver: 6, etc1: 7, etc2: 8, etc3: 9, unpaid: 10 };
const CARD_TOP = 13; // '미지정' 행
const CARD_MAX = 60;
const rate = (k: PayKey) => `${q(SH.T)}!$C$${PAY_ROW[k] + 1}`;
const ENTRY_MAX = 5000;

export interface Built {
  sheets: SheetDef[];
  visits: (Visit & { key: string })[];
  months: number[];
  summaryRow: Record<string, number>;   // 월말정산 행 키 → row index
  summaryCol: (m: number) => number;    // 월 → col index
  visitStart: number;                   // 방문내역 데이터 시작 row
  expenseRows: Record<string, number>;  // 대분류 → 월말정산 row
}

export function buildWorkbook(data: AppData): Built {
  const { visits, lines } = buildVisits(data.lines);
  const st = data.settings;
  const label = (k: PayKey) => st.payLabels[k] || k;

  // 월 범위: 매출·지출 최소~최대를 빈 달 없이
  const ms = new Set<number>(visits.map((v) => v.month));
  data.entries.forEach((e) => ms.add(monthKeyOf(e.date)));
  let months = [...ms].sort((a, b) => a - b);
  if (months.length) {
    const out: number[] = []; let y = Math.floor(months[0] / 100), m = months[0] % 100;
    const last = months[months.length - 1];
    while (y * 100 + m <= last) { out.push(y * 100 + m); m++; if (m > 12) { m = 1; y++; } }
    months = out;
  } else {
    const d = new Date(); months = [d.getFullYear() * 100 + d.getMonth() + 1];
  }

  // ───────── 매출원장 ─────────
  const L_COLS = ['판매일시', '월', '방문ID', '고객명', '휴대폰', '구분', '시술', '단가', '개수', '정가', '포인트차감', '결제액', '할인', ...PAY_KEYS.map(label), '결제검증', '메모', '시술코드'];
  const nL = Math.max(lines.length, 1);
  const lEnd = nL + 1; // 1-based 마지막 행
  const LR = (c: number) => `${q(SH.L)}!$${colL(c)}$2:$${colL(c)}$${lEnd}`;
  const L = { dt: 0, month: 1, vid: 2, name: 3, phone: 4, cat: 5, svc: 6, unit: 7, qty: 8, list: 9, point: 10, paid: 11, disc: 12, pay0: 13, scode: 23 };
  // 매칭 키는 전부 숫자(문자열 비교보다 SUMIFS가 훨씬 빠르다) — 표시는 서식으로 V0001 / C001 / S01
  const vno = (id: string) => Number(id.slice(1));
  const custNo = new Map<string, number>();
  for (const v of visits) { const k = customerKey(v); if (!custNo.has(k)) custNo.set(k, custNo.size + 1); }
  const svcNo = new Map<string, number>();
  const svcKey = (cat: string, svc: string) => `${cat}|${svc}`;
  for (const l of [...lines].sort((a, b) => a.cat.localeCompare(b.cat) || a.service.localeCompare(b.service))) { const k = svcKey(l.cat, l.service); if (!svcNo.has(k)) svcNo.set(k, svcNo.size + 1); }
  const lRows: Cell[][] = [L_COLS.map(head)];
  lines.forEach((l, i) => {
    const r = i + 1;
    lRows.push([
      { v: l.dt, f: 'dt' }, { v: `=YEAR(${A(0, r)})*100+MONTH(${A(0, r)})`, f: 'month' }, { v: vno(l.visitId), f: 'vid', s: 'muted' }, text(l.customer), text(l.phone),
      text(l.cat), text(l.service), { v: l.unit, f: 'won' }, { v: l.qty, f: 'int' }, { v: `=${A(7, r)}*${A(8, r)}`, f: 'won' },
      { v: l.point, f: 'won' }, { v: l.paid, f: 'won', s: 'strong' }, { v: `=${A(9, r)}-${A(10, r)}-${A(11, r)}`, f: 'won' },
      ...PAY_KEYS.map((k) => ({ v: l.pay[k] || null, f: 'won' as Fmt })),
      { v: `=${A(11, r)}-SUM(${A(13, r)}:${A(20, r)})`, f: 'won', s: 'muted' }, text(l.memo.replace(/\n/g, ' / '), 'muted'), { v: svcNo.get(svcKey(l.cat, l.service))!, f: 'sid', s: 'muted' },
    ]);
  });

  // ───────── 방문내역 ─────────
  const V = VCOL;
  const V_COLS = ['방문ID', '일시', '월', '고객명', '고객번호', '시술내역', '시술수', '정가', '할인', '포인트', '결제액', ...PAY_KEYS.map(label), '카드사', '카드수수료율', '카드수수료', '간편결제수수료', '총수수료', '순입금액', '월고객(첫방문)', '신규고객', '메모', '휴대폰'];
  const nV = Math.max(visits.length, 1);
  const vEnd = nV + 1;
  const VR = (c: number) => `${q(SH.V)}!$${colL(c)}$2:$${colL(c)}$${vEnd}`;
  const vRows: Cell[][] = [V_COLS.map(head)];
  const payCol = (k: PayKey) => V.pay0 + PAY_KEYS.indexOf(k);
  visits.forEach((v, i) => {
    const r = i + 1;
    const sum = (lc: number): Cell => ({ v: `=SUMIFS(${LR(lc)},${LR(L.vid)},${A(0, r, true)})`, f: 'won' });
    const assigned = data.cardAssign[v.key] || UNASSIGNED;
    const easy = (['cash', 'transfer', 'naver', 'etc1', 'etc2', 'etc3'] as PayKey[]).map((k) => `${A(payCol(k), r)}*${rate(k)}`).join('+');
    vRows.push([
      { v: vno(v.id), f: 'vid', s: 'muted' }, { v: v.dt, f: 'dt' }, { v: `=YEAR(${A(1, r)})*100+MONTH(${A(1, r)})`, f: 'month' },
      text(v.customer), { v: custNo.get(customerKey(v))!, f: 'cid', s: 'muted' }, text(v.services),
      { v: `=COUNTIF(${LR(L.vid)},${A(0, r, true)})`, f: 'int' },
      sum(L.list), sum(L.disc), sum(L.point), { ...sum(L.paid), s: 'strong' },
      ...PAY_KEYS.map((_, j) => sum(L.pay0 + j)),
      { v: assigned, f: 'text', s: 'input', e: true },
      { v: `=IF(${A(payCol('card'), r)}=0,0,IFERROR(VLOOKUP(${A(V.cardCo, r)},${q(SH.T)}!$A$${CARD_TOP + 1}:$B$${CARD_MAX},2,0),${rate('card')}))`, f: 'pct' },
      { v: `=ROUND(${A(payCol('card'), r)}*${A(V.cardRate, r)},0)`, f: 'won' },
      { v: `=ROUND(${easy},0)`, f: 'won' },
      { v: `=${A(V.cardFee, r)}+${A(V.easyFee, r)}`, f: 'won' },
      { v: `=${A(V.paid, r)}-${A(V.fee, r)}-${A(payCol('unpaid'), r)}`, f: 'won', s: 'strong' },
      // 이 방문이 (그 달 / 전체 기간) 이 고객의 첫 방문이면 1 — 고정 범위 MINIFS라 정렬과 무관
      { v: `=IF(MINIFS($B$2:$B$${vEnd},$E$2:$E$${vEnd},${A(4, r)},$C$2:$C$${vEnd},${A(2, r)})=${A(1, r)},1,0)`, f: 'int', s: 'muted' },
      { v: `=IF(MINIFS($B$2:$B$${vEnd},$E$2:$E$${vEnd},${A(4, r)})=${A(1, r)},1,0)`, f: 'int', s: 'muted' },
      text(v.memo.replace(/\n/g, ' / '), 'muted'), text(v.phone),
    ]);
  });

  // ───────── 수입지출 ─────────
  const E_COLS = ['날짜', '구분', '대분류', '항목', '내용', '금액', '결제수단', '매월고정', '메모'];
  const entries = [...data.entries].sort((a, b) => a.date.localeCompare(b.date));
  const eRows: Cell[][] = [E_COLS.map(head)];
  entries.forEach((e) => {
    eRows.push([
      { v: dateToSerial(e.date), f: 'date', e: true }, { v: e.kind, f: 'text', e: true }, { v: e.group, f: 'text', e: true }, { v: e.item, f: 'text', e: true },
      { v: e.title, f: 'text', e: true }, { v: e.amount, f: 'won', e: true, s: 'strong' }, { v: e.method, f: 'text', e: true },
      { v: e.recurring ? 'Y' : '', f: 'text', e: true }, { v: e.memo, f: 'text', e: true },
    ]);
  });
  for (let i = 0; i < 30; i++) eRows.push(E_COLS.map((_, c) => ({ v: null, f: c === 0 ? 'date' : c === 5 ? 'won' : 'text', e: true })));
  const ER = (c: number) => `${q(SH.E)}!$${colL(c)}$2:$${colL(c)}$${ENTRY_MAX}`;

  // ───────── 설정 ─────────
  const tRows: Cell[][] = [
    [text('결제 수수료 설정', 'title')],
    [text('수수료율을 바꾸면 방문내역·결제수수료·월말정산이 즉시 다시 계산돼요. (예: 0.4% → 0.004)', 'sub')],
    [head('결제수단'), head('표시 이름'), head('수수료율'), head('설명')],
  ];
  const payDesc: Record<PayKey, string> = {
    cash: '현금은 수수료 없음', card: '카드사 미지정 시 적용되는 기본율 (영세 신용 0.40%)', transfer: '계좌이체 수수료 없음',
    naver: '네이버페이 예약결제 수수료 — 스마트플레이스 정산내역에서 확인 후 수정', etc1: 'POS 기타1 결제', etc2: 'POS 기타2 결제', etc3: 'POS 기타3~5·할인 결제', unpaid: '미수금(아직 안 받은 돈)',
  };
  PAY_KEYS.forEach((k) => tRows.push([text(k), { v: label(k), f: 'text', e: true, s: 'input' }, { v: st.payRates[k], f: 'pct', e: true, s: 'input' }, text(payDesc[k], 'muted')]));
  tRows.push([]);
  tRows.push([head('카드사'), head('수수료율'), head('설명')]);
  tRows.push([text(UNASSIGNED), { v: `=C${PAY_ROW.card + 1}`, f: 'pct' }, text('카드사를 지정하지 않은 결제 → 카드 기본율', 'muted')]);
  st.cards.forEach((c) => tRows.push([{ v: c.name, f: 'text', e: true, s: 'input' }, { v: c.rate, f: 'pct', e: true, s: 'input' }, text('')]));
  // 분류 목록(엑셀 데이터 유효성 원본)
  const groupNames = [...EXPENSE_GROUPS, ...INCOME_GROUPS].map((g) => g.name);
  tRows[2][5] = head('수입·지출 대분류'); tRows[2][6] = head('항목 예시');
  [...EXPENSE_GROUPS, ...INCOME_GROUPS].forEach((g, i) => {
    const r = 3 + i;
    while (tRows.length <= r) tRows.push([]);
    tRows[r][5] = text(g.name); tRows[r][6] = text(g.items.join(', '), 'muted');
  });

  // ───────── 월말정산 ─────────
  const mRows: Cell[][] = [];
  const summaryRow: Record<string, number> = {};
  const nM = months.length;
  const mc = (i: number) => 1 + i;          // 월 열
  const totC = 1 + nM;                      // 합계 열
  const add = (key: string | null, labelText: string, fn: ((c: number, r: number) => string) | null, opt: { f?: Fmt; s?: Sty; total?: 'sum' | ((r: number) => string) | null } = {}) => {
    const r = mRows.length;
    if (key) summaryRow[key] = r;
    const row: Cell[] = [text(labelText, opt.s === 'section' ? 'section' : opt.s)];
    if (fn) {
      for (let i = 0; i < nM; i++) row.push({ v: fn(mc(i), r), f: opt.f ?? 'won', s: opt.s });
      const t = opt.total === undefined ? 'sum' : opt.total;
      row.push(t === 'sum' ? { v: `=SUM(${A(mc(0), r)}:${A(mc(nM - 1), r)})`, f: opt.f ?? 'won', s: opt.s === 'net' ? 'net' : 'total' }
        : t ? { v: t(r), f: opt.f ?? 'won', s: 'total' } : { v: null });
    }
    mRows.push(row);
    return r;
  };
  mRows.push([text(`${st.shopName} 월말정산`, 'title')]);
  mRows.push([text('모든 칸이 수식이에요 — 매출원장·방문내역·수입지출·설정 시트를 참조해 자동 계산됩니다.', 'sub')]);
  const HDR = mRows.length;
  mRows.push([head('구분'), ...months.map((m) => ({ v: toSerial(Math.floor(m / 100), m % 100, 1), f: 'month' as Fmt, s: 'head' as Sty })), head('합계')]);
  summaryRow.header = HDR;
  const KEY = add('mkey', '월 코드', (c) => `=YEAR(${A(c, HDR, false, true)})*100+MONTH(${A(c, HDR, false, true)})`, { f: 'month', s: 'key', total: null });
  const mk = (c: number) => A(c, KEY, false, true);
  const vSum = (vc: number) => (c: number) => `=SUMIFS(${VR(vc)},${VR(V.month)},${mk(c)})`;
  const dFrom = (c: number) => `">="&${A(c, HDR, false, true)}`;
  const dTo = (c: number) => `"<"&EDATE(${A(c, HDR, false, true)},1)`;

  add(null, '영업 현황', null, { s: 'section' });
  const rVisits = add('visits', '방문 건수', (c) => `=COUNTIF(${VR(V.month)},${mk(c)})`, { f: 'int' });
  const rCust = add('customers', '방문 고객 수', vSum(V.mFirst), { f: 'int', total: () => `=SUM(${VR(V.isNew)})` });
  const rNew = add('newCustomers', '신규 고객', vSum(V.isNew), { f: 'int' });
  const rRet = add('returning', '재방문 고객', (c) => `=${A(c, rCust)}-${A(c, rNew)}`, { f: 'int', total: null });
  add('services', '시술 건수', (c) => `=COUNTIF(${LR(L.month)},${mk(c)})`, { f: 'int' });

  add(null, '매출', null, { s: 'section' });
  const rList = add('list', '정가 매출', vSum(V.list));
  add('discount', '할인', vSum(V.disc));
  add('point', '포인트 사용', vSum(V.point));
  const rPaid = add('paid', '실결제 매출', vSum(V.paid), { s: 'strong' });
  add('avg', '객단가 (실결제÷방문)', (c) => `=IFERROR(${A(c, rPaid)}/${A(c, rVisits)},0)`, { total: () => `=IFERROR(${A(totC, rPaid)}/${A(totC, rVisits)},0)` });
  add('discountRate', '할인율', (c) => `=IFERROR(1-${A(c, rPaid)}/${A(c, rList)},0)`, { f: 'pct', total: () => `=IFERROR(1-${A(totC, rPaid)}/${A(totC, rList)},0)` });

  add(null, '결제수단별', null, { s: 'section' });
  const payRows: Record<string, number> = {};
  PAY_KEYS.forEach((k) => { payRows[k] = add(`pay_${k}`, label(k), vSum(payCol(k))); });

  add(null, '결제 수수료', null, { s: 'section' });
  add('cardFee', '카드 수수료', vSum(V.cardFee));
  add('easyFee', '간편결제·기타 수수료', vSum(V.easyFee));
  const rFee = add('fee', '수수료 합계', vSum(V.fee), { s: 'strong' });
  const rNet = add('netSales', '순매출 (입금액)', (c) => `=${A(c, rPaid)}-${A(c, rFee)}-${A(c, payRows.unpaid)}`, { s: 'strong' });

  add(null, '수입', null, { s: 'section' });
  const rInc = add('otherIncome', '기타 수입', (c) => `=SUMIFS(${ER(5)},${ER(1)},"수입",${ER(0)},${dFrom(c)},${ER(0)},${dTo(c)})`);
  const rTotalIn = add('totalIncome', '총 수입', (c) => `=${A(c, rNet)}+${A(c, rInc)}`, { s: 'strong' });

  add(null, '지출', null, { s: 'section' });
  const expenseRows: Record<string, number> = {};
  const exStart = mRows.length;
  EXPENSE_GROUPS.forEach((g) => {
    expenseRows[g.name] = add(`exp_${g.name}`, g.name, (c, r) => `=SUMIFS(${ER(5)},${ER(1)},"지출",${ER(2)},$A${r + 1},${ER(0)},${dFrom(c)},${ER(0)},${dTo(c)})`);
  });
  const exEnd = mRows.length - 1;
  const rExp = add('expense', '지출 합계', (c) => `=SUM(${A(c, exStart)}:${A(c, exEnd)})`, { s: 'strong' });

  add(null, '결산', null, { s: 'section' });
  const rProfit = add('profit', '순수익', (c) => `=${A(c, rTotalIn)}-${A(c, rExp)}`, { s: 'net' });
  add('margin', '순이익률 (순수익÷실결제)', (c) => `=IFERROR(${A(c, rProfit)}/${A(c, rPaid)},0)`, { f: 'pct', total: () => `=IFERROR(${A(totC, rProfit)}/${A(totC, rPaid)},0)` });
  add('cumProfit', '누적 순수익', (c) => (c === mc(0) ? `=${A(c, rProfit)}` : `=${A(c - 1, mRows.length)}+${A(c, rProfit)}`), { total: null });
  add('feeRate', '매출 대비 수수료율', (c) => `=IFERROR(${A(c, rFee)}/${A(c, rPaid)},0)`, { f: 'pct', total: () => `=IFERROR(${A(totC, rFee)}/${A(totC, rPaid)},0)` });
  add('expRate', '매출 대비 지출률', (c) => `=IFERROR(${A(c, rExp)}/${A(c, rPaid)},0)`, { f: 'pct', total: () => `=IFERROR(${A(totC, rExp)}/${A(totC, rPaid)},0)` });

  // ───────── 고객별 ─────────
  const custMap = new Map<string, { name: string; key: string; no: number; total: number }>();
  for (const v of visits) {
    const k = customerKey(v);
    const c = custMap.get(k) ?? { name: v.customer, key: v.phone, no: custNo.get(k)!, total: 0 };
    c.total += v.paid; c.name = v.customer; custMap.set(k, c);
  }
  const custs = [...custMap.values()].sort((a, b) => b.total - a.total);
  const C_COLS = ['순위', '고객명', '고객번호', '방문수', '총결제', '객단가', '정가 합', '할인·포인트', '첫 방문', '최근 방문', '평균 방문주기(일)', '휴대폰', ...months.map((m) => `${m % 100}월 결제`), ...months.map((m) => `${m % 100}월 방문`)];
  const cRows: Cell[][] = [C_COLS.map(head)];
  custs.forEach((c, i) => {
    const r = i + 1; const key = A(2, r, true);
    const row: Cell[] = [
      { v: i + 1, f: 'int', s: 'muted' }, text(c.name, 'strong'), { v: c.no, f: 'cid', s: 'muted' },
      { v: `=COUNTIF(${VR(V.key)},${key})`, f: 'int' },
      { v: `=SUMIFS(${VR(V.paid)},${VR(V.key)},${key})`, f: 'won', s: 'strong' },
      { v: `=IFERROR(${A(4, r)}/${A(3, r)},0)`, f: 'won' },
      { v: `=SUMIFS(${VR(V.list)},${VR(V.key)},${key})`, f: 'won' },
      { v: `=SUMIFS(${VR(V.disc)},${VR(V.key)},${key})+SUMIFS(${VR(V.point)},${VR(V.key)},${key})`, f: 'won' },
      { v: `=MINIFS(${VR(V.dt)},${VR(V.key)},${key})`, f: 'date' },
      { v: `=MAXIFS(${VR(V.dt)},${VR(V.key)},${key})`, f: 'date' },
      { v: `=IF(${A(3, r)}>1,ROUND((${A(9, r)}-${A(8, r)})/(${A(3, r)}-1),0),"")`, f: 'int' },
      text(c.key, 'muted'),
    ];
    months.forEach((m) => row.push({ v: `=SUMIFS(${VR(V.paid)},${VR(V.key)},${key},${VR(V.month)},${m})`, f: 'won' }));
    months.forEach((m) => row.push({ v: `=COUNTIFS(${VR(V.key)},${key},${VR(V.month)},${m})`, f: 'int' }));
    cRows.push(row);
  });
  {
    const r = cRows.length; const n = custs.length;
    const tot: Cell[] = [text(''), text('합계', 'total'), text(`${n}명`, 'total')];
    for (let c = 3; c < C_COLS.length; c++) {
      if ([5, 8, 9, 10, 11].includes(c)) tot.push({ v: c === 5 ? `=IFERROR(${A(4, r)}/${A(3, r)},0)` : null, f: 'won', s: 'total' });
      else tot.push({ v: `=SUM(${A(c, 1)}:${A(c, Math.max(n, 1))})`, f: c >= 12 + months.length || c === 3 ? 'int' : 'won', s: 'total' });
    }
    cRows.push(tot);
  }
  // 합계 열의 재방문 고객 = 전체 기간 2회 이상 방문한 고객 수
  mRows[rRet][totC] = { v: `=COUNTIF(${q(SH.C)}!$D$2:$D$${Math.max(custs.length, 1) + 1},">1")`, f: 'int', s: 'total' };

  // ───────── 시술별 ─────────
  const svcMap = new Map<string, { cat: string; svc: string; total: number }>();
  for (const l of lines) {
    const k = `${l.cat}|${l.service}`;
    const s = svcMap.get(k) ?? { cat: l.cat, svc: l.service, total: 0 };
    s.total += l.paid; svcMap.set(k, s);
  }
  const svcs = [...svcMap.values()].sort((a, b) => a.cat.localeCompare(b.cat) || b.total - a.total);
  const S_COLS = ['코드', '구분', '시술', '건수', '실결제 매출', '건당 평균', '매출 비중', '정가 매출', ...months.map((m) => `${m % 100}월 매출`), ...months.map((m) => `${m % 100}월 건수`)];
  const sRows: Cell[][] = [S_COLS.map(head)];
  const sTotRow = svcs.length + 1;
  svcs.forEach((s, i) => {
    const r = i + 1;
    const crit = `${LR(L.scode)},${A(0, r, true)}`;
    const row: Cell[] = [
      { v: svcNo.get(svcKey(s.cat, s.svc))!, f: 'sid', s: 'muted' }, text(s.cat, 'muted'), text(s.svc, 'strong'),
      { v: `=COUNTIFS(${crit})`, f: 'int' },
      { v: `=SUMIFS(${LR(L.paid)},${crit})`, f: 'won', s: 'strong' },
      { v: `=IFERROR(${A(4, r)}/${A(3, r)},0)`, f: 'won' },
      { v: `=IFERROR(${A(4, r)}/${A(4, sTotRow, false, true)},0)`, f: 'pct' },
      { v: `=SUMIFS(${LR(L.list)},${crit})`, f: 'won' },
    ];
    months.forEach((m) => row.push({ v: `=SUMIFS(${LR(L.paid)},${crit},${LR(L.month)},${m})`, f: 'won' }));
    months.forEach((m) => row.push({ v: `=COUNTIFS(${crit},${LR(L.month)},${m})`, f: 'int' }));
    sRows.push(row);
  });
  {
    const n = Math.max(svcs.length, 1);
    const tot: Cell[] = [text(''), text(''), text('합계', 'total')];
    for (let c = 3; c < S_COLS.length; c++) {
      if (c === 5) tot.push({ v: `=IFERROR(${A(4, sTotRow)}/${A(3, sTotRow)},0)`, f: 'won', s: 'total' });
      else if (c === 6) tot.push({ v: `=SUM(${A(c, 1)}:${A(c, n)})`, f: 'pct', s: 'total' });
      else tot.push({ v: `=SUM(${A(c, 1)}:${A(c, n)})`, f: c === 3 || c >= 8 + months.length ? 'int' : 'won', s: 'total' });
    }
    sRows.push(tot);
  }

  // ───────── 결제수수료 ─────────
  const fRows: Cell[][] = [
    [text('결제수단별 결제액 · 수수료', 'title')],
    [text('카드사는 방문내역 시트의 [카드사] 칸에서 지정해요. 미지정은 카드 기본율이 적용돼요.', 'sub')],
    [head('결제수단'), ...months.map((m) => ({ v: toSerial(Math.floor(m / 100), m % 100, 1), f: 'month' as Fmt, s: 'head' as Sty })), head('합계'), head('수수료율')],
  ];
  const fHdr = 2;
  const fKey = (c: number) => `(YEAR(${A(c, fHdr, false, true)})*100+MONTH(${A(c, fHdr, false, true)}))`;
  const fSumRow = (labelText: string, vc: number, extra: Cell | null, s?: Sty) => {
    const r = fRows.length;
    const row: Cell[] = [text(labelText, s)];
    months.forEach((_, i) => row.push({ v: `=SUMIFS(${VR(vc)},${VR(V.month)},${fKey(1 + i)})`, f: 'won', s }));
    row.push({ v: `=SUM(${A(1, r)}:${A(nM, r)})`, f: 'won', s: 'total' });
    if (extra) row.push(extra);
    fRows.push(row);
    return r;
  };
  const fPayStart = fRows.length;
  PAY_KEYS.forEach((k) => fSumRow(label(k), payCol(k), { v: k === 'card' ? '카드사별' : `=${rate(k)}`, f: k === 'card' ? 'text' : 'pct', s: 'muted' }));
  {
    const r = fRows.length; const row: Cell[] = [text('결제 합계', 'total')];
    for (let c = 1; c <= nM + 1; c++) row.push({ v: `=SUM(${A(c, fPayStart)}:${A(c, r - 1)})`, f: 'won', s: 'total' });
    fRows.push(row);
  }
  fRows.push([]);
  fRows.push([head('수수료'), ...months.map(() => head('')), head('합계')]);
  fSumRow('카드 수수료', V.cardFee, null);
  fSumRow('간편결제·기타 수수료', V.easyFee, null);
  fSumRow('수수료 합계', V.fee, null, 'strong');
  fRows.push([]);
  fRows.push([text('카드사별 수수료', 'title')]);
  const fcHdr = fRows.length;
  fRows.push([head('카드사'), head('수수료율'), head('결제 건수'), head('카드 결제액'), head('수수료'), head('실효율'), ...months.map((m) => head(`${m % 100}월 결제액`))]);
  const cardNames = [UNASSIGNED, ...st.cards.map((c) => c.name)];
  cardNames.forEach((name, i) => {
    const r = fRows.length;
    const co = A(0, r, true);
    const row: Cell[] = [
      text(name, 'strong'),
      { v: `=IFERROR(VLOOKUP(${co},${q(SH.T)}!$A$${CARD_TOP + 1}:$B$${CARD_MAX},2,0),0)`, f: 'pct' },
      { v: `=COUNTIFS(${VR(V.cardCo)},${co},${VR(payCol('card'))},">0")`, f: 'int' },
      { v: `=SUMIFS(${VR(payCol('card'))},${VR(V.cardCo)},${co})`, f: 'won' },
      { v: `=SUMIFS(${VR(V.cardFee)},${VR(V.cardCo)},${co})`, f: 'won', s: 'strong' },
      { v: `=IFERROR(${A(4, r)}/${A(3, r)},0)`, f: 'pct', s: 'muted' },
      ...months.map((m) => ({ v: `=SUMIFS(${VR(payCol('card'))},${VR(V.cardCo)},${co},${VR(V.month)},${m})`, f: 'won' as Fmt })),
    ];
    fRows.push(row);
    void i;
  });
  {
    const r = fRows.length; const a = fcHdr + 1, b = r - 1;
    fRows.push([text('합계', 'total'), { v: null, s: 'total' }, { v: `=SUM(${A(2, a)}:${A(2, b)})`, f: 'int', s: 'total' }, { v: `=SUM(${A(3, a)}:${A(3, b)})`, f: 'won', s: 'total' }, { v: `=SUM(${A(4, a)}:${A(4, b)})`, f: 'won', s: 'total' }, { v: `=IFERROR(${A(4, r)}/${A(3, r)},0)`, f: 'pct', s: 'total' },
      ...months.map((_, i) => ({ v: `=SUM(${A(6 + i, a)}:${A(6 + i, b)})`, f: 'won' as Fmt, s: 'total' as Sty }))]);
  }

  // ───────── 자유계산 ─────────
  const xRows: Cell[][] = [];
  const free = Object.keys(data.freeSheet).length ? data.freeSheet : {
    '0,0': '자유 계산 시트 — 엑셀처럼 아무 수식이나 쓸 수 있어요', '2,0': '예) 이번 달 실결제', '2,1': `='${SH.M}'!${colL(totC - 1)}${summaryRow.paid + 1}`,
    '3,0': '예) 목표 매출', '3,1': '4000000', '4,0': '달성률', '4,1': '=IFERROR(B3/B4,0)',
  };
  let maxR = 40, maxC = 12;
  for (const k of Object.keys(free)) { const [r, c] = k.split(',').map(Number); maxR = Math.max(maxR, r + 10); maxC = Math.max(maxC, c + 3); }
  for (let r = 0; r < maxR; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < maxC; c++) { const raw = free[`${r},${c}`]; row.push({ v: raw ?? null, e: true, f: 'num' }); }
    xRows.push(row);
  }

  const W = (n: number, w = 92) => Array(n).fill(w);
  const sheets: SheetDef[] = [
    { name: SH.M, icon: 'chart', desc: '월별 매출·수수료·지출·순수익 — 전부 수식', rows: mRows, widths: [190, ...W(nM, 108), 120], freeze: { r: 3, c: 1 }, bind: { type: 'none' } },
    { name: SH.V, icon: 'calendar', desc: '고객 1회 방문 = 1행 · 카드사 지정 가능', rows: vRows, widths: [70, 128, 70, 76, 70, 260, 56, ...W(4, 84), 90, ...W(PAY_KEYS.length, 84), 100, 84, 84, 96, 84, 92, 92, 70, 220, 110], freeze: { r: 1, c: 4 }, bind: { type: 'cardAssign', startRow: 1, col: V.cardCo, keys: visits.map((v) => v.key) },
      validations: [{ col: V.cardCo, fromRow: 1, toRow: vEnd - 1, list: `${q(SH.T)}!$A$${CARD_TOP + 1}:$A$${CARD_MAX}` }] },
    { name: SH.L, icon: 'list', desc: 'POS 원본 — 시술 1건 = 1행', rows: lRows, widths: [128, 70, 70, 76, 108, 52, 190, 80, 48, 80, 80, 88, 80, ...W(PAY_KEYS.length, 84), 70, 260, 64], freeze: { r: 1, c: 4 }, bind: { type: 'none' } },
    { name: SH.C, icon: 'people', desc: '고객별 방문수·결제·월별 추이', rows: cRows, widths: [48, 80, 70, 60, 96, 88, 88, 88, 96, 96, 100, 110, ...W(nM * 2, 84)], freeze: { r: 1, c: 3 }, bind: { type: 'none' } },
    { name: SH.S, icon: 'polish', desc: '시술별 건수·매출·월별 추이', rows: sRows, widths: [52, 52, 210, 56, 100, 88, 72, 96, ...W(nM * 2, 84)], freeze: { r: 1, c: 3 }, bind: { type: 'none' } },
    { name: SH.F, icon: 'card', desc: '결제수단·카드사별 수수료', rows: fRows, widths: [150, ...W(Math.max(nM + 2, 6), 100)], freeze: { r: 3, c: 1 }, bind: { type: 'none' } },
    { name: SH.E, icon: 'wallet', desc: '지출·기타수입 기입 — 바로 편집 가능', rows: eRows, widths: [100, 56, 120, 140, 200, 100, 84, 70, 200], freeze: { r: 1, c: 0 }, bind: { type: 'entries', startRow: 1, ids: entries.map((e) => e.id) },
      validations: [
        { col: 1, fromRow: 1, toRow: ENTRY_MAX - 1, list: '"지출,수입"' },
        { col: 2, fromRow: 1, toRow: ENTRY_MAX - 1, list: `${q(SH.T)}!$F$4:$F$${3 + groupNames.length}` },
      ] },
    { name: SH.T, icon: 'gear', desc: '수수료율 · 표시 이름', rows: tRows, widths: [110, 110, 90, 380, 30, 130, 420], freeze: { r: 0, c: 0 }, bind: { type: 'settings' } },
    { name: SH.X, icon: 'pencil', desc: '메모장처럼 자유롭게 계산', rows: xRows, widths: [220, ...W(maxC - 1, 100)], freeze: { r: 0, c: 0 }, bind: { type: 'free' } },
  ];

  return { sheets, visits, months, summaryRow, summaryCol: (m) => 1 + months.indexOf(m), visitStart: 1, expenseRows };
}

export const SETTINGS_LAYOUT = { PAY_ROW, CARD_TOP };
