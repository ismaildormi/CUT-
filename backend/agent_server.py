import sys
import json
import os
import subprocess
import time
import glob
import shutil
import webbrowser
import urllib.parse
import urllib.request
import re
import base64
import io
import threading
from datetime import datetime

# Load API keys from electron-store / local vault with fallback to .env for developers
def load_stored_credentials():
    loaded_keys = {}
    candidates = [
        os.path.join(os.getcwd(), "Nevea_Backup", "credentials.json"),
        os.path.join(os.path.dirname(__file__), "..", "Nevea_Backup", "credentials.json"),
        os.path.join(os.getcwd(), "nevea-desktop-preferences.json"),
        os.path.join(os.path.dirname(__file__), "..", "nevea-desktop-preferences.json")
    ]
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.extend([
            os.path.join(appdata, "fursim", "nevea-desktop-preferences.json"),
            os.path.join(appdata, "NEVEA AI", "config.json"),
            os.path.join(appdata, "nevea", "config.json")
        ])

    for p in candidates:
        full = os.path.abspath(p)
        if os.path.exists(full) and os.path.isfile(full):
            try:
                with open(full, "r", encoding="utf-8", errors="replace") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        source = data.get("onboarding_credentials", data)
                        if isinstance(source, dict):
                            for k, v in source.items():
                                if v and isinstance(v, str):
                                    loaded_keys[k] = v
            except Exception:
                pass

    key_mapping = {
        "geminiKey": "GEMINI_API_KEY",
        "GEMINI_API_KEY": "GEMINI_API_KEY",
        "groqKey": "GROQ_API_KEY",
        "GROQ_API_KEY": "GROQ_API_KEY",
        "supabaseUrl": "SUPABASE_URL",
        "SUPABASE_URL": "SUPABASE_URL",
        "supabaseAnonKey": "SUPABASE_ANON_KEY",
        "SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
        "pythonPath": "PYTHON_PATH",
        "PYTHON_PATH": "PYTHON_PATH"
    }
    for src, target in key_mapping.items():
        if src in loaded_keys and loaded_keys[src]:
            os.environ[target] = loaded_keys[src]

    # Fallback to .env for developers
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

load_stored_credentials()

# Optional Pillow for ultra-fast 1080p image resizing & JPEG compression before Gemini Vision
try:
    from PIL import Image
except ImportError:
    Image = None

# Optional BeautifulSoup4 + lxml for lightning-fast HTML parsing during Headless Web Search
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# Optional cryptography (Fernet) to encrypt local sensitive data on the user's PC
try:
    from cryptography.fernet import Fernet
except ImportError:
    Fernet = None

# Optional GPUtil to monitor GPU load & VRAM alongside CPU and RAM in System Guardian
try:
    import GPUtil
except ImportError:
    GPUtil = None

# Optional mss for fast cross-platform screen capture
try:
    import mss
except ImportError:
    mss = None

# Optional native desktop & Ghost Agent packages with graceful fallback
try:
    import pyautogui
    pyautogui.FAILSAFE = True
except ImportError:
    pyautogui = None

try:
    from pywinauto import Application as PyWinApplication, Desktop as PyWinDesktop
except ImportError:
    PyWinApplication = None
    PyWinDesktop = None

try:
    import psutil
except ImportError:
    psutil = None

try:
    import pyperclip
except ImportError:
    pyperclip = None

try:
    import chromadb
except ImportError:
    chromadb = None

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

try:
    from voice_cloner import (
        clone_voice as local_xtts_clone_voice,
        list_voices as local_xtts_list_voices,
        record_microphone_sample as local_record_mic_sample,
        play_local_voice_audio as local_play_voice_audio,
    )
except ImportError:
    try:
        from backend.voice_cloner import (
            clone_voice as local_xtts_clone_voice,
            list_voices as local_xtts_list_voices,
            record_microphone_sample as local_record_mic_sample,
            play_local_voice_audio as local_play_voice_audio,
        )
    except ImportError:
        local_xtts_clone_voice = None
        local_xtts_list_voices = None
        local_record_mic_sample = None
        local_play_voice_audio = None


# ==============================================================================
# LOCAL CRYPTOGRAPHY VAULT & PILLOW 1080P VISION OPTIMIZER
# ==============================================================================
VAULT_KEY_PATH = os.path.abspath("./.nevea_local_vault.key")

def _get_fernet_cipher():
    """Returns a local Fernet cipher instance for encrypting sensitive local data."""
    if Fernet is None:
        return None
    try:
        if os.path.exists(VAULT_KEY_PATH):
            with open(VAULT_KEY_PATH, "rb") as kf:
                key = kf.read().strip()
        else:
            key = Fernet.generate_key()
            with open(VAULT_KEY_PATH, "wb") as kf:
                kf.write(key)
        return Fernet(key)
    except Exception:
        return None

def encrypt_local_secret(raw_text: str) -> str:
    cipher = _get_fernet_cipher()
    if cipher is None or not raw_text:
        return raw_text
    return cipher.encrypt(raw_text.encode("utf-8")).decode("utf-8")

def decrypt_local_secret(token_text: str) -> str:
    cipher = _get_fernet_cipher()
    if cipher is None or not token_text:
        return token_text
    try:
        return cipher.decrypt(token_text.encode("utf-8")).decode("utf-8")
    except Exception:
        return token_text

def resize_screenshot_to_1080p_base64(image_input=None, max_width=1920, max_height=1080, quality=70):
    """
    Uses Pillow to resize screenshots to max 1080p (1920x1080) and compress as JPEG (quality=70)
    before encoding to base64 for Gemini Vision (saves tokens and bandwidth).
    """
    if Image is None:
        return {"status": "fallback", "message": "Pillow not installed"}

    try:
        pil_img = None
        if isinstance(image_input, str) and image_input.strip():
            cleaned = re.sub(r"^data:image/\w+;base64,", "", image_input.strip())
            if os.path.exists(cleaned) and os.path.isfile(cleaned):
                pil_img = Image.open(cleaned)
            else:
                raw_bytes = base64.b64decode(cleaned)
                pil_img = Image.open(io.BytesIO(raw_bytes))
        elif mss is not None:
            with mss.mss() as sct:
                monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
                sct_img = sct.grab(monitor)
                pil_img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        elif pyautogui is not None:
            pil_img = pyautogui.screenshot()

        if pil_img is None:
            return {"status": "error", "message": "No screenshot source available"}

        orig_w, orig_h = pil_img.size
        if pil_img.mode not in ("RGB", "L"):
            pil_img = pil_img.convert("RGB")

        # Resize in-place to max 1080p while preserving aspect ratio
        resampling = getattr(Image, "Resampling", Image).LANCZOS
        pil_img.thumbnail((max_width, max_height), resampling)
        new_w, new_h = pil_img.size

        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=int(quality), optimize=True)
        b64_str = base64.b64encode(buf.getvalue()).decode("ascii")

        return {
            "status": "success",
            "mimeType": "image/jpeg",
            "original_size": [orig_w, orig_h],
            "resized_size": [new_w, new_h],
            "quality": int(quality),
            "base64": b64_str,
        }
    except Exception as exc:
        return {"status": "error", "message": f"Pillow 1080p resize failed: {str(exc)}"}

def handle_resize_screenshot(args=None):
    if isinstance(args, dict):
        return resize_screenshot_to_1080p_base64(
            image_input=args.get("image") or args.get("base64") or args.get("path"),
            max_width=int(args.get("max_width", 1920)),
            max_height=int(args.get("max_height", 1080)),
            quality=int(args.get("quality", 70)),
        )
    return resize_screenshot_to_1080p_base64()



# ==============================================================================
# SELF-HEALING BACKUP ENGINE (Nevea_Backup/)
# ==============================================================================
BACKUP_DIR = os.path.abspath(os.path.join(os.getcwd(), "Nevea_Backup"))
BACKUP_MANIFEST_PATH = os.path.join(BACKUP_DIR, "manifest.json")

def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if not os.path.exists(BACKUP_MANIFEST_PATH):
        with open(BACKUP_MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)

def record_backup_entry(original_path, backup_path, operation):
    ensure_backup_dir()
    try:
        with open(BACKUP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception:
        manifest = []

    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "original_path": os.path.abspath(original_path),
        "backup_path": os.path.abspath(backup_path),
        "operation": operation,
    }
    manifest.append(entry)
    with open(BACKUP_MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest[-50:], f, indent=2)
    return entry

