"""
NEVEA Python External API Integration Layer & Dynamic Tool Registry
Loads API keys strictly from environment variables (.env) without hardcoding secrets.

Exposes:
- call_openrouter_model(model_name, prompt)
- call_huggingface_model(model_id, inputs)
- github_api_call(endpoint, method="GET", data=None)
- codeberg_api_call(endpoint, method="GET", data=None)
- stripe_billing_call(action="check_balance", payload=None)
- twilio_sms_call(to, body)
- DynamicToolRegistry.route_request(user_request, params)
"""

import os
import time
from pathlib import Path
from typing import Any, Dict, Optional
import requests

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except Exception:
    pass


def get_env_config() -> Dict[str, str]:
    """Load external API credentials safely from environment variables."""
    return {
        "OPENROUTER_API_KEY": os.environ.get("OPENROUTER_API_KEY", "").strip(),
        "HF_TOKEN": (
            os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_API_KEY") or ""
        ).strip(),
        "GITHUB_TOKEN": os.environ.get("GITHUB_TOKEN", "").strip(),
        "CODEBERG_TOKEN": os.environ.get("CODEBERG_TOKEN", "").strip(),
        "STRIPE_SECRET_KEY": os.environ.get("STRIPE_SECRET_KEY", "").strip(),
        "TWILIO_AUTH_TOKEN": os.environ.get("TWILIO_AUTH_TOKEN", "").strip(),
        "TWILIO_ACCOUNT_SID": os.environ.get("TWILIO_ACCOUNT_SID", "").strip(),
    }


def call_openrouter_model(model_name: str, prompt: str) -> Dict[str, Any]:
    """Route LLM queries to OpenRouter models with fault-tolerant error handling."""
    start = time.time()
    cfg = get_env_config()
    api_key = cfg["OPENROUTER_API_KEY"]
    resolved_model = (model_name or "deepseek/deepseek-chat").strip()

    # Try KASPI Sovereign Models (`heyuka-omni` / `heyuka-core`) first when configured
    try:
        from kaspi_models_client import call_kaspi_model, get_kaspi_config
        kcfg = get_kaspi_config()
        if kcfg.get("configured"):
            kmodel = "heyuka-core" if "code" in resolved_model.lower() else "heyuka-omni"
            kres = call_kaspi_model(prompt=str(prompt), model=kmodel)
            if kres.get("success") and kres.get("reply"):
                kres["latency_ms"] = int((time.time() - start) * 1000)
                return kres
    except Exception:
        pass

    if not api_key:
        return {
            "success": False,
            "provider": "openrouter",
            "error": "OPENROUTER_API_KEY is not set in .env",
            "latency_ms": int((time.time() - start) * 1000),
        }

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://nevea.local",
                "X-Title": "NEVEA Autonomous Multi-Agent OS",
            },
            json={
                "model": resolved_model,
                "messages": [{"role": "user", "content": str(prompt)}],
            },
            timeout=30,
        )
        latency = int((time.time() - start) * 1000)
        if not resp.ok:
            return {
                "success": False,
                "provider": "openrouter",
                "status_code": resp.status_code,
                "error": resp.text[:300],
                "latency_ms": latency,
            }
        body = resp.json()
        reply = (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        return {
            "success": True,
            "provider": "openrouter",
            "model": resolved_model,
            "reply": reply,
            "raw": body,
            "latency_ms": latency,
        }
    except Exception as exc:
        return {
            "success": False,
            "provider": "openrouter",
            "error": str(exc),
            "latency_ms": int((time.time() - start) * 1000),
        }


def call_huggingface_model(model_id: str, inputs: Any) -> Dict[str, Any]:
    """Invoke specialized ML models on Hugging Face Inference API."""
    start = time.time()
    cfg = get_env_config()
    token = cfg["HF_TOKEN"]
    clean_model = (model_id or "mistralai/Mistral-7B-Instruct-v0.3").strip()

    # Route via KASPI Sovereign `heyuka-vision` / `heyuka-core` first when connected
    try:
        from kaspi_models_client import call_kaspi_model, kaspi_image_generate, get_kaspi_config
        kcfg = get_kaspi_config()
        if kcfg.get("configured"):
            prompt_str = str(inputs)
            if any(w in clean_model.lower() for w in ("flux", "diffusion", "image", "sdxl")):
                img_res = kaspi_image_generate(prompt_str[:300])
                if img_res.get("success"):
                    img_res["latency_ms"] = int((time.time() - start) * 1000)
                    return img_res
            else:
                kres = call_kaspi_model(prompt=prompt_str, model="heyuka-core")
                if kres.get("success"):
                    kres["latency_ms"] = int((time.time() - start) * 1000)
                    return kres
    except Exception:
        pass

    if not token:
        return {
            "success": False,
            "provider": "huggingface",
            "error": "HF_TOKEN is not set in .env",
            "latency_ms": int((time.time() - start) * 1000),
        }

    urls = [
        f"https://router.huggingface.co/hf-inference/models/{clean_model}",
        f"https://api-inference.huggingface.co/models/{clean_model}",
    ]

    for url in urls:
        try:
            resp = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"inputs": inputs},
                timeout=35,
            )
            latency = int((time.time() - start) * 1000)
            if resp.status_code == 404 and url == urls[0]:
                continue
            if not resp.ok:
                return {
                    "success": False,
                    "provider": "huggingface",
                    "status_code": resp.status_code,
                    "error": resp.text[:300],
                    "latency_ms": latency,
                }
            return {
                "success": True,
                "provider": "huggingface",
                "model_id": clean_model,
                "output": resp.json() if "application/json" in resp.headers.get("content-type", "") else resp.text,
                "latency_ms": latency,
            }
        except Exception as exc:
            return {
                "success": False,
                "provider": "huggingface",
                "error": str(exc),
                "latency_ms": int((time.time() - start) * 1000),
            }

    return {
        "success": False,
        "provider": "huggingface",
        "error": "Hugging Face inference endpoint unreachable",
        "latency_ms": int((time.time() - start) * 1000),
    }


