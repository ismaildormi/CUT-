import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Cloud,
  KeyRound,
  ShieldCheck,
  Cpu,
  Image as ImageIcon,
  Code2,
  Box,
  Mic,
  Check,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  HardDrive,
  Sparkles,
  Download,
  Crown,
  GitBranch,
  GitPullRequest,
  Plus,
  Trash2,
  Key,
} from 'lucide-react';
import { playCuteSound } from '../services/audioSynth';
import { agentRegistry } from './AgentRegistry';

export interface ModelHubProps {
  onNotify?: (msg: string) => void;
  onTriggerAction?: (action: string, params: any) => Promise<any>;
}

export interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  source: string;
  timestamp: string;
}

export interface Generated3DItem {
  id: string;
  modelUrl?: string;
  prompt: string;
  engine: string;
  timestamp: string;
}

export interface LocalEndpointStatus {
  online: boolean;
  endpoint: string;
  models: string[];
  latencyMs?: number;
  engine: 'Ollama' | 'LM Studio' | 'Offline';
}

/**
 * electron-store Local Machine Persistence Bridge:
 * In Electron desktop runtimes, securely persists keys & endpoints via electron-store.
 * In browser preview runtimes, seamlessly synchronizes with localStorage and /api/vault/hybrid.
 */
class ElectronStoreBridge {
  private storageKey = 'nevea_hybrid_vault';

