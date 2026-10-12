// 엑셀 내보내기 — 모든 집계를 '살아있는 수식'으로 기록 (+ 계산된 결과값 캐시)
import ExcelJS from 'exceljs';
import type { Built, Cell, Fmt, Sty } from './workbook';
import type { Engine } from './engine';

const NUMFMT: Partial<Record<Fmt, string>> = {
  won: '#,##0;[Red]-#,##0;"-"', int: '#,##0;-#,##0;"-"', pct: '0.00%', dt: 'yyyy-mm-dd hh:mm', date: 'yyyy-mm-dd', month: 'yyyy.mm', num: 'General', vid: '"V"0000', cid: '"C"000', sid: '"S"00',
};
// 엑셀 2010 이후 추가된 함수는 파일 안에서 _xlfn. 접두어가 있어야 Excel이 인식한다 (없으면 #NAME?)
const XLFN = ['MINIFS', 'MAXIFS', 'IFS', 'SWITCH', 'CONCAT', 'TEXTJOIN', 'XLOOKUP', 'XMATCH', 'IFNA', 'DAYS', 'ISOWEEKNUM', 'FILTER', 'UNIQUE', 'SORT', 'SEQUENCE', 'STDEV.S', 'STDEV.P', 'VAR.S', 'VAR.P', 'CEILING.MATH', 'FLOOR.MATH'];
const XLFN_RE = new RegExp('(?<![A-Za-z0-9_.])(' + XLFN.map((f) => f.replace('.', '[.]')).join('|') + ')[(]', 'gi');
export const toFileFormula = (f: string) => f.replace(XLFN_RE, (_m, n: string) => `_xlfn.${n.toUpperCase()}(`);

const C = { cream: 'FFFBF5E9', paper: 'FFFFFDF8', espresso: 'FF4A2E1F', cocoa: 'FF7A5A47', rose: 'FFD9878F', blush: 'FFF8E4E2', line: 'FFEADFCF', input: 'FFFFF6D8', net: 'FFEAF2E6' };

function styleCell(x: ExcelJS.Cell, c: Cell) {
  const s: Sty | undefined = c.s;
  x.font = { name: '맑은 고딕', size: 10, color: { argb: C.espresso } };
  x.border = { bottom: { style: 'hair', color: { argb: C.line } } };
  if (c.f && NUMFMT[c.f]) x.numFmt = NUMFMT[c.f]!;
  if (c.f === 'month' && typeof c.v === 'string' && c.v.startsWith('=')) x.numFmt = '0';
  const fill = (argb: string) => (x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } });
  switch (s) {
    case 'title': x.font = { name: '맑은 고딕', size: 15, bold: true, color: { argb: C.espresso } }; x.border = {}; break;
    case 'sub': x.font = { name: '맑은 고딕', size: 9, color: { argb: C.cocoa } }; x.border = {}; break;
    case 'head': fill(C.espresso); x.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }; x.alignment = { vertical: 'middle', horizontal: 'center' }; break;
    case 'section': fill(C.blush); x.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFA4545D' } }; break;
    case 'total': fill(C.cream); x.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: C.espresso } }; x.border = { top: { style: 'thin', color: { argb: C.cocoa } } }; break;
    case 'net': fill(C.net); x.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FF2F5B2B' } }; break;
    case 'strong': x.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: C.espresso } }; break;
    case 'muted': x.font = { name: '맑은 고딕', size: 9, color: { argb: 'FF9A8678' } }; break;
    case 'key': x.font = { name: '맑은 고딕', size: 8, color: { argb: 'FFB7A595' } }; break;
    case 'input': fill(C.input); break;
  }
}

export async function exportWorkbook(built: Built, eng: Engine): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nail Entice 정산'; wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  for (const s of built.sheets) {
    const ws = wb.addWorksheet(s.name, {
      views: [{ state: s.freeze.r || s.freeze.c ? 'frozen' : 'normal', xSplit: s.freeze.c, ySplit: s.freeze.r, showGridLines: true }],
      properties: { tabColor: { argb: s.bind.type === 'none' ? 'FFD9878F' : 'FFEDBE95' } },
    });
    s.widths.forEach((w, i) => (ws.getColumn(i + 1).width = Math.max(6, Math.round(w / 7.2))));
    s.rows.forEach((row, r) => {
      row.forEach((c, ci) => {
        if (!c || (c.v == null && !c.s)) return;
        const x = ws.getCell(r + 1, ci + 1);
        if (typeof c.v === 'string' && c.v.startsWith('=')) {
          const res = eng.value(s.name, r, ci);
          const result = res && typeof res === 'object' ? undefined : (res as any);
          x.value = { formula: toFileFormula(c.v.slice(1)), result } as any;
        } else if (c.v != null) {
          x.value = s.bind.type === 'free' && typeof c.v === 'string' && c.v.trim() !== '' && !isNaN(Number(c.v)) ? Number(c.v) : c.v;
        }
        styleCell(x, c);
      });
    });
    for (const v of s.validations ?? []) {
      for (let r = v.fromRow; r <= Math.min(v.toRow, v.fromRow + 4000); r++) {
        ws.getCell(r + 1, v.col + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [v.list] };
      }
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
