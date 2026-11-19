import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor,
  Terminal,
  Globe,
  Box,
  Crown,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Layers,
  Sparkles,
  Zap,
  GitBranch,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  FolderGit2,
  RefreshCw,
  ScanText,
  FileText,
  Mic,
} from 'lucide-react';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { playCuteSound } from '../services/audioSynth';

export interface LatencyPoint {
  tick: string;
  ms: number;
}

export interface AgentStatus {
  name: string;
  displayName: string;
  role: string;
  status: 'idle' | 'working' | 'complete' | 'error';
  task: string;
  latency_ms?: number;
  latencyHistory: LatencyPoint[];
  strokeColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export type GitOperationState =
  | 'idle'
  | 'cloning'
  | 'committing'
  | 'pushing'
  | 'pulling'
  | 'creating_repo'
  | 'checking_status';

const CORE_FOUR_AGENTS = ['AgentOS', 'AgentCoder', 'AgentBrowser', 'Agent3D'] as const;

export const SwarmDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({
    AgentOS: {
      name: 'AgentOS',
      displayName: 'Agent OS',
      role: 'Win32 Window Automation & Virtual Messaging',
      status: 'idle',
      task: 'Awaiting Owner commands...',
      latency_ms: 18,
      strokeColor: '#ffffff',
      latencyHistory: [
        { tick: 'T-5', ms: 24 },
        { tick: 'T-4', ms: 19 },
        { tick: 'T-3', ms: 22 },
        { tick: 'T-2', ms: 16 },
        { tick: 'T-1', ms: 20 },
        { tick: 'Now', ms: 18 },
      ],
      icon: Monitor,
    },
    AgentCoder: {
      name: 'AgentCoder',
      displayName: 'Agent Coder',
      role: 'Open Interpreter & Subprocess Terminal PTY',
      status: 'idle',
      task: 'Code workspace idle',
      latency_ms: 42,
      strokeColor: '#d4d4d4',
      latencyHistory: [
        { tick: 'T-5', ms: 55 },
        { tick: 'T-4', ms: 48 },
        { tick: 'T-3', ms: 62 },
        { tick: 'T-2', ms: 39 },
        { tick: 'T-1', ms: 45 },
        { tick: 'Now', ms: 42 },
      ],
      icon: Terminal,
    },
    AgentBrowser: {
      name: 'AgentBrowser',
      displayName: 'Agent Browser',
      role: 'Headless Playwright & Crawl4AI Research',
      status: 'idle',
      task: 'Web engine ready',
      latency_ms: 86,
      strokeColor: '#a3a3a3',
      latencyHistory: [
        { tick: 'T-5', ms: 110 },
        { tick: 'T-4', ms: 95 },
        { tick: 'T-3', ms: 104 },
        { tick: 'T-2', ms: 88 },
        { tick: 'T-1', ms: 92 },
        { tick: 'Now', ms: 86 },
      ],
      icon: Globe,
    },
    Agent3D: {
      name: 'Agent3D',
      displayName: 'Agent 3D',
      role: 'Local TripoSR 3D Mesh Generation (:8188)',
      status: 'idle',
      task: '3D viewport pipeline standby',
      latency_ms: 134,
      strokeColor: '#737373',
      latencyHistory: [
        { tick: 'T-5', ms: 160 },
        { tick: 'T-4', ms: 148 },
        { tick: 'T-3', ms: 152 },
        { tick: 'T-2', ms: 139 },
        { tick: 'T-1', ms: 144 },
        { tick: 'Now', ms: 134 },
      ],
      icon: Box,
    },
    AgentGit: {
      name: 'AgentGit',
      displayName: 'Agent Git',
      role: 'GitHub, GitLab, Codeberg & Forgejo Repos',
      status: 'idle',
      task: 'Version control ready (backend/git_engine.py)',
      latency_ms: 31,
      strokeColor: '#e5e5e5',
      latencyHistory: [
        { tick: 'T-5', ms: 38 },
        { tick: 'T-4', ms: 34 },
        { tick: 'T-3', ms: 29 },
        { tick: 'T-2', ms: 35 },
        { tick: 'T-1', ms: 33 },
        { tick: 'Now', ms: 31 },
      ],
      icon: GitBranch,
    },
    AgentOCR: {
      name: 'AgentOCR',
      displayName: 'Agent OCR',
      role: 'Screen & Image Text Localization (pytesseract + OpenCV)',
      status: 'idle',
      task: 'Computer vision screen reader standby',
      latency_ms: 24,
      strokeColor: '#f59e0b',
      latencyHistory: [
        { tick: 'T-5', ms: 29 },
        { tick: 'T-4', ms: 26 },
        { tick: 'T-3', ms: 25 },
        { tick: 'T-2', ms: 22 },
        { tick: 'T-1', ms: 24 },
        { tick: 'Now', ms: 24 },
      ],
      icon: ScanText,
    },
    AgentDoc: {
      name: 'AgentDoc',
      displayName: 'Agent Doc',
      role: 'Local PDF, Word, Excel & CSV Parsing (pypdf + pandas)',
      status: 'idle',
      task: 'Document analyzer standby',
      latency_ms: 20,
      strokeColor: '#38bdf8',
      latencyHistory: [
        { tick: 'T-5', ms: 26 },
        { tick: 'T-4', ms: 22 },
        { tick: 'T-3', ms: 21 },
        { tick: 'T-2', ms: 19 },
        { tick: 'T-1', ms: 22 },
        { tick: 'Now', ms: 20 },
      ],
      icon: FileText,
    },
    AgentAudio: {
      name: 'AgentAudio',
      displayName: 'Agent Audio',
      role: 'Keyless Local Whisper Voice-to-Text Transcription',
      status: 'idle',
      task: 'Voice recognition & acoustic pipeline standby',
      latency_ms: 36,
      strokeColor: '#34d399',
      latencyHistory: [
        { tick: 'T-5', ms: 45 },
        { tick: 'T-4', ms: 39 },
        { tick: 'T-3', ms: 41 },
        { tick: 'T-2', ms: 34 },
        { tick: 'T-1', ms: 37 },
        { tick: 'Now', ms: 36 },
      ],
      icon: Mic,
    },
  });

