import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type CompanionMoodState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'sleepy' | string;

export interface ViewportAudioWaveformProps {
  companionState?: CompanionMoodState;
  isSystemAudioOn?: boolean;
  systemAudioLevel?: number;
  getLiveAmplitude?: () => number;
  isCinemaHidden?: boolean;
  onToggleListen?: () => void;
}

interface WaveformEventDetail {
  active?: boolean;
  mode?: 'speaking' | 'listening' | 'system' | 'idle';
  level?: number;
}

/**
 * Compact, real-time monochromatic audio visualization component integrated
 * directly over the 3D viewport canvas. Displays high-DPI 60fps time-domain
 * waveforms and symmetric frequency bars whenever NEVEA is speaking or
 * listening to external voice/system audio input.
 */
export const ViewportAudioWaveform: React.FC<ViewportAudioWaveformProps> = ({
  companionState = 'idle',
  isSystemAudioOn = false,
  systemAudioLevel = 0,
  getLiveAmplitude,
  isCinemaHidden = false,
  onToggleListen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [transientWave, setTransientWave] = useState<{
    active: boolean;
    mode: 'speaking' | 'listening' | 'system' | 'idle';
    level: number;
  }>({
    active: false,
    mode: 'idle',
    level: 0,
  });
  const [dbReadout, setDbReadout] = useState<string>('-∞ dB');

  // Keep latest reactive values in refs for the 60fps requestAnimationFrame loop
  const stateRef = useRef({
    companionState,
    isSystemAudioOn,
    systemAudioLevel,
    transientActive: false,
    transientMode: 'idle' as 'speaking' | 'listening' | 'system' | 'idle',
    transientLevel: 0,
  });

  useEffect(() => {
    stateRef.current.companionState = companionState;
    stateRef.current.isSystemAudioOn = isSystemAudioOn;
    stateRef.current.systemAudioLevel = systemAudioLevel;
  }, [companionState, isSystemAudioOn, systemAudioLevel]);

  useEffect(() => {
    let decayTimer: ReturnType<typeof setTimeout> | null = null;

    const handleAudioWaveform = (evt: Event) => {
      const detail = ((evt as CustomEvent<WaveformEventDetail>).detail || {}) as WaveformEventDetail;
      const isActive = Boolean(detail.active);
      const mode = detail.mode || 'speaking';
      const level = typeof detail.level === 'number' ? detail.level : isActive ? 0.55 : 0;

      stateRef.current.transientActive = isActive;
      stateRef.current.transientMode = mode;
      stateRef.current.transientLevel = level;

      setTransientWave({ active: isActive, mode, level });

      if (decayTimer) clearTimeout(decayTimer);
      if (isActive) {
        decayTimer = setTimeout(() => {
          stateRef.current.transientActive = false;
          stateRef.current.transientLevel = 0;
          setTransientWave((prev) => ({ ...prev, active: false, level: 0 }));
        }, 1800);
      }
    };

    const handleSystemAudio = (evt: Event) => {
      const detail = (evt as CustomEvent).detail || {};
      if (typeof detail.rms === 'number') {
        stateRef.current.systemAudioLevel = detail.rms;
      }
    };

    window.addEventListener('nevea:audio-waveform', handleAudioWaveform);
    window.addEventListener('nevea:system-audio-level', handleSystemAudio);

    return () => {
      if (decayTimer) clearTimeout(decayTimer);
      window.removeEventListener('nevea:audio-waveform', handleAudioWaveform);
      window.removeEventListener('nevea:system-audio-level', handleSystemAudio);
    };
  }, []);

  // Determine active mode: speaking, listening, or external system audio input
  const isSpeaking =
    companionState === 'speaking' ||
    (transientWave.active && transientWave.mode === 'speaking');
  const isListening =
    companionState === 'listening' ||
    (transientWave.active && transientWave.mode === 'listening');
  const isExternalInputActive =
    isListening || isSystemAudioOn || systemAudioLevel > 0.015;
  const isWaveformActive = isSpeaking || isExternalInputActive || transientWave.active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;
    let smoothedEnergy = 0;
    let frameCount = 0;

    const barCount = 28;
    const barValues = new Float32Array(barCount);

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      frameCount += 1;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = 164;
      const height = 22;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const {
        companionState: cState,
        isSystemAudioOn: sysOn,
        systemAudioLevel: sysRms,
        transientActive,
        transientLevel,
      } = stateRef.current;

      const liveCreatureAmp = getLiveAmplitude ? getLiveAmplitude() : 0;

      // Compute target acoustic energy (0.0 -> 1.0)
      let rawTarget = Math.max(liveCreatureAmp * 1.35, sysRms * 1.8, transientLevel);

      if (cState === 'speaking' || (transientActive && stateRef.current.transientMode === 'speaking')) {
        const syllabicEnvelope =
          0.38 +
          0.28 * Math.sin(phase * 3.4) +
          0.18 * Math.cos(phase * 7.1) +
          0.12 * Math.sin(phase * 13.7);
        rawTarget = Math.max(rawTarget, Math.max(0.18, syllabicEnvelope));
      } else if (cState === 'listening') {
        const micPulse =
          0.26 +
          0.22 * Math.sin(phase * 2.8) +
          0.15 * Math.cos(phase * 6.3);
        rawTarget = Math.max(rawTarget, Math.max(0.15, micPulse));
      } else if (sysOn) {
        const ambientListen = 0.09 + 0.05 * Math.sin(phase * 2.1);
        rawTarget = Math.max(rawTarget, ambientListen);
      }

      const clampedTarget = Math.min(1.0, Math.max(0.0, rawTarget));
      const smoothing = clampedTarget > smoothedEnergy ? 0.28 : 0.14;
      smoothedEnergy += (clampedTarget - smoothedEnergy) * smoothing;

      phase += 0.085 + smoothedEnergy * 0.14;

      const centerY = height / 2;

      // Update decibel telemetry every 6 frames (~10Hz) for crisp readability
      if (frameCount % 6 === 0) {
        if (smoothedEnergy < 0.02) {
          setDbReadout('-58.0 dB');
        } else {
          const db = Math.max(-48, Math.min(-0.4, 20 * Math.log10(smoothedEnergy)));
          setDbReadout(`${db.toFixed(1)} dB`);
        }
      }

      // 1. Subtle center horizon reference hairline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // 2. Smooth background oscillating carrier sine wave
      if (smoothedEnergy > 0.015) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const normX = x / width;
          const windowEnvelope = Math.sin(normX * Math.PI);
          const waveY =
            Math.sin(normX * Math.PI * 5.5 - phase * 1.8) * 0.6 +
            Math.cos(normX * Math.PI * 11.0 + phase * 2.4) * 0.4;
          const y = centerY + waveY * windowEnvelope * smoothedEnergy * (height * 0.42);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 3. Crisp Symmetric Monochromatic Frequency & Time-Domain Bars
      const totalSpacing = width / barCount;
      const barWidth = Math.max(1.8, totalSpacing * 0.46);

      for (let i = 0; i < barCount; i++) {
        const norm = i / (barCount - 1);
        // Gaussian-like bell window so edges taper gracefully
        const bellWindow = Math.sin(norm * Math.PI);

        const h1 = Math.sin(phase * 2.2 + i * 0.52);
        const h2 = Math.cos(phase * 3.7 - i * 0.85);
        const h3 = Math.sin(phase * 6.1 + i * 1.35);
        const harmonicMix = Math.abs(h1 * 0.5 + h2 * 0.32 + h3 * 0.18);

        const targetBar =
          smoothedEnergy * (0.22 + harmonicMix * 0.95) * (0.35 + bellWindow * 0.65);
        barValues[i] += (targetBar - barValues[i]) * 0.32;

        const barHalfHeight = Math.max(1.0, Math.min(centerY - 1.5, barValues[i] * (centerY - 1)));
        const x = i * totalSpacing + (totalSpacing - barWidth) * 0.5;

        const alpha = Math.min(
          0.96,
          0.22 + barValues[i] * 0.85 + bellWindow * smoothedEnergy * 0.25
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;

        // Draw rounded vertical bar centered at centerY
        const topY = centerY - barHalfHeight;
        const fullH = barHalfHeight * 2;
        ctx.beginPath();
        ctx.roundRect(x, topY, barWidth, fullH, 1);
        ctx.fill();
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [getLiveAmplitude]);

  const modeLabel = isSpeaking
    ? 'AGENT SPEAKING'
    : isListening
    ? 'LISTENING · MIC'
    : isSystemAudioOn
    ? 'AUDIO MONITOR'
    : 'AUDIO STANDBY';

  return (
    <div
      className={`absolute bottom-[104px] left-1/2 -translate-x-1/2 z-20 transition-all duration-200 pointer-events-none ${
        isCinemaHidden ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isWaveformActive ? 'active-waveform' : 'standby-waveform'}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{
            opacity: isWaveformActive ? 1 : 0.42,
            y: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onToggleListen}
          title="Real-Time 3D Viewport Audio Waveform Telemetry (Click to toggle voice input)"
          className={`pointer-events-auto hover:opacity-100 transition-opacity cursor-pointer h-8 px-3 rounded-xl bg-[#050505]/80 backdrop-blur-md border flex items-center gap-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.75)] ${
            isWaveformActive
              ? 'border-white/25 shadow-[0_0_24px_rgba(255,255,255,0.10)]'
              : 'border-white/10'
          }`}
        >
          {/* Minimalist Monochrome Status Dot & Mode Tag */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              {isWaveformActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
              )}
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isWaveformActive ? 'bg-white' : 'bg-white/40'
                }`}
              />
            </span>
            <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.16em] text-white/85 whitespace-nowrap">
              {modeLabel}
            </span>
          </div>

          {/* Hairline Vertical Divider */}
          <div className="h-3.5 w-[1px] bg-white/12 shrink-0" />

          {/* Real-Time 60fps Monochromatic Oscilloscope & Frequency Waveform Canvas */}
          <canvas
            ref={canvasRef}
            className="w-[164px] h-[22px] block shrink-0"
            aria-label="Real-time monochromatic audio waveform"
          />

          {/* Tabular Monospace Acoustic Level Telemetry */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <div className="h-3.5 w-[1px] bg-white/12 shrink-0" />
            <span className="text-[9px] font-mono tabular-nums text-white/55 w-[48px] text-right">
              {dbReadout}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ViewportAudioWaveform;
