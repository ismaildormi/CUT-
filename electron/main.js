require('dotenv').config();
const { app, BrowserWindow, ipcMain, screen, desktopCapturer, dialog, globalShortcut, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Initialize electron-updater for Over-the-Air (OTA) GitHub Releases
let autoUpdater = null;
try {
  const updaterPkg = require('electron-updater');
  autoUpdater = updaterPkg.autoUpdater;
} catch (e) {
  console.warn('[Nevea Updater] electron-updater module resolution note:', e?.message);
}

// Initialize electron-store (with safe CJS/ESM resolution and local JSON fallback)
let store = null;
try {
  const StorePkg = require('electron-store');
  const StoreClass = StorePkg.default || StorePkg;
  store = new StoreClass({
    name: 'nevea-desktop-preferences',
    defaults: {
      windowBounds: { width: 440, height: 640, x: null, y: null },
      lastActiveCharacter: 'pure_fluff',
      volume: 75,
      autoStartOnBoot: false,
      liveVisionEnabled: false,
      systemAudioEnabled: false,
    },
  });
} catch {
  const fallbackStorePath = path.join(app?.getPath?.('userData') || __dirname, 'nevea-desktop-preferences.json');
  const readFallback = () => {
    try {
      return JSON.parse(fs.readFileSync(fallbackStorePath, 'utf-8'));
    } catch {
      return {
        windowBounds: { width: 440, height: 640, x: null, y: null },
        lastActiveCharacter: 'pure_fluff',
        volume: 75,
        autoStartOnBoot: false,
        liveVisionEnabled: false,
        systemAudioEnabled: false,
      };
    }
  };
  store = {
    get: (key, defaultVal) => {
      const data = readFallback();
      return key in data ? data[key] : defaultVal;
    },
    set: (key, val) => {
      const data = readFallback();
      data[key] = val;
      try {
        fs.writeFileSync(fallbackStorePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch {}
    },
  };
}

let chokidar = null;
try {
  chokidar = require('chokidar');
} catch {}

let mainWindow = null;
let pythonProcess = null;
let audioListenerProcess = null;
let workspaceWatcher = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

// Destructive Tools requiring user approval via the Permission Gate
const DESTRUCTIVE_TOOLS = new Set([
  'write_file',
  'write_to_any_file',
  'click_element_background',
  'type_text_background',
  'delete_file',
  'close_app',
  'execute_terminal_command',
  'run_powershell',
  'empty_recycle_bin',
  'clean_system',
  'toggle_wifi',
  'git_clone',
  'git_commit',
  'git_push',
  'create_remote_repo',
  'delete_repo',
  'upload_file_to_repo',
  'install_npm_package',
  'install_pip_package',
  'run_script',
  'install_system_tool',
  'pull_ollama_model',
  'execute_dynamic_tool',
  'composio_execute_action',
]);

/**
 * 1. Initialize Python OS Automation & ChromaDB Agent (with Store Launcher Out-of-Sandbox Provisioning)
 */
const coreLauncher = require('./coreLauncher.js');

function initPythonBackend() {
  const bundledBackendDir = path.join(__dirname, '../backend');
  const coreProvision = coreLauncher.ensureNeveaCoreProvisioned(bundledBackendDir);
  coreLauncher.checkAndRequestOSPermissions({ systemPreferences: require('electron').systemPreferences });

  const activeBackendDir =
    coreLauncher.isStoreSandboxed() && coreProvision.provisioned
      ? coreProvision.coreBackendDir
      : bundledBackendDir;
  const pyScript = path.join(activeBackendDir, 'agent_server.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  try {
    pythonProcess = spawn(pythonCmd, [pyScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1', NEVEA_CORE_DIR: coreProvision.coreDir }
    });

    pythonProcess.stdout.on('data', (data) => {
      const raw = data.toString().trim();
      console.log(`[Nevea OS Agent]: ${raw}`);
      // Forward independent Ghost Cursor coordinates to React UI without touching physical mouse
      for (const line of raw.split('\n')) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && (parsed.ghost_cursor || (typeof parsed.x === 'number' && typeof parsed.y === 'number'))) {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ghost-cursor:move', {
                x: parsed.x,
                y: parsed.y,
                label: parsed.label || parsed.action || 'NEVEA Ghost Click',
                type: parsed.type || 'click',
                windowTitle: parsed.window || parsed.windowTitle,
              });
            }
          }
        } catch {}
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Nevea OS Agent Err]: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python agent exited with code ${code}`);
    });
  } catch (err) {
    console.warn('[Nevea] Python backend fallback to Node.js tool driver:', err.message);
  }
}

/**
 * 2. Create Transparent, Frameless Always-On-Top Companion Window (Restoring Bounds from electron-store)
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    transparent: false,
    frame: true,
    hasShadow: true,
    alwaysOnTop: false,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#050505',
    icon: path.join(__dirname, '../public/logo.png'),
    title: 'NEVEA — Sentient 3D Desktop Fluff Companion',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.maximize();

  const targetUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(targetUrl);

  // Watch Nevea_Plans/ with chokidar for real-time project plan & code updates
  if (chokidar && !workspaceWatcher) {
    try {
      const plansDir = path.resolve(process.cwd(), 'Nevea_Plans');
      fs.mkdirSync(plansDir, { recursive: true });
      workspaceWatcher = chokidar.watch(plansDir, { ignoreInitial: true, depth: 2 });
      workspaceWatcher.on('all', (eventType, filePath) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('workspace:file-changed', {
            eventType,
            filePath,
            timestamp: Date.now(),
          });
        }
      });
    } catch {}
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 3. Security Permission Gate Dialog
 * Intercepts destructive OS tools and prompts user with Yes/No before execution
 */
async function promptPermissionGate(toolName, args) {
  if (!mainWindow) return false;

  const description =
    toolName === 'execute_terminal_command'
      ? `run the terminal command:\n"${args.command || ''}"`
      : toolName === 'write_file'
      ? `create/overwrite the file:\n"${args.path || ''}"`
      : toolName === 'close_app'
      ? `force close the application:\n"${args.app_name || ''}"`
      : toolName === 'empty_recycle_bin'
      ? `permanently empty the Recycle Bin / Trash`
      : `execute the critical action: ${toolName}`;

  const response = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Allow Action', 'Block & Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'NEVEA Security Permission Gate',
    message: `NEVEA requests permission to:\n\n${description}`,
    detail: 'This action affects your local system files or active processes. Do you want to permit execution?',
  });

  return response.response === 0;
}

function isElectronToolDestructive(toolName) {
  const clean = String(toolName || '').trim();
  if (!clean) return false;
  if (DESTRUCTIVE_TOOLS.has(clean)) return true;
  if (clean.endsWith('_tool') || clean.startsWith('dynamic_') || clean.includes('composio')) return true;
  return false;
}

const ALLOWED_STORE_KEYS = new Set([
  'windowBounds',
  'lastActiveCharacter',
  'volume',
  'autoStartOnBoot',
  'liveVisionEnabled',
  'systemAudioEnabled',
  'setup_completed',
  'genesis_completed',
  'selected_king_boss',
  'nevea_vault_keys',
]);

/**
 * 4. High-Performance IPC Router
 */
function setupIPC() {
  // Persist & retrieve user state (windowBounds, lastActiveCharacter, volume) via electron-store
  ipcMain.handle('store:get', (event, key, defaultValue) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey || cleanKey.length > 128) return defaultValue;
    return store.get(cleanKey, defaultValue);
  });

  ipcMain.handle('store:set', (event, key, value) => {
    const cleanKey = String(key || '').trim();
    if (!cleanKey || cleanKey.length > 128 || (!ALLOWED_STORE_KEYS.has(cleanKey) && !cleanKey.startsWith('nevea_'))) {
      return { success: false, error: 'Disallowed store key' };
    }
    store.set(cleanKey, value);
    return { success: true, key: cleanKey, value };
  });

  // Independent Ghost Cursor IPC Channel (AI-controlled visual cursor independent of physical mouse)
  ipcMain.handle('ghost-cursor:move', (_event, payload) => {
    if (mainWindow && !mainWindow.isDestroyed() && payload && typeof payload === 'object') {
      mainWindow.webContents.send('ghost-cursor:move', payload);
    }
    return { success: true, ...(payload && typeof payload === 'object' ? payload : {}) };
  });

  // Pass-through click events to desktop applications below
  ipcMain.handle('window:set-ignore-mouse-events', (event, ignore, forward) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: Boolean(forward) });
    }
  });

  // Pin / Unpin Always-On-Top
  ipcMain.handle('window:pin-toggle', () => {
    if (!mainWindow) return false;
    const currentState = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!currentState, 'screen-saver');
    return !currentState;
  });

  // Multimodal Screen Snapshot Capture (Resized max 1080p, JPEG quality 70 for low latency)
  ipcMain.handle('screen:capture-snapshot', async (event, options = {}) => {
    try {
      const maxW = Math.min(1920, Number(options?.width) || 1280);
      const maxH = Math.min(1080, Number(options?.height) || 720);
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: maxW,
          height: maxH,
        },
      });

      if (sources && sources.length > 0) {
        return {
          success: true,
          mimeType: 'image/jpeg',
          quality: 0.7,
          base64: sources[0].thumbnail.toJPEG(70).toString('base64'),
        };
      }
      return { success: false, error: 'No display capture sources found' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });


  // OS Control & Automation Tool Dispatcher with PERMISSION GATE
  ipcMain.handle('os:execute-tool', async (event, payload = {}) => {
    const toolName = String(payload?.toolName || '').trim();
    const args = payload?.args && typeof payload.args === 'object' ? payload.args : {};
    if (!toolName) {
      return { success: false, error: 'toolName is required' };
    }

    // Check Permission Gate for destructive actions
    if (isElectronToolDestructive(toolName)) {
      const granted = await promptPermissionGate(toolName, args);
      if (!granted) {
        return {
          success: false,
          blocked: true,
          action: toolName,
          message: `User rejected permission to execute ${toolName}`,
        };
      }
    }

    return new Promise((resolve) => {
      if (!pythonProcess || !pythonProcess.stdin.writable) {
        return resolve({
          success: false,
          action: toolName,
          error: 'Python OS agent process is not running; use HTTP API /api/os/execute fallback.',
        });
      }

      const rpcPayload = JSON.stringify({ tool: toolName, args, timestamp: Date.now() }) + '\n';
      
      const onData = (data) => {
        try {
          const res = JSON.parse(data.toString());
          pythonProcess.stdout.removeListener('data', onData);
          resolve(res);
        } catch {}
      };

      pythonProcess.stdout.on('data', onData);
      pythonProcess.stdin.write(rpcPayload);

      setTimeout(() => {
        pythonProcess.stdout.removeListener('data', onData);
        resolve({ success: false, error: 'Tool execution timed out' });
      }, 16000);
    });
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.close());

  // Omniscience Protocol Settings (Auto-start on boot, Live Vision, System Audio)
  ipcMain.handle('settings:get-omniscience', () => {
    return {
      autoStartOnBoot: Boolean(store.get('autoStartOnBoot', false)),
      liveVisionEnabled: Boolean(store.get('liveVisionEnabled', false)),
      systemAudioEnabled: Boolean(store.get('systemAudioEnabled', false)),
    };
  });

  ipcMain.handle('settings:set-omniscience', (event, newSettings) => {
    if (newSettings && typeof newSettings === 'object') {
      if (typeof newSettings.autoStartOnBoot === 'boolean') {
        store.set('autoStartOnBoot', newSettings.autoStartOnBoot);
        try {
          app.setLoginItemSettings({
            openAtLogin: newSettings.autoStartOnBoot,
            path: app.getPath('exe'),
          });
        } catch (e) {
          console.warn('[Nevea] app.setLoginItemSettings failed:', e.message);
        }
      }
      if (typeof newSettings.liveVisionEnabled === 'boolean') {
        store.set('liveVisionEnabled', newSettings.liveVisionEnabled);
      }
      if (typeof newSettings.systemAudioEnabled === 'boolean') {
        store.set('systemAudioEnabled', newSettings.systemAudioEnabled);
        toggleSystemAudioProcess(newSettings.systemAudioEnabled);
      }
    }
    return {
      success: true,
      settings: {
        autoStartOnBoot: Boolean(store.get('autoStartOnBoot', false)),
        liveVisionEnabled: Boolean(store.get('liveVisionEnabled', false)),
        systemAudioEnabled: Boolean(store.get('systemAudioEnabled', false)),
      },
    };
  });

  ipcMain.handle('system-audio:toggle', (event, enable) => {
    toggleSystemAudioProcess(Boolean(enable));
    return { success: true, enabled: Boolean(enable) };
  });
}

function toggleSystemAudioProcess(enable) {
  if (enable) {
    if (audioListenerProcess && !audioListenerProcess.killed) return;
    try {
      const pyScript = path.join(__dirname, '../backend/audio_listener.py');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      audioListenerProcess = spawn(pythonCmd, [pyScript], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      audioListenerProcess.stdout?.on('data', (d) => {
        console.log(`[Nevea Audio Listener]: ${d.toString().trim()}`);
      });
      audioListenerProcess.stderr?.on('data', (d) => {
        console.error(`[Nevea Audio Listener Err]: ${d.toString().trim()}`);
      });
      console.log('[Nevea] Launched loopback system audio listener subprocess.');
    } catch (err) {
      console.warn('[Nevea] Failed to spawn audio_listener.py:', err.message);
    }
  } else {
    if (audioListenerProcess) {
      try {
        audioListenerProcess.kill();
      } catch {}
      audioListenerProcess = null;
      console.log('[Nevea] Stopped loopback system audio listener subprocess.');
    }
  }
}

app.whenReady().then(() => {
  // Allow only explicitly trusted media/desktop permissions; reject all others
  if (session && session.defaultSession) {
    const allowedPermissions = [
      'media',
      'audioCapture',
      'microphone',
      'mediaKeySystem',
      'notifications',
      'fullscreen',
      'pointerLock',
      'clipboard-read',
      'clipboard-sanitized-write',
    ];
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (allowedPermissions.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });

    if (typeof session.defaultSession.setPermissionCheckHandler === 'function') {
      session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return allowedPermissions.includes(permission);
      });
    }
  }

  initPythonBackend();
  setupIPC();
  createWindow();

  // Over-The-Air (OTA) Auto-Updater: Check GitHub Releases and install updates silently
  if (autoUpdater) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('update-available', (info) => {
        console.log('[Nevea Updater] New release available on GitHub:', info?.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:available', info);
        }
      });

      autoUpdater.on('update-downloaded', (info) => {
        console.log('[Nevea Updater] Update downloaded. Installing silently...', info?.version);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:downloaded', info);
        }
        // Silently install upon user exit or after short grace delay
        setTimeout(() => {
          try {
            autoUpdater.quitAndInstall(true, true);
          } catch {}
        }, 3000);
      });

      autoUpdater.on('error', (err) => {
        console.warn('[Nevea Updater] Auto-update check note:', err?.message);
      });

      // Initiate OTA update scan
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('[Nevea Updater] checkForUpdatesAndNotify note:', err?.message);
      });
    } catch (updaterErr) {
      console.warn('[Nevea Updater] Error in autoUpdater setup:', updaterErr?.message);
    }
  }

  // Task 1: Auto-Start NEVEA on PC Boot based on electron-store setting
  try {
    const autoStartSetting = Boolean(store.get('autoStartOnBoot', false));
    app.setLoginItemSettings({
      openAtLogin: autoStartSetting,
      path: app.getPath('exe'),
    });
    console.log(`[Nevea] Auto-Start on PC Boot initialized: ${autoStartSetting}`);
  } catch (err) {
    console.warn('[Nevea] Auto-start registration warning:', err.message);
  }

  // Resume System Audio listener if enabled in preferences
  if (Boolean(store.get('systemAudioEnabled', false))) {
    toggleSystemAudioProcess(true);
  }

  // Register Global Hotkey (Alt+Space): Bring NEVEA window to front & trigger voice listening
  try {
    globalShortcut.register('Alt+Space', () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
      }
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('hotkey:trigger-voice');
      }
    });
  } catch (err) {
    console.warn('[Nevea] Failed to register Alt+Space shortcut:', err.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Task 5: Electron GPU Fallback on WebGPU / GPU crash
  app.on('render-process-gone', (event, webContents, details) => {
    console.warn('[Nevea GPU Guardian] Render process gone:', details.reason);
    if (details.reason === 'crashed' || details.reason === 'gpu-process-crashed') {
      console.warn('[Nevea GPU Guardian] Restarting window with hardware acceleration disabled...');
      try {
        app.disableHardwareAcceleration();
      } catch {}
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload();
      }
    }
  });

  app.on('child-process-gone', (event, details) => {
    if (details.type === 'GPU') {
      console.warn('[Nevea GPU Guardian] Child GPU process crashed. Applying disableHardwareAcceleration() fallback.');
      try {
        app.disableHardwareAcceleration();
      } catch {}
    }
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch {}
  }
  if (audioListenerProcess) {
    try {
      audioListenerProcess.kill();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
