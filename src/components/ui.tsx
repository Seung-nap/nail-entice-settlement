import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'motion/react';
import { Icon } from './Icons';
import { useApp, MonthSel } from '../store';
import { monthShort } from '../lib/data';

export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: .8 } as const;
export const softSpring = { type: 'spring', stiffness: 220, damping: 28 } as const;

/** 숫자 카운트업 */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString('ko-KR'), duration = .9 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (reduce) { el.textContent = format(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration, ease: [.22, 1, .36, 1], onUpdate: (v) => { el.textContent = format(v); } });
    prev.current = value;
    return () => c.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="num">{format(value)}</span>;
}

export function Delta({ cur, prev, invert = false, suffix = '지난달 대비' }: { cur: number; prev: number | null; invert?: boolean; suffix?: string }) {
  if (prev == null || (prev === 0 && cur === 0)) return <span className="delta flat">—</span>;
  const d = prev === 0 ? 1 : (cur - prev) / Math.abs(prev);
  const up = d > 0.0005, down = d < -0.0005;
  const good = invert ? down : up;
  const cls = !up && !down ? 'flat' : good ? 'up' : 'down';
  return (
    <span className="flex" style={{ gap: 6 }}>
      <span className={`delta ${cls}`}>
        {up ? <Icon name="arrowUp" size={12} stroke={2.4} /> : down ? <Icon name="arrowDown" size={12} stroke={2.4} /> : null}
        {Math.abs(d * 100).toFixed(1)}%
      </span>
      <span>{suffix}</span>
    </span>
  );
}

export function MonthSeg({ allowAll = true }: { allowAll?: boolean }) {
  const { months, month, setMonth } = useApp();
  const opts: MonthSel[] = allowAll ? [...months, 'all'] : months;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [month]);
  useEffect(() => { if (!allowAll && month === 'all' && months.length) setMonth(months[months.length - 1]); }, [allowAll, month, months, setMonth]);
  return (
    <div className="seg" ref={ref} role="tablist">
      {opts.map((m) => (
        <button key={m} className={m === month ? 'on' : ''} onClick={() => setMonth(m)} role="tab" aria-selected={m === month}>
          {m === month && <motion.div layoutId="seg-thumb" className="thumb" transition={spring} />}
          <span>{m === 'all' ? '전체' : <>{monthShort(m)}{months[0] && Math.floor(months[0] / 100) !== Math.floor(months[months.length - 1] / 100) ? <small>’{String(Math.floor(m / 100)).slice(2)}</small> : null}</>}</span>
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, id }: { value: T; options: { v: T; l: React.ReactNode }[]; onChange: (v: T) => void; id: string }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.v === value && <motion.div layoutId={`seg-${id}`} className="thumb" transition={spring} />}
          <span>{o.l}</span>
        </button>
      ))}
    </div>
  );
}

export const Stagger = ({ children, i = 0, className, style }: { children: React.ReactNode; i?: number; className?: string; style?: React.CSSProperties }) => (
  <motion.div className={className} style={style} initial={{ opacity: 0, y: 14, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ ...softSpring, delay: Math.min(i, 10) * .045 }}>{children}</motion.div>
);

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="modal" initial={{ y: 30, scale: .96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, scale: .97, opacity: 0 }} transition={spring}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`toast ${t.tone}`} layout initial={{ opacity: 0, y: 24, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .95 }} transition={spring}>
            <span className="ti"><Icon name={t.icon ?? (t.tone === 'err' ? 'info' : 'check')} size={15} stroke={2.2} /></span>{t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Empty({ icon = 'sparkle', title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <motion.div className="ill" initial={{ scale: .6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={spring}><Icon name={icon} size={28} /></motion.div>
      <b>{title}</b>{children}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} aria-label={label} />;
}

/** 이름 이니셜 아바타 — 이름 해시로 브랜드 톤 중 하나 */
const TONES = ['#D9878F', '#E3A86B', '#C9788A', '#A88BB5', '#8E9CC4', '#9DB59A', '#B58F6A', '#D7A0B7', '#7A8C99', '#C29D6B'];
export const toneOf = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const t = toneOf(name);
  return <div className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${t}, ${t}CC)`, fontSize: size * (name.length >= 3 ? .33 : .4) }}>{name.length >= 3 ? name.slice(1, 3) : name}</div>;
}

export function useHover() {
  const [h, setH] = useState<number | null>(null);
  return [h, setH] as const;
}
