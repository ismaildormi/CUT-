import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocket, WebSocketServer } from "ws";
import path from "path";
import { exec } from "child_process";
import { callKaspiChat, resolveKaspiConnection } from "./kaspiModelsClient.js";

function getGeminiLiveClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Connected WebSocket clients listening for Mochi-Puff's voice streams
 */
export const liveVoiceClients = new Set<WebSocket>();

/**
 * Synthesize Mochi-Puff dialogue locally using Edge-TTS (backend/voice_engine.py)
 */
export function synthesizeMochiVoiceEdgeTTS(
  dialogue: string,
  voice = "mochi_cute",
  pitch?: string,
  rate?: string
): Promise<any> {
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const voiceEnginePath = path.resolve(process.cwd(), "backend", "voice_engine.py");
  const payload = JSON.stringify({ dialogue, voice, pitch, rate });
  return new Promise((resolve) => {
    exec(`${pythonCmd} "${voiceEnginePath}" synthesize '${payload}'`, (err, stdout, stderr) => {
      if (err) {
        resolve({ success: false, error: stderr || err.message });
      } else {
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ success: true, raw: stdout.trim() });
        }
      }
    });
  });
}

/**
 * Broadcasts Mochi-Puff's synthesized dialogue via the existing WebSocket interface
 */
export async function broadcastMochiVoiceDialogue(
  dialogue: string,
  voice = "mochi_cute",
  pitch?: string,
  rate?: string
): Promise<any> {
  const result = await synthesizeMochiVoiceEdgeTTS(dialogue, voice, pitch, rate);
  if (result?.websocket_message) {
    const payloadStr = JSON.stringify(result.websocket_message);
    for (const ws of liveVoiceClients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payloadStr);
        } catch {}
      }
    }
  }
  return result;
}

/**
 * Attaches Gemini Live real-time bidirectional audio stream to an Express HTTP server
 */
export function setupGeminiLiveAudioServer(wss: WebSocketServer) {
  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Live API] Client connected for voice stream.");
    liveVoiceClients.add(clientWs);
    let session: any = null;

    try {
      const liveAi = getGeminiLiveClient();
      if (!liveAi) {
        throw new Error(
          resolveKaspiConnection().configured
            ? "GEMINI_API_KEY unset — routing Live Dialogue through KASPI Sovereign Cloud + Edge-TTS"
            : "GEMINI_API_KEY unset — running with local Edge-TTS fallback"
        );
      }

      // Connect to Gemini 3.8 Live API
      session = await liveAi.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" }, // Cute, warm, cheerful persona
            },
          },
          systemInstruction:
            "You are NEVEA, the Master Orchestrator and sentient 3D fluffy desktop companion (Mochi-Puff). You think, act with your OS/Playwright/Notepad/3D tools, observe results, and report back warmly and concisely.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audioData =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "audio",
                  audio: audioData,
                })
              );
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }
          },
          onclose: () => {
            console.log("[Live API] Session closed by server");
          },
          onerror: (err: any) => {
            console.error("[Live API Error]:", err);
          },
        },
      });

      // Handle raw 16kHz PCM audio incoming from client microphone and Mochi-Puff dialogue synthesis
      clientWs.on("message", async (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());

          // 1. Direct Edge-TTS Dialogue Synthesis request for Mochi-Puff via WebSocket
          if (
            parsed.type === "mochi_speak" ||
            parsed.type === "speak" ||
            parsed.type === "tts" ||
            parsed.type === "dialogue"
          ) {
            const dialogueText = parsed.text || parsed.dialogue || "";
            const voiceProfile = parsed.voice || parsed.profile || "mochi_cute";
            const res = await synthesizeMochiVoiceEdgeTTS(dialogueText, voiceProfile, parsed.pitch, parsed.rate);
            if (res?.websocket_message && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(res.websocket_message));
            }
            return;
          }

          // 2. Gemini Live Audio Ingestion
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }
          if (parsed.screenshot && session) {
            // Real-time video frame injection into Live API (<= 1 FPS)
            session.sendRealtimeInput({
              video: {
                data: parsed.screenshot,
                mimeType: "image/jpeg",
              },
            });
          }
        } catch (e) {
          console.error("[Live API Client Message Parse Err]:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("[Live API] Client disconnected, closing session.");
        liveVoiceClients.delete(clientWs);
        if (session && typeof session.close === "function") {
          session.close();
        }
      });
    } catch (err: any) {
      console.warn(
        "[Live API Initialization notice]: running with standard Edge-TTS fallback:",
        err.message
      );

      // Even if Gemini Live fails or key is missing, keep WebSocket open for KASPI Cloud + local Edge-TTS voice engine!
      clientWs.on("message", async (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (
            parsed.type === "mochi_speak" ||
            parsed.type === "speak" ||
            parsed.type === "tts" ||
            parsed.type === "dialogue"
          ) {
            const dialogueText = parsed.text || parsed.dialogue || "";
            const voiceProfile = parsed.voice || parsed.profile || "mochi_cute";
            const res = await synthesizeMochiVoiceEdgeTTS(dialogueText, voiceProfile, parsed.pitch, parsed.rate);
            if (res?.websocket_message && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(res.websocket_message));
            }
          } else if (parsed.type === "text" && parsed.text && resolveKaspiConnection().configured) {
            const reply = await callKaspiChat({
              model: "heyuka-core",
              systemPrompt: "You are NEVEA, the sentient 3D companion inside HEYUKA Desktop OS. Answer concisely and warmly.",
              userPrompt: String(parsed.text),
            });
            if (reply.ok && reply.text) {
              const voiceRes = await synthesizeMochiVoiceEdgeTTS(reply.text, parsed.voice || "mochi_cute", parsed.pitch, parsed.rate);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "kaspi_reply", text: reply.text, model: reply.model, voice: voiceRes?.websocket_message || null }));
              }
            }
          }
        } catch {}
      });

      clientWs.on("close", () => {
        liveVoiceClients.delete(clientWs);
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "fallback_ready",
            message: "Local Edge-TTS Voice Engine active and ready for Mochi-Puff dialogue.",
          })
        );
      }
    }
  });
}

