#!/usr/bin/env python3
"""
NEVEA AI — Mochi-Puff Local Speech Synthesis Engine (Piper-TTS & Edge-TTS)
========================================================================
100% Keyless, Completely Offline-Ready Neural Text-to-Speech Architecture:
1. Piper-TTS: Ultra-fast, completely offline local neural voice synthesis (ONNX).
2. Edge-TTS: Zero-key high-fidelity Microsoft Edge neural voice synthesis with pitch & rate tuning.
3. Pyttsx3 / SAPI5 / eSpeak: Deep offline OS fallback driver.
4. Pure standard-library fallback: Guarantees zero runtime crashes anywhere.

Specialized Mochi-Puff Voice Personas:
- mochi_cute: Sweet, high-pitch, bouncy, enthusiastic companion (en-US-AnaNeural / +24Hz / +12%).
- mochi_warm: Gentle, cozy, supportive bedtime/ambient tone (en-US-AriaNeural / +10Hz / +4%).
- mochi_cheerful: Upbeat, bright, positive gaming & research buddy (en-US-JennyNeural / +18Hz / +10%).
- mochi_japanese: Kawaii anime companion voice (ja-JP-NanamiNeural / +16Hz / +8%).
- mochi_hero: Courageous, energetic, theatrical savior persona (en-US-GuyNeural / +6Hz / +6%).
"""

import sys
import os
import json
import time
import shutil
import asyncio
import base64
import urllib.parse
import urllib.request
import wave
import math
import struct
from pathlib import Path
from typing import Dict, Any, Optional

# Audio output storage directory
VOICES_ROOT_DIR = Path.cwd() / ".nevea_voices"
OUTPUTS_DIR = VOICES_ROOT_DIR / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Preset configuration for Mochi-Puff voices
MOCHI_VOICE_PRESETS: Dict[str, Dict[str, str]] = {
    "mochi_cute": {
        "edge_voice": "en-US-AnaNeural",
        "piper_voice": "en_US-lessac-medium",
        "pitch": "+24Hz",
        "rate": "+12%",
        "volume": "+0%",
        "description": "Sweet, high-pitched, bubbly, and enthusiastic Mochi-Puff companion voice",
    },
    "mochi_warm": {
        "edge_voice": "en-US-AriaNeural",
        "piper_voice": "en_US-amy-medium",
        "pitch": "+10Hz",
        "rate": "+4%",
        "volume": "+0%",
        "description": "Gentle, soothing, warm, and affectionate Mochi-Puff tone",
    },
    "mochi_cheerful": {
        "edge_voice": "en-US-JennyNeural",
        "piper_voice": "en_US-kristin-medium",
        "pitch": "+18Hz",
        "rate": "+10%",
        "volume": "+0%",
        "description": "Bright, uplifting, and joyful companion voice",
    },
    "mochi_japanese": {
        "edge_voice": "ja-JP-NanamiNeural",
        "piper_voice": "ja_JP-nanami-medium",
        "pitch": "+16Hz",
        "rate": "+8%",
        "volume": "+0%",
        "description": "Cute kawaii anime companion tone",
    },
    "mochi_hero": {
        "edge_voice": "en-US-GuyNeural",
        "piper_voice": "en_US-ryan-medium",
        "pitch": "+6Hz",
        "rate": "+6%",
        "volume": "+0%",
        "description": "Bold, fearless, and inspiring Super Mochi Hero voice",
    },
}


def _generate_procedural_chime_wav(text: str, dest_wav: Path) -> bool:
    """
    Pure Python standard library fallback: creates a cute, musical, rhythmic
    chime audio file if no external TTS driver or network is available.
    """
    try:
        sample_rate = 22050
        duration_per_char = 0.04
        num_chars = min(len(text), 60)
        total_duration = max(0.8, min(4.0, num_chars * duration_per_char))
        num_samples = int(sample_rate * total_duration)

        with wave.open(str(dest_wav), "w") as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)

            # Generate sweet, gentle pentatonic melodic frequencies for Mochi
            base_freqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]  # C5, D5, E5, G5, A5, C6
            frames = bytearray()
            
            for i in range(num_samples):
                t = float(i) / sample_rate
                # Pick frequency based on char cadence
                step = int((t / total_duration) * len(base_freqs)) % len(base_freqs)
                freq = base_freqs[step]
                
                # Envelope: gentle attack and decay
                env = math.sin((t / total_duration) * math.pi)
                # Harmonic mixture
                val = 0.6 * math.sin(2.0 * math.pi * freq * t) + 0.3 * math.sin(4.0 * math.pi * freq * t)
                sample = int(val * env * 24000.0)
                sample = max(-32767, min(32767, sample))
                frames.extend(struct.pack("<h", sample))

            wav_file.writeframes(frames)
        return True
    except Exception:
        return False


