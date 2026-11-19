#!/usr/bin/env python3
"""
NEVEA AI — Universal File Engine (backend/file_engine.py)
=========================================================
Omnipotent local file reader, writer, and directory inspector supporting:
- Documents: .pdf (pypdf), .docx (python-docx), .doc / .rtf / .odt (textract)
- Spreadsheets & Data: .xlsx / .xls (openpyxl / pandas), .csv / .tsv (pandas), .json
- Web & Markup: .html / .htm (markdownify), .md, .xml, .yaml, .yml
- Code & Plain Text: .py, .ts, .tsx, .js, .jsx, .css, .sh, .bat, .txt, .log, .env
- Images: .jpg, .jpeg, .png, .webp, .gif, .bmp (Pillow metadata + EXIF + base64 preview)
- Self-Healing: Every write/overwrite backs up the existing file to Nevea_Backup/.
"""

import os
import sys
import json
import shutil
import base64
from datetime import datetime
from typing import Dict, Any, List, Optional

# Optional Universal Document & Data Parsers with Graceful Fallbacks
try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None

try:
    import openpyxl
except ImportError:
    openpyxl = None

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    from markdownify import markdownify as html_to_md
except ImportError:
    html_to_md = None

try:
    import textract
except ImportError:
    textract = None

try:
    from PIL import Image
except ImportError:
    Image = None


import tempfile
from typing import Tuple

WORKSPACE_ROOT = os.path.realpath(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
TEMP_ROOT = os.path.realpath(tempfile.gettempdir())
BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Nevea_Backup"))
BACKUP_MANIFEST = os.path.join(BACKUP_DIR, "manifest.json")

PROTECTED_SECRET_FILENAMES = {
    ".env",
    "vault.json",
    "hybrid_vault.json",
    "credentials.json",
    ".nevea_memory.json",
}
PROTECTED_SECRET_EXTENSIONS = {".key", ".pem", ".p12", ".pfx"}


def _is_protected_secret_path(abs_path: str, operation: str = "read") -> bool:
    base = os.path.basename(abs_path).lower()
    norm_rel = abs_path.replace("\\", "/").lower()
    if base == ".env.example" and operation == "read":
        return False
    if base in PROTECTED_SECRET_FILENAMES or base.startswith(".env"):
        return True
    ext = os.path.splitext(base)[1].lower()
    if ext in PROTECTED_SECRET_EXTENSIONS:
        return True
    if "/.ssh/" in norm_rel or norm_rel.endswith("/.ssh") or "id_rsa" in base or "id_ed25519" in base:
        return True
    return False


def _is_within_allowed_roots(candidate_real: str) -> bool:
    for root in (WORKSPACE_ROOT, TEMP_ROOT):
        if candidate_real == root or candidate_real.startswith(root + os.sep):
            return True
    return False


def _validate_safe_path(file_path: str, operation: str = "read") -> Tuple[bool, str, str]:
    raw = str(file_path or "").strip()
    if not raw:
        return False, "", "file_path is required"
    if "\x00" in raw:
        return False, "", "Security Policy: Null byte in file path is forbidden"

    expanded = os.path.expanduser(os.path.expandvars(raw))
    if not os.path.isabs(expanded):
        abs_path = os.path.abspath(os.path.join(WORKSPACE_ROOT, expanded))
    else:
        abs_path = os.path.abspath(expanded)

    real_target = os.path.realpath(abs_path)
    if not _is_within_allowed_roots(real_target):
        return (
            False,
            abs_path,
            f"Security Policy Blocked: Path traversal outside workspace root is forbidden ({raw})",
        )

    if _is_protected_secret_path(abs_path, operation=operation) or _is_protected_secret_path(real_target, operation=operation):
        return (
            False,
            abs_path,
            f"Security Policy Blocked: Access to protected credential/secret file is forbidden ({os.path.basename(abs_path)})",
        )

    return True, abs_path, ""


def _resolve_path(file_path: str) -> str:
    raw = str(file_path or "").strip()
    if not raw:
        return ""
    expanded = os.path.expanduser(os.path.expandvars(raw))
    if not os.path.isabs(expanded):
        return os.path.abspath(os.path.join(WORKSPACE_ROOT, expanded))
    return os.path.abspath(expanded)


def _backup_before_write(abs_path: str, operation: str = "write_to_any_file") -> Optional[Dict[str, Any]]:
    """Snapshots an existing file into Nevea_Backup/ prior to modifying or overwriting it."""
    if not abs_path or not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        return None
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        backup_name = f"{stamp}__{os.path.basename(abs_path)}"
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        shutil.copy2(abs_path, backup_path)

        manifest: List[Dict[str, Any]] = []
        if os.path.exists(BACKUP_MANIFEST):
            try:
                with open(BACKUP_MANIFEST, "r", encoding="utf-8") as mf:
                    manifest = json.load(mf)
            except Exception:
                manifest = []

        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "operation": operation,
            "original_path": abs_path,
            "backup_path": backup_path,
        }
        manifest.append(entry)
        with open(BACKUP_MANIFEST, "w", encoding="utf-8") as mf:
            json.dump(manifest[-100:], mf, indent=2)
        return entry
    except Exception:
        return None


