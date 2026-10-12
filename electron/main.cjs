// Nail Entice 정산 — Electron 메인 프로세스
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// 테스트용: NE_USERDATA 로 별도 프로필, NE_SMOKE_SHOT 로 화면 캡처 후 종료
if (process.env.NE_USERDATA) app.setPath('userData', process.env.NE_USERDATA);
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
function pruneBackups(keep = 20) {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.rmSync(path.join(BACKUP_DIR, f));
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

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

function createWindow() {
  const win = new BrowserWindow({
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
        const img = await win.webContents.capturePage();
        fs.writeFileSync(process.env.NE_SMOKE_SHOT, img.toPNG());
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
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
