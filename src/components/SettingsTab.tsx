import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  Power,
  Volume2,
  ShieldCheck,
  Sparkles,
  Info,
  Radio,
  Sliders,
  CheckCircle2,
  Laptop,
} from 'lucide-react';
import {
  getOmniscienceSettings,
  updateOmniscienceSettings,
  OmniscienceSettings,
} from '../services/omniscienceSettings';
import { playCuteSound } from '../services/audioSynth';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<OmniscienceSettings>({
    autoStartOnBoot: false,
    liveVisionEnabled: false,
    systemAudioEnabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [lastVisionComment, setLastVisionComment] = useState<string>('');

  useEffect(() => {
    getOmniscienceSettings().then((s) => setSettings(s));

    const handleSettingsChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.settings) {
        setSettings(detail.settings);
      }
    };

    const handleAudioLevel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.rms === 'number') {
        setAudioLevel(detail.rms);
      }
    };

    const handleVisionComment = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.comment) {
        setLastVisionComment(detail.comment);
      }
    };

    window.addEventListener('nevea:omniscience-change', handleSettingsChange);
    window.addEventListener('nevea:system-audio-level', handleAudioLevel);
    window.addEventListener('nevea:live-vision-comment', handleVisionComment);

    return () => {
      window.removeEventListener('nevea:omniscience-change', handleSettingsChange);
      window.removeEventListener('nevea:system-audio-level', handleAudioLevel);
      window.removeEventListener('nevea:live-vision-comment', handleVisionComment);
    };
  }, []);

  const handleToggle = async (key: keyof OmniscienceSettings) => {
    const nextVal = !settings[key];
    playCuteSound(nextVal ? 'boop' : 'squeak');
    setIsSaving(true);
    const updated = await updateOmniscienceSettings({ [key]: nextVal });
    setSettings(updated);
    setIsSaving(false);

    const labels: Record<keyof OmniscienceSettings, string> = {
      autoStartOnBoot: 'Auto-Start on Boot',
      liveVisionEnabled: 'Live Vision (3s loop)',
      systemAudioEnabled: 'System Audio Loopback',
    };
    setFeedback(`${labels[key]} ${nextVal ? 'Activated' : 'Deactivated'}`);
    setTimeout(() => setFeedback(''), 2500);
  };

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Header Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Sliders size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wide">JARVIS OMNISCIENT PROTOCOL</h4>
            <p className="text-[10px] text-white/60">Desktop Awareness & Privacy Control</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-mono text-white/80">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span>Local Privacy Gate</span>
        </div>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2 rounded-lg bg-white/10 border border-white/20 text-[11px] font-mono text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 size={13} />
          <span>{feedback}</span>
        </motion.div>
      )}

      {/* 3 Omniscient Toggles */}
      <div className="flex flex-col gap-2.5">
        {/* Toggle 1: Auto-Start on PC Boot */}
        <div className="p-3 rounded-xl glass-card-monochrome border border-white/15 hover:border-white/30 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                  settings.autoStartOnBoot
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                <Power size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-wide">
                  Auto-Start NEVEA on PC Boot
                </span>
                <span className="text-[10px] text-white/55 leading-snug">
                  Launches NEVEA transparently on Windows/macOS login via electron-store.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('autoStartOnBoot')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.autoStartOnBoot ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                  settings.autoStartOnBoot
                    ? 'translate-x-5 bg-black'
                    : 'translate-x-0 bg-white/70'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Toggle 2: Enable Live Vision */}
        <div className="p-3 rounded-xl glass-card-monochrome border border-white/15 hover:border-white/30 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                  settings.liveVisionEnabled
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                <Eye size={14} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Enable Live Vision (Continuous Screen Awareness)
                  </span>
                  {settings.liveVisionEnabled && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-mono border border-emerald-500/30 animate-pulse">
                      3S ACTIVE
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/55 leading-snug">
                  Samples screen every 3s. Compares perceptual pixel hashes to only dispatch on
                  significant changes.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('liveVisionEnabled')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.liveVisionEnabled ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                  settings.liveVisionEnabled
                    ? 'translate-x-5 bg-black'
                    : 'translate-x-0 bg-white/70'
                }`}
              />
            </button>
          </div>

          {settings.liveVisionEnabled && lastVisionComment && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-start gap-1.5 text-[10px] text-white/80">
              <Sparkles size={11} className="text-white shrink-0 mt-0.5" />
              <span className="italic line-clamp-2 font-mono">"{lastVisionComment}"</span>
            </div>
          )}
        </div>

        {/* Toggle 3: Enable System Audio Hearing */}
        <div className="p-3 rounded-xl glass-card-monochrome border border-white/15 hover:border-white/30 transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                  settings.systemAudioEnabled
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                    : 'bg-white/5 text-white/60 border-white/10'
                }`}
              >
                <Volume2 size={14} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Enable System Audio Hearing (Listen to Videos/Calls)
                  </span>
                  {settings.systemAudioEnabled && (
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono border border-cyan-500/30 animate-pulse">
                      LOOPBACK ON
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/55 leading-snug">
                  Captures system audio via soundcard loopback and streams 16kHz PCM to Gemini Live.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggle('systemAudioEnabled')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.systemAudioEnabled ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                  settings.systemAudioEnabled
                    ? 'translate-x-5 bg-black'
                    : 'translate-x-0 bg-white/70'
                }`}
              />
            </button>
          </div>

          {settings.systemAudioEnabled && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-300">
                <Radio size={10} className="animate-pulse" />
                <span>Audio Waveform Activity:</span>
              </div>
              <div className="flex items-center gap-0.5 h-3">
                {[...Array(12)].map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-cyan-400 transition-all duration-75"
                    style={{
                      height: `${Math.max(3, Math.min(14, audioLevel * 20 * (1 + (i % 3) * 0.4)))}px`,
                      opacity: audioLevel > 0.02 ? 0.9 : 0.25,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2 text-[10px] text-white/60 leading-relaxed">
        <Info size={13} className="shrink-0 mt-0.5 text-white/80" />
        <div>
          <strong className="text-white/80">Privacy Protocol:</strong> All settings are saved
          locally to <code className="text-white/90">electron-store</code>. Screen samples are
          evaluated on-device via fast perceptual hashes and only transmitted when significant window
          or task transitions occur.
        </div>
      </div>
    </div>
  );
};
