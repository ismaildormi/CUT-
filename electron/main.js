const { app, BrowserWindow, ipcMain, screen, desktopCapturer, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

// Destructive Tools requiring user approval via the Permission Gate
const DESTRUCTIVE_TOOLS = new Set([
  'write_file',
  'close_app',
  'execute_terminal_command',
  'empty_recycle_bin',
  'toggle_wifi'
]);

/**
 * 1. Initialize Python OS Automation & ChromaDB Agent
 */
function initPythonBackend() {
  const pyScript = path.join(__dirname, '../backend/agent_server.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  try {
    pythonProcess = spawn(pythonCmd, [pyScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Nevea OS Agent]: ${data.toString().trim()}`);
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
 * 2. Create Transparent, Frameless Always-On-Top Companion Window
 */
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 440;
  const windowHeight = 640;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 32,
    y: screenHeight - windowHeight - 32,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
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

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const targetUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(targetUrl);

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

/**
 * 4. High-Performance IPC Router
 */
function setupIPC() {
  // Pass-through click events to desktop applications below
  ipcMain.handle('window:set-ignore-mouse-events', (event, ignore, forward) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: Boolean(forward) });
    }
  });

  // Pin / Unpin Always-On-Top
  ipcMain.handle('window:pin-toggle', () => {
    if (!mainWindow) return false;
    const currentState = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!currentState, 'screen-saver');
    return !currentState;
  });

  // Multimodal Screen Snapshot Capture
  ipcMain.handle('screen:capture-snapshot', async (event, options = {}) => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: options.width || 1280,
          height: options.height || 720,
        },
      });

      if (sources && sources.length > 0) {
        return {
          success: true,
          mimeType: 'image/jpeg',
          base64: sources[0].thumbnail.toJPEG(85).toString('base64'),
        };
      }
      return { success: false, error: 'No display capture sources found' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // OS Control & Automation Tool Dispatcher with PERMISSION GATE
  ipcMain.handle('os:execute-tool', async (event, { toolName, args }) => {
    // Check Permission Gate for destructive actions
    if (DESTRUCTIVE_TOOLS.has(toolName)) {
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
        // Fallback to internal Node.js executeOSCommand
        const { executeOSCommand } = require('../server/tools.js');
        return executeOSCommand(toolName, args).then(resolve);
      }

      const payload = JSON.stringify({ tool: toolName, args, timestamp: Date.now() }) + '\n';
      
      const onData = (data) => {
        try {
          const res = JSON.parse(data.toString());
          pythonProcess.stdout.removeListener('data', onData);
          resolve(res);
        } catch {}
      };

      pythonProcess.stdout.on('data', onData);
      pythonProcess.stdin.write(payload);

      setTimeout(() => {
        pythonProcess.stdout.removeListener('data', onData);
        resolve({ success: false, error: 'Tool execution timed out' });
      }, 16000);
    });
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.close());
}

app.whenReady().then(() => {
  initPythonBackend();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
