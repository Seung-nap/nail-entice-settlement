const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (json) => ipcRenderer.invoke('data:save', json),
  saveSync: (json) => ipcRenderer.sendSync('data:saveSync', json),
  backup: (json, tag) => ipcRenderer.invoke('data:backup', json, tag),
  saveFile: (name, data, kind) => ipcRenderer.invoke('file:save', name, data, kind),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  platform: process.platform,
});
