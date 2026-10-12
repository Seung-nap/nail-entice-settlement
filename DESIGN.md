---
name: Nail Entice 정산
description: 네일엔티스 원장님의 월말 현금 흐름 데스크톱 앱 — Apple 웹 디자인 시스템을 에스프레소·파치먼트 팔레트로 옮긴 조용한 재무 화면
colors:
  canvas: "#FFFFFF"
  parchment: "#F6F2EC"
  parchment-deep: "#EFE9E0"
  pearl: "#FBF9F6"
  espresso: "#4A2E1F"
  espresso-press: "#5B3A28"
  walnut: "#6B4A36"
  cocoa: "#8C6E58"
  tan: "#B89A80"
  oat: "#D9CBBB"
  switch-off: "#E2DAD0"
  ink: "#1F1611"
  ink-80: "#3D312A"
  ink-60: "#6E625A"
  ink-48: "#8E827A"
  hairline: "rgba(31, 22, 17, .09)"
  hairline-strong: "rgba(31, 22, 17, .16)"
  pos: "#2D6A45"
  pos-bg: "#EAF2EC"
  neg: "#AE3F36"
  neg-bg: "#F8E9E6"
typography:
  display:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-.8px"
    fontFeature: "'tnum' 1, 'ss06' 1"
  headline:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-.374px"
  figure:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-.5px"
    fontFeature: "'tnum' 1"
  title-lg:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.19
    letterSpacing: "-.374px"
  title:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: "-.374px"
  body:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-.2px"
  label:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-.224px"
  caption:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-.12px"
  micro:
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0"
rounded:
  sm: "8px"
  md: "11px"
  lg: "18px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.espresso-press}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.espresso}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "36px"
  button-soft:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "36px"
  button-small:
    typography: "{typography.label}"
    padding: "0 13px"
    height: "30px"
  segment:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-60}"
    rounded: "{rounded.pill}"
    padding: "2px"
  segment-thumb:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "30px"
  card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-hero:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.espresso}"
    typography: "{typography.display}"
    rounded: "{rounded.lg}"
    padding: "24px"
  strip:
    backgroundColor: "{colors.parchment}"
    typography: "{typography.figure}"
    rounded: "{rounded.lg}"
    padding: "22px 24px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  search:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-60}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  filter-pill:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-80}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "32px"
  filter-pill-on:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.canvas}"
  chip-service:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-80}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  delta-up:
    backgroundColor: "{colors.pos-bg}"
    textColor: "{colors.pos}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "4px 7px 4px 5px"
  delta-down:
    backgroundColor: "{colors.neg-bg}"
    textColor: "{colors.neg}"
    typography: "{typography.micro}"
    rounded: "{rounded.pill}"
    padding: "4px 7px 4px 5px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-80}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  nav-item-active:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.canvas}"
  avatar:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.walnut}"
    rounded: "{rounded.pill}"
    size: "36px"
  toast:
    backgroundColor: "rgba(31, 22, 17, .88)"
    textColor: "{colors.canvas}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "10px 18px 10px 10px"
  modal:
    backgroundColor: "rgba(255, 255, 255, .92)"
    rounded: "{rounded.lg}"
    padding: "28px"
    width: "min(560px, calc(100vw - 40px))"
---

# Design System: Nail Entice 정산

## Overview

**Creative North Star: "The Quiet Ledger"**

숫자가 주인공인 조용한 Apple식 재무 화면이다. Apple 웹 디자인 시스템의 문법(흰 캔버스, 단 하나의 액션 컬러, 그림자 없는 면, 고정 바에만 쓰는 frosted 블러, 음의 자간 제목, 알약 CTA, 누를 때 줄어드는 반응)을 그대로 가져오고, Apple Blue 자리에 네일엔티스 로고의 에스프레소 브라운을 앉혔다. 원장님이 화면을 열면 가장 먼저 파치먼트 타일 위의 큰 갈색 숫자(이번 달 순수익)가 읽히고, 나머지는 흰 면과 1px 헤어라인 사이에서 물러나 있다.

밀도는 "노트북 한 화면에 한 달"이다. 사이드바 236px + 12열 그리드, 24px 간격, 카드 안 24px 패딩. 장식은 없다: 그라데이션·색 아이콘 칩·그림자 카드·블롭으로 채운 AI 대시보드를 명시적으로 거부한 결과물이며, 차이는 면 색(흰 → 파치먼트 → 사이드바 베이지)과 숫자 크기로만 만든다. 색 비율은 사용자가 고정했다: 흰 60 · 베이지 30 · 브라운 10.