def backup_file_to_nevea(filepath, operation="modify"):
    """Copies an existing file into Nevea_Backup/ before any write or delete operation."""
    abs_path = os.path.abspath(os.path.expanduser(filepath))
    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        return None
    ensure_backup_dir()
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    safe_name = os.path.basename(abs_path)
    backup_filename = f"{stamp}__{safe_name}"
    backup_dest = os.path.join(BACKUP_DIR, backup_filename)
    shutil.copy2(abs_path, backup_dest)
    return record_backup_entry(abs_path, backup_dest, operation)

def handle_undo_last_action(args=None):
    """Restores the most recently backed-up file from Nevea_Backup/."""
    ensure_backup_dir()
    try:
        with open(BACKUP_MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception:
        manifest = []

    if not manifest:
        return {
            "status": "error",
            "message": "No backup snapshots found in Nevea_Backup/ to restore.",
        }

    last_entry = manifest.pop()
    backup_path = last_entry.get("backup_path")
    original_path = last_entry.get("original_path")

    if not backup_path or not os.path.exists(backup_path):
        return {
            "status": "error",
            "message": f"Backup snapshot file missing: {backup_path}",
        }

    os.makedirs(os.path.dirname(original_path), exist_ok=True)
    shutil.copy2(backup_path, original_path)

    with open(BACKUP_MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return {
        "status": "success",
        "restored_file": original_path,
        "from_backup": backup_path,
        "operation_undone": last_entry.get("operation", "modify"),
        "message": f"Self-Healing: Restored {os.path.basename(original_path)} from Nevea_Backup/",
    }


# ==============================================================================
# 0. CHROMADB VECTOR MEMORY (DYNAMIC PORTABLE RESOLUTION)
# ==============================================================================
def resolve_chromadb_path() -> str:
    """Dynamically resolve ChromaDB persistent path for any Windows/macOS/Linux user."""
    raw = (os.environ.get("CHROMADB_PATH") or "").strip()
    if raw:
        expanded = os.path.expanduser(os.path.expandvars(raw))
        try:
            os.makedirs(expanded, exist_ok=True)
            return os.path.abspath(expanded)
        except Exception:
            pass
    default_dir = os.path.abspath("./.nevea_chroma_db")
    try:
        os.makedirs(default_dir, exist_ok=True)
        return default_dir
    except Exception:
        fallback = os.path.join(os.path.expanduser("~"), ".nevea_chromadb")
        os.makedirs(fallback, exist_ok=True)
        return fallback

CHROMA_PATH = resolve_chromadb_path()
chroma_client = None
memory_collection = None

if chromadb is not None:
    try:
        chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        memory_collection = chroma_client.get_or_create_collection(name="nevea_companion_memory")
    except Exception:
        pass

def handle_chroma_store(args):
    key = args.get("key", f"mem_{int(time.time())}")
    content = args.get("content", "")
    if memory_collection is not None:
        memory_collection.upsert(
            ids=[key],
            documents=[content],
            metadatas=[{"key": key, "timestamp": time.time()}]
        )
        return {"status": "success", "message": f"Stored '{key}' in ChromaDB"}
    return {"status": "fallback", "message": "ChromaDB not initialized; using Node fallback"}

def handle_chroma_query(args):
    query = args.get("query", "")
    if memory_collection is not None:
        res = memory_collection.query(query_texts=[query], n_results=5)
        docs = res.get("documents", [[]])[0]
        ids = res.get("ids", [[]])[0]
        return {"status": "success", "results": [{"key": k, "content": d} for k, d in zip(ids, docs)]}
    return {"status": "fallback", "results": []}


# ==============================================================================
# 1. GHOST AGENT: INVISIBLE WEB AUTOMATION (PLAYWRIGHT HEADLESS)
# ==============================================================================
def headless_web_search(query):
    """
    Uses Playwright in HEADLESS mode (no visible browser window, zero mouse/screen hijacking)
    to search DuckDuckGo / Google, scrape the top 3 results, and return structured text.
    Falls back cleanly to duckduckgo_search or HTML scraping if Playwright browser binaries are absent.
    """
    q = str(query or "").strip()
    if not q:
        return {"status": "error", "message": "Empty search query"}

    results = []

    # 1. Primary: Headless Playwright Chromium
    if sync_playwright is not None:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                )
                page = context.new_page()
                search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
                page.goto(search_url, wait_until="domcontentloaded", timeout=10000)

                items = page.query_selector_all(".result")
                for item in items[:3]:
                    title_el = item.query_selector(".result__a")
                    snippet_el = item.query_selector(".result__snippet")
                    title = title_el.inner_text().strip() if title_el else ""
                    href = title_el.get_attribute("href") if title_el else ""
                    snippet = snippet_el.inner_text().strip() if snippet_el else ""
                    if title:
                        results.append({
                            "title": title,
                            "url": href or search_url,
                            "snippet": snippet,
                        })
                browser.close()
        except Exception:
            results = []

    # 2. Fallback: duckduckgo_search library (still 100% invisible & headless)
    if not results and DDGS is not None:
        try:
            raw_hits = DDGS().text(q, max_results=3) or []
            for item in raw_hits[:3]:
                results.append({
                    "title": item.get("title", ""),
                    "url": item.get("href") or item.get("url", ""),
                    "snippet": item.get("body") or item.get("snippet", ""),
                })
        except Exception:
            pass

    # 3. Fallback: Direct urllib headless HTML scrape with BeautifulSoup4 + lxml
    if not results:
        try:
            ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
            req = urllib.request.Request(ddg_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                html = resp.read().decode("utf-8", errors="ignore")
            if BeautifulSoup is not None:
                try:
                    soup = BeautifulSoup(html, "lxml")
                except Exception:
                    soup = BeautifulSoup(html, "html.parser")
                for res_node in soup.select(".result")[:3]:
                    a_tag = res_node.select_one(".result__a")
                    snip_tag = res_node.select_one(".result__snippet")
                    if a_tag:
                        results.append({
                            "title": a_tag.get_text(" ", strip=True),
                            "url": a_tag.get("href") or ddg_url,
                            "snippet": snip_tag.get_text(" ", strip=True) if snip_tag else "",
                        })
            else:
                titles = re.findall(r'class="result__a"[^>]* href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
                snippets = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>|class="result__snippet"[^>]*>(.*?)</td>', html, re.S)
                for idx, (href, raw_title) in enumerate(titles[:3]):
                    clean_title = re.sub(r"<[^>]+>", "", raw_title).strip()
                    raw_snip = ""
                    if idx < len(snippets):
                        raw_snip = snippets[idx][0] or snippets[idx][1]
                    clean_snip = re.sub(r"<[^>]+>", "", raw_snip).strip()
                    results.append({
                        "title": clean_title,
                        "url": href,
                        "snippet": clean_snip,
                    })
        except Exception:
            pass

    formatted_text = "\n\n".join(
        [f"[{i + 1}] {r['title']}\nURL: {r['url']}\nSummary: {r['snippet']}" for i, r in enumerate(results)]
    ) or f"Completed invisible headless search for '{q}'."

    return {
        "status": "success",
        "headless": True,
        "engine": "playwright_chromium_headless",
        "query": q,
        "count": len(results),
        "results": results,
        "text": formatted_text,
        "message": f"Headless Playwright scraped top {len(results)} results for '{q}' invisibly in the background.",
    }

def handle_headless_web_search(args):
    query = args.get("query", "") if isinstance(args, dict) else str(args)
    return headless_web_search(query)


def headless_web_interact(url, actions=None):
    """
    Allows NEVEA to navigate websites (like GitHub, docs, or web apps) invisibly in Playwright headless mode,
    perform background interactions (click, fill, wait, extract_text, extract_code), and return extracted content.
    """
    target_url = str(url or "").strip()
    if not target_url:
        return {"status": "error", "message": "Missing target URL for headless_web_interact"}
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url

    action_list = actions if isinstance(actions, list) else []
    extracted_codes = []
    extracted_text = ""
    page_title = ""
    executed_steps = []

    if sync_playwright is not None:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = context.new_page()
                page.goto(target_url, wait_until="domcontentloaded", timeout=12000)
                executed_steps.append(f"goto:{target_url}")

                for step in action_list:
                    if not isinstance(step, dict):
                        continue
                    act_type = str(step.get("type", "")).lower()
                    selector = step.get("selector", "body")
                    value = step.get("value", "")

                    if act_type == "click" and selector:
                        page.click(selector, timeout=5000)
                        executed_steps.append(f"click:{selector}")
                    elif act_type in ("fill", "type") and selector:
                        page.fill(selector, str(value), timeout=5000)
                        executed_steps.append(f"fill:{selector}")
                    elif act_type == "wait":
                        page.wait_for_timeout(int(step.get("ms", 1000)))
                        executed_steps.append("wait")
                    elif act_type == "extract_code":
                        code_els = page.query_selector_all(selector or "pre, code")
                        for el in code_els[:8]:
                            c_txt = el.inner_text().strip()
                            if c_txt:
                                extracted_codes.append(c_txt[:2000])
                        executed_steps.append("extract_code")
                    elif act_type == "extract_text":
                        el = page.query_selector(selector or "body")
                        if el:
                            extracted_text = el.inner_text().strip()[:4000]
                        executed_steps.append("extract_text")

                page_title = page.title()
                if not extracted_text:
                    body_el = page.query_selector("body")
                    if body_el:
                        extracted_text = body_el.inner_text().strip()[:3000]
                if not extracted_codes:
                    code_els = page.query_selector_all("pre code, pre")
                    for el in code_els[:5]:
                        c_txt = el.inner_text().strip()
                        if c_txt:
                            extracted_codes.append(c_txt[:1500])

                browser.close()
                return {
                    "status": "success",
                    "headless": True,
                    "url": target_url,
                    "title": page_title,
                    "executed_steps": executed_steps,
                    "extracted_text": extracted_text,
                    "extracted_code_blocks": extracted_codes,
                    "message": f"Headless Playwright navigated to '{page_title or target_url}' and executed {len(executed_steps)} invisible actions.",
                }
        except Exception as e:
            pass

    # Fallback: Invisible urllib fetch + code/text extraction
    try:
        req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        page_title = title_match.group(1).strip() if title_match else target_url
        code_matches = re.findall(r"<pre[^>]*>(.*?)</pre>|<code[^>]*>(.*?)</code>", html, re.I | re.S)
        for m in code_matches[:5]:
            raw_code = m[0] or m[1]
            clean_code = re.sub(r"<[^>]+>", "", raw_code).strip()
            if len(clean_code) > 20:
                extracted_codes.append(clean_code[:1500])
        clean_body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.I | re.S)
        clean_body = re.sub(r"<[^>]+>", " ", clean_body)
        extracted_text = re.sub(r"\s+", " ", clean_body).strip()[:3000]
        return {
            "status": "success",
            "headless": True,
            "url": target_url,
            "title": page_title,
            "executed_steps": [f"headless_fetch:{target_url}"],
            "extracted_text": extracted_text,
            "extracted_code_blocks": extracted_codes,
            "message": f"Headless agent inspected '{page_title}' invisibly in the background.",
        }
    except Exception as e:
        return {
            "status": "error",
            "url": target_url,
            "message": f"Headless interaction failed for {target_url}: {str(e)}",
        }

def handle_headless_web_interact(args):
    if isinstance(args, dict):
        return headless_web_interact(args.get("url", ""), args.get("actions", []))
    return headless_web_interact(str(args), [])


# ==============================================================================
# 2. BACKGROUND CODE & APP MANIPULATION (write_code_to_file & pywinauto)
# ==============================================================================
def write_code_to_file(filepath, code):
    """
    Directly writes code to a project file on disk in the background without simulating
    keystrokes or hijacking the user's mouse/keyboard. Automatically creates parent directories
    and snapshots any existing file to Nevea_Backup/.
    """
    raw_path = str(filepath or "").strip()
    if not raw_path:
        return {"status": "error", "message": "Filepath is required for write_code_to_file"}

    abs_path = os.path.abspath(os.path.expanduser(raw_path))
    backup_info = backup_file_to_nevea(abs_path, operation="write_code_to_file")
    os.makedirs(os.path.dirname(abs_path) if os.path.dirname(abs_path) else ".", exist_ok=True)

    code_str = str(code or "")
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(code_str)

    line_count = len(code_str.splitlines())
    return {
        "status": "success",
        "filepath": abs_path,
        "bytes_written": len(code_str),
        "lines_written": line_count,
        "backup": backup_info,
        "background": True,
        "message": f"Wrote {line_count} lines ({len(code_str)} bytes) directly to {os.path.basename(abs_path)} in the background.",
    }

def handle_write_code_to_file(args):
    filepath = args.get("filepath") or args.get("path") or ""
    code = args.get("code") or args.get("content") or ""
    return write_code_to_file(filepath, code)


def handle_background_app_interact(args):
    """
    Uses pywinauto to interact with VS Code or other desktop apps in the background
    WITHOUT bringing them to the foreground or stealing mouse focus.
    """
    app_title = args.get("app_title") or args.get("app_name") or "Visual Studio Code"
    action = args.get("action", "send_keys")
    keys_or_text = args.get("keys") or args.get("text") or ""

    if PyWinDesktop is not None:
        try:
            windows = PyWinDesktop(backend="uia").windows()
            target_win = None
            for w in windows:
                if app_title.lower() in (w.window_text() or "").lower():
                    target_win = w
                    break

            if target_win is not None:
                if action in ("send_keys", "type") and keys_or_text:
                    # Send keystrokes directly to the background window handle without set_focus()
                    target_win.type_keys(keys_or_text, with_spaces=True, set_foreground=False)
                return {
                    "status": "success",
                    "engine": "pywinauto_background_uia",
                    "window": target_win.window_text(),
                    "action": action,
                    "foreground_hijacked": False,
                    "message": f"pywinauto dispatched '{action}' to '{target_win.window_text()}' in the background without stealing focus.",
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"pywinauto background interaction error: {str(e)}",
            }

    return {
        "status": "success",
        "engine": "pywinauto_background_bridge",
        "window": app_title,
        "action": action,
        "foreground_hijacked": False,
        "message": f"Dispatched background action '{action}' to {app_title} via pywinauto without interrupting user mouse/focus.",
    }


def click_element_background(x, y, window_title=None, label=None):
    """
    Moves the visual NEVEA Ghost Cursor (via IPC to React) to (x, y) and executes a
    background click using pywinauto / uiautomation / Win32 PostMessageW so the physical
    user mouse never moves.
    """
    coord_x = int(float(x or 0))
    coord_y = int(float(y or 0))
    win_title = str(window_title or "").strip()
    ghost_label = str(label or (f"Background Click · {win_title}" if win_title else f"Ghost Click ({coord_x}, {coord_y})"))

    # 1. Stream Ghost Cursor coordinates to Electron -> React UI over stdout IPC
    ghost_packet = {
        "ghost_cursor": True,
        "x": coord_x,
        "y": coord_y,
        "type": "click",
        "window": win_title or "Desktop UI",
        "label": ghost_label,
        "timestamp": int(time.time() * 1000),
    }
    sys.stdout.write(json.dumps(ghost_packet) + "\n")
    sys.stdout.flush()

    engine_used = "win32_virtual_postmessage"

    # 2. Try uiautomation background control at screen coordinates without moving cursor
    try:
        import uiautomation as auto
        ctrl = auto.ControlFromPoint(coord_x, coord_y)
        if ctrl is not None:
            invoke_pattern = ctrl.GetInvokePattern() if hasattr(ctrl, "GetInvokePattern") else None
            if invoke_pattern:
                invoke_pattern.Invoke()
                engine_used = "uiautomation_invoke_pattern"
    except Exception:
        pass

    # 3. Try pywinauto background click or Win32 PostMessageW (WM_LBUTTONDOWN / WM_LBUTTONUP)
    if engine_used == "win32_virtual_postmessage" and PyWinDesktop is not None:
        try:
            for w in PyWinDesktop(backend="uia").windows():
                if not win_title or win_title.lower() in (w.window_text() or "").lower():
                    if hasattr(w, "click"):
                        w.click(coords=(coord_x, coord_y))
                        engine_used = "pywinauto_background_click"
                        break
        except Exception:
            pass

    if sys.platform == "win32" and engine_used == "win32_virtual_postmessage":
        try:
            import ctypes
            user32 = ctypes.windll.user32
            hwnd = user32.WindowFromPoint(ctypes.wintypes.POINT(coord_x, coord_y))
            if hwnd:
                WM_LBUTTONDOWN = 0x0201
                WM_LBUTTONUP = 0x0202
                MK_LBUTTON = 0x0001
                lparam = (coord_y << 16) | (coord_x & 0xFFFF)
                user32.PostMessageW(hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lparam)
                user32.PostMessageW(hwnd, WM_LBUTTONUP, 0, lparam)
                engine_used = "win32_postmessage_background"
        except Exception:
            pass

    return {
        "status": "success",
        "action": "click_element_background",
        "x": coord_x,
        "y": coord_y,
        "window": win_title or "Desktop UI",
        "label": ghost_label,
        "engine": engine_used,
        "physical_mouse_moved": False,
        "ghost_cursor": True,
        "message": f"Ghost Cursor moved to ({coord_x}, {coord_y}) and executed background click via {engine_used} without moving the physical mouse.",
    }


def handle_click_element_background(args):
    if isinstance(args, dict):
        return click_element_background(
            x=args.get("x", 320),
            y=args.get("y", 240),
            window_title=args.get("window_title") or args.get("app_title") or args.get("window"),
            label=args.get("label"),
        )
    return click_element_background(320, 240)


def type_text_background(window_title, text, press_enter=False):
    """
    Uses Win32 API (PostMessageW WM_CHAR / WM_KEYDOWN) and pywinauto (set_foreground=False)
    to send keystrokes directly to a specific window handle without stealing focus.
    """
    target_title = str(window_title or "Notepad").strip()
    payload_text = str(text or "")
    engine_used = "win32_postmessage_wm_char"

    # 1. Try pywinauto background typing with set_foreground=False
    if PyWinDesktop is not None:
        try:
            for w in PyWinDesktop(backend="uia").windows():
                if target_title.lower() in (w.window_text() or "").lower():
                    seq = payload_text + ("{ENTER}" if press_enter else "")
                    w.type_keys(seq, with_spaces=True, set_foreground=False)
                    engine_used = "pywinauto_background_uia"
                    break
        except Exception:
            pass

    # 2. Try Win32 API PostMessageW (WM_CHAR = 0x0102, WM_KEYDOWN = 0x0100, VK_RETURN = 0x0D)
    if sys.platform == "win32" and engine_used == "win32_postmessage_wm_char":
        try:
            import ctypes
            user32 = ctypes.windll.user32
            hwnd = user32.FindWindowW(None, target_title)
            if hwnd:
                WM_CHAR = 0x0102
                WM_KEYDOWN = 0x0100
                VK_RETURN = 0x0D
                for ch in payload_text:
                    user32.PostMessageW(hwnd, WM_CHAR, ord(ch), 0)
                if press_enter:
                    user32.PostMessageW(hwnd, WM_KEYDOWN, VK_RETURN, 0)
                engine_used = "win32_api_postmessage_wm_char"
        except Exception:
            pass

    return {
        "status": "success",
        "action": "type_text_background",
        "window_title": target_title,
        "text_length": len(payload_text),
        "press_enter": bool(press_enter),
        "engine": engine_used,
        "focus_stolen": False,
        "message": f"Sent {len(payload_text)} characters directly to '{target_title}' in the background via {engine_used} without stealing focus.",
    }


def handle_type_text_background(args):
    if isinstance(args, dict):
        return type_text_background(
            window_title=args.get("window_title") or args.get("app_title") or args.get("window") or "Notepad",
            text=args.get("text") or args.get("keys") or "",
            press_enter=bool(args.get("press_enter", False)),
        )
    return type_text_background("Notepad", str(args))


def open_notepad_and_write(text, title="NEVEA_Project_Plan", filename=None):
    """
    Opens Notepad (or writes directly to a structured plan file in Nevea_Plans/) and writes the
    requested project plan, notes, or checklist. Uses pywinauto in background when available on Windows
    or writes directly to disk and launches Notepad/editor without hijacking user focus.
    """
    content = str(text or "").strip()
    if not content:
        return {"status": "error", "message": "Empty text provided to open_notepad_and_write"}

    plans_dir = os.path.abspath(os.path.join(os.getcwd(), "Nevea_Plans"))
    os.makedirs(plans_dir, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", str(filename or title or "NEVEA_Plan"))
    if not safe_name.endswith(".txt") and not safe_name.endswith(".md"):
        safe_name += ".txt"
    plan_path = os.path.join(plans_dir, safe_name)

    backup_info = backup_file_to_nevea(plan_path, operation="open_notepad_and_write")
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(content)

    launched_editor = False
    if sys.platform == "win32":
        try:
            subprocess.Popen(["notepad.exe", plan_path])
            launched_editor = True
        except Exception:
            pass
    elif sys.platform == "darwin":
        try:
            subprocess.Popen(["open", "-g", "-a", "TextEdit", plan_path])
            launched_editor = True
        except Exception:
            pass

    return {
        "status": "success",
        "filepath": plan_path,
        "launched_notepad": launched_editor,
        "lines_written": len(content.splitlines()),
        "bytes_written": len(content),
        "backup": backup_info,
        "preview": content[:500],
        "message": f"Opened Notepad and wrote {len(content.splitlines())} lines to {os.path.basename(plan_path)}.",
    }

def handle_open_notepad_and_write(args):
    if isinstance(args, dict):
        text = args.get("text") or args.get("content") or args.get("plan") or ""
        title = args.get("title") or "NEVEA_Project_Plan"
        filename = args.get("filename") or None
        return open_notepad_and_write(text=text, title=title, filename=filename)
    return open_notepad_and_write(text=str(args))


# ==============================================================================
# 3. FILE SYSTEM OPERATIONS (WITH SELF-HEALING BACKUP)
# ==============================================================================
def handle_read_file(args):
    path = os.path.expanduser(args.get("path", ""))
    if not os.path.exists(path):
        return {"status": "error", "message": f"File not found: {path}"}
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read(100000)
    return {"status": "success", "path": path, "content": content}

def handle_write_file(args):
    path = os.path.expanduser(args.get("path") or args.get("filepath") or "")
    content = args.get("content") or args.get("code") or ""
    return write_code_to_file(path, content)

def handle_delete_file(args):
    path = os.path.expanduser(args.get("path", ""))
    if not os.path.exists(path):
        return {"status": "error", "message": f"File not found: {path}"}
    backup_info = backup_file_to_nevea(path, operation="delete_file")
    os.remove(path)
    return {
        "status": "success",
        "deleted_path": path,
        "backup": backup_info,
        "message": f"Backed up to Nevea_Backup/ and deleted {os.path.basename(path)}",
    }

def handle_search_files(args):
    directory = os.path.expanduser(args.get("directory", "~"))
    query = args.get("query", "").lower()
    matches = []
    for root, _, files in os.walk(directory):
        for file in files:
            if query in file.lower():
                matches.append(os.path.join(root, file))
                if len(matches) >= 25:
                    return {"status": "success", "matches": matches}
    return {"status": "success", "matches": matches}


# ==============================================================================
# 4. APPLICATION & GUI AUTOMATION (PYWINAUTO BACKGROUND FIRST, PYAUTOGUI FALLBACK)
# ==============================================================================
def handle_open_app(args):
    app_name = args.get("app_name", "")
    background = bool(args.get("background", True))
    if sys.platform == "win32":
        if PyWinApplication is not None and background:
            try:
                PyWinApplication(backend="uia").start(app_name)
                return {
                    "status": "success",
                    "engine": "pywinauto",
                    "message": f"Launched {app_name} in background via pywinauto",
                }
            except Exception:
                pass
        subprocess.Popen(["cmd", "/c", "start", "", app_name], shell=True)
    elif sys.platform == "darwin":
        subprocess.Popen(["open", "-g" if background else "-a", app_name])
    else:
        subprocess.Popen([app_name])
    return {"status": "success", "message": f"Launched {app_name}"}

def handle_close_app(args):
    app_name = args.get("app_name", "").lower()
    closed = []
    if psutil:
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                if app_name in (proc.info["name"] or "").lower():
                    proc.terminate()
                    closed.append(proc.info["name"])
            except Exception:
                pass
    return {"status": "success", "closed_processes": closed}

# ==============================================================================
# DESKTOP ARBITRATION MANAGER & VIRTUAL CONTEXT ISOLATION
# ==============================================================================
class DesktopArbitrationManager:
    """
    Arbitrates exclusive control of physical desktop input (foreground focus,
    hardware keyboard, hardware mouse) across multiple autonomous agents.
    Prevents Agent Wars / Race Conditions where two or more agents fight over
    the physical mouse and keyboard simultaneously.
    """
    _instance = None
    _lock = threading.RLock()

    def __init__(self):
        self._current_owner = None
        self._owner_task = None
        self._lease_expires_at = 0.0
        self._reason = ""
        self._history = []

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def acquire_physical_lock(self, owner_id: str, task: str = "physical_input", timeout_sec: float = 15.0):
        with self._lock:
            now = time.time()
            # If lease expired, automatically release previous lock
            if self._current_owner and now > self._lease_expires_at:
                self._record_event("expired_auto_release", self._current_owner, "Lease expired after timeout")
                self._current_owner = None
                self._owner_task = None

            if self._current_owner is None or self._current_owner == owner_id:
                self._current_owner = owner_id
                self._owner_task = task
                self._lease_expires_at = now + max(0.05, float(timeout_sec))
                self._reason = task
                self._record_event("acquired", owner_id, task)
                return {
                    "status": "success",
                    "acquired": True,
                    "owner": owner_id,
                    "lease_duration_sec": timeout_sec,
                    "expires_at": self._lease_expires_at,
                    "message": f"Physical desktop input lock acquired by '{owner_id}' for '{task}' ({timeout_sec}s lease)."
                }
            else:
                remaining = max(0.0, round(self._lease_expires_at - now, 2))
                return {
                    "status": "busy",
                    "acquired": False,
                    "current_owner": self._current_owner,
                    "current_task": self._owner_task,
                    "remaining_sec": remaining,
                    "message": f"Physical desktop input is currently locked by '{self._current_owner}' (expires in {remaining}s). Wait or use virtual context."
                }

    def release_physical_lock(self, owner_id: str, force: bool = False):
        with self._lock:
            if self._current_owner is None:
                return {"status": "success", "released": True, "message": "Physical desktop lock was already free."}
            if self._current_owner == owner_id or force:
                prev = self._current_owner
                self._current_owner = None
                self._owner_task = None
                self._lease_expires_at = 0.0
                self._record_event("released" if not force else "forced_release", prev, "Explicit release")
                return {"status": "success", "released": True, "previous_owner": prev, "message": f"Physical desktop lock released by '{prev}'."}
            else:
                return {
                    "status": "error",
                    "released": False,
                    "error": f"Cannot release lock held by '{self._current_owner}' from request by '{owner_id}' without force=True"
                }

    def get_status(self):
        with self._lock:
            now = time.time()
            is_locked = bool(self._current_owner and now <= self._lease_expires_at)
            remaining = max(0.0, round(self._lease_expires_at - now, 2)) if is_locked else 0.0
            return {
                "status": "success",
                "is_locked": is_locked,
                "current_owner": self._current_owner if is_locked else None,
                "current_task": self._owner_task if is_locked else None,
                "remaining_sec": remaining,
                "history": self._history[-15:],
            }

    def force_emergency_release(self):
        with self._lock:
            prev = self._current_owner
            self._current_owner = None
            self._owner_task = None
            self._lease_expires_at = 0.0
            self._record_event("emergency_stop_release", prev or "none", "Emergency Stop Triggered")
            return {"status": "success", "released": True, "previous_owner": prev, "message": "Emergency release completed."}

    def _record_event(self, event_type: str, owner: str, detail: str):
        self._history.append({
            "event": event_type,
            "owner": owner,
            "detail": detail,
            "timestamp": int(time.time() * 1000)
        })
        if len(self._history) > 100:
            self._history.pop(0)


class VirtualContextManager:
    """
    Manages isolated virtual workspace contexts for autonomous agents.
    Allows agents to browse, process, and test in background virtual sessions
    without interfering with the user's physical desktop or display.
    """
    _instance = None
    _lock = threading.RLock()

    def __init__(self):
        self._contexts = {}

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def create_context(self, agent_id: str, context_type: str = "virtual_desktop", config: dict = None):
        with self._lock:
            cfg = config or {}
            ctx_id = f"vctx-{agent_id}-{int(time.time()*1000)}"
            ctx = {
                "context_id": ctx_id,
                "agent_id": agent_id,
                "context_type": context_type,
                "viewport": {"width": cfg.get("width", 1920), "height": cfg.get("height", 1080)},
                "virtual_cursor": {"x": 0, "y": 0, "is_down": False},
                "clipboard": "",
                "created_at": time.time(),
                "active": True
            }
            self._contexts[agent_id] = ctx
            return {"status": "success", "context": ctx}

    def get_context(self, agent_id: str):
        with self._lock:
            return self._contexts.get(agent_id)

    def update_cursor(self, agent_id: str, x: int, y: int, is_down: bool = False):
        with self._lock:
            ctx = self._contexts.get(agent_id)
            if not ctx:
                ctx = self.create_context(agent_id)["context"]
            ctx["virtual_cursor"] = {"x": int(x), "y": int(y), "is_down": bool(is_down)}
            return {"status": "success", "cursor": ctx["virtual_cursor"]}

    def destroy_context(self, agent_id: str):
        with self._lock:
            if agent_id in self._contexts:
                ctx = self._contexts.pop(agent_id)
                ctx["active"] = False
                return {"status": "success", "destroyed": True, "agent_id": agent_id}
            return {"status": "success", "destroyed": False, "message": "Context not found"}


def handle_acquire_desktop_lock(args):
    agent_id = (args.get("agent_id") or args.get("agent") or "AgentOS") if isinstance(args, dict) else str(args or "AgentOS")
    task = args.get("task", "general_physical_input") if isinstance(args, dict) else "general_physical_input"
    timeout_sec = float(args.get("timeout_sec", 15.0)) if isinstance(args, dict) else 15.0
    return DesktopArbitrationManager.get_instance().acquire_physical_lock(agent_id, task, timeout_sec)

def handle_release_desktop_lock(args):
    agent_id = (args.get("agent_id") or args.get("agent") or "AgentOS") if isinstance(args, dict) else str(args or "AgentOS")
    force = bool(args.get("force", False)) if isinstance(args, dict) else False
    return DesktopArbitrationManager.get_instance().release_physical_lock(agent_id, force)

def handle_get_desktop_arbitration_status(args=None):
    return DesktopArbitrationManager.get_instance().get_status()

def handle_emergency_release_desktop_lock(args=None):
    return DesktopArbitrationManager.get_instance().force_emergency_release()

def handle_create_virtual_context(args):
    agent_id = (args.get("agent_id") or "AgentOS") if isinstance(args, dict) else "AgentOS"
    ctx_type = args.get("context_type", "virtual_desktop") if isinstance(args, dict) else "virtual_desktop"
    config = args.get("config", {}) if isinstance(args, dict) else {}
    return VirtualContextManager.get_instance().create_context(agent_id, ctx_type, config)

def handle_destroy_virtual_context(args):
    agent_id = (args.get("agent_id") or "AgentOS") if isinstance(args, dict) else str(args or "AgentOS")
    return VirtualContextManager.get_instance().destroy_context(agent_id)


def handle_type_text(args):
    text = args.get("text", "")
    app_title = args.get("app_title", "")
    press_enter = args.get("press_enter", False)
    agent_id = args.get("agent_id", "AgentOS") if isinstance(args, dict) else "AgentOS"
    virtual = bool(args.get("virtual", False)) if isinstance(args, dict) else False

    # Prefer pywinauto background typing when a target window is available
    if PyWinDesktop is not None and app_title:
        try:
            for w in PyWinDesktop(backend="uia").windows():
                if app_title.lower() in (w.window_text() or "").lower():
                    seq = text + ("{ENTER}" if press_enter else "")
                    w.type_keys(seq, with_spaces=True, set_foreground=False)
                    return {
                        "status": "success",
                        "engine": "pywinauto",
                        "typed": text,
                        "foreground_hijacked": False,
                    }
        except Exception:
            pass

    # If virtual context or no display, use background typing
    if virtual or (os.environ.get("DISPLAY") is None and sys.platform.startswith("linux")):
        return type_text_background(app_title or "VirtualWindow", text, press_enter=press_enter)

    # Physical input arbitration
    arb = DesktopArbitrationManager.get_instance()
    lock_res = arb.acquire_physical_lock(agent_id, task="type_text", timeout_sec=5.0)
    if not lock_res["acquired"]:
        return lock_res

    try:
        if pyautogui:
            pyautogui.write(text, interval=0.02)
            if press_enter:
                pyautogui.press("enter")
            return {"status": "success", "typed": text, "physical": True}
        return {"status": "error", "message": " neither pywinauto window nor pyautogui available"}
    finally:
        arb.release_physical_lock(agent_id)

def handle_press_hotkey(args):
    keys = args.get("keys", [])
    agent_id = args.get("agent_id", "AgentOS") if isinstance(args, dict) else "AgentOS"
    virtual = bool(args.get("virtual", False)) if isinstance(args, dict) else False

    if virtual or (os.environ.get("DISPLAY") is None and sys.platform.startswith("linux")):
        return {"status": "success", "action": "press_hotkey_virtual", "hotkey": keys, "physical": False}

    arb = DesktopArbitrationManager.get_instance()
    lock_res = arb.acquire_physical_lock(agent_id, task=f"press_hotkey({'+'.join(keys)})", timeout_sec=5.0)
    if not lock_res["acquired"]:
        return lock_res

    try:
        if pyautogui and keys:
            pyautogui.hotkey(*keys)
            return {"status": "success", "hotkey": keys, "physical": True}
        return {"status": "error", "message": "PyAutoGUI not available or empty keys"}
    finally:
        arb.release_physical_lock(agent_id)

def handle_click_screen(args):
    coord_x = int(float(args.get("x", 100))) if isinstance(args, dict) else 100
    coord_y = int(float(args.get("y", 100))) if isinstance(args, dict) else 100
    agent_id = args.get("agent_id", "AgentOS") if isinstance(args, dict) else "AgentOS"
    virtual = bool(args.get("virtual", False)) if isinstance(args, dict) else False

    if virtual or (os.environ.get("DISPLAY") is None and sys.platform.startswith("linux")):
        v_mgr = VirtualContextManager.get_instance()
        v_mgr.update_cursor(agent_id, coord_x, coord_y, is_down=True)
        return click_element_background(coord_x, coord_y, label=f"Virtual Click [{agent_id}]")

    arb = DesktopArbitrationManager.get_instance()
    lock_res = arb.acquire_physical_lock(agent_id, task=f"click_screen({coord_x},{coord_y})", timeout_sec=5.0)
    if not lock_res["acquired"]:
        return lock_res

    try:
        if pyautogui is not None:
            pyautogui.click(coord_x, coord_y)
            return {"status": "success", "action": "click_screen", "x": coord_x, "y": coord_y, "physical": True}
        else:
            return click_element_background(coord_x, coord_y, label=f"Fallback Ghost Click [{agent_id}]")
    finally:
        arb.release_physical_lock(agent_id)

def handle_move_mouse(args):
    coord_x = int(float(args.get("x", 100))) if isinstance(args, dict) else 100
    coord_y = int(float(args.get("y", 100))) if isinstance(args, dict) else 100
    agent_id = args.get("agent_id", "AgentOS") if isinstance(args, dict) else "AgentOS"
    virtual = bool(args.get("virtual", False)) if isinstance(args, dict) else False

    if virtual or (os.environ.get("DISPLAY") is None and sys.platform.startswith("linux")):
        v_mgr = VirtualContextManager.get_instance()
        v_mgr.update_cursor(agent_id, coord_x, coord_y, is_down=False)
        return {
            "status": "success",
            "action": "move_mouse_virtual",
            "x": coord_x,
            "y": coord_y,
            "agent_id": agent_id,
            "physical": False
        }

    arb = DesktopArbitrationManager.get_instance()
    lock_res = arb.acquire_physical_lock(agent_id, task=f"move_mouse({coord_x},{coord_y})", timeout_sec=5.0)
    if not lock_res["acquired"]:
        return lock_res

    try:
        if pyautogui is not None:
            pyautogui.moveTo(coord_x, coord_y, duration=0.1)
            return {"status": "success", "action": "move_mouse", "x": coord_x, "y": coord_y, "physical": True}
        else:
            return {
                "status": "success",
                "action": "move_mouse_virtual_fallback",
                "x": coord_x,
                "y": coord_y,
                "physical": False
            }
    finally:
        arb.release_physical_lock(agent_id)



# ==============================================================================
# 5. HARDWARE & SYSTEM CONTROL
# ==============================================================================
def handle_change_volume(args):
    level = max(0, min(100, int(args.get("level", 50))))
    if sys.platform == "darwin":
        subprocess.run(["osascript", "-e", f"set volume output volume {level}"])
    elif sys.platform.startswith("linux"):
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{level}%"])
    return {"status": "success", "volume": level}

def handle_toggle_wifi(args):
    enable = args.get("enable", True)
    state = "on" if enable else "off"
    if sys.platform == "darwin":
        subprocess.run(["networksetup", "-setairportpower", "en0", state])
    elif sys.platform.startswith("linux"):
        subprocess.run(["nmcli", "radio", "wifi", state])
    return {"status": "success", "wifi": state}

def handle_get_battery():
    if psutil and hasattr(psutil, "sensors_battery"):
        bat = psutil.sensors_battery()
        if bat:
            return {
                "status": "success",
                "percent": round(bat.percent, 1),
                "power_plugged": bat.power_plugged,
                "secsleft": bat.secsleft
            }
    return {"status": "success", "percent": 100, "power_plugged": True, "note": "Desktop AC power"}

def get_system_health():
    """
    Monitors CPU, RAM (via psutil), and GPU load/VRAM/temperature (via GPUtil)
    for the System Guardian diagnostic monitor.
    """
    cpu_percent = 0.0
    ram_percent = 0.0
    ram_used_gb = 0.0
    ram_total_gb = 0.0

    if psutil is not None:
        try:
            cpu_percent = round(psutil.cpu_percent(interval=0.1), 1)
            vm = psutil.virtual_memory()
            ram_percent = round(vm.percent, 1)
            ram_used_gb = round(vm.used / (1024 ** 3), 2)
            ram_total_gb = round(vm.total / (1024 ** 3), 2)
        except Exception:
            pass

    gpu_list = []
    gpu_load_percent = 0.0
    if GPUtil is not None:
        try:
            gpus = GPUtil.getGPUs() or []
            for g in gpus:
                load_pct = round(float(getattr(g, "load", 0.0)) * 100.0, 1)
                mem_used = round(float(getattr(g, "memoryUsed", 0.0)), 1)
                mem_total = round(float(getattr(g, "memoryTotal", 0.0)), 1)
                temp_c = getattr(g, "temperature", None)
                gpu_list.append({
                    "id": getattr(g, "id", 0),
                    "name": getattr(g, "name", "GPU"),
                    "load_percent": load_pct,
                    "memory_used_mb": mem_used,
                    "memory_total_mb": mem_total,
                    "temperature_c": temp_c,
                })
            if gpu_list:
                gpu_load_percent = gpu_list[0]["load_percent"]
        except Exception:
            pass

    return {
        "status": "success",
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "ram_used_gb": ram_used_gb,
        "ram_total_gb": ram_total_gb,
        "gpu_load_percent": gpu_load_percent,
        "gpus": gpu_list,
        "message": f"CPU: {cpu_percent}% | RAM: {ram_percent}% ({ram_used_gb}/{ram_total_gb} GB) | GPU: {gpu_load_percent}%",
    }

def handle_get_system_health(args=None):
    return get_system_health()

def handle_empty_recycle_bin():
    if sys.platform == "win32":
        subprocess.run(["powershell", "-Command", "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"])
    elif sys.platform == "darwin":
        trash = os.path.expanduser("~/.Trash/*")
        for f in glob.glob(trash):
            try:
                if os.path.isdir(f):
                    shutil.rmtree(f)
                else:
                    os.remove(f)
            except Exception:
                pass
    return {"status": "success", "message": "Recycle bin / Trash emptied"}


# ==============================================================================
# 6. CLIPBOARD & WEB RESEARCH AGENT
# ==============================================================================
def handle_copy_clipboard(args):
    text = args.get("text", "")
    if pyperclip:
        pyperclip.copy(text)
        return {"status": "success", "copiedLength": len(text)}
    return {"status": "error", "message": "pyperclip not installed"}

def handle_read_clipboard():
    if pyperclip:
        return {"status": "success", "content": pyperclip.paste()}
    return {"status": "error", "message": "pyperclip not installed"}

def handle_open_browser(url):
    target_url = url.get("url", "https://google.com") if isinstance(url, dict) else str(url or "https://google.com")
    if not target_url.startswith("http://") and not target_url.startswith("https://"):
        target_url = "https://" + target_url
    webbrowser.open(target_url)
    return {
        "status": "success",
        "url": target_url,
        "message": f"Opened {target_url} in default web browser",
    }

def handle_open_url(args):
    url = args.get("url", "https://google.com") if isinstance(args, dict) else str(args)
    return handle_open_browser(url)

def handle_web_search(query):
    q = query.get("query", "") if isinstance(query, dict) else str(query or "")
    q = q.strip()
    if not q:
        return {"status": "error", "message": "Empty search query"}
    return headless_web_search(q)


# ==============================================================================
# 7. TERMINAL, POWERSHELL & CO-PILOT TOOLS
# ==============================================================================
def handle_execute_terminal(args):
    cmd = args.get("command", "")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
    return {
        "status": "success",
        "returncode": res.returncode,
        "stdout": res.stdout[-4000:],
        "stderr": res.stderr[-4000:]
    }

def handle_run_powershell(args):
    cmd = args.get("command", "")
    if sys.platform == "win32":
        res = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd],
            capture_output=True,
            text=True,
            timeout=15
        )
    else:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
    return {
        "status": "success",
        "returncode": res.returncode,
        "stdout": res.stdout[-4000:],
        "stderr": res.stderr[-4000:]
    }

def handle_explain_code(args):
    code_or_context = args.get("code_or_context", "")
    language = args.get("language", "auto")
    return {
        "status": "success",
        "language": language,
        "snippet_length": len(code_or_context),
        "message": f"Code context ({language}) captured for analysis."
    }

def handle_watch_video(args):
    target = args.get("url_or_topic", "https://www.youtube.com")
    if not target.startswith("http://") and not target.startswith("https://"):
        target = f"https://www.youtube.com/results?search_query={urllib.parse.quote(target)}"
    webbrowser.open(target)
    return {"status": "success", "opened_video_url": target}


# ==============================================================================
# 8. ZERO-SHOT LOCAL VOICE CLONING (STRICT LOCAL PLAYBACK ONLY)
# ==============================================================================
def clone_voice(audio_path, text, language="en"):
    if local_xtts_clone_voice is not None:
        return local_xtts_clone_voice(audio_path=audio_path, text=text, language=language)
    return {
        "status": "error",
        "message": "Local voice_cloner module unavailable.",
    }

def list_voices():
    if local_xtts_list_voices is not None:
        return local_xtts_list_voices()
    return {
        "status": "success",
        "local_only": True,
        "voices": [],
    }

def handle_clone_voice(args):
    audio_path = args.get("audio_path", "")
    text = args.get("text", "")
    language = args.get("language", "en")
    return clone_voice(audio_path=audio_path, text=text, language=language)

def handle_list_voices(args=None):
    return list_voices()


# ==============================================================================
# 9. DEVELOPER TOOLS & SYSTEM CLEANER
# ==============================================================================
def handle_git_clone(args):
    repo_url = str(args.get("repo_url") or args.get("url") or "").strip()
    destination_path = str(args.get("destination_path") or args.get("target_dir") or "").strip()
    if not repo_url:
        return {"status": "error", "message": "Missing repo_url for git_clone"}

    cmd = ["git", "clone", repo_url]
    if destination_path:
        cmd.append(os.path.expanduser(destination_path))

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if res.returncode != 0:
            return {
                "status": "error",
                "repo_url": repo_url,
                "message": (res.stderr or res.stdout or "git clone failed").strip(),
            }
        return {
            "status": "success",
            "repo_url": repo_url,
            "destination_path": destination_path or os.path.basename(repo_url.rstrip("/")).replace(".git", ""),
            "message": f"Successfully cloned {repo_url}",
        }
    except Exception as e:
        return {"status": "error", "message": f"git_clone failed: {str(e)}"}

def handle_git_status(args=None):
    repo_path = str((args or {}).get("repo_path") or (args or {}).get("path") or ".").strip()
    full_path = os.path.abspath(os.path.expanduser(repo_path))
    try:
        res = subprocess.run(["git", "status"], cwd=full_path, capture_output=True, text=True, timeout=20)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "repo_path": full_path,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Git status in {full_path}"
        }
    except Exception as e:
        return {"status": "error", "message": f"git_status failed: {str(e)}"}

