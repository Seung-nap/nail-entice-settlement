// 네일엔티스 정산 — 데이터 모델 · 기본값

export type PayKey = 'cash' | 'card' | 'transfer' | 'naver' | 'etc1' | 'etc2' | 'etc3' | 'unpaid';

export const PAY_KEYS: PayKey[] = ['cash', 'card', 'transfer', 'naver', 'etc1', 'etc2', 'etc3', 'unpaid'];

/** 매출 1줄(POS 원본의 한 행 = 한 시술) */
export interface SaleLine {
  dt: number;           // 엑셀 시리얼 날짜(일시)
  dtText: string;       // '2026-10-11 14:00'
  customer: string;
  phone: string;
  cat: string;          // 네일 / 패디
  service: string;      // 정규화된 시술명
  unit: number;         // 단가
  qty: number;
  point: number;        // 포인트 차감
  paid: number;         // 결제액(받을금액)
  pay: Record<PayKey, number>;
  memo: string;
  visitId: string;
}

export interface Visit {
  id: string;
  dt: number;
  dtText: string;
  month: number;        // 202610
  customer: string;
  phone: string;
  lines: SaleLine[];
  services: string;
  list: number;         // 정가 합
  discount: number;
  point: number;
  paid: number;
  pay: Record<PayKey, number>;
  memo: string;
}

export type EntryKind = '지출' | '수입';

export interface Entry {
  id: string;
  date: string;         // 'YYYY-MM-DD'
  kind: EntryKind;
  group: string;        // 대분류
  item: string;         // 항목
  title: string;        // 내용
  amount: number;
  method: string;       // 카드 / 현금 / 계좌이체 ...
  recurring: boolean;   // true = 고정비가 펼친 행 (직접 기입한 변동비는 false)
  memo: string;
  fixedId?: string;     // 고정비 규칙에서 펼쳐진 행이면 그 규칙 id (저장되지 않는다)
}

/** 고정비 규칙 — 한 번 등록하면 시작 달부터 매달 자동으로 지출에 들어간다 */
export interface FixedCost {
  id: string;
  group: string;
  item: string;
  title: string;
  method: string;
  day: number;                                  // 매월 납부일 (말일보다 크면 말일)
  from: number;                                 // 시작 달 YYYYMM
  to: number | null;                            // 마지막 달 (null = 계속)
  amounts: { from: number; amount: number }[];  // 금액 이력 — 해당 달부터 적용
  skip: number[];                               // 제외한 달
  overrides: Record<string, number>;            // 그 달만 다른 금액
  memo: string;
}

export interface CardCompany { name: string; rate: number; }

export interface Settings {
  shopName: string;
  payLabels: Record<PayKey, string>;
  payRates: Record<PayKey, number>;   // 카드는 카드사표가 우선, 여기 값은 '미지정' 기본율
  cards: CardCompany[];
}

export interface AppData {
  version: 1 | 2;
  importedAt: string | null;
  sourceName: string | null;
  lines: SaleLine[];
  cardAssign: Record<string, string>;   // visitKey → 카드사
  entries: Entry[];               // 직접 기입한 변동비·수입
  fixed: FixedCost[];             // 고정비 규칙
  settings: Settings;
  freeSheet: Record<string, string>;    // 'r,c' → raw 입력
}

export const PAY_DEFAULT_LABEL: Record<PayKey, string> = {
  cash: '현금', card: '카드', transfer: '계좌이체', naver: '네이버페이',
  etc1: '기타1', etc2: '기타2', etc3: '기타3', unpaid: '미수',
};

export const DEFAULT_SETTINGS: Settings = {
  shopName: 'Nail Entice',
  payLabels: { ...PAY_DEFAULT_LABEL },
  payRates: { cash: 0, card: 0.004, transfer: 0, naver: 0.02, etc1: 0, etc2: 0, etc3: 0, unpaid: 0 },
  cards: [
    { name: '신한카드', rate: 0.004 },
    { name: '삼성카드', rate: 0.004 },
    { name: '현대카드', rate: 0.004 },
    { name: 'KB국민카드', rate: 0.004 },
    { name: '롯데카드', rate: 0.004 },
    { name: '하나카드', rate: 0.004 },
    { name: '우리카드', rate: 0.004 },
    { name: 'BC카드', rate: 0.004 },
    { name: 'NH농협카드', rate: 0.004 },
    { name: '체크카드', rate: 0.0015 },
  ],
};

