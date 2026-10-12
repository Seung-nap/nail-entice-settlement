// 직접 그리는 SVG 차트 — 모션 + 호버 툴팁
import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { wonShort } from '../lib/data';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) ?? 10) * p;
};

export interface BarDatum { label: string; value: number; sub?: string; tone?: string; dim?: boolean; }

export function BarChart({ data, height = 190, color = 'url(#bar-g)', fmt = wonShort, tipFmt }: { data: BarDatum[]; height?: number; color?: string; fmt?: (n: number) => string; tipFmt?: (d: BarDatum) => React.ReactNode }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const padL = 40, padB = 24, padT = 8;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ih = height - padB - padT;
  const bw = (w - padL) / Math.max(data.length, 1);
  const barW = Math.min(26, bw * .62);
  const ticks = [0, .5, 1].map((t) => t * max);
  return (
    <div ref={ref} style={{ position: 'relative', height }}>
      <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="bar-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D9878F" /><stop offset="1" stopColor="#EDBE95" /></linearGradient>
          <linearGradient id="bar-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9C9C3" /><stop offset="1" stopColor="#F3E2D2" /></linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const y = padT + ih - (t / max) * ih;
          return <g key={i}><line x1={padL} x2={w} y1={y} y2={y} stroke="rgba(74,46,31,.07)" strokeDasharray={i ? '3 4' : ''} /><text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill="#B5A496">{fmt(t)}</text></g>;
        })}
        {data.map((d, i) => {
          const h = max ? (d.value / max) * ih : 0;
          const x = padL + bw * i + (bw - barW) / 2;
          return (
            <g key={d.label + i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ cursor: 'default' }}>
              <rect x={padL + bw * i} y={padT} width={bw} height={ih} fill="transparent" />
              <motion.rect x={x} width={barW} rx={Math.min(7, barW / 2)} fill={d.dim ? 'url(#bar-g2)' : d.tone ?? color}
                initial={{ y: padT + ih, height: 0 }} animate={{ y: padT + ih - h, height: h, opacity: hi == null || hi === i ? 1 : .45 }}
                transition={{ type: 'spring', stiffness: 160, damping: 22, delay: i * .012 }} />
              {(data.length <= 16 || i % Math.ceil(data.length / 16) === 0) && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="10.5" fill={hi === i ? '#4A2E1F' : '#B5A496'} fontWeight={hi === i ? 700 : 500}>{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hi != null && data[hi] && (
        <div className="chart-tip" style={{ left: padL + bw * hi + bw / 2, top: padT + ih - (data[hi].value / max) * ih }}>
          {tipFmt ? tipFmt(data[hi]) : <><small>{data[hi].sub ?? data[hi].label}</small>{Math.round(data[hi].value).toLocaleString()}원</>}
        </div>
      )}
    </div>
  );
}

export interface Seg { label: string; value: number; color: string; }

export function Donut({ data, size = 168, thick = 22, center }: { data: Seg[]; size?: number; thick?: number; center?: React.ReactNode }) {
  const [hi, setHi] = useState<number | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thick) / 2, C = 2 * Math.PI * r;
  let acc = 0;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 3 : 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F6EDDC" strokeWidth={thick} />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const off = acc; acc += len;
          if (d.value <= 0) return null;
          return (
            <motion.circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeLinecap="butt"
              strokeWidth={hi === i ? thick + 6 : thick}
              initial={{ strokeDasharray: `0 ${C}`, strokeDashoffset: -off }}
              animate={{ strokeDasharray: `${Math.max(len - gap, 0.1)} ${C}`, strokeDashoffset: -off }}
              transition={{ type: 'spring', stiffness: 90, damping: 20, delay: .1 + i * .06 }}
              onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ cursor: 'pointer', transition: 'stroke-width .25s' }} />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        {hi != null ? (
          <div><div style={{ fontSize: 12, color: '#A88C78', fontWeight: 700 }}>{data[hi].label}</div><div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>{((data[hi].value / total) * 100).toFixed(1)}%</div><div style={{ fontSize: 11.5, color: '#A88C78' }}>{wonShort(data[hi].value)}원</div></div>
        ) : center}
      </div>
    </div>
  );
}