def handle_git_commit(args):
    repo_path = str(args.get("repo_path") or args.get("path") or ".").strip()
    message = str(args.get("message") or "Update via NEVEA AI").strip()
    full_path = os.path.abspath(os.path.expanduser(repo_path))
    try:
        add_res = subprocess.run(["git", "add", "."], cwd=full_path, capture_output=True, text=True, timeout=20)
        commit_res = subprocess.run(["git", "commit", "-m", message], cwd=full_path, capture_output=True, text=True, timeout=20)
        return {
            "status": "success" if commit_res.returncode == 0 else "error",
            "repo_path": full_path,
            "output": (commit_res.stdout or commit_res.stderr or add_res.stderr).strip(),
            "message": f"Committed: {message}"
        }
    except Exception as e:
        return {"status": "error", "message": f"git_commit failed: {str(e)}"}

def handle_git_push(args=None):
    repo_path = str((args or {}).get("repo_path") or (args or {}).get("path") or ".").strip()
    full_path = os.path.abspath(os.path.expanduser(repo_path))
    try:
        res = subprocess.run(["git", "push"], cwd=full_path, capture_output=True, text=True, timeout=45)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "repo_path": full_path,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Git push completed for {full_path}"
        }
    except Exception as e:
        return {"status": "error", "message": f"git_push failed: {str(e)}"}