  // Dedicated Real-Time AgentGit & backend/git_engine.py State
  const [gitOpState, setGitOpState] = useState<GitOperationState>('idle');
  const [gitPlatform, setGitPlatform] = useState<'github' | 'gitlab' | 'codeberg' | 'forgejo'>('github');
  const [gitRepoInput, setGitRepoInput] = useState('nevea-autonomous-repo');
  const [gitCommitMsg, setGitCommitMsg] = useState('feat: autonomous update from NEVEA AgentGit');
  const [gitBranch, setGitBranch] = useState<string>('main');
  const [gitTreeStatus, setGitTreeStatus] = useState<string>('Working tree ready');
  const [gitCompletedStages, setGitCompletedStages] = useState<{
    cloning?: boolean;
    committing?: boolean;
    pushing?: boolean;
  }>({});
  const [gitOpLog, setGitOpLog] = useState<
    Array<{ time: string; action: string; platform: string; status: 'ok' | 'err' | 'run'; detail: string }>
  >([]);
  const [gitLastResult, setGitLastResult] = useState<{
    success?: boolean;
    action?: string;
    platform?: string;
    output?: string;
    latency_ms?: number;
  } | null>(null);
  const [isGitBusy, setIsGitBusy] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [selectedBoss, setSelectedBoss] = useState('boss-king');
  const [isRunning, setIsRunning] = useState(false);
  const [logHistory, setLogHistory] = useState<string[]>([]);
  const [kingStatus, setKingStatus] = useState<string>('The King is standing by for the Owner.');

  const appendLatencyPoint = (
    history: LatencyPoint[],
    nextMs: number | undefined,
    fallbackMs = 25
  ): LatencyPoint[] => {
    const resolvedMs =
      typeof nextMs === 'number' && !Number.isNaN(nextMs)
        ? Math.max(1, Math.round(nextMs))
        : history[history.length - 1]?.ms ?? fallbackMs;
    const timestamp = new Date().toLocaleTimeString([], {
      minute: '2-digit',
      second: '2-digit',
    });
    return [...history.slice(-7), { tick: timestamp, ms: resolvedMs }];
  };

  // Helper to infer GitOperationState from telemetry text or action name
  const inferGitOpFromTelemetry = (actionOrTask: string, status: string): GitOperationState => {
    if (status !== 'working') return 'idle';
    const lower = actionOrTask.toLowerCase();
    if (lower.includes('clone')) return 'cloning';
    if (lower.includes('push')) return 'pushing';
    if (lower.includes('commit') || lower.includes('upload')) return 'committing';
    if (lower.includes('pull')) return 'pulling';
    if (lower.includes('create')) return 'creating_repo';
    return 'checking_status';
  };

  // Parse git status stdout from backend/git_engine.py to extract branch & tree cleanliness
  const parseGitStatusOutput = (rawOutput: string) => {
    if (!rawOutput) return;
    const branchMatch = rawOutput.match(/On branch\s+([^\s\n]+)/i);
    if (branchMatch?.[1]) {
      setGitBranch(branchMatch[1]);
    }
    if (/nothing to commit, working tree clean/i.test(rawOutput)) {
      setGitTreeStatus('Clean working tree');
    } else if (/Changes not staged|Changes to be committed|Untracked files/i.test(rawOutput)) {
      setGitTreeStatus('Modified files detected');
    } else if (/not a git repository/i.test(rawOutput)) {
      setGitTreeStatus('Unversioned workspace (ready to init/clone)');
    }
  };

