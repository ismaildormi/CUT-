"""
KASPI Sovereign Multi-Model Client for HEYUKA Desktop (Python Backend)
Routes Python agents, tools, search & reasoning across our live KASPI models:
- heyuka-omni (orchestration, deep reasoning, bilingual dialogue)
- heyuka-core (fast engineering, code, structured logic)
- heyuka-vision (multimodal vision, image studio, 3D)
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error


def get_kaspi_config() -> Dict[str, Any]:
    loaded: Dict[str, str] = {}
    candidates = [
        Path.cwd() / "Nevea_Backup" / "credentials.json",
        Path(__file__).resolve().parent.parent / "Nevea_Backup" / "credentials.json",
        Path.cwd() / "nevea-desktop-preferences.json",
        Path(__file__).resolve().parent.parent / "nevea-desktop-preferences.json",
    ]
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.extend([
            Path(appdata) / "fursim" / "nevea-desktop-preferences.json",
            Path(appdata) / "HEYUKA AI" / "config.json",
            Path(appdata) / "NEVEA AI" / "config.json",
        ])

    for p in candidates:
        if p.exists() and p.is_file():
            try:
                data = json.loads(p.read_text(encoding="utf-8", errors="replace"))
                if isinstance(data, dict):
                    src = data.get("onboarding_credentials", data)
                    if isinstance(src, dict):
                        for k, v in src.items():
                            if isinstance(v, str) and v.strip():
                                loaded[k] = v.strip()
            except Exception:
                pass

    api_key = (
        os.environ.get("HEYUKA_API_KEY")
        or os.environ.get("KASPI_API_KEY")
        or loaded.get("HEYUKA_API_KEY")
        or loaded.get("heyukaApiKey")
        or ""
    ).strip()

    key_id = (
        os.environ.get("HEYUKA_KEY_ID")
        or os.environ.get("KASPI_KEY_ID")
        or loaded.get("HEYUKA_KEY_ID")
        or loaded.get("heyukaKeyId")
        or ""
    ).strip()

    base_url = (
        os.environ.get("KASPI_API_BASE_URL")
        or loaded.get("KASPI_API_BASE_URL")
        or loaded.get("kaspiApiBaseUrl")
        or "https://kaspi-pos.vercel.app/api/v1"
    ).strip().rstrip("/")

    active_model = (
        os.environ.get("HEYUKA_ACTIVE_MODEL")
        or loaded.get("HEYUKA_ACTIVE_MODEL")
        or loaded.get("heyukaActiveModel")
        or "heyuka-omni"
    ).strip()

    return {
        "api_key": api_key,
        "key_id": key_id,
        "base_url": base_url,
        "active_model": active_model,
        "configured": bool(api_key),
    }


def _kaspi_headers(cfg: Dict[str, Any]) -> Dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "HEYUKA-Desktop-Python/1.0 (+https://kaspi-pos.vercel.app)",
    }
    if cfg.get("api_key"):
        headers["Authorization"] = f"Bearer {cfg['api_key']}"
    if cfg.get("key_id"):
        headers["X-API-Key-Id"] = cfg["key_id"]
    return headers


def call_kaspi_model(
    prompt: str,
    model: str = "heyuka-omni",
    system_prompt: str = "You are HEYUKA by KASPI, a sovereign multimodal AI companion.",
    image_base64: Optional[str] = None,
    max_tokens: int = 900,
    temperature: float = 0.5,
) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    if not cfg["configured"]:
        return {
            "success": False,
            "model": model,
            "error": "HEYUKA_API_KEY is not configured in credentials or .env",
        }

    chosen_model = "heyuka-vision" if (image_base64 and model == "heyuka-omni") else (model or cfg["active_model"])
    user_content: Any = prompt
    if image_base64:
        url_data = image_base64 if image_base64.startswith("data:") else f"data:image/jpeg;base64,{image_base64}"
        user_content = [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": url_data}},
        ]

    messages: List[Dict[str, Any]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_content})

    payload = json.dumps({
        "model": chosen_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{cfg['base_url']}/chat/completions",
        data=payload,
        headers=_kaspi_headers(cfg),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25.0) as resp:
            body = json.loads(resp.read().decode("utf-8", errors="replace"))
            reply = (
                body.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            ).strip()
            return {
                "success": bool(reply),
                "model": chosen_model,
                "provider": "kaspi_sovereign",
                "reply": reply,
                "raw": body,
            }
    except Exception as exc:
        return {
            "success": False,
            "model": chosen_model,
            "provider": "kaspi_sovereign",
            "error": str(exc),
        }


def kaspi_web_research(query: str) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    if not cfg["configured"]:
        return {"success": False, "error": "HEYUKA_API_KEY is not configured"}
    req = urllib.request.Request(
        f"{cfg['base_url']}/web/research",
        data=json.dumps({"query": query}).encode("utf-8"),
        headers=_kaspi_headers(cfg),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=18.0) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            return {"success": bool(data.get("ok", True)), "results": data.get("results", [])}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def kaspi_image_generate(prompt: str) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    if not cfg["configured"]:
        return {"success": False, "error": "HEYUKA_API_KEY is not configured"}
    req = urllib.request.Request(
        f"{cfg['base_url']}/images/generate",
        data=json.dumps({"prompt": prompt, "model": "heyuka-vision"}).encode("utf-8"),
        headers=_kaspi_headers(cfg),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25.0) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            url = data.get("imageUrl") or data.get("url")
            return {"success": bool(url), "image_url": url, "model": "heyuka-vision"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def kaspi_models_status() -> Dict[str, Any]:
    cfg = get_kaspi_config()
    return {
        "configured": cfg["configured"],
        "has_key_id": bool(cfg["key_id"]),
        "base_url": cfg["base_url"],
        "active_model": cfg["active_model"],
        "models": ["heyuka-omni", "heyuka-core", "heyuka-vision"],
    }
