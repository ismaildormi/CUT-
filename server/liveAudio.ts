import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocket, WebSocketServer } from "ws";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Attaches Gemini Live real-time bidirectional audio stream to an Express HTTP server
 */
export function setupGeminiLiveAudioServer(wss: WebSocketServer) {
  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Live API] Client connected for voice stream.");
    let session: any = null;

    try {
      // Connect to Gemini 3.8 Live API
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" }, // Cute, warm, cheerful persona
            },
          },
          systemInstruction:
            "You are NEVEA, a super cute, sentient white fluffy companion sitting on the user's desktop. Speak warmly, briefly, and expressively with playful kitten-rabbit charm.",
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

      // Handle raw 16kHz PCM audio incoming from client microphone
      clientWs.on("message", (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
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
        if (session && typeof session.close === "function") {
          session.close();
        }
      });
    } catch (err: any) {
      console.warn(
        "[Live API Initialization notice]: running with standard TTS fallback if Live API is unauthorized in current environment:",
        err.message
      );
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "fallback_ready",
            message: "Standard TTS and STT ready",
          })
        );
      }
    }
  });
}