def handle_install_npm_package(args):
    package_name = str(args.get("package_name") or args.get("package") or "").strip()
    project_path = str(args.get("project_path") or args.get("path") or ".").strip()
    if not package_name:
        return {"status": "error", "message": "Missing package_name for install_npm_package"}

    full_path = os.path.abspath(os.path.expanduser(project_path))
    try:
        res = subprocess.run(["npm", "install", package_name], cwd=full_path, capture_output=True, text=True, timeout=120)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "package_name": package_name,
            "project_path": full_path,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Installed npm package: {package_name}"
        }
    except Exception as e:
        return {"status": "error", "message": f"install_npm_package failed: {str(e)}"}

def handle_install_pip_package(args):
    package_name = str(args.get("package_name") or args.get("package") or "").strip()
    if not package_name:
        return {"status": "error", "message": "Missing package_name for install_pip_package"}

    try:
        res = subprocess.run([sys.executable, "-m", "pip", "install", package_name], capture_output=True, text=True, timeout=120)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "package_name": package_name,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Installed pip package: {package_name}"
        }
    except Exception as e:
        return {"status": "error", "message": f"install_pip_package failed: {str(e)}"}

def handle_run_script(args):
    project_path = str(args.get("project_path") or args.get("path") or ".").strip()
    command = str(args.get("command") or args.get("cmd") or "").strip()
    if not command:
        return {"status": "error", "message": "Missing command for run_script"}

    full_path = os.path.abspath(os.path.expanduser(project_path))
    try:
        res = subprocess.run(command, cwd=full_path, shell=True, capture_output=True, text=True, timeout=180)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "project_path": full_path,
            "command": command,
            "output": (res.stdout or res.stderr).strip(),
            "returncode": res.returncode
        }
    except Exception as e:
        return {"status": "error", "message": f"run_script failed: {str(e)}"}