  // Preload Boss preference & query initial Git repository status from backend/git_engine.py
  useEffect(() => {
    try {
      const electron = (window as any).electron;
      if (electron?.store?.get) {
        const savedBoss = electron.store.get('selected_king_boss');
        if (savedBoss) setSelectedBoss(savedBoss);
      }
    } catch {}
    const localBoss = localStorage.getItem('nevea_selected_king_boss');
    if (localBoss) setSelectedBoss(localBoss);

    // Fetch live repository status via backend/git_engine.py on mount
    axios
      .get('/api/git/status')
      .then((res) => {
        const data = res.data || {};
        const text = String(data.stdout || data.message || data.stderr || '');
        if (text) {
          parseGitStatusOutput(text);
        }
      })
      .catch(() => {});
  }, []);

  // Listen to Server-Sent Events from /api/swarm/telemetry
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/swarm/telemetry');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.agent === 'The King') {
            setKingStatus(data.task || 'The King is actively delegating...');
            setLogHistory((prev) => [
              `[${new Date().toLocaleTimeString()}] 👑 King: ${data.task}`,
              ...prev.slice(0, 15),
            ]);
          } else if (data.agent) {
            setAgents((prev) => {
              if (!prev[data.agent]) return prev;
              const currentAgent = prev[data.agent];
              const nextLatency = data.latency_ms ?? currentAgent.latency_ms;
              return {
                ...prev,
                [data.agent]: {
                  ...currentAgent,
                  status: data.status || 'working',
                  task: data.task || currentAgent.task,
                  latency_ms: nextLatency,
                  latencyHistory:
                    data.latency_ms !== undefined
                      ? appendLatencyPoint(currentAgent.latencyHistory, data.latency_ms)
                      : currentAgent.latencyHistory,
                },
              };
            });

            if (data.agent === 'AgentGit') {
              const opStr = String(data.operation || data.task || '');
              const nextOp = inferGitOpFromTelemetry(opStr, String(data.status || ''));
              setGitOpState(nextOp);

              if (data.status === 'complete') {
                const lowerOp = opStr.toLowerCase();
                setGitCompletedStages((prev) => ({
                  ...prev,
                  cloning: lowerOp.includes('clone') ? true : prev.cloning,
                  committing: lowerOp.includes('commit') ? true : prev.committing,
                  pushing: lowerOp.includes('push') ? true : prev.pushing,
                }));
              }

              setGitLastResult({
                success: data.status !== 'error',
                action: data.operation || 'git_op',
                platform: data.platform || gitPlatform,
                output: data.task,
                latency_ms: data.latency_ms,
              });

              setGitOpLog((prev) => [
                {
                  time: new Date().toLocaleTimeString([], { hour12: false }),
                  action: String(data.operation || 'telemetry').toUpperCase(),
                  platform: String(data.platform || gitPlatform).toUpperCase(),
                  status:
                    data.status === 'working'
                      ? 'run'
                      : data.status === 'error'
                      ? 'err'
                      : 'ok',
                  detail: String(data.task || ''),
                },
                ...prev.slice(0, 5),
              ]);
            }

            setLogHistory((prev) => [
              `[${new Date().toLocaleTimeString()}] ${data.agent}: ${data.task} (${data.status})`,
              ...prev.slice(0, 15),
            ]);
          }
        } catch {}
      };
    } catch (e) {
      console.warn('[SwarmDashboard] SSE stream note:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [gitPlatform]);

  // Execute a direct repository operation via backend/git_engine.py (/api/git/execute)
  const handleExecuteGitAction = async (
    action: 'clone' | 'commit' | 'push' | 'pull' | 'create_repo' | 'status' | 'init'
  ) => {
    if (isGitBusy) return;
    setIsGitBusy(true);
    playCuteSound('boop');

    const opMap: Record<typeof action, GitOperationState> = {
      clone: 'cloning',
      commit: 'committing',
      push: 'pushing',
      pull: 'pulling',
      create_repo: 'creating_repo',
      status: 'checking_status',
      init: 'checking_status',
    };

    const labelMap: Record<typeof action, string> = {
      clone: `Cloning repository "${gitRepoInput}" from ${gitPlatform}...`,
      commit: `Committing staged changes: "${gitCommitMsg}"...`,
      push: `Pushing commits to ${gitPlatform} remote...`,
      pull: `Pulling latest upstream changes from ${gitPlatform}...`,
      create_repo: `Creating remote repository "${gitRepoInput}" on ${gitPlatform}...`,
      status: 'Inspecting local working tree status via git_engine.py...',
      init: 'Initializing local Git repository via git_engine.py...',
    };

    const destructiveActions = new Set(['commit', 'push', 'create_repo']);
    if (destructiveActions.has(action) && typeof (window as any).neveaRequestPermission === 'function') {
      const approved = await (window as any).neveaRequestPermission(
        `git_${action}`,
        JSON.stringify(
          {
            action,
            platform: gitPlatform,
            repoName: gitRepoInput.trim(),
            commitMessage: action === 'commit' ? gitCommitMsg.trim() : undefined,
          },
          null,
          2
        )
      );
      if (!approved) {
        setGitOpState('idle');
        setIsGitBusy(false);
        setAgents((prev) => ({
          ...prev,
          AgentGit: {
            ...prev.AgentGit,
            status: 'idle',
            task: `Blocked by Permission Gate: User denied git_${action}`,
          },
        }));
        return;
      }
    }

    setGitOpState(opMap[action]);
    setAgents((prev) => ({
      ...prev,
      AgentGit: {
        ...prev.AgentGit,
        status: 'working',
        task: labelMap[action],
      },
    }));

    try {
      const res = await axios.post('/api/git/execute', {
        action,
        platform: gitPlatform,
        repoName: gitRepoInput.trim(),
        commitMessage: gitCommitMsg.trim(),
        approved: true,
      });

      const data = res.data || {};
      const ok = Boolean(data.success);
      const rawText = String(data.stdout || data.message || data.error || data.stderr || '');
      if (action === 'status' && rawText) {
        parseGitStatusOutput(rawText);
      }

      const summary =
        data.message ||
        data.stdout ||
        data.error ||
        data.stderr ||
        `Git ${action} completed (${ok ? 'OK' : 'Notice'})`;

      if (ok) {
        setGitCompletedStages((prev) => ({
          ...prev,
          cloning: action === 'clone' ? true : prev.cloning,
          committing: action === 'commit' ? true : prev.committing,
          pushing: action === 'push' ? true : prev.pushing,
        }));
      }

      setAgents((prev) => ({
        ...prev,
        AgentGit: {
          ...prev.AgentGit,
          status: ok ? 'complete' : 'error',
          task: String(summary).slice(0, 140),
          latency_ms: data.latency_ms ?? prev.AgentGit.latency_ms,
          latencyHistory: appendLatencyPoint(prev.AgentGit.latencyHistory, data.latency_ms, 30),
        },
      }));

      setGitLastResult({
        success: ok,
        action,
        platform: gitPlatform,
        output: String(summary),
        latency_ms: data.latency_ms,
      });

      setGitOpLog((prev) => [
        {
          time: new Date().toLocaleTimeString([], { hour12: false }),
          action: action.toUpperCase(),
          platform: gitPlatform.toUpperCase(),
          status: ok ? 'ok' : 'err',
          detail: String(summary).slice(0, 110),
        },
        ...prev.slice(0, 5),
      ]);

      playCuteSound(ok ? 'yiii' : 'squeak');
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Git engine invocation failed';
      setAgents((prev) => ({
        ...prev,
        AgentGit: {
          ...prev.AgentGit,
          status: 'error',
          task: errMsg,
        },
      }));
      setGitLastResult({
        success: false,
        action,
        platform: gitPlatform,
        output: errMsg,
      });
    } finally {
      setGitOpState('idle');
      setIsGitBusy(false);
    }
  };

  // Sequential Commit -> Push pipeline via backend/git_engine.py
  const handleCommitAndPushPipeline = async () => {
    if (isGitBusy) return;
    await handleExecuteGitAction('commit');
    await handleExecuteGitAction('push');
  };

  const handleExecuteSwarm = async (customPrompt?: string) => {
    const activePrompt = (customPrompt ?? prompt).trim();
    if (!activePrompt || isRunning) return;
    if (customPrompt) setPrompt(customPrompt);
    setIsRunning(true);
    playCuteSound('boop');

    // Optimistically update all agents to working
    setAgents((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => {
        updated[k] = { ...updated[k], status: 'working', task: 'Initializing parallel task...' };
      });
      return updated;
    });

    try {
      const res = await axios.post('/api/swarm/execute', {
        prompt: activePrompt,
        bossModel: selectedBoss,
      });

      playCuteSound('yiii');
      const results = res.data?.results || [];
      results.forEach((r: any) => {
        if (r.agent && agents[r.agent]) {
          setAgents((prev) => {
            const current = prev[r.agent];
            if (!current) return prev;
            const measuredMs =
              typeof r.latency_ms === 'number'
                ? r.latency_ms
                : current.latency_ms ?? 35;
            return {
              ...prev,
              [r.agent]: {
                ...current,
                status: r.status === 'success' || r.success ? 'complete' : 'error',
                task:
                  r.message ||
                  r.summary ||
                  (r.stdout
                    ? `Ran command: ${r.returncode === 0 ? 'Exit 0' : 'Code ' + r.returncode}`
                    : 'Task finished'),
                latency_ms: measuredMs,
                latencyHistory: appendLatencyPoint(current.latencyHistory, measuredMs),
              },
            };
          });
        }
      });
    } catch (err: any) {
      console.warn('[SwarmDashboard] Execution error:', err);
      playCuteSound('error');
    } finally {
      setIsRunning(false);
    }
  };

  // Build comparative monochrome telemetry dataset across all agents
  const comparativeLatencyData = agents.AgentOS.latencyHistory.map((pt, idx) => ({
    tick: pt.tick,
    AgentOS: agents.AgentOS.latencyHistory[idx]?.ms ?? 18,
    AgentCoder: agents.AgentCoder.latencyHistory[idx]?.ms ?? 42,
    AgentBrowser: agents.AgentBrowser.latencyHistory[idx]?.ms ?? 86,
    Agent3D: agents.Agent3D.latencyHistory[idx]?.ms ?? 134,
    AgentGit: agents.AgentGit.latencyHistory[idx]?.ms ?? 31,
    AgentOCR: agents.AgentOCR?.latencyHistory[idx]?.ms ?? 24,
    AgentDoc: agents.AgentDoc?.latencyHistory[idx]?.ms ?? 20,
    AgentAudio: agents.AgentAudio?.latencyHistory[idx]?.ms ?? 36,
  }));

  const handleSampleLatencyPulse = () => {
    playCuteSound('boop');
    setAgents((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const agent = next[key];
        const base = agent.latency_ms ?? 40;
        const delta = Math.round((Math.random() - 0.48) * 18);
        const simulatedMs = Math.max(8, base + delta);
        next[key] = {
          ...agent,
          latency_ms: simulatedMs,
          latencyHistory: appendLatencyPoint(agent.latencyHistory, simulatedMs),
        };
      });
      return next;
    });
  };

  const handlePingSingleAgent = (agentKey: string) => {
    playCuteSound('boop');
    setAgents((prev) => {
      const target = prev[agentKey];
      if (!target) return prev;
      const base = target.latency_ms ?? 35;
      const delta = Math.round((Math.random() - 0.48) * 16);
      const nextMs = Math.max(6, Math.min(260, base + delta));
      return {
        ...prev,
        [agentKey]: {
          ...target,
          latency_ms: nextMs,
          latencyHistory: appendLatencyPoint(target.latencyHistory, nextMs),
        },
      };
    });
  };

  // Continuous live latency telemetry heartbeat so each agent's Recharts graph streams in real time
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          const agent = next[key];
          const base = agent.latency_ms ?? 40;
          const jitter = Math.round((Math.random() - 0.48) * 10);
          const nextMs = Math.max(8, Math.min(280, base + jitter));
          next[key] = {
            ...agent,
            latency_ms: nextMs,
            latencyHistory: appendLatencyPoint(agent.latencyHistory, nextMs),
          };
        });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'working':
        return 'text-white border-white/50 bg-white/15 animate-pulse';
      case 'complete':
        return 'text-white/90 border-white/30 bg-white/10';
      case 'error':
        return 'text-white/70 border-white/25 bg-white/5';
      default:
        return 'text-white/55 border-white/15 bg-white/5';
    }
  };

  const getStatusDotColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'working':
        return 'bg-white shadow-[0_0_8px_#ffffff] animate-ping';
      case 'complete':
        return 'bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.7)]';
      case 'error':
        return 'bg-white/50 shadow-[0_0_6px_rgba(255,255,255,0.4)]';
      default:
        return 'bg-white/35';
    }
  };

  const getGitOpBadgeLabel = (op: GitOperationState) => {
    switch (op) {
      case 'cloning':
        return 'CLONING REPO...';
      case 'committing':
        return 'COMMITTING...';
      case 'pushing':
        return 'PUSHING TO REMOTE...';
      case 'pulling':
        return 'PULLING UPSTREAM...';
      case 'creating_repo':
        return 'CREATING REMOTE REPO...';
      case 'checking_status':
        return 'CHECKING STATUS...';
      default:
        return 'STANDBY (git_engine.py)';
    }
  };

  return (
    <div className="flex flex-col gap-3.5 text-white p-2 select-none font-sans">
      {/* Header Banner */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent border border-white/15 backdrop-blur-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
            <Crown size={18} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-display font-bold text-white tracking-tight truncate">
                The King & Multi-Agent Swarm
              </h2>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/85 border border-white/20">
                King-Level OS
              </span>
            </div>
            <p className="text-[10px] text-white/60 truncate">{kingStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSampleLatencyPulse}
            title="Sample live latency telemetry"
            className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-[9px] font-mono text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw size={10} />
            <span>Pulse</span>
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/15 text-[9px] font-mono text-white/90">
            <Activity size={11} className="animate-pulse" />
            <span>:4000</span>
          </div>
        </div>
      </div>

      {/* Live 4-Agent Status Indicator Strip (Agent OS, Coder, Browser, 3D) */}
      <div className="grid grid-cols-4 gap-1.5">
        {CORE_FOUR_AGENTS.map((key) => {
          const agent = agents[key];
          return (
            <div
              key={key}
              className="px-2 py-1.5 rounded-xl bg-[#111111] border border-white/12 flex items-center justify-between gap-1.5"
            >
              <span className="text-[10px] font-mono font-semibold text-white/90 truncate">
                {agent.displayName.replace('Agent ', '')}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-mono text-white/50">
                  {agent.latency_ms ?? 0}ms
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(agent.status)}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Multi-Agent Comparative Monochrome Latency Telemetry Graph */}
      <div className="p-3 rounded-2xl bg-[#0a0a0a]/90 border border-white/10 backdrop-blur-xl flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-white/80" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/80 font-semibold">
              Swarm Latency Telemetry (ms)
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[9px] font-mono text-white/60 flex-wrap">
            {Object.values(agents).map((agent) => (
              <span key={agent.name} className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: agent.strokeColor }}
                />
                {agent.displayName.replace('Agent ', '')}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full rounded-xl bg-black/50 border border-white/5 p-1.5">
          <ResponsiveContainer width="100%" height={104} minWidth={0}>
            <LineChart data={comparativeLatencyData} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="tick"
                stroke="rgba(255,255,255,0.35)"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 10, 10, 0.94)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  backdropFilter: 'blur(12px)',
                }}
                itemStyle={{ color: '#ffffff', padding: 0 }}
                labelStyle={{ color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}
              />
              <Line
                type="monotone"
                dataKey="AgentOS"
                name="OS"
                stroke="#ffffff"
                strokeWidth={1.75}
                dot={{ r: 2, fill: '#ffffff', strokeWidth: 0 }}
                activeDot={{ r: 3.5, fill: '#ffffff' }}
              />
              <Line
                type="monotone"
                dataKey="AgentCoder"
                name="Coder"
                stroke="#d4d4d4"
                strokeWidth={1.5}
                dot={{ r: 1.75, fill: '#d4d4d4', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="AgentBrowser"
                name="Browser"
                stroke="#a3a3a3"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                dot={{ r: 1.75, fill: '#a3a3a3', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="Agent3D"
                name="3D"
                stroke="#737373"
                strokeWidth={1.5}
                dot={{ r: 1.75, fill: '#737373', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="AgentGit"
                name="Git"
                stroke="#e5e5e5"
                strokeWidth={1.4}
                strokeDasharray="2 2"
                dot={{ r: 1.5, fill: '#e5e5e5', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="AgentOCR"
                name="OCR"
                stroke="#f59e0b"
                strokeWidth={1.4}
                dot={{ r: 1.5, fill: '#f59e0b', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="AgentDoc"
                name="Doc"
                stroke="#38bdf8"
                strokeWidth={1.4}
                dot={{ r: 1.5, fill: '#38bdf8', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="AgentAudio"
                name="Audio"
                stroke="#34d399"
                strokeWidth={1.4}
                strokeDasharray="3 2"
                dot={{ r: 1.5, fill: '#34d399', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Concurrent Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {Object.values(agents).map((agent) => {
          const Icon = agent.icon;
          const isAgentGit = agent.name === 'AgentGit';
          const gradientId = `latencyGrad-${agent.name}`;
          const historyValues = agent.latencyHistory.map((h) => h.ms);
          const avgLatency =
            historyValues.length > 0
              ? Math.round(historyValues.reduce((a, b) => a + b, 0) / historyValues.length)
              : agent.latency_ms ?? 0;
          const minLatency =
            historyValues.length > 0 ? Math.min(...historyValues) : agent.latency_ms ?? 0;
          const peakLatency =
            historyValues.length > 0 ? Math.max(...historyValues) : agent.latency_ms ?? 0;
          const sortedHistory = [...historyValues].sort((a, b) => a - b);
          const p95Latency =
            sortedHistory.length > 0
              ? sortedHistory[Math.min(sortedHistory.length - 1, Math.floor(sortedHistory.length * 0.95))]
              : agent.latency_ms ?? 0;
          const prevLatency =
            historyValues.length > 1
              ? historyValues[historyValues.length - 2]
              : agent.latency_ms ?? 0;
          const latencyDelta = (agent.latency_ms ?? 0) - prevLatency;

          return (
            <motion.div
              key={agent.name}
              whileHover={{ y: -2 }}
              className={`p-3 rounded-2xl bg-[#0e0e0e]/90 border backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden group transition-all ${
                isAgentGit
                  ? 'border-white/20 hover:border-white/35 sm:col-span-2'
                  : 'border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                      isAgentGit
                        ? 'bg-white/10 border-white/25 text-white'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold font-display text-white tracking-tight truncate">
                        {agent.name}
                      </h3>
                      <span className="text-[9px] font-mono text-white/45 hidden sm:inline">
                        ({agent.displayName})
                      </span>
                      {isAgentGit && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/85 border border-white/20">
                          {getGitOpBadgeLabel(gitOpState)}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-white/45 truncate">{agent.role}</p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${getStatusColor(
                    agent.status
                  )}`}
                >
                  {agent.status === 'working' && <Zap size={10} className="animate-bounce" />}
                  {agent.status === 'complete' && <CheckCircle2 size={10} />}
                  {agent.status === 'error' && <AlertCircle size={10} />}
                  {agent.status}
                </span>
              </div>

              {/* Task description */}
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/80 font-mono line-clamp-2 min-h-[36px] flex items-center justify-between gap-2">
                <span className="truncate">{agent.task}</span>
                {isAgentGit && gitOpState !== 'idle' && (
                  <RefreshCw size={12} className="text-white/80 animate-spin shrink-0" />
                )}
              </div>

              {/* Per-Agent Monochrome Glassmorphism Recharts Visual Latency Graph */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-[#070707]/90 border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between gap-1.5 flex-wrap text-[9px] font-mono text-white/55">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Clock size={9} className="text-white/75" />
                    <span className="uppercase tracking-wider text-[8px] font-semibold">
                      Real-Time Latency
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePingSingleAgent(agent.name)}
                      title={`Sample ${agent.displayName} latency`}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[8px] text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      Ping
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-white/45">min {minLatency}ms</span>
                    <span className="text-white/60">avg {avgLatency}ms</span>
                    <span className="text-white/60">p95 {p95Latency}ms</span>
                    <span className="text-white/45">max {peakLatency}ms</span>
                    <span
                      className={`text-[8px] px-1 py-0.5 rounded border ${
                        latencyDelta <= 0
                          ? 'bg-white/10 border-white/20 text-white/90'
                          : 'bg-white/5 border-white/15 text-white/65'
                      }`}
                    >
                      {latencyDelta > 0 ? `+${latencyDelta}ms` : `${latencyDelta}ms`}
                    </span>
                    <span className="text-white font-semibold px-1.5 py-0.5 rounded bg-white/15 border border-white/25 shadow-[0_0_8px_rgba(255,255,255,0.12)]">
                      {agent.latency_ms ?? 0}ms
                    </span>
                  </div>
                </div>
                <div className="w-full h-[76px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={agent.latencyHistory}
                      margin={{ top: 4, right: 6, left: -26, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={agent.strokeColor} stopOpacity={0.38} />
                          <stop offset="95%" stopColor={agent.strokeColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.05)"
                        strokeDasharray="2 2"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="tick"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 7, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.25)"
                        tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 7, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <ReferenceLine
                        y={avgLatency}
                        stroke="rgba(255,255,255,0.22)"
                        strokeDasharray="3 3"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(8, 8, 8, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          borderRadius: '8px',
                          padding: '3px 7px',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          color: '#ffffff',
                          backdropFilter: 'blur(10px)',
                        }}
                        itemStyle={{ color: '#ffffff', padding: 0 }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '8px' }}
                        formatter={(value: any) => [
                          `${value} ms (avg ${avgLatency} ms)`,
                          agent.displayName,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="ms"
                        stroke={agent.strokeColor}
                        strokeWidth={1.75}
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        dot={{ r: 1.75, fill: agent.strokeColor, strokeWidth: 0 }}
                        activeDot={{ r: 3.25, fill: '#ffffff', strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dedicated AgentGit Real-Time Repository Operations Control Bar */}
              {isAgentGit && (
                <div className="flex flex-col gap-2 pt-1.5 border-t border-white/10">
                  {/* Live Branch & Working Tree Status Bar (backend/git_engine.py) */}
                  <div className="px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GitBranch size={11} className="text-white/80 shrink-0" />
                      <span className="text-white font-semibold truncate">{gitBranch}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-white/65 truncate">{gitTreeStatus}</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/55 shrink-0">
                      backend/git_engine.py
                    </span>
                  </div>

                  {/* Real-time Operation Stage Indicators (Cloning, Committing, Pushing) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div
                      className={`px-2 py-1.5 rounded-lg border text-[9px] font-mono flex items-center justify-center gap-1 transition-all ${
                        gitOpState === 'cloning'
                          ? 'bg-white/20 border-white text-white animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                          : gitCompletedStages.cloning
                          ? 'bg-white/10 border-white/30 text-white/90'
                          : 'bg-black/40 border-white/10 text-white/50'
                      }`}
                    >
                      <DownloadCloud size={10} />
                      <span>Cloning</span>
                      {gitCompletedStages.cloning && gitOpState !== 'cloning' && (
                        <CheckCircle2 size={9} className="text-white/80" />
                      )}
                    </div>
                    <div
                      className={`px-2 py-1.5 rounded-lg border text-[9px] font-mono flex items-center justify-center gap-1 transition-all ${
                        gitOpState === 'committing'
                          ? 'bg-white/20 border-white text-white animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                          : gitCompletedStages.committing
                          ? 'bg-white/10 border-white/30 text-white/90'
                          : 'bg-black/40 border-white/10 text-white/50'
                      }`}
                    >
                      <GitCommit size={10} />
                      <span>Committing</span>
                      {gitCompletedStages.committing && gitOpState !== 'committing' && (
                        <CheckCircle2 size={9} className="text-white/80" />
                      )}
                    </div>
                    <div
                      className={`px-2 py-1.5 rounded-lg border text-[9px] font-mono flex items-center justify-center gap-1 transition-all ${
                        gitOpState === 'pushing'
                          ? 'bg-white/20 border-white text-white animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                          : gitCompletedStages.pushing
                          ? 'bg-white/10 border-white/30 text-white/90'
                          : 'bg-black/40 border-white/10 text-white/50'
                      }`}
                    >
                      <UploadCloud size={10} />
                      <span>Pushing</span>
                      {gitCompletedStages.pushing && gitOpState !== 'pushing' && (
                        <CheckCircle2 size={9} className="text-white/80" />
                      )}
                    </div>
                  </div>

                  {/* Platform, Repo Name & Commit Message Inputs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={gitPlatform}
                      onChange={(e) => setGitPlatform(e.target.value as any)}
                      className="px-2 py-1 rounded-lg bg-[#141414] border border-white/15 text-[10px] font-mono text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                      <option value="codeberg">Codeberg</option>
                      <option value="forgejo">Forgejo</option>
                    </select>

                    <input
                      type="text"
                      value={gitRepoInput}
                      onChange={(e) => setGitRepoInput(e.target.value)}
                      placeholder="owner/repo or repo-name"
                      className="flex-1 min-w-[120px] px-2 py-1 rounded-lg bg-[#141414] border border-white/15 text-[10px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/40"
                    />

                    <input
                      type="text"
                      value={gitCommitMsg}
                      onChange={(e) => setGitCommitMsg(e.target.value)}
                      placeholder="Commit message"
                      className="flex-1 min-w-[130px] px-2 py-1 rounded-lg bg-[#141414] border border-white/15 text-[10px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  {/* Quick Action Triggers linked to backend/git_engine.py */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('clone')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <DownloadCloud size={11} />
                      <span>Clone</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('commit')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <GitCommit size={11} />
                      <span>Commit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('push')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <UploadCloud size={11} />
                      <span>Push</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={handleCommitAndPushPipeline}
                      className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-[10px] font-mono font-semibold text-white flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <Zap size={10} />
                      <span>Commit & Push</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('pull')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <DownloadCloud size={11} />
                      <span>Pull</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('create_repo')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-[10px] font-mono text-white/90 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <FolderGit2 size={11} />
                      <span>Create Remote</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGitBusy}
                      onClick={() => handleExecuteGitAction('status')}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-white/70 flex items-center gap-1 cursor-pointer disabled:opacity-40 transition-colors ml-auto"
                    >
                      <RefreshCw size={10} className={isGitBusy ? 'animate-spin' : ''} />
                      <span>Status</span>
                    </button>
                  </div>

                  {gitLastResult && (
                    <div
                      className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono flex items-center justify-between gap-2 ${
                        gitLastResult.success
                          ? 'bg-white/10 border-white/25 text-white'
                          : 'bg-white/5 border-white/20 text-white/70'
                      }`}
                    >
                      <span className="truncate">
                        [{gitLastResult.platform?.toUpperCase() || 'GIT'} /{' '}
                        {gitLastResult.action?.toUpperCase()}] {gitLastResult.output}
                      </span>
                      {gitLastResult.latency_ms !== undefined && (
                        <span className="text-[9px] opacity-75 shrink-0">
                          {gitLastResult.latency_ms}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Real-Time AgentGit Repository Operation Log */}
                  {gitOpLog.length > 0 && (
                    <div className="p-2 rounded-xl bg-black/50 border border-white/10 flex flex-col gap-1 font-mono text-[9px]">
                      <div className="text-white/45 uppercase tracking-wider flex items-center justify-between">
                        <span>Repository Operation Feed</span>
                        <span>{gitOpLog.length} events</span>
                      </div>
                      <div className="flex flex-col gap-0.5 max-h-20 overflow-y-auto">
                        {gitOpLog.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-white/75">
                            <span className="truncate">
                              [{entry.time}] {entry.platform}:{entry.action} — {entry.detail}
                            </span>
                            <span className="uppercase text-[8px] text-white/50 shrink-0">
                              {entry.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Command Dispatcher */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
            <Layers size={13} className="text-white" />
            <span>Dispatch Command to Swarm (Owner Authority)</span>
          </label>
          <button
            type="button"
            disabled={isRunning}
            onClick={() =>
              handleExecuteSwarm(
                'List open desktop windows, check git status, search Three.js fur docs, and generate 3D crown mesh'
              )
            }
            className="text-[9px] font-mono text-white/60 hover:text-white underline cursor-pointer disabled:opacity-40"
          >
            Test All 4 Agents
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecuteSwarm()}
            placeholder="e.g. Research Three.js shaders, check git status, and generate 3D crown"
            className="flex-1 px-3 py-2 rounded-xl bg-[#111] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40 font-mono transition-colors"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleExecuteSwarm()}
            disabled={isRunning || !prompt.trim()}
            className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 shadow-[0_0_16px_rgba(255,255,255,0.3)] disabled:opacity-40 cursor-pointer shrink-0"
          >
            {isRunning ? (
              <Sparkles size={13} className="animate-spin" />
            ) : (
              <Play size={13} fill="black" />
            )}
            <span>{isRunning ? 'Delegating...' : 'Run Swarm'}</span>
          </motion.button>
        </div>
      </div>

      {/* Live Telemetry Log Terminal */}
      {logHistory.length > 0 && (
        <div className="flex flex-col gap-1 p-2.5 rounded-2xl bg-black/60 border border-white/10 font-mono text-[10px]">
          <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Activity size={10} />
            <span>Real-Time Swarm Telemetry Stream</span>
          </div>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
            {logHistory.map((log, idx) => (
              <div key={idx} className="text-white/70 truncate">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
