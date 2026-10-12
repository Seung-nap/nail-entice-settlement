// HyperFormula 계산 엔진 래퍼 — 앱 내 스프레드시트의 실시간 재계산 담당
import { HyperFormula, DetailedCellError } from 'hyperformula';
import type { Built, Cell, SheetDef } from './workbook';

export type Val = number | string | boolean | null | { error: string };

export function rawOf(c: Cell | undefined): string | number | null {
  if (!c || c.v == null || c.v === '') return null;
  if (typeof c.v === 'number') return c.v;
  if (c.v.startsWith('=')) return c.v;
  if (c.f === 'num') return c.v;            // 자유 입력: HF가 숫자/수식/문자 판별
  return `'${c.v}`;                          // 문자열 강제 (전화번호 앞자리 0 보존)
}

export function normalize(s: SheetDef) {
  const width = Math.max(...s.rows.map((r) => r.length), 1);
  s.rows = s.rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? { v: null }));
  return s;
}

export class Engine {
  hf: HyperFormula;
  ids = new Map<string, number>();
  constructor(public built: Built) {
    built.sheets.forEach(normalize);
    const content: Record<string, (string | number | null)[][]> = {};
    for (const s of built.sheets) content[s.name] = s.rows.map((r) => r.map(rawOf));
    this.hf = HyperFormula.buildFromSheets(content, {
      licenseKey: 'gpl-v3',
      useColumnIndex: true,
      dateFormats: ['YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD'],
      timeFormats: ['hh:mm', 'hh:mm:ss'],
      precisionRounding: 10,
    } as any);
    // 엑셀처럼 TRUE / FALSE 를 그대로 쓸 수 있게 (HyperFormula는 TRUE()/FALSE() 함수만 안다)
    for (const [n, e] of [['TRUE', '=TRUE()'], ['FALSE', '=FALSE()']]) {
      try { this.hf.addNamedExpression(n, e); } catch { /* 이름 등록 불가 시 무시 */ }
    }
    for (const s of built.sheets) this.ids.set(s.name, this.hf.getSheetId(s.name)!);
  }
  sheetId(name: string) { return this.ids.get(name)!; }
  value(sheet: string, r: number, c: number): Val {
    const v = this.hf.getCellValue({ sheet: this.sheetId(sheet), row: r, col: c });
    if (v instanceof DetailedCellError) return { error: v.value };
    return v as Val;
  }
  num(sheet: string, r: number, c: number): number {
    const v = this.value(sheet, r, c);
    return typeof v === 'number' ? v : 0;
  }
  formula(sheet: string, r: number, c: number): string {
    const id = this.sheetId(sheet);
    const f = this.hf.getCellFormula({ sheet: id, row: r, col: c });
    if (f) return f;
    const s = this.hf.getCellSerialized({ sheet: id, row: r, col: c });
    if (s == null) return '';
    return typeof s === 'string' && s.startsWith("'") ? s.slice(1) : String(s);
  }
  set(sheet: string, r: number, c: number, raw: string | number | null) {
    this.hf.setCellContents({ sheet: this.sheetId(sheet), row: r, col: c }, [[raw]]);
  }
  size(sheet: string) { return this.hf.getSheetDimensions(this.sheetId(sheet)); }
  destroy() { this.hf.destroy(); }
}
