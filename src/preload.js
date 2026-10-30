'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', Object.freeze({
  read: () => ipcRenderer.invoke('pet:read'),
  increment: () => ipcRenderer.invoke('pet:increment'),
  menu: () => ipcRenderer.send('pet:menu'),
  subscribeKeys: (listener) => {
    const handle = (_event, data) => listener(data);
    ipcRenderer.on('pet:key', handle);
    return () => ipcRenderer.removeListener('pet:key', handle);
  },
  subscribe: (listener) => {
    const handle = (_event, state) => listener(state);
    ipcRenderer.on('pet:state', handle);
    return () => ipcRenderer.removeListener('pet:state', handle);
  }
}));