움직임은 짧고 스프링 기반이다(motion/react `stiffness 420, damping 34`). 세그먼트 썸과 사이드바 선택 알약은 `layoutId`로 미끄러지고, 숫자는 0.9초 카운트업, 카드는 20ms 간격 페이드로 들어온다. `prefers-reduced-motion`에서는 전부 즉시 끝난다.

**Key Characteristics:**
- 단일 강조색 에스프레소, 나머지는 따뜻한 무채(파치먼트·잉크) 계열
- 카드·버튼 그림자 0 — 1px 인셋 헤어라인 + 면 색 전환으로 분리
- 블러는 위에 떠서 내용이 아래로 지나가는 것(상단바·날짜 헤더·모달·토스트·오버레이)에만
- Pretendard Variable 400/600/700, 모든 제목·숫자에 음의 자간, 전역 tabular figures
- 반경 4단(8 / 11 / 18 / 알약), 누름 `scale(.95)`
- 차트는 브라운 명도 단계만, 의미색(초록·빨강)은 증감에만

## Colors

에스프레소 하나가 말하고, 나머지는 크림·파치먼트·따뜻한 잉크가 받쳐주는 원톤 팔레트.

### Primary
- **Espresso** (`espresso`): 유일한 강조색. 주 CTA(매출 엑셀 올리기, 기록하기), 사이드바 선택 항목 알약, 켜진 필터 알약·항목 칩, 켜진 스위치, 히어로 순수익 숫자, 강조해야 할 인라인 숫자, 스프레드시트 셀 편집 테두리. 화면 면적의 10% 안쪽.
- **Espresso Press** (`espresso-press`): 주 버튼 hover 전용. 독립 색으로 쓰지 않는다.

### Secondary
- **Walnut** (`walnut`): 에스프레소의 한 단계 밝은 짝. 포커스 링(2px), 입력 포커스 인셋, 아이콘 칩·아바타 이니셜, 바 리스트 채움, 스프레드시트 섹션 행 글자.

### Tertiary (chart ramp)
- **Cocoa** (`cocoa`), **Tan** (`tan`), **Oat** (`oat`): 차트 전용 명도 단계. 막대 차트 기본은 Cocoa, 폭포 차트 시작=Cocoa / 차감=Oat 계열 / 가산=Tan / 결과=Espresso, 도넛은 Espresso → Cocoa → Tan → Oat 순. Tan은 드롭존·드롭 베일의 점선 테두리와 타임라인 점에도 쓴다.

### Neutral
- **Canvas** (`canvas`): 메인 영역과 카드 면. 60%의 주인.
- **Parchment** (`parchment`): 가장 중요한 숫자 타일(히어로·숫자 띠), 빠른 기입 판, 세그먼트 트랙, 시술 칩, 아바타·빈 상태 원, 바 트랙. 30%의 주인.
- **Parchment Deep** (`parchment-deep`): 사이드바 전면, soft 버튼·항목 칩 hover, 스프레드시트 선택 행/열 머리.
- **Pearl** (`pearl`): 목록 행·표 행·토글 머리의 hover 면, 스프레드시트 머리줄·합계 행.
- **Ink** (`ink`): 모든 본문과 숫자.
- **Ink 80** (`ink-80`): 2차 본문(사이드바 메뉴 글자, 칩 글자, 범례).
- **Ink 60** (`ink-60`): 보조 설명·라벨·캡션·플레이스홀더(흰 위 5.8:1).
- **Ink 48** (`ink-48`): 비활성 아이콘·닫힌 화살표 등 글자가 아닌 표식 전용.
- **Hairline** (`hairline`) / **Hairline Strong** (`hairline-strong`): 카드 외곽·행 구분은 기본, 입력·알약 테두리·숫자 띠 칸막이·hover 카드 외곽은 Strong.
- **Switch Off** (`switch-off`): 꺼진 스위치 트랙.

### Semantic
- **Pos** / **Pos Bg**, **Neg** / **Neg Bg**: 지난달 대비 증감 배지, 음수 금액, 삭제 아이콘 hover, 오류 토스트 아이콘. 증감 배지는 화살표 아이콘과 함께 써서 색만으로 의미를 싣지 않는다.

### Named Rules
**The One Voice Rule.** 에스프레소는 "지금 선택된 것"과 "지금 누를 것", 그리고 화면당 하나의 주인공 숫자에만 쓴다. 한 화면에 채워진 에스프레소 면이 사이드바 선택 알약 + 주 CTA + 켜진 필터 하나를 넘으면 과하다.

