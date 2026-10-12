// 자동 업데이트 표시 — 새 버전은 뒤에서 받아두고, 준비되면 '다시 시작'만 누르면 된다. 데이터는 그대로.
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { UpdateState } from '../store';
import { Icon } from './Icons';

export function useUpdate() {
  const [st, setSt] = useState<UpdateState & { current?: string }>({ state: 'idle' });
  useEffect(() => {
    const api = window.api?.update; if (!api) return;
    api.get().then(setSt).catch(() => { /* */ });
    return api.onState((s) => setSt((p) => ({ ...p, ...s })));
  }, []);
  return st;
}

/** 사이드바 하단: 다운로드 중 / 설치 준비됨 */
export function UpdateNotice() {
  const st = useUpdate();
  const show = st.state === 'downloading' || st.state === 'ready';
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="update-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>
          {st.state === 'downloading' ? (
            <>
              <div className="flex" style={{ gap: 6 }}><Icon name="download" size={14} /><b>새 버전 {st.version} 받는 중</b></div>
              <div className="bar-track" style={{ marginTop: 8 }}><div className="bar-fill" style={{ transform: `scaleX(${(st.percent ?? 0) / 100})`, transition: 'transform .4s' }} /></div>
            </>
          ) : (
            <>
              <div className="flex" style={{ gap: 6 }}><Icon name="sparkle" size={14} /><b>새 버전 {st.version} 준비됨</b></div>
              <div className="update-sub">데이터는 그대로 유지돼요</div>
              <button className="btn sm primary" style={{ width: '100%', marginTop: 10 }} onClick={() => window.api?.update.install()}>다시 시작해서 업데이트</button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 설정 화면: 현재 버전 · 확인 버튼 · 상태 */
export function UpdatePanel() {
  const st = useUpdate();
  if (!window.api) return <div className="note">브라우저 미리보기에서는 자동 업데이트를 쓸 수 없어요.</div>;
  const msg = {
    idle: '시작할 때와 3시간마다 자동으로 확인해요.',
    checking: '새 버전을 확인하는 중…',
    latest: '최신 버전이에요.',
    downloading: `새 버전 ${st.version} 받는 중 ${st.percent ?? 0}%`,
    ready: `새 버전 ${st.version} 준비됨 — 다시 시작하면 설치돼요. 앱을 그냥 닫아도 닫힐 때 설치돼요.`,
    error: '지금은 확인할 수 없어요(인터넷 연결 확인). 나중에 다시 시도해요.',
  }[st.state];
  return (
    <div>
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <div><div className="b">현재 버전 {st.current ?? ''}</div><div className="note" style={{ marginTop: 4 }}>{msg}</div></div>
        {st.state === 'ready'
          ? <button className="btn primary" onClick={() => window.api?.update.install()}>다시 시작해서 업데이트</button>
          : <button className="btn ghost" disabled={st.state === 'checking' || st.state === 'downloading'} onClick={() => window.api?.update.check()}>업데이트 확인</button>}
      </div>
      <div className="note" style={{ marginTop: 10 }}>업데이트는 프로그램만 바꾸고, 매출·지출·설정 데이터는 <b>%APPDATA%\Nail Entice 정산\data</b>에 그대로 남아요. 설치 직전과 직후에 자동 백업도 만들어둬요.</div>
    </div>
  );
}