def read_any_file(file_path: str) -> Dict[str, Any]:
    """
    Detects the file extension (.pdf, .docx, .xlsx, .csv, .html, .py, .txt, .jpg, etc.)
    and extracts structured text, tables, or image metadata.
    Enforces workspace boundary and credential-file protection.
    """
    allowed, abs_path, err_msg = _validate_safe_path(file_path, operation="read")
    if not allowed:
        return {"status": "error", "success": False, "blocked": True, "path": abs_path, "error": err_msg, "message": err_msg}

    if not os.path.exists(abs_path):
        return {"status": "error", "success": False, "path": abs_path, "message": f"File not found: {abs_path}"}

    if os.path.isdir(abs_path):
        return list_directory_contents(abs_path)

    ext = os.path.splitext(abs_path)[1].lower()
    size_bytes = os.path.getsize(abs_path)

    try:
        # 1. PDF Documents (.pdf) via pypdf or textract
        if ext == ".pdf":
            if pypdf is not None:
                reader = pypdf.PdfReader(abs_path)
                pages_text = []
                for idx, page in enumerate(reader.pages):
                    pages_text.append(f"--- Page {idx + 1} ---\n{page.extract_text() or ''}")
                full_text = "\n\n".join(pages_text).strip()
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "pypdf",
                    "pages": len(reader.pages),
                    "size_bytes": size_bytes,
                    "content": full_text[:100000],
                    "message": f"Extracted {len(reader.pages)} pages from PDF {os.path.basename(abs_path)}",
                }
            if textract is not None:
                raw = textract.process(abs_path).decode("utf-8", errors="replace")
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "textract",
                    "size_bytes": size_bytes,
                    "content": raw[:100000],
                }

        # 2. Word Documents (.docx) via python-docx or textract
        if ext == ".docx":
            if docx is not None:
                document = docx.Document(abs_path)
                paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
                tables_data = []
                for table in document.tables:
                    for row in table.rows:
                        tables_data.append(" | ".join(cell.text.strip() for cell in row.cells))
                combined = "\n".join(paragraphs)
                if tables_data:
                    combined += "\n\n--- Tables ---\n" + "\n".join(tables_data)
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "python-docx",
                    "paragraphs": len(paragraphs),
                    "size_bytes": size_bytes,
                    "content": combined[:100000],
                    "message": f"Extracted {len(paragraphs)} paragraphs from DOCX {os.path.basename(abs_path)}",
                }
            if textract is not None:
                raw = textract.process(abs_path).decode("utf-8", errors="replace")
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "textract",
                    "content": raw[:100000],
                }

        # 3. Excel & Spreadsheets (.xlsx, .xls, .csv, .tsv) via pandas / openpyxl
        if ext in (".xlsx", ".xls", ".csv", ".tsv"):
            if pd is not None:
                if ext == ".csv":
                    df = pd.read_csv(abs_path)
                elif ext == ".tsv":
                    df = pd.read_csv(abs_path, sep="\t")
                else:
                    df = pd.read_excel(abs_path)
                preview_text = df.head(100).to_string(index=False)
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "pandas+openpyxl",
                    "rows": int(len(df)),
                    "columns": list(map(str, df.columns)),
                    "size_bytes": size_bytes,
                    "content": preview_text[:100000],
                    "message": f"Loaded spreadsheet {os.path.basename(abs_path)} ({len(df)} rows, {len(df.columns)} columns)",
                }
            if openpyxl is not None and ext in (".xlsx", ".xls"):
                wb = openpyxl.load_workbook(abs_path, data_only=True)
                sheet_lines = []
                for name in wb.sheetnames:
                    ws = wb[name]
                    sheet_lines.append(f"=== Sheet: {name} ===")
                    for row in list(ws.iter_rows(values_only=True))[:100]:
                        sheet_lines.append("\t".join("" if v is None else str(v) for v in row))
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "openpyxl",
                    "sheets": wb.sheetnames,
                    "content": "\n".join(sheet_lines)[:100000],
                }

        # 4. HTML files (.html, .htm) via markdownify
        if ext in (".html", ".htm"):
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                raw_html = f.read(200000)
            if html_to_md is not None:
                md_content = html_to_md(raw_html)
                return {
                    "status": "success",
                    "success": True,
                    "path": abs_path,
                    "extension": ext,
                    "engine": "markdownify",
                    "size_bytes": size_bytes,
                    "content": md_content[:100000],
                }
            return {
                "status": "success",
                "success": True,
                "path": abs_path,
                "extension": ext,
                "engine": "raw_html",
                "size_bytes": size_bytes,
                "content": raw_html[:100000],
            }

        # 5. Images (.jpg, .jpeg, .png, .webp, .gif, .bmp) via Pillow + Base64
        if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"):
            img_meta: Dict[str, Any] = {"size_bytes": size_bytes}
            if Image is not None:
                with Image.open(abs_path) as im:
                    img_meta["width"], img_meta["height"] = im.size
                    img_meta["mode"] = im.mode
                    img_meta["format"] = im.format
            with open(abs_path, "rb") as bf:
                b64_preview = base64.b64encode(bf.read(512 * 1024)).decode("ascii")
            return {
                "status": "success",
                "success": True,
                "path": abs_path,
                "extension": ext,
                "engine": "Pillow+base64",
                "metadata": img_meta,
                "base64_preview": b64_preview[:4000],
                "content": f"[Image File: {os.path.basename(abs_path)} | Metadata: {json.dumps(img_meta)}]",
                "message": f"Inspected image {os.path.basename(abs_path)} ({img_meta.get('width', '?')}x{img_meta.get('height', '?')})",
            }

        # 6. Legacy Office / Rich Text (.doc, .rtf, .odt, .eml, .pptx) via textract
        if ext in (".doc", ".rtf", ".odt", ".eml", ".pptx") and textract is not None:
            raw = textract.process(abs_path).decode("utf-8", errors="replace")
            return {
                "status": "success",
                "success": True,
                "path": abs_path,
                "extension": ext,
                "engine": "textract",
                "size_bytes": size_bytes,
                "content": raw[:100000],
            }

        # 7. Default Universal UTF-8 Code / Text Reader (.py, .ts, .tsx, .js, .json, .md, .txt, etc.)
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            text_content = f.read(150000)

        return {
            "status": "success",
            "success": True,
            "path": abs_path,
            "extension": ext or ".txt",
            "engine": "utf8_universal_reader",
            "size_bytes": size_bytes,
            "lines": len(text_content.splitlines()),
            "content": text_content,
            "message": f"Read {len(text_content)} chars from {os.path.basename(abs_path)}",
        }
    except Exception as exc:
        return {
            "status": "error",
            "success": False,
            "path": abs_path,
            "extension": ext,
            "message": f"Universal File Engine read error: {str(exc)}",
        }


