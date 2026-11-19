import { agentRegistry } from '../components/AgentRegistry';

export interface CognitiveCycleResponse {
  status: string;
  objective: string;
  elapsed_ms: number;
  agents: {
    planner: {
      agent: string;
      role: string;
      indexed_files_count: number;
      total_codebase_lines: number;
      matched_context_files: string[];
      git_strategy: {
        current_branch: string;
        proposed_branch: string;
        working_tree: string;
        recommended_commands: string[];
      };
      web_grounding: string[];
    };
    coder: {
      agent: string;
      role: string;
      reasoning_engine: string;
      model: string;
      synthesis_summary: string;
    };
    reviewer: {
      agent: string;
      role: string;
      verification: {
        success: boolean;
        stage: string;
        stdout?: string;
        stderr?: string;
      };
      status: string;
    };
  };
}

/**
 * Registers the 6-Pillar Cognitive Architecture Agents into the Dynamic Agent Registry
 * so they appear in the Agent Registry Modal and CollaborationCanvas.
 */
export function registerCognitiveArchitectureAgents() {
  agentRegistry.register({
    id: 'planner-rag',
    name: 'Agent Planner',
    role: 'LangChain/LlamaIndex RAG',
    description: 'Full-Context Codebase RAG Indexer & Git Branch Strategist',
    repo: 'local/cognitive/planner-rag',
    capabilities: ['full_context_rag', 'architecture_planning', 'git_automations'],
    color: '#38bdf8',
    iconType: 'search',
  });

  agentRegistry.register({
    id: 'coder-deepseek',
    name: 'Agent Coder',
    role: 'Ollama DeepSeek-R1',
    description: 'Local LLM Reasoning Engine (Ollama/vLLM) & BrowserUse Researcher',
    repo: 'local/cognitive/coder-deepseek',
    capabilities: ['local_llm_execution', 'deepseek_r1', 'browser_use_playwright'],
    color: '#10b981',
    iconType: 'code',
  });

  agentRegistry.register({
    id: 'reviewer-sandbox',
    name: 'Agent Reviewer',
    role: 'Code Interpreter QA',
    description: 'Sandboxed AST Code Interpreter, Debugger & Automated Test Verifier',
    repo: 'local/cognitive/reviewer-sandbox',
    capabilities: ['code_interpreter', 'ast_sandbox', 'automated_debugging'],
    color: '#a855f7',
    iconType: 'workflow',
  });
}

/**
 * Triggers a full 3-Agent Cognitive Cycle (Planner -> Coder -> Reviewer)
 * backed by `backend/cognitive_architecture.py` and `/api/cognitive/cycle`.
 */
export async function runCognitiveCycle(objective: string): Promise<CognitiveCycleResponse | null> {
  registerCognitiveArchitectureAgents();

  try {
    const res = await fetch('/api/cognitive/cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.result as CognitiveCycleResponse;
    }
  } catch (err) {
    console.warn('Cognitive cycle fallback:', err);
  }
  return null;
}