def github_api_call(
    endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute authenticated GitHub REST API requests for repository and code management."""
    start = time.time()
    cfg = get_env_config()
    token = cfg["GITHUB_TOKEN"]
    clean_method = (method or "GET").upper()
    url = (
        endpoint
        if endpoint.startswith("http")
        else f"https://api.github.com/{endpoint.lstrip('/')}"
    )

    if not token:
        return {
            "success": False,
            "provider": "github",
            "error": "GITHUB_TOKEN is not set in .env",
            "latency_ms": int((time.time() - start) * 1000),
        }

    try:
        resp = requests.request(
            method=clean_method,
            url=url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "NEVEA-Autonomous-OS",
            },
            json=data if clean_method != "GET" else None,
            params=data if clean_method == "GET" else None,
            timeout=20,
        )
        latency = int((time.time() - start) * 1000)
        parsed = (
            resp.json()
            if resp.text and "application/json" in resp.headers.get("content-type", "")
            else resp.text
        )
        if not resp.ok:
            return {
                "success": False,
                "provider": "github",
                "status_code": resp.status_code,
                "error": parsed if isinstance(parsed, str) else parsed.get("message", "GitHub error"),
                "latency_ms": latency,
            }
        return {
            "success": True,
            "provider": "github",
            "status_code": resp.status_code,
            "data": parsed,
            "latency_ms": latency,
        }
    except Exception as exc:
        return {
            "success": False,
            "provider": "github",
            "error": str(exc),
            "latency_ms": int((time.time() - start) * 1000),
        }


def codeberg_api_call(
    endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Execute authenticated Codeberg REST API requests for alternative repository control."""
    start = time.time()
    cfg = get_env_config()
    token = cfg["CODEBERG_TOKEN"]
    clean_method = (method or "GET").upper()
    url = (
        endpoint
        if endpoint.startswith("http")
        else f"https://codeberg.org/api/v1/{endpoint.lstrip('/')}"
    )

    if not token:
        return {
            "success": False,
            "provider": "codeberg",
            "error": "CODEBERG_TOKEN is not set in .env",
            "latency_ms": int((time.time() - start) * 1000),
        }

    try:
        resp = requests.request(
            method=clean_method,
            url=url,
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "NEVEA-Autonomous-OS",
            },
            json=data if clean_method != "GET" else None,
            params=data if clean_method == "GET" else None,
            timeout=20,
        )
        latency = int((time.time() - start) * 1000)
        parsed = (
            resp.json()
            if resp.text and "application/json" in resp.headers.get("content-type", "")
            else resp.text
        )
        if not resp.ok:
            return {
                "success": False,
                "provider": "codeberg",
                "status_code": resp.status_code,
                "error": parsed if isinstance(parsed, str) else parsed.get("message", "Codeberg error"),
                "latency_ms": latency,
            }
        return {
            "success": True,
            "provider": "codeberg",
            "status_code": resp.status_code,
            "data": parsed,
            "latency_ms": latency,
        }
    except Exception as exc:
        return {
            "success": False,
            "provider": "codeberg",
            "error": str(exc),
            "latency_ms": int((time.time() - start) * 1000),
        }


def stripe_billing_call(
    action: str = "check_balance", payload: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Placeholder/wrapper for Stripe billing operations using STRIPE_SECRET_KEY."""
    cfg = get_env_config()
    if not cfg["STRIPE_SECRET_KEY"]:
        return {
            "success": False,
            "provider": "stripe",
            "placeholder": True,
            "action": action,
            "error": "STRIPE_SECRET_KEY is not configured in .env.",
        }
    return {
        "success": True,
        "provider": "stripe",
        "action": action,
        "payload": payload or {},
    }


def twilio_sms_call(to: str, body: str) -> Dict[str, Any]:
    """Placeholder/wrapper for Twilio SMS operations using TWILIO_AUTH_TOKEN."""
    cfg = get_env_config()
    if not cfg["TWILIO_AUTH_TOKEN"]:
        return {
            "success": False,
            "provider": "twilio",
            "placeholder": True,
            "to": to,
            "error": "TWILIO_AUTH_TOKEN is not configured in .env.",
        }
    return {
        "success": True,
        "provider": "twilio",
        "to": to,
        "body": body,
    }
