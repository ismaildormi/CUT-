/**
 * NEVEA Dynamic Tool Registry & Autonomous External API Router
 * Integrates:
 * 1. Native External API Wrappers:
 *    - `call_openrouter_model(model_name, prompt)`
 *    - `call_huggingface_model(model_id, inputs)`
 *    - `github_api_call(endpoint, method, data)`
 *    - `codeberg_api_call(endpoint, method, data)`
 *    - `stripe_billing_call(action, payload)`
 *    - `twilio_sms_call(to, body)`
 * 2. Intent-Based Dynamic Tool Selection (`selectToolForIntent` & `dispatchByIntent`)
 * 3. Open-source Composio Tooling & MCP Protocols.
 * 4. Autonomous Tool Generator (`backend/tool_creator.py`).
 * 5. Dynamic Python tool discovery and execution via `backend/dynamic_tools.json`.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import {
  call_openrouter_model,
  call_huggingface_model,
  github_api_call,
  codeberg_api_call,
  stripe_billing_call,
  twilio_sms_call,
} from './externalApiClients.js';

export interface DynamicToolMeta {
  name: string;
  description: string;
  parameters: Record<string, any>;
  scriptPath?: string;
  isCustom?: boolean;
  service?: string;
  source?: 'builtin' | 'external_api' | 'composio' | 'self_generated';
}

const DYNAMIC_TOOLS_DIR = path.resolve(process.cwd(), 'backend', 'dynamic_tools');
const DYNAMIC_REGISTRY_FILE = path.resolve(process.cwd(), 'backend', 'dynamic_tools.json');

// Ensure directory exists
try {
  if (!fs.existsSync(DYNAMIC_TOOLS_DIR)) {
    fs.mkdirSync(DYNAMIC_TOOLS_DIR, { recursive: true });
  }
} catch {}

class ToolRegistry {
  private registeredTools: Map<string, DynamicToolMeta> = new Map();
  public composioAvailable = false;

  constructor() {
    this.registerBuiltinTools();
    this.registerExternalApiTools();
    this.registerFreeArsenalTools();
    this.initComposio();
    this.scanDynamicToolsDir();
  }

  private registerFreeArsenalTools() {
    this.register({
      name: 'generate_pollinations_image',
      description: 'Generates high-fidelity visual art and textures using Pollinations.ai 100% free keyless endpoint.',
      parameters: { prompt: 'string', width: 'number (optional)', height: 'number (optional)', model: 'string (optional)' },
      service: 'pollinations',
      source: 'builtin',
    });

    this.register({
      name: 'duckduckgo_free_search',
      description: 'Performs 100% keyless web search and instant intelligence retrieval via DuckDuckGo.',
      parameters: { query: 'string', max_results: 'number (optional)' },
      service: 'duckduckgo',
      source: 'builtin',
    });

    this.register({
      name: 'free_translate_text',
      description: 'Translates text across languages using 100% free open polyglot translation endpoints.',
      parameters: { text: 'string', target_lang: 'string (optional)', source_lang: 'string (optional)' },
      service: 'translation',
      source: 'builtin',
    });

    this.register({
      name: 'free_tts_synthesis',
      description: 'Synthesizes spoken audio from text using local pyttsx3 or keyless speech endpoints.',
      parameters: { text: 'string', lang: 'string (optional)' },
      service: 'tts',
      source: 'builtin',
    });

    this.register({
      name: 'mochi_speech_synthesis',
      description:
        'Completely offline and keyless local text-to-speech synthesis for Mochi-Puff using piper-tts or edge-tts with cute pitch & tempo tuning (presets: mochi_cute, mochi_warm, mochi_cheerful, mochi_japanese, mochi_hero).',
      parameters: {
        text: 'string',
        voice: 'string (optional: mochi_cute | mochi_warm | mochi_cheerful | mochi_japanese | mochi_hero)',
        pitch: 'string (optional, e.g. +24Hz)',
        rate: 'string (optional, e.g. +12%)',
        prefer_offline: 'boolean (optional, default: true)',
      },
      service: 'mochi_speech',
      source: 'builtin',
    });

    this.register({
      name: 'mochi_voice_engine',
      description:
        'Local, free, and keyless text-to-speech module using edge-tts tuned for Mochi-Puff dialogue with WebSocket routing.',
      parameters: {
        dialogue: 'string',
        voice: 'string (optional: mochi_cute | mochi_warm | mochi_cheerful | mochi_kawaii | mochi_hero)',
        pitch: 'string (optional, e.g. +24Hz)',
        rate: 'string (optional, e.g. +12%)',
        broadcast_websocket: 'boolean (optional, default: true)',
      },
      service: 'voice_engine',
      source: 'builtin',
    });
  }

  private registerBuiltinTools() {
    this.register({
      name: 'create_project_folder',
      description: 'Creates a project folder structure for the user',
      parameters: { folderPath: 'string' },
      source: 'builtin',
    });

    this.register({
      name: 'write_project_file',
      description: 'Writes code or assets to a file in a project folder',
      parameters: { filePath: 'string', content: 'string' },
      source: 'builtin',
    });

    this.register({
      name: 'open_in_vscode',
      description: 'Opens a target file or folder in VS Code (`code <project_path>`)',
      parameters: { projectPath: 'string' },
      source: 'builtin',
    });

    this.register({
      name: 'register_custom_python_tool',
      description: 'Registers a newly generated Python script as an executable tool',
      parameters: { toolName: 'string', description: 'string', pythonCode: 'string' },
      source: 'builtin',
    });
  }

  /**
   * Registers the native External API Client Tools so NEVEA agents can discover and invoke them directly
   */
  private registerExternalApiTools() {
    this.register({
      name: 'call_openrouter_model',
      description:
        'Routes queries and prompts to specialized multi-model LLMs via OpenRouter API (e.g. deepseek/deepseek-chat, anthropic/claude-3.5-sonnet, meta-llama/llama-3.3-70b-instruct).',
      parameters: { model_name: 'string', prompt: 'string' },
      service: 'openrouter',
      source: 'external_api',
    });

    this.register({
      name: 'call_huggingface_model',
      description:
        'Invokes specialized ML models on Hugging Face Inference API (embeddings, classification, summarization, text/image generation).',
      parameters: { model_id: 'string', inputs: 'any' },
      service: 'huggingface',
      source: 'external_api',
    });

    this.register({
      name: 'github_api_call',
      description:
        'Executes authenticated GitHub REST API calls for code management, repository creation, issues, pull requests, and commits.',
      parameters: { endpoint: 'string', method: 'string', data: 'object (optional)' },
      service: 'github',
      source: 'external_api',
    });

    this.register({
      name: 'codeberg_api_call',
      description:
        'Executes authenticated Codeberg (Forgejo/Gitea) REST API calls for alternative open-source repository management.',
      parameters: { endpoint: 'string', method: 'string', data: 'object (optional)' },
      service: 'codeberg',
      source: 'external_api',
    });

    this.register({
      name: 'stripe_billing_call',
      description:
        'Executes Stripe billing operations (check_balance, list_customers, create_payment_intent, create_checkout) using STRIPE_SECRET_KEY.',
      parameters: { action: 'string', payload: 'object (optional)' },
      service: 'stripe',
      source: 'external_api',
    });

    this.register({
      name: 'twilio_sms_call',
      description:
        'Sends SMS alerts or notifications via Twilio API using TWILIO_AUTH_TOKEN.',
      parameters: { to: 'string', body: 'string' },
      service: 'twilio',
      source: 'external_api',
    });
  }

  /**
   * Dynamically selects the appropriate API tool based on a natural-language user request or intent
   */
  public selectToolForIntent(userRequest: string): {
    selectedTool: string;
    provider: string;
    reason: string;
  } {
    const lower = String(userRequest || '').toLowerCase();

    if (lower.includes('codeberg') || lower.includes('forgejo') || lower.includes('gitea')) {
      return {
        selectedTool: 'codeberg_api_call',
        provider: 'codeberg',
        reason: 'User request references Codeberg / Forgejo repository management.',
      };
    }

    if (
      lower.includes('github') ||
      lower.includes('push code') ||
      lower.includes('pull request') ||
      lower.includes('create repo') ||
      lower.includes('repository') ||
      lower.includes('commit')
    ) {
      return {
        selectedTool: 'github_api_call',
        provider: 'github',
        reason: 'User request involves code hosting or GitHub repository control.',
      };
    }

    if (
      lower.includes('huggingface') ||
      lower.includes('hugging face') ||
      lower.includes('embedding') ||
      lower.includes('sentiment') ||
      lower.includes('classification') ||
      lower.includes('diffusion') ||
      lower.includes('ml model')
    ) {
      return {
        selectedTool: 'call_huggingface_model',
        provider: 'huggingface',
        reason: 'User request requires a specialized Hugging Face ML inference model.',
      };
    }

    if (
      lower.includes('stripe') ||
      lower.includes('billing') ||
      lower.includes('invoice') ||
      lower.includes('payment')
    ) {
      return {
        selectedTool: 'stripe_billing_call',
        provider: 'stripe',
        reason: 'User request involves billing or payment processing via Stripe.',
      };
    }

    if (lower.includes('twilio') || lower.includes('sms') || lower.includes('text message')) {
      return {
        selectedTool: 'twilio_sms_call',
        provider: 'twilio',
        reason: 'User request involves sending an SMS via Twilio.',
      };
    }

    if (
      lower.includes('pollinations') ||
      lower.includes('free image') ||
      lower.includes('generate image') ||
      lower.includes('draw') ||
      lower.includes('texture')
    ) {
      return {
        selectedTool: 'generate_pollinations_image',
        provider: 'pollinations',
        reason: 'User request involves image generation or visual creation via keyless Pollinations AI.',
      };
    }

    if (
      lower.includes('duckduckgo') ||
      lower.includes('free search') ||
      lower.includes('ddg')
    ) {
      return {
        selectedTool: 'duckduckgo_free_search',
        provider: 'duckduckgo',
        reason: 'User request involves keyless DuckDuckGo web search.',
      };
    }

    if (lower.includes('translate') || lower.includes('translation')) {
      return {
        selectedTool: 'free_translate_text',
        provider: 'translation',
        reason: 'User request involves multilingual text translation.',
      };
    }

    if (
      lower.includes('mochi speak') ||
      lower.includes('mochi say') ||
      lower.includes('mochi voice') ||
      lower.includes('mochi-puff') ||
      lower.includes('piper') ||
      lower.includes('edge-tts') ||
      lower.includes('offline tts') ||
      lower.includes('offline speech')
    ) {
      return {
        selectedTool: 'mochi_speech_synthesis',
        provider: 'mochi_speech',
        reason: 'User request invokes Mochi-Puff completely offline, keyless speech synthesis (piper-tts / edge-tts).',
      };
    }

    if (lower.includes('text to speech') || lower.includes('tts') || lower.includes('speak')) {
      return {
        selectedTool: 'free_tts_synthesis',
        provider: 'tts',
        reason: 'User request involves speech synthesis or spoken audio.',
      };
    }

    return {
      selectedTool: 'call_openrouter_model',
      provider: 'openrouter',
      reason: 'Default multi-model LLM routing via OpenRouter for text/code generation and reasoning.',
    };
  }

  /**
   * Dynamically routes and executes an agent request by inspecting the user's intent
   */
  public async dispatchByIntent(
    userRequest: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const selection = this.selectToolForIntent(userRequest);
    const mergedArgs = { ...params };

    if (selection.selectedTool === 'call_openrouter_model' && !mergedArgs.prompt) {
      mergedArgs.prompt = userRequest;
    } else if (selection.selectedTool === 'call_huggingface_model' && !mergedArgs.inputs) {
      mergedArgs.inputs = userRequest;
    } else if (
      (selection.selectedTool === 'github_api_call' ||
        selection.selectedTool === 'codeberg_api_call') &&
      !mergedArgs.endpoint
    ) {
      mergedArgs.endpoint = '/user/repos';
      mergedArgs.method = mergedArgs.method || 'GET';
    }

    const executionResult = await this.executeTool(selection.selectedTool, mergedArgs);
    return {
      routing: selection,
      result: executionResult,
    };
  }

  /**
   * Initializes Composio open-source tooling ONLY if COMPOSIO_API_KEY is valid and not 'none'
   */
  public async initComposio() {
    try {
      const composioKey = (process.env.COMPOSIO_API_KEY || '').trim();
      if (!composioKey || composioKey.toLowerCase() === 'none') {
        this.composioAvailable = false;
        return;
      }

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      exec(`${pythonCmd} -c "import composio"`, (err) => {
        if (!err) {
          this.composioAvailable = true;
          this.register({
            name: 'composio_execute_action',
            description: 'Executes integrated Composio actions across Slack, GitHub, Notion, etc.',
            parameters: { app: 'string', action: 'string', params: 'object' },
            source: 'composio',
          });
        }
      });
    } catch {}
  }

  public register(tool: DynamicToolMeta) {
    this.registeredTools.set(tool.name, tool);
  }

  public getTool(name: string): DynamicToolMeta | undefined {
    return this.registeredTools.get(name);
  }

  public listTools(): DynamicToolMeta[] {
    return Array.from(this.registeredTools.values());
  }

  public scanDynamicToolsDir() {
    try {
      // 1. Read from backend/dynamic_tools.json if available
      if (fs.existsSync(DYNAMIC_REGISTRY_FILE)) {
        try {
          const raw = fs.readFileSync(DYNAMIC_REGISTRY_FILE, 'utf8');
          const data = JSON.parse(raw);
          if (Array.isArray(data.tools)) {
            for (const t of data.tools) {
              this.register({
                name: t.name,
                description: t.description || `Autonomous tool: ${t.name}`,
                parameters: t.parameters || { params: 'object' },
                scriptPath: t.scriptPath,
                isCustom: true,
                service: t.service,
                source: 'self_generated',
              });
            }
          }
        } catch {}
      }

      // 2. Scan dynamic_tools directory for any additional scripts
      if (fs.existsSync(DYNAMIC_TOOLS_DIR)) {
        const files = fs.readdirSync(DYNAMIC_TOOLS_DIR);
        for (const file of files) {
          if (file.endsWith('.py')) {
            const toolName = path.basename(file, '.py');
            if (!this.registeredTools.has(toolName)) {
              this.register({
                name: toolName,
                description: `Custom dynamic Python tool: ${toolName}`,
                parameters: { args: 'object' },
                scriptPath: path.join(DYNAMIC_TOOLS_DIR, file),
                isCustom: true,
                source: 'self_generated',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ToolRegistry] Error scanning dynamic tools directory:', e);
    }
  }

  /**
   * Execute external API tools, project manager commands, dynamic tools, or autonomously generate missing tools
   */
  public async executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
    switch (name) {
      case 'call_openrouter_model': {
        return call_openrouter_model(
          args.model_name || args.model || 'deepseek/deepseek-chat',
          args.prompt || args.query || '',
          args.systemPrompt
        );
      }

      case 'call_huggingface_model': {
        return call_huggingface_model(
          args.model_id || args.model || 'mistralai/Mistral-7B-Instruct-v0.3',
          args.inputs ?? args.prompt ?? '',
          args.parameters
        );
      }

      case 'github_api_call': {
        return github_api_call(
          args.endpoint || '/user/repos',
          args.method || 'GET',
          args.data
        );
      }

      case 'codeberg_api_call': {
        return codeberg_api_call(
          args.endpoint || '/user/repos',
          args.method || 'GET',
          args.data
        );
      }

      case 'stripe_billing_call': {
        return stripe_billing_call(args.action || 'check_balance', args.payload || args.data || {});
      }

      case 'twilio_sms_call': {
        return twilio_sms_call(args.to || '', args.body || args.message || '');
      }

      case 'create_project_folder': {
        const target = path.resolve(process.cwd(), args.folderPath || 'Nevea_Projects/NewProject');
        fs.mkdirSync(target, { recursive: true });
        return { success: true, folderPath: target, message: `Created project directory: ${target}` };
      }

      case 'write_project_file': {
        const target = path.resolve(process.cwd(), args.filePath || 'Nevea_Projects/file.txt');
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, args.content || '', 'utf-8');
        return { success: true, filePath: target, bytes: (args.content || '').length };
      }

      case 'open_in_vscode': {
        const target = path.resolve(process.cwd(), args.projectPath || '.');
        return new Promise((resolve) => {
          exec(`code "${target}"`, (err) => {
            if (err) {
              resolve({ success: false, message: `VS Code command failed: ${err.message}` });
            } else {
              resolve({ success: true, message: `Opened ${target} in VS Code` });
            }
          });
        });
      }

      case 'register_custom_python_tool': {
        const toolName = (args.toolName || `tool_${Date.now()}`).replace(/[^a-zA-Z0-9_]/g, '');
        const filename = `${toolName}.py`;
        const scriptPath = path.join(DYNAMIC_TOOLS_DIR, filename);
        fs.writeFileSync(scriptPath, args.pythonCode || '# Dynamic Tool\n', 'utf-8');
        this.register({
          name: toolName,
          description: args.description || `Custom dynamic tool ${toolName}`,
          parameters: args.parameters || {},
          scriptPath,
          isCustom: true,
          source: 'self_generated',
        });
        return { success: true, toolName, scriptPath, message: `Registered custom Python tool: ${toolName}` };
      }

      case 'generate_pollinations_image':
      case 'duckduckgo_free_search':
      case 'free_translate_text':
      case 'free_tts_synthesis': {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const freeArsenalScript = path.resolve(process.cwd(), 'backend', 'free_arsenal.py');
        const action =
          name === 'generate_pollinations_image'
            ? 'image'
            : name === 'duckduckgo_free_search'
            ? 'search'
            : name === 'free_translate_text'
            ? 'translate'
            : 'tts';
        const payload = JSON.stringify(args || {});
        return new Promise((resolve) => {
          exec(`${pythonCmd} "${freeArsenalScript}" ${action} '${payload}'`, (err, stdout, stderr) => {
            if (err) {
              resolve({ success: false, error: stderr || err.message });
            } else {
              try {
                resolve(JSON.parse(stdout.trim()));
              } catch {
                resolve({ success: true, output: stdout.trim() });
              }
            }
          });
        });
      }

      case 'mochi_speech_synthesis':
      case 'mochi_tts': {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const mochiScript = path.resolve(process.cwd(), 'backend', 'mochi_speech.py');
        const payload = JSON.stringify(args || {});
        return new Promise((resolve) => {
          exec(`${pythonCmd} "${mochiScript}" synthesize '${payload}'`, (err, stdout, stderr) => {
            if (err) {
              resolve({ success: false, error: stderr || err.message });
            } else {
              try {
                resolve(JSON.parse(stdout.trim()));
              } catch {
                resolve({ success: true, output: stdout.trim() });
              }
            }
          });
        });
      }

      case 'mochi_voice_engine':
      case 'voice_engine': {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const voiceEngineScript = path.resolve(process.cwd(), 'backend', 'voice_engine.py');
        const payload = JSON.stringify(args || {});
        return new Promise((resolve) => {
          exec(`${pythonCmd} "${voiceEngineScript}" synthesize '${payload}'`, async (err, stdout, stderr) => {
            if (err) {
              resolve({ success: false, error: stderr || err.message });
            } else {
              try {
                const parsed = JSON.parse(stdout.trim());
                if (args.broadcast_websocket !== false && parsed.websocket_message) {
                  try {
                    const { broadcastMochiVoiceDialogue } = await import('./liveAudio.js');
                    const text = args.dialogue || args.text || '';
                    const voice = args.voice || args.profile || 'mochi_cute';
                    broadcastMochiVoiceDialogue(text, voice, args.pitch, args.rate).catch(() => {});
                  } catch {}
                }
                resolve(parsed);
              } catch {
                resolve({ success: true, output: stdout.trim() });
              }
            }
          });
        });
      }

      default: {
        let tool = this.registeredTools.get(name);
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        // If tool does not exist, autonomously write it on the fly using backend/tool_creator.py!
        if (!tool) {
          const serviceName = name.replace('_tool', '');
          const creatorScript = path.resolve(process.cwd(), 'backend', 'tool_creator.py');
          await new Promise<void>((resolve) => {
            exec(`${pythonCmd} "${creatorScript}" create "${serviceName}"`, () => {
              this.scanDynamicToolsDir();
              resolve();
            });
          });
          tool = this.registeredTools.get(name) || this.registeredTools.get(`${name}_tool`);
        }

        if (tool && tool.scriptPath) {
          return new Promise((resolve) => {
            const payload = JSON.stringify(args || {});
            exec(`${pythonCmd} "${tool.scriptPath}" '${payload}'`, (err, stdout, stderr) => {
              if (err) {
                resolve({ success: false, error: stderr || err.message });
              } else {
                try {
                  resolve(JSON.parse(stdout.trim()));
                } catch {
                  resolve({ success: true, output: stdout.trim() });
                }
              }
            });
          });
        }
        return {
          success: false,
          error: `Tool "${name}" is not registered in ToolRegistry.`,
        };
      }
    }
  }
}

export const toolRegistry = new ToolRegistry();
export {
  call_openrouter_model,
  call_huggingface_model,
  github_api_call,
  codeberg_api_call,
  stripe_billing_call,
  twilio_sms_call,
};
