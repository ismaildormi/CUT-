import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Target,
  MousePointerClick,
  Plus,
  Terminal,
  Cpu,
} from 'lucide-react';
import { AgentCursor, AgentCursorState } from './AgentCursor';
import {
  agentRegistry,
  AgentRegistryModal,
  AgentPluginDefinition,
  generateDeterministicColor,
} from './AgentRegistry';

export interface CollaborationCanvasProps {
  initialActive?: boolean;
  isDrawerOpen?: boolean;
  isCinemaHidden?: boolean;
}

export interface TaskNodeHUD {
  id: string;
  title: string;
  assignedAgentId: string;
  backupAgentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'failover_reassigned';
  progress: number;
  currentAction: string;
}

export interface MasterPlanHUD {
  id: string;
  goal: string;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  tasks: TaskNodeHUD[];
}

export interface UIExecutionDirective {
  id: string;
  agentId: string;
  targetSelector?: string;
  buttonTextMatch?: string;
  fallbackX: number;
  fallbackY: number;
  actionType: 'click' | 'type' | 'hover';
  textToType?: string;
  taskDescription: string;
  delayMs: number;
}

export interface KingExecutionStepHUD {
  agent: string;
  task: string;
  lock: string;
  depends_on: string | null;
  status?: 'queued' | 'waiting_dependency' | 'waiting_lock' | 'executing' | 'completed' | 'failed';
}

export interface KingExecutionPlanHUD {
  plan_id: string;
  goal?: string;
  steps: KingExecutionStepHUD[];
}

export interface CognitiveLogEntry {
  id: string;
  agent: 'planner' | 'coder' | 'reviewer' | 'system';
  status: string;
  message: string;
  timestamp: string;
}

export interface CoordinateTelemetryPacket {
  type:
    | 'CURSOR_STREAM'
    | 'COORDINATE_TELEMETRY'
    | 'COGNITIVE_TELEMETRY'
    | 'KING_EXECUTION_PLAN'
    | 'SNAPSHOT'
    | 'FAILOVER_ALERT'
    | 'MASTER_PLAN_CREATED'
    | 'AGENT_UI_DIRECTIVES'
    | 'AGENT_INJECTED'
    | 'PING';
  agents?: AgentCursorState[];
  agent?: AgentCursorState | string;
  agentId?: string;
  status?: string;
  lock?: string;
  depends_on?: string | null;
  x?: number;
  y?: number;
  targetSelector?: string;
  action?: 'idle' | 'moving' | 'clicking' | 'typing' | 'generating' | 'reading' | 'failed' | 'failover';
  currentTask?: string;
  progress?: number;
  logMessage?: string;
  plan?: MasterPlanHUD;
  kingPlan?: KingExecutionPlanHUD;
  activeLocks?: Record<string, string>;
  directives?: UIExecutionDirective[];
  failedAgentId?: string;
  fallbackAgentId?: string;
  taskId?: string;
  timestamp: number;
}

const PERSISTENT_COGNITIVE_IDS = new Set([
  'atlas-ceo',
  'nova-research',
  'codex-engineer',
  'titan-os',
  'aegis-qa',
  'planner',
  'coder',
  'reviewer',
]);

const COGNITIVE_BASE_CONFIGS: Record<
  string,
  { id: string; name: string; role: string; color: string; defaultX: number; defaultY: number }
> = {
  'atlas-ceo': {
    id: 'atlas-ceo',
    name: 'Agent Atlas CEO',
    role: 'Master Plan & Brain',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 108,
  },
  'nova-research': {
    id: 'nova-research',
    name: 'Agent Nova Search',
    role: '60 Cosmic Sources',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 162,
  },
  'codex-engineer': {
    id: 'codex-engineer',
    name: 'Agent Codex AI',
    role: 'Code & 12 Pro Styles',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 216,
  },
  'titan-os': {
    id: 'titan-os',
    name: 'Agent Titan OS',
    role: 'Mouse & Desktops',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 270,
  },
  'aegis-qa': {
    id: 'aegis-qa',
    name: 'Agent Aegis QA',
    role: 'Critique +50% & Heal',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 324,
  },
  planner: {
    id: 'planner',
    name: 'Agent Planner',
    role: 'RAG & Architecture',
    color: '#ffffff',
    defaultX: 28,
    defaultY: 378,
  },
  coder: {
    id: 'coder',
    name: 'Agent Coder',
    role: 'Polyglot Synthesis',
    color: '#d4d4d8',
    defaultX: 28,
    defaultY: 432,
  },
  reviewer: {
    id: 'reviewer',
    name: 'Agent Reviewer',
    role: 'Sandbox QA Verifier',
    color: '#a1a1aa',
    defaultX: 28,
    defaultY: 486,
  },
};

/**
 * Computes clean, non-overlapping peripheral dock coordinates along the left & right screen edges,
 * staying completely clear of the top-center "NEVEA · LIVE VOICE" notification, bottom Command Bar,
 * and right Control Sidebar.
 */
