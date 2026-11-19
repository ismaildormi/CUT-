import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export interface AgentCursorState {
  id: string;
  name: string;
  role: string;
  color: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  targetSelector?: string;
  action: 'idle' | 'moving' | 'clicking' | 'typing' | 'generating' | 'reading' | 'failed' | 'failover';
  status?: string;
  lock?: string;
  depends_on?: string | null;
  currentTask?: string;
  progress?: number;
  isClicking?: boolean;
  isPersistentCognitive?: boolean;
  failoverFrom?: string;
  timestamp: number;
}

interface AgentCursorProps {
  agent: AgentCursorState;
  showTrail?: boolean;
  onPositionChange?: (id: string, newX: number, newY: number) => void;
  onDismiss?: (id: string) => void;
}

/**
 * AgentCursor — Pure Monochrome High-Precision Micro-Cursor
 * Designed with Linear/Vercel/Figma aesthetic: compact, non-intrusive,
 * strictly monochrome (#FFFFFF / #D4D4D8 / #050505), never blocks the 3D companion or right sidebar.
 */
export const AgentCursor: React.FC<AgentCursorProps> = ({
  agent,
  onPositionChange,
  onDismiss,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const isFailed = agent.action === 'failed';
  const isFailover = agent.action === 'failover' || Boolean(agent.failoverFrom);
  const isClicking = agent.isClicking || agent.action === 'clicking';
  const isActiveTask = agent.action !== 'idle' && !isFailed;

  // Enforce strict monochrome palette
  const monochromeStroke = '#ffffff';
  const shortName = agent.name.replace(/^Agent\s+/i, '').split(' ')[0] || 'Agent';

  return (
    <motion.div
      key={`cursor-${agent.id}`}
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_e, info) => {
        setIsDragging(false);
        const nextX = Math.max(16, Math.min(window.innerWidth - 180, agent.x + info.offset.x));
        const nextY = Math.max(64, Math.min(window.innerHeight - 90, agent.y + info.offset.y));
        onPositionChange?.(agent.id, nextX, nextY);
      }}
      initial={{ opacity: 0, scale: 0.6, x: agent.x, y: agent.y }}
      animate={
        isDragging
          ? { opacity: 1, scale: 1.04 }
          : {
              opacity: isFailed ? 0.45 : isActiveTask ? 0.95 : 0.7,
              scale: isClicking ? 0.9 : 1,
              x: agent.x,
              y: agent.y,
            }
      }
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{
        type: 'spring',
        stiffness: 520,
        damping: 32,
        mass: 0.35,
      }}
      className="fixed z-15 flex items-center gap-1 select-none pointer-events-none"
      style={{ left: 0, top: 0 }}
      aria-label={`${shortName} - ${agent.role}`}
    >
      {/* 1. Sleek Monochrome Vector Cursor Blade */}
      <div className="relative flex items-center justify-center pointer-events-none">
        <svg
          width="16"
          height="16"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
        >
          <path
            d="M3 2L26 14.5L15.5 18L11.5 29L3 2Z"
            fill={monochromeStroke}
            stroke="#050505"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>

        <AnimatePresence>
          {isClicking && (
            <motion.span
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute -inset-2 rounded-full border border-white"
            />
          )}
        </AnimatePresence>

        {isFailover && (
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-white text-[#050505] flex items-center justify-center border border-black">
            <RefreshCw size={8} className="animate-spin" />
          </div>
        )}
      </div>

      {/* 2. Ultra-Compact Monochrome Micro-Badge (Never covers 3D companion face) */}
      <div
        className="group pointer-events-auto cursor-grab active:cursor-grabbing h-6 px-2 rounded-lg bg-[#080808]/90 border border-white/25 backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.85)] inline-flex items-center gap-1.5 max-w-[165px]"
        title={`${agent.name} · ${agent.currentTask || agent.role}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
        <span className="font-mono text-[10px] font-bold text-white tracking-tight uppercase shrink-0">
          {shortName}
        </span>
        {agent.currentTask && (
          <span className="font-mono text-[9px] text-white/60 truncate">
            · {agent.currentTask}
          </span>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(agent.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-white/45 hover:text-white transition-opacity cursor-pointer shrink-0"
            title="Hide cursor"
          >
            <X size={9} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