**The 60·30·10 Rule.** 흰 캔버스 60, 파치먼트·사이드바 베이지 30, 브라운 10. 새 화면은 이 비율을 깨지 않는 선에서 파치먼트 타일을 "가장 중요한 숫자"에만 준다.

**The Brown Ramp Rule.** 차트 계열색은 브라운 명도 단계(Espresso / Walnut / Cocoa / Tan / Oat)로만 구분한다. 색상(hue)을 추가해 계열을 나누지 않는다. 빨강은 '미결제'나 음수 결과처럼 경고 의미가 있을 때만.

**The Flat Fill Rule.** 그라데이션 금지(사용자 고정). 모든 면은 단색.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, system-ui, -apple-system, Apple SD Gothic Neo, Malgun Gothic)
**Body Font:** 같은 패밀리 하나로 전 위계를 만든다
**Label/Mono Font:** 스프레드시트 수식 입력줄만 `ui-monospace, 'Cascadia Mono', Consolas`

**Character:** Inter 계열 골격의 한글 고딕 하나로, 굵기 세 단계와 음의 자간만으로 Apple식 위계를 만든다. 전역 `font-feature-settings: 'tnum' 1, 'ss06' 1` 덕에 모든 금액이 세로로 정렬된다.

### Hierarchy
- **Display** (600, 44px, 1.05, -.8px): 히어로 순수익 숫자 한 개. 웰컴 화면 h1(40px, -.8px)도 이 계열.
- **Headline** (600, 34px, 1.12, -.374px): 상단바의 페이지 제목.
- **Figure** (600, 28px, 1.1, -.5px): KPI 카드·숫자 띠의 값. 단위 '원/건'은 17px 400 Ink 60으로 낮춘다(히어로는 21px).
- **Title Large** (600, 21px, 1.19, -.374px): 모달 제목.
- **Title** (600, 17px, 1.24, -.374px): 카드 제목, 날짜 그룹 머리, 목록 금액, 빈 상태 제목.
- **Body** (400, 15px, 1.47, -.2px): 기본 본문, 버튼, 메뉴, 입력. 이름·소제목은 같은 크기 600(-.3px).
- **Label** (400, 14px, 1.3, -.224px): KPI·띠 라벨, 세그먼트·필터 알약, 범례, 작은 버튼.
- **Caption** (400, 13px, 1.4, -.12px): 카드 설명, 각주, 표 머리, 칩, 필드 라벨, 사이드바 그룹 이름(600).
- **Micro** (600, 12px, 1, 0): 증감 배지 퍼센트.

### Named Rules
**The No-500 Rule.** 굵기는 400 / 600 / 700만. 600이 제목·숫자·선택 상태, 700은 도넛 중앙값과 스프레드시트 순수익 셀처럼 "결론 숫자"에만. 500은 쓰지 않는다.

**The Negative Tracking Rule.** 15px 이상 모든 글자는 음의 자간(-.2 ~ -.8px)을 가진다. 크기가 클수록 더 조인다. 12px 배지만 0.

**The Unit Step-Down Rule.** 금액 옆 단위(원·건)는 숫자보다 한 단계 작고 400·Ink 60. 숫자가 먼저 읽힌다.

## Layout

데스크톱 고정 셸: 왼쪽 236px 사이드바(Parchment Deep) + 나머지 메인(Canvas). 창 높이 100vh에 메인만 스크롤한다. 메인 상단에는 frosted 상단바가 겹쳐 떠 있고(위 48 / 좌우 40 / 아래 18px 패딩), 그 아래 콘텐츠는 위 140px · 좌우 40px · 아래 56px에서 시작한다. 스프레드시트처럼 화면을 꽉 채우는 뷰는 `flush` 변형(136 / 24 / 24 / 40px, 내부 스크롤).

그리드는 12열, 간격 24px. 홈은 5+7(히어로 + KPI 3개), 8+4(현금 흐름 + 결제수단), 8+4, 12, 4+4+4로 짠다. 1280px 이하에서 3·4·5열 블록은 6열로, 7·8열 블록은 12열로 늘어난다. 지출 화면은 `1fr + 340px` 2단이며 1220px 이하에서 1단.

간격 리듬은 6 / 10 / 14 / 24 / 40px. 칩·알약 사이 6, 툴바 요소 사이 10, 행 내부 패딩 14, 카드·그리드·섹션 24, 페이지 가장자리 40. 카드 머리와 본문 사이 20px, 날짜 그룹 사이 28px.