export interface WStep { label: string; value: number; kind: 'start' | 'minus' | 'plus' | 'total'; }

/** 현금 흐름 폭포 차트: 실결제 → −수수료 → +기타수입 → −지출 → 순수익 */
export function Waterfall({ steps, height = 230 }: { steps: WStep[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const bars = useMemo(() => {
    let run = 0;
    return steps.map((s) => {
      let from = 0, to = 0;
      if (s.kind === 'start' || s.kind === 'total') { from = 0; to = s.value; run = s.value; }
      else if (s.kind === 'minus') { from = run; to = run - s.value; run = to; }
      else { from = run; to = run + s.value; run = to; }
      return { ...s, from, to };
    });
  }, [steps]);
  const vals = bars.flatMap((b) => [b.from, b.to]);
  const max = Math.max(...vals, 1) * 1.12, min = Math.min(0, ...vals) * 1.12;
  const padT = 26, padB = 30, ih = height - padT - padB;
  const y = (v: number) => padT + ((max - v) / (max - min)) * ih;
  const bw = w / bars.length, barW = Math.min(64, bw * .56);
  const col = (k: WStep['kind'], v: number) => k === 'start' ? 'url(#wf-start)' : k === 'minus' ? '#E9B7B3' : k === 'plus' ? '#B9D2B0' : v >= 0 ? 'url(#wf-total)' : '#D97B80';
  return (
    <div ref={ref} style={{ position: 'relative', height }}>
      <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="wf-start" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7A5A47" /><stop offset="1" stopColor="#A88C78" /></linearGradient>
          <linearGradient id="wf-total" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FA37A" /><stop offset="1" stopColor="#A9C79F" /></linearGradient>
        </defs>
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="rgba(74,46,31,.12)" />
        {bars.map((b, i) => {
          const top = y(Math.max(b.from, b.to)), h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
          const x = bw * i + (bw - barW) / 2;
          const next = bars[i + 1];
          return (
            <g key={b.label} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <motion.rect x={x} width={barW} rx={9} fill={col(b.kind, b.to)}
                initial={{ y: y(b.from), height: 0, opacity: 0 }} animate={{ y: top, height: h, opacity: hi == null || hi === i ? 1 : .55 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: .08 + i * .12 }} />
              {next && next.kind !== 'total' && (
                <motion.line x1={x + barW} x2={bw * (i + 1) + (bw - barW) / 2} y1={y(b.to)} y2={y(b.to)} stroke="#C9B8A8" strokeDasharray="3 3"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 + i * .12 }} />
              )}
              <motion.text x={x + barW / 2} y={top - 8} textAnchor="middle" fontSize="12" fontWeight="800" fill={b.kind === 'minus' ? '#B9636C' : b.kind === 'plus' ? '#4F7A4A' : '#4A2E1F'}
                initial={{ opacity: 0, y: top }} animate={{ opacity: 1, y: top - 8 }} transition={{ delay: .25 + i * .12 }}>
                {b.value === 0 ? '0' : <>{b.kind === 'minus' ? '−' : b.kind === 'plus' ? '+' : ''}{wonShort(Math.abs(b.value))}</>}
              </motion.text>
              <text x={x + barW / 2} y={height - 9} textAnchor="middle" fontSize="12" fontWeight="650" fill={hi === i ? '#4A2E1F' : '#A88C78'}>{b.label}</text>
            </g>
          );
        })}
      </svg>
      {hi != null && (
        <div className="chart-tip" style={{ left: bw * hi + bw / 2, top: y(Math.max(bars[hi].from, bars[hi].to)) - 18 }}>
          <small>{bars[hi].label}</small>{bars[hi].kind === 'minus' ? '−' : ''}{Math.round(Math.abs(bars[hi].value)).toLocaleString()}원
        </div>
      )}
    </div>
  );
}