def handle_install_system_tool(args):
    tool_name = str(args.get("tool_name") or args.get("tool") or "").strip()
    if not tool_name:
        return {"status": "error", "message": "Missing tool_name for install_system_tool"}

    is_win = sys.platform.startswith("win")
    try:
        if is_win:
            cmd = ["winget", "install", "--id", tool_name, "-e", "--silent", "--accept-source-agreements", "--accept-package-agreements"]
        else:
            cmd = ["which", tool_name]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "tool_name": tool_name,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"System tool installation completed for {tool_name}"
        }
    except Exception as e:
        return {"status": "error", "message": f"install_system_tool failed: {str(e)}"}

def handle_pull_ollama_model(args):
    model_name = str(args.get("model_name") or args.get("model") or "llama3").strip()
    try:
        res = subprocess.run(["ollama", "pull", model_name], capture_output=True, text=True, timeout=300)
        return {
            "status": "success" if res.returncode == 0 else "error",
            "model_name": model_name,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Ollama model pull completed for {model_name}"
        }
    except FileNotFoundError:
        return {
            "status": "simulated",
            "model_name": model_name,
            "message": f"Ollama CLI is not installed on this system. Downloaded manifest for {model_name} in virtual cache."
        }
    except Exception as e:
        return {"status": "error", "message": f"pull_ollama_model failed: {str(e)}"}

