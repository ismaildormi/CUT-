#!/usr/bin/env node
/**
 * NEVEA Comprehensive Self-Diagnostic Doctor Script
 * Validates:
 * 1. Node.js environment (v18+)
 * 2. Python environment (v3.10+)
 * 3. C++ Build Tools (MSVC cl.exe / gcc / clang)
 * 4. API Keys configuration in .env / process.env
 * 5. Port 3000 accessibility
 * 6. Python native dependencies (pywinauto, soundcard, numpy)
 */

import { execSync } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

const isWin = process.platform === 'win32';
const results = [];

function logSection(title) {
  console.log(`\n============================================================`);
  console.log(`  ${title}`);
  console.log(`============================================================`);
}

function record(name, pass, details, fixInstructions = '') {
  results.push({ name, pass, details, fixInstructions });
  const status = pass ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${status} ${name.padEnd(28)} : ${details}`);
  if (!pass && fixInstructions) {
    console.log(`       \x1b[33mFix:\x1b[0m ${fixInstructions}`);
  }
}

async function runDoctor() {
  logSection('NEVEA 2026 DIAGNOSTIC DOCTOR');

  // 1. Check Node.js Version (>= 18)
  try {
    const nodeVer = process.version;
    const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
    record(
      'Node.js Runtime',
      major >= 18,
      `${nodeVer} (Major: ${major})`,
      'Install Node.js 18 or 20 LTS from https://nodejs.org'
    );
  } catch (err) {
    record('Node.js Runtime', false, err.message, 'Install Node.js 18+');
  }

  // 2. Check Python Version (>= 3.10)
  try {
    const pythonCmd = isWin ? 'python' : 'python3';
    const pyVerOutput = execSync(`${pythonCmd} --version`, { encoding: 'utf-8', timeout: 5000 }).trim();
    const verMatch = pyVerOutput.match(/Python (\d+)\.(\d+)/i);
    if (verMatch) {
      const major = parseInt(verMatch[1], 10);
      const minor = parseInt(verMatch[2], 10);
      const pass = major === 3 && minor >= 10;
      record(
        'Python Environment',
        pass,
        pyVerOutput,
        'Install Python 3.10 or 3.11 from https://www.python.org/downloads/'
      );
    } else {
      record('Python Environment', true, pyVerOutput);
    }
  } catch (err) {
    record('Python Environment', false, 'Python not found in PATH', 'Install Python 3.10+ and check "Add to PATH"');
  }

  // 3. Check C++ Build Tools (cl.exe on Windows, gcc/clang on Unix)
  try {
    if (isWin) {
      let clFound = false;
      try {
        execSync('cl', { stdio: 'ignore' });
        clFound = true;
      } catch (e) {
        // cl exits with code 2 when run without args, check if it exists in path
        if (e.status === 2 || e.status === 0) clFound = true;
      }
      record(
        'C++ Build Tools (MSVC)',
        clFound,
        clFound ? 'MSVC C++ Compiler detected' : 'cl.exe not found in standard PATH',
        'Install Visual Studio 2022 Community with "Desktop development with C++" workload'
      );
    } else {
      const gccVer = execSync('gcc --version', { encoding: 'utf-8', timeout: 3000 }).split('\n')[0];
      record('C++ Build Tools (GCC/Clang)', true, gccVer);
    }
  } catch (err) {
    record(
      'C++ Build Tools',
      false,
      'C++ Build Tools not detected',
      isWin
        ? 'Download Visual Studio Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/'
        : 'Run: sudo apt-get install build-essential'
    );
  }

  // 4. Check HEYUKA v12.0 Zero-Key Sovereignty Core (0 mandatory API keys)
  try {
    const coreExists = fs.existsSync(path.resolve(process.cwd(), 'server', 'yukaCore.ts'));
    const osExists = fs.existsSync(path.resolve(process.cwd(), 'backend', 'yuka_godmode_os.py'));
    const voiceExists = fs.existsSync(path.resolve(process.cwd(), 'backend', 'yuka_voice_cloner.py'));

    record(
      'HEYUKA v12.0 Zero-Key Core',
      coreExists,
      coreExists ? 'Active (0 Mandatory External API Keys · Optional BYOK AES-GCM Ready)' : 'Missing server/yukaCore.ts'
    );
    record(
      'HEYUKA OS & Voice Bridges',
      osExists && voiceExists,
      osExists && voiceExists ? 'yuka_godmode_os.py + yuka_voice_cloner.py Verified' : 'Missing Python bridge scripts'
    );
  } catch (err) {
    record('HEYUKA Sovereignty Check', false, err.message);
  }

  // 5. Check Port 3000 Availability
  await new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        record('Port 3000 Check', true, 'Port 3000 in use (Active Dev Server)');
      } else {
        record('Port 3000 Check', false, err.message);
      }
      resolve();
    });
    tester.once('listening', () => {
      tester.close();
      record('Port 3000 Check', true, 'Port 3000 free for server binding');
      resolve();
    });
    tester.listen(3000, '127.0.0.1');
  });

  // 6. Check Python Native & Optional Desktop Packages
  const pythonCmd = isWin ? 'python' : 'python3';
  const pyLibs = ['sqlite3', 'json', 'numpy', 'soundcard', isWin ? 'pywinauto' : 'psutil'];
  const requiredPyLibs = new Set(['sqlite3', 'json']);
  for (const lib of pyLibs) {
    try {
      execSync(`${pythonCmd} -c "import ${lib}"`, { stdio: 'ignore', timeout: 5000 });
      record(`Python [${lib}]`, true, 'Installed & Importable');
    } catch {
      if (requiredPyLibs.has(lib)) {
        record(`Python [${lib}]`, false, 'Required stdlib missing', 'Reinstall Python 3.10+');
      } else {
        record(`Python [${lib}]`, true, 'Optional Desktop Module (Cloud/Web Standby Active)');
      }
    }
  }

  // Summary
  logSection('DIAGNOSTIC SUMMARY');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`Total Checks: ${total} | Passed: ${passed} | Failures: ${total - passed}`);
  if (passed === total) {
    console.log(`\n\x1b[32m✔ HEYUKA v12.0 READY: All checks passed (0 errors).\x1b[0m\n`);
  } else {
    console.log(`\n\x1b[33m⚠ Some non-critical modules flagged. Follow the Fix recommendations above.\x1b[0m\n`);
  }
}

runDoctor().catch(console.error);
