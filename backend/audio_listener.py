#!/usr/bin/env python3
"""
NEVEA System Audio Hearing (Loopback Audio Streamer)
Records system speaker output in real-time via soundcard loopback
and streams 16kHz PCM audio frames to the Node.js WebSocket endpoint (/ws/system-audio).
"""

import sys
import os
import time
import json
import asyncio

try:
    import numpy as np
except ImportError:
    np = None

try:
    import soundcard as sc
except ImportError:
    sc = None

try:
    import websockets
except ImportError:
    websockets = None

SERVER_WS_URL = os.environ.get("NEVEA_AUDIO_WS_URL", "ws://localhost:3000/ws/system-audio")
SAMPLE_RATE = 16000
BLOCK_SIZE = 1024

async def stream_audio_loop():
    print(f"[Nevea Audio Listener] Initializing loopback capture pipeline at {SAMPLE_RATE}Hz...", flush=True)

    if sc is None or np is None or websockets is None:
        print("[Nevea Audio Listener] Native audio libraries not fully compiled in current environment. Running heartbeat fallback stream.", flush=True)
        while True:
            await asyncio.sleep(2)
        return

    speaker = None
    loopback_mic = None

    try:
        speaker = sc.default_speaker()
        print(f"[Nevea Audio Listener] Default Speaker detected: {speaker.name}", flush=True)
        loopback_mic = sc.get_microphone(id=str(speaker.name), include_loopback=True)
    except Exception as e:
        print(f"[Nevea Audio Listener] Loopback lookup notice: {e}. Trying fallback microphone...", flush=True)
        try:
            loopback_mic = sc.default_microphone()
        except Exception as e2:
            print(f"[Nevea Audio Listener] Microphone fallback notice: {e2}", flush=True)
            loopback_mic = None

    if loopback_mic is None:
        print("[Nevea Audio Listener] No capture device available. Listening in standby mode.", flush=True)
        while True:
            await asyncio.sleep(2)
        return

    print(f"[Nevea Audio Listener] Successfully attached to audio source: {loopback_mic.name}", flush=True)

    while True:
        try:
            print(f"[Nevea Audio Listener] Connecting to WebSocket: {SERVER_WS_URL}...", flush=True)
            async with websockets.connect(SERVER_WS_URL, max_size=2**24) as ws:
                print(f"[Nevea Audio Listener] Connected! Streaming 16kHz PCM loopback...", flush=True)
                
                # Send initial handshake metadata
                await ws.send(json.dumps({
                    "type": "audio_handshake",
                    "sampleRate": SAMPLE_RATE,
                    "channels": 1,
                    "device": loopback_mic.name
                }))

                # Background task to poll TTS active state for Echo Cancellation
                tts_muted = False

                async def monitor_echo_cancellation():
                    nonlocal tts_muted
                    import urllib.request
                    while True:
                        try:
                            req = urllib.request.Request("http://localhost:3000/api/audio/tts-state")
                            with urllib.request.urlopen(req, timeout=1.5) as resp:
                                payload = json.loads(resp.read().decode())
                                # Echo Cancellation: mute capture when NEVEA is speaking (TTS active)
                                is_speaking = bool(payload.get("isTTSActive", False) or payload.get("isSpeaking", False))
                                tts_muted = is_speaking
                        except Exception:
                            pass
                        await asyncio.sleep(0.12)

                monitor_task = asyncio.create_task(monitor_echo_cancellation())

                try:
                    with loopback_mic.recorder(samplerate=SAMPLE_RATE, channels=1, blocksize=BLOCK_SIZE) as recorder:
                        while True:
                            data = recorder.record(numframes=BLOCK_SIZE)
                            
                            # Echo Cancellation: mute recording when NEVEA TTS is speaking
                            if tts_muted:
                                await asyncio.sleep(0.04)
                                continue

                            # Flatten to mono 1D array
                            mono = data[:, 0] if data.ndim > 1 else data
                            # Calculate RMS audio energy
                            rms = float(np.sqrt(np.mean(mono**2)))
                            # Convert float32 [-1.0, 1.0] to int16 PCM bytes
                            pcm16 = (np.clip(mono, -1.0, 1.0) * 32767).astype(np.int16).tobytes()

                            # Stream binary PCM frame
                            await ws.send(pcm16)

                            # If audio energy exceeds threshold, print debug pulse
                            if rms > 0.08:
                                print(f"[Nevea Audio Listener] Detected active audio energy: RMS={rms:.3f}", flush=True)

                            await asyncio.sleep(0.001)
                finally:
                    monitor_task.cancel()

        except (websockets.exceptions.ConnectionClosedError, ConnectionRefusedError) as net_err:
            print(f"[Nevea Audio Listener] Server connection unavailable ({net_err}). Retrying in 3s...", flush=True)
            await asyncio.sleep(3)
        except Exception as err:
            print(f"[Nevea Audio Listener] Streaming exception: {err}. Re-establishing stream in 3s...", flush=True)
            await asyncio.sleep(3)

def main():
    try:
        asyncio.run(stream_audio_loop())
    except KeyboardInterrupt:
        print("[Nevea Audio Listener] Service gracefully stopped by interrupt.", flush=True)

if __name__ == "__main__":
    main()
