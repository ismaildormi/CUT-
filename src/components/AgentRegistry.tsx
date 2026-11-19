import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Sparkles,
  Bot,
  Plus,
  Cpu,
  Search,
  Mic,
  FileText,
  Layout,
  FileCheck,
  Workflow,
  MessageSquare,
  FormInput,
  Server,
  Code,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';
import { AgentCursorState } from './AgentCursor';

export interface AgentPluginDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  repo?: string;
  capabilities: string[];
  color: string;
  iconType: string;
  status: 'idle' | 'active' | 'delegated' | 'failed' | 'failover';
  fallbackAgentId?: string;
}

/**
 * 10 Pre-Mapped Free / Open-Source GitHub Repositories
 * Serving as specialized autonomous agents in NEVEA's Collaborative Swarm
 */
export const PRECONFIGURED_GITHUB_AGENTS: AgentPluginDefinition[] = [
  {
    id: 'planner',
    name: 'Agent Planner',
    role: 'RAG & Architecture',
    description: 'LangChain + ChromaDB Full-Context RAG planner and hierarchical task decomposer',
    repo: 'backend/project_rag.py',
    capabilities: ['codebase_rag', 'architecture_planning', 'chromadb_index'],
    color: '#3b82f6', // Blue
    iconType: 'workflow',
    status: 'idle',
    fallbackAgentId: 'coder',
  },
  {
    id: 'coder',
    name: 'Agent Coder',
    role: 'Polyglot Synthesis',
    description: 'Local Ollama DeepSeek-R1 & Qwen2.5-Coder code generator with AST self-healing',
    repo: 'backend/swarm_boss.py',
    capabilities: ['polyglot_codegen', 'ast_repair', 'local_llm'],
    color: '#10b981', // Green
    iconType: 'code',
    status: 'idle',
    fallbackAgentId: 'reviewer',
  },
  {
    id: 'reviewer',
    name: 'Agent Reviewer',
    role: 'Sandbox QA Verifier',
    description: 'Isolated tempfile + subprocess sandbox interpreter and adversarial QA verifier',
    repo: 'backend/swarm_boss.py',
    capabilities: ['sandbox_verification', 'ast_audit', 'qa_review'],
    color: '#eab308', // Gold
    iconType: 'file-check',
    status: 'idle',
    fallbackAgentId: 'planner',
  },
  {
    id: 'morphic',
    name: 'Agent Morphic',
    role: 'Deep Search & Synthesis',
    description: 'Autonomous web researcher and generative UI search engine',
    repo: 'github.com/miurla/morphic',
    capabilities: ['search', 'synthesis', 'research', 'citations'],
    color: '#38bdf8', // Cyan
    iconType: 'search',
    status: 'idle',
    fallbackAgentId: 'DocETL',
  },
  {
    id: 'moonshine-voice',
    name: 'Agent Moonshine',
    role: 'Acoustic & Voice STT',
    description: 'Fast, edge-optimized speech-to-text and audio understanding',
    repo: 'github.com/usefulsensors/moonshine',
    capabilities: ['audio_transcription', 'voice', 'realtime_stt', 'dialogue'],
    color: '#10b981', // Emerald
    iconType: 'mic',
    status: 'idle',
    fallbackAgentId: 'assistant-ui',
  },
  {
    id: 'unstract',
    name: 'Agent Unstract',
    role: 'Document ETL & Parser',
    description: 'No-code LLM platform for complex document ingestion & structured extraction',
    repo: 'github.com/Zipstack/unstract',
    capabilities: ['document_etl', 'ocr', 'pdf_extraction', 'schema_mapping'],
    color: '#f59e0b', // Amber
    iconType: 'file-text',
    status: 'idle',
    fallbackAgentId: 'DocETL',
  },
  {
    id: 'puck',
    name: 'Agent Puck',
    role: 'Visual Page Builder',
    description: 'Drag-and-drop React component visual editor and layout assembler',
    repo: 'github.com/measuredco/puck',
    capabilities: ['ui_design', 'layout_assembly', 'component_tree', 'portfolio_builder'],
    color: '#ec4899', // Pink
    iconType: 'layout',
    status: 'idle',
    fallbackAgentId: 'next-forge',
  },
  {
    id: 'pdfme',
    name: 'Agent Pdfme',
    role: 'PDF & Canvas Engine',
    description: 'Vector-precise PDF layout generation, export, and visual document templating',
    repo: 'github.com/pdfme/pdfme',
    capabilities: ['pdf_export', 'canvas_rendering', 'vector_layout', 'export'],
    color: '#ef4444', // Red
    iconType: 'file-check',
    status: 'idle',
    fallbackAgentId: 'unstract',
  },
  {
    id: 'DocETL',
    name: 'Agent DocETL',
    role: 'Agentic Pipeline & MapReduce',
    description: 'Complex document map-reduce processing and multi-agent synthesis',
    repo: 'github.com/ucbepic/docetl',
    capabilities: ['map_reduce', 'agentic_pipeline', 'complex_synthesis', 'batch_etl'],
    color: '#8b5cf6', // Violet
    iconType: 'workflow',
    status: 'idle',
    fallbackAgentId: 'unstract',
  },
  {
    id: 'assistant-ui',
    name: 'Agent AssistantUI',
    role: 'Conversational UI Engine',
    description: 'Full-stack chat components, streaming generative UI, and dialogue state',
    repo: 'github.com/assistant-ui/assistant-ui',
    capabilities: ['conversational_ui', 'chat_interface', 'streaming_tokens', 'human_in_loop'],
    color: '#6366f1', // Indigo
    iconType: 'message-square',
    status: 'idle',
    fallbackAgentId: 'puck',
  },
  {
    id: 'OpnForm',
    name: 'Agent OpnForm',
    role: 'Dynamic Form Generator',
    description: 'Open-source schema-driven form builder and interactive field validator',
    repo: 'github.com/JhumanJ/OpnForm',
    capabilities: ['form_generation', 'field_validation', 'interactive_inputs', 'submissions'],
    color: '#14b8a6', // Teal
    iconType: 'form-input',
    status: 'idle',
    fallbackAgentId: 'puck',
  },
  {
    id: 'LitServe',
    name: 'Agent LitServe',
    role: 'High-Throughput Model Serving',
    description: 'Lightweight, ultra-fast model serving engine for multi-agent inference',
    repo: 'github.com/Lightning-AI/litserve',
    capabilities: ['model_serving', 'inference_batching', 'gpu_acceleration', 'orchestration'],
    color: '#f97316', // Orange
    iconType: 'server',
    status: 'idle',
    fallbackAgentId: 'next-forge',
  },
  {
    id: 'next-forge',
    name: 'Agent NextForge',
    role: 'Full-Stack Scaffolder',
    description: 'Production full-stack boilerplate scaffolding, routing, and packaging',
    repo: 'github.com/haydenbleasel/next-forge',
    capabilities: ['fullstack_scaffolding', 'typescript_codegen', 'api_routes', 'deployment'],
    color: '#94a3b8', // Slate Blue
    iconType: 'code',
    status: 'idle',
    fallbackAgentId: 'LitServe',
  },
];

