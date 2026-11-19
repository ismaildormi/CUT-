import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crosshair } from 'lucide-react';

export interface GhostAction {
  id: string;
  x: number;
  y: number;
  label?: string;
  type?: 'click' | 'type' | 'scroll' | 'hover' | 'move';
  windowTitle?: string;
  timestamp?: number;
}

/**
 * NEVEA Independent Ghost Cursor
 * - Completely independent of the physical user mouse (never listens to physical mousemove).
 * - Controlled exclusively by the Boss AI / AgentOS via IPC ('ghost-cursor:move') or custom events ('nevea:ghost-cursor').
 * - Stays locked at the exact (X, Y) coordinates where the AI placed it even if the user moves their physical mouse.
 */
export const GhostCursor: React.FC = () => {
  const [ghostState, setGhostState] = useState<GhostAction>({
    id: 'nevea_ghost_init',
    x: 260,
    y: 180,
    label: 'NEVEA Ghost Cursor Ready',
    type: 'hover',
    timestamp: Date.now(),
  });
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isClicking, setIsClicking] = useState<boolean>(false);

  useEffect(() => {
    const applyGhostUpdate = (payload: any) => {
      if (!payload || typeof payload.x !== 'number' || typeof payload.y !== 'number') {
        return;
      }

      const boundedX = Math.max(12, Math.min(window.innerWidth - 40, Number(payload.x)));
      const boundedY = Math.max(12, Math.min(window.innerHeight - 40, Number(payload.y)));
      const actionType = payload.type || 'click';

      setGhostState({
        id: `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: boundedX,
        y: boundedY,
        label:
          payload.label ||
          (payload.windowTitle
            ? `${actionType.toUpperCase()} · ${payload.windowTitle}`
            : `NEVEA Ghost ${actionType.toUpperCase()} (${Math.round(boundedX)}, ${Math.round(boundedY)})`),
        type: actionType,
        windowTitle: payload.windowTitle,
        timestamp: Date.now(),
      });
      setIsVisible(true);

      if (actionType === 'click') {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 450);
      }
    };

    // 1. Listen for DOM CustomEvents dispatched by the React / Node bridge
    const handleDomGhostEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      applyGhostUpdate(detail);
    };

    window.addEventListener('nevea:ghost-cursor', handleDomGhostEvent);

    // 2. Listen for Electron IPC coordinates streamed from backend/agent_server.py
    let unsubscribeIPC: (() => void) | undefined;
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.onGhostCursorMove === 'function') {
      unsubscribeIPC = electronAPI.onGhostCursorMove((coords: any) => {
        applyGhostUpdate(coords);
      });
    }

    return () => {
      window.removeEventListener('nevea:ghost-cursor', handleDomGhostEvent);
      if (typeof unsubscribeIPC === 'function') {
        unsubscribeIPC();
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="nevea-independent-ghost-cursor"
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.6, x: ghostState.x, y: ghostState.y }}
        animate={{
          opacity: 1,
          scale: isClicking ? 0.88 : 1,
          x: ghostState.x,
          y: ghostState.y,
        }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 320,
          mass: 0.6,
        }}
        className="fixed pointer-events-none z-[9975] flex items-start gap-2.5 select-none"
        style={{ left: 0, top: 0 }}
        aria-label="NEVEA Independent Ghost Cursor"
      >
        {/* Distinctive NEVEA 3D-Styled Glowing Vector Cursor */}
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Telemetry Ring */}
          <motion.span
            animate={{
              scale: isClicking ? [1, 1.9, 1.2] : [1, 1.35, 1],
              opacity: isClicking ? [0.95, 0.2, 0.7] : [0.55, 0.2, 0.55],
            }}
            transition={{ duration: isClicking ? 0.4 : 2.0, repeat: Infinity }}
            className="absolute -inset-2.5 rounded-full border border-white/75 shadow-[0_0_24px_rgba(255,255,255,0.85)]"
          />

          {/* Custom NEVEA Cyber-Diamond Vector Pointer */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_14px_rgba(255,255,255,0.95)]"
          >
            {/* Primary Glowing Pointer Blade */}
            <path
              d="M4 3L27 13.5L16.5 17.5L12.5 28L4 3Z"
              fill="#FFFFFF"
              stroke="#050505"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Inner Monochrome Core */}
            <path
              d="M8.5 7.5L21 13.2L14.8 15.6L12.4 21.8L8.5 7.5Z"
              fill="#050505"
            />
            {/* Sentient Core Node */}
            <circle cx="13.5" cy="13.5" r="2.2" fill="#FFFFFF" />
          </svg>

          {/* Click Shockwave Ripple */}
          {isClicking && (
            <motion.span
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute -inset-3 rounded-full border-2 border-white shadow-[0_0_30px_#ffffff]"
            />
          )}
        </div>

        {/* Floating Monochrome Glass Telemetry Tag */}
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-2.5 py-1 rounded-xl bg-[#050505]/92 border border-white/35 backdrop-blur-xl text-[10px] font-mono text-white flex items-center gap-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)] whitespace-nowrap"
        >
          <Sparkles size={10} className="text-white animate-spin shrink-0" />
          <span className="font-semibold tracking-wider">{ghostState.label}</span>
          <span className="text-white/50 text-[9px] flex items-center gap-0.5">
            <Crosshair size={9} />
            {Math.round(ghostState.x)},{Math.round(ghostState.y)}
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
