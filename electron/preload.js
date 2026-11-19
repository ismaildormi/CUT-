const { contextBridge, ipcRenderer } = require('electron');

const storeBridge = {
  get: (key, defaultValue) => ipcRenderer.invoke('store:get', key, defaultValue),
  set: (key, value) => ipcRenderer.invoke('store:set', key, value),
};

contextBridge.exposeInMainWorld('electron', {
  store: storeBridge,
});

contextBridge.exposeInMainWorld('electronAPI', {
  store: storeBridge,
  setIgnoreMouseEvents: (ignore, forward) =>
    ipcRenderer.invoke('window:set-ignore-mouse-events', ignore, forward),
  togglePin: () => ipcRenderer.invoke('window:pin-toggle'),
  captureScreen: (options) => ipcRenderer.invoke('screen:capture-snapshot', options),
  executeOSTool: (toolName, args) => ipcRenderer.invoke('os:execute-tool', { toolName, args }),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  getOmniscienceSettings: () => ipcRenderer.invoke('settings:get-omniscience'),
  setOmniscienceSettings: (settings) => ipcRenderer.invoke('settings:set-omniscience', settings),
  toggleSystemAudio: (enable) => ipcRenderer.invoke('system-audio:toggle', enable),
  moveGhostCursor: (payload) => ipcRenderer.invoke('ghost-cursor:move', payload),
  onGhostCursorMove: (callback) => {
    const handler = (_event, coords) => callback(coords);
    ipcRenderer.on('ghost-cursor:move', handler);
    return () => ipcRenderer.removeListener('ghost-cursor:move', handler);
  },
  onTriggerVoice: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:trigger-voice', handler);
    return () => ipcRenderer.removeListener('hotkey:trigger-voice', handler);
  },
});