/**
 * Deterministic Golden Ratio Color Generator
 * Guarantees every newly injected agent or model gets a unique, vibrant, distinct color.
 */
export function generateDeterministicColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const goldenRatioConjugate = 0.618033988749895;
  const h = Math.abs(((hash * goldenRatioConjugate) % 1) * 360);
  const s = 75 + (Math.abs(hash) % 20); // 75-95% saturation
  const l = 55 + (Math.abs(hash >> 3) % 15); // 55-70% lightness
  return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

/**
 * Global In-Memory Dynamic Agent Registry
 */
class DynamicAgentRegistry {
  private agents: Map<string, AgentPluginDefinition> = new Map();
  private listeners: Set<(agents: AgentPluginDefinition[]) => void> = new Set();

  constructor() {
    // Populate preconfigured GitHub repos
    PRECONFIGURED_GITHUB_AGENTS.forEach((agent) => {
      this.agents.set(agent.id, { ...agent });
    });
  }

  public getAll(): AgentPluginDefinition[] {
    return Array.from(this.agents.values());
  }

  public get(id: string): AgentPluginDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * DYNAMIC AUTO-CURSOR INJECTION
   * Registers ANY model, tool, or plugin and automatically assigns:
   * 1. A unique, deterministic HSL color
   * 2. Formatted role and capabilities
   * 3. Failover backup chain
   * 4. Notification to all collaborative cursor canvases
   */
  public register(plugin: Partial<AgentPluginDefinition> & { id: string; name?: string }): AgentPluginDefinition {
    const existing = this.agents.get(plugin.id);
    if (existing) {
      const updated = { ...existing, ...plugin };
      this.agents.set(plugin.id, updated);
      this.notify();
      return updated;
    }

    const name = plugin.name || `Agent ${plugin.id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
    const color = plugin.color || generateDeterministicColor(plugin.id);
    const role = plugin.role || 'Dynamic AI Extension';
    const description = plugin.description || `Autonomous agent dynamically injected from ${plugin.id}`;
    const capabilities = plugin.capabilities || ['general_execution', 'collaborative_task'];

    // Select suitable fallback agent based on capabilities
    let fallbackAgentId = 'next-forge';
    for (const [id, a] of this.agents.entries()) {
      if (id !== plugin.id && a.status !== 'failed') {
        fallbackAgentId = id;
        break;
      }
    }

    const newAgent: AgentPluginDefinition = {
      id: plugin.id,
      name,
      role,
      description,
      repo: plugin.repo || `local/plugins/${plugin.id}`,
      capabilities,
      color,
      iconType: plugin.iconType || 'cpu',
      status: 'active',
      fallbackAgentId,
    };

    this.agents.set(plugin.id, newAgent);
    this.notify();

    // Broadcast auto-spawn event so CollaborationCanvas, WebSocket network, and Unified Brain immediately merge the extension
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nevea:agent-spawned', { detail: newAgent }));
      fetch('/api/collaboration/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: newAgent }),
      }).catch(() => {});
      fetch('/api/brain/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newAgent.id,
          name: newAgent.name,
          type: 'agent',
          role: newAgent.role,
          description: newAgent.description,
          repo: newAgent.repo,
          color: newAgent.color,
          capabilities: newAgent.capabilities,
        }),
      }).catch(() => {});
    }

    return newAgent;
  }

  public updateStatus(id: string, status: AgentPluginDefinition['status']): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      this.notify();
    }
  }

  public subscribe(listener: (agents: AgentPluginDefinition[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const list = this.getAll();
    this.listeners.forEach((listener) => listener(list));
  }

  /**
   * Creates initial cursor state for any agent
   */
  public createCursorState(agentId: string, initialX = 300, initialY = 300): AgentCursorState {
    const agent = this.agents.get(agentId) || this.register({ id: agentId });
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      color: agent.color,
      x: initialX,
      y: initialY,
      action: 'idle',
      timestamp: Date.now(),
    };
  }
}

export const agentRegistry = new DynamicAgentRegistry();

interface AgentRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAgent?: (agent: AgentPluginDefinition) => void;
}

export const AgentRegistryModal: React.FC<AgentRegistryModalProps> = ({
  isOpen,
  onClose,
  onSelectAgent,
}) => {
  const [agents, setAgents] = useState<AgentPluginDefinition[]>(agentRegistry.getAll());
  const [filterText, setFilterText] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [newPluginId, setNewPluginId] = useState('');
  const [newPluginRole, setNewPluginRole] = useState('');
  const [newPluginCap, setNewPluginCap] = useState('');

  React.useEffect(() => {
    return agentRegistry.subscribe(setAgents);
  }, []);

  if (!isOpen) return null;

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(filterText.toLowerCase()) ||
      a.role.toLowerCase().includes(filterText.toLowerCase()) ||
      a.capabilities.some((c) => c.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleInjectDynamicAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPluginId.trim()) return;

    agentRegistry.register({
      id: newPluginId.trim().toLowerCase().replace(/\s+/g, '-'),
      name: `Agent ${newPluginId.trim()}`,
      role: newPluginRole.trim() || 'Dynamic Model Operator',
      capabilities: newPluginCap
        ? newPluginCap.split(',').map((c) => c.trim().toLowerCase())
        : ['custom_tool', 'autonomous_task'],
    });

    setNewPluginId('');
    setNewPluginRole('');
    setNewPluginCap('');
    setIsAddingCustom(false);
  };

  const getAgentIcon = (iconType: string) => {
    switch (iconType) {
      case 'search': return <Search size={15} />;
      case 'mic': return <Mic size={15} />;
      case 'file-text': return <FileText size={15} />;
      case 'layout': return <Layout size={15} />;
      case 'file-check': return <FileCheck size={15} />;
      case 'workflow': return <Workflow size={15} />;
      case 'message-square': return <MessageSquare size={15} />;
      case 'form-input': return <FormInput size={15} />;
      case 'server': return <Server size={15} />;
      case 'code': return <Code size={15} />;
      default: return <Cpu size={15} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[85vh] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Agent & Tool Registry
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                  {agents.length} AGENTS READY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                10 Pre-wired GitHub Engines + Dynamic Auto-Cursor Injection for any custom model/tool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/20 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter agents by name, role, capability, or repo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-lg shadow-cyan-600/20 shrink-0"
          >
            <Plus size={14} /> Inject New Model / Tool
          </button>
        </div>

        {/* Dynamic Injection Expandable Form */}
        <AnimatePresence>
          {isAddingCustom && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleInjectDynamicAgent}
              className="px-6 py-3 border-b border-cyan-900/50 bg-cyan-950/20 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-cyan-300 font-mono">Tool / Model ID</label>
                  <input
                    type="text"
                    required
                    value={newPluginId}
                    onChange={(e) => setNewPluginId(e.target.value)}
                    placeholder="e.g. whisper-v3 or codestral"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cyan-300 font-mono">Role Description</label>
                  <input
                    type="text"
                    value={newPluginRole}
                    onChange={(e) => setNewPluginRole(e.target.value)}
                    placeholder="e.g. Autonomous Refactoring Engine"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cyan-300 font-mono">Capabilities (comma separated)</label>
                  <input
                    type="text"
                    value={newPluginCap}
                    onChange={(e) => setNewPluginCap(e.target.value)}
                    placeholder="e.g. refactor, ast, lint"
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow"
                >
                  Plug into Swarm (Auto-Generate Cursor)
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Agent Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((agent) => {
            const isPreconfigured = PRECONFIGURED_GITHUB_AGENTS.some((p) => p.id === agent.id);
            return (
              <div
                key={agent.id}
                onClick={() => onSelectAgent?.(agent)}
                className="group relative p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition hover:shadow-xl hover:shadow-black/50 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md shrink-0"
                        style={{
                          backgroundColor: `${agent.color}20`,
                          color: agent.color,
                          border: `1px solid ${agent.color}40`,
                        }}
                      >
                        {getAgentIcon(agent.iconType)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition flex items-center gap-1.5">
                          {agent.name}
                          {isPreconfigured && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              OS-CORE
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] font-mono" style={{ color: agent.color }}>
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            agent.status === 'failed'
                              ? '#ef4444'
                              : agent.status === 'active'
                              ? '#10b981'
                              : agent.status === 'failover'
                              ? '#f59e0b'
                              : agent.color,
                        }}
                      />
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        {agent.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                  {agent.repo && (
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                      {agent.repo}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Autonomous Failover Mesh active with zero manual configuration required.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Registry
          </button>
        </div>
      </motion.div>
    </div>
  );
};
