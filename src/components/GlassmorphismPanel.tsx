import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Eye, Database, X, Shield, Send, Sparkles } from 'lucide-react';

interface GlassmorphismPanelProps {
  creature?: any;
  onSendTurn: (prompt: string, includeScreen?: boolean) => Promise<any>;
  onToggleVoice: () => void;
  statusMessage?: string;
  companionState?: string;
}

export const GlassmorphismPanel: React.FC<GlassmorphismPanelProps> = ({
  creature,
  onSendTurn,
  onToggleVoice,
  statusMessage = "Hi! I'm Nevea, your sentient desktop companion.",
  companionState = 'idle',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);

  // Permission Gate State
  const [pendingPermission, setPendingPermission] = useState<{
    toolName: string;
    details: string;
    resolve: (granted: boolean) => void;
  } | null>(null);

  // Expose global permission requester
  React.useEffect(() => {
    (window as any).neveaRequestPermission = (toolName: string, details: string) => {
      return new Promise((resolve) => {
        setPendingPermission({ toolName, details, resolve });
      });
    };
  }, []);

  const handleStateClick = (state: string) => {
    if (creature?.setCompanionState) {
      creature.setCompanionState(state);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const query = prompt;
    setPrompt('');
    const needsVision = /screen|window|desktop|look|see|inspect/i.test(query);
    await onSendTurn(query, needsVision);
  };

  const handleFetchMemory = async () => {
    setShowMemory(!showMemory);
    if (!showMemory) {
      try {
        const res = await fetch('/api/memory');
        const raw = await res.text();
        const data = raw ? JSON.parse(raw) : { memories: [] };
        setMemories(data.memories || []);
      } catch {
        setMemories([]);
      }
    }
  };

  return (
    <>
      {/* Floating Reopen Widget */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 h-12 px-4 rounded-full bg-slate-900/80 backdrop-blur-xl border border-sky-400/30 text-white flex items-center gap-3 shadow-2xl shadow-sky-500/20 z-50 cursor-pointer"
        >
          <img src="/logo.svg" alt="Nevea" className="w-8 h-8 rounded-full" />
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wider">NEVEA</span>
        </motion.button>
      )}

      {/* Main Draggable Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed bottom-6 left-6 w-[360px] max-w-[calc(100vw-32px)] bg-slate-950/80 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl shadow-black/80 z-50 text-slate-100 flex flex-col gap-3 font-sans select-none"
          >
            {/* Header Drag Handle */}
            <div className="flex items-center justify-between cursor-grab active:cursor-grabbing pb-1 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img src="/logo.svg" alt="Nevea" className="w-9 h-9 rounded-xl shadow-lg shadow-sky-500/30" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 border-2 border-slate-900" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold tracking-wider text-white">NEVEA</h2>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      OS BRAIN
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Sentient 3D Desktop Fluff</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  companionState === 'speaking' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse' :
                  companionState === 'listening' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse' :
                  companionState === 'thinking' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse' :
                  'bg-sky-500/20 text-sky-400 border-sky-500/30'
                }`}>
                  {companionState.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Audio Waveform */}
            <div className={`flex items-center justify-center gap-1 h-5 transition-opacity ${
              companionState === 'speaking' ? 'opacity-100' : 'opacity-25'
            }`}>
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className={`w-0.5 rounded-full bg-gradient-to-t from-sky-500 to-sky-300 transition-all ${
                    companionState === 'speaking' ? 'h-4 animate-pulse' : 'h-1.5'
                  }`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>

            {/* Emotion States */}
            <div className="flex gap-1 p-1 bg-black/30 rounded-full border border-white/5">
              {['idle', 'listening', 'thinking', 'speaking', 'sleeping'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStateClick(s)}
                  className={`flex-1 py-1 rounded-full text-[11px] font-semibold capitalize transition-all ${
                    companionState === s
                      ? 'bg-white text-slate-900 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.slice(0, 4)}
                </button>
              ))}
            </div>

            {/* Bubble */}
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 leading-relaxed max-h-16 overflow-y-auto">
              "{statusMessage}"
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleVoice}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all"
              >
                <Mic size={14} /> Voice
              </button>
              <button
                type="button"
                onClick={() => onSendTurn('Inspect my desktop screen and describe what you see', true)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-all"
              >
                <Eye size={14} /> Vision
              </button>
              <button
                type="button"
                onClick={handleFetchMemory}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-white/5 transition-all"
              >
                <Database size={14} /> Memory
              </button>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Nevea (e.g. 'Open Chrome', 'Type hello')"
                className="w-full py-2 pl-3 pr-9 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                className="absolute right-1.5 w-6 h-6 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center transition-all"
              >
                <Send size={12} />
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1">
              {[
                { label: '👁️ See Screen', cmd: 'Look at my screen' },
                { label: '🌐 Open Browser', cmd: 'Open Google Chrome' },
                { label: '🧠 Save Fact', cmd: 'Remember that I love matcha mochi' },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onSendTurn(q.cmd, q.cmd.includes('screen'))}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Memory Drawer */}
            {showMemory && (
              <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-sky-400/20 max-h-40 overflow-y-auto flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-sky-400">ChromaDB Vector Store</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      SIMULATED MEMORY ACTIVE
                    </span>
                  </div>
                  <button type="button" onClick={() => setShowMemory(false)} className="text-slate-400 hover:text-white text-xs">
                    ✕
                  </button>
                </div>
                {memories.length > 0 ? (
                  memories.map((m) => (
                    <div key={m.id || m.key} className="p-1.5 rounded bg-white/5 border-l-2 border-sky-400 text-[11px]">
                      <span className="font-bold text-sky-300 uppercase text-[9px] block">{m.key}</span>
                      <p className="text-slate-200">{m.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No memories stored yet. Tell Nevea: "Remember that I like..."</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Gate Modal */}
      {pendingPermission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-slate-950 border border-red-500/40 rounded-3xl p-5 shadow-2xl text-white flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Security Permission Gate</h3>
                <span className="text-xs text-red-400 font-medium">Guarded Action Request</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border-l-2 border-red-500 leading-relaxed">
              NEVEA requests permission to execute:{' '}
              <span className="font-bold text-white">{pendingPermission.toolName}</span> (
              {pendingPermission.details || 'Protected local OS command'}).
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  pendingPermission.resolve(false);
                  setPendingPermission(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors"
              >
                Block & Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingPermission.resolve(true);
                  setPendingPermission(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all"
              >
                Allow Action
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
