import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export interface TaskNode {
  id: string;
  title: string;
  assignedAgentId: string;
  backupAgentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'failover_reassigned';
  progress: number;
  currentAction: string;
  targetSelector?: string;
  dependencies: string[];
  output?: any;
}

export interface MasterPlan {
  id: string;
  goal: string;
  timestamp: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  tasks: TaskNode[];
}

export interface KingExecutionStep {
  agent: string;
  task: string;
  lock: string;
  depends_on: string | null;
  status?: 'queued' | 'waiting_dependency' | 'waiting_lock' | 'executing' | 'completed' | 'failed';
}

export interface KingExecutionPlan {
  plan_id: string;
  goal?: string;
  steps: KingExecutionStep[];
}

export interface CollaborativeAgentState {
  id: string;
  name: string;
  role: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetSelector?: string;
  action: 'idle' | 'moving' | 'clicking' | 'typing' | 'generating' | 'reading' | 'failed' | 'failover';
  status?: string;
  lock?: string;
  depends_on?: string | null;
  currentTask?: string;
  progress: number;
  isClicking: boolean;
  failoverFrom?: string;
  lastHeartbeat: number;
  capabilities: string[];
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

function generateDeterministicColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const goldenRatioConjugate = 0.618033988749895;
  const h = Math.abs(((hash * goldenRatioConjugate) % 1) * 360);
  return `hsl(${Math.round(h)}, 82%, 62%)`;
}

