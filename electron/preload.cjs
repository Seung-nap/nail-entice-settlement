const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (json) => ipcRenderer.invoke('data:save', json),
  saveSync: (json) => ipcRenderer.sendSync('data:saveSync', json),
  backup: (json, tag) => ipcRenderer.invoke('data:backup', json, tag),
  saveFile: (name, data, kind) => ipcRenderer.invoke('file:save', name, data, kind),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  platform: process.platform,
  version: () => ipcRenderer.invoke('app:version'),
  update: {
    get: () => ipcRenderer.invoke('update:get'),
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    onState: (cb) => { const h = (_e, st) => cb(st); ipcRenderer.on('update:state', h); return () => ipcRenderer.removeListener('update:state', h); },
  },
});