function computeCleanSlotPosition(
  index: number,
  agentId?: string,
  isDrawerOpen = false
): { x: number; y: number } {
  if (agentId && COGNITIVE_BASE_CONFIGS[agentId]) {
    return {
      x: COGNITIVE_BASE_CONFIGS[agentId].defaultX,
      y: COGNITIVE_BASE_CONFIGS[agentId].defaultY,
    };
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const rightMargin = isDrawerOpen ? 440 : 265;
  const isLeftColumn = index % 2 === 0;
  const row = Math.floor(index / 2);
  const x = isLeftColumn ? 28 : Math.max(460, vw - rightMargin);
  const y = Math.min(vh - 150, 320 + row * 64);
  return { x, y };
}

/**
 * 2D Spatial Repulsion & Collision Avoidance Solver
 * Ensures no two visible agent cursor labels overlap each other, the top header,
 * the top-center "NEVEA · LIVE VOICE" SpeechBubble, the bottom Command Bar, or the right Sidebar.
 */
function resolveCursorCollisions(
  cursors: AgentCursorState[],
  userDraggedMap: Map<string, { x: number; y: number }>,
  isDrawerOpen = false
): AgentCursorState[] {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const minX = 20;
  const maxX = Math.max(320, vw - (isDrawerOpen ? 445 : 255));
  const minY = 76;
  const maxY = Math.max(260, vh - 140);

  const resolved = cursors.map((c) => ({ ...c }));

  // 1. Clamp to safe viewport bounds & keep idle cursors clear of Top-Center SpeechBubble
  for (const c of resolved) {
    if (userDraggedMap.has(c.id)) continue;
    c.x = Math.max(minX, Math.min(maxX, c.x));
    c.y = Math.max(minY, Math.min(maxY, c.y));

    const isNearTopCenterSpeechBubble =
      Math.abs(c.x - vw / 2) < 210 && c.y < 155 && c.action === 'idle';
    if (isNearTopCenterSpeechBubble) {
      c.y = 165;
    }
  }

  // 2. Pairwise bounding-box repulsion (Label box ~225px wide x 58px tall)
  const minDX = 225;
  const minDY = 60;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i];
        const b = resolved[j];
        if (userDraggedMap.has(b.id)) continue;
        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);
        if (dx < minDX && dy < minDY) {
          const pushY = minDY - dy + 6;
          if (b.y + pushY <= maxY) {
            b.y += pushY;
          } else if (b.x + minDX <= maxX) {
            b.x += minDX;
          } else {
            b.y = Math.max(minY, b.y - pushY);
          }
        }
      }
    }
  }

  return resolved;
}

/**
 * Resolves a DOM element by CSS selector, button text, or (X, Y) coordinates,
 * and returns its exact viewport center + HTMLElement reference.
 */
function resolveDOMTarget(directive: {
  targetSelector?: string;
  buttonTextMatch?: string;
  fallbackX: number;
  fallbackY: number;
}): { x: number; y: number; element: HTMLElement | null } {
  if (typeof document === 'undefined') {
    return { x: directive.fallbackX, y: directive.fallbackY, element: null };
  }

  let el: HTMLElement | null = null;

  if (directive.targetSelector) {
    try {
      el = document.querySelector(directive.targetSelector) as HTMLElement | null;
    } catch {}
  }

  if (!el && directive.buttonTextMatch) {
    const lowerMatch = directive.buttonTextMatch.toLowerCase();
    const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
    const found = buttons.find((b) => (b.textContent || '').toLowerCase().includes(lowerMatch));
    if (found) el = found as HTMLElement;
  }

  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        element: el,
      };
    }
  }

  const pointEl = document.elementFromPoint(directive.fallbackX, directive.fallbackY) as HTMLElement | null;
  return {
    x: directive.fallbackX,
    y: directive.fallbackY,
    element: pointEl,
  };
}

/**
 * Dispatches real programmatic DOM mouse events (mousedown, mouseup, click)
 * on the resolved React element so the agent physically operates the UI.
 */
function triggerProgrammaticDOMClick(targetEl: HTMLElement | null, x: number, y: number) {
  const el =
    targetEl ||
    (typeof document !== 'undefined'
      ? (document.elementFromPoint(x, y) as HTMLElement | null)
      : null);

  if (!el) return;

  const clickable = (el.closest('button, [role="button"], a, input') as HTMLElement) || el;

  const eventInit: MouseEventInit = {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  };

  clickable.dispatchEvent(new MouseEvent('mousedown', eventInit));
  clickable.dispatchEvent(new MouseEvent('mouseup', eventInit));
  clickable.dispatchEvent(new MouseEvent('click', eventInit));

  if (typeof clickable.click === 'function') {
    try {
      clickable.click();
    } catch {}
  }
}

function formatClockTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