def write_to_any_file(file_path: str, content: Any, mode: str = "w") -> Dict[str, Any]:
    """
    Writes or appends content to any file type (.docx, .xlsx, .csv, .json, .md, .py, .txt, etc.)
    with automatic self-healing backup into Nevea_Backup/ and strict path/secret validation.
    """
    allowed, abs_path, err_msg = _validate_safe_path(file_path, operation="write")
    if not allowed:
        return {"status": "error", "success": False, "blocked": True, "path": abs_path, "error": err_msg, "message": err_msg}

    ext = os.path.splitext(abs_path)[1].lower()
    backup_entry = _backup_before_write(abs_path, operation="write_to_any_file")
    parent_dir = os.path.dirname(abs_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)

    write_mode = "a" if str(mode).lower() in ("a", "append") else "w"
    text_str = content if isinstance(content, str) else json.dumps(content, indent=2)

    try:
        # 1. Word Document (.docx)
        if ext == ".docx" and docx is not None:
            doc = docx.Document(abs_path) if (write_mode == "a" and os.path.exists(abs_path)) else docx.Document()
            for para in text_str.splitlines():
                doc.add_paragraph(para)
            doc.save(abs_path)
            return {
                "status": "success",
                "success": True,
                "path": abs_path,
                "extension": ext,
                "engine": "python-docx",
                "backup": backup_entry,
                "message": f"Saved DOCX document to {abs_path}",
            }

        # 2. Excel Workbook (.xlsx)
        if ext == ".xlsx" and openpyxl is not None:
            wb = openpyxl.load_workbook(abs_path) if (write_mode == "a" and os.path.exists(abs_path)) else openpyxl.Workbook()
            ws = wb.active
            for line in text_str.splitlines():
                row_cells = [c.strip() for c in (line.split("\t") if "\t" in line else line.split(","))]
                ws.append(row_cells)
            wb.save(abs_path)
            return {
                "status": "success",
                "success": True,
                "path": abs_path,
                "extension": ext,
                "engine": "openpyxl",
                "backup": backup_entry,
                "message": f"Saved XLSX workbook to {abs_path}",
            }

        # 3. Default Universal Text / Code / Markdown / JSON / CSV Writer
        with open(abs_path, write_mode, encoding="utf-8") as f:
            f.write(text_str)

        return {
            "status": "success",
            "success": True,
            "path": abs_path,
            "extension": ext or ".txt",
            "mode": write_mode,
            "bytes_written": len(text_str.encode("utf-8")),
            "lines_written": len(text_str.splitlines()),
            "backup": backup_entry,
            "message": f"Successfully {'appended to' if write_mode == 'a' else 'wrote'} {os.path.basename(abs_path)} ({len(text_str)} chars)",
        }
    except Exception as exc:
        return {
            "status": "error",
            "success": False,
            "path": abs_path,
            "message": f"Universal File Engine write error: {str(exc)}",
        }


