import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './store';
import { Icon, BrandMark } from './components/Icons';
import { Modal, MonthSeg, Toasts, spring } from './components/ui';
import { UpdateNotice } from './components/Update';
import { fmtDt, serialToIso } from './lib/data';
import type { ParseResult } from './lib/data';
import Dashboard from './views/Dashboard';
import Visits from './views/Visits';
import Customers from './views/Customers';
import Services from './views/Services';
import Payments from './views/Payments';
import Expenses from './views/Expenses';
import SheetView from './views/SheetView';
import SettingsView from './views/SettingsView';

const NAV = [
  { id: 'dashboard', label: '홈', icon: 'home', title: '이번 달 한눈에', sub: '손익계산서 순서로 매출부터 당기순이익까지 자동 정산돼요', month: true },
  { id: 'visits', label: '방문 · 매출', icon: 'calendar', title: '방문 · 매출', sub: '고객 한 번 방문 = 한 줄 — 여러 시술을 묶어서 보여드려요', month: true },
  { id: 'customers', label: '고객', icon: 'people', title: '고객', sub: '누가 얼마나 자주, 얼마나 왔는지', month: true },
  { id: 'services', label: '시술', icon: 'polish', title: '시술', sub: '어떤 시술이 매출을 만드는지', month: true },
  { id: 'payments', label: '결제 · 수수료', icon: 'card', title: '결제 · 수수료', sub: '결제수단 · 카드사별 수수료 자동 계산', month: true },
  { id: 'expenses', label: '지출 · 수입 기입', icon: 'wallet', title: '지출 · 수입 기입', sub: '분류를 열고 항목을 눌러 금액만 적으면 끝', month: true, noAll: true },
  { id: 'sheet', label: '스프레드시트', icon: 'grid', title: '정산 스프레드시트', sub: '엑셀과 같은 시트 · 수식 — 고치면 바로 다시 계산돼요', month: false },
  { id: 'settings', label: '설정', icon: 'gear', title: '설정', sub: '수수료율 · 데이터 관리', month: false },
];

type Pending = ParseResult & { replaced: number; fileName: string };

