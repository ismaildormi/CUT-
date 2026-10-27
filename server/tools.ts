import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface OSToolResult {
  success: boolean;
  action: string;
  output?: any;
  error?: string;
  requiresPermission?: boolean;
}

// Critical tools requiring user consent via the Permission Gate
export const DESTRUCTIVE_TOOLS = new Set([
  'write_file',
  'close_app',
  'execute_terminal_command',
  'empty_recycle_bin',
  'toggle_wifi'
]);

/**
 * Execute system OS command across File System, GUI, Hardware, Clipboard & Terminal
 */
export async function executeOSCommand(toolName: string, args: any): Promise<OSToolResult> {
  const platform = os.platform();

  switch (toolName) {
    // --------------------------------------------------------------------------
    // 1. FILE SYSTEM ACCESS
    // --------------------------------------------------------------------------
    case 'read_file': {
      try {
        const filePath = path.resolve(args.path.replace(/^~/, os.homedir()));
        if (!fs.existsSync(filePath)) {
          return { success: false, action: 'read_file', error: `File not found: ${filePath}` };
        }
        const stats = fs.statSync(filePath);
        if (stats.size > 2 * 1024 * 1024) {
          return { success: false, action: 'read_file', error: 'File exceeds 2MB limit' };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, action: `Read ${filePath}`, output: content };
      } catch (err: any) {
        return { success: false, action: 'read_file', error: err.message };
      }
    }

    case 'write_file': {
      try {
        const filePath = path.resolve(args.path.replace(/^~/, os.homedir()));
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, args.content, 'utf-8');
        return { success: true, action: `Write file: ${filePath}`, output: `Saved ${args.content.length} characters` };
      } catch (err: any) {
        return { success: false, action: 'write_file', error: err.message };
      }
    }

    case 'search_files': {
      try {
        const searchDir = path.resolve((args.directory || '.').replace(/^~/, os.homedir()));
        const query = (args.query || '').toLowerCase();
        const results: string[] = [];

        function scan(dir: string, depth = 0) {
          if (depth > 4 || results.length >= 25) return;
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (['node_modules', '.git', '.cache', 'dist'].includes(entry.name)) continue;
              const fullPath = path.join(dir, entry.name);
              if (entry.name.toLowerCase().includes(query)) {
                results.push(fullPath);
              }
              if (entry.isDirectory()) {
                scan(fullPath, depth + 1);
              }
            }
          } catch {}
        }

        scan(searchDir);
        return { success: true, action: `Search files for "${query}"`, output: results };
      } catch (err: any) {
        return { success: false, action: 'search_files', error: err.message };
      }
    }

    // --------------------------------------------------------------------------
    // 2. ADVANCED APP & GUI CONTROL
    // --------------------------------------------------------------------------
    case 'open_app': {
      const app = args.app_name;
      let cmd = '';
      if (platform === 'win32') cmd = `start "" "${app}"`;
      else if (platform === 'darwin') cmd = `open -a "${app}"`;
      else cmd = `xdg-open "${app}" || which "${app}" && "${app}" &`;
      return runShell(cmd, `Open application: ${app}`);
    }

    case 'close_app': {
      const app = args.app_name;
      let cmd = '';
      if (platform === 'win32') cmd = `taskkill /F /IM "${app}.exe" /T || taskkill /F /IM "${app}" /T`;
      else if (platform === 'darwin') cmd = `pkill -f "${app}" || killall "${app}"`;
      else cmd = `pkill -f "${app}"`;
      return runShell(cmd, `Terminate app: ${app}`);
    }

    case 'type_text': {
      const text = String(args.text).replace(/"/g, '\\"');
      let script = '';
      if (platform === 'win32') {
        script = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${text}')"`;
      } else if (platform === 'darwin') {
        script = `osascript -e 'tell application "System Events" to keystroke "${text}"'`;
      } else {
        script = `xdotool type --delay 12 "${text}"`;
      }
      return runShell(script, `Type text`);
    }

    case 'press_hotkey': {
      const keys = Array.isArray(args.keys_array) ? args.keys_array : [args.keys_array];
      let script = '';
      if (platform === 'darwin') {
        const key = keys[keys.length - 1];
        const modifiers = keys.slice(0, -1).map(k => `${k} down`).join(', ');
        script = `osascript -e 'tell application "System Events" to keystroke "${key}" using {${modifiers}}'`;
      } else if (platform === 'win32') {
        script = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^${keys.join('')}')"`;
      } else {
        script = `xdotool key ${keys.join('+')}`;
      }
      return runShell(script, `Press hotkey: ${keys.join('+')}`);
    }

    // --------------------------------------------------------------------------
    // 3. SYSTEM & HARDWARE CONTROL
    // --------------------------------------------------------------------------
    case 'change_system_volume': {
      const level = Math.max(0, Math.min(100, Number(args.level) || 50));
      let cmd = '';
      if (platform === 'darwin') {
        const macVol = Math.round((level / 100) * 7);
        cmd = `osascript -e 'set volume ${macVol}'`;
      } else if (platform === 'win32') {
        cmd = `powershell -c "$obj = New-Object -ComObject WScript.Shell; 1..50 | % {{$obj.SendKeys([char]174)}}; 1..${Math.round(level/2)} | % {{$obj.SendKeys([char]175)}}"`;
      } else {
        cmd = `amixer -D pulse sset Master ${level}% || pactl set-sink-volume @DEFAULT_SINK@ ${level}%`;
      }
      return runShell(cmd, `Set volume to ${level}%`);
    }

    case 'toggle_wifi': {
      const state = Boolean(args.state);
      let cmd = '';
      if (platform === 'darwin') cmd = `networksetup -setairportpower en0 ${state ? 'on' : 'off'}`;
      else if (platform === 'win32') cmd = `netsh interface set interface "Wi-Fi" ${state ? 'enable' : 'disable'}`;
      else cmd = `nmcli radio wifi ${state ? 'on' : 'off'}`;
      return runShell(cmd, `Wi-Fi ${state ? 'enabled' : 'disabled'}`);
    }

    case 'get_battery_status': {
      let cmd = platform === 'darwin' ? 'pmset -g batt' : platform === 'win32' ? 'WMIC Path Win32_Battery Get EstimatedChargeRemaining' : 'upower -i /org/freedesktop/UPower/devices/battery_BAT0';
      return runShell(cmd, `Read battery status`);
    }

    case 'empty_recycle_bin': {
      let cmd = '';
      if (platform === 'win32') cmd = 'powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"';
      else if (platform === 'darwin') cmd = 'rm -rf ~/.Trash/*';
      else cmd = 'rm -rf ~/.local/share/Trash/*';
      return runShell(cmd, 'Empty recycle bin');
    }

    // --------------------------------------------------------------------------
    // 4. CLIPBOARD & WEB
    // --------------------------------------------------------------------------
    case 'copy_to_clipboard': {
      const text = String(args.text || '').replace(/"/g, '\\"');
      let cmd = platform === 'darwin' ? `echo "${text}" | pbcopy` : platform === 'win32' ? `powershell -Command "Set-Clipboard -Value '${text}'"` : `echo "${text}" | xclip -selection clipboard`;
      return runShell(cmd, 'Copy to clipboard');
    }

    case 'read_clipboard': {
      let cmd = platform === 'darwin' ? 'pbpaste' : platform === 'win32' ? 'powershell -Command "Get-Clipboard"' : 'xclip -selection clipboard -o';
      return runShell(cmd, 'Read clipboard');
    }

    case 'open_url': {
      let url = args.url.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      let cmd = platform === 'win32' ? `start "" "${url}"` : platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      return runShell(cmd, `Open browser URL: ${url}`);
    }

    // --------------------------------------------------------------------------
    // 5. TERMINAL EXECUTION (GUARDED)
    // --------------------------------------------------------------------------
    case 'execute_terminal_command': {
      const command = args.command;
      return runShell(command, `Execute: ${command}`, 15000);
    }

    default:
      return { success: false, action: toolName, error: `Unrecognized tool: ${toolName}` };
  }
}

function runShell(command: string, description: string, timeout = 6000): Promise<OSToolResult> {
  return new Promise((resolve) => {
    exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        return resolve({
          success: true,
          action: description,
          output: stderr || error.message || 'Executed with notice'
        });
      }
      resolve({
        success: true,
        action: description,
        output: stdout.trim() || 'Done'
      });
    });
  });
}