**The Strip Over Repetition Rule.** 같은 모양의 숫자 카드를 4개 이상 나란히 반복하지 않는다. 대신 파치먼트 한 줄(숫자 띠)을 Hairline Strong 세로선으로 나눈다. KPI 카드는 히어로 옆 3개까지.

## Elevation & Depth

깊이는 그림자가 아니라 면 색과 블러로 만든다. 카드와 버튼은 완전히 평평하고, 외곽은 `inset 0 0 0 1px` 헤어라인이다. 가장 중요한 면은 테두리를 지우고 파치먼트로 채워 "한 단 낮은 판"처럼 보이게 한다. 위로 떠야 하는 것(상단바, 날짜별 sticky 머리, 모달, 토스트, 드롭 베일, 계산 중 오버레이)만 `saturate(180%) blur(20px)` 반투명 면을 쓴다.

### Shadow Vocabulary
- **Modal lift** (`box-shadow: 0 0 0 1px rgba(31,22,17,.09), 0 24px 60px rgba(31,22,17,.18)`): 모달 하나에만. 화면 위에 실제로 떠 있는 유일한 판.
- **Switch knob** (`box-shadow: 0 0 0 .5px rgba(0,0,0,.04), 0 2px 4px rgba(0,0,0,.15)`): 스위치 손잡이. iOS 스위치의 물성 그대로.
- **Segment thumb ring** (`box-shadow: 0 0 0 1px rgba(31,22,17,.09)`): 그림자가 아니라 흰 썸의 외곽선.

### Named Rules
**The Hairline Not Shadow Rule.** 카드·버튼·입력·칩에 드롭 섀도를 주지 않는다. 구분이 더 필요하면 헤어라인을 Strong으로 올리거나 면을 파치먼트로 바꾼다. hover 카드도 헤어라인만 .09 → .16으로 진해진다.

**The Blur Is For Floating Rule.** backdrop blur는 아래로 내용이 지나가는 고정·오버레이 요소에만. 스크롤되는 카드나 사이드바에는 쓰지 않는다. 상단바는 스크롤이 시작될 때만 아래 헤어라인이 나타난다.

## Shapes

부드러운 직사각형과 알약 두 가지 형태 언어. 반경은 네 단계로만 쓴다: 작은 컨트롤·사이드바 항목·soft 버튼·아이콘 버튼·툴팁 8px, 입력·메모·통계 타일 11px, 카드·띠·목록 판·스프레드시트·모달 18px, 모든 CTA·세그먼트·필터·칩·배지·토스트는 알약. 날짜별 방문 목록은 하나의 18px 판을 헤어라인 행으로 나눠, 첫 행 위 모서리와 마지막 행 아래 모서리만 둥글다. 원은 아바타·로고·빈 상태 아이콘·범례 점에만. 점선은 파일 드롭 영역(Tan, 1.5–2px dashed)에만.

아이콘은 24 그리드의 둥근 라인 아이콘(stroke 1.7, `currentColor`, 둥근 끝). 이모지는 쓰지 않는다. 로고(BrandMark)는 원형 크림 이미지에 1px 헤어라인 링.

## Components

### Buttons
조용하고 단단한 알약. 누르면 살짝 줄어든다.
- **Shape:** 알약(9999px), 높이 36px(작은 버튼 30px / 사이드바 40px), 아이콘 단독은 36px 정사각.
- **Primary:** Espresso 면 + 흰 글자, Body 400, 좌우 18px. 화면당 하나.
- **Hover / Active:** hover는 Espresso Press로 면만 바뀜. active는 `scale(.95)`, 150ms `cubic-bezier(.16,1,.3,1)`. 포커스는 Walnut 2px 외곽선(offset 2px). 비활성은 opacity .4.
- **Ghost:** 투명 면 + Espresso 글자 + Espresso 1px 인셋 테두리. hover 시 에스프레소 5% 면. 카드 머리의 "자세히/전체 보기"와 보조 사이드바 버튼.
- **Soft:** Parchment 면 + Ink 글자, 8px 사각 반경. 유틸리티 동작.
- **Icon button:** 30px, 8px 반경, Ink 48 아이콘. 삭제는 hover 시 Neg Bg 면 + Neg 아이콘, 중립은 Parchment 면.

