// Nail Entice 정산 — Electron 메인 프로세스
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// ★데이터 위치는 버전·설치 방식·앱 이름과 무관하게 고정한다: %APPDATA%/Nail Entice 정산/data
//   설치·업데이트·제거는 이 폴더를 건드리지 않는다. 이 경로를 바꾸면 기존 데이터가 '사라진 것처럼' 보이니 절대 바꾸지 말 것.
// 테스트용: NE_USERDATA 로 별도 프로필, NE_SMOKE_SHOT 로 화면 캡처 후 종료
app.setPath('userData', process.env.NE_USERDATA || path.join(app.getPath('appData'), 'Nail Entice 정산'));
if (process.env.NE_SMOKE_SHOT) app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const DATA_FILE = path.join(DATA_DIR, 'nail-entice-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}
function pruneBackups(keep = 40) {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.rmSync(path.join(BACKUP_DIR, f));
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
/** 현재 데이터 파일을 그대로 백업 폴더에 복사 (파일이 없으면 아무것도 안 함) */
function backupData(tag) {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const to = path.join(BACKUP_DIR, `${stamp()}_${tag}.json`);
    fs.copyFileSync(DATA_FILE, to); pruneBackups();
    return to;
  } catch (e) { console.error('backup failed', e); return null; }
}
// 시작 시 안전장치: 버전이 바뀌었으면(=업데이트 직후) 백업, 하루 한 번 자동 백업
(function startupBackups() {
  const metaFile = path.join(DATA_DIR, 'meta.json');
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { /* 첫 실행 */ }
  const v = app.getVersion(), d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (meta.lastVersion && meta.lastVersion !== v) backupData(`after-update-${meta.lastVersion}-to-${v}`);
  if (meta.lastDailyBackup !== today) backupData('daily');
  try { writeAtomic(metaFile, JSON.stringify({ ...meta, lastVersion: v, lastDailyBackup: today })); } catch { /* */ }
})();

ipcMain.handle('data:load', () => (fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : null));
ipcMain.handle('data:save', (_e, json) => { writeAtomic(DATA_FILE, json); });
ipcMain.on('data:saveSync', (e, json) => { try { writeAtomic(DATA_FILE, json); } catch {} e.returnValue = true; });
ipcMain.handle('data:backup', (_e, json, tag) => { writeAtomic(path.join(BACKUP_DIR, `${stamp()}_${tag}.json`), json); pruneBackups(); });
ipcMain.handle('data:openFolder', () => shell.openPath(DATA_DIR));
ipcMain.handle('file:save', async (e, name, data, kind) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const filters = kind === 'xlsx' ? [{ name: 'Excel 통합 문서', extensions: ['xlsx'] }] : [{ name: '정산 백업', extensions: ['json'] }];
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), name), filters });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(data));
  if (kind === 'xlsx') shell.showItemInFolder(filePath);
  return filePath;
});

// ───────── 자동 업데이트 (GitHub Releases) ─────────
let mainWin = null;
let updateState = { state: 'idle' };
const sendUpdate = (st) => { updateState = st; mainWin?.webContents.send('update:state', st); };
function setupUpdater() {
  if (!app.isPackaged || process.env.NE_SMOKE_SHOT) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;           // 새 버전은 뒤에서 조용히 받아둔다
  autoUpdater.autoInstallOnAppQuit = true;   // 그냥 앱을 닫아도 닫힐 때 설치된다
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'latest', version: app.getVersion() }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ ...updateState, state: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => {
    backupData(`before-update-${app.getVersion()}-to-${i.version}`);
    sendUpdate({ state: 'ready', version: i.version });
    if (process.env.NE_AUTOUPDATE_SELFTEST) setTimeout(() => installUpdate(), 1500);
  });
  autoUpdater.on('error', (e) => sendUpdate({ state: 'error', message: String(e?.message || e).slice(0, 200) }));
  const check = () => autoUpdater.checkForUpdates().catch(() => { /* 오프라인이면 다음에 */ });
  ipcMain.handle('update:check', () => check());
  setTimeout(check, 4000);
  setInterval(check, 3 * 60 * 60 * 1000);
}
async function installUpdate() {
  const { autoUpdater } = require('electron-updater');
  // 화면에 남은 저장 전 변경을 먼저 디스크에 쓰고 → 백업 → 설치
  try { await mainWin?.webContents.executeJavaScript('window.__flushSave && window.__flushSave()'); } catch { /* */ }
  backupData(`before-install-${app.getVersion()}`);
  autoUpdater.quitAndInstall(true, true);    // 조용히 설치하고 새 버전으로 다시 실행
}
ipcMain.handle('update:install', () => installUpdate());
ipcMain.handle('update:get', () => ({ ...updateState, current: app.getVersion() }));
ipcMain.handle('app:version', () => app.getVersion());

function createWindow() {
  const win = mainWin = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 700,
    backgroundColor: '#F6EEE3',
    title: 'Nail Entice 정산',
    icon: path.join(__dirname, '..', 'dist', 'brand.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#4A2E1F', height: 40 },
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: !process.env.NE_SMOKE_SHOT },
  });
  win.once('ready-to-show', () => { win.show(); if (process.env.NE_SMOKE_SHOT) { win.setAlwaysOnTop(true, 'screen-saver'); win.focus(); } });
  if (process.env.NE_SMOKE_SHOT) {
    win.webContents.on('console-message', (e) => console.log('[renderer]', e.level, e.message));
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      if (process.env.NE_SMOKE_JS) await win.webContents.executeJavaScript(process.env.NE_SMOKE_JS).catch(() => {});
      setTimeout(async () => {
        // 캡처용: 진입 애니메이션을 끝난 상태로 고정
        const settle = `if(!document.getElementById('cap')){const st=document.createElement('style');st.id='cap';st.textContent='[style*="opacity"]{opacity:1!important} [style*="transform"]:not(.thumb):not(.pill):not(.tb){transform:none!important} .computing{display:none!important}';document.head.appendChild(st);}`;
        const pages = (process.env.NE_SMOKE_PAGES || '').split(',').filter(Boolean);
        const shot = async (file) => { await win.webContents.executeJavaScript(settle); await new Promise((r) => setTimeout(r, 400)); fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG()); };
        if (!pages.length) await shot(process.env.NE_SMOKE_SHOT);
        for (const [i, label] of pages.entries()) {
          await win.webContents.executeJavaScript(`[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.includes(${JSON.stringify(label)}))?.click()`);
          await new Promise((r) => setTimeout(r, 1800));
          await shot(process.env.NE_SMOKE_SHOT.replace(/\.png$/, `_${i}.png`));
        }
        app.quit();
      }, Number(process.env.NE_SMOKE_WAIT2 || 1500));
    }, Number(process.env.NE_SMOKE_WAIT || 9000)));
  }
  // 외부 링크는 기본 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (ev, url) => { if (!url.startsWith('file:') && !url.startsWith('http://localhost')) ev.preventDefault(); });
  if (process.env.VITE_DEV_URL) win.loadURL(process.env.VITE_DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

Menu.setApplicationMenu(null);
// 두 개를 동시에 띄우면 같은 데이터 파일을 서로 덮어쓸 수 있다 → 하나만
if (!process.env.NE_SMOKE_SHOT && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); } });
  app.whenReady().then(() => { createWindow(); setupUpdater(); });
}
app.on('window-all-closed', () => app.quit());
