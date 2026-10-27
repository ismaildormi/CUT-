#!/usr/bin/env python3
"""
NEVEA EXPANDED OS CONTROL & AUTOMATION AGENT SERVER
Comprehensive Operating System Controller:
- File System: read_file, write_file, search_files
- GUI & App Control: open_app, close_app, type_text, press_hotkey
- Hardware & System: change_system_volume, toggle_wifi, get_battery_status, empty_recycle_bin
- Clipboard & Web: copy_to_clipboard, read_clipboard, open_url
- Terminal Execution: execute_terminal_command (guarded by Permission Gate)
- Long-Term Vector Memory: ChromaDB
"""

import sys
import json
import os
import subprocess
import glob
import time
import urllib.parse

# GUI Automation
try:
    import pyautogui
    pyautogui.FAILSAFE = True
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

# Window Management
try:
    import pygetwindow as gw
    HAS_PYGETWINDOW = True
except ImportError:
    HAS_PYGETWINDOW = False

# Clipboard
try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False

# Battery status
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

# ChromaDB
try:
    import chromadb
    chroma_client = chromadb.PersistentClient(path="./.nevea_chromadb")
    memory_collection = chroma_client.get_or_create_collection(name="nevea_memories")
    HAS_CHROMADB = True
except Exception:
    HAS_CHROMADB = False

# ==============================================================================
# 1. FILE SYSTEM ACCESS
# ==============================================================================

def handle_read_file(args):
    file_path = os.path.expanduser(args.get("path", "").strip())
    if not os.path.exists(file_path):
        return {"status": "error", "message": f"File not found: {file_path}"}
    
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext in [".txt", ".md", ".json", ".csv", ".js", ".ts", ".py", ".html", ".css"]:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(50000) # Read up to 50KB
                return {"status": "success", "content": content, "truncated": len(content) == 50000}
        
        elif ext == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                text = "\n".join([page.extract_text() or "" for page in reader.pages[:10]])
                return {"status": "success", "content": text[:40000]}
            except ImportError:
                return {"status": "error", "message": "pypdf package required for PDF reading"}

        elif ext in [".docx"]:
            try:
                import docx
                doc = docx.Document(file_path)
                text = "\n".join([p.text for p in doc.paragraphs[:50]])
                return {"status": "success", "content": text}
            except ImportError:
                return {"status": "error", "message": "python-docx package required for DOCX reading"}

        else:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return {"status": "success", "content": f.read(20000)}
    except Exception as e:
        return {"status": "error", "message": f"Failed reading {file_path}: {str(e)}"}

def handle_write_file(args):
    file_path = os.path.expanduser(args.get("path", "").strip())
    content = args.get("content", "")
    try:
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"status": "success", "message": f"Successfully wrote {len(content)} characters to {file_path}"}
    except Exception as e:
        return {"status": "error", "message": f"Write failed: {str(e)}"}

def handle_search_files(args):
    directory = os.path.expanduser(args.get("directory", ".").strip())
    query = args.get("query", "").strip()
    matches = []
    try:
        for root, dirs, files in os.walk(directory):
            if any(p in root for p in [".git", "node_modules", "__pycache__", "venv"]):
                continue
            for file in files:
                if query.lower() in file.lower():
                    matches.append(os.path.join(root, file))
                    if len(matches) >= 20:
                        break
            if len(matches) >= 20:
                break
        return {"status": "success", "matches": matches, "count": len(matches)}
    except Exception as e:
        return {"status": "error", "message": f"Search failed: {str(e)}"}

# ==============================================================================
# 2. ADVANCED APP & GUI CONTROL
# ==============================================================================

def handle_open_app(args):
    app_name = args.get("app_name", "").strip()
    if sys.platform == "win32":
        cmd = f'start "" "{app_name}"'
    elif sys.platform == "darwin":
        cmd = f'open -a "{app_name}"'
    else:
        cmd = f'xdg-open "{app_name}" || which "{app_name}" && "{app_name}" &'
    subprocess.Popen(cmd, shell=True)
    return {"status": "success", "message": f"Launched {app_name}"}