function Shell() {
  const { ready, computing, data, prepareImport, commitImport, exportXlsx, toast, built } = useApp();
  const [page, setPage] = useState('dashboard');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setScrolled(false), [page]);
  const [drag, setDrag] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const nav = NAV.find((n) => n.id === page)!;
  const hasData = data.lines.length > 0 || data.entries.length > 0;

  const handleFile = useCallback(async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|xlsm)$/i.test(f.name)) { toast('엑셀(.xlsx) 파일만 올릴 수 있어요', 'err'); return; }
    try { setPending(await prepareImport(f)); } catch (e: any) { toast(e.message ?? '파일을 읽지 못했어요', 'err'); }
  }, [prepareImport, toast]);

  useEffect(() => {
    const isFile = (e: DragEvent) => e.dataTransfer?.types.includes('Files');
    const enter = (e: DragEvent) => { if (!isFile(e)) return; e.preventDefault(); dragDepth.current++; setDrag(true); };
    const over = (e: DragEvent) => { if (isFile(e)) e.preventDefault(); };
    const leave = (e: DragEvent) => { if (!isFile(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDrag(false); };
    const drop = (e: DragEvent) => { if (!isFile(e)) return; e.preventDefault(); dragDepth.current = 0; setDrag(false); handleFile(e.dataTransfer?.files[0]); };
    window.addEventListener('dragenter', enter); window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, [handleFile]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportXlsx(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); fileRef.current?.click(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [exportXlsx]);

  const pendingVisits = pending ? new Set(pending.lines.map((l) => `${l.dtText}|${l.phone || l.customer}`)).size : 0;
  const pendingCust = pending ? new Set(pending.lines.map((l) => l.phone || l.customer)).size : 0;
  const pendingTotal = pending ? pending.lines.reduce((a, l) => a + l.paid, 0) : 0;

  return (
    <>
    <div className="shell">
      <div className="titlebar" />
      <aside className="sidebar">
        <div className="brand">
          <div className="bm"><BrandMark size={48} /></div>
          <div><div className="brand-name">네일엔티스</div><div className="brand-sub">월말정산</div></div>
        </div>
        <div className="nav-label">정산</div>
        {NAV.slice(0, 6).map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'on' : ''}`} onClick={() => setPage(n.id)} disabled={!hasData && n.id !== 'expenses'}>
            {page === n.id && <motion.div layoutId="nav-pill" className="pill" transition={spring} />}
            <span className="ic"><Icon name={n.icon} size={17} /></span><span>{n.label}</span>
          </button>
        ))}
        <div className="nav-label">도구</div>
        {NAV.slice(6).map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? 'on' : ''}`} onClick={() => setPage(n.id)}>
            {page === n.id && <motion.div layoutId="nav-pill" className="pill" transition={spring} />}
            <span className="ic"><Icon name={n.icon} size={17} /></span><span>{n.label}</span>
          </button>
        ))}
        <div className="side-foot">
          <UpdateNotice />
          {hasData && built && (
            <div className="data-card">
              <div className="flex" style={{ gap: 6, marginBottom: 4 }}><Icon name="file" size={14} /><b>데이터</b></div>
              <div className="row"><span>기간</span><b className="num">{built.months.length ? `${String(built.months[0]).slice(2, 4)}.${String(built.months[0] % 100).padStart(2, '0')} – ${String(built.months[built.months.length - 1] % 100).padStart(2, '0')}월` : '-'}</b></div>
              <div className="row"><span>방문</span><b className="num">{built.visits.length.toLocaleString()}건</b></div>
              <div className="row"><span>지출 기록</span><b className="num">{data.entries.length}건</b></div>
            </div>
          )}
          <button className="btn primary side-btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />매출 엑셀 올리기</button>
          <button className="btn ghost side-btn" onClick={exportXlsx} disabled={!hasData}><Icon name="download" size={16} />엑셀로 내보내기</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </aside>

      <main className="main">
        {ready && !hasData ? (
          <Welcome onPick={() => fileRef.current?.click()} onExpense={() => setPage('expenses')} />
        ) : ready && (
          <>
            <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
              <div>
                <motion.div key={nav.title} className="page-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>{nav.title}</motion.div>
                <div className="page-sub">{nav.sub}</div>
              </div>
              <div className="spacer" />
              {nav.month && <MonthSeg allowAll={!nav.noAll} />}
            </header>
            <div className={`content ${page === 'sheet' ? 'flush' : ''}`} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)} key={page}>
              {/* 페이지 전환은 퇴장 애니메이션을 기다리지 않는다 — 창이 가려져 프레임이 멈춰도 화면이 바뀐다 */}
                <motion.div key={page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .26, ease: [.22, 1, .36, 1] }}
                  style={page === 'sheet' ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
                  {page === 'dashboard' && <Dashboard go={setPage} />}
                  {page === 'visits' && <Visits />}
                  {page === 'customers' && <Customers />}
                  {page === 'services' && <Services />}
                  {page === 'payments' && <Payments />}
                  {page === 'expenses' && <Expenses />}
                  {page === 'sheet' && <SheetView />}
                  {page === 'settings' && <SettingsView onUpload={() => fileRef.current?.click()} />}
                </motion.div>
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {drag && (
          <motion.div className="drop-veil" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }}>
            <div>
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} style={{ color: '#6B4A36' }}><Icon name="upload" size={56} stroke={1.5} /></motion.div>
              <h3>여기에 놓으면 바로 정산해요</h3><p>POS에서 내려받은 매출 엑셀(.xlsx)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={!!pending} onClose={() => setPending(null)}>
        {pending && (
          <div>
            <div className="flex" style={{ gap: 12 }}>
              <div><h2>매출 엑셀을 확인했어요</h2><div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{pending.fileName}</div></div></div>
            <div className="stat-grid">
              <div className="stat"><div className="l">기간</div><div className="v" style={{ fontSize: 14.5 }}>{serialToIso(pending.minDt).slice(2).replace(/-/g, '.')} ~ {serialToIso(pending.maxDt).slice(5).replace(/-/g, '.')}</div></div>
              <div className="stat"><div className="l">시술 줄 / 방문</div><div className="v">{pending.lines.length} / {pendingVisits}</div></div>
              <div className="stat"><div className="l">고객</div><div className="v">{pendingCust}명</div></div>
            </div>
            <p style={{ margin: 0 }}>실결제 합계 <b>{pendingTotal.toLocaleString()}원</b>. {pending.replaced ? <>이 기간의 기존 매출 <b>{pending.replaced}줄</b>은 새 파일 내용으로 바뀌어요. </> : null}지출 기록과 카드사 지정은 그대로 유지돼요.</p>
            {pending.warnings.length > 0 && <div className="warn-box" style={{ marginTop: 12 }}><b>확인이 필요한 줄 {pending.warnings.length}개</b><br />{pending.warnings.slice(0, 20).map((w, i) => <div key={i}>· {w}</div>)}</div>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setPending(null)}>취소</button>
              <button className="btn primary" onClick={async () => { const p = pending; setPending(null); await commitImport(p); setPage('dashboard'); }}><Icon name="sparkle" size={15} />정산하기</button>
            </div>
          </div>
        )}
      </Modal>

      <AnimatePresence>
        {computing && (
          <motion.div className="computing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: .35 } }}>
            <div className="box">
              <div className="polish-anim"><BrandMark size={96} /></div>
              <div className="lbl">{computing}</div>
              <div className="sub">수식 수천 개를 계산하고 있어요</div>
              <div className="dots-anim"><span /><span /><span /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toasts />
    </div>
    </>
  );
}