export interface LSeries { name: string; color: string; values: number[]; fill?: boolean; }

export function LineChart({ labels, series, height = 200, active }: { labels: string[]; series: LSeries[]; height?: number; active?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const padL = 42, padR = 12, padT = 12, padB = 26;
  const all = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(...all, 1)), min = Math.min(0, ...all);
  const ih = height - padT - padB, iw = w - padL - padR;
  const x = (i: number) => padL + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => padT + ((max - v) / (max - min || 1)) * ih;
  const path = (vals: number[]) => vals.map((v, i) => {
    if (i === 0) return `M${x(0)},${y(v)}`;
    const x0 = x(i - 1), x1 = x(i), cx = (x0 + x1) / 2;
    return `C${cx},${y(vals[i - 1])} ${cx},${y(v)} ${x1},${y(v)}`;
  }).join(' ');
  return (
    <div ref={ref} style={{ position: 'relative', height }} onMouseLeave={() => setHi(null)}
      onMouseMove={(e) => { const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const px = e.clientX - r.left; let best = 0, bd = 1e9; labels.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }); setHi(best); }}>
      <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>{series.map((s, i) => <linearGradient key={i} id={`lg-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".28" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
        {[0, .5, 1].map((t, i) => { const v = min + (max - min) * t; return <g key={i}><line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} stroke="rgba(74,46,31,.07)" strokeDasharray={i ? '3 4' : ''} /><text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="#B5A496">{wonShort(v)}</text></g>; })}
        {min < 0 && <line x1={padL} x2={w - padR} y1={y(0)} y2={y(0)} stroke="rgba(74,46,31,.18)" />}
        {active != null && active >= 0 && <rect x={x(active) - 18} y={padT} width={36} height={ih} rx={10} fill="rgba(217,135,143,.08)" />}
        {series.map((s, si) => (
          <g key={s.name}>
            {s.fill && <motion.path d={`${path(s.values)} L${x(s.values.length - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z`} fill={`url(#lg-${si})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8, delay: .3 }} />}
            <motion.path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2.6} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [.22, 1, .36, 1], delay: si * .15 }} />
            {s.values.map((v, i) => <motion.circle key={i} cx={x(i)} cy={y(v)} r={hi === i ? 5.5 : 3.5} fill="#fff" stroke={s.color} strokeWidth={2.2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .5 + i * .05 }} />)}
          </g>
        ))}
        {labels.map((l, i) => <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fontWeight={active === i || hi === i ? 750 : 500} fill={active === i || hi === i ? '#4A2E1F' : '#B5A496'}>{l}</text>)}
      </svg>
      {hi != null && (
        <div className="chart-tip" style={{ left: x(hi), top: y(Math.max(...series.map((s) => s.values[hi] ?? 0))) }}>
          <small>{labels[hi]}</small>
          {series.map((s) => <div key={s.name} style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}><span style={{ color: s.color }}>● {s.name}</span><span>{Math.round(s.values[hi] ?? 0).toLocaleString()}원</span></div>)}
        </div>
      )}
    </div>
  );
}

export function Spark({ values, color = '#D9878F', w = 120, h = 36 }: { values: number[]; color?: string; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values, 0);
  const x = (i: number) => (i / (values.length - 1)) * (w - 6) + 3;
  const y = (v: number) => 3 + ((max - v) / (max - min || 1)) * (h - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3.5} fill={color} />
    </svg>
  );
}

export function BarList({ rows, fmt = (n: number) => `${wonShort(n)}원` }: { rows: { name: string; value: number; sub?: string; extra?: React.ReactNode }[]; fmt?: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="bar-list">
      {rows.map((r, i) => (
        <motion.div key={r.name} className="bar-row" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .05 }}>
          <div className={`rk ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div className="nm"><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.extra}</span><span>{r.sub}</span></div>
            <div className="bar-track"><motion.div className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: r.value / max }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: .1 + i * .05 }} /></div>
          </div>
          <div className="amt num">{fmt(r.value)}</div>
        </motion.div>
      ))}
    </div>
  );
}
