const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, forward) =>
    ipcRenderer.invoke('window:set-ignore-mouse-events', ignore, forward),
  togglePin: () => ipcRenderer.invoke('window:pin-toggle'),
  captureScreen: (options) => ipcRenderer.invoke('screen:capture-snapshot', options),
  executeOSTool: (toolName, args) => ipcRenderer.invoke('os:execute-tool', { toolName, args }),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
});