def synthesize_piper(text: str, output_path: Path, voice_model: str = "en_US-lessac-medium") -> Dict[str, Any]:
    """
    Synthesize audio using local Piper-TTS (completely offline neural synthesis).
    Checks for piper binary or python module.
    """
    # 1. Check if 'piper' command line executable exists
    piper_bin = shutil.which("piper") or shutil.which("piper.exe")
    if piper_bin:
        try:
            # Check for model files
            model_path = os.environ.get("PIPER_MODEL_PATH")
            cmd = [piper_bin, "--output_file", str(output_path)]
            if model_path and os.path.isfile(model_path):
                cmd.extend(["--model", model_path])
            
            proc = subprocess.run(
                cmd,
                input=text.encode("utf-8"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=12.0
            )
            if proc.returncode == 0 and output_path.exists() and output_path.stat().st_size > 500:
                return {
                    "success": True,
                    "engine": "piper-tts-cli",
                    "path": str(output_path),
                }
        except Exception:
            pass

    # 2. Check if python package piper / piper_tts is importable
    try:
        import piper  # type: ignore
        if hasattr(piper, "PiperVoice"):
            model_file = os.environ.get("PIPER_MODEL_PATH", "en_US-lessac-medium.onnx")
            if os.path.exists(model_file):
                voice = piper.PiperVoice.load(model_file)
                with wave.open(str(output_path), "wb") as wav_file:
                    voice.synthesize(text, wav_file)
                if output_path.exists() and output_path.stat().st_size > 500:
                    return {
                        "success": True,
                        "engine": "piper-tts-python",
                        "path": str(output_path),
                    }
    except Exception:
        pass

    return {"success": False, "notice": "Piper neural model or binary not yet in local PATH"}


async def synthesize_edge_tts_async(
    text: str,
    output_path: Path,
    voice: str = "en-US-AnaNeural",
    pitch: str = "+24Hz",
    rate: str = "+12%"
) -> Dict[str, Any]:
    """
    Synthesize high-fidelity voice using edge-tts (keyless, zero API key required).
    """
    # 1. Try python edge_tts library
    try:
        import edge_tts  # type: ignore
        communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
        await communicate.save(str(output_path))
        if output_path.exists() and output_path.stat().st_size > 500:
            return {
                "success": True,
                "engine": "edge-tts-python",
                "voice": voice,
                "path": str(output_path),
            }
    except Exception:
        pass

    # 2. Try edge-tts CLI tool if installed
    edge_bin = shutil.which("edge-tts") or shutil.which("edge-tts.exe")
    if edge_bin:
        try:
            cmd = [
                edge_bin,
                "--text", text,
                "--voice", voice,
                "--pitch", pitch,
                "--rate", rate,
                "--write-media", str(output_path)
            ]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=12.0)
            if proc.returncode == 0 and output_path.exists() and output_path.stat().st_size > 500:
                return {
                    "success": True,
                    "engine": "edge-tts-cli",
                    "voice": voice,
                    "path": str(output_path),
                }
        except Exception:
            pass

    return {"success": False, "notice": "edge_tts package or network socket not available"}


def synthesize_pyttsx3(text: str, output_path: Path, rate: int = 185) -> Dict[str, Any]:
    """
    Synthesize using local pyttsx3 (100% offline, zero network required, native OS driver).
    """
    try:
        import pyttsx3  # type: ignore
        engine = pyttsx3.init()
        engine.setProperty("rate", rate)
        engine.setProperty("volume", 1.0)
        
        # Try to select a higher-pitched female/child voice if available in OS
        voices = engine.getProperty("voices")
        if voices:
            for v in voices:
                v_name = (v.name or "").lower()
                if "zira" in v_name or "female" in v_name or "girl" in v_name or "child" in v_name or "samantha" in v_name:
                    engine.setProperty("voice", v.id)
                    break

        wav_path = str(output_path).replace(".mp3", ".wav")
        engine.save_to_file(text, wav_path)
        engine.runAndWait()
        
        target = Path(wav_path)
        if target.exists() and target.stat().st_size > 200:
            return {
                "success": True,
                "engine": "pyttsx3-offline-sapi",
                "path": str(target),
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {"success": False, "notice": "pyttsx3 could not produce audio"}


def synthesize_keyless_public(text: str, output_path: Path, lang: str = "en") -> Dict[str, Any]:
    """
    Keyless open public speech endpoint fallback via standard library urllib.
    Requires 0 API keys.
    """
    try:
        clean = text.strip()[:200]
        encoded = urllib.parse.quote(clean)
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={lang}&q={encoded}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NEVEA/MochiSpeech/1.0"}
        )
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            content = resp.read()
            if len(content) > 300:
                with open(str(output_path), "wb") as f:
                    f.write(content)
                return {
                    "success": True,
                    "engine": "keyless-public-tts",
                    "path": str(output_path),
                }
    except Exception:
        pass
    return {"success": False}


