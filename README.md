# Nail Entice 정산 (개발용)

Electron + React + HyperFormula(수식 엔진) + ExcelJS(엑셀 입출력). 사용법은 `사용설명서.md`.

```bash
npm run dev          # 브라우저 개발 서버 (http://localhost:5188/?demo 로 열면 data-sample 자동 로드)
npm start            # 빌드 후 데스크톱 앱 실행
npm run dist         # Windows 설치본·포터블 exe → release/
```

## 구조
- `src/lib/data.ts` POS 엑셀 파싱 · 방문 묶기 · 기간 교체 병합
- `src/lib/workbook.ts` 9개 시트 정의(앱 스프레드시트와 엑셀 내보내기가 공유) — 집계는 전부 수식
- `src/lib/engine.ts` HyperFormula 래퍼 · `src/lib/exporter.ts` 엑셀 기록(+ `_xlfn.` 접두어)
- `src/store.tsx` 데이터 변경 → 셀 diff로 실시간 재계산

## 검증
```bash
# 1) 엔진 셀프테스트 + 엑셀 내보내기
npx esbuild scripts/selftest.ts --bundle --platform=node --format=esm "--banner:js=import {createRequire} from 'module';const require=createRequire(import.meta.url);" --outfile=selftest.mjs
node selftest.mjs data-sample/<매출>.xlsx out.xlsx
# 2) 실제 Excel로 전체 재계산 후 모든 수식 셀 비교 (Excel 설치 필요)
python scripts/excel_verify.py out.xlsx
```
`data-sample/`과 `*.xlsx`는 고객 개인정보라 git에서 제외.