/**
 * System Audio Hearing Stream State & Broadcast
 */
interface SystemAudioStatus {
  active: boolean;
  rms: number;
  lastActiveTime: number;
  device: string;
}

export const currentSystemAudioStatus: SystemAudioStatus = {
  active: false,
  rms: 0,
  lastActiveTime: 0,
  device: "Default System Loopback",
};

const activeSubscribers = new Set<WebSocket>();

/**
 * Attaches the System Audio Loopback WebSocket listener
 * Receives raw PCM 16kHz audio from backend/audio_listener.py (or Web Audio loopback capture),
 * computes real-time volume RMS, and pipes to Gemini Live sessions for full multimodal awareness.
 */
export function setupSystemAudioServer(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req) => {
    console.log("[System Audio Listener] Audio client/listener connected:", req.url);
    currentSystemAudioStatus.active = true;
    currentSystemAudioStatus.lastActiveTime = Date.now();
    activeSubscribers.add(ws);

    let activeLiveSession: any = null;

    // Connect to Gemini Live if API key is enabled
    const sysAi = getGeminiLiveClient();
    if (sysAi) {
      sysAi.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            "You are NEVEA hearing the user's system audio (videos, conference calls, music). Listen attentively and note any important context or questions directed at you.",
        },
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            const text = msg.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              console.log("[Nevea System Audio Heard]:", text);
            }
          },
        },
      }).then((sess: any) => {
        activeLiveSession = sess;
      }).catch(() => {
        // Standalone mode if API key is not live-ready
      });
    }

    ws.on("message", (message: any) => {
      currentSystemAudioStatus.lastActiveTime = Date.now();
      try {
        if (Buffer.isBuffer(message)) {
          // Process 16-bit PCM chunk
          const pcmSamples = new Int16Array(
            message.buffer,
            message.byteOffset,
            message.byteLength / 2
          );
          let sumSquares = 0;
          for (let i = 0; i < pcmSamples.length; i++) {
            const norm = pcmSamples[i] / 32768.0;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / Math.max(1, pcmSamples.length));
          currentSystemAudioStatus.rms = Math.min(1.0, rms * 3.5);

          // Pipe audio chunk to Gemini Live if connected
          if (activeLiveSession && rms > 0.02) {
            const b64 = message.toString("base64");
            activeLiveSession.sendRealtimeInput({
              audio: {
                data: b64,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }

          // Broadcast volume pulse to connected UI clients
          const telemetryPayload = JSON.stringify({
            type: "system_audio_level",
            rms: currentSystemAudioStatus.rms,
            timestamp: Date.now(),
          });
          for (const client of activeSubscribers) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(telemetryPayload);
            }
          }
        } else {
          // JSON packet
          const parsed = JSON.parse(message.toString());
          if (parsed.type === "audio_handshake") {
            currentSystemAudioStatus.device = parsed.device || "System Output Loopback";
            console.log(`[System Audio Handshake] Device: ${currentSystemAudioStatus.device}`);
          }
        }
      } catch (err) {
        // Safe skip corrupt frame
      }
    });

    ws.on("close", () => {
      activeSubscribers.delete(ws);
      if (activeSubscribers.size === 0) {
        currentSystemAudioStatus.active = false;
        currentSystemAudioStatus.rms = 0;
      }
      if (activeLiveSession && typeof activeLiveSession.close === "function") {
        activeLiveSession.close();
      }
      console.log("[System Audio Listener] Audio connection closed.");
    });
  });
}
