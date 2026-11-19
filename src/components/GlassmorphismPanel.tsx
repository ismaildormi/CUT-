import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mic,
  Eye,
  Sliders,
  KeyRound,
  Crown,
  Volume2,
  RotateCcw,
  Focus,
  Check,
  Copy,
  RefreshCw,
  FileDown,
  FileText,
  MousePointerClick,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  Zap,
  Lock,
} from 'lucide-react';
import {
  dispatchMouseAgentsMissionClient,
  togglePinAllMouseCursorsClient,
  runSelfCritiqueAndEvolveClient,
} from '../services/enterpriseSwarmService';
import { SelfHealingDiagnosticConsole } from './SelfHealingDiagnosticConsole';
import { playCuteSound } from '../services/audioSynth';
import {
  CHARACTER_PRESETS,
  CharacterProfile,
  getActiveCharacterProfile,
  setActiveCharacterProfile,
} from '../data/characterPresets';
import { FUR_PRESETS } from '../ui.js';
import { DesktopActionResult } from '../services/mockBackend';
import { CreatureHandle, FurParamsState } from './CompanionViewport';
import {
  fetchHybridMemories,
  storeHybridMemory,
  MemoryItem,
  SavedCreaturePreset,
  getSavedCreaturePresets,
  saveCreaturePresetToMemory,
  loadCreaturePresetsFromMemory,
  deleteCreaturePresetFromMemory,
  getSavedChatHistory,
  SavedChatTurn,
} from '../services/supabaseClient';
import {
  SovereignUnifiedSystemState,
  fetchUnifiedSovereignState,
  pingAndVerifyLiveSourcesClient,
  downloadRequiredValuesPdfClient,
  downloadMasterBlueprintMdClient,
} from '../services/accountAndPdfService';
import {
  loadDecryptedByokSettings,
  saveEncryptedByokSettings,
  clearEncryptedByokSettings,
  fetchYukaApiKeysClient,
  mintYukaApiKeyClient,
  revokeYukaApiKeyClient,
  type YukaByokProvider,
  type YukaKeySummary,
} from '../services/yukaByokVault';
import {
  KASPI_SOVEREIGN_MODELS,
  getActiveKaspiModel,
  setActiveKaspiModel,
  fetchKaspiModelsStatus,
  type KaspiModelId,
} from '../services/kaspiModelsClient';

export interface WorkspaceFeedItem {
  id: string;
  message: string;
  phase: 'planning' | 'search' | 'code' | 'app' | 'complete' | 'milestone' | 'error' | 'active';
  timestamp: string;
  detail?: string;
}

interface GlassmorphismPanelProps {
  creatureHandle?: CreatureHandle | null;
  onSendTurn: (prompt: string, includeScreen?: boolean) => Promise<any>;
  onToggleVoice: () => void;
  statusMessage?: string;
  companionState?: string;
  isChaosEnabled?: boolean;
  onToggleChaos?: () => void;
  onTriggerChaos?: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  osLogs: DesktopActionResult[];
  onAddOSLog: (log: DesktopActionResult) => void;
  activeEnv: string;
  onSelectEnv: (envId: string) => void;
  isOwnerUiVisible?: boolean;
  lang?: string;
}

type StudioTabId = 'appearance' | 'voice_ai' | 'cloud_keys' | 'sovereign';

const VOICE_PERSONAS = [
  { id: 'Puck', label: 'Puck', descEn: 'Energetic & Expressive', descAr: 'حيوي وتفاعلي' },
  { id: 'Kore', label: 'Kore', descEn: 'Calm & Analytical', descAr: 'هادئ وتحليلي' },
  { id: 'Charon', label: 'Charon', descEn: 'Deep & Executive', descAr: 'عميق وتنفيذي' },
  { id: 'Fenrir', label: 'Fenrir', descEn: 'Fast & Technical', descAr: 'سريع وتقني' },
  { id: 'Aoede', label: 'Aoede', descEn: 'Warm & Creative', descAr: 'دافئ وإبداعي' },
];

const LIGHTING_ENVIRONMENTS = [
  { id: 'midnight', labelEn: 'Midnight Obsidian', labelAr: 'ليل الأوبسيديان', color: '#0f172a' },
  { id: 'studio', labelEn: 'Pure Studio', labelAr: 'استوديو نقي', color: '#334155' },
  { id: 'sunset', labelEn: 'Golden Hour', labelAr: 'غروب ذهبي', color: '#7c2d12' },
  { id: 'cyber', labelEn: 'Neon Cyber', labelAr: 'سايبر نيون', color: '#1e1b4b' },
  { id: 'forest', labelEn: 'Emerald Grove', labelAr: 'غابة الزمرد', color: '#064e3b' },
  { id: 'aurora', labelEn: 'Polar Aurora', labelAr: 'شفق قطبي', color: '#0f766e' },
];