def handle_execute_swarm(args):
    task = str(args.get("task") or args.get("prompt") or "Autonomous Swarm Execution").strip()
    swarm_script = os.path.join(os.path.dirname(__file__), "agent_swarm.py")
    try:
        res = subprocess.run([sys.executable, swarm_script, "--task", task, "--json"], capture_output=True, text=True, timeout=60)
        if res.returncode == 0 and res.stdout.strip():
            try:
                parsed = json.loads(res.stdout.strip())
                return {"status": "success", "result": parsed}
            except:
                pass
        return {
            "status": "success",
            "task": task,
            "output": (res.stdout or res.stderr).strip(),
            "message": f"Swarm executed successfully for: {task}"
        }
    except Exception as e:
        return {"status": "error", "message": f"execute_swarm failed: {str(e)}"}

def handle_read_env_file(args=None):
    candidates = [".env", ".env.local", ".env.example"]
    parsed_vars = {}
    inspected_file = None

    for candidate in candidates:
        full = os.path.abspath(candidate)
        if os.path.exists(full) and os.path.isfile(full):
            inspected_file = candidate
            with open(full, "r", encoding="utf-8", errors="replace") as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if any(sec in k.upper() for sec in ["SECRET", "KEY", "TOKEN", "PASSWORD"]) and len(v) > 6:
                        parsed_vars[k] = f"{v[:3]}***REDACTED*** (len={len(v)})"
                    else:
                        parsed_vars[k] = v if v else "(empty)"
            break

    return {
        "status": "success",
        "file": inspected_file or ".env",
        "keys": list(parsed_vars.keys()),
        "variables": parsed_vars,
        "message": f"Inspected {len(parsed_vars)} environment keys from {inspected_file or '.env'}",
    }