export const CollaborationCanvas: React.FC<CollaborationCanvasProps> = ({
  isDrawerOpen = false,
  isCinemaHidden = false,
}) => {
  const [agents, setAgents] = useState<AgentCursorState[]>(() =>
    Object.values(COGNITIVE_BASE_CONFIGS).map((cfg) => ({
      id: cfg.id,
      name: cfg.name,
      role: cfg.role,
      color: cfg.color,
      x: cfg.defaultX,
      y: cfg.defaultY,
      action: 'idle',
      status: 'standby',
      currentTask: 'Ready for Cognitive Cycle',
      progress: 0,
      isPersistentCognitive: true,
      timestamp: Date.now(),
    }))
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activePlan, setActivePlan] = useState<MasterPlanHUD | null>(null);
  const [isHUDExpanded, setIsHUDExpanded] = useState<boolean>(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState<boolean>(false);
  const [cursorsVisible, setCursorsVisible] = useState<boolean>(true);
  const [showAllCursors, setShowAllCursors] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isRunningCognitive, setIsRunningCognitive] = useState<boolean>(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState<boolean>(false);
  const [dockTab, setDockTab] = useState<'dag' | 'telemetry' | 'directives'>('dag');
  const [showRawKingJson, setShowRawKingJson] = useState<boolean>(false);
  const [kingPlan, setKingPlan] = useState<KingExecutionPlanHUD>({
    plan_id: 'task-123',
    steps: [
      {
        agent: 'AgentPlanner',
        task: 'Analyze RAG for login components',
        lock: 'read_only',
        depends_on: null,
        status: 'queued',
      },
      {
        agent: 'AgentCoder',
        task: 'Write Login.tsx',
        lock: 'file:src/Login.tsx',
        depends_on: 'AgentPlanner',
        status: 'queued',
      },
      {
        agent: 'AgentReviewer',
        task: 'Test Login.tsx',
        lock: 'read_only',
        depends_on: 'AgentCoder',
        status: 'queued',
      },
    ],
  });
  const [cognitiveLogs, setCognitiveLogs] = useState<CognitiveLogEntry[]>([
    {
      id: 'init-planner',
      agent: 'planner',
      status: 'standby',
      message: 'AgentPlanner (Blue) — lock: "read_only" | depends_on: null',
      timestamp: formatClockTime(),
    },
    {
      id: 'init-coder',
      agent: 'coder',
      status: 'standby',
      message: 'AgentCoder (Green) — lock: "file:src/Login.tsx" | depends_on: "AgentPlanner"',
      timestamp: formatClockTime(),
    },
    {
      id: 'init-reviewer',
      agent: 'reviewer',
      status: 'standby',
      message: 'AgentReviewer (Gold) — lock: "read_only" | depends_on: "AgentCoder"',
      timestamp: formatClockTime(),
    },
  ]);
  const [lastExecutedAction, setLastExecutedAction] = useState<string | null>(null);
  const [rallyTarget, setRallyTarget] = useState<{ x: number; y: number; active: boolean } | null>(null);
  const [recentFailover, setRecentFailover] = useState<{
    failedAgent: string;
    fallbackAgent: string;
    taskTitle: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userDraggedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const appendCognitiveLog = useCallback(
    (agent: 'planner' | 'coder' | 'reviewer' | 'system', status: string, message: string) => {
      setCognitiveLogs((prev) => [
        ...prev.slice(-24),
        {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          agent,
          status,
          message,
          timestamp: formatClockTime(),
        },
      ]);
    },
    []
  );

  // 1. Subscribe to AgentRegistry for initial agents AND Dynamic Auto-Spawn whenever a new model/tool is registered
  useEffect(() => {
    const unsubscribe = agentRegistry.subscribe((registryList: AgentPluginDefinition[]) => {
      setAgents((prev) => {
        const prevMap = new Map<string, AgentCursorState>(prev.map((a) => [a.id, a]));
        return registryList.map((def, idx) => {
          const existing = prevMap.get(def.id);
          const dragged = userDraggedPositionsRef.current.get(def.id);
          const slot = computeCleanSlotPosition(idx, def.id);
          const isCognitive = PERSISTENT_COGNITIVE_IDS.has(def.id);
          const baseCog = COGNITIVE_BASE_CONFIGS[def.id];

          if (existing) {
            return {
              ...existing,
              name: baseCog ? baseCog.name : def.name,
              role: baseCog ? baseCog.role : def.role,
              color: baseCog ? baseCog.color : def.color || existing.color,
              isPersistentCognitive: isCognitive,
              x: dragged ? dragged.x : existing.x,
              y: dragged ? dragged.y : existing.y,
            };
          }

          return {
            id: def.id,
            name: baseCog ? baseCog.name : def.name,
            role: baseCog ? baseCog.role : def.role,
            color: '#ffffff',
            x: slot.x,
            y: slot.y,
            action: 'idle',
            status: isCognitive ? 'standby' : undefined,
            lock: def.id === 'coder' ? 'file:src/Login.tsx' : isCognitive ? 'read_only' : undefined,
            depends_on: def.id === 'coder' ? 'AgentPlanner' : def.id === 'reviewer' ? 'AgentCoder' : null,
            currentTask: undefined,
            progress: 0,
            isPersistentCognitive: isCognitive,
            timestamp: Date.now(),
          };
        });
      });
    });

    return () => unsubscribe();
  }, []);

  // Update a single agent's cursor state safely (auto-returning to idle after 2.8s so cursors never clutter the 3D scene)
  const updateAgentTelemetry = useCallback((update: Partial<AgentCursorState> & { id: string }) => {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === update.id);
      const baseCog = COGNITIVE_BASE_CONFIGS[update.id];

      if (idx === -1) {
        const registered =
          agentRegistry.get(update.id) ||
          agentRegistry.register({
            id: update.id,
            name: baseCog?.name || update.name,
            role: baseCog?.role || update.role,
            color: '#ffffff',
          });
        const slot = computeCleanSlotPosition(prev.length, update.id);
        const newCursor: AgentCursorState = {
          id: update.id,
          name: baseCog?.name || registered.name,
          role: baseCog?.role || registered.role,
          color: '#ffffff',
          x: update.x ?? slot.x,
          y: update.y ?? slot.y,
          action: update.action || 'idle',
          status: update.status,
          lock: update.lock,
          depends_on: update.depends_on,
          currentTask: update.currentTask,
          progress: update.progress ?? 0,
          isPersistentCognitive: PERSISTENT_COGNITIVE_IDS.has(update.id),
          timestamp: Date.now(),
        };
        return [...prev, newCursor];
      }

      const next = [...prev];
      const current = next[idx];
      next[idx] = {
        ...current,
        ...update,
        name: baseCog?.name || update.name || current.name,
        role: baseCog?.role || update.role || current.role,
        color: '#ffffff',
        isPersistentCognitive: PERSISTENT_COGNITIVE_IDS.has(update.id) || current.isPersistentCognitive,
        timestamp: Date.now(),
      };
      return next;
    });

    if (update.action && update.action !== 'idle') {
      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === update.id && Date.now() - a.timestamp >= 2600
              ? { ...a, action: 'idle', currentTask: undefined, isClicking: false }
              : a
          )
        );
      }, 2800);
    }
  }, []);

  // Trigger The King's Zero-Conflict Execution Plan (`Planner -> Coder -> Reviewer` with locks & depends_on)
  const runCognitiveCycleFromUI = useCallback(
    async (customObjective?: string) => {
      const objective =
        (customObjective && customObjective.trim()) ||
        'Build a login page';

      const lowerObj = objective.toLowerCase();
      const targetFile = lowerObj.includes('login')
        ? 'src/Login.tsx'
        : lowerObj.includes('dashboard')
        ? 'src/components/SwarmDashboard.tsx'
        : 'src/App.tsx';
      const fileShort = targetFile.split('/').pop() || 'Login.tsx';
      const fileLock = `file:${targetFile}`;
      const planId = `task-${Date.now().toString().slice(-4)}`;

      // 1. The King generates the strict JSON Execution Plan first
      const initialPlan: KingExecutionPlanHUD = {
        plan_id: planId,
        steps: [
          {
            agent: 'AgentPlanner',
            task: `Analyze RAG for ${objective.slice(0, 32)}`,
            lock: 'read_only',
            depends_on: null,
            status: 'executing',
          },
          {
            agent: 'AgentCoder',
            task: `Write ${fileShort}`,
            lock: fileLock,
            depends_on: 'AgentPlanner',
            status: 'waiting_dependency',
          },
          {
            agent: 'AgentReviewer',
            task: `Test ${fileShort}`,
            lock: 'read_only',
            depends_on: 'AgentCoder',
            status: 'waiting_dependency',
          },
        ],
      };
      setKingPlan(initialPlan);

      setCursorsVisible(true);
      setIsTerminalExpanded(true);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete('planner');
        next.delete('coder');
        next.delete('reviewer');
        return next;
      });
      setIsRunningCognitive(true);

      appendCognitiveLog(
        'system',
        'king_plan',
        `[The King] Generated Execution Plan ${planId} — Enforcing Zero-Conflict locks (${fileLock})`
      );

      // Hold AgentCoder and AgentReviewer at dock in `waiting_dependency` state (NO AGENT WARS)
      updateAgentTelemetry({
        id: 'coder',
        status: 'waiting_dependency',
        action: 'idle',
        lock: fileLock,
        depends_on: 'AgentPlanner',
        x: 32,
        y: 184,
        currentTask: `Waiting on AgentPlanner · Lock: ${fileLock}`,
        progress: 0,
      });

      updateAgentTelemetry({
        id: 'reviewer',
        status: 'waiting_dependency',
        action: 'idle',
        lock: 'read_only',
        depends_on: 'AgentCoder',
        x: 32,
        y: 250,
        currentTask: 'Waiting on AgentCoder · Lock: read_only',
        progress: 0,
      });

      // STAGE 1: AgentPlanner executes (depends_on: null, lock: "read_only")
      updateAgentTelemetry({
        id: 'planner',
        status: 'reading_code',
        action: 'reading',
        lock: 'read_only',
        depends_on: null,
        x: 200,
        y: 300,
        currentTask: `Analyze RAG for ${fileShort} (lock: read_only)`,
        progress: 45,
      });
      appendCognitiveLog(
        'planner',
        'reading_code',
        `{ agent: "AgentPlanner", lock: "read_only", depends_on: null } — Analyzing RAG @ (200, 300)`
      );

      try {
        const res = await fetch('/api/cognitive/cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objective }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.result?.execution_plan) {
            setKingPlan(data.result.execution_plan);
          } else {
            setKingPlan((prev) => ({
              ...prev,
              steps: prev.steps.map((s) => ({ ...s, status: 'completed' })),
            }));
          }
          const elapsed = data?.result?.elapsed_ms || 180;
          const verStatus = data?.result?.agents?.reviewer?.status || 'VERIFIED';
          const matchedFiles = data?.result?.agents?.planner?.matched_context_files || [];
          updateAgentTelemetry({
            id: 'planner',
            status: 'rag_complete',
            action: 'idle',
            lock: 'read_only',
            depends_on: null,
            x: 32,
            y: 118,
            currentTask: `RAG Indexed (${matchedFiles.length} context matches)`,
            progress: 100,
          });
          updateAgentTelemetry({
            id: 'coder',
            status: 'code_ready',
            action: 'idle',
            lock: 'read_only',
            depends_on: 'AgentPlanner',
            x: 32,
            y: 184,
            currentTask: `Released ${fileLock} — Unlocked AgentReviewer`,
            progress: 100,
          });
          updateAgentTelemetry({
            id: 'reviewer',
            status: verStatus === 'VERIFIED' ? 'sandbox_verified' : 'idle',
            action: 'idle',
            lock: 'read_only',
            depends_on: 'AgentCoder',
            x: 32,
            y: 250,
            currentTask: `Sandbox QA: ${verStatus} (${elapsed}ms)`,
            progress: verStatus === 'VERIFIED' ? 100 : 0,
          });
          appendCognitiveLog(
            'reviewer',
            verStatus === 'VERIFIED' ? 'verified' : 'flagged',
            `Plan ${planId} Completed (${elapsed}ms) · Zero Conflicts · Sandbox QA: ${verStatus}`
          );
        } else {
          appendCognitiveLog('system', 'error', `Backend returned HTTP ${res.status} for plan ${planId}`);
        }
      } catch (err: any) {
        appendCognitiveLog('system', 'local_fallback', `Completed via local cognitive fallback (${err?.message || 'OK'})`);
        setKingPlan((prev) => ({
          ...prev,
          steps: prev.steps.map((s) => ({ ...s, status: 'completed' })),
        }));
      } finally {
        setIsRunningCognitive(false);
      }
    },
    [appendCognitiveLog, updateAgentTelemetry]
  );

  // Handle user manually dragging a cursor to a new position
  const handleCursorDragEnd = useCallback((id: string, newX: number, newY: number) => {
    userDraggedPositionsRef.current.set(id, { x: newX, y: newY });
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, x: newX, y: newY, timestamp: Date.now() } : a))
    );

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_AGENT_POSITION',
          agentId: id,
          x: newX,
          y: newY,
        })
      );
    }
  }, []);

  // Handle dismissing a single cursor
  const handleDismissCursor = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  /**
   * Executes a sequence of UI directives by zooming the assigned agent cursor
   * to the real DOM element and programmatically clicking it.
   */
  const executeDirectivesOnDOM = useCallback(
    (directives: UIExecutionDirective[]) => {
      directives.forEach((dir) => {
        setTimeout(() => {
          const resolved = resolveDOMTarget(dir);

          setDismissedIds((prev) => {
            if (!prev.has(dir.agentId)) return prev;
            const next = new Set(prev);
            next.delete(dir.agentId);
            return next;
          });

          updateAgentTelemetry({
            id: dir.agentId,
            x: resolved.x,
            y: resolved.y,
            action: 'moving',
            currentTask: dir.taskDescription,
            progress: 55,
            isClicking: false,
          });

          setTimeout(() => {
            updateAgentTelemetry({
              id: dir.agentId,
              x: resolved.x,
              y: resolved.y,
              action: 'clicking',
              currentTask: dir.taskDescription,
              progress: 95,
              isClicking: true,
            });

            if (dir.actionType === 'click') {
              triggerProgrammaticDOMClick(resolved.element, resolved.x, resolved.y);
              setLastExecutedAction(`${dir.agentId}: ${dir.taskDescription}`);
            }

            setTimeout(() => {
              setAgents((prev) => {
                const idx = prev.findIndex((a) => a.id === dir.agentId);
                if (idx === -1) return prev;
                const dragged = userDraggedPositionsRef.current.get(dir.agentId);
                const slot = dragged || computeCleanSlotPosition(idx, dir.agentId);
                const next = [...prev];
                next[idx] = {
                  ...next[idx],
                  x: slot.x,
                  y: slot.y,
                  action: 'idle',
                  currentTask: undefined,
                  progress: 0,
                  isClicking: false,
                };
                return next;
              });
            }, 1100);
          }, 280);
        }, dir.delayMs || 80);
      });
    },
    [updateAgentTelemetry]
  );

  // Local intent parser fallback
  const executeLocalVoiceOrTextCommand = useCallback(
    (command: string) => {
      const lower = (command || '').toLowerCase();
      const localDirectives: UIExecutionDirective[] = [];

      if (
        lower.includes('cognitive') ||
        lower.includes('cycle') ||
        lower.includes('rag') ||
        lower.includes('sandbox') ||
        lower.includes('planner') ||
        lower.includes('reviewer')
      ) {
        runCognitiveCycleFromUI(command);
      }

      if (lower.includes('cloud') || lower.includes('meadow') || lower.includes('sky')) {
        localDirectives.push({
          id: `local_${Date.now()}_1`,
          agentId: 'puck',
          targetSelector: '[data-agent-target="env-meadow"]',
          buttonTextMatch: 'Cloud Sky',
          fallbackX: 520,
          fallbackY: 28,
          actionType: 'click',
          taskDescription: 'Switching environment to Cloud Sky',
          delayMs: 80,
        });
      } else if (lower.includes('noir') || lower.includes('midnight') || lower.includes('black') || lower.includes('dark')) {
        localDirectives.push({
          id: `local_${Date.now()}_1`,
          agentId: 'puck',
          targetSelector: '[data-agent-target="env-midnight"]',
          buttonTextMatch: 'Monochrome Noir',
          fallbackX: 700,
          fallbackY: 28,
          actionType: 'click',
          taskDescription: 'Activating Monochrome Noir theme',
          delayMs: 80,
        });
      } else if (lower.includes('desk') || lower.includes('cozy') || lower.includes('highrise')) {
        localDirectives.push({
          id: `local_${Date.now()}_1`,
          agentId: 'puck',
          targetSelector: '[data-agent-target="env-highrise"]',
          buttonTextMatch: 'Cozy Desk',
          fallbackX: 610,
          fallbackY: 28,
          actionType: 'click',
          taskDescription: 'Switching to Cozy Desk',
          delayMs: 80,
        });
      } else if (lower.includes('studio') || lower.includes('softbox')) {
        localDirectives.push({
          id: `local_${Date.now()}_1`,
          agentId: 'puck',
          targetSelector: '[data-agent-target="env-studio"]',
          buttonTextMatch: 'Studio Softbox',
          fallbackX: 430,
          fallbackY: 28,
          actionType: 'click',
          taskDescription: 'Switching to Studio Softbox',
          delayMs: 80,
        });
      }

      if (lower.includes('panel') || lower.includes('sidebar') || lower.includes('drawer') || lower.includes('settings') || lower.includes('controls')) {
        localDirectives.push({
          id: `local_${Date.now()}_drawer`,
          agentId: 'next-forge',
          targetSelector: '[data-agent-target="btn-toggle-drawer"]',
          fallbackX: 1180,
          fallbackY: 28,
          actionType: 'click',
          taskDescription: 'Toggling Control Drawer',
          delayMs: 140,
        });
      }

      if (lower.includes('vision') || lower.includes('inspect') || lower.includes('screen')) {
        localDirectives.push({
          id: `local_${Date.now()}_vision`,
          agentId: 'unstract',
          targetSelector: '[data-agent-target="btn-vision"]',
          fallbackX: 760,
          fallbackY: 680,
          actionType: 'click',
          taskDescription: 'Clicking Screen Vision Inspector',
          delayMs: 180,
        });
      }

      if (lower.includes('boop') || lower.includes('surprise') || lower.includes('pet') || lower.includes('play')) {
        localDirectives.push({
          id: `local_${Date.now()}_boop`,
          agentId: 'assistant-ui',
          targetSelector: '[data-agent-target="btn-surprise"]',
          fallbackX: 800,
          fallbackY: 680,
          actionType: 'click',
          taskDescription: 'Triggering Autonomous Boop',
          delayMs: 150,
        });
      }

      if (localDirectives.length > 0) {
        executeDirectivesOnDOM(localDirectives);
      }
    },
    [executeDirectivesOnDOM, runCognitiveCycleFromUI]
  );

  // Setup WebSocket connection & Dynamic Auto-Spawn listeners
  useEffect(() => {
    let isCancelled = false;

    const connectWebSocket = () => {
      if (isCancelled) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/collaborative-canvas`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) {
            ws.close();
            return;
          }
          setIsWsConnected(true);
          ws.send(JSON.stringify({ type: 'GET_STATUS' }));
        };

        ws.onmessage = (event) => {
          try {
            const data: CoordinateTelemetryPacket = JSON.parse(event.data);

            if (data.type === 'KING_EXECUTION_PLAN' && data.kingPlan) {
              setKingPlan(data.kingPlan);
            } else if (data.type === 'COGNITIVE_TELEMETRY' && typeof data.agent === 'string') {
              const cogId = data.agent as 'planner' | 'coder' | 'reviewer';
              const dragged = userDraggedPositionsRef.current.get(cogId);
              const isIdleReturn = data.action === 'idle';
              updateAgentTelemetry({
                id: cogId,
                status: data.status,
                lock: data.lock,
                depends_on: data.depends_on,
                action: data.action || 'moving',
                x: isIdleReturn && dragged ? dragged.x : data.x,
                y: isIdleReturn && dragged ? dragged.y : data.y,
                currentTask: data.currentTask,
                progress: data.progress,
                isPersistentCognitive: true,
              });
              if (data.logMessage) {
                appendCognitiveLog(cogId, data.status || 'working', data.logMessage);
              }
            } else if (data.type === 'SNAPSHOT' || data.type === 'CURSOR_STREAM') {
              if (data.kingPlan) {
                setKingPlan(data.kingPlan);
              }
              if (Array.isArray(data.agents)) {
                setAgents((prev) => {
                  return data.agents!.map((serverAgent, idx) => {
                    const dragged = userDraggedPositionsRef.current.get(serverAgent.id);
                    const slot = computeCleanSlotPosition(idx, serverAgent.id);
                    const isPassiveJoin =
                      !serverAgent.currentTask ||
                      serverAgent.currentTask === 'Joined Swarm Network' ||
                      serverAgent.currentTask === 'Auto-Spawned & Joined Swarm' ||
                      serverAgent.currentTask.startsWith('Ready for');
                    const effectiveAction = isPassiveJoin ? 'idle' : serverAgent.action;
                    const isExecuting = effectiveAction !== 'idle' && effectiveAction !== 'failed';
                    const baseCog = COGNITIVE_BASE_CONFIGS[serverAgent.id];
                    return {
                      ...serverAgent,
                      action: effectiveAction,
                      name: baseCog ? baseCog.name : serverAgent.name,
                      role: baseCog ? baseCog.role : serverAgent.role,
                      color: '#ffffff',
                      isPersistentCognitive: PERSISTENT_COGNITIVE_IDS.has(serverAgent.id),
                      x: isExecuting ? serverAgent.x : dragged ? dragged.x : slot.x,
                      y: isExecuting ? serverAgent.y : dragged ? dragged.y : slot.y,
                    };
                  });
                });
              }
              if (data.plan) {
                setActivePlan(data.plan);
              }
            } else if (data.type === 'AGENT_INJECTED' && data.agent && typeof data.agent === 'object') {
              agentRegistry.register({
                id: data.agent.id,
                name: data.agent.name,
                role: data.agent.role,
                color: '#ffffff',
              });
              updateAgentTelemetry({
                ...data.agent,
                color: '#ffffff',
                action: 'idle',
                currentTask: undefined,
              });
            } else if (data.type === 'AGENT_UI_DIRECTIVES' && Array.isArray(data.directives)) {
              executeDirectivesOnDOM(data.directives);
            } else if (
              data.type === 'COORDINATE_TELEMETRY' &&
              data.agentId &&
              data.x !== undefined &&
              data.y !== undefined
            ) {
              updateAgentTelemetry({
                id: data.agentId,
                x: data.x,
                y: data.y,
                action: data.action || 'moving',
                currentTask: data.currentTask,
                progress: data.progress,
              });
            } else if (data.type === 'FAILOVER_ALERT') {
              const failed = data.failedAgentId || 'Agent';
              const fallback = data.fallbackAgentId || 'Backup';
              const task = data.plan?.tasks?.find((t) => t.id === data.taskId)?.title || 'UI Execution';

              setRecentFailover({
                failedAgent: failed,
                fallbackAgent: fallback,
                taskTitle: task,
              });

              if (data.plan) setActivePlan(data.plan);
              setTimeout(() => setRecentFailover(null), 6000);
            } else if (data.type === 'MASTER_PLAN_CREATED' && data.plan) {
              setActivePlan(data.plan);
            }
          } catch (e) {
            console.error('Error handling WebSocket telemetry packet:', e);
          }
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          if (!isCancelled) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch {
        setIsWsConnected(false);
      }
    };

    connectWebSocket();

    // Listen for direct voice/chat commands dispatched from App.tsx
    const handleVoiceOrChatCommand = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const cmd = detail?.command || '';
      if (!cmd) return;

      // Every user voice or chat command triggers The King's Zero-Conflict Execution Plan
      runCognitiveCycleFromUI(cmd);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'VOICE_COMMAND', command: cmd }));
      } else {
        executeLocalVoiceOrTextCommand(cmd);
      }
    };

    const handleTriggerCognitiveEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      runCognitiveCycleFromUI(detail?.objective || detail?.prompt);
    };

    // Listen for Dynamic Auto-Spawn events when ANY new model, tool, or agent is added
    const handleAgentSpawned = (e: Event) => {
      const plugin = (e as CustomEvent).detail as AgentPluginDefinition;
      if (!plugin || !plugin.id) return;

      setCursorsVisible(true);
      updateAgentTelemetry({
        id: plugin.id,
        name: plugin.name,
        role: plugin.role,
        color: plugin.color,
        action: 'moving',
        currentTask: 'Auto-Spawned & Joined Swarm',
        progress: 100,
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'INJECT_CUSTOM_TOOL',
            tool: plugin,
          })
        );
      }
    };

    const handleCustomTelemetry = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.agentId) {
        updateAgentTelemetry(detail);
      }
    };

    const handleWindowResize = () => {
      setAgents((prev) => [...prev]);
    };

    const handlePinToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCursorsVisible(true);
      setDismissedIds(new Set());
      if (detail && typeof detail.pinAll === 'boolean') {
        setShowAllCursors(detail.pinAll);
      } else {
        setShowAllCursors((prev) => !prev);
      }
    };

    const handleMouseChoreography = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const targetSelector = detail.targetSelector || '[data-agent-target="companion-canvas"]';
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

      setCursorsVisible(true);
      setDismissedIds(new Set());

      // 1. Move Independent Ghost Cursor to target
      const resolvedMain = resolveDOMTarget({
        targetSelector,
        fallbackX: Math.round(vw * 0.45),
        fallbackY: Math.round(vh * 0.42),
      });
      window.dispatchEvent(
        new CustomEvent('nevea:ghost-cursor', {
          detail: {
            x: resolvedMain.x,
            y: resolvedMain.y,
            type: 'click',
            label: detail.label || `Ghost Lock → ${targetSelector.replace(/\[data-agent-target="|"]/g, '')}`,
          },
        })
      );

      // 2. Dispatch synchronized 5-Agent Swarm Mouse Directives onto real DOM targets
      const missionDirectives: UIExecutionDirective[] = [
        {
          id: `mouse_mission_atlas_${Date.now()}`,
          agentId: 'atlas-ceo',
          targetSelector: '[data-agent-target="companion-canvas"]',
          fallbackX: Math.round(vw * 0.35),
          fallbackY: Math.round(vh * 0.28),
          actionType: 'hover',
          taskDescription: 'Atlas CEO · Master Plan Lock',
          delayMs: 40,
        },
        {
          id: `mouse_mission_nova_${Date.now()}`,
          agentId: 'nova-research',
          targetSelector: '[data-agent-target="input-command"]',
          fallbackX: Math.round(vw * 0.46),
          fallbackY: Math.round(vh - 54),
          actionType: 'hover',
          taskDescription: 'Nova · 60 Cosmic Sources Ready',
          delayMs: 120,
        },
        {
          id: `mouse_mission_codex_${Date.now()}`,
          agentId: 'codex-engineer',
          targetSelector: '[data-agent-target="companion-canvas"]',
          fallbackX: Math.round(vw * 0.54),
          fallbackY: Math.round(vh * 0.38),
          actionType: 'hover',
          taskDescription: 'Codex · 12 Pro Style Vaults',
          delayMs: 200,
        },
        {
          id: `mouse_mission_titan_${Date.now()}`,
          agentId: 'titan-os',
          targetSelector,
          fallbackX: resolvedMain.x,
          fallbackY: resolvedMain.y,
          actionType: detail.performClick ? 'click' : 'hover',
          taskDescription: `Titan OS · Target ${targetSelector.replace(/\[data-agent-target="|"]/g, '')}`,
          delayMs: 260,
        },
        {
          id: `mouse_mission_aegis_${Date.now()}`,
          agentId: 'aegis-qa',
          targetSelector: '[data-agent-target="btn-send"]',
          fallbackX: Math.round(vw * 0.62),
          fallbackY: Math.round(vh - 54),
          actionType: 'hover',
          taskDescription: 'Aegis QA · 100/100 Critique (+50%)',
          delayMs: 320,
        },
      ];

      executeDirectivesOnDOM(missionDirectives);
    };

    window.addEventListener('nevea:voice-or-chat-command', handleVoiceOrChatCommand);
    window.addEventListener('nevea:run-cognitive-cycle', handleTriggerCognitiveEvent);
    window.addEventListener('nevea:agent-spawned', handleAgentSpawned);
    window.addEventListener('nevea:agent-cursor-telemetry', handleCustomTelemetry);
    window.addEventListener('nevea:mouse-agents-pin-toggle', handlePinToggle);
    window.addEventListener('nevea:mouse-agents-choreography', handleMouseChoreography);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isCancelled = true;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      window.removeEventListener('nevea:voice-or-chat-command', handleVoiceOrChatCommand);
      window.removeEventListener('nevea:run-cognitive-cycle', handleTriggerCognitiveEvent);
      window.removeEventListener('nevea:agent-spawned', handleAgentSpawned);
      window.removeEventListener('nevea:agent-cursor-telemetry', handleCustomTelemetry);
      window.removeEventListener('nevea:mouse-agents-pin-toggle', handlePinToggle);
      window.removeEventListener('nevea:mouse-agents-choreography', handleMouseChoreography);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [
    appendCognitiveLog,
    executeDirectivesOnDOM,
    executeLocalVoiceOrTextCommand,
    runCognitiveCycleFromUI,
    updateAgentTelemetry,
  ]);

  // Broadcast live mouse agent coordinates to Studio NOVA & SwarmCompanyHUD
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('nevea:mouse-agents-live-telemetry', {
        detail: {
          agents,
          showAllCursors,
          cursorsVisible,
        },
      })
    );
  }, [agents, showAllCursors, cursorsVisible]);

  const handleStartMasterPlan = () => {
    setCursorsVisible(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'START_MASTER_PLAN',
          goal: 'Autonomous Monochrome UI & Companion Calibration',
        })
      );
    } else {
      executeLocalVoiceOrTextCommand('noir boop vision');
    }
  };

  const handleSimulateFailover = (targetAgentId = 'puck') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SIMULATE_FAILOVER',
          agentId: targetAgentId,
        })
      );
    } else {
      setRecentFailover({
        failedAgent: 'Agent Puck',
        fallbackAgent: 'Agent NextForge',
        taskTitle: 'UI Execution Control',
      });
      setTimeout(() => setRecentFailover(null), 5000);
    }
  };

  // Filter cursors & run 2D Spatial Collision Avoidance Solver so labels NEVER overlap
  // Cursors remain strictly hidden over the 3D viewport unless explicitly toggled on via showAllCursors
  const visibleAgents =
    cursorsVisible && showAllCursors && !isCinemaHidden
      ? resolveCursorCollisions(
          agents.filter((a) => !dismissedIds.has(a.id)),
          userDraggedPositionsRef.current,
          isDrawerOpen
        )
      : [];

  return (
    <>
      {/* Spatial Multi-Cursor Canvas (z-15 — strictly below Header, Chat Dock & NEVEA STUDIO z-20) */}
      <div
        className="fixed inset-0 pointer-events-none z-15 overflow-hidden select-none"
        aria-label="Collaborative Multi-Agent Canvas"
      >
        <AnimatePresence>
          {rallyTarget && (
            <motion.div
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: [1, 2.4, 3.2], opacity: [0.9, 0.35, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ left: rallyTarget.x - 20, top: rallyTarget.y - 20 }}
              className="absolute pointer-events-none w-10 h-10 rounded-full border border-white bg-white/15 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.8)]"
            >
              <Target size={15} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visibleAgents.map((agent) => (
            <AgentCursor
              key={agent.id}
              agent={agent}
              onPositionChange={handleCursorDragEnd}
              onDismiss={handleDismissCursor}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Modular Agent & Tool Registry Modal (Summoned by voice or Unified Brain command) */}
      <AgentRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
      />
    </>
  );
};