class CollaborationHub extends EventEmitter {
  private clients: Set<WebSocket> = new Set();
  private agents: Map<string, CollaborativeAgentState> = new Map();
  private activePlan: MasterPlan | null = null;
  private activeKingPlan: KingExecutionPlan | null = null;
  private activeLocks: Map<string, string> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initDefaultAgents();
  }

  /**
   * Computes non-overlapping peripheral dock coordinates along left/right margins
   * so cursors never collide with each other or cover the top-center Live Voice bubble.
   */
  private computeNonOverlappingPosition(index: number): { x: number; y: number } {
    const isLeftColumn = index % 2 === 0;
    const row = Math.floor(index / 2);
    const x = isLeftColumn ? 28 : 960;
    const y = 140 + row * 56;
    return { x, y };
  }

  private initDefaultAgents() {
    const defaultConfigs: Array<{
      id: string;
      name: string;
      role: string;
      color: string;
      capabilities: string[];
      initialX?: number;
      initialY?: number;
    }> = [
      { id: 'planner', name: 'Agent Planner', role: 'RAG & Architecture', color: '#3b82f6', capabilities: ['codebase_rag', 'architecture_planning', 'chromadb'], initialX: 32, initialY: 118 },
      { id: 'coder', name: 'Agent Coder', role: 'Polyglot Synthesis', color: '#10b981', capabilities: ['polyglot_codegen', 'ast_repair', 'deepseek_r1'], initialX: 32, initialY: 184 },
      { id: 'reviewer', name: 'Agent Reviewer', role: 'Sandbox QA Verifier', color: '#eab308', capabilities: ['sandbox_verification', 'ast_audit', 'qa_review'], initialX: 32, initialY: 250 },
      { id: 'morphic', name: 'Agent Morphic', role: 'Deep Search', color: '#38bdf8', capabilities: ['search', 'synthesis'] },
      { id: 'moonshine-voice', name: 'Agent Moonshine', role: 'Voice STT', color: '#10b981', capabilities: ['audio_transcription', 'voice'] },
      { id: 'unstract', name: 'Agent Unstract', role: 'Doc ETL', color: '#f59e0b', capabilities: ['document_etl', 'ocr'] },
      { id: 'puck', name: 'Agent Puck', role: 'UI Builder', color: '#ec4899', capabilities: ['ui_design', 'layout_assembly'] },
      { id: 'pdfme', name: 'Agent Pdfme', role: 'PDF Engine', color: '#ef4444', capabilities: ['pdf_export', 'canvas_rendering'] },
      { id: 'DocETL', name: 'Agent DocETL', role: 'Pipeline', color: '#8b5cf6', capabilities: ['map_reduce', 'agentic_pipeline'] },
      { id: 'assistant-ui', name: 'Agent AssistantUI', role: 'Dialogue', color: '#6366f1', capabilities: ['conversational_ui', 'chat_interface'] },
      { id: 'OpnForm', name: 'Agent OpnForm', role: 'Forms', color: '#14b8a6', capabilities: ['form_generation', 'field_validation'] },
      { id: 'LitServe', name: 'Agent LitServe', role: 'Inference', color: '#f97316', capabilities: ['model_serving', 'inference_batching'] },
      { id: 'next-forge', name: 'Agent NextForge', role: 'Architect', color: '#e2e8f0', capabilities: ['fullstack_scaffolding', 'typescript_codegen'] },
    ];

    defaultConfigs.forEach((c, idx) => {
      const pos = this.computeNonOverlappingPosition(idx);
      const x = c.initialX ?? pos.x;
      const y = c.initialY ?? pos.y;
      this.agents.set(c.id, {
        ...c,
        x,
        y,
        targetX: x,
        targetY: y,
        action: 'idle',
        progress: 0,
        isClicking: false,
        lastHeartbeat: Date.now(),
      });
    });
  }

  public attachWebSocketServer(wss: WebSocketServer) {
    wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.send(
        JSON.stringify({
          type: 'SNAPSHOT',
          agents: Array.from(this.agents.values()),
          plan: this.activePlan,
          timestamp: Date.now(),
        })
      );

      ws.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message);
          this.handleClientMessage(payload, ws);
        } catch (e) {
          console.error('CollaborationHub parse error:', e);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    this.startSimulationLoop();
  }

  private handleClientMessage(payload: any, ws: WebSocket) {
    switch (payload.type) {
      case 'START_MASTER_PLAN':
        this.createAndExecutePlan(payload.goal || 'Autonomous UI & System Execution');
        break;
      case 'VOICE_COMMAND':
      case 'EXECUTE_UI_COMMAND':
        this.dispatchCommandToUIAgents(payload.command || payload.goal || '');
        break;
      case 'SIMULATE_FAILOVER':
        this.triggerFailover(payload.agentId || 'puck');
        break;
      case 'INJECT_CUSTOM_TOOL':
        this.registerDynamicTool(payload.tool);
        break;
      case 'UPDATE_AGENT_POSITION':
        if (payload.agentId && typeof payload.x === 'number' && typeof payload.y === 'number') {
          const ag = this.agents.get(payload.agentId);
          if (ag) {
            ag.x = payload.x;
            ag.y = payload.y;
            ag.targetX = payload.x;
            ag.targetY = payload.y;
          }
        }
        break;
      case 'GET_STATUS':
        ws.send(
          JSON.stringify({
            type: 'SNAPSHOT',
            agents: Array.from(this.agents.values()),
            plan: this.activePlan,
            timestamp: Date.now(),
          })
        );
        break;
      default:
        break;
    }
  }

  /**
   * Routes a natural language Voice or Text Command to specific agents,
   * generating programmatic DOM click/type directives (`AGENT_UI_DIRECTIVES`)
   * so agents physically move to and click React elements on the user's screen.
   */
  public dispatchCommandToUIAgents(command: string): UIExecutionDirective[] {
    const lower = (command || '').toLowerCase();
    const directives: UIExecutionDirective[] = [];

    if (lower.includes('cloud') || lower.includes('meadow') || lower.includes('sky')) {
      directives.push({
        id: `dir_${Date.now()}_env`,
        agentId: 'puck',
        targetSelector: '[data-agent-target="env-meadow"]',
        buttonTextMatch: 'Cloud Sky',
        fallbackX: 520,
        fallbackY: 28,
        actionType: 'click',
        taskDescription: 'Clicking "Cloud Sky" environment switcher',
        delayMs: 120,
      });
    } else if (lower.includes('noir') || lower.includes('midnight') || lower.includes('black') || lower.includes('dark')) {
      directives.push({
        id: `dir_${Date.now()}_env`,
        agentId: 'puck',
        targetSelector: '[data-agent-target="env-midnight"]',
        buttonTextMatch: 'Monochrome Noir',
        fallbackX: 700,
        fallbackY: 28,
        actionType: 'click',
        taskDescription: 'Activating "Monochrome Noir" environment',
        delayMs: 120,
      });
    } else if (lower.includes('desk') || lower.includes('cozy') || lower.includes('highrise')) {
      directives.push({
        id: `dir_${Date.now()}_env`,
        agentId: 'puck',
        targetSelector: '[data-agent-target="env-highrise"]',
        buttonTextMatch: 'Cozy Desk',
        fallbackX: 610,
        fallbackY: 28,
        actionType: 'click',
        taskDescription: 'Switching to "Cozy Desk" environment',
        delayMs: 120,
      });
    } else if (lower.includes('studio') || lower.includes('softbox')) {
      directives.push({
        id: `dir_${Date.now()}_env`,
        agentId: 'puck',
        targetSelector: '[data-agent-target="env-studio"]',
        buttonTextMatch: 'Studio Softbox',
        fallbackX: 430,
        fallbackY: 28,
        actionType: 'click',
        taskDescription: 'Selecting "Studio Softbox" lighting',
        delayMs: 120,
      });
    }

    if (lower.includes('vision') || lower.includes('inspect') || lower.includes('screen') || lower.includes('look')) {
      directives.push({
        id: `dir_${Date.now()}_vision`,
        agentId: 'unstract',
        targetSelector: '[data-agent-target="btn-vision"]',
        fallbackX: 760,
        fallbackY: 680,
        actionType: 'click',
        taskDescription: 'Triggering Live Screen Vision Analysis',
        delayMs: 250,
      });
    }

    if (lower.includes('boop') || lower.includes('surprise') || lower.includes('dance') || lower.includes('play') || lower.includes('pet')) {
      directives.push({
        id: `dir_${Date.now()}_surprise`,
        agentId: 'assistant-ui',
        targetSelector: '[data-agent-target="btn-surprise"]',
        fallbackX: 800,
        fallbackY: 680,
        actionType: 'click',
        taskDescription: 'Triggering Mochi-Puff Autonomous Boop',
        delayMs: 200,
      });
    }

    if (lower.includes('panel') || lower.includes('sidebar') || lower.includes('drawer') || lower.includes('settings') || lower.includes('controls') || lower.includes('hub')) {
      directives.push({
        id: `dir_${Date.now()}_drawer`,
        agentId: 'next-forge',
        targetSelector: '[data-agent-target="btn-toggle-drawer"]',
        fallbackX: 1180,
        fallbackY: 28,
        actionType: 'click',
        taskDescription: 'Toggling Control Architecture Drawer',
        delayMs: 180,
      });
    }

    if (lower.includes('registry') || lower.includes('plugin') || lower.includes('agent') || lower.includes('tool')) {
      directives.push({
        id: `dir_${Date.now()}_registry`,
        agentId: 'morphic',
        targetSelector: '[data-agent-target="btn-open-registry"]',
        fallbackX: 180,
        fallbackY: 680,
        actionType: 'click',
        taskDescription: 'Opening Decentralized Agent Registry',
        delayMs: 220,
      });
    }

    if (directives.length === 0) {
      // Check if a dynamically injected agent matches the command
      let selectedAgentId = 'puck';
      for (const [id] of this.agents.entries()) {
        if (lower.includes(id.toLowerCase())) {
          selectedAgentId = id;
          break;
        }
      }

      directives.push({
        id: `dir_${Date.now()}_exec`,
        agentId: selectedAgentId,
        targetSelector: '[data-agent-target="btn-surprise"]',
        fallbackX: 780,
        fallbackY: 680,
        actionType: 'click',
        taskDescription: `Executing: "${command.slice(0, 32)}"`,
        delayMs: 180,
      });
    }

    directives.forEach((dir) => {
      const agent = this.agents.get(dir.agentId);
      if (agent) {
        agent.action = 'moving';
        agent.currentTask = dir.taskDescription;
        agent.targetSelector = dir.targetSelector;
        agent.targetX = dir.fallbackX;
        agent.targetY = dir.fallbackY;
        agent.progress = 40;
      }
    });

    this.broadcast({
      type: 'AGENT_UI_DIRECTIVES',
      command,
      directives,
      timestamp: Date.now(),
    });

    return directives;
  }

  /**
   * DYNAMIC AUTO-SPAWN:
   * Automatically registers any new model, tool, or agent, assigns a unique color
   * and non-overlapping coordinate slot, and broadcasts it to all WebSocket clients.
   */
  public registerDynamicTool(tool: { id: string; name?: string; role?: string; capabilities?: string[]; color?: string }) {
    if (!tool || !tool.id) return null;

    const index = this.agents.size;
    const pos = this.computeNonOverlappingPosition(index);
    const color = tool.color || generateDeterministicColor(tool.id);
    const formattedName =
      tool.name || `Agent ${tool.id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;

    const newAgent: CollaborativeAgentState = {
      id: tool.id,
      name: formattedName,
      role: tool.role || 'Dynamic Extension',
      color,
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      action: 'moving',
      currentTask: 'Joined Swarm Network',
      progress: 100,
      isClicking: false,
      lastHeartbeat: Date.now(),
      capabilities: tool.capabilities || ['custom_tool'],
    };

    this.agents.set(tool.id, newAgent);
    this.broadcast({
      type: 'AGENT_INJECTED',
      agent: newAgent,
      timestamp: Date.now(),
    });

    return newAgent;
  }

  public createAndExecutePlan(goal: string): MasterPlan {
    const plan: MasterPlan = {
      id: `plan_${Date.now()}`,
      goal,
      timestamp: Date.now(),
      status: 'executing',
      tasks: [
        {
          id: 'task-1',
          title: 'Inspect active viewport state',
          assignedAgentId: 'unstract',
          backupAgentId: 'DocETL',
          status: 'in_progress',
          progress: 25,
          currentAction: 'Scanning DOM & WebGL viewport',
          targetSelector: '[data-agent-target="btn-vision"]',
          dependencies: [],
        },
        {
          id: 'task-2',
          title: 'Calibrate Monochrome Noir lighting',
          assignedAgentId: 'puck',
          backupAgentId: 'next-forge',
          status: 'in_progress',
          progress: 40,
          currentAction: 'Clicking environment controls',
          targetSelector: '[data-agent-target="env-midnight"]',
          dependencies: [],
        },
        {
          id: 'task-3',
          title: 'Trigger autonomous companion response',
          assignedAgentId: 'next-forge',
          backupAgentId: 'LitServe',
          status: 'in_progress',
          progress: 50,
          currentAction: 'Executing autonomous interaction',
          targetSelector: '[data-agent-target="btn-surprise"]',
          dependencies: [],
        },
      ],
    };

    this.activePlan = plan;

    plan.tasks.forEach((task) => {
      const agent = this.agents.get(task.assignedAgentId);
      if (agent) {
        agent.action = 'generating';
        agent.currentTask = task.title;
        agent.targetSelector = task.targetSelector;
        agent.progress = task.progress;
      }
    });

    this.broadcast({
      type: 'MASTER_PLAN_CREATED',
      plan: this.activePlan,
    });

    this.dispatchCommandToUIAgents(`${goal} noir boop`);

    return plan;
  }

  public triggerFailover(failedAgentId: string) {
    const failedAgent = this.agents.get(failedAgentId);
    if (!failedAgent) return;

    failedAgent.action = 'failed';
    failedAgent.progress = 0;
    const taskFailed = this.activePlan?.tasks.find(
      (t) => t.assignedAgentId === failedAgentId && t.status !== 'completed'
    );

    const fallbackId = taskFailed?.backupAgentId || 'next-forge';
    const fallbackAgent = this.agents.get(fallbackId);

    if (fallbackAgent) {
      fallbackAgent.action = 'failover';
      fallbackAgent.failoverFrom = failedAgent.name;
      fallbackAgent.currentTask = taskFailed
        ? `[FAILOVER] ${taskFailed.title}`
        : `[FAILOVER] Reassigned from ${failedAgent.name}`;
      fallbackAgent.progress = 60;
      fallbackAgent.targetX = failedAgent.x + 24;
      fallbackAgent.targetY = failedAgent.y + 24;
      if (taskFailed) {
        taskFailed.status = 'failover_reassigned';
        taskFailed.assignedAgentId = fallbackId;
      }
    }

    this.broadcast({
      type: 'FAILOVER_ALERT',
      failedAgentId,
      fallbackAgentId: fallbackId,
      taskId: taskFailed?.id || 'ui-control',
      plan: this.activePlan,
    });
  }

  private startSimulationLoop() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);

    this.simulationInterval = setInterval(() => {
      let hasActiveProgress = false;

      this.agents.forEach((agent) => {
        if (agent.action === 'failed' || agent.action === 'idle') return;

        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        agent.x += dx * 0.35;
        agent.y += dy * 0.35;

        if (this.activePlan) {
          const task = this.activePlan.tasks.find((t) => t.assignedAgentId === agent.id);
          if (task && task.status !== 'completed') {
            task.progress = Math.min(100, task.progress + 8);
            agent.progress = task.progress;
            if (task.progress >= 100) {
              task.status = 'completed';
              task.currentAction = 'Completed';
              agent.action = 'idle';
              agent.currentTask = undefined;
            }
          }
        }
        hasActiveProgress = true;
      });

      if (hasActiveProgress && this.clients.size > 0) {
        this.broadcast({
          type: 'CURSOR_STREAM',
          agents: Array.from(this.agents.values()),
          timestamp: Date.now(),
        });
      }
    }, 180);
  }

  private broadcast(data: any) {
    const payload = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Broadcasts The King's strict JSON Execution Plan (`plan_id`, `steps` with `agent`, `task`, `lock`, `depends_on`)
   * to all WebSocket clients so the UI renders the Zero-Conflict DAG and resource locks.
   */
  public broadcastKingExecutionPlan(plan: KingExecutionPlan) {
    this.activeKingPlan = plan;
    this.broadcast({
      type: 'KING_EXECUTION_PLAN',
      kingPlan: plan,
      activeLocks: Object.fromEntries(this.activeLocks.entries()),
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcasts real-time Cognitive Cycle telemetry (`planner`, `coder`, `reviewer`)
   * over WebSocket to move the 3 persistent cognitive cursors, update resource locks, and stream terminal logs.
   */
  public broadcastCognitiveTelemetry(payload: {
    agent: 'planner' | 'coder' | 'reviewer';
    status: string;
    action?: CollaborativeAgentState['action'];
    lock?: string;
    depends_on?: string | null;
    x?: number;
    y?: number;
    currentTask?: string;
    progress?: number;
    logMessage?: string;
  }) {
    if (payload.lock && payload.lock !== 'read_only' && payload.action !== 'idle') {
      this.activeLocks.set(payload.lock, payload.agent);
    } else if (payload.action === 'idle') {
      for (const [k, holder] of this.activeLocks.entries()) {
        if (holder === payload.agent) {
          this.activeLocks.delete(k);
        }
      }
    }

    const existing = this.agents.get(payload.agent);
    if (existing) {
      if (typeof payload.x === 'number') {
        existing.x = payload.x;
        existing.targetX = payload.x;
      }
      if (typeof payload.y === 'number') {
        existing.y = payload.y;
        existing.targetY = payload.y;
      }
      existing.status = payload.status;
      if (payload.lock !== undefined) existing.lock = payload.lock;
      if (payload.depends_on !== undefined) existing.depends_on = payload.depends_on;
      if (payload.action) existing.action = payload.action;
      if (payload.currentTask !== undefined) existing.currentTask = payload.currentTask;
      if (typeof payload.progress === 'number') existing.progress = payload.progress;
      existing.lastHeartbeat = Date.now();
    }

    this.broadcast({
      type: 'COGNITIVE_TELEMETRY',
      agent: payload.agent,
      status: payload.status,
      action: payload.action || existing?.action || 'moving',
      lock: payload.lock ?? existing?.lock,
      depends_on: payload.depends_on ?? existing?.depends_on,
      x: payload.x ?? existing?.x ?? 200,
      y: payload.y ?? existing?.y ?? 300,
      currentTask: payload.currentTask,
      progress: payload.progress,
      logMessage: payload.logMessage,
      activeLocks: Object.fromEntries(this.activeLocks.entries()),
      timestamp: Date.now(),
    });
  }

  public getSnapshot() {
    return {
      agents: Array.from(this.agents.values()),
      activePlan: this.activePlan,
      kingPlan: this.activeKingPlan,
      activeLocks: Object.fromEntries(this.activeLocks.entries()),
      timestamp: Date.now(),
    };
  }
}

export const collaborationHub = new CollaborationHub();