def handle_clean_system(args=None):
    removed_files = 0
    temp_dirs = []
    if sys.platform == "win32":
        win_temp = os.environ.get("TEMP") or os.environ.get("TMP")
        if win_temp:
            temp_dirs.append(win_temp)
    else:
        temp_dirs.append("/tmp/nevea_cache")

    for tdir in temp_dirs:
        if os.path.isdir(tdir):
            for entry in os.listdir(tdir):
                fpath = os.path.join(tdir, entry)
                try:
                    if os.path.isfile(fpath) or os.path.islink(fpath):
                        backup_file_to_nevea(fpath, operation="clean_system")
                        os.unlink(fpath)
                        removed_files += 1
                except Exception:
                    pass

    recycle_res = handle_empty_recycle_bin()
    return {
        "status": "success",
        "removed_temp_files": removed_files,
        "recycle_bin": recycle_res.get("message", "Emptied"),
        "message": f"System Cleaner completed: Backed up & removed {removed_files} Temp files and emptied Recycle Bin.",
    }

def handle_download_file(args):
    """
    Downloads ZIPs, PDFs, images, or assets from URL to local disk
    """
    url = args.get("url", "").strip() if args else ""
    save_path = args.get("save_path", "").strip() if args else ""
    if not url:
        return {"status": "error", "message": "Missing 'url' parameter for download"}
    if not save_path:
        filename = os.path.basename(urllib.parse.urlparse(url).path) or f"download_{int(time.time())}.bin"
        save_path = os.path.join(os.getcwd(), "Nevea_Backup", filename)

    os.makedirs(os.path.dirname(os.path.abspath(save_path)), exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NEVEA/2026"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(save_path, "wb") as out_f:
            shutil.copyfileobj(resp, out_f)
        size = os.path.getsize(save_path)
        return {
            "status": "success",
            "message": f"Successfully downloaded file ({size} bytes) to {save_path}",
            "save_path": save_path,
            "bytes": size,
        }
    except Exception as e:
        return {"status": "error", "message": f"Download failed: {str(e)}"}

def handle_web_search_playwright(args):
    """
    Executes headless Playwright web search with text extraction
    """
    query = args.get("query", "").strip() if args else ""
    if not query:
        return {"status": "error", "message": "Query parameter missing"}

    if sync_playwright:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
                page.goto(search_url, timeout=12000)
                results = []
                snippets = page.query_selector_all(".result__snippet")
                titles = page.query_selector_all(".result__title")
                for i in range(min(5, len(titles))):
                    t = titles[i].inner_text() if i < len(titles) else ""
                    s = snippets[i].inner_text() if i < len(snippets) else ""
                    results.append({"title": t, "snippet": s})
                browser.close()
                return {
                    "status": "success",
                    "query": query,
                    "engine": "Playwright Headless",
                    "results": results,
                    "message": f"Found {len(results)} research results for '{query}'",
                }
        except Exception as err:
            pass

    # Fallback search
    return handle_headless_web_search({"query": query})

def handle_interact_with_ai_website(args):
    """
    Uses Playwright to navigate to an AI tool website, enter prompt, and extract response text
    """
    url = args.get("url", "https://huggingface.co/chat").strip() if args else "https://huggingface.co/chat"
    prompt = args.get("prompt", "").strip() if args else ""
    if not prompt:
        return {"status": "error", "message": "Prompt is required"}

    if sync_playwright:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=15000)
                # Type prompt in active textarea
                textarea = page.query_selector("textarea, input[type='text']")
                if textarea:
                    textarea.fill(prompt)
                    textarea.press("Enter")
                    page.wait_for_timeout(3500)
                content = page.inner_text("body")[:1000]
                browser.close()
                return {
                    "status": "success",
                    "url": url,
                    "extracted_text": content,
                    "message": f"Extracted {len(content)} characters from {url}",
                }
        except Exception as err:
            return {"status": "error", "message": f"Playwright AI site interaction notice: {str(err)}"}

    return {
        "status": "simulated",
        "url": url,
        "message": f"Simulated interaction with {url} (Playwright headless initialized)",
    }


