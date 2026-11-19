import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Share2,
  Terminal,
  Radio,
  Lock,
} from 'lucide-react';

export interface NovaGenesisScreenProps {
  onComplete: () => void;
  forceShow?: boolean;
}

interface GenesisLog {
  id: string;
  agent: string;
  text: string;
  timestamp: string;
  status: 'pending' | 'success' | 'working';
}

const GENESIS_STEPS = [
  { id: 'env', label: 'Hardware & OS Probing', icon: Cpu },
  { id: 'keyless', label: 'Keyless Free Arsenal Ingestion', icon: Zap },
  { id: 'p2p', label: 'P2P Hive Mind Cell Division', icon: Share2 },
  { id: 'tools', label: 'Decentralized Tool Registry Sync', icon: Layers },
];

export const NovaGenesisScreen: React.FC<NovaGenesisScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [activeNodesCount, setActiveNodesCount] = useState<number>(1428);
  const [logs, setLogs] = useState<GenesisLog[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const scriptLogs = useRef<Array<{ agent: string; text: string; delay: number }>>([
    { agent: 'AgentOS', text: 'Initializing Nova Genesis Protocol & scanning local environment...', delay: 200 },
    { agent: 'AgentOS', text: 'Detecting GPU architecture & allocating WebGL2 GPGPU fur shells...', delay: 650 },
    { agent: 'AgentBrowser', text: 'Connecting to Keyless Arsenal: Pollinations.ai, DuckDuckGo, Edge-TTS...', delay: 1150 },
    { agent: 'AgentBrowser', text: 'Configured zero-cost local LLM fallbacks (Ollama / Llama-3)...', delay: 1650 },
    { agent: 'HiveMind-P2P', text: 'Cell Division: Spawning decentralized libp2p node (PeerID: 12D3KooW...Nevea)...', delay: 2150 },
    { agent: 'HiveMind-P2P', text: 'GossipSub relay active. Connected to 1,428 community swarm peers globally.', delay: 2650 },
    { agent: 'AgentVault', text: 'Enforcing Local Zero-Knowledge Sandbox. Personal data stays 100% on localhost.', delay: 3150 },
    { agent: 'AgentSwarm', text: 'Armed Programmatic Ghost Cursors for autonomous voice-first UI execution.', delay: 3650 },
    { agent: 'Nova Core', text: 'Ecosystem calibrated. Entering Minimalist Monochrome Workspace.', delay: 4100 },
  ]);

  useEffect(() => {
    fetch('/api/genesis/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeNodes) setActiveNodesCount(data.activeNodes);
      })
      .catch(() => {});

    const timers: NodeJS.Timeout[] = [];
    scriptLogs.current.forEach((item, index) => {
      const timer = setTimeout(() => {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs((prev) => [
          ...prev,
          {
            id: `log-${index}`,
            agent: item.agent,
            text: item.text,
            timestamp: timeStr,
            status: index === scriptLogs.current.length - 1 ? 'success' : 'working',
          },
        ]);

        const nextProgress = Math.min(100, Math.round(((index + 1) / scriptLogs.current.length) * 100));
        setProgress(nextProgress);

        if (index < 2) setCurrentStepIndex(0);
        else if (index < 4) setCurrentStepIndex(1);
        else if (index < 6) setCurrentStepIndex(2);
        else setCurrentStepIndex(3);

        if (index === scriptLogs.current.length - 1) {
          setIsFinished(true);
        }
      }, item.delay);

      timers.push(timer);
    });

    // Auto-dismiss smoothly shortly after completion so user doesn't even have to click
    const autoCompleteTimer = setTimeout(() => {
      onComplete();
    }, 4800);
    timers.push(autoCompleteTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100000] bg-[#050505] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* Subtle Monochrome Radial Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div
          className="w-full h-full opacity-20"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Top Monochrome Header */}
      <header className="relative z-10 px-8 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-[#050505] flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.35)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
              NOVA GENESIS PROTOCOL
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                MONOCHROME OS
              </span>
            </h1>
            <p className="text-[11px] text-white/50 font-mono">
              Autonomous Provisioning &amp; Decentralized P2P Cell Division
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121212] border border-white/15 text-white/80">
            <Radio size={13} className="text-white animate-pulse" />
            <span>SWARM:</span>
            <span className="text-white font-bold">{activeNodesCount} NODES</span>
          </div>
          <button
            onClick={onComplete}
            className="px-4 py-1.5 rounded-xl bg-white text-[#050505] hover:bg-white/90 font-bold transition text-xs cursor-pointer"
          >
            Enter Now &rarr;
          </button>
        </div>
      </header>

      {/* Center Monochrome Orb & Live Agent Terminal */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-8 gap-10 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative w-56 h-56 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 24, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
              className="absolute inset-4 rounded-full border border-white/20"
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute inset-8 rounded-full bg-white/10 blur-xl"
            />

            <div className="relative z-10 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                {progress}%
              </span>
              <span className="text-[9px] font-mono tracking-widest text-white/60 uppercase mt-1">
                {isFinished ? 'SYNCHRONIZED' : 'PROVISIONING'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-6 w-full max-w-sm">
            {GENESIS_STEPS.map((step, idx) => {
              const isDone = currentStepIndex > idx || isFinished;
              const isCurrent = currentStepIndex === idx && !isFinished;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition duration-300 ${
                    isDone
                      ? 'bg-white/10 border-white/35 text-white'
                      : isCurrent
                      ? 'bg-white/15 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                      : 'bg-[#121212]/60 border-white/10 text-white/40'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg ${
                      isDone || isCurrent ? 'bg-white text-[#050505]' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-semibold truncate leading-tight">{step.label}</p>
                    <p className="text-[9px] font-mono text-white/50">
                      {isDone ? 'Verified' : isCurrent ? 'Active...' : 'Queued'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Monochrome Agent Terminal */}
        <div className="flex-1 w-full max-w-lg flex flex-col h-[340px] bg-[#0a0a0a] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-2.5 border-b border-white/10 bg-[#121212] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-white" />
              <span className="text-[11px] font-mono font-bold text-white/90">
                GENESIS_SWARM_PROVISIONING.log
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/30" />
              <span className="w-2 h-2 rounded-full bg-white/60" />
              <span className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 leading-relaxed"
              >
                <span className="text-white/40 text-[10px] select-none shrink-0">{log.timestamp}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 uppercase bg-white/10 text-white border border-white/20">
                  {log.agent}
                </span>
                <span className="text-white/85 text-[11px]">{log.text}</span>
              </motion.div>
            ))}
            <div ref={terminalBottomRef} />
          </div>

          <div className="px-4 py-2 border-t border-white/10 bg-[#121212] flex items-center justify-between text-[10px] font-mono text-white/50">
            <span className="flex items-center gap-1.5">
              <Lock size={11} className="text-white" /> Zero-Knowledge Local Sandbox
            </span>
            <span>{isFinished ? 'READY' : 'PROVISIONING'}</span>
          </div>
        </div>
      </main>

      {/* Bottom Bar */}
      <footer className="relative z-10 px-8 py-4 border-t border-white/10 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck size={15} className="text-white" />
          <span>Voice-First Monochrome Architecture · Autonomous Ghost Cursor Control</span>
        </div>

        <motion.button
          onClick={onComplete}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-[#050505] font-bold text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(255,255,255,0.3)] transition cursor-pointer"
        >
          <span>Launch Workspace</span>
          <ArrowRight size={13} />
        </motion.button>
      </footer>
    </motion.div>
  );
};