### Segmented Control
- **Style:** Parchment 알약 트랙(패딩 2px) 위 30px 버튼, Label 14px Ink 60.
- **State:** 선택 항목은 흰 썸(헤어라인 링)이 `layoutId` 스프링으로 미끄러져 오고 글자가 Ink 600. 월 선택(MonthSeg)과 모든 보기 전환이 이 하나를 공유한다. 넘치면 가로 스크롤(스크롤바 숨김)하며 선택 항목을 가운데로.

### Chips
- **Service chip:** Parchment 알약, Caption Ink 80, 패딩 6×10. 페디 시술은 투명 면 + Hairline Strong 테두리로 형태 구분.
- **Payment badge / New tag:** 투명 면 + Hairline Strong 인셋 테두리 알약, 결제수단 라인 아이콘 동반.
- **VIP·단골 tag:** Parchment 면 + Walnut 글자 600.
- **Filter pill:** 흰 면 + Hairline Strong 테두리 32px 알약, hover Pearl. 켜지면 Espresso 면 + 흰 글자, 테두리 없음.
- **Item chip (지출 항목):** Parchment 32px 알약, hover Parchment Deep, 켜지면 Espresso. 누름 `scale(.95)`.
- **Delta badge:** Micro 12px 600 알약 + 12px 화살표 아이콘. 증가 Pos/Pos Bg, 감소 Neg/Neg Bg, 변화 없음 Ink 60/Parchment. 지출처럼 줄어야 좋은 값은 `invert`로 색 의미를 뒤집는다.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** Canvas. 가장 중요한 숫자(히어로)는 Parchment 면, 테두리 없음, 값은 Display·Espresso(음수면 Neg).
- **Shadow Strategy:** 없음. Elevation & Depth의 Hairline Not Shadow Rule.
- **Border:** `inset 0 0 0 1px` Hairline. 클릭 가능한 카드는 hover 시 Hairline Strong.
- **Internal Padding:** 24px. 머리(제목 Title + 설명 Caption Ink 60)와 본문 사이 20px, 머리 오른쪽에 작은 ghost 버튼.

### Number Strip (signature)
파치먼트 18px 띠 한 줄에 숫자 칸 여러 개를 Hairline Strong 세로선으로 나눈 것. 칸마다 Label(Ink 60) → Figure 28px 값(단위 17px 내림) → Caption 보조줄. 띠 위아래 22px, 칸 좌우 24px. 같은 KPI 카드를 반복하는 대신 쓰는 이 시스템의 대표 요소.

### Inputs / Fields
- **Style:** 흰 면 + Hairline Strong 1px 인셋, 11px 반경, 높이 40px(작은 입력 32px·8px 반경), Body 15px, 플레이스홀더 Ink 60. 파치먼트 판 안의 입력은 테두리 없이 흰 면만.
- **Amount input:** 600 24px, 오른쪽 정렬, 높이 44px — 금액은 입력에서도 숫자가 주인공.
- **Focus:** 테두리 대신 Walnut 2px 인셋. 검색 알약도 `:focus-within`에 같은 처리. 커서 색은 Espresso.
- **Mini select:** 30px 알약, Hairline Strong, Ink 60 쉐브론. 미지정 상태는 Parchment 면 + Ink 60 글자.
- **Switch:** 42×26 알약, 꺼짐 Switch Off, 켜짐 Espresso, 흰 손잡이 300ms 슬라이드.
- **Field label:** Caption Ink 60, 입력 위 7px.

### Lists & Tables
- **Grouped list (방문):** 날짜별 sticky frosted 머리(Title 날짜 + Caption 요일·건수 + 오른쪽 600 합계) 아래 하나의 18px 판, 행은 헤어라인 구분, 14×18px 패딩, hover Pearl, 클릭 시 상세 펼침.
- **Table:** 머리는 Caption Ink 60 + 아래 헤어라인, 셀 13×12px, 행 헤어라인, 마지막 행 무선, 숫자 열 오른쪽 정렬, hover Pearl.
- **Toggle list (지출 분류):** 18px 헤어라인 판 안의 접이식 행. 8px 반경 Parchment 아이콘 칩(32px, Walnut 아이콘) + 제목 600 + 힌트 Caption, 오른쪽 합계, 쉐브론이 열리면 90° 회전.
- **Bar list:** 순위(Caption 600, 상위 3개 Ink) + 이름 + 6px 알약 트랙(Parchment)과 Walnut 채움 + 600 금액.