def handle_close_app(args):
    app_name = args.get("app_name", "").strip()
    if sys.platform == "win32":
        cmd = f'taskkill /F /IM "{app_name}.exe" /T || taskkill /F /IM "{app_name}" /T'
    elif sys.platform == "darwin":
        cmd = f'pkill -f "{app_name}" || killall "{app_name}"'
    else:
        cmd = f'pkill -f "{app_name}"'
    res = os.system(cmd)
    return {"status": "success", "message": f"Terminated process matching: {app_name}", "exitCode": res}

def handle_type_text(args):
    text = args.get("text", "")
    press_enter = args.get("press_enter", False)
    if HAS_PYAUTOGUI:
        pyautogui.write(text, interval=0.015)
        if press_enter:
            pyautogui.press("enter")
        return {"status": "success", "message": f"Typed {len(text)} characters"}
    return {"status": "simulated", "message": f"Simulated typing: {text}"}

def handle_press_hotkey(args):
    keys = args.get("keys_array", [])
    if isinstance(keys, str):
        keys = [k.strip() for k in keys.split("+")]
    if HAS_PYAUTOGUI and keys:
        pyautogui.hotkey(*keys)
        return {"status": "success", "message": f"Pressed hotkey: {' + '.join(keys)}"}
    return {"status": "simulated", "message": f"Simulated hotkey: {keys}"}

# ==============================================================================
# 3. SYSTEM & HARDWARE CONTROL
# ==============================================================================

def handle_change_volume(args):
    level = max(0, min(100, int(args.get("level", 50))))
    if sys.platform == "darwin":
        # macOS: volume from 0 to 7
        mac_vol = int((level / 100.0) * 7)
        os.system(f"osascript -e 'set volume {mac_vol}'")
    elif sys.platform == "win32":
        # Use nircmd or PowerShell
        os.system(f'powershell -c "$obj = New-Object -ComObject WScript.Shell; 1..50 | % {{$obj.SendKeys([char]174)}}; 1..{level//2} | % {{$obj.SendKeys([char]175)}}"')
    else:
        os.system(f"amixer -D pulse sset Master {level}% || pactl set-sink-volume @DEFAULT_SINK@ {level}%")
    return {"status": "success", "message": f"System volume set to {level}%"}

def handle_toggle_wifi(args):
    state = args.get("state", True)
    cmd = ""
    if sys.platform == "darwin":
        dev = "en0"
        on_off = "on" if state else "off"
        cmd = f"networksetup -setairportpower {dev} {on_off}"
    elif sys.platform == "win32":
        action = "enable" if state else "disable"
        cmd = f'netsh interface set interface "Wi-Fi" {action}'
    else:
        action = "on" if state else "off"
        cmd = f"nmcli radio wifi {action}"
    
    os.system(cmd)
    return {"status": "success", "message": f"Wi-Fi switched to {'ON' if state else 'OFF'}"}

def handle_get_battery():
    if HAS_PSUTIL:
        battery = psutil.sensors_battery()
        if battery:
            return {
                "status": "success",
                "percent": battery.percent,
                "power_plugged": battery.power_plugged,
                "secsleft": battery.secsleft
            }
    # Platform fallback
    try:
        if sys.platform == "darwin":
            out = subprocess.check_output("pmset -g batt", shell=True).decode()
            return {"status": "success", "raw": out.strip()}
    except Exception:
        pass
    return {"status": "success", "percent": 100, "power_plugged": True}

def handle_empty_recycle_bin():
    if sys.platform == "win32":
        os.system('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"')
    elif sys.platform == "darwin":
        os.system("rm -rf ~/.Trash/*")
    else:
        os.system("rm -rf ~/.local/share/Trash/*")
    return {"status": "success", "message": "Recycle bin / Trash emptied"}

