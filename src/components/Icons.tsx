// 네일엔티스 SVG 아이콘 세트 — 둥근 라인 1.7px, currentColor
import React from 'react';

type P = { size?: number; className?: string; style?: React.CSSProperties; stroke?: number };

const paths: Record<string, React.ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5" /></>,
  chart: <><path d="M4 20h16" /><rect x="5.5" y="11" width="3" height="6" rx="1" /><rect x="10.5" y="7" width="3" height="10" rx="1" /><rect x="15.5" y="4" width="3" height="13" rx="1" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><circle cx="9" cy="14.5" r=".6" fill="currentColor" /><circle cx="12" cy="14.5" r=".6" fill="currentColor" /><circle cx="15" cy="14.5" r=".6" fill="currentColor" /></>,
  people: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M15.5 14.2c2.5-.3 4.5 1.4 5 4.3" /></>,
  polish: <><path d="M10 3.5h4v4.2h-4z" /><path d="M9.2 7.7h5.6l1.7 3.1v7.7a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2v-7.7z" /><path d="M7.6 13.2h8.8" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.8" /><path d="M3 10h18" /><path d="M6.5 15h3.5" /></>,
  wallet: <><path d="M5 7.5h12.5a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 17.5V7a2.5 2.5 0 0 1 2.5-2.5H16" /><path d="M20 12.5h-3.5a1.5 1.5 0 0 0 0 3H20" /></>,
  grid: <><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M3.5 14.5h17M9 4v16M14.8 4v16" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>,
  upload: <><path d="M12 15.5V4.5" /><path d="m7.5 9 4.5-4.5L16.5 9" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  download: <><path d="M12 4.5v11" /><path d="m7.5 11 4.5 4.5 4.5-4.5" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V5h5v2" /><path d="M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  heart: <path d="M12 19.5s-7-4.3-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.2c0 5-7 9.3-7 9.3z" />,
  sparkle: <><path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5z" /><path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z" /></>,
  bolt: <path d="M13 3.5 6 13.5h5.5L10.5 20.5 18 10h-5.5z" />,
  tool: <><path d="M14.5 6.2a4 4 0 0 0 4.9 5.2l-7.7 7.8a2 2 0 0 1-2.9-2.9l7.8-7.7a4 4 0 0 0-2.1-2.4z" /><path d="M14.6 4.6a4 4 0 0 1 4.8 4.8l-2.5-.6-1.7-1.7z" /></>,
  app: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><circle cx="16.5" cy="16.5" r="3.5" /></>,
  megaphone: <><path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H7l9 4V4.5l-9 4H5.5A1.5 1.5 0 0 0 4 10z" /><path d="M8 15.5 9.5 20" /><path d="M19 9.5a3 3 0 0 1 0 5" /></>,
  gift: <><rect x="4" y="9" width="16" height="4" rx="1.2" /><path d="M5.5 13v6a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-6M12 9v11" /><path d="M12 9c-1.5-3.5-5.5-3.8-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-3.8 5.5-1.5S14 9 12 9z" /></>,
  cup: <><path d="M5 8.5h11v5.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14z" /><path d="M16 10h1.5a2.3 2.3 0 0 1 0 4.6H16" /><path d="M8.5 3.5c-.6.9.6 1.5 0 2.5M12 3.5c-.6.9.6 1.5 0 2.5" /></>,
  receipt: <><path d="M6 3.5h12V20l-2.4-1.5L13.2 20l-2.4-1.5L8.4 20 6 18.5z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  book: <><path d="M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2z" /><path d="M5 19.5a2 2 0 0 0 2 1h12v-3" /><path d="M9 8h6" /></>,
  truck: <><path d="M3.5 6.5h10.5v9H3.5z" /><path d="M14 9.5h3.5l3 3v3H14" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  dots: <><circle cx="6" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18" cy="12" r="1.3" fill="currentColor" /></>,
  coin: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.2c.4-1 1.4-1.6 2.6-1.6 1.6 0 2.6.8 2.6 2 0 2.8-5.4 1.6-5.4 4.6 0 1.2 1.1 2.1 2.8 2.1 1.3 0 2.3-.6 2.7-1.6M12 6v1.6M12 16.4V18" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.8" cy="6.5" r=".9" fill="currentColor" /><circle cx="4.8" cy="12" r=".9" fill="currentColor" /><circle cx="4.8" cy="17.5" r=".9" fill="currentColor" /></>,
  pencil: <><path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5z" /><path d="m14 7 3 3" /></>,
  repeat: <><path d="M17 4.5 19.5 7 17 9.5" /><path d="M4.5 12V10a3 3 0 0 1 3-3h12" /><path d="M7 19.5 4.5 17 7 14.5" /><path d="M19.5 12v2a3 3 0 0 1-3 3h-12" /></>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".7" fill="currentColor" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  file: <><path d="M6.5 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z" /><path d="M13.5 3.5V8H18" /><path d="M8.5 12.5l3 4M11.5 12.5l-3 4M14 12.5v4h2" /></>,
  fx: <><path d="M10 5.5c-1.8-.4-3 .3-3.3 2.2L5.4 18.5c-.3 1.9-1.4 2.4-3 2" /><path d="M4.5 10.5h5" /><path d="m12.5 10.5 6 7M18.5 10.5l-6 7" /></>,
  flow: <><path d="M4 7h7a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3h3" /><path d="m17.5 14.5 2.5 2.5-2.5 2.5" /><circle cx="4" cy="7" r="1.5" /></>,
  star: <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 15.9 7.1 18.6l1.1-5.3-4-3.7 5.4-.6z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  phone: <><rect x="7" y="3.5" width="10" height="17" rx="2.5" /><path d="M10.5 17.5h3" /></>,
  filter: <path d="M4.5 6h15l-5.8 7v5l-3.4 1.5V13z" />,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2.2" /><path d="M15.5 8.5V6.2a1.7 1.7 0 0 0-1.7-1.7H6.2a1.7 1.7 0 0 0-1.7 1.7v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3" /></>,
  cash: <><rect x="3" y="6.5" width="18" height="11" rx="2.2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5v5M17.5 9.5v5" /></>,
  bank: <><path d="M4 9.5 12 5l8 4.5" /><path d="M5 10v7M9.7 10v7M14.3 10v7M19 10v7M3.5 19.5h17" /></>,
  naver: <path d="M7 6.5h3.2l3.6 5.3V6.5H17v11h-3.2l-3.6-5.3v5.3H7z" />,
  hourglass: <><path d="M7 4h10M7 20h10" /><path d="M8 4c0 4.5 8 5 8 8s-8 3.5-8 8M16 4c0 4.5-8 5-8 8s8 3.5 8 8" /></>,
  home2: <path d="M3 3" />,
};

export function Icon({ name, size = 20, className, style, stroke = 1.7 }: P & { name: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      {paths[name] ?? paths.dots}
    </svg>
  );
}

/** 하트 — 인스타 하이라이트 아래의 작은 하트 모티프 */
export function Heart({ size = 10, color = '#6B4A36' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 21s-8.5-5.2-8.5-11.3A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 8.5 2.7C20.5 15.8 12 21 12 21z" fill={color} />
    </svg>
  );
}

/** Nail Entice 원형 로고 — 인스타 프로필과 같은 크림 원 + 레트로 브라운 워드마크 (build/icon.png 와 동일) */
export function BrandMark({ size = 56 }: { size?: number }) {
  return <img src="./brand.png" width={size} height={size} alt="Nail Entice" draggable={false} style={{ display: 'block' }} />;
}