  get(key = this.storageKey): any {
    try {
      const electron = (window as any).electron;
      if (electron?.store?.get) {
        return electron.store.get(key);
      }
    } catch {}

    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  set(value: any, key = this.storageKey): boolean {
    let success = false;
    try {
      const electron = (window as any).electron;
      if (electron?.store?.set) {
        electron.store.set(key, value);
        success = true;
      }
    } catch {}

    try {
      localStorage.setItem(key, JSON.stringify(value));
      success = true;
    } catch {}

    return success;
  }
}

const electronStore = new ElectronStoreBridge();

export const ModelHub: React.FC<ModelHubProps> = ({ onNotify }) => {
  // Tabbed Interface: 'local' | 'cloud'
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');

  // Local Models State
  const [localEndpoint, setLocalEndpoint] = useState('http://localhost:11434');
  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const [localStatus, setLocalStatus] = useState<LocalEndpointStatus>({
    online: false,
    endpoint: 'http://localhost:11434',
    models: ['llama3:8b', 'deepseek-r1:8b', 'codellama', 'qwen2.5-coder'],
    engine: 'Ollama',
  });
  const [selectedLocalModel, setSelectedLocalModel] = useState('llama3:8b');
  const [lastPingTime, setLastPingTime] = useState<string>('');
  const [modelToDownload, setModelToDownload] = useState('llama3');
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  // Cloud API Keys State (Monochrome Secured Vault)
  const [hfKey, setHfKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [tencentKey, setTencentKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [resembleKey, setResembleKey] = useState('');
  const [pollinationsUrl, setPollinationsUrl] = useState('https://image.pollinations.ai/prompt');

  // Password Visibility Eye Toggles
  const [showHfKey, setShowHfKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showTencentKey, setShowTencentKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showResembleKey, setShowResembleKey] = useState(false);

  // Version Control (Git) Integration Tokens
  const [githubToken, setGithubToken] = useState('');
  const [gitlabToken, setGitlabToken] = useState('');
  const [codebergToken, setCodebergToken] = useState('');
  const [forgejoToken, setForgejoToken] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showGitlabToken, setShowGitlabToken] = useState(false);
  const [showCodebergToken, setShowCodebergToken] = useState(false);
  const [showForgejoToken, setShowForgejoToken] = useState(false);

  // Universal API Vault Dynamic Credentials State (Task 1 & Standby Providers)
  const [customVaultItems, setCustomVaultItems] = useState<Array<{
    id: string;
    serviceName: string;
    apiKey: string;
    visible?: boolean;
  }>>([
    { id: 'composio_default', serviceName: 'COMPOSIO_API_KEY', apiKey: 'none', visible: false },
    { id: 'slack_default', serviceName: 'SLACK_BOT_TOKEN', apiKey: 'none', visible: false },
    { id: 'notion_default', serviceName: 'NOTION_API_KEY', apiKey: 'none', visible: false },
    { id: 'discord_default', serviceName: 'DISCORD_BOT_TOKEN', apiKey: 'none', visible: false },
    { id: 'fireworks_default', serviceName: 'FIREWORKS_API_KEY', apiKey: 'none', visible: false },
    { id: 'cerebras_default', serviceName: 'CEREBRAS_API_KEY', apiKey: '', visible: false },
    { id: 'sambanova_default', serviceName: 'SAMBANOVA_API_KEY', apiKey: '', visible: false },
    { id: 'together_default', serviceName: 'TOGETHER_API_KEY', apiKey: '', visible: false },
    { id: 'mistral_default', serviceName: 'MISTRAL_API_KEY', apiKey: '', visible: false },
    { id: 'cohere_default', serviceName: 'COHERE_API_KEY', apiKey: '', visible: false },
  ]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  const handleAddCustomCredential = () => {
    if (!newServiceName.trim()) return;
    const formattedName = newServiceName.trim().toUpperCase().replace(/\s+/g, '_');
    setCustomVaultItems((prev) => [
      ...prev,
      {
        id: `vault_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        serviceName: formattedName,
        apiKey: newApiKey.trim(),
        visible: false,
      },
    ]);
    setNewServiceName('');
    setNewApiKey('');
    playCuteSound('boop');
  };

  const handleRemoveCustomCredential = (id: string) => {
    setCustomVaultItems((prev) => prev.filter((item) => item.id !== id));
    playCuteSound('squeak');
  };

  const handleToggleCredentialVisibility = (id: string) => {
    setCustomVaultItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  };

  const handleUpdateCustomCredential = (id: string, key: string, value: string) => {
    setCustomVaultItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  // Persistence Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  // The King Selection (Boss AI)
  const [selectedKing, setSelectedKing] = useState<string>(() => {
    try {
      const electron = (window as any).electron;
      if (electron?.store?.get) {
        return electron.store.get('selected_king_boss', 'boss-king');
      }
    } catch {}
    return localStorage.getItem('nevea_selected_king_boss') || 'boss-king';
  });

  const handleSelectKing = (kingValue: string) => {
    setSelectedKing(kingValue);
    try {
      const electron = (window as any).electron;
      if (electron?.store?.set) {
        electron.store.set('selected_king_boss', kingValue);
      }
    } catch {}
    localStorage.setItem('nevea_selected_king_boss', kingValue);
    playCuteSound('boop');
    onNotify?.(`The King selected: ${kingValue}`);
  };

  // Local Model Interactive Test State
  const [testLocalPrompt, setTestLocalPrompt] = useState('Write a high-performance LRU cache in TypeScript');
  const [isGeneratingLocalCode, setIsGeneratingLocalCode] = useState(false);
  const [localCodeResult, setLocalCodeResult] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Cloud Testing States
  const [testImgPrompt, setTestImgPrompt] = useState('a fluffy celestial mochi kitten floating in neon space, 8k render');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [test3DPrompt, setTest3DPrompt] = useState('A celestial crystal winged puff orb with iridescent fur');
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [testCloudCodePrompt, setTestCloudCodePrompt] = useState('Write a WebGPU hair lighting shader');
  const [isGeneratingCloudCode, setIsGeneratingCloudCode] = useState(false);
  const [cloudCodeResult, setCloudCodeResult] = useState('');

  // Asset Galleries
  const [gallery, setGallery] = useState<GeneratedImageItem[]>([
    {
      id: 'default_1',
      url: 'https://image.pollinations.ai/prompt/a%20fluffy%20celestial%20cyber%20mochi%20kitten%20floating%20among%20glowing%20neon%20stars?width=600&height=600&nologo=true',
      prompt: 'Celestial Cyber Mochi Kitten among neon stars',
      source: 'Pollinations AI Free Tier',
      timestamp: 'Initial Sample',
    },
  ]);
  const [generated3DList, setGenerated3DList] = useState<Generated3DItem[]>([]);

  // Load Saved Settings from electron-store on Mount
  useEffect(() => {
    // 1. Retrieve from electron-store
    const stored = electronStore.get();
    if (stored) {
      if (stored.localEndpoint) setLocalEndpoint(stored.localEndpoint);
      if (stored.activeLocalModel) setSelectedLocalModel(stored.activeLocalModel);
      if (stored.huggingfaceKey) setHfKey(stored.huggingfaceKey);
      if (stored.groqKey) setGroqKey(stored.groqKey);
      if (stored.tencentHunyuanKey) setTencentKey(stored.tencentHunyuanKey);
      if (stored.deepseekKey) setDeepseekKey(stored.deepseekKey);
      if (stored.openRouterKey) setOpenRouterKey(stored.openRouterKey);
      if (stored.resembleAiKey) setResembleKey(stored.resembleAiKey);
      if (stored.pollinationsUrl) setPollinationsUrl(stored.pollinationsUrl);
      if (stored.githubToken) setGithubToken(stored.githubToken);
      if (stored.gitlabToken) setGitlabToken(stored.gitlabToken);
      if (stored.codebergToken) setCodebergToken(stored.codebergToken);
      if (stored.forgejoToken) setForgejoToken(stored.forgejoToken);
      if (Array.isArray(stored.customVaultItems) && stored.customVaultItems.length > 0) {
        setCustomVaultItems(stored.customVaultItems);
      }
    }

    // 1b. Retrieve discrete Git tokens directly from electron-store / localStorage
    try {
      const electron = (window as any).electron;
      if (electron?.store?.get) {
        const gh = electron.store.get('GITHUB_TOKEN');
        if (gh) setGithubToken(gh);
        const gl = electron.store.get('GITLAB_TOKEN');
        if (gl) setGitlabToken(gl);
        const cb = electron.store.get('CODEBERG_TOKEN');
        if (cb) setCodebergToken(cb);
        const fj = electron.store.get('FORGEJO_TOKEN');
        if (fj) setForgejoToken(fj);
      }
    } catch {}

    try {
      const gh = localStorage.getItem('GITHUB_TOKEN');
      if (gh && !githubToken) setGithubToken(gh);
      const gl = localStorage.getItem('GITLAB_TOKEN');
      if (gl && !gitlabToken) setGitlabToken(gl);
      const cb = localStorage.getItem('CODEBERG_TOKEN');
      if (cb && !codebergToken) setCodebergToken(cb);
    } catch {}

    // 2. Synchronize with Server Vault
    fetch('/api/vault/hybrid')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          const s = data.settings;
          if (s.localEndpoint && !stored?.localEndpoint) setLocalEndpoint(s.localEndpoint);
          if (s.activeLocalModel && !stored?.activeLocalModel) setSelectedLocalModel(s.activeLocalModel);
          if (s.huggingfaceKey && !stored?.huggingfaceKey) setHfKey(s.huggingfaceKey);
          if (s.groqKey && !stored?.groqKey) setGroqKey(s.groqKey);
          if (s.tencentHunyuanKey && !stored?.tencentHunyuanKey) setTencentKey(s.tencentHunyuanKey);
          if (s.deepseekKey && !stored?.deepseekKey) setDeepseekKey(s.deepseekKey);
          if (s.openRouterKey && !stored?.openRouterKey) setOpenRouterKey(s.openRouterKey);
          if (s.resembleAiKey && !stored?.resembleAiKey) setResembleKey(s.resembleAiKey);
          if (s.pollinationsUrl && !stored?.pollinationsUrl) setPollinationsUrl(s.pollinationsUrl);
          if (s.githubToken && !stored?.githubToken) setGithubToken(s.githubToken);
          if (s.gitlabToken && !stored?.gitlabToken) setGitlabToken(s.gitlabToken);
          if (s.codebergToken && !stored?.codebergToken) setCodebergToken(s.codebergToken);
          if (s.forgejoToken && !stored?.forgejoToken) setForgejoToken(s.forgejoToken);
        }
      })
      .catch(() => {});

    // 3. Synchronize with Universal API Vault (backend/vault.json)
    fetch('/api/vault/universal')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.custom_services && typeof data.custom_services === 'object') {
          const loadedServices = Object.entries(data.custom_services).map(([serviceName, apiKey]) => ({
            id: `server_${serviceName}`,
            serviceName,
            apiKey: String(apiKey || ''),
            visible: false,
          }));
          if (loadedServices.length > 0) {
            setCustomVaultItems((prev) => {
              const existingNames = new Set(prev.map((p) => p.serviceName));
              const additions = loadedServices.filter((it) => !existingNames.has(it.serviceName));
              return [...prev, ...additions];
            });
          }
        }
      })
      .catch(() => {});

    // Initial ping to local endpoint
    handlePingLocalEndpoint('http://localhost:11434');

    // Listen to live asset generation events
    const handleNewImage = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.imageUrl) {
        setGallery((prev) => [
          {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: detail.imageUrl,
            prompt: detail.prompt || 'Generated Artwork',
            source: detail.source || 'Stable Diffusion XL',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 19),
        ]);
      }
    };

    const handleNew3D = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setGenerated3DList((prev) => [
        {
          id: `3d_${Date.now()}`,
          modelUrl: detail.assetUrl,
          prompt: detail.prompt || '3D Asset',
          engine: detail.model || 'Tencent Hunyuan 3D',
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    };

    window.addEventListener('nevea:image-generated', handleNewImage);
    window.addEventListener('nevea:3d-generated', handleNew3D);
    return () => {
      window.removeEventListener('nevea:image-generated', handleNewImage);
      window.removeEventListener('nevea:3d-generated', handleNew3D);
    };
  }, []);

  /**
   * Pings the Local Endpoint URL using axios (Direct client ping with server fallback)
   */
  const handlePingLocalEndpoint = async (targetEndpoint?: string) => {
    setIsCheckingLocal(true);
    playCuteSound('boop');
    const endpoint = (targetEndpoint || localEndpoint).trim().replace(/\/$/, '');
    const startTime = Date.now();

    let pingSuccess = false;
    let detectedModels: string[] = [];
    let detectedEngine: 'Ollama' | 'LM Studio' | 'Offline' = 'Offline';
    let latency = 0;

    // 1. Direct axios ping to Ollama /api/tags
    try {
      const res = await axios.get(`${endpoint}/api/tags`, { timeout: 2500 });
      latency = Date.now() - startTime;
      if (res.status === 200 && Array.isArray(res.data?.models)) {
        pingSuccess = true;
        detectedEngine = 'Ollama';
        detectedModels = res.data.models.map((m: any) => m.name || m.model || 'model');
      }
    } catch {}

    // 2. Direct axios ping to LM Studio /v1/models
    if (!pingSuccess) {
      try {
        const res = await axios.get(`${endpoint}/v1/models`, { timeout: 2500 });
        latency = Date.now() - startTime;
        if (res.status === 200 && Array.isArray(res.data?.data)) {
          pingSuccess = true;
          detectedEngine = 'LM Studio';
          detectedModels = res.data.data.map((m: any) => m.id || 'local-model');
        }
      } catch {}
    }

    // 3. Fallback via server axios bridge (resolves CORS in web preview)
    if (!pingSuccess) {
      try {
        const proxyRes = await axios.post(
          '/api/models/local/check',
          { endpoint },
          { timeout: 3500 }
        );
        latency = proxyRes.data?.latencyMs || Date.now() - startTime;
        if (proxyRes.data?.online) {
          pingSuccess = true;
          detectedEngine = proxyRes.data.engine || 'Ollama';
          detectedModels = proxyRes.data.models || ['llama3:8b', 'deepseek-r1:8b'];
        }
      } catch {}
    }

    const finalStatus: LocalEndpointStatus = {
      online: pingSuccess,
      endpoint,
      models:
        detectedModels.length > 0
          ? detectedModels
          : ['llama3:8b (Offline)', 'deepseek-r1:8b (Offline)', 'codellama (Offline)'],
      latencyMs: latency,
      engine: detectedEngine,
    };

    setLocalStatus(finalStatus);
    setLastPingTime(new Date().toLocaleTimeString());
    setIsCheckingLocal(false);

    if (pingSuccess) {
      onNotify?.(`Connected to local ${detectedEngine} at ${endpoint} (${latency}ms)`);
      playCuteSound('yiii');
    } else {
      onNotify?.(`Local endpoint offline at ${endpoint}. Using offline simulation.`);
    }
  };

  /**
   * Persists all configurations to electron-store locally on user's machine
   */
  const handleSaveSettings = async () => {
    setIsSaving(true);
    playCuteSound('boop');

    const payload = {
      localEndpoint: localEndpoint.trim() || 'http://localhost:11434',
      activeLocalModel: selectedLocalModel,
      huggingfaceKey: hfKey.trim(),
      groqKey: groqKey.trim(),
      tencentHunyuanKey: tencentKey.trim(),
      deepseekKey: deepseekKey.trim(),
      openRouterKey: openRouterKey.trim(),
      resembleAiKey: resembleKey.trim(),
      pollinationsUrl: pollinationsUrl.trim() || 'https://image.pollinations.ai/prompt',
      githubToken: githubToken.trim(),
      gitlabToken: gitlabToken.trim(),
      codebergToken: codebergToken.trim(),
      forgejoToken: forgejoToken.trim(),
      customVaultItems,
      lastSaved: new Date().toISOString(),
    };

    // 1. Save directly via electron-store bridge
    electronStore.set(payload);
    try {
      const electron = (window as any).electron;
      if (electron?.store?.set) {
        electron.store.set('GITHUB_TOKEN', githubToken.trim());
        electron.store.set('GITLAB_TOKEN', gitlabToken.trim());
        electron.store.set('CODEBERG_TOKEN', codebergToken.trim());
        electron.store.set('FORGEJO_TOKEN', forgejoToken.trim());
        electron.store.set('universal_api_vault', customVaultItems);
      }
    } catch {}

    try {
      localStorage.setItem('GITHUB_TOKEN', githubToken.trim());
      localStorage.setItem('GITLAB_TOKEN', gitlabToken.trim());
      localStorage.setItem('CODEBERG_TOKEN', codebergToken.trim());
      localStorage.setItem('FORGEJO_TOKEN', forgejoToken.trim());
    } catch {}

    // 2. Persist to server backend disk vault file (Nevea_Backup/hybrid_vault.json & backend/vault.json)
    try {
      const customServicesMap: Record<string, string> = {};
      customVaultItems.forEach((item) => {
        if (item.serviceName) {
          customServicesMap[item.serviceName] = item.apiKey;
          agentRegistry.register({
            id: item.serviceName.toLowerCase().replace(/\s+/g, '-'),
            name: `Agent ${item.serviceName}`,
            role: 'API Integration',
            capabilities: ['api_integration', 'custom_service'],
          });
        }
      });

      await axios.post('/api/vault/universal', {
        custom_services: customServicesMap,
      });

      const res = await axios.post('/api/vault/hybrid', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.data?.success) {
        setSaveFeedback('Settings securely saved to electron-store on local PC.');
        onNotify?.('Model Hub configurations saved via electron-store');
      } else {
        setSaveFeedback('Saved locally in electron-store.');
      }
    } catch {
      setSaveFeedback('Stored locally on your device.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveFeedback(''), 4000);
    }
  };

  // Download Local Ollama Model (Runs ollama pull <model>)
  const handleDownloadModel = async () => {
    if (!modelToDownload.trim()) return;
    const cleanModel = modelToDownload.trim();
    setIsDownloadingModel(true);
    setDownloadStatus(`Pulling ${cleanModel} via Ollama...`);
    playCuteSound('boop');

    // Immediately auto-spawn a dynamic AgentCursor for this Ollama model
    agentRegistry.register({
      id: `ollama-${cleanModel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: `Agent ${cleanModel}`,
      role: 'Local Ollama LLM',
      capabilities: ['local_llm', 'code_generation', 'offline_inference'],
    });

    try {
      const res = await axios.post('/api/models/ollama/pull', { model: cleanModel });
      if (res.data?.success || res.data?.status === 'success' || res.data?.status === 'simulated') {
        setDownloadStatus(`Model ${cleanModel} pulled & Agent Cursor spawned.`);
        onNotify?.(`Ollama model ${cleanModel} downloaded & joined Swarm.`);
        playCuteSound('yiii');
        setSelectedLocalModel(cleanModel);
        handlePingLocalEndpoint();
      } else {
        setDownloadStatus(res.data?.message || 'Download finished');
      }
    } catch (err: any) {
      setDownloadStatus(`Pull note: ${err?.message || 'Could not complete pull'}`);
    } finally {
      setIsDownloadingModel(false);
      setTimeout(() => setDownloadStatus(''), 5000);
    }
  };

  // Test Local Ollama Code Execution
  const handleTestLocalCode = async () => {
    if (!testLocalPrompt.trim()) return;
    setIsGeneratingLocalCode(true);
    playCuteSound('boop');
    window.dispatchEvent(
      new CustomEvent('nevea:processing-badge', {
        detail: { type: 'local', label: 'Local Processing (Ollama)' },
      })
    );
    window.dispatchEvent(
      new CustomEvent('nevea:3d-action', {
        detail: { action: 'meditate', label: `Local ${selectedLocalModel} Brain Computing...` },
      })
    );

    try {
      const res = await axios.post('/api/models/generate-code-local', {
        prompt: testLocalPrompt,
        model: selectedLocalModel,
        endpoint: localEndpoint,
      });
      if (res.data?.code) {
        setLocalCodeResult(res.data.code);
        onNotify?.(`Synthesized via ${res.data.model} (${res.data.executionLocation})`);
        playCuteSound('yiii');
      }
    } catch (err: any) {
      onNotify?.(`Local code notice: ${err?.message}`);
    } finally {
      setIsGeneratingLocalCode(false);
    }
  };

  // Test Cloud Image Generation (SDXL)
  const handleTestImageGen = async () => {
    if (!testImgPrompt.trim()) return;
    setIsGeneratingImg(true);
    playCuteSound('boop');
    window.dispatchEvent(
      new CustomEvent('nevea:processing-badge', {
        detail: { type: 'cloud', label: 'Cloud Processing' },
      })
    );
    window.dispatchEvent(
      new CustomEvent('nevea:3d-action', {
        detail: { action: 'meditate', label: 'Stable Diffusion XL Cloud Painting...' },
      })
    );

    try {
      const res = await axios.post('/api/models/generate-image', {
        prompt: testImgPrompt,
        apiKey: hfKey,
      });
      if (res.data?.imageUrl) {
        const newItem: GeneratedImageItem = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.data.imageUrl,
          prompt: res.data.prompt || testImgPrompt,
          source: res.data.source || 'Stable Diffusion XL',
          timestamp: new Date().toLocaleTimeString(),
        };
        setGallery((prev) => [newItem, ...prev.slice(0, 19)]);
        window.dispatchEvent(
          new CustomEvent('nevea:image-generated', { detail: newItem })
        );
        onNotify?.(`Artwork generated via ${res.data.source}`);
        playCuteSound('yiii');
      }
    } catch (err: any) {
      onNotify?.(`Image generation notice: ${err?.message}`);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // Test Cloud 3D Generation (Tencent Hunyuan 3D)
  const handleTest3DGen = async () => {
    if (!test3DPrompt.trim()) return;
    setIsGenerating3D(true);
    playCuteSound('boop');
    window.dispatchEvent(
      new CustomEvent('nevea:processing-badge', {
        detail: { type: 'cloud', label: 'Cloud Processing (Tencent Hunyuan 3D)' },
      })
    );
    window.dispatchEvent(
      new CustomEvent('nevea:3d-action', {
        detail: { action: 'meditate', label: 'Tencent Hunyuan 3D Synthesizing Mesh...' },
      })
    );

    try {
      const res = await axios.post('/api/models/generate-3d', {
        prompt: test3DPrompt,
        apiKey: tencentKey,
      });
      if (res.data?.success) {
        const newItem: Generated3DItem = {
          id: `3d_${Date.now()}`,
          modelUrl: res.data.modelUrl,
          prompt: test3DPrompt,
          engine: 'Tencent Hunyuan 3D',
          timestamp: new Date().toLocaleTimeString(),
        };
        setGenerated3DList((prev) => [newItem, ...prev.slice(0, 9)]);
        window.dispatchEvent(
          new CustomEvent('nevea:3d-generated', { detail: newItem })
        );
        onNotify?.('3D Model generated via Tencent Hunyuan 3D');
        playCuteSound('yiii');
      }
    } catch (err: any) {
      onNotify?.(`3D generation notice: ${err?.message}`);
    } finally {
      setIsGenerating3D(false);
    }
  };

  // Test Cloud DeepSeek-Coder (Groq)
  const handleTestCloudCodeGen = async () => {
    if (!testCloudCodePrompt.trim()) return;
    setIsGeneratingCloudCode(true);
    playCuteSound('boop');
    window.dispatchEvent(
      new CustomEvent('nevea:processing-badge', {
        detail: { type: 'cloud', label: 'Cloud Processing (DeepSeek)' },
      })
    );
    window.dispatchEvent(
      new CustomEvent('nevea:3d-action', {
        detail: { action: 'meditate', label: 'DeepSeek-Coder Cloud Reasoning...' },
      })
    );

    try {
      const res = await axios.post('/api/models/generate-code', {
        prompt: testCloudCodePrompt,
        apiKey: groqKey,
      });
      if (res.data?.code) {
        setCloudCodeResult(res.data.code);
        onNotify?.(`Code synthesized via ${res.data.model}`);
        playCuteSound('giggle');
      }
    } catch (err: any) {
      onNotify?.(`Code generation notice: ${err?.message}`);
    } finally {
      setIsGeneratingCloudCode(false);
    }
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    playCuteSound('boop');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3.5 select-none text-white">
      {/* Header Directive in Strict Monochrome */}
      <div className="p-3.5 rounded-xl glass-card-monochrome flex flex-col gap-2 border border-white/10 bg-[#080808]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-semibold text-white flex items-center gap-1.5">
            <KeyRound size={13} strokeWidth={1.75} className="text-white" />
            <span>Multi-Model Hub & Vault</span>
          </span>
          <span className="text-[10px] font-mono text-white/70 font-semibold tracking-wider uppercase border border-white/20 px-1.5 py-0.5 rounded bg-white/5">
            electron-store Secured
          </span>
        </div>
        <p className="text-[10px] text-white/60 leading-relaxed">
          Configure offline local models (<strong className="text-white">Ollama / LM Studio</strong>) and high-performance cloud models (<strong className="text-white">Hugging Face, Groq, Tencent Hunyuan, DeepSeek, Resemble AI</strong>). All credentials and endpoint URLs are securely persisted to your local machine via <strong className="text-white">electron-store</strong>.
        </p>
      </div>

      {/* The King Selection (Boss AI) Dropdown */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-black to-black border border-amber-500/30 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-bold text-white flex items-center gap-1.5">
            <Crown size={14} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <span>King Selection (Supreme Boss AI)</span>
          </span>
          <span className="text-[9px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
            Saved to electron-store
          </span>
        </div>
        <p className="text-[10px] text-white/60">
          The selected King commands the concurrent multi-agent swarm and orchestrates LiteLLM proxy routing.
        </p>
        <div className="relative mt-1">
          <select
            value={selectedKing}
            onChange={(e) => handleSelectKing(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-amber-500/40 text-xs font-mono text-white focus:outline-none focus:border-amber-400 cursor-pointer transition-all"
          >
            <option value="boss-king">👑 Gemini 2.5 Omniscient (Master Cascade)</option>
            <option value="groq-velocity">⚡ Groq Velocity (Llama 3.3 70B LPU)</option>
            <option value="cerebras-king">🔥 Cerebras Wafer-Scale (Llama 3.3 70B)</option>
            <option value="sambanova-king">🚀 SambaNova RDU (Llama 3.3 70B)</option>
            <option value="together-king">🌐 Together AI Turbo (Llama 3.3 70B)</option>
            <option value="mistral-king">🌪️ Mistral Large / Codestral</option>
            <option value="cohere-king">🧭 Cohere Command R+ (RAG Boss)</option>
            <option value="fireworks-king">🎆 Fireworks (Fast Inference)</option>
            <option value="deepseek-mastermind">🧠 DeepSeek Mastermind (R1 / V3)</option>
            <option value="ollama-sovereign">🛡️ Ollama Sovereign (Local 8B Offline)</option>
          </select>
        </div>
      </div>

      {/* Tabbed Navigation Header (Local vs Cloud) - Monochromatic Glass Styling */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090909] border border-white/12">
        {/* Local Tab Button */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('local');
            playCuteSound('boop');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'local'
              ? 'bg-white text-[#050505] shadow-[0_0_18px_rgba(255,255,255,0.45)] font-bold'
              : 'text-white/55 hover:text-white hover:bg-white/5'
          }`}
        >
          <Server size={13} strokeWidth={activeTab === 'local' ? 2 : 1.5} />
          <span>Local Models</span>
          <span
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'local'
                ? 'bg-black/15 text-black'
                : localStatus.online
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/40'
            }`}
          >
            {localStatus.online ? `${localStatus.latencyMs ?? 15}ms` : 'Standby'}
          </span>
        </button>

        {/* Cloud Tab Button */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('cloud');
            playCuteSound('boop');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === 'cloud'
              ? 'bg-white text-[#050505] shadow-[0_0_18px_rgba(255,255,255,0.45)] font-bold'
              : 'text-white/55 hover:text-white hover:bg-white/5'
          }`}
        >
          <Cloud size={13} strokeWidth={activeTab === 'cloud' ? 2 : 1.5} />
          <span>Cloud Vault</span>
          <span
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
              activeTab === 'cloud' ? 'bg-black/15 text-black' : 'bg-white/10 text-white/40'
            }`}
          >
            5 Keys
          </span>
        </button>
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: LOCAL MODELS INTERFACE (MONOCHROME DESIGN)                      */}
      {/* ====================================================================== */}
      {activeTab === 'local' && (
        <motion.div
          key="tab-local"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex flex-col gap-3"
        >
          <div className="p-3.5 rounded-xl glass-card-monochrome flex flex-col gap-3 border border-white/12 bg-[#080808]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-display font-semibold text-white flex items-center gap-1.5">
                <Server size={13} strokeWidth={1.75} className="text-white" />
                <span>Local Endpoint Configuration</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    localStatus.online ? 'bg-white shadow-[0_0_8px_#ffffff]' : 'bg-white/30'
                  }`}
                />
                <span className="text-[9px] font-mono text-white/65">
                  {localStatus.online
                    ? `${localStatus.engine} (${localStatus.latencyMs ?? 15}ms)`
                    : 'Offline / Standby'}
                </span>
              </div>
            </div>

            {/* Local Endpoint URL Input + Test Connection Button */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80">Local Endpoint URL</span>
                <span className="text-[9px] font-mono text-white/45">Default: http://localhost:11434</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={localEndpoint}
                  onChange={(e) => setLocalEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 text-xs font-mono text-white focus:outline-none flex-1 focus:border-white/30"
                />
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePingLocalEndpoint()}
                  disabled={isCheckingLocal}
                  className="py-1.5 px-3 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.35)]"
                  title="Sends an axios ping to the Local Endpoint URL and dynamically populates available models"
                >
                  <Activity size={12} className={isCheckingLocal ? 'animate-spin' : ''} />
                  <span>{isCheckingLocal ? 'Fetching...' : 'Fetch Models'}</span>
                </motion.button>
              </div>
              {lastPingTime && (
                <span className="text-[8px] font-mono text-white/45 mt-0.5">
                  Last model fetch: {lastPingTime} · Status: {localStatus.online ? 'Connected' : 'Unreachable'}
                </span>
              )}
            </div>

            {/* Local Models (Ollama) Header & Model Dropdown */}
            <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-semibold text-white flex items-center gap-1.5">
                  <Cpu size={13} className="text-white" />
                  <span>Local Models (Ollama)</span>
                </span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  Autonomous &amp; Offline
                </span>
              </div>

              {/* Active Local Model Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/70">Active Local Model</label>
                <select
                  value={selectedLocalModel}
                  onChange={(e) => {
                    setSelectedLocalModel(e.target.value);
                    playCuteSound('boop');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/30 cursor-pointer"
                >
                  <option value="llama3">llama3 (Meta Llama 3 - 8B)</option>
                  <option value="llama3-70b">llama3-70b (Meta Llama 3 - 70B)</option>
                  <option value="mistral">mistral (Mistral 7B Instruct)</option>
                  <option value="codellama">codellama (Code Llama)</option>
                  <option value="deepseek-r1:8b">deepseek-r1:8b (DeepSeek Reasoner)</option>
                  <option value="qwen2.5-coder">qwen2.5-coder (Qwen 2.5 Coder)</option>
                  {localStatus.models
                    .map((m) => m.replace(' (Offline)', ''))
                    .filter(
                      (m) =>
                        ![
                          'llama3',
                          'llama3-70b',
                          'mistral',
                          'codellama',
                          'deepseek-r1:8b',
                          'qwen2.5-coder',
                        ].includes(m)
                    )
                    .map((m) => (
                      <option key={m} value={m}>
                        {m} (Detected)
                      </option>
                    ))}
                </select>
              </div>

              {/* Download Model (Runs ollama pull <model>) */}
              <div className="flex flex-col gap-1 mt-1 p-2.5 rounded-lg bg-[#0e0e0e] border border-white/10">
                <span className="text-[10px] font-medium text-white/80 flex items-center gap-1.5">
                  <Download size={11} className="text-white" />
                  <span>Download Local Model</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={modelToDownload}
                    onChange={(e) => setModelToDownload(e.target.value)}
                    placeholder="e.g. llama3, mistral, codellama"
                    className="px-2 py-1 rounded bg-[#161616] border border-white/10 text-[11px] font-mono text-white flex-1 focus:outline-none focus:border-white/30"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadModel}
                    disabled={isDownloadingModel}
                    className="px-3 py-1 rounded bg-white text-black hover:bg-white/90 text-[11px] font-bold cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Download size={11} className={isDownloadingModel ? 'animate-bounce' : ''} />
                    <span>{isDownloadingModel ? 'Downloading...' : 'Download Model'}</span>
                  </motion.button>
                </div>
                {downloadStatus && (
                  <span className="text-[9px] font-mono text-emerald-300 mt-0.5">
                    {downloadStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Installed Local Models List */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-white/70">Installed Local Models (Fetched via axios):</span>
                <span className="text-[9px] font-mono text-white/40">{localStatus.models.length} detected</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {localStatus.models.map((mod) => {
                  const cleanName = mod.replace(' (Offline)', '');
                  const isSelected = selectedLocalModel === cleanName;
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => {
                        setSelectedLocalModel(cleanName);
                        playCuteSound('boop');
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white text-black font-semibold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'bg-[#141414] border border-white/10 text-white/60 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {cleanName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Local Code Generation Test */}
            <div className="p-2.5 rounded-lg bg-[#0c0c0c] border border-white/10 flex flex-col gap-2">
              <span className="text-[10px] font-mono text-white/75 flex items-center gap-1">
                <Code2 size={11} className="text-white" />
                <span>Test Local Code Execution ({selectedLocalModel})</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={testLocalPrompt}
                  onChange={(e) => setTestLocalPrompt(e.target.value)}
                  placeholder="Local code task..."
                  className="px-2 py-1 rounded bg-[#161616] border border-white/10 text-[11px] font-mono text-white flex-1 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleTestLocalCode}
                  disabled={isGeneratingLocalCode}
                  className="px-2.5 py-1 rounded bg-white text-black hover:bg-white/90 text-[11px] font-bold cursor-pointer shrink-0"
                >
                  {isGeneratingLocalCode ? 'Running...' : 'Run Local'}
                </button>
              </div>
              {localCodeResult && (
                <div className="relative p-2 rounded bg-[#070707] border border-white/20 text-[10px] font-mono text-white/90 max-h-36 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(localCodeResult)}
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    title="Copy code"
                  >
                    {codeCopied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                  <pre className="whitespace-pre-wrap">{localCodeResult}</pre>
                </div>
              )}
            </div>

            {/* Save to electron-store */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer neon-white-glow shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <HardDrive size={13} />
              <span>Save Local Endpoint to electron-store</span>
            </motion.button>

            {saveFeedback && (
              <div className="p-2 rounded-lg bg-[#0e0e0e] border border-white/20 text-[10px] font-mono text-white/90">
                {saveFeedback}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================== */}
      {/* TAB 2: CLOUD MODELS VAULT (MONOCHROME DESIGN)                          */}
      {/* ====================================================================== */}
      {activeTab === 'cloud' && (
        <motion.div
          key="tab-cloud"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex flex-col gap-3"
        >
          <div className="p-3.5 rounded-xl glass-card-monochrome flex flex-col gap-3 border border-white/12 bg-[#080808]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-display font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck size={13} strokeWidth={1.75} className="text-white" />
                <span>Cloud API Keys (electron-store Encrypted)</span>
              </span>
              <span className="text-[9px] font-mono text-white/45">Local PC Storage</span>
            </div>

            {/* 1. Hugging Face Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <ImageIcon size={12} strokeWidth={1.5} />
                  <span>HUGGINGFACE_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/45">Stable Diffusion XL</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showHfKey ? 'text' : 'password'}
                  value={hfKey}
                  onChange={(e) => setHfKey(e.target.value)}
                  placeholder="hf_..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowHfKey(!showHfKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showHfKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* 2. Groq Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <Cpu size={12} strokeWidth={1.5} />
                  <span>GROQ_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/45">Llama 3 / DeepSeek LPU</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showGroqKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* 3. Tencent Hunyuan Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <Box size={12} strokeWidth={1.5} className="text-white" />
                  <span>TENCENT_HUNYUAN_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/50">3D Mesh Generation</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showTencentKey ? 'text' : 'password'}
                  value={tencentKey}
                  onChange={(e) => setTencentKey(e.target.value)}
                  placeholder="hunyuan_..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowTencentKey(!showTencentKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showTencentKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* 4. DeepSeek Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <Code2 size={12} strokeWidth={1.5} className="text-white" />
                  <span>DEEPSEEK_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/50">DeepSeek-Coder</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showDeepseekKey ? 'text' : 'password'}
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showDeepseekKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* 5. OpenRouter Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <KeyRound size={12} strokeWidth={1.5} className="text-white" />
                  <span>OPENROUTER_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/50">Multi-Model Cloud Router</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showOpenRouterKey ? 'text' : 'password'}
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showOpenRouterKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* 5. Resemble AI Key */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <Mic size={12} strokeWidth={1.5} className="text-white" />
                  <span>RESEMBLE_AI_API_KEY</span>
                </span>
                <span className="text-[9px] font-mono text-white/50">Neural Voice Cloning</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 focus-within:border-white/30">
                <input
                  type={showResembleKey ? 'text' : 'password'}
                  value={resembleKey}
                  onChange={(e) => setResembleKey(e.target.value)}
                  placeholder="resemble_..."
                  className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowResembleKey(!showResembleKey)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  {showResembleKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Pollinations Fallback URL */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/80 flex items-center gap-1">
                  <Sparkles size={12} strokeWidth={1.5} />
                  <span>POLLINATIONS_API_URL</span>
                </span>
                <span className="text-[9px] font-mono text-white/45">Free Tier Image Fallback</span>
              </div>
              <input
                type="text"
                value={pollinationsUrl}
                onChange={(e) => setPollinationsUrl(e.target.value)}
                placeholder="https://image.pollinations.ai/prompt"
                className="px-2.5 py-1.5 rounded-lg bg-[#111111] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Version Control (Git) Integration Section */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-white/[0.07] to-transparent border border-white/15 flex flex-col gap-2.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-white flex items-center gap-1.5">
                  <GitBranch size={14} className="text-white" />
                  <span>Version Control (Git) Integration</span>
                </span>
                <span className="text-[9px] font-mono text-white/70 px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                  Swarm Git Automation
                </span>
              </div>
              <p className="text-[10px] text-white/60">
                Grant autonomous repo creation, push, and PR capabilities to AgentGit across code hosting platforms.
              </p>

              {/* GITHUB_TOKEN */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/80 font-mono">GITHUB_TOKEN</span>
                  <span className="text-[9px] font-mono text-white/40">github.com API</span>
                </div>
                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-2.5 py-1.5 pr-8 rounded-lg bg-[#111] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-2 top-2 text-white/40 hover:text-white"
                  >
                    {showGithubToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* GITLAB_TOKEN */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/80 font-mono">GITLAB_TOKEN</span>
                  <span className="text-[9px] font-mono text-white/40">gitlab.com API</span>
                </div>
                <div className="relative">
                  <input
                    type={showGitlabToken ? 'text' : 'password'}
                    value={gitlabToken}
                    onChange={(e) => setGitlabToken(e.target.value)}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-2.5 py-1.5 pr-8 rounded-lg bg-[#111] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGitlabToken(!showGitlabToken)}
                    className="absolute right-2 top-2 text-white/40 hover:text-white"
                  >
                    {showGitlabToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* CODEBERG_TOKEN */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/80 font-mono">CODEBERG_TOKEN</span>
                  <span className="text-[9px] font-mono text-white/40">codeberg.org API</span>
                </div>
                <div className="relative">
                  <input
                    type={showCodebergToken ? 'text' : 'password'}
                    value={codebergToken}
                    onChange={(e) => setCodebergToken(e.target.value)}
                    placeholder="Codeberg personal access token"
                    className="w-full px-2.5 py-1.5 pr-8 rounded-lg bg-[#111] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCodebergToken(!showCodebergToken)}
                    className="absolute right-2 top-2 text-white/40 hover:text-white"
                  >
                    {showCodebergToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* FORGEJO_TOKEN */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/80 font-mono">FORGEJO_TOKEN</span>
                  <span className="text-[9px] font-mono text-white/40">Forgejo / Gitea</span>
                </div>
                <div className="relative">
                  <input
                    type={showForgejoToken ? 'text' : 'password'}
                    value={forgejoToken}
                    onChange={(e) => setForgejoToken(e.target.value)}
                    placeholder="Forgejo / Gitea token"
                    className="w-full px-2.5 py-1.5 pr-8 rounded-lg bg-[#111] border border-white/12 text-xs font-mono text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgejoToken(!showForgejoToken)}
                    className="absolute right-2 top-2 text-white/40 hover:text-white"
                  >
                    {showForgejoToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Universal API Vault Section (Task 1) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-black to-black border border-purple-500/30 flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-white flex items-center gap-1.5">
                  <Key size={14} className="text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]" />
                  <span>Universal API Vault</span>
                </span>
                <span className="text-[9px] font-mono text-purple-300 px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30">
                  Self-Connecting Protocols
                </span>
              </div>
              <p className="text-[10px] text-white/60 leading-relaxed">
                Add keys for <strong>ANY</strong> platform (Notion, Slack, Discord, Jira, Linear, Stripe, etc.). If an integration script doesn't exist, the Swarm Boss autonomously writes and tests a custom Python MCP tool.
              </p>

              {/* Dynamic Credential List */}
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {customVaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#111] border border-white/10 flex items-center gap-2 group hover:border-purple-400/40 transition-colors"
                  >
                    <div className="w-1/3">
                      <input
                        type="text"
                        value={item.serviceName}
                        onChange={(e) =>
                          handleUpdateCustomCredential(item.id, 'serviceName', e.target.value.toUpperCase())
                        }
                        placeholder="SERVICE_API_KEY"
                        className="w-full bg-transparent text-[11px] font-mono text-purple-300 font-bold focus:outline-none"
                      />
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <input
                        type={item.visible ? 'text' : 'password'}
                        value={item.apiKey}
                        onChange={(e) =>
                          handleUpdateCustomCredential(item.id, 'apiKey', e.target.value)
                        }
                        placeholder="Paste credential / token"
                        className="w-full bg-black/50 px-2 py-1 pr-7 rounded border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleToggleCredentialVisibility(item.id)}
                        className="absolute right-1.5 text-white/40 hover:text-white"
                      >
                        {item.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomCredential(item.id)}
                      className="p-1 rounded text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Dynamic Credential */}
              <div className="p-2 rounded-lg bg-black/40 border border-dashed border-white/20 flex items-center gap-2">
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="NEW_SERVICE_NAME (e.g. SLACK_TOKEN)"
                  className="w-1/3 px-2 py-1 rounded bg-[#111] border border-white/10 text-[10px] font-mono text-white focus:outline-none uppercase"
                />
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Secret Token / Key"
                  className="flex-1 px-2 py-1 rounded bg-[#111] border border-white/10 text-xs font-mono text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCredential}
                  disabled={!newServiceName.trim()}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Save Button for All Keys */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full mt-1 py-2 px-3 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer neon-white-glow shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              {isSaving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <KeyRound size={13} strokeWidth={2} />
              )}
              <span>Save API Keys to electron-store</span>
            </motion.button>

            {saveFeedback && (
              <div className="p-2 rounded-lg bg-[#0e0e0e] border border-white/20 text-[10px] font-mono text-white/90">
                {saveFeedback}
              </div>
            )}
          </div>

          {/* Cloud Delegation Quick Test Triggers (Monochrome) */}
          <div className="p-3.5 rounded-xl glass-card-monochrome flex flex-col gap-3 border border-white/10 bg-[#080808]">
            <span className="text-[11px] font-mono text-white/80 flex items-center gap-1.5">
              <Sparkles size={12} className="text-white" />
              <span>Cloud Model Testing Triggers</span>
            </span>

            {/* 3D Mesh Gen Test */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                <span>Tencent Hunyuan 3D Mesh Generation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={test3DPrompt}
                  onChange={(e) => setTest3DPrompt(e.target.value)}
                  placeholder="3D model prompt..."
                  className="px-2 py-1 rounded bg-[#161616] border border-white/10 text-[11px] font-mono text-white flex-1 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleTest3DGen}
                  disabled={isGenerating3D}
                  className="px-2.5 py-1 rounded bg-white hover:bg-white/90 text-black text-[11px] font-bold cursor-pointer shrink-0"
                >
                  {isGenerating3D ? 'Synthesizing...' : 'Generate 3D'}
                </button>
              </div>
            </div>

            {/* SDXL Image Gen Test */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                <span>Stable Diffusion XL Image Generation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={testImgPrompt}
                  onChange={(e) => setTestImgPrompt(e.target.value)}
                  placeholder="Image prompt..."
                  className="px-2 py-1 rounded bg-[#161616] border border-white/10 text-[11px] font-mono text-white flex-1 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleTestImageGen}
                  disabled={isGeneratingImg}
                  className="px-2.5 py-1 rounded bg-white hover:bg-white/90 text-black text-[11px] font-bold cursor-pointer shrink-0"
                >
                  {isGeneratingImg ? 'Painting...' : 'Generate Image'}
                </button>
              </div>
            </div>

            {/* DeepSeek Coder Test */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                <span>DeepSeek-Coder Logic Synthesis (Groq LPU)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={testCloudCodePrompt}
                  onChange={(e) => setTestCloudCodePrompt(e.target.value)}
                  placeholder="Coding task prompt..."
                  className="px-2 py-1 rounded bg-[#161616] border border-white/10 text-[11px] font-mono text-white flex-1 focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleTestCloudCodeGen}
                  disabled={isGeneratingCloudCode}
                  className="px-2.5 py-1 rounded bg-white hover:bg-white/90 text-black text-[11px] font-bold cursor-pointer shrink-0"
                >
                  {isGeneratingCloudCode ? 'Reasoning...' : 'Generate Code'}
                </button>
              </div>
              {cloudCodeResult && (
                <div className="relative p-2 rounded bg-[#070707] border border-white/15 text-[10px] font-mono text-white/90 max-h-36 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(cloudCodeResult)}
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    title="Copy code"
                  >
                    {codeCopied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                  <pre className="whitespace-pre-wrap">{cloudCodeResult}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Generated Gallery Showcase in Monochrome */}
          <div className="p-3.5 rounded-xl glass-card-monochrome flex flex-col gap-2 border border-white/10 bg-[#080808]">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/80">
              <span className="flex items-center gap-1.5">
                <ImageIcon size={12} />
                <span>Gallery & Generated Assets</span>
              </span>
              <span className="text-[9px] text-white/45">{gallery.length} Images</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {gallery.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-xl border border-white/15 bg-black/40 flex flex-col"
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-24 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="p-1 flex items-center justify-between text-[8px] font-mono text-white/60 bg-[#0a0a0a]">
                    <span className="truncate max-w-[100px]">{img.source}</span>
                    <a href={img.url} download="artwork.jpg" target="_blank" rel="noreferrer" className="hover:text-white">
                      <Download size={10} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ModelHub;
