import React, { useRef, useState } from 'react';
import { useApp } from '../store';
import { Icon, BrandMark } from '../components/Icons';
import { Modal, Stagger } from '../components/ui';
import { RateInput } from './Payments';
import { PAY_KEYS, AppData, emptyData, EXPENSE_GROUPS, INCOME_GROUPS } from '../lib/model';
import { pct } from '../lib/data';
import { migrateToV2 } from '../lib/fixed';
import { PAY_META } from './common';
import { UpdatePanel } from '../components/Update';

export default function SettingsView({ onUpload }: { onUpload: () => void }) {
  const { data, update, toast, built } = useApp();
  const st = data.settings;
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const backup = async () => {
    const json = JSON.stringify(data, null, 1);
    const name = `네일엔티스_정산백업_${new Date().toISOString().slice(0, 10)}.json`;
    if (window.api) { const p = await window.api.saveFile(name, new TextEncoder().encode(json).buffer as ArrayBuffer, 'json'); if (p) toast('백업 파일을 저장했어요', 'ok', 'download'); }
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; a.click(); }
  };
  const restore = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as AppData;
      if (!Array.isArray(d.lines) || !Array.isArray(d.entries)) throw new Error('정산 백업 파일이 아니에요');
      migrateToV2(d); update((x) => { Object.assign(x, emptyData(), d); }, '백업에서 복원했어요');
    } catch (e: any) { toast(`복원 실패: ${e.message}`, 'err'); }
  };

  return (
    <div className="grid g-12">
      <Stagger i={0} className="span-6">
        <div className="card set-sec">
          <div className="card-h"><div><div className="card-t">결제수단 · 수수료율</div><div className="card-d">POS 엑셀의 결제 열 이름과 수수료</div></div></div>
          <table className="tbl">
            <thead><tr><th>결제수단</th><th>표시 이름</th><th className="r">수수료율</th></tr></thead>
            <tbody>
              {PAY_KEYS.map((k) => (
                <tr key={k}>
                  <td><span className="flex" style={{ gap: 8 }}><span className="muted" style={{ fontSize: 13 }}>{{ cash: '현금', card: '카드', transfer: '계좌이체', naver: '네이버페이', etc1: '기타1', etc2: '기타2', etc3: '기타3~5', unpaid: '미수' }[k]}</span></span></td>
                  <td><input className="inp sm" style={{ width: 140 }} defaultValue={st.payLabels[k]} onBlur={(e) => e.target.value.trim() && e.target.value !== st.payLabels[k] && update((d) => { d.settings.payLabels[k] = e.target.value.trim(); }, '이름을 바꿨어요')} /></td>
                  <td className="r">{k === 'unpaid' ? <span className="muted">—</span> : <RateInput value={st.payRates[k]} onCommit={(v) => update((d) => { d.settings.payRates[k] = v; }, `${st.payLabels[k]} ${pct(v, 2)}`)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 10 }}>카드 수수료율은 <b>미지정 카드 결제</b>에 적용되는 기본값이에요. 카드사별 요율은 ‘결제·수수료’ 화면에서 관리해요. 예) POS의 ‘기타1’이 카카오페이라면 이름을 ‘카카오페이’로 바꾸고 요율을 넣어주세요.</div>
        </div>
      </Stagger>
      <Stagger i={1} className="span-6">
        <div className="card set-sec">
          <div className="card-h"><div><div className="card-t">매출 데이터</div><div className="card-d">POS에서 내려받은 엑셀을 올리면 겹치는 기간만 새로 바뀌어요</div></div></div>
          <div className="stat-grid" style={{ marginTop: 0 }}>
            <div className="stat"><div className="l">매출 줄</div><div className="v">{data.lines.length.toLocaleString()}</div></div>
            <div className="stat"><div className="l">방문</div><div className="v">{(built?.visits.length ?? 0).toLocaleString()}</div></div>
            <div className="stat"><div className="l">지출·수입 기록</div><div className="v">{data.entries.length.toLocaleString()}</div></div>
          </div>
          <div className="note">최근 업로드: <b>{data.sourceName ?? '없음'}</b>{data.importedAt && ` · ${new Date(data.importedAt).toLocaleString('ko-KR')}`}</div>
          <div className="flex" style={{ marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={onUpload}><Icon name="upload" size={15} />매출 엑셀 올리기</button>
            <button className="btn ghost" onClick={backup}><Icon name="download" size={15} />전체 백업(.json)</button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}><Icon name="repeat" size={15} />백업에서 복원</button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ''; }} />
          </div>
          <div className="hr" />
          <div className="note">데이터는 이 컴퓨터에만 저장돼요(인터넷 전송 없음). 매출 엑셀을 새로 올리기 직전 상태는 자동으로 백업돼요.{window.api && <> <button onClick={() => window.api!.openDataFolder()} style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>저장 폴더 열기</button></>}</div>
          <button className="btn sm ghost" style={{ marginTop: 10, color: '#AE3F36' }} onClick={() => setConfirm(true)}><Icon name="trash" size={14} />모든 데이터 지우기</button>
        </div>
        <div className="card set-sec">
          <div className="card-h"><div><div className="card-t">프로그램 업데이트</div><div className="card-d">새 버전이 나오면 자동으로 받아요</div></div></div>
          <UpdatePanel />
        </div>
        <div className="card set-sec">
          <div className="card-h"><BrandMark size={44} /><div><div className="card-t">가게 이름</div><div className="card-d">월말정산 시트 제목에 쓰여요</div></div></div>
          <input className="inp" defaultValue={st.shopName} onBlur={(e) => e.target.value.trim() && update((d) => { d.settings.shopName = e.target.value.trim(); }, '가게 이름을 바꿨어요')} style={{ width: '100%' }} />
        </div>
      </Stagger>
      <Stagger i={2} className="span-12">
        <div className="card">
          <div className="card-h"><div><div className="card-t">지출 · 수입 분류표</div><div className="card-d">네일샵 운영에 필요한 항목을 미리 넣어뒀어요 — 항목 칸은 자유롭게 입력해도 돼요</div></div></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
            {[...EXPENSE_GROUPS, ...INCOME_GROUPS].map((g) => (
              <div key={g.name} className="stat">
                <div className="flex" style={{ gap: 8 }}><span style={{ color: 'var(--ink-60)' }}><Icon name={g.icon} size={16} /></span><b style={{ fontSize: 14 }}>{g.name}</b></div>
                <div className="note" style={{ marginTop: 6 }}>{g.items.join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      </Stagger>
      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h2>모든 데이터를 지울까요?</h2>
        <p>매출·지출·설정이 모두 초기화돼요. 지우기 전에 <b>전체 백업</b>을 받아두는 걸 권해요. 이 작업은 되돌릴 수 없어요.</p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setConfirm(false)}>취소</button>
          <button className="btn" style={{ background: '#AE3F36', color: '#fff' }} onClick={() => { update((d) => { Object.assign(d, emptyData()); }, '모든 데이터를 지웠어요'); setConfirm(false); }}>지우기</button>
        </div>
      </Modal>
    </div>
  );
}
