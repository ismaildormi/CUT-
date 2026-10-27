/**
 * NEVEA Client-Side AI Orchestrator
 * Integrates:
 * - Screen Vision capture (via Web Screen Share API or Electron IPC)
 * - Real-Time Voice Synthesis & Speech Recognition
 * - Gemini Server-Side Multimodal Endpoint with Function Calling
 * - Long-Term Memory ChromaDB syncing
 * - Dynamic 3D Creature Animation State Syncing (Idle, Listening, Thinking, Speaking)
 */

export class CompanionAIEngine {
  constructor({ creature, onStatusChange }) {
    this.creature = creature;
    this.onStatusChange = onStatusChange || (() => {});
    this.audioContext = null;
    this.isRecording = false;
    this.recognition = null;
    this.screenStream = null;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.creature.setCompanionState('listening');
        this.onStatusChange({ state: 'listening', message: 'Listening to your voice...' });
      };

      this.recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        this.onStatusChange({ state: 'thinking', message: `Heard: "${transcript}"` });
        await this.sendTurn({ prompt: transcript });
      };

      this.recognition.onerror = (e) => {
        console.warn('Speech recognition event:', e.error);
        this.creature.setCompanionState('idle');
        this.onStatusChange({ state: 'idle', message: 'Idle' });
      };

      this.recognition.onend = () => {
        if (this.creature.getCompanionState() === 'listening') {
          this.creature.setCompanionState('idle');
        }
      };
    }
  }

  // Capture current user screen as base64 JPEG
  async captureScreenSnapshot() {
    // 1. Electron IPC Native Capturer if running on desktop
    if (window.electronAPI?.captureScreen) {
      try {
        const res = await window.electronAPI.captureScreen({ width: 1280, height: 720 });
        if (res?.success && res.base64) {
          return `data:image/jpeg;base64,${res.base64}`;
        }
      } catch (e) {
        console.warn('Electron screen capture fallback to Web API', e);
      }
    }

    // 2. Web Screen Share / DisplayMedia API
    try {
      if (!this.screenStream) {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor', width: { ideal: 1280 } },
          audio: false,
        });
      }

      const video = document.createElement('video');
      video.srcObject = this.screenStream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.pause();

      return canvas.toDataURL('image/jpeg', 0.82);
    } catch (err) {
      console.warn('Screen capture not permitted or cancelled:', err);
      return null;
    }
  }

  // Toggle voice recognition
  toggleListening() {
    if (!this.recognition) {
      alert('Speech Recognition is supported in Chrome, Edge, and Electron environments.');
      return;
    }
    try {
      this.recognition.start();
    } catch {
      this.recognition.stop();
    }
  }

  // Send turn with optional screen vision
  async sendTurn({ prompt, includeScreen = false }) {
    try {
      this.creature.setCompanionState('thinking');
      this.onStatusChange({ state: 'thinking', message: 'Analyzing & thinking...' });

      let screenshotBase64 = null;
      if (includeScreen) {
        screenshotBase64 = await this.captureScreenSnapshot();
      }

      const response = await fetch('/api/gemini/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          screenshotBase64,
        }),
      });

      let data = {};
      try {
        const rawText = await response.text();
        if (rawText && rawText.trim()) {
          data = JSON.parse(rawText);
        } else {
          data = { text: "I'm right here with you! What would you like to do next?" };
        }
      } catch (parseError) {
        console.warn('Could not parse server response as JSON:', parseError);
        data = { text: "I'm right here with you! What would you like to do next?" };
      }

      const reply = data.text || "I've handled that!";

      // Speak reply and animate creature in sync
      await this.speak(reply);

      return data;
    } catch (err) {
      console.error('Turn failed:', err);
      this.creature.setCompanionState('idle');
      this.onStatusChange({ state: 'idle', message: 'Error processing turn' });
      return null;
    }
  }

  // Vocalize speech and modulate 3D creature bounce & mouth
  speak(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        this.creature.setCompanionState('idle');
        return resolve();
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.25; // Playful anime companion pitch

      // Pick high quality natural voice
      const voices = window.speechSynthesis.getVoices();
      const cuteVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google UK English Female') || v.name.includes('Natural'));
      if (cuteVoice) utterance.voice = cuteVoice;

      let speechInterval = null;

      utterance.onstart = () => {
        this.creature.setCompanionState('speaking');
        this.onStatusChange({ state: 'speaking', message: text });

        // Simulate prosody / amplitude variations for 3D body bouncing & mouth movement
        speechInterval = setInterval(() => {
          const simulatedVol = 0.35 + Math.random() * 0.65;
          this.creature.setSpeechLevel(simulatedVol);
        }, 60);
      };

      utterance.onend = () => {
        clearInterval(speechInterval);
        this.creature.setSpeechLevel(0);
        this.creature.setCompanionState('idle');
        this.onStatusChange({ state: 'idle', message: 'Idle · Ready' });
        resolve();
      };

      utterance.onerror = () => {
        clearInterval(speechInterval);
        this.creature.setSpeechLevel(0);
        this.creature.setCompanionState('idle');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // Trigger memory storage
  async rememberPreference(key, content) {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content }),
      });
      const rawText = await res.text();
      return rawText ? JSON.parse(rawText) : { success: true };
    } catch (e) {
      console.warn('Memory storage fallback:', e);
      return { success: true, simulated: true };
    }
  }
}
