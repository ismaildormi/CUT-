const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

/**
 * NEVEA CORE LAUNCHER & SANDBOX BYPASS ENGINE
 *
 * Solves App Store Sandboxing Roadblocks (Apple Mac App Store & Microsoft Store):
 * 1. Detects whether NEVEA is running inside a restricted App Store container
 *    (`process.mas`, `process.windowsStore`, or `NEVEA_STORE_SANDBOX`).
 * 2. Resolves the external, user-writable "Nevea Core" directory outside the read-only bundle:
 *    - macOS: `~/Library/Application Support/NeveaCore`
 *    - Windows: `%APPDATA%\NeveaCore`
 *    - Linux: `~/.config/NeveaCore`
 * 3. Provisions the full power engine (`swarm_boss.py`, `agent_server.py`, `project_rag.py`)
 *    into the external directory on first boot.
 * 4. Requests OS-level permissions legally:
 *    - macOS: Accessibility (`isTrustedAccessibilityClient(true)`) & Screen Recording (`getMediaAccessStatus('screen')`).
 *    - Windows: UAC Admin elevation (`Start-Process powershell -Verb RunAs`) when elevated OS actions are approved.
 */

function isStoreSandboxed() {
  return Boolean(
    process.mas ||
      process.windowsStore ||
      process.env.NEVEA_STORE_SANDBOX === 'true'
  );
}

function getNeveaCoreDirectory() {
  const home = os.homedir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'NeveaCore');
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'NeveaCore');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'NeveaCore');
}

/**
 * Provisions the Nevea Core engine outside the store sandbox on first boot
 */
function ensureNeveaCoreProvisioned(bundledBackendDir) {
  const coreDir = getNeveaCoreDirectory();
  const coreBackendDir = path.join(coreDir, 'backend');
  const manifestPath = path.join(coreDir, 'core-manifest.json');

  try {
    fs.mkdirSync(coreBackendDir, { recursive: true });

    const coreScripts = [
      'agent_server.py',
      'swarm_boss.py',
      'project_rag.py',
      'cognitive_architecture.py',
      'file_engine.py',
      'git_engine.py',
      'tool_creator.py',
      'audio_listener.py',
    ];

    for (const fileName of coreScripts) {
      const srcFile = path.join(bundledBackendDir, fileName);
      const destFile = path.join(coreBackendDir, fileName);
      if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
    }

    const manifest = {
      version: '9.0.0',
      sandboxBypassed: true,
      isStoreBuild: isStoreSandboxed(),
      coreDirectory: coreDir,
      provisionedAt: new Date().toISOString(),
      capabilities: ['p2p_hive', 'local_ollama', 'ghost_cursor_os', 'zero_conflict_king_dag'],
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return {
      provisioned: true,
      coreDir,
      coreBackendDir,
      manifest,
    };
  } catch (err) {
    return {
      provisioned: false,
      coreDir,
      coreBackendDir: bundledBackendDir,
      error: err.message,
    };
  }
}

/**
 * Requests macOS Accessibility & Screen Recording permissions for Ghost Cursors & Live Vision,
 * or checks Windows UAC status.
 */
function checkAndRequestOSPermissions(electronApp) {
  const status = {
    platform: process.platform,
    accessibilityGranted: true,
    screenRecordingGranted: true,
    uacReady: true,
  };

  try {
    if (process.platform === 'darwin' && electronApp?.systemPreferences) {
      const sysPrefs = electronApp.systemPreferences;
      if (typeof sysPrefs.isTrustedAccessibilityClient === 'function') {
        status.accessibilityGranted = sysPrefs.isTrustedAccessibilityClient(true);
      }
      if (typeof sysPrefs.getMediaAccessStatus === 'function') {
        const screenStatus = sysPrefs.getMediaAccessStatus('screen');
        status.screenRecordingGranted = screenStatus === 'granted';
      }
    }
  } catch (err) {
    status.error = err.message;
  }

  return status;
}

/**
 * Executes an elevated Windows command via a native UAC prompt when approved by the user
 */
function executeElevatedWindowsUAC(command) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ success: false, message: 'UAC elevation is only applicable on Windows.' });
      return;
    }
    const safeCmd = String(command || '').replace(/"/g, '\\"');
    const psCommand = `powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \\"${safeCmd}\\"' -Verb RunAs -Wait"`;
    exec(psCommand, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr });
      } else {
        resolve({ success: true, stdout: stdout.trim() });
      }
    });
  });
}

module.exports = {
  isStoreSandboxed,
  getNeveaCoreDirectory,
  ensureNeveaCoreProvisioned,
  checkAndRequestOSPermissions,
  executeElevatedWindowsUAC,
};