export const GlassmorphismPanel: React.FC<GlassmorphismPanelProps> = ({
  creatureHandle,
  onSendTurn,
  onToggleVoice,
  statusMessage = "Hi! I'm HEYUKA, your sentient 3D companion.",
  companionState = 'idle',
  isChaosEnabled = true,
  onToggleChaos,
  onTriggerChaos,
  isDrawerOpen,
  onToggleDrawer,
  osLogs,
  activeEnv,
  onSelectEnv,
  isOwnerUiVisible = false,
  lang = 'en',
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<StudioTabId>('appearance');

  // 3D Appearance & Fur State
  const [activeCharId, setActiveCharId] = useState<string>(
    () => getActiveCharacterProfile()?.id || 'classic_nevea'
  );
  const [furState, setFurState] = useState<FurParamsState>({
    baseColor: '#e8f0f8',
    tipColor: '#ffffff',
    furLength: 0.28,
    furDensity: 1.0,
    roughness: 0.42,
    specular: 0.45,
    clumping: 0.35,
    curliness: 0.2,
    windStrength: 0.25,
    lightIntensity: 1.15,
    rimIntensity: 0.85,
    exposure: 0.9,
    bloomStrength: 0.18,
    environment: activeEnv || 'midnight',
    gpuFurEnabled: true,
  });
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const [savedPresets, setSavedPresets] = useState<SavedCreaturePreset[]>(() =>
    getSavedCreaturePresets()
  );
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Voice & Memory State
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    try {
      return localStorage.getItem('nevea_preferred_voice') || 'Puck';
    } catch {
      return 'Puck';
    }
  });
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [chatHistory, setChatHistory] = useState<SavedChatTurn[]>(() => getSavedChatHistory());
  const [newMemoryKey, setNewMemoryKey] = useState<string>('');
  const [newMemoryContent, setNewMemoryContent] = useState<string>('');
  const [loadingMemories, setLoadingMemories] = useState<boolean>(false);

  // Cloud & Sovereign State
  const [sovereignState, setSovereignState] = useState<SovereignUnifiedSystemState | null>(null);
  const [probingCloud, setProbingCloud] = useState<boolean>(false);
  const [copiedEnvKey, setCopiedEnvKey] = useState<string | null>(null);

  // Optional BYOK (Web Crypto AES-GCM 256-bit) State — 100% Zero-Key by Default
  const [byokEnabled, setByokEnabled] = useState<boolean>(false);
  const [byokProvider, setByokProvider] = useState<YukaByokProvider>('gemini');
  const [byokModel, setByokModel] = useState<string>('');
  const [byokApiKey, setByokApiKey] = useState<string>('');
  const [byokBaseUrl, setByokBaseUrl] = useState<string>('');
  const [byokSaved, setByokSaved] = useState<boolean>(false);

  // Yuka Unified API Key (yk-live-...) & 100x Mesh State
  const [yukaKeys, setYukaKeys] = useState<YukaKeySummary[]>([]);
  const [yukaMeshMultiplier, setYukaMeshMultiplier] = useState<string>('100x');
  const [newYukaKeyLabel, setNewYukaKeyLabel] = useState<string>('');
  const [newlyMintedKey, setNewlyMintedKey] = useState<string | null>(null);
  const [mintingYukaKey, setMintingYukaKey] = useState<boolean>(false);

  const [selectedModelMode, setSelectedModelMode] = useState<KaspiModelId | 'auto'>(() =>
    getActiveKaspiModel()
  );
  const [kaspiConnected, setKaspiConnected] = useState<boolean>(false);

  const showNotice = useCallback((msg: string) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    fetchKaspiModelsStatus().then((st) => {
      if (st?.configured && st?.liveReachable) setKaspiConnected(true);
    });
  }, []);

  // Load locally encrypted BYOK config on mount
  useEffect(() => {
    loadDecryptedByokSettings().then((cfg) => {
      if (cfg) {
        setByokEnabled(Boolean(cfg.enabled));
        setByokProvider(cfg.provider || 'gemini');
        setByokModel(cfg.model || '');
        setByokApiKey(cfg.apiKey || '');
        setByokBaseUrl(cfg.baseUrl || '');
        setByokSaved(Boolean(cfg.apiKey));
      }
    });
  }, []);

  const refreshYukaKeys = useCallback(async () => {
    const res = await fetchYukaApiKeysClient();
    setYukaKeys(res.keys || []);
    setYukaMeshMultiplier(res.distributedMeshMultiplier || '100x');
  }, []);

  useEffect(() => {
    if (isDrawerOpen && activeTab === 'cloud_keys') {
      refreshYukaKeys();
    }
  }, [isDrawerOpen, activeTab, refreshYukaKeys]);

  const handleSaveByok = async () => {
    const ok = await saveEncryptedByokSettings({
      enabled: byokEnabled,
      provider: byokProvider,
      apiKey: byokApiKey.trim(),
      model: byokModel.trim(),
      baseUrl: byokBaseUrl.trim() || undefined,
    });
    if (ok) {
      setByokSaved(Boolean(byokApiKey.trim()));
      playCuteSound('yiii');
      showNotice(
        isAr
          ? 'تم تشفير وحفظ مفتاح BYOK محلياً بـ AES-GCM 256-bit'
          : 'Encrypted & saved BYOK locally (AES-GCM 256-bit)'
      );
    }
  };

  const handleClearByok = () => {
    clearEncryptedByokSettings();
    setByokEnabled(false);
    setByokApiKey('');
    setByokModel('');
    setByokBaseUrl('');
    setByokSaved(false);
    playCuteSound('boop');
    showNotice(
      isAr ? 'تم مسح مفتاح BYOK — عاد HEYUKA لوضع 100% بدون مفاتيح' : 'BYOK cleared — 100% Zero-Key active'
    );
  };

  const handleMintYukaKey = async () => {
    setMintingYukaKey(true);
    try {
      const label = newYukaKeyLabel.trim() || 'KASPI Production Mesh';
      const res = await mintYukaApiKeyClient(label);
      if (res.success && res.apiKey) {
        setNewlyMintedKey(res.apiKey);
        setNewYukaKeyLabel('');
        await refreshYukaKeys();
        playCuteSound('yiii');
        showNotice(
          isAr ? 'تم إصدار مفتاح HEYUKA السيادي (yk-live)' : 'Minted HEYUKA Unified API Key (yk-live)'
        );
      }
    } finally {
      setMintingYukaKey(false);
    }
  };

  const handleRevokeYukaKey = async (id: string) => {
    const ok = await revokeYukaApiKeyClient(id);
    if (ok) {
      await refreshYukaKeys();
      showNotice(isAr ? 'تم إلغاء المفتاح بنجاح' : 'Revoked HEYUKA API Key');
    }
  };

  // Sync live 3D state when creatureHandle becomes ready
  useEffect(() => {
    if (creatureHandle) {
      const st = creatureHandle.getState();
      if (st) setFurState(st);
      if (typeof creatureHandle.isAutoFollowCamera === 'function') {
        setIsAutoFollow(creatureHandle.isAutoFollowCamera());
      }
    }
  }, [creatureHandle]);

  const refreshCloudState = useCallback(async () => {
    const st = await fetchUnifiedSovereignState();
    if (st) setSovereignState(st);
  }, []);

  const refreshMemoriesAndHistory = useCallback(async () => {
    setLoadingMemories(true);
    try {
      const mems = await fetchHybridMemories();
      setMemories(mems.slice(0, 12));
      setChatHistory(getSavedChatHistory().slice(0, 10));
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;
    if (activeTab === 'cloud_keys' || activeTab === 'sovereign') {
      refreshCloudState();
    } else if (activeTab === 'voice_ai') {
      refreshMemoriesAndHistory();
    } else if (activeTab === 'appearance') {
      loadCreaturePresetsFromMemory().then(setSavedPresets).catch(() => {});
    }
  }, [isDrawerOpen, activeTab, refreshCloudState, refreshMemoriesAndHistory]);

  const handleSelectCharacter = (char: CharacterProfile) => {
    playCuteSound('yiii');
    setActiveCharId(char.id);
    setActiveCharacterProfile(char.id);
    if (creatureHandle) {
      creatureHandle.applyCharacterProfile(char);
      const st = creatureHandle.getState();
      if (st) setFurState(st);
    }
    showNotice(
      isAr ? `تم تفعيل شخصية ${char.name}` : `Applied character: ${char.name}`
    );
  };

  const handleFurParamChange = (key: keyof FurParamsState, value: any) => {
    setFurState((prev) => ({ ...prev, [key]: value }));
    creatureHandle?.updateFurParam(key, value);
  };

  const handleFurColorChange = (baseHex: string, tipHex: string) => {
    setFurState((prev) => ({ ...prev, baseColor: baseHex, tipColor: tipHex }));
    creatureHandle?.setFurColor(baseHex, tipHex);
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    playCuteSound('yiii');
    await saveCreaturePresetToMemory(trimmed, furState, activeEnv);
    const updated = await loadCreaturePresetsFromMemory();
    setSavedPresets(updated);
    setNewPresetName('');
    showNotice(isAr ? `تم حفظ الإعداد "${trimmed}"` : `Saved preset "${trimmed}"`);
  };

  const handleDeletePreset = async (id: string) => {
    playCuteSound('boop');
    const updated = await deleteCreaturePresetFromMemory(id);
    setSavedPresets(updated);
  };

  const handleSelectVoice = (voiceId: string) => {
    playCuteSound('boop');
    setSelectedVoice(voiceId);
    try {
      localStorage.setItem('nevea_preferred_voice', voiceId);
      window.dispatchEvent(
        new CustomEvent('nevea:voice-persona-change', { detail: { voice: voiceId } })
      );
    } catch {}
    showNotice(isAr ? `تم اختيار الصوت: ${voiceId}` : `Active voice persona: ${voiceId}`);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryContent.trim()) return;
    playCuteSound('yiii');
    await storeHybridMemory(newMemoryKey.trim(), newMemoryContent.trim());
    setNewMemoryKey('');
    setNewMemoryContent('');
    await refreshMemoriesAndHistory();
    showNotice(isAr ? 'تم حفظ الذاكرة في السحابة' : 'Saved to hybrid cloud memory');
  };

  const handleProbeClouds = async () => {
    setProbingCloud(true);
    playCuteSound('boop');
    try {
      const res = await pingAndVerifyLiveSourcesClient();
      if (res.state) setSovereignState(res.state);
      showNotice(
        isAr
          ? 'تم فحص جميع البوابات السحابية وتحديث سرعة الاستجابة'
          : 'Verified all cloud gateways & updated live latency'
      );
    } finally {
      setProbingCloud(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedEnvKey(id);
      setTimeout(() => setCopiedEnvKey(null), 1800);
    } catch {}
  };

  const tabs: Array<{ id: StudioTabId; label: string; icon: React.FC<any> }> = [
    {
      id: 'appearance',
      label: isAr ? 'المجسم والفراء' : '3D & Fur',
      icon: Sliders,
    },
    {
      id: 'voice_ai',
      label: isAr ? 'الصوت والذكاء' : 'Voice & AI',
      icon: Mic,
    },
    {
      id: 'cloud_keys',
      label: isAr ? 'السحابة والمفاتيح' : 'Cloud & Keys',
      icon: KeyRound,
    },
    {
      id: 'sovereign',
      label: isAr ? 'النظام السيادي' : 'Sovereign',
      icon: Crown,
    },
  ];

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <motion.aside
          dir={isAr ? 'rtl' : 'ltr'}
          initial={{ x: isAr ? -400 : 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isAr ? -400 : 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="w-full sm:w-[400px] h-full bg-[#09090D]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col shrink-0 z-30 select-none shadow-[-24px_0_60px_rgba(0,0,0,0.85)]"
        >
          {/* Drawer Header */}
          <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white text-[#050505] flex items-center justify-center shrink-0">
                <Sparkles size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold tracking-wider uppercase text-white truncate">
                  {isAr ? 'استوديو HEYUKA السيادي' : 'HEYUKA STUDIO'}
                </h2>
                <p className="text-[10px] text-white/50 truncate">
                  {isAr
                    ? 'KASPI · v12.0 محركات بدون مفاتيح، BYOK وفيزياء الفراء'
                    : 'KASPI · v12.0 Zero-Key Core, BYOK & 3D Fur'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleDrawer}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer transition-colors"
              title={isAr ? 'إغلاق الاستوديو' : 'Close Studio'}
            >
              <X size={14} />
            </button>
          </div>

          {/* 4-Tab Segmented Navigation */}
          <div className="p-2.5 border-b border-white/10 bg-[#0D0D12] grid grid-cols-4 gap-1 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playCuteSound('boop');
                    setActiveTab(tab.id);
                  }}
                  className={`h-9 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate ${
                    isActive
                      ? 'bg-white text-[#050505] shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={12} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toast Feedback Banner */}
          {toastNotice && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
              <span className="truncate">{toastNotice}</span>
              <button
                type="button"
                onClick={() => setToastNotice(null)}
                className="text-emerald-300 hover:text-white text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* =============================================================== */}
            {/* TAB 1: APPEARANCE & 3D GPU FUR                                  */}
            {/* =============================================================== */}
            {activeTab === 'appearance' && (
              <>
                {/* Quick 3D Physics & Camera Controls */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'تفاعلات المجسم والكاميرا' : '3D Actions & Camera'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">60 FPS WebGL2</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playCuteSound('boop');
                        creatureHandle?.triggerBoop(1.25);
                      }}
                      className="h-8 px-2 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles size={11} />
                      <span>{isAr ? 'نقر الأنف' : 'Boop'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCuteSound('yiii');
                        creatureHandle?.triggerFlight(true, 12);
                      }}
                      className="h-8 px-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Zap size={11} />
                      <span>{isAr ? 'طيران' : 'Fly'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCuteSound('yiii');
                        creatureHandle?.catchDuck();
                      }}
                      className="h-8 px-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>🦆</span>
                      <span>{isAr ? 'البطة' : 'Duck'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isAutoFollow;
                        setIsAutoFollow(next);
                        creatureHandle?.setAutoFollowCamera?.(next);
                        playCuteSound('boop');
                      }}
                      className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        isAutoFollow
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-white/65 hover:text-white'
                      }`}
                    >
                      <Focus size={12} />
                      <span>
                        {isAr
                          ? isAutoFollow
                            ? 'تتبع الكاميرا: مفعل'
                            : 'تتبع الكاميرا: متوقف'
                          : isAutoFollow
                          ? 'Camera Follow: ON'
                          : 'Camera Follow: OFF'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCuteSound('boop');
                        creatureHandle?.resetCameraView?.();
                      }}
                      className="h-8 px-2.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-white/80 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>{isAr ? 'توسيط الكاميرا' : 'Recenter View'}</span>
                    </button>
                  </div>
                </div>

                {/* Character Presets Grid */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'الشخصيات والإكسسوارات ثلاثية الأبعاد' : '3D Character Personas'}
                    </span>
                    <span className="text-[10px] font-mono text-white/50">
                      {CHARACTER_PRESETS.length} Presets
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {CHARACTER_PRESETS.map((char) => {
                      const active = activeCharId === char.id;
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => handleSelectCharacter(char)}
                          className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-2.5 ${
                            active
                              ? 'bg-white text-[#050505] border-white font-bold shadow-sm'
                              : 'bg-black/50 hover:bg-white/8 border-white/10 text-white'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: char.furColor }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold truncate">{char.name}</div>
                            <div
                              className={`text-[9px] truncate ${
                                active ? 'text-black/65' : 'text-white/45'
                              }`}
                            >
                              {char.category}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fur Color Swatches & Custom Pickers */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    {isAr ? 'ألوان الفراء والبيئة الضوئية' : 'Fur Palette & Lighting Environment'}
                  </span>

                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(FUR_PRESETS || {}).map(([key, preset]: [string, any]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          playCuteSound('boop');
                          handleFurColorChange(preset.baseHex, preset.tipHex);
                        }}
                        className="h-8 px-2 rounded-lg bg-black/50 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 text-[10px] font-semibold text-white cursor-pointer truncate"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: preset.baseHex }}
                        />
                        <span className="truncate">{preset.name || key}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/10 text-[11px] text-white/80">
                      <span>{isAr ? 'لون الجذور' : 'Base Color'}</span>
                      <input
                        type="color"
                        value={furState.baseColor}
                        onChange={(e) => handleFurColorChange(e.target.value, furState.tipColor)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/10 text-[11px] text-white/80">
                      <span>{isAr ? 'لون الأطراف' : 'Tip Color'}</span>
                      <input
                        type="color"
                        value={furState.tipColor}
                        onChange={(e) => handleFurColorChange(furState.baseColor, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </label>
                  </div>

                  {/* Studio Lighting Environments */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {LIGHTING_ENVIRONMENTS.map((env) => {
                      const isSelected = activeEnv === env.id;
                      return (
                        <button
                          key={env.id}
                          type="button"
                          onClick={() => {
                            playCuteSound('boop');
                            onSelectEnv(env.id);
                          }}
                          className={`h-8 px-2 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer truncate transition-colors ${
                            isSelected
                              ? 'bg-white text-[#050505] border-white font-bold'
                              : 'bg-black/50 hover:bg-white/10 border-white/10 text-white/75'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: env.color }}
                          />
                          <span className="truncate">
                            {isAr ? env.labelAr : env.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Real-Time GPU Fur Physics Sliders */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <span className="text-xs font-bold text-white block">
                    {isAr ? 'فيزياء الفراء والإضاءة (مباشر)' : 'GPU Fur Physics & Shader Sliders'}
                  </span>

                  {(
                    [
                      {
                        key: 'furLength',
                        labelEn: 'Fur Length',
                        labelAr: 'طول الفراء',
                        min: 0.08,
                        max: 0.65,
                        step: 0.01,
                      },
                      {
                        key: 'furDensity',
                        labelEn: 'Strand Density',
                        labelAr: 'كثافة الشعيرات',
                        min: 0.4,
                        max: 1.8,
                        step: 0.05,
                      },
                      {
                        key: 'windStrength',
                        labelEn: 'Wind & Gravity',
                        labelAr: 'قوة الرياح والفيزياء',
                        min: 0.0,
                        max: 1.2,
                        step: 0.05,
                      },
                      {
                        key: 'curliness',
                        labelEn: 'Fur Curliness',
                        labelAr: 'تموج الفراء',
                        min: 0.0,
                        max: 1.0,
                        step: 0.05,
                      },
                      {
                        key: 'lightIntensity',
                        labelEn: 'Key Light Intensity',
                        labelAr: 'شدة الإضاءة',
                        min: 0.3,
                        max: 2.5,
                        step: 0.05,
                      },
                      {
                        key: 'bloomStrength',
                        labelEn: 'Optical Bloom',
                        labelAr: 'التوهج البصري',
                        min: 0.0,
                        max: 0.8,
                        step: 0.02,
                      },
                    ] as const
                  ).map((slider) => {
                    const val = Number(furState[slider.key] ?? 0.3);
                    return (
                      <div key={slider.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/75">
                            {isAr ? slider.labelAr : slider.labelEn}
                          </span>
                          <span className="font-mono text-white/90 tabular-nums">
                            {val.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          step={slider.step}
                          value={val}
                          onChange={(e) =>
                            handleFurParamChange(slider.key, parseFloat(e.target.value))
                          }
                          className="w-full accent-white h-1.5 bg-white/15 rounded-lg cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Save & Load Custom 3D Presets */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                  <span className="text-xs font-bold text-white block">
                    {isAr ? 'حفظ واسترجاع إعدادات المجسم' : 'Saved 3D Presets (Cloud + Local)'}
                  </span>
                  <form onSubmit={handleSavePreset} className="flex gap-1.5">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder={isAr ? 'اسم الإعداد الجديد...' : 'New preset name...'}
                      className="flex-1 h-8 px-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/40"
                    />
                    <button
                      type="submit"
                      className="h-8 px-3 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus size={12} />
                      <span>{isAr ? 'حفظ' : 'Save'}</span>
                    </button>
                  </form>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {savedPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className="p-2 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playCuteSound('yiii');
                            if (preset.furParams) {
                              Object.entries(preset.furParams).forEach(([k, v]) => {
                                handleFurParamChange(k as keyof FurParamsState, v);
                              });
                            }
                            showNotice(
                              isAr ? `تم تحميل ${preset.name}` : `Loaded ${preset.name}`
                            );
                          }}
                          className="flex items-center gap-2 text-start flex-1 min-w-0 cursor-pointer hover:text-emerald-300"
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: preset.furParams?.baseColor || '#fff' }}
                          />
                          <span className="font-semibold truncate">{preset.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-white/40 hover:text-red-400 p-1 cursor-pointer"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: VOICE, LIVE VISION & HYBRID MEMORY                       */}
            {/* =============================================================== */}
            {activeTab === 'voice_ai' && (
              <>
                {/* Live Companion Status & Primary Voice/Vision Controls */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'حالة الرفيق الصوتي والبصري' : 'Live Voice & Vision Status'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono font-bold uppercase text-emerald-300">
                      {companionState}
                    </span>
                  </div>

                  <p className="p-2.5 rounded-lg bg-black/50 border border-white/8 text-xs text-white/85 leading-relaxed">
                    "{statusMessage}"
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onToggleVoice}
                      className={`h-9 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        companionState === 'listening'
                          ? 'bg-emerald-400 text-[#050505]'
                          : 'bg-white text-[#050505] hover:bg-white/90'
                      }`}
                    >
                      <Mic size={14} />
                      <span>
                        {companionState === 'listening'
                          ? isAr
                            ? 'جاري الاستماع...'
                            : 'Listening...'
                          : isAr
                          ? 'تحدث الآن (Alt+Space)'
                          : 'Toggle Mic (Alt+Space)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSendTurn(
                          'Inspect the 3D studio viewport and describe Mochi-Puff and the lighting.',
                          true
                        )
                      }
                      className="h-9 px-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye size={14} />
                      <span>{isAr ? 'رؤية الشاشة' : 'Inspect Screen'}</span>
                    </button>
                  </div>

                  {/* Sentient Autonomous Behavior Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-[11px] text-white/75">
                      {isAr ? 'الحركة الذاتية التلقائية للمجسم' : 'Autonomous Sentient Behavior'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={onToggleChaos}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-colors ${
                          isChaosEnabled
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-white/50'
                        }`}
                      >
                        {isChaosEnabled ? (isAr ? 'مفعل' : 'ACTIVE') : isAr ? 'متوقف' : 'PAUSED'}
                      </button>
                      <button
                        type="button"
                        onClick={onTriggerChaos}
                        className="h-7 px-2.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-[10px] font-semibold text-white cursor-pointer"
                      >
                        {isAr ? 'حركة فورية' : 'Trigger'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* KASPI Sovereign Multi-Model Selector (Omni / Core / Vision) */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'توجيه نماذج KASPI السيادية' : 'KASPI Sovereign Models'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {kaspiConnected ? 'CLOUD CONNECTED' : 'ZERO-KEY READY'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        ...KASPI_SOVEREIGN_MODELS.map((m) => ({ id: m.id, label: m.shortLabel })),
                      ] as const
                    ).map((m) => {
                      const active = selectedModelMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            playCuteSound('boop');
                            setSelectedModelMode(m.id);
                            setActiveKaspiModel(m.id);
                            showNotice(
                              isAr ? `تم تفعيل نموذج ${m.label}` : `Switched active model: ${m.label}`
                            );
                          }}
                          className={`h-8 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer truncate ${
                            active
                              ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                              : 'bg-black/45 hover:bg-white/10 border-white/10 text-white/75'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/55 leading-relaxed">
                    {selectedModelMode === 'auto'
                      ? isAr
                        ? 'توجيه ذكي: Omni للحوار والتخطيط، Core للكود والحساب، Vision للشاشة والصور والـ 3D.'
                        : 'Auto-dispatch: heyuka-omni (reasoning), heyuka-core (code), heyuka-vision (screen/3D).'
                      : KASPI_SOVEREIGN_MODELS.find((m) => m.id === selectedModelMode)?.[
                          isAr ? 'roleAr' : 'roleEn'
                        ]}
                  </p>
                </div>

                {/* Voice Persona Selector (PUCK, KORE, CHARON, FENRIR, AOEDE) */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'الشخصية الصوتية (Voice Persona)' : 'Active Voice Persona'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {selectedVoice.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {VOICE_PERSONAS.map((vp) => {
                      const active = selectedVoice === vp.id;
                      return (
                        <div
                          key={vp.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'bg-white/12 border-white/40 text-white'
                              : 'bg-black/40 border-white/8 text-white/75'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectVoice(vp.id)}
                            className="flex items-center gap-2.5 flex-1 text-start cursor-pointer"
                          >
                            <Volume2
                              size={14}
                              className={active ? 'text-emerald-400' : 'text-white/45'}
                            />
                            <div>
                              <div className="text-xs font-bold text-white">{vp.label}</div>
                              <div className="text-[10px] text-white/55">
                                {isAr ? vp.descAr : vp.descEn}
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectVoice(vp.id);
                              onSendTurn(
                                `Greet me briefly in 1 sentence using the ${vp.label} persona.`,
                                false
                              );
                            }}
                            className="h-7 px-2.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[10px] font-bold cursor-pointer shrink-0"
                          >
                            {isAr ? 'تجربة الصوت' : 'Test Voice'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hybrid Cloud Memory & Chat History */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {isAr ? 'الذاكرة السحابية وسجل المحادثات' : 'Hybrid Memory & Chat History'}
                    </span>
                    <button
                      type="button"
                      onClick={refreshMemoriesAndHistory}
                      className="text-[10px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} className={loadingMemories ? 'animate-spin' : ''} />
                      <span>{isAr ? 'تحديث' : 'Refresh'}</span>
                    </button>
                  </div>

                  <form onSubmit={handleAddMemory} className="space-y-2">
                    <input
                      type="text"
                      value={newMemoryKey}
                      onChange={(e) => setNewMemoryKey(e.target.value)}
                      placeholder={isAr ? 'عنوان المعلومة (مثال: مشروعي المفضل)...' : 'Memory key (e.g. project_goal)...'}
                      className="w-full h-8 px-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/40"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newMemoryContent}
                        onChange={(e) => setNewMemoryContent(e.target.value)}
                        placeholder={isAr ? 'المحتوى المراد تذكره دائماً...' : 'Fact or preference to remember...'}
                        className="flex-1 h-8 px-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/40"
                      />
                      <button
                        type="submit"
                        className="h-8 px-3 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        {isAr ? 'حفظ' : 'Store'}
                      </button>
                    </div>
                  </form>

                  {chatHistory.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-white/45 block">
                        {isAr ? 'آخر الأوامر المنفذة' : 'Recent Executed Prompts'}
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {chatHistory.map((turn) => (
                          <div
                            key={turn.id}
                            onClick={() => onSendTurn(turn.prompt, false)}
                            className="p-2 rounded-lg bg-black/50 hover:bg-white/8 border border-white/8 text-[11px] cursor-pointer transition-colors"
                          >
                            <div className="font-semibold text-white truncate">{turn.prompt}</div>
                            <div className="text-[10px] text-white/55 truncate mt-0.5">
                              {turn.response}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {memories.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase text-white/45 block">
                        {isAr ? 'سجلات الذاكرة المحفوظة' : 'Stored Semantic Memories'}
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                        {memories.map((m, idx) => (
                          <div
                            key={`${m.key}_${idx}`}
                            className="p-2 rounded-lg bg-black/50 border border-white/8 text-[11px]"
                          >
                            <span className="font-mono font-bold text-emerald-300">{m.key}: </span>
                            <span className="text-white/75 break-words">
                              {String(m.content).slice(0, 110)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 3: YUKA v12.0 ZERO-KEY ENGINES, OPTIONAL BYOK & YK-LIVE API */}
            {/* =============================================================== */}
            {activeTab === 'cloud_keys' && (
              <>
                {/* 1. Optional BYOK Vault (Web Crypto AES-GCM 256-bit) */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lock size={12} className="text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {isAr ? 'خزنة BYOK الاختيارية (AES-GCM)' : 'Optional BYOK Vault (AES-GCM)'}
                        </span>
                      </span>
                      <span className="text-[10px] text-white/55 block mt-0.5">
                        {isAr
                          ? 'HEYUKA يعمل 100% بدون مفاتيح افتراضياً — أضف مفتاحك اختيارياً لتعزيز الجلسة'
                          : '100% Zero-Key by default. Optionally attach a personal key locally.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setByokEnabled((v) => !v)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                        byokEnabled
                          ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                          : 'bg-white/6 text-white/70 border-white/12 hover:bg-white/10'
                      }`}
                    >
                      {byokEnabled
                        ? isAr
                          ? 'BYOK مفعل'
                          : 'BYOK ON'
                        : isAr
                        ? 'بدون مفاتيح'
                        : 'ZERO-KEY'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={byokProvider}
                      onChange={(e) => setByokProvider(e.target.value as YukaByokProvider)}
                      className="h-8 px-2 rounded-lg bg-black/60 border border-white/12 text-[11px] text-white outline-none focus:border-white/35"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="groq">Groq LPU</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom OpenAI URL</option>
                    </select>
                    <input
                      type="text"
                      value={byokModel}
                      onChange={(e) => setByokModel(e.target.value)}
                      placeholder={isAr ? 'الموديل (اختياري)' : 'Model ID (optional)'}
                      dir="ltr"
                      className="h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-[11px] text-white placeholder:text-white/35 outline-none focus:border-white/35"
                    />
                  </div>

                  <input
                    type="password"
                    value={byokApiKey}
                    onChange={(e) => setByokApiKey(e.target.value)}
                    placeholder={
                      isAr
                        ? 'أدخل مفتاحك الشخصي هنا (مشفّر محلياً فقط)...'
                        : 'Paste personal API key (encrypted in localStorage)...'
                    }
                    dir="ltr"
                    className="w-full h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-[11px] font-mono text-white placeholder:text-white/35 outline-none focus:border-white/35"
                  />

                  {byokProvider === 'custom' && (
                    <input
                      type="text"
                      value={byokBaseUrl}
                      onChange={(e) => setByokBaseUrl(e.target.value)}
                      placeholder="https://your-endpoint/v1/chat/completions"
                      dir="ltr"
                      className="w-full h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-[11px] font-mono text-white placeholder:text-white/35 outline-none focus:border-white/35"
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveByok}
                      className="flex-1 h-8 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck size={12} />
                      <span>{isAr ? 'تشفير وحفظ محلي' : 'Encrypt & Save'}</span>
                    </button>
                    {byokSaved && (
                      <button
                        type="button"
                        onClick={handleClearByok}
                        className="h-8 px-3 rounded-lg bg-white/8 hover:bg-red-500/20 border border-white/12 text-white/80 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>{isAr ? 'مسح' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Yuka Unified API Key (yk-live-...) & 100x Node Mesh */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <KeyRound size={12} className="text-white/80 shrink-0" />
                        <span className="truncate">
                          {isAr ? 'مفتاح HEYUKA السيادي (yk-live)' : 'HEYUKA Unified API Key (yk-live)'}
                        </span>
                      </span>
                      <span className="text-[10px] text-white/55 block mt-0.5">
                        {isAr
                          ? 'مفتاح موحد للمطورين وربط نقاط Kaspi POS'
                          : 'Unified developer key & Kaspi POS node mesh'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                      MESH {yukaMeshMultiplier}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newYukaKeyLabel}
                      onChange={(e) => setNewYukaKeyLabel(e.target.value)}
                      placeholder={isAr ? 'اسم المفتاح (مثلاً Kaspi POS)...' : 'Key label (e.g. Kaspi POS)...'}
                      className="flex-1 h-8 px-2.5 rounded-lg bg-black/60 border border-white/12 text-[11px] text-white placeholder:text-white/35 outline-none focus:border-white/35"
                    />
                    <button
                      type="button"
                      disabled={mintingYukaKey}
                      onClick={handleMintYukaKey}
                      className="h-8 px-3 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Plus size={12} />
                      <span>{isAr ? 'إصدار' : 'Mint'}</span>
                    </button>
                  </div>

                  {newlyMintedKey && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/35 border border-emerald-500/40 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-emerald-300">
                          {isAr ? 'انسخ مفتاحك الآن (يظهر مرة واحدة):' : 'Copy your new key now:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(newlyMintedKey, 'minted_yk')}
                          className="px-2 py-0.5 rounded bg-emerald-500 text-zinc-950 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedEnvKey === 'minted_yk' ? <Check size={10} /> : <Copy size={10} />}
                          <span>{isAr ? 'نسخ' : 'Copy'}</span>
                        </button>
                      </div>
                      <code className="block text-[10px] font-mono text-white break-all" dir="ltr">
                        {newlyMintedKey}
                      </code>
                    </div>
                  )}

                  {yukaKeys.length > 0 && (
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-0.5">
                      {yukaKeys.map((k) => (
                        <div
                          key={k.id}
                          className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-[10px]"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate">{k.label}</span>
                            <code className="font-mono text-white/55" dir="ltr">
                              {k.keyPreview}
                            </code>
                          </div>
                          {k.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeYukaKey(k.id)}
                              className="px-2 py-0.5 rounded bg-white/8 hover:bg-red-500/20 text-white/70 hover:text-red-300 cursor-pointer shrink-0"
                            >
                              {isAr ? 'إلغاء' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="text-white/35 font-mono">REVOKED</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Zero-Key v12.0 Engine Diagnostics */}
                <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {isAr ? 'محركات HEYUKA v12.0 (100% بدون مفاتيح)' : 'HEYUKA v12.0 Zero-Key Engines'}
                      </span>
                      <span className="text-[10px] text-white/55">
                        {isAr
                          ? '26+ محرك مفتوح المصدر + 120+ مصدر حي بدون مفاتيح'
                          : '26+ Open-Source Power Engines + 120+ Zero-Key Feeds'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={probingCloud}
                      onClick={handleProbeClouds}
                      className="h-8 px-3 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={probingCloud ? 'animate-spin' : ''} />
                      <span>{isAr ? 'فحص الاتصال' : 'Test Live'}</span>
                    </button>
                  </div>

                  {/* External Cloud Providers Status List */}
                  <div className="space-y-2">
                    {(sovereignState?.externalCredentials || []).map((cred) => {
                      const envLabel = cred.secondaryEnvKey
                        ? `${cred.envKey} + ${cred.secondaryEnvKey}`
                        : cred.envKey;
                      return (
                        <div
                          key={cred.id}
                          className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                            cred.isConfigured
                              ? 'bg-emerald-950/20 border-emerald-500/35'
                              : 'bg-black/50 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {isAr ? cred.providerNameAr : cred.providerNameEn}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                                cred.isConfigured
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {cred.isConfigured
                                ? isAr
                                  ? 'متصل (200 OK)'
                                  : 'CONNECTED'
                                : isAr
                                ? 'بانتظار .env'
                                : 'AWAITING .ENV'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <code className="font-mono text-white/70 truncate" dir="ltr">
                              {envLabel}
                            </code>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyText(cred.envKey, cred.id)}
                                className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/10 text-white/80 flex items-center gap-1 cursor-pointer"
                              >
                                {copiedEnvKey === cred.id ? (
                                  <Check size={10} className="text-emerald-400" />
                                ) : (
                                  <Copy size={10} />
                                )}
                                <span>{isAr ? 'نسخ' : 'Copy'}</span>
                              </button>
                              <a
                                href={cred.portalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 border border-white/10 text-emerald-300 font-semibold"
                              >
                                {isAr ? 'الموقع' : 'Portal ↗'}
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Download Values PDF & Copy .env Template */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => downloadRequiredValuesPdfClient()}
                      className="h-9 px-3 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileDown size={13} />
                      <span>{isAr ? 'جدول القيم (PDF)' : 'Values PDF'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const template = [
                          'GEMINI_API_KEY=',
                          'GROQ_API_KEY=',
                          'OPENROUTER_API_KEY=',
                          'HF_TOKEN=',
                          'VITE_SUPABASE_URL=',
                          'VITE_SUPABASE_ANON_KEY=',
                        ].join('\n');
                        handleCopyText(template, 'all_env');
                        showNotice(
                          isAr ? 'تم نسخ قالب ملف .env بالكامل' : 'Copied full .env template'
                        );
                      }}
                      className="h-9 px-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>{isAr ? 'نسخ قالب .env' : 'Copy .env Template'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 4: SOVEREIGN SYSTEM & AUTONOMOUS AGENTS                     */}
            {/* =============================================================== */}
            {activeTab === 'sovereign' && (
              <>
                {isOwnerUiVisible ? (
                  <>
                    {/* Owner Sovereign Quick Console */}
                    <div className="p-3.5 rounded-xl bg-[#111117] border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown size={14} className="text-emerald-400" />
                          <span className="text-xs font-bold text-white">
                            {isAr ? 'لوحة قيادة المالك السيادي' : 'Sovereign Owner Command'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-mono font-bold text-emerald-300">
                          120 SOURCES
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playCuteSound('yiii');
                          window.dispatchEvent(new CustomEvent('nevea:open-sovereign-os'));
                        }}
                        className="w-full h-10 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Crown size={14} />
                        <span>
                          {isAr
                            ? 'فتح نظام المالك السيادي الكامل (Sovereign OS)'
                            : 'Launch Fullscreen Sovereign Owner OS'}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => downloadMasterBlueprintMdClient()}
                          className="h-8 px-2.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText size={12} />
                          <span>{isAr ? 'المخطط (.MD)' : 'Blueprint (.MD)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadRequiredValuesPdfClient()}
                          className="h-8 px-2.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileDown size={12} />
                          <span>{isAr ? 'ملف القيم (.PDF)' : 'Values (.PDF)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Autonomous 6-Mouse Agents Choreographer */}
                    <div className="p-3.5 rounded-xl bg-[#111117] border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MousePointerClick size={13} className="text-cyan-400" />
                          <span>
                            {isAr ? 'عملاء الماوس المستقلون (6 مؤشرات)' : '6 Autonomous Mouse Agents'}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-white/50">100/100</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playCuteSound('boop');
                            togglePinAllMouseCursorsClient(true);
                            dispatchMouseAgentsMissionClient(
                              'full_choreography',
                              '[data-agent-target="companion-canvas"]',
                              false
                            );
                          }}
                          className="h-8 px-2 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <MousePointerClick size={11} />
                          <span>{isAr ? 'تحريك المؤشرات' : 'Move Cursors'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playCuteSound('boop');
                            togglePinAllMouseCursorsClient();
                          }}
                          className="h-8 px-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye size={11} />
                          <span>{isAr ? 'إظهار / إخفاء' : 'Toggle Pin'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            playCuteSound('yiii');
                            await runSelfCritiqueAndEvolveClient('Studio NOVA Self-Critique +50%');
                            showNotice(
                              isAr ? 'تم تنفيذ الفحص الذاتي 100/100' : '100/100 Self-Critique Complete'
                            );
                          }}
                          className="h-8 px-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-white text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck size={11} />
                          <span>{isAr ? 'فحص +50%' : 'Audit +50%'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Self-Healing Diagnostic Console */}
                    <SelfHealingDiagnosticConsole compact />
                  </>
                ) : (
                  <div className="p-5 rounded-xl bg-[#111117] border border-white/10 text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-white">
                      <Lock size={18} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white">
                        {isAr
                          ? 'مخصص لحساب المالك المؤسس (@HEYOKA)'
                          : 'Founder Sovereign Owner Access Required'}
                      </h3>
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {isAr
                          ? 'واجهات وأدوات المالك السيادي معزولة تماماً عن المستخدمين العاديين. قم بتسجيل الدخول بحساب المالك لفتحها.'
                          : 'Sovereign Owner OS controls are strictly isolated from public users. Sign in as @HEYOKA to unlock.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playCuteSound('boop');
                        window.dispatchEvent(new CustomEvent('nevea:open-account-modal'));
                      }}
                      className="w-full h-9 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Crown size={13} />
                      <span>{isAr ? 'تسجيل دخول المالك (@HEYOKA)' : 'Sign In as Founder (@HEYOKA)'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