function Welcome({ onPick, onExpense }: { onPick: () => void; onExpense: () => void }) {
  return (
    <div className="welcome">
      <motion.div className="welcome-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <motion.div initial={{ scale: .6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} style={{ display: 'inline-block', filter: 'drop-shadow(0 12px 28px rgba(74,46,31,.16))' }}><BrandMark size={120} /></motion.div>
        <h1>네일엔티스 월말정산</h1>
        <p className="lead">POS 매출 엑셀을 올리면 방문·고객·시술·카드 수수료까지<br />엑셀 수식으로 정리된 월말정산이 자동으로 만들어져요.</p>
        <div className="dropzone" onClick={onPick}>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} style={{ color: '#6B4A36' }}><Icon name="upload" size={40} stroke={1.5} /></motion.div>
          <div className="b" style={{ fontSize: 17, marginTop: 10 }}>매출 엑셀을 끌어다 놓거나 클릭해서 선택</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>예) 네일엔티스_20261012041258.xlsx · 여러 달이 한 파일에 있어도 괜찮아요</div>
        </div>
        <div className="steps">
          {[
            { i: 'upload', t: '1. 엑셀 올리기', d: '판매일시·고객·시술·결제수단이 담긴 POS 내보내기 파일' },
            { i: 'wallet', t: '2. 지출 기입', d: '월세·재료비 등 분류를 눌러 금액만 적기' },
            { i: 'download', t: '3. 엑셀로 받기', d: '모든 집계가 수식으로 살아있는 정산 파일' },
          ].map((s, k) => (
            <motion.div key={s.t} className="step" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: .15 + k * .07 }}>
              <span style={{ color: 'var(--ink-60)' }}><Icon name={s.i} size={20} /></span><b>{s.t}</b>{s.d}
            </motion.div>
          ))}
        </div>
        <button className="btn ghost" style={{ marginTop: 18 }} onClick={onExpense}><Icon name="wallet" size={15} />지출부터 기입하기</button>
      </motion.div>
    </div>
  );
}

export default function App() {
  return <MotionConfig reducedMotion="user"><AppProvider><Shell /></AppProvider></MotionConfig>;
}
export { fmtDt };
