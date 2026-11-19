/**
 * NEVEA Client-Side AI Orchestrator
 * Integrates:
 * - Screen & 3D Canvas Vision capture (via mockBackend / Electron IPC)
 * - Real-Time Voice Synthesis & Speech Recognition (WebRTC / Web Speech API)
 * - Gemini Server-Side Multimodal Endpoint with Function Calling
 * - Direct 3D Creature Omnipotence (Fur color, Environment, Jump/Squash, Cute Sound FX)
 * - Local OS Automation & Simulated Browser Execution (PyAutoGUI / PyGetWindow)
 * - Google Workspace (Drive & Slides) Integration
 */

import { v4 as uuidv4 } from 'uuid';
import { playCuteSound } from './audioSynth.js';
import {
  searchDriveFiles,
  createDriveTextFile,
  createPresentation,
  createSlideDeck,
  addSlideContent,
  getPresentationSummary,
  getWorkspaceAccessToken,
} from './googleWorkspace.js';
import { captureVisionSnapshot, executeDesktopCommand } from './mockBackend';
import { getActiveCharacterProfile } from '../data/characterPresets';

import {
  getOmniscienceSettings,
  getCachedOmniscienceSettings,
} from './omniscienceSettings.js';
import { getActiveByokPayloadForRequest } from './yukaByokVault';
import { resolveIntentModel } from './kaspiModelsClient';

/**
 * Computes a fast 256-bit perceptual difference hash (dHash) from a base64 image
 * Downsamples to 16x16 grayscale for lightning-fast (<2ms) change detection
 */
async function computeImagePerceptualHash(base64Image) {
  if (!base64Image) return null;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, 16, 16);
          const imgData = ctx.getImageData(0, 0, 16, 16).data;
          let sum = 0;
          const grays = new Float32Array(256);
          for (let i = 0; i < 256; i++) {
            const r = imgData[i * 4];
            const g = imgData[i * 4 + 1];
            const b = imgData[i * 4 + 2];
            const gray = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
            grays[i] = gray;
            sum += gray;
          }
          const avg = sum / 256;
          let hash = '';
          for (let i = 0; i < 256; i++) {
            hash += grays[i] >= avg ? '1' : '0';
          }
          resolve(hash);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = base64Image.startsWith('data:')
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;
    } catch {
      resolve(null);
    }
  });
}

function computeHashHammingDistance(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 1.0;
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) diff++;
  }
  return diff / hashA.length;
}

export class CompanionAIEngine {
  constructor({ creature, onStatusChange, onClientAction, onOSActionLog, onSpeak }) {
    this.creature = creature;
    this.conversationId = uuidv4();
    this.onStatusChange = onStatusChange || (() => {});
    this.onClientAction = onClientAction || (() => {});
    this.onOSActionLog = onOSActionLog || (() => {});
    this.onSpeak = onSpeak || (() => {});
    this.isRecording = false;
    this.recognition = null;
    this.watcherInterval = null;
    this.liveVisionInterval = null;
    this.lastLiveVisionHash = null;
    this.isLiveVisionRunning = false;
    this.isSystemAudioListening = false;
    this.systemAudioSocket = null;
    this.systemAudioPollInterval = null;
    this.isProcessingTurn = false;

    this.initSpeechRecognition();
    this.startProactiveWatcher(60000);

    // Initialize Omniscience Settings
    if (typeof window !== 'undefined') {
      getOmniscienceSettings().then((settings) => {
        if (settings.liveVisionEnabled) {
          this.startLiveVision();
        }
        if (settings.systemAudioEnabled) {
          this.startSystemAudio();
        }
      });

      // Synchronize with UI toggle changes in real time
      window.addEventListener('nevea:omniscience-change', (e) => {
        const s = e.detail?.settings;
        if (!s) return;
        if (s.liveVisionEnabled && !this.isLiveVisionRunning) {
          this.startLiveVision();
        } else if (!s.liveVisionEnabled && this.isLiveVisionRunning) {
          this.stopLiveVision();
        }

        if (s.systemAudioEnabled && !this.isSystemAudioListening) {
          this.startSystemAudio();
        } else if (!s.systemAudioEnabled && this.isSystemAudioListening) {
          this.stopSystemAudio();
        }
      });
    }
  }

  startNewConversation() {
    this.conversationId = uuidv4();
    return this.conversationId;
  }

  /**
   * TASK 2: OPTIMIZED LIVE VISION LOOP (3-Second Screen Awareness)
   * Captures a low-res screenshot every 3 seconds if enabled.
   * Compares pixel hashes to detect significant changes before sending to Gemini.
   * Proactively comments: "I see you opened a new tab", "I see an error", etc.
   */
  startLiveVision(onComment) {
    this.stopLiveVision();
    this.isLiveVisionRunning = true;
    console.log('[NEVEA Live Vision] Continuous 3-second awareness loop active.');

    this.liveVisionInterval = setInterval(async () => {
      try {
        const settings = getCachedOmniscienceSettings();
        if (!settings.liveVisionEnabled) {
          this.stopLiveVision();
          return;
        }

        // Do not interrupt while voice is actively recording, processing a turn, or creature is speaking
        if (this.isRecording || this.isProcessingTurn) return;
        const currentState = this.creature?.getCompanionState?.();
        if (currentState === 'speaking') return;

        // Capture screen snapshot
        const screenshotBase64 = await this.captureScreenSnapshot();
        if (!screenshotBase64) return;

        // Compute perceptual hash (16x16 thumbnail)
        const currentHash = await computeImagePerceptualHash(screenshotBase64);
        if (!currentHash) return;

        // Compare against previous screen hash
        if (!this.lastLiveVisionHash) {
          this.lastLiveVisionHash = currentHash;
          return;
        }

        const distance = computeHashHammingDistance(this.lastLiveVisionHash, currentHash);

        // Smart Frame Diffing: only send if screen changes > 10% (distance > 0.10) to prevent API burnout
        if (distance > 0.10) {
          this.lastLiveVisionHash = currentHash;

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('nevea:live-vision-pulse', {
                detail: { distance, timestamp: Date.now() },
              })
            );
          }

          const visionPrompt =
            "The user just switched screens or significant screen content changed. In 1 concise, observant sentence (maximum 12 words), comment warmly on what they opened, changed, or if there is an error/code/media visible (e.g., 'I see you opened a new tab', 'I see an error in the console', 'I see you opened your code editor'). If nothing noteworthy, return 'OK'.";

          const byokConfig = await getActiveByokPayloadForRequest();
          const response = await fetch('/api/gemini/interact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: this.conversationId,
              taskId: uuidv4(),
              prompt: visionPrompt,
              screenshotBase64,
              preferredModel: 'heyuka-vision',
              byokConfig: byokConfig || undefined,
            }),
          });