### Navigation
- **Sidebar:** Parchment Deep 전면, 위에 원형 로고 48px + 상호(600 15px) + "월말정산"(Caption Ink 60). 그룹 이름 "정산 / 도구"는 Caption 600 Ink 60.
- **Item:** 36px, 8px 반경, 20px 라인 아이콘(Ink 60) + Body Ink 80. hover 검정 5% 면, 누름 `scale(.97)`.
- **Active:** Espresso 알약이 `layoutId`로 항목 사이를 미끄러지고, 글자·아이콘 흰색 600.
- **Foot:** 반투명 흰 데이터 카드(11px, 기간·방문·지출 기록) + 주 CTA "매출 엑셀 올리기"(Espresso 40px 알약) + ghost "엑셀로 내보내기".
- **Top bar:** 메인 위 frosted 흰 80% 바, 왼쪽 Headline 페이지 제목 + Body Ink 60 부제, 오른쪽 월 세그먼트. 창 드래그 영역을 겸한다.

### Charts
직접 그린 SVG, 브라운 램프만. 가로 기준선은 에스프레소 7% 점선(0선만 실선), 막대는 위 모서리 둥근 rect(막대 7px·폭포 9px), 선은 2.6px 둥근 끝 곡선 + 흰 속 점. hover된 계열 외에는 투명도를 .45–.55로 낮추고, 툴팁은 잉크 90% 면 8px 반경 흰 글자(600 13px, 위에 12px 라벨). 막대·선·도넛은 스프링으로 자라 들어온다.

### Toast & Modal
- **Toast:** 화면 하단 가운데, 잉크 88% frosted 알약, 흰 Body, 왼쪽 24px 원형 아이콘(흰 16% 면, 오류는 Neg). 스프링으로 올라왔다 사라진다.
- **Modal:** 흰 92% frosted 18px 판, 28px 패딩, 최대 560px, 잉크 24% 오버레이. 제목 Title Large, 통계는 Parchment 11px 타일 3열, 동작 버튼은 오른쪽 정렬 8px 간격. Esc·바깥 클릭으로 닫힘.

### Empty State
가운데 정렬, 52px Parchment 원 안 28px Walnut 라인 아이콘(스프링으로 회전하며 등장) + Title 600 + Caption Ink 60 안내 한 줄. 원장님 말투로 다음 행동을 알려준다("월세·재료비·공과금부터 시작해보세요").

## Do's and Don'ts

### Do:
- **Do** 화면당 하나의 주인공 숫자를 Parchment 타일 + Display(600 44px, -.8px) Espresso로 띄운다.
- **Do** 카드·목록·입력은 흰 면 + `inset 0 0 0 1px` 헤어라인(rgba(31,22,17,.09), 강조 .16)으로만 구분한다.
- **Do** 모든 누를 수 있는 알약·칩에 `transform: scale(.95)` 누름 반응을 150ms `cubic-bezier(.16,1,.3,1)`로 준다.
- **Do** 선택 상태(세그먼트 썸, 사이드바 알약)는 `layoutId` 스프링으로 미끄러지게 한다.
- **Do** 금액은 tabular figures, 오른쪽 정렬, 단위는 한 단계 작게 Ink 60으로.
- **Do** 차트 계열은 Espresso / Walnut / Cocoa / Tan / Oat 명도 단계로만 나눈다.
- **Do** 상태는 색과 형태를 함께 쓴다 — 증감 배지에 화살표, 페디 칩은 테두리 알약.
- **Do** 아이콘은 24 그리드 1.7px 둥근 라인 SVG(`currentColor`)로.

### Don't:
- **Don't** 카드·버튼·입력·칩에 드롭 섀도를 넣지 않는다(모달 lift와 스위치 손잡이만 예외).
- **Don't** 그라데이션을 쓰지 않는다 — 배경·면·차트 모두 단색(사용자 고정 제약).
- **Don't** 에스프레소 외의 두 번째 강조 색상(파랑·핑크·보라 등)을 들이지 않는다.
- **Don't** 색 아이콘 칩, 블롭, 무지개 차트로 채운 "AI 대시보드" 문법을 쓰지 않는다.
- **Don't** 스크롤되는 카드나 사이드바에 backdrop blur를 쓰지 않는다.
- **Don't** 굵기 500을 쓰지 않는다. 15px 이상 글자를 0 자간으로 두지 않는다.
- **Don't** 같은 모양의 KPI 카드를 4개 이상 반복하지 않는다 — 숫자 띠로 묶는다.
- **Don't** 반경 4단(8 / 11 / 18 / 알약) 밖의 값을 새로 만들지 않는다.
- **Don't** 이모지를 아이콘으로 쓰지 않는다.