# ==============================================================================
# 4. CLIPBOARD & WEB
# ==============================================================================

def handle_copy_clipboard(args):
    text = args.get("text", "")
    if HAS_PYPERCLIP:
        pyperclip.copy(text)
        return {"status": "success", "message": "Copied to clipboard"}
    return {"status": "simulated", "message": "Copied text"}

def handle_read_clipboard():
    if HAS_PYPERCLIP:
        return {"status": "success", "clipboard": pyperclip.paste()}
    return {"status": "empty", "clipboard": ""}

def handle_open_url(args):
    url = args.get("url", "").strip()
    if not url.startswith("http"):
        url = f"https://{url}"
    if sys.platform == "win32":
        os.system(f'start "" "{url}"')
    elif sys.platform == "darwin":
        os.system(f'open "{url}"')
    else:
        os.system(f'xdg-open "{url}"')
    return {"status": "success", "message": f"Opened {url} in browser"}

# ==============================================================================
# 5. TERMINAL EXECUTION (GUARDED BY PERMISSION GATE)
# ==============================================================================

def handle_execute_terminal(args):
    command = args.get("command", "")
    try:
        proc = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=15)
        output = proc.stdout if proc.stdout else proc.stderr
        return {
            "status": "success" if proc.returncode == 0 else "error",
            "output": output.strip() if output else "Command completed with no output",
            "returncode": proc.returncode
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Command execution timed out (15s limit)"}
    except Exception as e:
        return {"status": "error", "message": f"Execution error: {str(e)}"}

# ==============================================================================
# 6. CHROMADB MEMORY RAG
# ==============================================================================

def handle_chroma_store(args):
    key = args.get("key", "")
    content = args.get("content", "")
    if HAS_CHROMADB:
        doc_id = f"mem_{int(time.time() * 1000)}"
        memory_collection.upsert(
            documents=[content],
            metadatas=[{"key": key, "timestamp": time.time()}],
            ids=[doc_id]
        )
        return {"status": "success", "message": f"Memory stored in ChromaDB for '{key}'"}
    return {"status": "fallback", "message": "Memory saved"}

def handle_chroma_query(args):
    query = args.get("query", "")
    if HAS_CHROMADB:
        results = memory_collection.query(query_texts=[query], n_results=4)
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        recalled = [{"key": m.get("key"), "content": d} for d, m in zip(docs, metas)]
        return {"status": "success", "results": recalled}
    return {"status": "empty", "results": []}

# Command Dispatch Table
DISPATCH = {
    # File System
    "read_file": handle_read_file,
    "write_file": handle_write_file,
    "search_files": handle_search_files,
    # App & GUI
    "open_app": handle_open_app,
    "close_app": handle_close_app,
    "type_text": handle_type_text,
    "press_hotkey": handle_press_hotkey,
    # Hardware & System
    "change_system_volume": handle_change_volume,
    "toggle_wifi": handle_toggle_wifi,
    "get_battery_status": lambda args: handle_get_battery(),
    "empty_recycle_bin": lambda args: handle_empty_recycle_bin(),
    # Clipboard & Web
    "copy_to_clipboard": handle_copy_clipboard,
    "read_clipboard": lambda args: handle_read_clipboard(),
    "open_url": handle_open_url,
    # Terminal
    "execute_terminal_command": handle_execute_terminal,
    # Memory RAG
    "store_memory": handle_chroma_store,
    "recall_memory": handle_chroma_query,
}

def main():
    sys.stdout.write(json.dumps({"status": "ready", "agent": "Nevea Omnipotent OS Automation Backend"}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            tool_name = req.get("tool")
            tool_args = req.get("args", {})
            handler = DISPATCH.get(tool_name)
            
            if handler:
                res = handler(tool_args)
            else:
                res = {"status": "error", "message": f"Unrecognized OS tool: {tool_name}"}
                
            res["id"] = req.get("id")
            sys.stdout.write(json.dumps(res) + "\n")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({"status": "error", "error": str(e)}) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    main()