def list_directory_contents(path: str = ".") -> Dict[str, Any]:
    """Lists files and subdirectories in a given directory with metadata and workspace boundary checks."""
    allowed, abs_path, err_msg = _validate_safe_path(path or ".", operation="list")
    if not allowed:
        return {"status": "error", "success": False, "blocked": True, "path": abs_path, "error": err_msg, "message": err_msg}

    if not os.path.exists(abs_path):
        return {"status": "error", "success": False, "path": abs_path, "message": f"Directory not found: {abs_path}"}

    if not os.path.isdir(abs_path):
        return read_any_file(abs_path)

    try:
        items = []
        for entry in sorted(os.scandir(abs_path), key=lambda e: (not e.is_dir(), e.name.lower())):
            if entry.name in ("node_modules", ".git", "__pycache__", ".cache"):
                continue
            if _is_protected_secret_path(entry.path, operation="read"):
                continue
            stat_info = entry.stat(follow_symlinks=False)
            items.append({
                "name": entry.name,
                "path": entry.path,
                "type": "directory" if entry.is_dir() else "file",
                "extension": os.path.splitext(entry.name)[1].lower() if entry.is_file() else "",
                "size_bytes": stat_info.st_size if entry.is_file() else 0,
                "modified": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            })
            if len(items) >= 200:
                break

        return {
            "status": "success",
            "success": True,
            "path": abs_path,
            "count": len(items),
            "items": items,
            "message": f"Listed {len(items)} items in {abs_path}",
        }
    except Exception as exc:
        return {
            "status": "error",
            "success": False,
            "path": abs_path,
            "message": f"Failed to list directory {abs_path}: {str(exc)}",
        }


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "list"
    target = sys.argv[2] if len(sys.argv) > 2 else "."
    if action == "read":
        print(json.dumps(read_any_file(target), indent=2))
    elif action == "write":
        body = sys.argv[3] if len(sys.argv) > 3 else ""
        mode_arg = sys.argv[4] if len(sys.argv) > 4 else "w"
        print(json.dumps(write_to_any_file(target, body, mode=mode_arg), indent=2))
    else:
        print(json.dumps(list_directory_contents(target), indent=2))
