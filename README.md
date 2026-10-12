# Nail Entice 정산 (개발용)

Electron + React + HyperFormula(수식 엔진) + ExcelJS(엑셀 입출력). 사용법은 `사용설명서.md`.

```bash
npm run dev          # 브라우저 개발 서버 (http://localhost:5188/?demo 로 열면 data-sample 자동 로드)
npm start            # 빌드 후 데스크톱 앱 실행
npm run dist         # Windows 설치본·포터블 exe → release/ (배포 안 함)
```

## 새 버전 배포 → 매장 PC 자동 업데이트
1. `package.json` 의 `"version"` 을 올린다 (예: 1.3.2 → 1.3.3)
2. 커밋 · `git push`
3. 배포: `GH_TOKEN=$(gh auth token) npm run release`
   → GitHub Releases(Seung-nap/nail-entice-settlement)에 설치본 + `latest.yml` 업로드
4. 설치된 앱이 시작할 때·3시간마다 확인 → 뒤에서 내려받고 사이드바에 **다시 시작해서 업데이트** 표시
   (그냥 앱을 닫아도 닫힐 때 설치된다)

빌드·배포가 끝나면 **`output/` 에 최신 버전 설치본·포터블 2개만** 남는다(이전 버전은 자동 정리, GitHub Releases 에는 보관).
`npm run output` 으로 수동 정리도 가능.

데이터는 `%APPDATA%/Nail Entice 정산/data` 에 있고 설치·업데이트·제거가 건드리지 않는다.
업데이트 직전·직후·매일 `backups/` 에 자동 백업(최근 40개). **`electron/main.cjs` 의 데이터 경로와
`productName` 은 바꾸지 말 것** — 바꾸면 기존 데이터가 사라진 것처럼 보인다.

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