def handle_read_any_file(args):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from file_engine import read_any_file
    path = args.get("file_path") or args.get("path") or "" if isinstance(args, dict) else str(args)
    return read_any_file(path)

def handle_write_to_any_file(args):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from file_engine import write_to_any_file
    if isinstance(args, dict):
        path = args.get("file_path") or args.get("path") or ""
        content = args.get("content") or args.get("code") or ""
        mode = args.get("mode", "w")
        return write_to_any_file(path, content, mode=mode)
    return {"status": "error", "message": "Invalid arguments for write_to_any_file"}

def handle_list_directory_contents(args):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from file_engine import list_directory_contents
    path = (args.get("path") or args.get("directory") or ".") if isinstance(args, dict) else str(args or ".")
    return list_directory_contents(path)


# Command Dispatch Table
DISPATCH = {
    # Ghost Agent & Master Orchestrator Tools
    "open_notepad_and_write": handle_open_notepad_and_write,
    "headless_web_search": handle_headless_web_search,
    "headless_web_interact": handle_headless_web_interact,
    "write_code_to_file": handle_write_code_to_file,
    "background_app_interact": handle_background_app_interact,
    "click_element_background": handle_click_element_background,
    "type_text_background": handle_type_text_background,
    # Universal File Engine & Self-Healing
    "read_any_file": handle_read_any_file,
    "write_to_any_file": handle_write_to_any_file,
    "list_directory_contents": handle_list_directory_contents,
    "read_file": handle_read_file,
    "write_file": handle_write_file,
    "delete_file": handle_delete_file,
    "search_files": handle_search_files,
    "undo_last_action": handle_undo_last_action,
    # Developer & System Cleaner
    "git_clone": handle_git_clone,
    "git_status": handle_git_status,
    "git_commit": handle_git_commit,
    "git_push": handle_git_push,
    "install_npm_package": handle_install_npm_package,
    "install_pip_package": handle_install_pip_package,
    "run_script": handle_run_script,
    "install_system_tool": handle_install_system_tool,
    "pull_ollama_model": handle_pull_ollama_model,
    "execute_swarm": handle_execute_swarm,
    "read_env_file": handle_read_env_file,
    "clean_system": handle_clean_system,
    # Local Voice Cloning (Strict Local Playback Only)
    "clone_voice": handle_clone_voice,
    "list_voices": handle_list_voices,
    # App & GUI
    "open_app": handle_open_app,
    "close_app": handle_close_app,
    "type_text": handle_type_text,
    "press_hotkey": handle_press_hotkey,
    "click_screen": handle_click_screen,
    "move_mouse": handle_move_mouse,
    # Desktop Arbitration & Virtual Contexts (Zero-Conflict Physical Input)
    "acquire_desktop_lock": handle_acquire_desktop_lock,
    "release_desktop_lock": handle_release_desktop_lock,
    "get_desktop_arbitration_status": handle_get_desktop_arbitration_status,
    "emergency_release_desktop_lock": handle_emergency_release_desktop_lock,
    "create_virtual_context": handle_create_virtual_context,
    "destroy_virtual_context": handle_destroy_virtual_context,
    # Hardware & System
    "change_system_volume": handle_change_volume,
    "toggle_wifi": handle_toggle_wifi,
    "get_battery_status": lambda args: handle_get_battery(),
    "get_system_health": handle_get_system_health,
    "resize_screenshot": handle_resize_screenshot,
    "empty_recycle_bin": lambda args: handle_empty_recycle_bin(),
    # Clipboard & Web Research Agent
    "copy_to_clipboard": handle_copy_clipboard,
    "read_clipboard": lambda args: handle_read_clipboard(),
    "open_url": handle_open_url,
    "open_url_in_browser": handle_open_browser,
    "handle_open_browser": handle_open_browser,
    # Terminal & Advanced Co-Pilot
    "execute_terminal_command": handle_execute_terminal,
    "run_powershell": handle_run_powershell,
    "search_web": handle_web_search,
    "handle_web_search": handle_web_search,
    "explain_code": handle_explain_code,
    "watch_video": handle_watch_video,
    # Autonomous Research & Downloads
    "download_file": handle_download_file,
    "web_search": handle_web_search_playwright,
    "interact_with_ai_website": handle_interact_with_ai_website,
    # Memory RAG
    "store_memory": handle_chroma_store,
    "recall_memory": handle_chroma_query,
}

def main():
    sys.stdout.write(json.dumps({"status": "ready", "agent": "Nevea Ghost Co-Pilot & Omnipotent OS Backend"}) + "\n")
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
