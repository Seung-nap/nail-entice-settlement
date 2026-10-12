import fs from 'node:fs';
import { parseSalesWorkbook, mergeLines, buildVisits } from '../src/lib/data';
import { emptyData, uid } from '../src/lib/model';
import { buildWorkbook, SH } from '../src/lib/workbook';
import { Engine } from '../src/lib/engine';
import { exportWorkbook } from '../src/lib/exporter';

const [,, input, out, dataOut] = process.argv;
const buf = fs.readFileSync(input);
const t0 = performance.now();
const pr = await parseSalesWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const data = emptyData();
data.lines = mergeLines([], pr).merged;
data.entries.push({ id: uid(), date: '2026-09-01', kind: '지출', group: '임대·관리', item: '월세', title: '9월 월세', amount: 800000, method: '자동이체', recurring: true, memo: '' });
data.entries.push({ id: uid(), date: '2026-09-15', kind: '수입', group: '기타 수입', item: '제품 판매', title: '큐티클오일', amount: 30000, method: '카드', recurring: false, memo: '' });
const E = (date: string, kind: '지출' | '수입', group: string, item: string, amount: number) => data.entries.push({ id: uid(), date, kind, group, item, title: '', amount, method: '카드', recurring: false, memo: '' });
E('2026-09-05', '지출', '재료비', '젤·컬러', 100000);
E('2026-09-10', '지출', '세금·보험·금융', '대출 이자', 50000);
E('2026-09-20', '지출', '세금·보험·금융', '종합소득세', 200000);
E('2026-09-25', '수입', '기타 수입', '정부 지원금', 100000);
// 테스트용 카드 결제 방문 2건 — 데이터에서 골라낸다(고객 정보를 코드에 적지 않는다)
const cardVisits = buildVisits(data.lines).visits.filter((v) => v.pay.card > 0).slice(-2);
const [keyA, keyB] = cardVisits.map((v) => v.key);
data.cardAssign[keyA] = '체크카드';
data.cardAssign[keyB] = '현대카드';
data.settings.cards.find((c) => c.name === '현대카드')!.rate = 0.009;
data.freeSheet = { '0,0': '목표', '0,1': '4000000', '1,0': '달성', '1,1': "='월말정산'!I20/B1", '2,1': '=IF(FALSE,1,2)' };
const t1 = performance.now();
const built = buildWorkbook(data);
const t2 = performance.now();
const eng = new Engine(built);
const t3 = performance.now();
console.log('parse', (t1-t0)|0, 'build', (t2-t1)|0, 'hf', (t3-t2)|0, 'lines', pr.lines.length, 'warn', pr.warnings.length, 'visits', built.visits.length, 'months', built.months);
const sr = built.summaryRow;
for (const [k, r] of Object.entries(sr)) {
  const vals = built.months.map((m) => eng.value(SH.M, r, built.summaryCol(m)));
  const tot = eng.value(SH.M, r, built.months.length + 1);
  console.log(k.padEnd(16), JSON.stringify(vals), '|', JSON.stringify(tot));
}
// 오류 셀 스캔
let errs = 0;
for (const s of built.sheets) {
  const d = eng.size(s.name);
  for (let r = 0; r < d.height; r++) for (let c = 0; c < d.width; c++) {
    const v = eng.value(s.name, r, c);
    if (v && typeof v === 'object') { if (errs++ < 8) console.log('ERR', s.name, r, c, v, eng.formula(s.name, r, c).slice(0, 160)); }
  }
}
console.log('errors', errs);
console.log('phone cell', eng.value(SH.V, 1, 4), 'visit1', eng.value(SH.V, 1, 10), eng.value(SH.V, 1, 21), eng.value(SH.V, 1, 22));
console.log('cust top', eng.value(SH.C, 1, 1), eng.value(SH.C, 1, 3), eng.value(SH.C, 1, 4), eng.value(SH.C, 1, 8), eng.value(SH.C, 1, 9));
const t4 = performance.now();
eng.set(SH.T, 4, 2, 0.01);
console.log('recalc after rate change ms', (performance.now() - t4) | 0, 'fee total', eng.value(SH.M, sr.fee, built.months.length + 1));
eng.set(SH.T, 4, 2, 0.004);
const ab = await exportWorkbook(built, eng);
fs.writeFileSync(out, Buffer.from(ab));
console.log('exported', ab.byteLength);
if (dataOut) { fs.mkdirSync(dataOut.replace(/[\/][^\/]+$/, ''), { recursive: true }); fs.writeFileSync(dataOut, JSON.stringify({ ...data, importedAt: new Date().toISOString(), sourceName: 'selftest.xlsx' })); }
const vi = built.visits.findIndex((v) => v.key === keyA) + 1;
const vj = built.visits.findIndex((v) => v.key === keyB) + 1;
const cardA = cardVisits[0].pay.card;
const chk = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(ok ? 'PASS' : 'FAIL', name, got, ok ? '' : `want ${want}`); if (!ok) process.exitCode = 1; };
chk('check card rate', eng.value(SH.V, vi, 20), 0.0015);
chk('check card fee', eng.value(SH.V, vi, 21), Math.round(cardA * 0.0015));
chk('hyundai rate', eng.value(SH.V, vj, 20), 0.009);
chk('free FALSE', eng.value(SH.X, 2, 1), 2);
chk('paid total', eng.value(SH.M, sr.paid, built.months.length + 1), 20502500);
chk('visits total', eng.value(SH.M, sr.visits, built.months.length + 1), 375);
const S9 = (k: string) => eng.value(SH.M, sr[k], built.summaryCol(202609));
chk('expense sep (all)', S9('expense'), 1150000);
chk('revenue', S9('revenue'), 2754500 + 30000);
chk('cogs', S9('cogs'), 100000);
chk('gross', S9('grossProfit'), 2684500);
chk('sga', S9('sga'), 23576 + 800000);
chk('tax group excl interest/tax', S9('exp_세금·보험·금융'), 0);
chk('opProfit', S9('opProfit'), 1860924);
chk('nonopInc', S9('nonopInc'), 100000);
chk('nonopExp', S9('nonopExp'), 50000);
chk('preTax', S9('preTax'), 1910924);
chk('incomeTax', S9('incomeTax'), 200000);
chk('net profit', S9('profit'), 1710924);
chk('identity', S9('profit'), (S9('paid') as number) - (S9('fee') as number) + (S9('otherIncome') as number) - (S9('expense') as number));
