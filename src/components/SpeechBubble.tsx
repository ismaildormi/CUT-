import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Code2, X } from 'lucide-react';

export interface SpeechBubbleProps {
  text: string | null;
  triggerKey?: number;
  actionLabel?: string | null;
  onActionClick?: () => void;
  onDismiss?: () => void;
  durationMs?: number;
}

/**
 * Glassmorphic Speech Bubble (Framer Motion)
 * Pops up directly above NEVEA's 3D model on the canvas when she speaks or
 * detects clipboard code, showing the text and smoothly fading away after 5 seconds.
 */
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  triggerKey = 0,
  actionLabel = null,
  onActionClick,
  onDismiss,
  durationMs = 5000,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!text || !text.trim()) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [text, triggerKey, durationMs]);

  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          key={`${triggerKey}-${text.slice(0, 24)}`}
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 380, damping: 25 }}
          title="Drag to reposition Live Voice notification"
          className="pointer-events-auto cursor-grab active:cursor-grabbing fixed top-16 left-1/2 -translate-x-1/2 z-[9995] max-w-md w-[90%] sm:w-auto sm:min-w-[280px]"
        >
          <div className="relative px-4 py-3 rounded-2xl glass-monochrome bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.75),0_0_24px_rgba(255,255,255,0.12)] text-white">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white text-[#050505] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                <Sparkles size={12} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                    NEVEA · LIVE VOICE
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVisible(false);
                      onDismiss?.();
                    }}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer"
                    aria-label="Dismiss speech bubble"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-white/95 font-normal break-words line-clamp-4">
                  {text}
                </p>

                {actionLabel && onActionClick && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onActionClick();
                      setVisible(false);
                    }}
                    className="mt-2.5 px-3 py-1.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                  >
                    <Code2 size={12} strokeWidth={2} />
                    <span>{actionLabel}</span>
                  </motion.button>
                )}
              </div>
            </div>

            {/* Downward pointer tail pointing directly at NEVEA's 3D head */}
            <div className=" -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-[#0A0A0A]/90 border-r border-b border-white/20 absolute" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