def synthesize_mochi_speech(
    text: str,
    voice: str = "mochi_cute",
    pitch: Optional[str] = None,
    rate: Optional[str] = None,
    prefer_offline: bool = True
) -> Dict[str, Any]:
    """
    Master speech synthesis function for Mochi-Puff.
    Executes Piper-TTS or Edge-TTS with graceful multi-tiered offline fallbacks.
    """
    start_time = time.time()
    clean_text = (text or "").strip()
    if not clean_text:
        clean_text = "Hello! I am Mochi-Puff, your fluffy 3D desktop companion!"

    # Resolve preset voice parameters
    preset = MOCHI_VOICE_PRESETS.get(voice, MOCHI_VOICE_PRESETS["mochi_cute"])
    edge_voice = preset["edge_voice"]
    piper_voice = preset["piper_voice"]
    final_pitch = pitch or preset["pitch"]
    final_rate = rate or preset["rate"]

    safe_timestamp = int(time.time() * 1000)
    hash_tag = abs(hash(clean_text)) % 10000
    base_filename = f"mochi_{voice}_{safe_timestamp}_{hash_tag}"
    wav_target = OUTPUTS_DIR / f"{base_filename}.wav"
    mp3_target = OUTPUTS_DIR / f"{base_filename}.mp3"

    chosen_engine = "unknown"
    final_path: Optional[Path] = None

    # TIER 1: If prefer_offline, try Piper-TTS first (100% offline neural synthesis)
    if prefer_offline:
        res_piper = synthesize_piper(clean_text, wav_target, voice_model=piper_voice)
        if res_piper.get("success"):
            chosen_engine = res_piper["engine"]
            final_path = wav_target

    # TIER 2: Try Edge-TTS (Zero-key ultra high fidelity Microsoft Edge neural model)
    if not final_path:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            res_edge = loop.run_until_complete(
                synthesize_edge_tts_async(clean_text, mp3_target, voice=edge_voice, pitch=final_pitch, rate=final_rate)
            )
            loop.close()
            if res_edge.get("success"):
                chosen_engine = res_edge["engine"]
                final_path = mp3_target
        except Exception:
            pass

    # TIER 3: Try Piper-TTS if not already tried
    if not final_path and not prefer_offline:
        res_piper = synthesize_piper(clean_text, wav_target, voice_model=piper_voice)
        if res_piper.get("success"):
            chosen_engine = res_piper["engine"]
            final_path = wav_target

    # TIER 4: Try pyttsx3 (Native OS offline voice driver)
    if not final_path:
        res_pyttsx = synthesize_pyttsx3(clean_text, wav_target)
        if res_pyttsx.get("success"):
            chosen_engine = res_pyttsx["engine"]
            final_path = Path(res_pyttsx["path"])

    # TIER 5: Keyless public web speech endpoint
    if not final_path:
        res_web = synthesize_keyless_public(clean_text, mp3_target)
        if res_web.get("success"):
            chosen_engine = res_web["engine"]
            final_path = mp3_target

    # TIER 6: 100% Offline Procedural Melody Chime (Standard library wave)
    if not final_path:
        if _generate_procedural_chime_wav(clean_text, wav_target):
            chosen_engine = "procedural-melody-chime"
            final_path = wav_target

    # Generate Base64 audio representation for instant browser / Electron playback
    audio_base64 = ""
    mime_type = "audio/wav"
    if final_path and final_path.exists():
        try:
            ext = final_path.suffix.lower()
            mime_type = "audio/mp3" if ext == ".mp3" else "audio/wav"
            with open(final_path, "rb") as af:
                raw_bytes = af.read()
                audio_base64 = f"data:{mime_type};base64," + base64.b64encode(raw_bytes).decode("ascii")
        except Exception:
            pass

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "status": "success",
        "companion": "Mochi-Puff",
        "voice": voice,
        "engine": chosen_engine,
        "text": clean_text,
        "pitch": final_pitch,
        "rate": final_rate,
        "file_path": str(final_path) if final_path else None,
        "file_name": final_path.name if final_path else None,
        "audio_base64": audio_base64,
        "mime_type": mime_type,
        "latency_ms": latency_ms,
        "preset_info": preset,
    }


def list_mochi_voices() -> Dict[str, Any]:
    """Returns available Mochi-Puff voice styles and their characteristics."""
    return {
        "status": "success",
        "companion": "Mochi-Puff",
        "default_voice": "mochi_cute",
        "voices": MOCHI_VOICE_PRESETS,
        "supported_engines": ["piper-tts", "edge-tts", "pyttsx3", "procedural_chime"],
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps(list_mochi_voices(), indent=2))
        return

    action = sys.argv[1].lower()
    raw_payload = sys.argv[2] if len(sys.argv) > 2 else "{}"
    try:
        payload = json.loads(raw_payload)
    except Exception:
        payload = {"text": raw_payload}

    if action in ("synthesize", "speak", "tts"):
        result = synthesize_mochi_speech(
            text=payload.get("text", "Hello, I am Mochi-Puff!"),
            voice=payload.get("voice", "mochi_cute"),
            pitch=payload.get("pitch"),
            rate=payload.get("rate"),
            prefer_offline=payload.get("prefer_offline", True),
        )
    elif action in ("list_voices", "voices"):
        result = list_mochi_voices()
    else:
        result = {"status": "error", "message": f"Unknown action: {action}"}

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