export const UNASSIGNED = '미지정';

/** 지출·수입 분류 — 대분류 → 항목 */
export interface Group { name: string; icon: string; tone: string; items: string[]; hint: string; }

export const EXPENSE_GROUPS: Group[] = [
  { name: '임대·관리', icon: 'home', tone: '#8C6E58', hint: '매달 나가는 공간 비용', items: ['월세', '관리비', '주차비(월정)', '보증금 이자'] },
  { name: '공과금', icon: 'bolt', tone: '#8C6E58', hint: '전기·수도·가스·통신', items: ['전기세', '수도세', '가스비', '인터넷·통신비', '휴대폰 요금'] },
  { name: '재료비', icon: 'polish', tone: '#8C6E58', hint: '젤·파츠 등 시술 재료', items: ['젤·컬러', '파츠·스톤·글리터', '팁·연장재료', '베이스·탑·프라이머', '파일·버퍼·솜', '리무버·소모품'] },
  { name: '위생·소모품', icon: 'sparkle', tone: '#8C6E58', hint: '소독·위생·청소', items: ['소독·살균용품', '장갑·마스크', '타월·세탁', '청소용품', '휴지·물티슈'] },
  { name: '장비·유지보수', icon: 'tool', tone: '#8C6E58', hint: '장비 구입과 수리', items: ['램프·드릴 구입', '장비 수리', '집진기·필터', '인테리어 보수', '가구·집기'] },
  { name: '구독·프로그램', icon: 'app', tone: '#8C6E58', hint: '매달 결제되는 서비스', items: ['예약·POS 프로그램', '디자인·편집 앱', '매장 음악', '클라우드·저장공간', '카드단말기·VAN'] },
  { name: '마케팅·광고', icon: 'megaphone', tone: '#8C6E58', hint: '손님을 데려오는 비용', items: ['인스타 광고', '네이버 플레이스 광고', '체험단·협찬', '명함·쿠폰 인쇄', '촬영 소품'] },
  { name: '고객 서비스', icon: 'gift', tone: '#8C6E58', hint: '손님을 위한 작은 것들', items: ['음료·다과', '포장·사은품', '이벤트 경품', '리뷰 이벤트'] },
  { name: '식비·복리후생', icon: 'cup', tone: '#8C6E58', hint: '나를 위한 식비·간식', items: ['식비', '커피·간식', '직원 식대'] },
  { name: '인건비', icon: 'people', tone: '#8C6E58', hint: '직원·파트타이머', items: ['급여', '4대보험', '퇴직금 적립', '외주 인력'] },
  { name: '세금·보험·금융', icon: 'receipt', tone: '#8C6E58', hint: '세금·보험·이자', items: ['부가가치세', '종합소득세', '세무 기장료', '화재·배상보험', '대출 이자', '은행 수수료'] },
  { name: '교육·자기계발', icon: 'book', tone: '#8C6E58', hint: '실력을 키우는 투자', items: ['세미나·교육비', '자격증·공모전', '도서·자료', '샘플·연습재료'] },
  { name: '교통·물류', icon: 'truck', tone: '#8C6E58', hint: '택배와 이동', items: ['택배·배송비', '교통비', '주유비', '주차비'] },
  { name: '기타 지출', icon: 'dots', tone: '#8C6E58', hint: '분류하기 애매한 것', items: ['경조사비', '기타'] },
];

export const INCOME_GROUPS: Group[] = [
  { name: '기타 수입', icon: 'coin', tone: '#8C6E58', hint: '시술 외 들어온 돈', items: ['제품 판매', '정부 지원금', '세금·수수료 환급', '이자 수익', '기타 수입'] },
];

export const ENTRY_METHODS = ['카드', '현금', '계좌이체', '자동이체', '간편결제'];

export function emptyData(): AppData {
  return {
    version: 2, importedAt: null, sourceName: null, lines: [], cardAssign: {}, entries: [], fixed: [],
    settings: structuredClone(DEFAULT_SETTINGS), freeSheet: {},
  };
}

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
