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
import urllib.parse


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
    system_prompt: str = "You are HEYUKA by KASPI, a sovereign multimodal AI companion with 13 Cognitive Clusters and v52-v54 PC/OS/Webcam control.",
    image_base64: Optional[str] = None,
    max_tokens: int = 900,
    temperature: float = 0.5,
) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    chosen_model = "heyuka-vision" if (image_base64 and model == "heyuka-omni") else (model or cfg["active_model"])
    root_url = cfg["base_url"][:-7] if cfg["base_url"].endswith("/api/v1") else cfg["base_url"]

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

    # Stage 1: Direct KASPI Chat Completions when API key is configured
    if cfg["configured"]:
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
                if reply:
                    return {
                        "success": True,
                        "model": chosen_model,
                        "provider": "kaspi_sovereign",
                        "unlimited": True,
                        "reply": reply,
                        "raw": body,
                    }
        except Exception:
            pass

    # Stage 2: Client Hardware Unlimited Cascade (Local Ollama -> Local Node 4040 -> Zero-Key Sovereign Local-SDK)
    ollama_host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    local_model = os.environ.get("YUKA_LOCAL_MODEL", "llama3")
    try:
        o_req = urllib.request.Request(
            f"{ollama_host}/api/chat",
            data=json.dumps({
                "model": local_model,
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}],
                "stream": False,
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(o_req, timeout=12.0) as resp:
            o_data = json.loads(resp.read().decode("utf-8", errors="replace"))
            o_reply = str((o_data.get("message") or {}).get("content") or o_data.get("response") or "").strip()
            if o_reply:
                return {
                    "success": True,
                    "model": f"{chosen_model} (local-ollama:{local_model})",
                    "provider": "heyuka_local_ollama",
                    "unlimited": True,
                    "reply": o_reply,
                }
    except Exception:
        pass

    for sdk_url in (
        "http://127.0.0.1:4040/api/v1/heyuka/local-sdk",
        f"{root_url}/api/v1/heyuka/local-sdk",
    ):
        try:
            sdk_req = urllib.request.Request(
                sdk_url,
                data=json.dumps({"prompt": prompt, "mode": "auto", "locale": "ar"}).encode("utf-8"),
                headers=_kaspi_headers(cfg),
                method="POST",
            )
            with urllib.request.urlopen(sdk_req, timeout=20.0) as resp:
                s_data = json.loads(resp.read().decode("utf-8", errors="replace"))
                s_reply = str(s_data.get("answer") or s_data.get("reply") or "").strip()
                if s_reply:
                    return {
                        "success": True,
                        "model": chosen_model,
                        "provider": s_data.get("provider") or "kaspi_zero_key_local_sdk",
                        "unlimited": True,
                        "reply": s_reply,
                        "studio_files": s_data.get("studioFiles", []),
                        "raw": s_data,
                    }
        except Exception:
            pass

    return {
        "success": False,
        "model": chosen_model,
        "provider": "kaspi_sovereign",
        "error": "All KASPI cloud/local endpoints temporarily unreachable",
    }


def _post_kaspi_endpoint(path_suffix: str, payload: Dict[str, Any], timeout: float = 20.0) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    req = urllib.request.Request(
        f"{cfg['base_url']}{path_suffix}",
        data=json.dumps(payload).encode("utf-8"),
        headers=_kaspi_headers(cfg),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            return {"success": bool(data.get("ok", True)), **data}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def kaspi_web_research(query: str) -> Dict[str, Any]:
    res = _post_kaspi_endpoint("/web/research", {"query": query}, timeout=18.0)
    if res.get("success"):
        return res
    cfg = get_kaspi_config()
    root_url = cfg["base_url"][:-7] if cfg["base_url"].endswith("/api/v1") else cfg["base_url"]
    try:
        vault_req = urllib.request.Request(
            f"{root_url}/api/v1/heyuka/local-sdk?vault=1&q={urllib.parse.quote(query)}",
            headers=_kaspi_headers(cfg),
            method="GET",
        )
        with urllib.request.urlopen(vault_req, timeout=15.0) as resp:
            v_data = json.loads(resp.read().decode("utf-8", errors="replace"))
            return {"success": True, "results": v_data.get("matches", v_data.get("vault", {}).get("sampleMatches", [])), "source": "sovereign_vault"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def kaspi_image_generate(prompt: str) -> Dict[str, Any]:
    res = _post_kaspi_endpoint("/images/generate", {"prompt": prompt, "model": "heyuka-vision"}, timeout=25.0)
    url = res.get("imageUrl") or res.get("url")
    if res.get("success") and url:
        return {"success": True, "image_url": url, "model": "heyuka-vision"}
    return res


def kaspi_spawn_desktop_bot(task: str, role: str = "researcher", display_engine: str = "kasmvnc") -> Dict[str, Any]:
    return _post_kaspi_endpoint("/desktops/spawn", {"action": "spawn", "task": task, "role": role, "displayEngine": display_engine})


def kaspi_os_exec(action: str = "shell", command: str = "", target_path: str = "") -> Dict[str, Any]:
    return _post_kaspi_endpoint("/os/exec", {"action": action, "command": command, "targetPath": target_path})


def kaspi_ai_pc_control(action: str = "dispatch", **kwargs: Any) -> Dict[str, Any]:
    return _post_kaspi_endpoint("/ai-pc/control", {"action": action, **kwargs})


def kaspi_search_vault(query: str = "", limit: int = 20) -> Dict[str, Any]:
    cfg = get_kaspi_config()
    root_url = cfg["base_url"][:-7] if cfg["base_url"].endswith("/api/v1") else cfg["base_url"]
    url = f"{root_url}/api/v1/heyuka/local-sdk?vault=1&limit={int(limit)}"
    if query.strip():
        url += f"&q={urllib.parse.quote(query.strip())}"
    try:
        req = urllib.request.Request(url, headers=_kaspi_headers(cfg), method="GET")
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
            return {"success": True, **data}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def kaspi_models_status() -> Dict[str, Any]:
    cfg = get_kaspi_config()
    return {
        "configured": cfg["configured"],
        "zero_key_ready": True,
        "unlimited_requests": True,
        "has_key_id": bool(cfg["key_id"]),
        "base_url": cfg["base_url"],
        "active_model": cfg["active_model"],
        "models": ["heyuka-omni", "heyuka-core", "heyuka-vision"],
        "cognitive_clusters": 13,
        "endpoints": [
            "/chat/completions",
            "/heyuka/local-sdk?vault=1",
            "/desktops/spawn",
            "/os/exec",
            "/ai-pc/control",
        ],
    }