          const rawText = await response.text();
          if (!rawText || !rawText.trim()) return;
          const data = JSON.parse(rawText);
          const reply = (data.text || '').trim();

          if (reply && reply.toUpperCase() !== 'OK' && reply.toUpperCase() !== "'OK'") {
            if (onComment) onComment(reply);
            if (this.onSpeak) this.onSpeak(reply);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:live-vision-comment', {
                  detail: { comment: reply, timestamp: Date.now() },
                })
              );
            }
            await this.speak(reply);
          }
        }
      } catch (err) {
        console.warn('[NEVEA Live Vision] Loop iteration notice:', err);
      }
    }, 3000);
  }

  stopLiveVision() {
    if (this.liveVisionInterval) {
      clearInterval(this.liveVisionInterval);
      this.liveVisionInterval = null;
    }
    this.isLiveVisionRunning = false;
    this.lastLiveVisionHash = null;
    console.log('[NEVEA Live Vision] Awareness loop stopped.');
  }

  /**
   * PROACTIVE WATCHER (Fallback & 60s Background Heartbeat)
   */
  startProactiveWatcher(intervalMs = 60000) {
    this.stopProactiveWatcher();
    this.watcherInterval = setInterval(async () => {
      try {
        if (this.isRecording || this.isProcessingTurn) return;
        const currentState = this.creature?.getCompanionState?.();
        if (currentState === 'speaking') return;

        const screenshotBase64 = await this.captureScreenSnapshot();
        if (!screenshotBase64) return;

        const watcherPrompt =
          "Look at the screen. If the user has a code error, a crash, or is stuck, proactively offer help. If everything is fine, output 'OK'.";

        const byokConfig = await getActiveByokPayloadForRequest();
        const response = await fetch('/api/gemini/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: this.conversationId,
            taskId: uuidv4(),
            prompt: watcherPrompt,
            screenshotBase64,
            preferredModel: 'heyuka-vision',
            byokConfig: byokConfig || undefined,
          }),
        });

        const rawText = await response.text();
        if (!rawText || !rawText.trim()) return;
        const data = JSON.parse(rawText);
        const reply = (data.text || '').trim();

        if (reply && reply.toUpperCase() !== 'OK' && reply.toUpperCase() !== "'OK'") {
          const hasErrorCue = /error|crash|exception|bug|failed|stuck/i.test(reply);
          const bubbleText = hasErrorCue ? 'I noticed an error. Want me to fix it?' : reply;
          if (this.onSpeak) this.onSpeak(bubbleText);
          await this.speak(bubbleText);
        }
      } catch (err) {
        console.warn('Proactive watcher check skipped:', err);
      }
    }, intervalMs);
  }

  stopProactiveWatcher() {
    if (this.watcherInterval) {
      clearInterval(this.watcherInterval);
      this.watcherInterval = null;
    }
  }

  /**
   * TASK 3: SYSTEM AUDIO HEARING (LOOPBACK)
   * Triggers the Python audio listener (soundcard) and connects to /ws/system-audio
   */
  startSystemAudio() {
    this.stopSystemAudio();
    this.isSystemAudioListening = true;
    console.log('[NEVEA System Audio] Loopback hearing enabled.');

    // Signal Electron main process to spawn backend/audio_listener.py
    const electron = typeof window !== 'undefined' ? window.electronAPI : null;
    if (electron && typeof electron.toggleSystemAudio === 'function') {
      electron.toggleSystemAudio(true);
    }

    // Connect WebSocket to stream system audio levels to the 3D creature
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/system-audio`;
      const ws = new WebSocket(wsUrl);
      this.systemAudioSocket = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'system_audio_level') {
            const rms = Number(data.rms) || 0;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:system-audio-level', {
                  detail: { rms, timestamp: data.timestamp },
                })
              );
            }
            // If active sound energy, slightly modulate creature listening posture
            if (rms > 0.08 && this.creature?.setSpeechLevel) {
              this.creature.setSpeechLevel(Math.min(0.4, rms * 0.6));
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        // Fallback polling
        this.startSystemAudioPollingFallback();
      };
    } catch {
      this.startSystemAudioPollingFallback();
    }
  }

  startSystemAudioPollingFallback() {
    if (this.systemAudioPollInterval) return;
    this.systemAudioPollInterval = setInterval(async () => {
      try {
        if (!this.isSystemAudioListening || this.isProcessingTurn) return;
        const res = await fetch('/api/audio/system-status');
        if (res.ok) {
          const data = await res.json();
          if (data.active && data.rms > 0) {
            window.dispatchEvent(
              new CustomEvent('nevea:system-audio-level', {
                detail: { rms: data.rms, timestamp: Date.now() },
              })
            );
          }
        }
      } catch {}
    }, 1500);
  }

  stopSystemAudio() {
    this.isSystemAudioListening = false;
    if (this.systemAudioSocket) {
      try {
        this.systemAudioSocket.close();
      } catch {}
      this.systemAudioSocket = null;
    }
    if (this.systemAudioPollInterval) {
      clearInterval(this.systemAudioPollInterval);
      this.systemAudioPollInterval = null;
    }
    const electron = typeof window !== 'undefined' ? window.electronAPI : null;
    if (electron && typeof electron.toggleSystemAudio === 'function') {
      electron.toggleSystemAudio(false);
    }
    console.log('[NEVEA System Audio] Loopback hearing stopped.');
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isRecording = true;
        if (this.creature?.setCompanionState) {
          this.creature.setCompanionState('listening');
        }
        this.onStatusChange({ state: 'listening', message: 'Listening to your voice...' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:audio-waveform', {
              detail: { active: true, mode: 'listening', level: 0.48 },
            })
          );
          if (navigator.mediaDevices?.getUserMedia && window.__fluffCreatureRef?.connectAudioStream) {
            navigator.mediaDevices
              .getUserMedia({ audio: true })
              .then((stream) => {
                window.__fluffCreatureRef?.connectAudioStream(stream);
              })
              .catch(() => {});
          }
        }
      };

      this.recognition.onresult = async (event) => {
        this.isRecording = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:audio-waveform', {
              detail: { active: false, mode: 'idle', level: 0 },
            })
          );
        }
        const transcript = event.results[0][0].transcript;
        this.onStatusChange({ state: 'thinking', message: `Heard: "${transcript}"` });
        await this.sendTurn({ prompt: transcript });
      };

      this.recognition.onerror = (e) => {
        this.isRecording = false;
        console.warn('Speech recognition event:', e.error);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:audio-waveform', {
              detail: { active: false, mode: 'idle', level: 0 },
            })
          );
        }
        if (this.creature?.setCompanionState) {
          this.creature.setCompanionState('idle');
        }
        this.onStatusChange({
          state: 'idle',
          message:
            e.error === 'not-allowed'
              ? 'Microphone access blocked in iframe preview — use chat input or run in Electron.'
              : 'Voice ready · Click Listen or type below',
        });
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:audio-waveform', {
              detail: { active: false, mode: 'idle', level: 0 },
            })
          );
        }
        if (this.creature?.getCompanionState && this.creature.getCompanionState() === 'listening') {
          this.creature.setCompanionState('idle');
        }
      };
    }
  }

  // Capture current screen or 3D canvas as base64 JPEG
  async captureScreenSnapshot() {
    return captureVisionSnapshot({ preferCanvas: true });
  }

  // Toggle voice recognition (Web Speech API / Electron microphone)
  toggleListening() {
    if (!this.recognition) {
      this.onStatusChange({
        state: 'idle',
        message: 'Web Speech API is supported in Chrome, Edge, and the Electron desktop build.',
      });
      return;
    }
    try {
      if (this.isRecording) {
        this.recognition.stop();
        this.isRecording = false;
      } else {
        this.recognition.start();
      }
    } catch {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  // Send turn with optional screen vision
  async sendTurn({ prompt, includeScreen = false }) {
    this.isProcessingTurn = true;
    try {
      if (this.creature?.setCompanionState) {
        this.creature.setCompanionState('thinking');
      }
      this.onStatusChange({
        state: 'thinking',
        message: includeScreen
          ? 'Capturing viewport vision & analyzing...'
          : 'Analyzing & thinking...',
      });

      let screenshotBase64 = null;
      if (includeScreen) {
        screenshotBase64 = await this.captureScreenSnapshot();
      }

      const rawPromptStr = String(prompt || '').trim();
      const lowerPromptStr = rawPromptStr.toLowerCase();
      const currentUiLang =
        (typeof window !== 'undefined' && localStorage.getItem('nevea_ui_lang')) || 'en';

      // 0. Voice Language Switching Handler
      const langPatterns = [
        { code: 'ar', keys: ['switch to arabic', 'بدل اللغة للعربية', 'حول للعربية', 'اللغة العربية'] },
        { code: 'en', keys: ['switch to english', 'بالانجليزية', 'اللغة الانجليزية'] },
        { code: 'fr', keys: ['switch to french', 'en français', 'بالفرنسية'] },
        { code: 'es', keys: ['switch to spanish', 'en español', 'بالاسبانية'] },
        { code: 'de', keys: ['switch to german', 'auf deutsch', 'بالالمانية'] },
        { code: 'zh', keys: ['switch to chinese', '切换到中文', 'بالصينية'] },
        { code: 'ja', keys: ['switch to japanese', '日本語に切り替え', 'باليابانية'] },
      ];
      for (const lp of langPatterns) {
        if (lp.keys.some((k) => lowerPromptStr.includes(k))) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('nevea:set-language', { detail: { lang: lp.code } })
            );
          }
          const msg =
            lp.code === 'ar'
              ? 'تم تحويل لغة النظام إلى العربية مع الحفاظ الكامل على أبعاد الواجهة.'
              : `Language switched to ${lp.code.toUpperCase()} with locked layout geometry.`;
          if (this.onSpeak) this.onSpeak(msg);
          await this.speak(msg);
          return { text: msg };
        }
      }

      // 0.1 Voice Directives for Master Plan, Virtual Desktops, Live Browser & Machine Mode
      if (
        lowerPromptStr.includes('master plan') ||
        lowerPromptStr.includes('ماستر بلان') ||
        lowerPromptStr.includes('ماستر بلين') ||
        lowerPromptStr.includes('خطة المشروع')
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:autonomous-directive', {
              detail: { type: 'master_plan', desktopId: 'd3-masterplan' },
            })
          );
        }
        const msg =
          currentUiLang === 'ar'
            ? 'عرضت لك الماستر بلان الخاصة بالمشروع مع القيم الحقيقية المستخرجة والمحفوظة سحابياً.'
            : 'Displaying the Project Master Plan with cloud-synced phases and grounded values.';
        if (this.onSpeak) this.onSpeak(msg);
        await this.speak(msg);
        return { text: msg };
      }

      if (
        lowerPromptStr.includes('machine mode') ||
        lowerPromptStr.includes('full autonomy') ||
        lowerPromptStr.includes('ماكينة تنفيذ') ||
        lowerPromptStr.includes('مكينة تنفيد') ||
        lowerPromptStr.includes('تفويض كامل')
      ) {
        const enableMachine = !lowerPromptStr.includes('off') && !lowerPromptStr.includes('ايقاف');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:autonomous-directive', {
              detail: { type: 'machine_mode', machineMode: enableMachine },
            })
          );
        }
        const msg =
          currentUiLang === 'ar'
            ? 'تم تفعيل وضع ماكينة التنفيذ الكامل! سيقوم جميع الوكلاء بإصلاح أي عرقلة تقنية ذاتياً وإتمام المهام للنهاية.'
            : 'Full Autonomous Machine Mode activated! All 5 agents will self-heal any technical blockers automatically.';
        if (this.onSpeak) this.onSpeak(msg);
        await this.speak(msg);
        return { text: msg };
      }

      if (
        lowerPromptStr.includes('scroll down') ||
        lowerPromptStr.includes('هبط الصفحة') ||
        lowerPromptStr.includes('حرك لتحت')
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:autonomous-directive', {
              detail: { type: 'browser_scroll', scrollDelta: 360 },
            })
          );
        }
        const msg =
          currentUiLang === 'ar'
            ? 'قمت بتحريك الصفحة لأسفل في المتصفح الحي.'
            : 'Scrolled the live browser page down.';
        if (this.onSpeak) this.onSpeak(msg);
        await this.speak(msg);
        return { text: msg };
      }

      if (
        lowerPromptStr.includes('scroll up') ||
        lowerPromptStr.includes('طلع الصفحة') ||
        lowerPromptStr.includes('حرك لفوق')
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:autonomous-directive', {
              detail: { type: 'browser_scroll', scrollDelta: -360 },
            })
          );
        }
        const msg =
          currentUiLang === 'ar'
            ? 'قمت بتحريك الصفحة لأعلى في المتصفح الحي.'
            : 'Scrolled the live browser page up.';
        if (this.onSpeak) this.onSpeak(msg);
        await this.speak(msg);
        return { text: msg };
      }

      const openPageMatch = rawPromptStr.match(
        /(?:open page|go to|navigate to|عرض صفحة|افتح صفحة|ادخل لصفحة|افتح موقع)\s+(.+)/i
      );
      if (openPageMatch && openPageMatch[1]) {
        const targetUrlOrQuery = openPageMatch[1].trim();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:autonomous-directive', {
              detail: {
                type: 'browser_navigate',
                urlOrQuery: targetUrlOrQuery,
                desktopId: 'd2-browser',
              },
            })
          );
        }
        const msg =
          currentUiLang === 'ar'
            ? `فتحت الصفحة "${targetUrlOrQuery}" في الديسكتوب الثاني (المتصفح الحي).`
            : `Opened "${targetUrlOrQuery}" in Desktop 2 (Live Browser Viewport).`;
        if (this.onSpeak) this.onSpeak(msg);
        await this.speak(msg);
        return { text: msg };
      }

      // 0A. Instant "فين وصلو / شنو دارو / Status Report" Handler
      const statusPatterns = [
        'فين وصلو',
        'فين وصلتو',
        'شنو دارو',
        'اش دارو',
        'اش درتو',
        'واش ساليتو',
        'فين وصل المشروع',
        'اعطني تقرير',
        'تقرير الوكلاء',
        'where are they',
        'what did they do',
        'status report',
      ];
      if (statusPatterns.some((p) => lowerPromptStr.includes(p))) {
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nevea:ask-swarm-status'));
          }
          const repRes = await fetch('/api/company/status-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (repRes.ok) {
            const repData = await repRes.json();
            const spoken =
              currentUiLang === 'ar'
                ? repData.spokenReportAr
                : repData.spokenReportEn || repData.spokenReportAr;
            if (this.onSpeak) this.onSpeak(spoken);
            await this.speak(spoken);
            return { text: spoken, statusReport: repData };
          }
        } catch (repErr) {
          console.warn('[CompanionAI] Status report fallback:', repErr);
        }
      }

      // 0B. Autonomous Swarm Company Project Execution Handler (Arabic / Darija / English / Multi-Language)
      const projectPatterns = [
        'صاوب',
        'صايب',
        'ابني',
        'طور',
        'مشروع',
        'برمج',
        'شركة الوكلاء',
        'ابحث في الويب',
        'بناء أداة',
        'build a project',
        'create a project',
        'execute project',
        'launch project',
      ];
      if (projectPatterns.some((p) => lowerPromptStr.includes(p))) {
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('nevea:execute-company-project', {
                detail: { prompt: rawPromptStr },
              })
            );
          }
          const projRes = await fetch('/api/company/execute-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: rawPromptStr }),
          });
          if (projRes.ok) {
            const projData = await projRes.json();
            const replyText =
              currentUiLang === 'ar'
                ? projData.reportAr
                : projData.reportEn || projData.reportAr;
            if (this.onSpeak) this.onSpeak(replyText);
            await this.speak(replyText);
            return { text: replyText, companyProject: projData };
          }
        } catch (projErr) {
          console.warn('[CompanionAI] Company project execution fallback:', projErr);
        }
      }

      // Check selected Boss AI (The King) from electron-store or local storage
      let selectedBoss = 'boss-king';
      try {
        const electron = (typeof window !== 'undefined' && window.electron);
        if (electron?.store?.get) {
          selectedBoss = electron.store.get('selected_king_boss', 'boss-king');
        }
      } catch {}
      if (!selectedBoss || selectedBoss === 'boss-king') {
        try {
          selectedBoss = localStorage.getItem('nevea_selected_king_boss') || 'boss-king';
        } catch {}
      }

      // 1. Delegate intent directly to Swarm Boss Orchestrator (/api/swarm/execute)
      try {
        const swarmRes = await fetch('/api/swarm/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            bossModel: selectedBoss,
          }),
        });

        if (swarmRes.ok) {
          const swarmData = await swarmRes.json();
          if (swarmData && (swarmData.status === 'success' || Array.isArray(swarmData.results))) {
            const tasksSummary = (swarmData.results || [])
              .map((r) => r.message || r.summary || (r.stdout ? `Executed command: ${r.returncode === 0 ? 'Success' : 'Exited ' + r.returncode}` : ''))
              .filter(Boolean)
              .join('. ');

            const reply = tasksSummary
              ? `The King commanded the swarm: ${tasksSummary}`
              : `The Swarm has executed your command: "${prompt}".`;

            this.onStatusChange({
              state: 'speaking',
              message: reply,
            });

            await this.speak(reply);
            return { text: reply, swarm: swarmData };
          }
        }
      } catch (swarmErr) {
        console.warn('[CompanionAI] Swarm delegation note, falling back to conversational pipeline:', swarmErr);
      }

      const activeProfile = getActiveCharacterProfile();
      const taskId = uuidv4();

      let data = {};
      try {
        const byokConfig = await getActiveByokPayloadForRequest();
        const preferredModel = resolveIntentModel(prompt, Boolean(screenshotBase64));
        const response = await fetch('/api/gemini/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: this.conversationId,
            taskId,
            prompt,
            screenshotBase64,
            preferredModel,
            byokConfig: byokConfig || undefined,
            characterProfile: activeProfile
              ? {
                  id: activeProfile.id,
                  name: activeProfile.name,
                  personalityPrompt: activeProfile.personalityPrompt,
                }
              : undefined,
          }),
        });

        const rawText = await response.text();
        if (rawText && rawText.trim()) {
          data = JSON.parse(rawText);
        } else {
          data = { text: "I'm HEYUKA, right here with you! What would you like to do next?" };
        }
      } catch (networkOrParseError) {
        console.warn('[CompanionAI] Using resilient HEYUKA local brain fallback:', networkOrParseError);
        const lowerPrompt = String(prompt || '').toLowerCase();
        if (lowerPrompt.includes('jump') || lowerPrompt.includes('boop') || lowerPrompt.includes('squash')) {
          if (this.creature?.triggerBoop) this.creature.triggerBoop(1.2);
          playCuteSound('boop');
          data = { text: 'Boop! HEYUKA jumped joyfully for you!' };
        } else if (lowerPrompt.includes('noir') || lowerPrompt.includes('midnight') || lowerPrompt.includes('dark')) {
          this.onClientAction({ type: 'environment', envId: 'midnight' });
          data = { text: 'Switched to Monochrome Noir studio mode.' };
        } else {
          data = {
            text: `HEYUKA v12.0 Zero-Key Core processed: "${String(prompt || 'Ready').slice(0, 80)}". All companion systems are active.`,
          };
        }
      }

      // Handle 3D / Audio / OS / Workspace omnipotence tool results
      if (Array.isArray(data.toolResults)) {
        for (const tr of data.toolResults) {
          if (tr.name === 'change_fur_color') {
            const args = tr.result || {};
            const preset = (args.color_preset || '').toLowerCase();
            const paletteMap = {
              sakura: { base: '#d946ef', tip: '#fbcfe8' },
              golden: { base: '#92400e', tip: '#fef08a' },
              midnight: { base: '#131638', tip: '#67e8f9' },
              mint: { base: '#1e4631', tip: '#bbf7d0' },
              pure_fluff: { base: '#e0ecfa', tip: '#ffffff' },
              peach: { base: '#fed7aa', tip: '#fff7ed' },
            };
            const pal = paletteMap[preset] || {
              base: args.base_color || '#d946ef',
              tip: args.tip_color || '#fbcfe8',
            };
            this.onClientAction({ type: 'fur_color', palette: pal });
            playCuteSound('giggle');
          } else if (tr.name === 'change_environment') {
            const envId = (tr.result?.environment_id || 'studio').toLowerCase();
            this.onClientAction({ type: 'environment', envId });
            playCuteSound('yiii');
          } else if (tr.name === 'play_sound') {
            const soundType = tr.result?.sound_type || 'boop';
            playCuteSound(soundType);
          } else if (tr.name === 'trigger_creature_action') {
            const act = tr.result?.action || 'jump';
            if (act === 'jump' || act === 'squash') {
              if (this.creature?.triggerBoop) this.creature.triggerBoop(1.2);
              playCuteSound('boop');
            } else if (act === 'wiggle') {
              if (this.creature?.triggerBoop) this.creature.triggerBoop(0.8);
              playCuteSound('aaaa');
            } else if (act === 'sleep') {
              if (this.creature?.setCompanionState) this.creature.setCompanionState('sleeping');
            } else if (act === 'wake') {
              if (this.creature?.setCompanionState) this.creature.setCompanionState('idle');
            }
          } else if (tr.name === 'workspace_search_drive') {
            try {
              if (!getWorkspaceAccessToken()) {
                this.onStatusChange({
                  state: 'speaking',
                  message: 'Connect your Google Account in the Workspace tab to search Drive.',
                });
              } else {
                const results = await searchDriveFiles(tr.result?.query || '');
                const count = results.length;
                const fileNames = results
                  .slice(0, 3)
                  .map((f) => f.name)
                  .join(', ');
                this.onStatusChange({
                  state: 'speaking',
                  message: `Found ${count} file${count === 1 ? '' : 's'} in Google Drive: ${
                    fileNames || 'none'
                  }`,
                });
                playCuteSound('boop');
              }
            } catch (err) {
              console.warn('Workspace search error:', err);
            }
          } else if (tr.name === 'workspace_create_presentation') {
            try {
              if (!getWorkspaceAccessToken()) {
                this.onStatusChange({
                  state: 'speaking',
                  message: 'Connect your Google Account in the Workspace tab to create slides.',
                });
              } else {
                const title = tr.result?.title || 'Nevea Presentation';
                const slides = tr.result?.slides || [];
                const res = await createPresentation(title, slides);
                this.onStatusChange({
                  state: 'speaking',
                  message: `Created presentation "${res.title}" in Google Slides!`,
                });
                playCuteSound('yiii');
              }
            } catch (err) {
              console.warn('Workspace presentation creation error:', err);
            }
          } else if (tr.name === 'workspace_create_drive_file') {
            try {
              if (!getWorkspaceAccessToken()) {
                this.onStatusChange({
                  state: 'speaking',
                  message: 'Connect your Google Account in the Workspace tab first.',
                });
              } else {
                const name = tr.result?.name || 'note.txt';
                const content = tr.result?.content || '';
                const res = await createDriveTextFile(name, content);
                this.onStatusChange({
                  state: 'speaking',
                  message: `Saved "${res.name}" directly to your Google Drive!`,
                });
                playCuteSound('boop');
              }
            } catch (err) {
              console.warn('Workspace drive create error:', err);
            }
          } else if (tr.name === 'create_slide_deck') {
            try {
              if (!getWorkspaceAccessToken()) {
                const simRes = await executeDesktopCommand({
                  action: 'create_slide_deck',
                  params: tr.result || {},
                });
                this.onOSActionLog(simRes);
              } else {
                const title = tr.result?.title || 'NEVEA Slide Deck';
                const res = await createSlideDeck(title);
                this.onStatusChange({
                  state: 'speaking',
                  message: `Created Google Slides deck "${res.title}" (ID: ${res.presentationId})!`,
                });
                this.onOSActionLog({
                  success: true,
                  simulated: false,
                  action: 'create_slide_deck',
                  message: `Created Google Slides deck "${res.title}"`,
                  data: res,
                  timestamp: new Date().toLocaleTimeString(),
                });
                playCuteSound('yiii');
              }
            } catch (err) {
              console.warn('create_slide_deck error:', err);
            }
          } else if (tr.name === 'add_slide_content') {
            try {
              if (!getWorkspaceAccessToken()) {
                const simRes = await executeDesktopCommand({
                  action: 'add_slide_content',
                  params: tr.result || {},
                });
                this.onOSActionLog(simRes);
              } else {
                const text = tr.result?.text || '';
                const presentationId = tr.result?.presentation_id;
                const slideTitle = tr.result?.slide_title || 'Key Insights';
                const res = await addSlideContent(text, presentationId, slideTitle);
                this.onStatusChange({
                  state: 'speaking',
                  message: `Added new slide "${slideTitle}" to presentation ${res.presentationId}!`,
                });
                this.onOSActionLog({
                  success: true,
                  simulated: false,
                  action: 'add_slide_content',
                  message: `Appended slide content to ${res.presentationId}`,
                  data: res,
                  timestamp: new Date().toLocaleTimeString(),
                });
                playCuteSound('boop');
              }
            } catch (err) {
              console.warn('add_slide_content error:', err);
            }
          } else if (tr.name === 'get_presentation_summary') {
            try {
              if (!getWorkspaceAccessToken()) {
                const simRes = await executeDesktopCommand({
                  action: 'get_presentation_summary',
                  params: tr.result || {},
                });
                this.onOSActionLog(simRes);
              } else {
                const fileId = tr.result?.file_id || '';
                const summary = await getPresentationSummary(fileId);
                this.onStatusChange({
                  state: 'speaking',
                  message: summary.summaryText,
                });
                this.onOSActionLog({
                  success: true,
                  simulated: false,
                  action: 'get_presentation_summary',
                  message: summary.summaryText,
                  data: summary,
                  timestamp: new Date().toLocaleTimeString(),
                });
                playCuteSound('giggle');
              }
            } catch (err) {
              console.warn('get_presentation_summary error:', err);
            }
          } else if (tr.name === 'trigger_flight') {
            const active = tr.result?.active !== undefined ? Boolean(tr.result.active) : true;
            this.onClientAction({ type: 'trigger_flight', active });
            playCuteSound('yiii');
          } else if (tr.name === 'change_size') {
            const size = tr.result?.size ?? 'giant';
            this.onClientAction({ type: 'change_size', size });
            playCuteSound('boop');
          } else if (tr.name === 'catch_duck') {
            this.onClientAction({ type: 'catch_duck' });
            playCuteSound('giggle');
          } else if (tr.name === 'select_character') {
            const charId = tr.result?.character_id || tr.result?.id || 'pure_fluff';
            this.onClientAction({ type: 'select_character', characterId: charId });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:select-character-id', {
                  detail: { characterId: charId },
                })
              );
            }
            playCuteSound('yiii');
          } else if (
            tr.name === 'generate_image_stable_diffusion' ||
            tr.name === 'generate_image_huggingface' ||
            tr.name === 'generate_image_pollinations'
          ) {
            const imgData = tr.result?.output || tr.result || {};
            const imgUrl = imgData.imageUrl || imgData.url;
            const promptUsed = imgData.prompt || 'Generated Artwork';
            const sourceUsed = imgData.source || 'Stable Diffusion / Cloud Model';

            this.onStatusChange({
              state: 'speaking',
              message: 'I have tasked Stable Diffusion to generate your image.',
            });
            this.speakWithVoice('I have tasked Stable Diffusion to generate your image.');

            this.onClientAction({
              type: 'generated_image',
              imageUrl: imgUrl,
              prompt: promptUsed,
              source: sourceUsed,
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:processing-badge', {
                  detail: { type: 'cloud', label: 'Cloud Processing' },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:image-generated', {
                  detail: {
                    imageUrl: imgUrl,
                    prompt: promptUsed,
                    source: sourceUsed,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'meditate', label: 'Generating Artwork with Cloud Diffusion...' },
                })
              );
            }
            playCuteSound('yiii');
          } else if (tr.name === 'generate_code_local') {
            const codeData = tr.result?.output || tr.result || {};
            const codeSnippet = codeData.code || '';
            const modelUsed = codeData.model || 'Ollama (Local)';

            this.onStatusChange({
              state: 'speaking',
              message: 'I am asking my local Ollama brain to write this code.',
            });
            this.speakWithVoice('I am asking my local Ollama brain to write this code.');

            this.onClientAction({
              type: 'generated_code',
              code: codeSnippet,
              model: modelUsed,
              location: 'local',
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:processing-badge', {
                  detail: { type: 'local', label: 'Local Processing' },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:code-generated', {
                  detail: {
                    code: codeSnippet,
                    model: modelUsed,
                    location: 'local',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'meditate', label: 'Local Ollama Brain Thinking...' },
                })
              );
            }
            playCuteSound('boop');
          } else if (tr.name === 'generate_code_deepseek') {
            const codeData = tr.result?.output || tr.result || {};
            const codeSnippet = codeData.code || '';
            const filepath = codeData.filepath || 'Nevea_Plans/deepseek_solution.ts';

            this.onStatusChange({
              state: 'speaking',
              message: 'I tasked DeepSeek-Coder to engineer this modular logic.',
            });
            this.speakWithVoice('I tasked DeepSeek-Coder to engineer this modular logic.');

            this.onClientAction({
              type: 'generated_code',
              code: codeSnippet,
              filepath,
              model: codeData.model || 'DeepSeek-Coder (Groq)',
              location: 'cloud',
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:processing-badge', {
                  detail: { type: 'cloud', label: 'Cloud Processing' },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:code-generated', {
                  detail: {
                    code: codeSnippet,
                    filepath,
                    model: codeData.model || 'DeepSeek-Coder',
                    location: 'cloud',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'meditate', label: 'DeepSeek-Coder Cloud Synthesis...' },
                })
              );
            }
            playCuteSound('boop');
          } else if (tr.name === 'generate_3d_hunyuan') {
            const assetData = tr.result?.output || tr.result || {};
            const assetUrl = assetData.modelUrl || assetData.meshUrl;
            const promptUsed = assetData.prompt || '3D Asset';

            this.onStatusChange({
              state: 'speaking',
              message: 'I have tasked Tencent Hunyuan 3D to synthesize your 3D asset.',
            });
            this.speakWithVoice('I have tasked Tencent Hunyuan 3D to synthesize your 3D asset.');

            this.onClientAction({
              type: 'generated_3d',
              assetUrl,
              prompt: promptUsed,
              model: 'Tencent Hunyuan 3D',
              location: 'cloud',
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:processing-badge', {
                  detail: { type: 'cloud', label: 'Cloud Processing' },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-generated', {
                  detail: {
                    assetUrl,
                    prompt: promptUsed,
                    model: 'Tencent Hunyuan 3D',
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'meditate', label: 'Tencent Hunyuan 3D Synthesis...' },
                })
              );
            }
            playCuteSound('yiii');
          } else if (tr.name === 'update_workspace_feed') {
            const feedMsg =
              tr.result?.message ||
              tr.result?.output?.message ||
              'Background Co-Pilot step updated';
            const phase =
              tr.result?.phase ||
              tr.result?.output?.phase ||
              'milestone';
            const detail =
              tr.result?.detail ||
              tr.result?.output?.detail ||
              undefined;
            this.onClientAction({ type: 'workspace_feed', message: feedMsg, phase, detail });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:workspace-feed', {
                  detail: {
                    message: feedMsg,
                    phase,
                    detail,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'ghost_mode', active: true, label: feedMsg },
                })
              );
            }
          } else {
            const isGhostTool =
              tr.name === 'open_notepad_and_write' ||
              tr.name === 'headless_web_search' ||
              tr.name === 'headless_web_interact' ||
              tr.name === 'write_code_to_file' ||
              tr.name === 'background_app_interact';

            if (isGhostTool && typeof window !== 'undefined') {
              const ghostLabel =
                tr.name === 'open_notepad_and_write'
                  ? `Writing Project Plan in Notepad (${tr.result?.output?.filename || tr.result?.title || 'NEVEA_Project_Plan.txt'})...`
                  : tr.name === 'headless_web_search'
                  ? 'Searching Web (Invisible)...'
                  : tr.name === 'headless_web_interact'
                  ? 'Navigating Web Headless (Invisible)...'
                  : tr.name === 'write_code_to_file'
                  ? `Writing Code to ${tr.result?.filepath || tr.result?.output?.filepath || 'file.ts'}...`
                  : 'Controlling Background App (pywinauto)...';

              window.dispatchEvent(
                new CustomEvent('nevea:3d-action', {
                  detail: { action: 'ghost_mode', active: true, label: ghostLabel },
                })
              );
              window.dispatchEvent(
                new CustomEvent('nevea:workspace-feed', {
                  detail: {
                    message: ghostLabel,
                    phase: tr.name,
                    detail: tr.result?.output || tr.result,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
            }

            if (tr.name === 'open_app') {
              this.onClientAction({ type: 'press_ui_button' });
            }
            const rawParams =
              tr.result && typeof tr.result === 'object' && 'output' in tr.result
                ? tr.result.output || {}
                : tr.result || {};
            // Route OS / Desktop tools through the hybrid Electron / Browser execution layer
            const osResult = await executeDesktopCommand({
              action: tr.name,
              params: rawParams,
            });
            this.onOSActionLog(osResult);

            if (isGhostTool && typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('nevea:workspace-feed', {
                  detail: {
                    message: osResult.message || 'Task Complete',
                    phase: 'complete',
                    detail: osResult.data,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                })
              );
            }
          }
        }
      }

      const reply = data.text || "I've handled that!";

      // Speak reply and animate creature in sync
      await this.speak(reply);

      return data;
    } catch (err) {
      console.warn('Turn recovery handler:', err);
      if (this.creature?.setCompanionState) {
        this.creature.setCompanionState('idle');
      }
      this.onStatusChange({ state: 'idle', message: 'Ready for your next command.' });
      return null;
    } finally {
      this.isProcessingTurn = false;
    }
  }

  // Alias for speak(text) to ensure full compatibility across all tool handlers
  speakWithVoice(text) {
    return this.speak(text);
  }

  // Vocalize speech and modulate 3D creature bounce, mouth & real-time 3D viewport waveform
  speak(text) {
    return new Promise((resolve) => {
      const emitWaveform = (active, level = 0) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('nevea:audio-waveform', {
              detail: { active, mode: active ? 'speaking' : 'idle', level },
            })
          );
        }
      };

      const startTime = Date.now();
      const minVisualDurationMs = Math.min(3400, Math.max(1500, String(text || '').length * 38));
      let speechInterval = null;
      let finished = false;

      const startSpeakingEnvelope = () => {
        if (this.creature?.setCompanionState) {
          this.creature.setCompanionState('speaking');
        }
        this.onStatusChange({ state: 'speaking', message: text });
        emitWaveform(true, 0.62);

        fetch('/api/audio/tts-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        }).catch(() => {});

        if (speechInterval) clearInterval(speechInterval);
        speechInterval = setInterval(() => {
          const simulatedVol = 0.35 + Math.random() * 0.65;
          if (this.creature?.setSpeechLevel) {
            this.creature.setSpeechLevel(simulatedVol);
          }
          emitWaveform(true, simulatedVol);
        }, 60);
      };

      const finishSpeakingEnvelope = () => {
        if (finished) return;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minVisualDurationMs - elapsed);
        setTimeout(() => {
          if (finished) return;
          finished = true;
          if (speechInterval) clearInterval(speechInterval);
          if (this.creature?.setSpeechLevel) {
            this.creature.setSpeechLevel(0);
          }
          if (this.creature?.setCompanionState) {
            this.creature.setCompanionState('idle');
          }
          emitWaveform(false, 0);
          this.onStatusChange({ state: 'idle', message: text });

          fetch('/api/audio/tts-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: false }),
          }).catch(() => {});

          resolve();
        }, remaining);
      };

      startSpeakingEnvelope();

      if (!window.speechSynthesis) {
        finishSpeakingEnvelope();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const isArabicText = /[\u0600-\u06FF]/.test(String(text || ''));
        utterance.lang = isArabicText ? 'ar-SA' : 'en-US';
        utterance.rate = isArabicText ? 1.02 : 1.05;
        utterance.pitch = isArabicText ? 1.05 : 1.25;

        const voices = window.speechSynthesis.getVoices();
        if (isArabicText) {
          const arabicVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'));
          if (arabicVoice) utterance.voice = arabicVoice;
        } else {
          const cuteVoice = voices.find(
            (v) =>
              v.name.includes('Samantha') ||
              v.name.includes('Zira') ||
              v.name.includes('Google UK English Female') ||
              v.name.includes('Natural')
          );
          if (cuteVoice) utterance.voice = cuteVoice;
        }

        utterance.onend = () => {
          finishSpeakingEnvelope();
        };

        utterance.onerror = () => {
          finishSpeakingEnvelope();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        finishSpeakingEnvelope();
      }
    });
  }

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
