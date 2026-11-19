import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Globe,
  Code2,
  Terminal,
  ShieldCheck,
  Volume2,
  Search,
  Wrench,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Plus,
  Sparkles,
  X,
  CloudCheck,
  Layers,
  Lock,
  Zap,
  ArrowUp,
  ArrowDown,
  Database,
  Cpu,
  GitBranch,
  MousePointerClick,
  Download,
  Eye,
} from 'lucide-react';
import {
  SwarmCompanyAgent,
  InterAgentMessage,
  WebSearchResultItem,
  SelfBuiltTool,
  CompanyProjectState,
  VirtualDesktopId,
  LiveBrowserViewportState,
  HumanActionBlocker,
  CompoundingPowerState,
  ProStyleBlueprintClient,
  CosmicVerificationReport,
  AdversarialCritiqueReportClient,
  fetchSwarmCompanyState,
  amplifySwarmBootPower,
  executeSwarmCompanyProject,
  fetchLiveSwarmStatusReport,
  performOpenWebSearch,
  fetchLiveWebPageContent,
  createDynamicSelfTool,
  toggleAutonomousMachineMode,
  switchVirtualDesktopOnServer,
  resolveHumanActionBlocker,
  verifyAllCosmicAdditionsClient,
  runSelfCritiqueAndEvolveClient,
  dispatchMouseAgentsMissionClient,
  togglePinAllMouseCursorsClient,
} from '../services/enterpriseSwarmService';
import { useLanguage } from '../i18n/translations';
import { playCuteSound } from '../services/audioSynth';
import { SelfHealingDiagnosticConsole } from './SelfHealingDiagnosticConsole';

export type ConsoleTabId = 'blueprint' | 'masterplan' | 'browser' | 'roster' | 'comms' | 'tools';

interface SwarmCompanyHUDProps {
  isCinemaHidden?: boolean;
  isDrawerOpen?: boolean;
  activeDesktop: VirtualDesktopId;
  onChangeDesktop: (desktop: VirtualDesktopId) => void;
  machineMode: boolean;
  onToggleMachineMode: (enabled: boolean) => void;
  onSpeakReport?: (text: string) => void;
  isConsoleOpen: boolean;
  onToggleConsole: (open: boolean) => void;
  activeConsoleTab: ConsoleTabId;
  onSelectConsoleTab: (tab: ConsoleTabId) => void;
}

export const GOOGLE_AI_STUDIO_NEVEA_BLUEPRINT = [
  {
    layer: '01',
    titleEn: 'Google AI Studio × Multimodal Voice & Chat Dock',
    titleAr: 'واجهة الصوت والشات الموحدة (Google AI Studio × Live Audio)',
    stack: 'Gemini 2.5 Native Audio · 3D 64-Bar Spatial Spectrum · 7-Lang i18n',
    descEn:
      'Single unified bottom command dock with in-world 3D WebGL frequency ring and zero-shift multilingual voice control.',
    descAr:
      'شريط شات وأوامر سفلي موحد بالكامل مع ترددات صوتية ثلاثية الأبعاد داخل العالم الافتراضي ودعم 7 لغات بدون تحرك الأزرار.',
  },
  {
    layer: '02',
    titleEn: 'Unified Executive Brain, Master Plan & Compounding Engine',
    titleAr: 'العقل التنفيذي الواحد والماستر بلان ومضاعفة القوة التراكمية',
    stack: 'Atlas Orchestrator · 2^N Boot Multiplier · Machine Mode',
    descEn:
      'Every project builds a 5-phase Master Plan while doubling active source fan-out and collective neural power on every load.',
    descAr:
      'أي مشروع يتحول فوراً إلى ماستر بلان من 5 مراحل مع مضاعفة تلقائية لقوة النظام والمصادر النشطة مع كل تحميل للمشروع.',
  },
  {
    layer: '03',
    titleEn: '5-Agent Swarm Company & 6 Autonomous Mouse Cursor Agents',
    titleAr: 'شركة الوكلاء الخمسة ومركز عملاء الماوس الستة المستقلين',
    stack: 'Atlas · Nova · Codex · Titan · Aegis + Ghost Co-Pilot Cursor',
    descEn:
      '6 spatial mouse cursors move, click, scroll, and inspect real DOM elements with collision avoidance and live spoken reports.',
    descAr:
      '6 مؤشرات ماوس ذكية تتحرك وتنقر وتتفاعل حياً مع عناصر الشاشة والمتصفح مع منع التصادم وتقارير فورية عند سؤالهم "فين وصلو؟".',
  },
  {
    layer: '04',
    titleEn: '120 Keyless Sources (100 Cosmic + 20 Cyber), 12 Pro Style Vaults & Zero-Waste Router',
    titleAr: '120 مصدراً مفتوحاً بدون مفاتيح (100 كوني + 20 سيبراني) و12 خزنة ستايل احترافي (0% هدر)',
    stack: 'O(1) Domain Router · 90% Token Savings · 12 Pro UI/Shader Blueprints',
    descEn:
      'Routes every model & agent directly to its exact domain API and injects production Tailwind/Three.js style blueprints with zero keys.',
    descAr:
      'يوجه كل نموذج ووكيل فوراً للمصدر المختص بدون استهلاك في البحث الشامل، مع حقن أكواد ستايل احترافي لأي نوع مشروع بدون مفاتيح.',
  },
  {
    layer: '05',
    titleEn: 'Adversarial Self-Critique Policy (+50% Power Boost) & Cloud Ledger',
    titleAr: 'السياسة النقدية الذاتية الشاملة (+50% قوة إضافية) والسجل السحابي الدائم',
    stack: '6-Pillar Critique Engine (100/100) · 1.5× Hyper-Boost · Cloud Firestore',
    descEn:
      'Continuously critiques 6 core engineering pillars, auto-remediates flaws to 100/100 equilibrium, and boosts system power by +50%.',
    descAr:
      'ينتقد النظام ذاتياً عبر 6 محاور هندسية ويصلح أي نقطة ضعف تلقائياً للوصول إلى التوازن الكامل 100/100 مع تقوية النظام بـ +50% إضافية.',
  },
  {
    layer: '06',
    titleEn: '3D GPGPU Fur Simulation & 4 Virtual Desktops',
    titleAr: 'المجسم ثلاثي الأبعاد والديسكتوبات الافتراضية الأربعة',
    stack: 'Three.js WebGL2 · Marschner Hair Shader · D1–D4 Virtual Workspaces',
    descEn:
      'Real-time 60FPS physical fur companion with D1 (3D Core), D2 (Live Browser), D3 (Master Plan), and D4 (Code & Cloud).',
    descAr:
      'محاكاة فراء فيزيائية بـ 60 إطار/ثانية مع 4 أسطح مكتب افتراضية (المجسم، المتصفح الحي، الماستر بلان، والبرمجة والسحابة).',
  },
];

export const SwarmCompanyHUD: React.FC<SwarmCompanyHUDProps> = ({
  isCinemaHidden = false,
  activeDesktop,
  onChangeDesktop,
  machineMode,
  onToggleMachineMode,
  onSpeakReport,
  isConsoleOpen,
  onToggleConsole,
  activeConsoleTab,
  onSelectConsoleTab,
}) => {
  const { lang, t } = useLanguage();

  const [roster, setRoster] = useState<SwarmCompanyAgent[]>([]);
  const [commsLog, setCommsLog] = useState<InterAgentMessage[]>([]);
  const [selfTools, setSelfTools] = useState<SelfBuiltTool[]>([]);
  const [activeProject, setActiveProject] = useState<CompanyProjectState | null>(null);
  const [liveBrowser, setLiveBrowser] = useState<LiveBrowserViewportState>({
    url: 'https://github.com/trending',
    title: 'GitHub Trending & Open-Source Intelligence',
    content: 'Autonomous Browser Viewport Ready.',
    scrollY: 0,
    lastActionByAgent: 'Nova Researcher',
    requiresAuth: false,
    updatedAt: '',
  });
  const [pendingBlocker, setPendingBlocker] = useState<HumanActionBlocker | null>(null);
  const [compoundingPower, setCompoundingPower] = useState<CompoundingPowerState>({
    bootGeneration: 2,
    powerMultiplier: 4,
    hyperEvolutionBoost: 1.5,
    effectivePowerMultiplier: 6,
    selfCritiqueScore: 100,
    critiqueCyclesCompleted: 2,
    zeroFlawEquilibrium: true,
    activeSourceConnectorsCount: 60,
    totalCatalogSources: 60,
    proStyleBlueprintsCount: 12,
    zeroWasteSavingsPercent: 90,
    parallelFanoutLimit: 24,
    collectiveFactsCount: 10,
    totalProjectsAmplified: 1,
    lastBootTimestamp: '',
  });
  const [proStyleBlueprints, setProStyleBlueprints] = useState<ProStyleBlueprintClient[]>([]);
  const [selectedStyleBp, setSelectedStyleBp] = useState<ProStyleBlueprintClient | null>(null);
  const [cosmicVerifyReport, setCosmicVerifyReport] = useState<CosmicVerificationReport | null>(null);
  const [isVerifyingCosmic, setIsVerifyingCosmic] = useState<boolean>(false);
  const [selfCritiqueReport, setSelfCritiqueReport] = useState<AdversarialCritiqueReportClient | null>(null);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [pinAllCursors, setPinAllCursors] = useState<boolean>(false);
  const [isDispatchingMice, setIsDispatchingMice] = useState<boolean>(false);

  // Project execution input
  const [projectPrompt, setProjectPrompt] = useState<string>('');
  const [isExecutingProject, setIsExecutingProject] = useState<boolean>(false);
  const [liveReportBanner, setLiveReportBanner] = useState<string | null>(null);

  // Live Browser & Google/Open Web Search state
  const [browserInput, setBrowserInput] = useState<string>('https://github.com/trending');
  const [searchResults, setSearchResults] = useState<WebSearchResultItem[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
  const browserScrollRef = useRef<HTMLDivElement | null>(null);

  // Self-Tooling Factory state
  const [newToolName, setNewToolName] = useState<string>('');
  const [newToolDesc, setNewToolDesc] = useState<string>('');
  const [newToolCode, setNewToolCode] = useState<string>('');
  const [isCreatingTool, setIsCreatingTool] = useState<boolean>(false);
  const [toolExecOutput, setToolExecOutput] = useState<string | null>(null);

  const refreshCompanyState = useCallback(async () => {
    const snap = await fetchSwarmCompanyState();
    if (!snap) return;
    if (Array.isArray(snap.roster)) setRoster(snap.roster);
    if (Array.isArray(snap.commsLog)) setCommsLog(snap.commsLog);
    if (Array.isArray(snap.selfTools)) setSelfTools(snap.selfTools);
    if (snap.activeProject !== undefined) setActiveProject(snap.activeProject);
    if (snap.compoundingPower) setCompoundingPower(snap.compoundingPower);
    if (snap.selfCritiqueReport) setSelfCritiqueReport(snap.selfCritiqueReport);
    if (Array.isArray(snap.proStyleBlueprints) && snap.proStyleBlueprints.length > 0) {
      setProStyleBlueprints(snap.proStyleBlueprints);
      setSelectedStyleBp((prev) => prev || snap.proStyleBlueprints![0]);
    }
    if (snap.liveBrowser) {
      setLiveBrowser(snap.liveBrowser);
      setBrowserInput(snap.liveBrowser.url);
    }
    if (snap.pendingBlocker !== undefined) {
      setPendingBlocker(snap.pendingBlocker);
    }
  }, []);

  useEffect(() => {
    amplifySwarmBootPower().then((comp) => {
      if (comp) setCompoundingPower(comp);
      refreshCompanyState();
    });
    const timer = setInterval(refreshCompanyState, 4500);
    return () => clearInterval(timer);
  }, [refreshCompanyState]);

  // Sync console tab when Virtual Desktop changes from top bar or voice
  useEffect(() => {
    if (activeDesktop === 'd2-browser') {
      onSelectConsoleTab('browser');
      onToggleConsole(true);
    } else if (activeDesktop === 'd3-masterplan') {
      onSelectConsoleTab('masterplan');
      onToggleConsole(true);
    } else if (activeDesktop === 'd4-workspace') {
      onSelectConsoleTab('blueprint');
      onToggleConsole(true);
    } else if (activeDesktop === 'd1-3d') {
      onToggleConsole(false);
    }
  }, [activeDesktop, onSelectConsoleTab, onToggleConsole]);

  // Apply programmatic scroll when liveBrowser.scrollY changes via voice or agent
  useEffect(() => {
    if (browserScrollRef.current) {
      browserScrollRef.current.scrollTo({
        top: liveBrowser.scrollY || 0,
        behavior: 'smooth',
      });
    }
  }, [liveBrowser.scrollY]);

  const handleRunProject = useCallback(
    async (customPrompt?: string) => {
      const targetPrompt = (customPrompt ?? projectPrompt).trim();
      if (!targetPrompt || isExecutingProject) return;
      if (!customPrompt) setProjectPrompt('');
      setIsExecutingProject(true);
      onToggleConsole(true);
      onSelectConsoleTab('masterplan');
      onChangeDesktop('d3-masterplan');
      playCuteSound('boop');

      try {
        const res = await executeSwarmCompanyProject(targetPrompt);
        if (res) {
          setRoster(res.roster || []);
          setCommsLog(res.comms || []);
          setActiveProject(res.project || null);
          if (res.liveBrowser) setLiveBrowser(res.liveBrowser);
          if (res.pendingBlocker !== undefined) setPendingBlocker(res.pendingBlocker);
          const spoken = lang === 'ar' ? res.reportAr : res.reportEn || res.reportAr;
          setLiveReportBanner(spoken);
          onSpeakReport?.(spoken);
          playCuteSound('yiii');
        }
        await refreshCompanyState();
      } finally {
        setIsExecutingProject(false);
      }
    },
    [
      isExecutingProject,
      lang,
      onChangeDesktop,
      onSelectConsoleTab,
      onSpeakReport,
      onToggleConsole,
      projectPrompt,
      refreshCompanyState,
    ]
  );

  const handleAskWhereAreThey = useCallback(async () => {
    playCuteSound('boop');
    onToggleConsole(true);
    onSelectConsoleTab('masterplan');
    const report = await fetchLiveSwarmStatusReport();
    if (report) {
      const spoken =
        lang === 'ar' ? report.spokenReportAr : report.spokenReportEn || report.spokenReportAr;
      setLiveReportBanner(spoken);
      onSpeakReport?.(spoken);
      await refreshCompanyState();
    }
  }, [lang, onSelectConsoleTab, onSpeakReport, onToggleConsole, refreshCompanyState]);

  const handleNavigateOrSearchBrowser = useCallback(
    async (targetUrlOrQuery?: string) => {
      const q = (targetUrlOrQuery ?? browserInput).trim();
      if (!q || isSearchingWeb) return;
      setIsSearchingWeb(true);
      onToggleConsole(true);
      onSelectConsoleTab('browser');
      onChangeDesktop('d2-browser');
      playCuteSound('boop');
      try {
        const [page, items] = await Promise.all([
          fetchLiveWebPageContent(q),
          performOpenWebSearch(q),
        ]);
        if (page) {
          setLiveBrowser(page);
          setBrowserInput(page.url);
        }
        if (items.length > 0) {
          setSearchResults(items);
        }
      } finally {
        setIsSearchingWeb(false);
      }
    },
    [browserInput, isSearchingWeb, onChangeDesktop, onSelectConsoleTab, onToggleConsole]
  );

  const handleScrollBrowser = useCallback(
    async (delta: number) => {
      const updated = await fetchLiveWebPageContent(liveBrowser.url, delta);
      if (updated) {
        setLiveBrowser(updated);
      } else if (browserScrollRef.current) {
        browserScrollRef.current.scrollBy({ top: delta, behavior: 'smooth' });
      }
    },
    [liveBrowser.url]
  );

  // Listen for voice / command bar global directives
  useEffect(() => {
    const handleGlobalStatusQuery = () => {
      handleAskWhereAreThey();
    };
    const handleGlobalProjectRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.prompt) {
        handleRunProject(detail.prompt);
      }
    };
    const handleGlobalVoiceDirective = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.type === 'master_plan') {
        onToggleConsole(true);
        onSelectConsoleTab('masterplan');
        onChangeDesktop('d3-masterplan');
      } else if (detail.type === 'switch_desktop' && detail.desktopId) {
        onChangeDesktop(detail.desktopId);
        switchVirtualDesktopOnServer(detail.desktopId);
      } else if (detail.type === 'browser_navigate' && detail.urlOrQuery) {
        handleNavigateOrSearchBrowser(detail.urlOrQuery);
      } else if (detail.type === 'browser_scroll' && typeof detail.scrollDelta === 'number') {
        onToggleConsole(true);
        onSelectConsoleTab('browser');
        onChangeDesktop('d2-browser');
        handleScrollBrowser(detail.scrollDelta);
      } else if (detail.type === 'machine_mode' && typeof detail.machineMode === 'boolean') {
        onToggleMachineMode(detail.machineMode);
        toggleAutonomousMachineMode(detail.machineMode);
      }
    };

    window.addEventListener('nevea:ask-swarm-status', handleGlobalStatusQuery);
    window.addEventListener('nevea:execute-company-project', handleGlobalProjectRequest);
    window.addEventListener('nevea:autonomous-directive', handleGlobalVoiceDirective);
    return () => {
      window.removeEventListener('nevea:ask-swarm-status', handleGlobalStatusQuery);
      window.removeEventListener('nevea:execute-company-project', handleGlobalProjectRequest);
      window.removeEventListener('nevea:autonomous-directive', handleGlobalVoiceDirective);
    };
  }, [
    handleAskWhereAreThey,
    handleNavigateOrSearchBrowser,
    handleRunProject,
    handleScrollBrowser,
    onChangeDesktop,
    onSelectConsoleTab,
    onToggleConsole,
    onToggleMachineMode,
  ]);

  const handleBuildNewTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolName.trim() || !newToolDesc.trim() || isCreatingTool) return;
    setIsCreatingTool(true);
    playCuteSound('boop');
    try {
      const built = await createDynamicSelfTool({
        name: newToolName.trim(),
        description: newToolDesc.trim(),
        code: newToolCode.trim() || undefined,
      });
      if (built) {
        setNewToolName('');
        setNewToolDesc('');
        setNewToolCode('');
        const msg =
          lang === 'ar'
            ? `تم بناء الأداة "${built.name}" ودمجها فوراً في العقل الموحد.`
            : `Self-built tool "${built.name}" synthesized and merged into the Unified Brain.`;
        setToolExecOutput(msg);
        onSpeakReport?.(msg);
        await refreshCompanyState();
        playCuteSound('yiii');
      }
    } finally {
      setIsCreatingTool(false);
    }
  };

  const handleApproveMachineModeFromBlocker = async () => {
    playCuteSound('yiii');
    onToggleMachineMode(true);
    await toggleAutonomousMachineMode(true);
    await resolveHumanActionBlocker('machine_mode_full_autonomy');
    setPendingBlocker(null);
    await refreshCompanyState();
  };

  const handleCompleteUserLoginStep = async () => {
    playCuteSound('yiii');
    await resolveHumanActionBlocker('user_completed_login_in_viewport');
    setPendingBlocker(null);
    await refreshCompanyState();
  };

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'atlas-ceo':
        return Crown;
      case 'nova-research':
        return Globe;
      case 'codex-engineer':
        return Code2;
      case 'titan-os':
        return Terminal;
      case 'aegis-qa':
        return ShieldCheck;
      default:
        return Sparkles;
    }
  };

  const getStateLabel = (state: SwarmCompanyAgent['state']) => {
    switch (state) {
      case 'planning':
        return t.statePlanning;
      case 'researching':
        return t.stateResearching;
      case 'coding':
        return t.stateCoding;
      case 'testing':
        return t.stateTesting;
      case 'healing':
        return t.stateHealing;
      case 'completed':
        return t.stateCompleted;
      default:
        return t.stateIdle;
    }
  };

  const masterPlan = activeProject?.masterPlan;

  return (
    <>
      {/* 1. Unified Monochrome Command & Architecture Console (Docked cleanly above the Bottom Chat Bar — Zero Top-Left Clutter) */}
      <AnimatePresence>
        {isConsoleOpen && !isCinemaHidden && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-22 left-1/2 -translate-x-1/2 z-25 w-[92%] max-w-2xl select-none pointer-events-auto"
          >
            <div className="rounded-2xl bg-[#070708]/96 backdrop-blur-2xl border border-white/20 shadow-[0_28px_80px_rgba(0,0,0,0.95)] overflow-hidden text-white font-sans">
              {/* Top Console Header (Pure Monochrome Black & White) */}
              <div className="h-11 px-4 bg-white/[0.03] border-b border-white/12 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff] shrink-0" />
                  <span className="text-xs font-display font-bold tracking-wider uppercase text-white truncate">
                    {t.swarmHudTitle}
                  </span>
                  <span className="h-5 px-2 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono text-white inline-flex items-center shrink-0">
                    {activeProject ? `${activeProject.overallProgress}%` : '5/5 ACTIVE'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleAskWhereAreThey}
                    className="h-7 px-2.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Volume2 size={11} />
                    <span>{t.statusReportBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleConsole(false);
                      if (activeDesktop !== 'd1-3d') {
                        onChangeDesktop('d1-3d');
                      }
                    }}
                    className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 border border-white/12 text-white/75 hover:text-white inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Close Console (Return to Full 3D View)"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Live Spoken Report Banner (Pure Monochrome) */}
              <AnimatePresence>
                {liveReportBanner && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-2 bg-white/[0.07] border-b border-white/15 flex items-start justify-between gap-2 text-[11px] text-white"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Volume2 size={13} className="text-white shrink-0 mt-0.5 animate-pulse" />
                      <p className="leading-relaxed text-white/95 line-clamp-2">{liveReportBanner}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLiveReportBanner(null)}
                      className="text-white/50 hover:text-white cursor-pointer shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Console Body */}
              <div className="p-3.5 flex flex-col gap-3">
                {/* 6 Fixed-Width Monochrome Tabs (Blueprint + Master Plan + Live Web + Agents + Comms + Tools) */}
                <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-black/80 border border-white/12 h-9">
                  {[
                    {
                      id: 'blueprint' as ConsoleTabId,
                      label: lang === 'ar' ? 'المخطط التقني' : 'Blueprint',
                      icon: Cpu,
                    },
                    { id: 'masterplan' as ConsoleTabId, label: t.tabMasterPlan, icon: Layers },
                    { id: 'browser' as ConsoleTabId, label: t.tabLiveWeb, icon: Globe },
                    { id: 'roster' as ConsoleTabId, label: t.tabAgents, icon: Crown },
                    { id: 'comms' as ConsoleTabId, label: t.tabComms, icon: MessageSquare },
                    { id: 'tools' as ConsoleTabId, label: t.tabTools, icon: Wrench },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeConsoleTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onSelectConsoleTab(tab.id)}
                        className={`h-7 px-2 rounded-lg text-[10px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer transition-all truncate ${
                          active
                            ? 'bg-white text-[#050505] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={11} className="shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* TAB 0: GOOGLE AI STUDIO × NEVEA OS TECHNICAL ARCHITECTURE BLUEPRINT + 60 COSMIC SOURCES + 12 PRO STYLE VAULTS + SELF-CRITIQUE (+50%) */}
                {activeConsoleTab === 'blueprint' && (
                  <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/15 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-white/60 uppercase tracking-wider block truncate">
                          {lang === 'ar'
                            ? `${compoundingPower.totalCatalogSources} مصدراً كونياً · ${compoundingPower.proStyleBlueprintsCount || 12} خزنة ستايل · سياسة نقدية 100/100 (+50%) · قوة ${compoundingPower.effectivePowerMultiplier || compoundingPower.powerMultiplier * 1.5}×`
                            : `${compoundingPower.totalCatalogSources} KEYLESS SOURCES · ${compoundingPower.proStyleBlueprintsCount || 12} PRO STYLES · 100/100 CRITIQUE (+50%) · ${compoundingPower.effectivePowerMultiplier || compoundingPower.powerMultiplier * 1.5}× POWER`}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate">
                          {lang === 'ar'
                            ? 'المخطط الشامل + السياسة النقدية الذاتية (+50% قوة) + 120 مصدراً مفتوحاً'
                            : 'NOVA Master Blueprint + Adversarial Self-Critique (+50% Boost) + 120 Sources'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isCritiquing}
                          onClick={async () => {
                            setIsCritiquing(true);
                            playCuteSound('boop');
                            const res = await runSelfCritiqueAndEvolveClient(
                              activeProject?.title || 'NOVA Studio Global Multi-Agent OS'
                            );
                            if (res?.critiqueReport) {
                              setSelfCritiqueReport(res.critiqueReport);
                              if (res.compoundingPower) setCompoundingPower(res.compoundingPower);
                              const msg =
                                lang === 'ar'
                                  ? res.critiqueReport.executiveSummaryAr
                                  : res.critiqueReport.executiveSummaryEn;
                              setLiveReportBanner(msg);
                              onSpeakReport?.(msg);
                              playCuteSound('yiii');
                            }
                            setIsCritiquing(false);
                            refreshCompanyState();
                          }}
                          className="h-7 px-2.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                        >
                          <ShieldCheck size={11} />
                          <span>
                            {isCritiquing
                              ? lang === 'ar'
                                ? 'جاري النقد...'
                                : 'Critiquing...'
                              : lang === 'ar'
                              ? 'السياسة النقدية +50%'
                              : 'Self-Critique +50%'}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isVerifyingCosmic}
                          onClick={async () => {
                            setIsVerifyingCosmic(true);
                            playCuteSound('boop');
                            const rep = await verifyAllCosmicAdditionsClient(
                              'Build a 3D WebGL SaaS AI Analytics Studio with Pro Style'
                            );
                            if (rep) {
                              setCosmicVerifyReport(rep);
                              const msg =
                                lang === 'ar'
                                  ? `تم التحقق بنجاح 100%: ${rep.totalCosmicSources} مصدراً كونياً مفتوحاً + ${rep.totalProStyleBlueprints} خزنة ستايل احترافي تعمل بدون مفاتيح، مع توفير ${rep.routeTest.estimatedTokenSavingsPercent}% من البحث عبر الموجه الذكي O(1)!`
                                  : `Verification Passed: ${rep.totalCosmicSources} Keyless Cosmic Sources + ${rep.totalProStyleBlueprints} Pro Style Vaults verified with ${rep.routeTest.estimatedTokenSavingsPercent}% token savings!`;
                              setLiveReportBanner(msg);
                              onSpeakReport?.(msg);
                            }
                            setIsVerifyingCosmic(false);
                            refreshCompanyState();
                          }}
                          className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                        >
                          <Zap size={11} />
                          <span>
                            {isVerifyingCosmic
                              ? lang === 'ar'
                                ? 'جاري الفحص...'
                                : 'Verifying...'
                              : lang === 'ar'
                              ? 'فحص 120 مصدراً'
                              : 'Verify 120 Sources'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 6-Pillar Adversarial Self-Critique Scorecard (100/100 Zero-Flaw Equilibrium) */}
                    {selfCritiqueReport && (
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/20 flex flex-col gap-1.5 text-[10px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-white truncate">
                            {lang === 'ar'
                              ? `✓ السياسة النقدية الذاتية (6 محاور): ${selfCritiqueReport.overallScoreBefore}% ← ${selfCritiqueReport.overallScoreAfter}% (0 ثغرات · +50% قوة = ${selfCritiqueReport.effectivePowerMultiplier}×)`
                              : `✓ ADVERSARIAL SELF-CRITIQUE (6 PILLARS): ${selfCritiqueReport.overallScoreBefore}% → ${selfCritiqueReport.overallScoreAfter}% (0 FLAWS · +50% BOOST = ${selfCritiqueReport.effectivePowerMultiplier}×)`}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white text-[#050505] font-mono font-bold text-[9px] shrink-0">
                            100/100 ZERO FLAWS
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-0.5">
                          {selfCritiqueReport.dimensions.map((dim) => (
                            <div
                              key={dim.id}
                              className="p-2 rounded-lg bg-black/80 border border-white/12 flex flex-col gap-0.5"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-white truncate text-[10px]">
                                  {lang === 'ar' ? dim.nameAr : dim.nameEn}
                                </span>
                                <span className="font-mono text-[9px] text-white/90 shrink-0">
                                  {dim.initialScore}%&rarr;{dim.postRemediationScore}%
                                </span>
                              </div>
                              <p className="text-[9px] text-white/65 line-clamp-1">
                                {lang === 'ar'
                                  ? dim.autonomousRemediationAr
                                  : dim.autonomousRemediationEn}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cosmicVerifyReport && (
                      <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/25 flex flex-col gap-1 text-[10px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-white">
                            {lang === 'ar'
                              ? `✓ فحص حي ناجح: ${cosmicVerifyReport.totalCosmicSources} مصدر + ${cosmicVerifyReport.totalProStyleBlueprints} ستايل (بدون مفاتيح API)`
                              : `✓ VERIFIED: ${cosmicVerifyReport.totalCosmicSources} SOURCES + ${cosmicVerifyReport.totalProStyleBlueprints} PRO STYLES (ZERO-KEY)`}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white text-[#050505] font-mono font-bold text-[9px]">
                            {cosmicVerifyReport.routeTest.estimatedTokenSavingsPercent}% SAVED ·{' '}
                            {cosmicVerifyReport.routeTest.routingLatencyMs}ms
                          </span>
                        </div>
                        <p className="text-white/75 truncate">
                          {lang === 'ar'
                            ? `تم تخطي ${cosmicVerifyReport.routeTest.skippedSourcesCount} مصدر غير متعلق بالمهمة وتوجيه النماذج مباشرة إلى (${cosmicVerifyReport.routeTest.matchedCategories.join(' + ')}) مع حقن ستايل [${cosmicVerifyReport.matchedStyleBlueprint.nameAr}].`
                            : `O(1) Router skipped ${cosmicVerifyReport.routeTest.skippedSourcesCount} unrelated sources, routed directly to [${cosmicVerifyReport.routeTest.matchedCategories.join(', ')}] & injected [${cosmicVerifyReport.matchedStyleBlueprint.nameEn}].`}
                        </p>
                      </div>
                    )}

                    {/* Pro Style & Shader Code Blueprints Selector (Zero-Config for Any Project Type) */}
                    {proStyleBlueprints.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-black/75 border border-white/12 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-white truncate">
                            {lang === 'ar'
                              ? 'خزنة أكواد الستايل الاحترافي والشيدرز (تُحقن تلقائياً في كل مشروع حسب نوعه):'
                              : 'Pro UI/Style & Shader Code Vault (Auto-injected into models by project type):'}
                          </span>
                          {selectedStyleBp && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRunProject(
                                  `Build a complete ${selectedStyleBp.archetype} project using ${selectedStyleBp.nameEn} Pro Style Blueprint`
                                )
                              }
                              className="h-6 px-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[9px] font-mono font-bold text-white cursor-pointer shrink-0"
                            >
                              {lang === 'ar' ? 'نفذ مشروع بهذا الستايل' : 'Build with Style'}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                          {proStyleBlueprints.map((bp) => {
                            const isSel = selectedStyleBp?.id === bp.id;
                            return (
                              <button
                                key={bp.id}
                                type="button"
                                onClick={() => setSelectedStyleBp(bp)}
                                className={`h-6 px-2 rounded-lg text-[9px] font-mono whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                                  isSel
                                    ? 'bg-white text-[#050505] font-bold'
                                    : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                                }`}
                              >
                                {lang === 'ar' ? bp.nameAr.slice(0, 26) : bp.nameEn.slice(0, 24)}
                              </button>
                            );
                          })}
                        </div>
                        {selectedStyleBp && (
                          <div className="p-2 rounded-lg bg-black/90 border border-white/10 text-[9px] font-mono text-white/80 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2 text-white">
                              <span className="font-bold truncate">{selectedStyleBp.archetype}</span>
                              <span className="text-white/55 truncate">
                                BG: {selectedStyleBp.designTokens.backgroundPrimary} · Accent:{' '}
                                {selectedStyleBp.designTokens.accentPrimary}
                              </span>
                            </div>
                            <div className="text-white/65 truncate">
                              Tailwind: {selectedStyleBp.tailwindRecipe}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {GOOGLE_AI_STUDIO_NEVEA_BLUEPRINT.map((item) => (
                        <div
                          key={item.layer}
                          className="p-2.5 rounded-xl bg-black/70 border border-white/12 hover:border-white/30 transition-colors flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-white text-[#050505] font-mono text-[9px] font-bold shrink-0">
                              LAYER {item.layer}
                            </span>
                            <span className="text-[9px] font-mono text-white/55 truncate">
                              {item.stack}
                            </span>
                          </div>
                          <h4 className="text-[11px] font-bold text-white truncate mt-0.5">
                            {lang === 'ar' ? item.titleAr : item.titleEn}
                          </h4>
                          <p className="text-[10px] text-white/70 leading-relaxed line-clamp-2">
                            {lang === 'ar' ? item.descAr : item.descEn}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 1: MASTER PLAN & EXTRACTED REAL VALUES */}
                {activeConsoleTab === 'masterplan' && (
                  <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {/* Quick Project Launch Row */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRunProject();
                      }}
                      className="flex items-center gap-2 h-9 shrink-0"
                    >
                      <input
                        type="text"
                        value={projectPrompt}
                        onChange={(e) => setProjectPrompt(e.target.value)}
                        placeholder={t.newProjectPlaceholder}
                        className="flex-1 h-9 bg-black/80 border border-white/15 focus:border-white/40 rounded-xl px-3 text-xs text-white placeholder-white/40 focus:outline-none truncate"
                      />
                      <button
                        type="submit"
                        disabled={!projectPrompt.trim() || isExecutingProject}
                        className="h-9 px-3.5 rounded-xl bg-white hover:bg-white/90 text-[#050505] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
                      >
                        <Zap size={12} />
                        <span>{isExecutingProject ? t.executingBtn : t.executeBtn}</span>
                      </button>
                    </form>

                    {masterPlan ? (
                      <>
                        {/* Master Plan Header Card (Includes Live Compounding Power & 32 Universal Sources Status) */}
                        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/12 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-white/60 uppercase block truncate">
                              {t.masterPlanTitle} · {compoundingPower.totalCatalogSources} SOURCES ·{' '}
                              {compoundingPower.powerMultiplier}× POWER (GEN #{compoundingPower.bootGeneration})
                            </span>
                            <h3 className="text-xs font-bold text-white truncate">
                              {masterPlan.projectTitle}
                            </h3>
                          </div>
                          <span className="h-6 px-2 rounded-md bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                            <CloudCheck size={11} />
                            <span>{t.masterPlanCloudSynced}</span>
                          </span>
                        </div>

                        {/* 5 Agent Execution Phases */}
                        <div className="flex flex-col gap-1.5">
                          {masterPlan.phases.map((phase) => (
                            <div
                              key={phase.id}
                              className="p-2 rounded-xl bg-black/60 border border-white/12 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-white text-[#050505] text-[9px] font-mono font-bold inline-flex items-center justify-center shrink-0">
                                    {phase.order}
                                  </span>
                                  <span className="text-[11px] font-bold text-white truncate">
                                    {lang === 'ar' ? phase.titleAr : phase.titleEn}
                                  </span>
                                  <span className="text-[9px] font-mono text-white/45 shrink-0">
                                    · {phase.assignedAgentName}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/65 truncate mt-0.5">
                                  {phase.detail}
                                </p>
                              </div>
                              <span className="h-5 px-2 rounded bg-white/10 border border-white/20 text-white text-[9px] font-mono font-bold inline-flex items-center shrink-0">
                                {phase.progress}%
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Real Extracted Values from Google Search & Open Web */}
                        {masterPlan.extractedValues.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/12 flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/85">
                              <Database size={11} className="text-white shrink-0" />
                              <span className="truncate">{t.masterPlanExtractedValues}</span>
                            </div>
                            {masterPlan.extractedValues.map((val) => (
                              <div
                                key={val.id}
                                className="p-1.5 rounded-lg bg-black/70 border border-white/10 flex flex-col gap-0.5 text-[10px]"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-white truncate">{val.key}</span>
                                  <span className="text-[9px] font-mono text-white/65 truncate max-w-[160px]">
                                    {val.source}
                                  </span>
                                </div>
                                <p className="text-white/75 line-clamp-2">{val.value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Synthesized AI Code Preview */}
                        {masterPlan.synthesizedCodeSnippet && (
                          <pre className="p-2.5 rounded-xl bg-black/90 border border-white/15 font-mono text-[10px] text-white/90 overflow-x-auto max-h-28">
                            {masterPlan.synthesizedCodeSnippet}
                          </pre>
                        )}
                      </>
                    ) : (
                      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 text-center text-xs text-white/60">
                        {t.masterPlanNoActive}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: LIVE INTERACTIVE WEB BROWSER & GOOGLE SEARCH VIEWPORT */}
                {activeConsoleTab === 'browser' && (
                  <div className="flex flex-col gap-2.5 max-h-[320px]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleNavigateOrSearchBrowser();
                      }}
                      className="flex items-center gap-1.5 h-9 shrink-0"
                    >
                      <input
                        type="text"
                        value={browserInput}
                        onChange={(e) => setBrowserInput(e.target.value)}
                        placeholder={t.liveWebUrlPlaceholder}
                        className="flex-1 h-9 bg-black/80 border border-white/15 rounded-xl px-3 text-xs text-white placeholder-white/40 focus:outline-none truncate font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingWeb}
                        className="h-9 px-3 rounded-xl bg-white text-[#050505] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Search size={12} />
                        <span>{t.liveWebNavigateBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollBrowser(-320)}
                        title={t.liveWebScrollUp}
                        className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white inline-flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScrollBrowser(320)}
                        title={t.liveWebScrollDown}
                        className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white inline-flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </form>

                    <div
                      ref={browserScrollRef}
                      className="p-3 rounded-xl bg-black/85 border border-white/15 max-h-44 overflow-y-auto flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-white truncate block">
                            {liveBrowser.title}
                          </span>
                          <span className="text-[9px] font-mono text-white/45 truncate block">
                            {liveBrowser.url} · Controlled by {liveBrowser.lastActionByAgent}
                          </span>
                        </div>
                        <a
                          href={liveBrowser.url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-6 px-2 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white inline-flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed whitespace-pre-wrap font-sans">
                        {liveBrowser.content}
                      </p>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                        {searchResults.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleNavigateOrSearchBrowser(item.url)}
                            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/90 shrink-0">
                                  {item.source}
                                </span>
                                <span className="text-[11px] font-bold text-white truncate">
                                  {item.title}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/60 truncate mt-0.5">
                                {item.snippet}
                              </p>
                            </div>
                            <ExternalLink size={11} className="text-white/50 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: 5 SMART AGENTS ROSTER + AUTONOMOUS MOUSE CURSOR AGENTS HUB (مكان العملاء ديال الماوس) */}
                {activeConsoleTab === 'roster' && (
                  <div className="flex flex-col gap-2 max-h-[310px] overflow-y-auto pr-1">
                    {/* Dedicated Mouse Cursor Agents Control Bar */}
                    <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/20 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <MousePointerClick size={14} className="text-white shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-white block truncate">
                            {lang === 'ar'
                              ? 'مكان العملاء ديال الماوس (6 مؤشرات ذكية مستقلة + Ghost Cursor)'
                              : 'Autonomous Mouse Cursor Agents Hub (5 Swarm Cursors + Ghost Cursor)'}
                          </span>
                          <span className="text-[9px] font-mono text-white/60 block truncate">
                            {lang === 'ar'
                              ? 'تتحرك وتنقر وتتفاعل حياً مع عناصر الشاشة [data-agent-target] بدون تصادم'
                              : 'Real-time spatial DOM click/hover choreography with 2D collision avoidance'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const nextPin = !pinAllCursors;
                            setPinAllCursors(nextPin);
                            togglePinAllMouseCursorsClient(nextPin);
                            playCuteSound('boop');
                          }}
                          className={`h-7 px-2.5 rounded-lg text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer border transition-colors ${
                            pinAllCursors
                              ? 'bg-white text-[#050505] border-white'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                          }`}
                        >
                          <Eye size={11} />
                          <span>
                            {lang === 'ar'
                              ? pinAllCursors
                                ? 'المؤشرات مثبتة: نعم'
                                : 'تثبيت كل المؤشرات'
                              : pinAllCursors
                              ? 'Cursors Pinned: ON'
                              : 'Pin All Cursors'}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isDispatchingMice}
                          onClick={async () => {
                            setIsDispatchingMice(true);
                            setPinAllCursors(true);
                            togglePinAllMouseCursorsClient(true);
                            playCuteSound('boop');
                            const res = await dispatchMouseAgentsMissionClient(
                              'full_choreography',
                              '[data-agent-target="companion-canvas"]',
                              false
                            );
                            if (res?.roster) setRoster(res.roster);
                            const msg =
                              lang === 'ar'
                                ? 'تحركت جميع مؤشرات الماوس الستة (أطلس، نوفا، كودكس، تيتان، إيجيس، وGhost Cursor) على الشاشة وتفاعلت مع عناصر الواجهة الحية بنجاح!'
                                : 'All 6 Autonomous Mouse Cursors (Atlas, Nova, Codex, Titan, Aegis & Ghost Cursor) glided across the viewport and locked onto live DOM targets!';
                            setLiveReportBanner(msg);
                            onSpeakReport?.(msg);
                            setIsDispatchingMice(false);
                            refreshCompanyState();
                          }}
                          className="h-7 px-2.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                        >
                          <MousePointerClick size={11} />
                          <span>
                            {lang === 'ar' ? 'تحريك واختبار الماوسات حياً' : 'Test 6 Mouse Agents Live'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {roster.map((agent) => {
                      const Icon = getAgentIcon(agent.id);
                      const stateLabel = getStateLabel(agent.state);
                      return (
                        <div
                          key={agent.id}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/12 transition-colors flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                <Icon size={14} className="text-white" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-xs font-bold text-white truncate">
                                  {lang === 'ar' ? agent.nameAr : agent.nameEn}
                                </h3>
                                <p className="text-[10px] text-white/55 truncate">
                                  {lang === 'ar' ? agent.roleAr : agent.roleEn}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="h-5 px-1.5 rounded bg-black/80 border border-white/15 text-[9px] font-mono text-white/80 inline-flex items-center tabular-nums">
                                ({Math.round(agent.x)}, {Math.round(agent.y)})
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  setPinAllCursors(true);
                                  togglePinAllMouseCursorsClient(true);
                                  playCuteSound('boop');
                                  await dispatchMouseAgentsMissionClient(
                                    `focus_${agent.id}`,
                                    '[data-agent-target="companion-canvas"]',
                                    false
                                  );
                                  refreshCompanyState();
                                }}
                                className="h-5 px-2 rounded bg-white/10 hover:bg-white/25 border border-white/20 text-[9px] font-mono font-bold text-white cursor-pointer"
                              >
                                {lang === 'ar' ? 'حرّك الماوس' : 'Move Cursor'}
                              </button>
                              <span className="h-5 px-2 rounded-md text-[9px] font-mono font-bold bg-white text-[#050505] inline-flex items-center shrink-0">
                                {stateLabel}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] text-white/80 bg-black/60 rounded-lg px-2.5 py-1 border border-white/10 truncate font-mono">
                            {agent.currentTask}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 4: INTER-AGENT DIALOGUE & SELF-HEALING SYSTEM CONSOLE */}
                {activeConsoleTab === 'comms' && (
                  <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                    <SelfHealingDiagnosticConsole compact />
                    {commsLog.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/12 flex flex-col gap-1 text-[11px]"
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-bold text-white truncate">
                            {msg.fromName} &rarr; {msg.toName}
                          </span>
                          <span className="font-mono text-white/45 shrink-0">{msg.timestamp}</span>
                        </div>
                        <p className="text-white/85 leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 5: SELF-TOOLING FACTORY */}
                {activeConsoleTab === 'tools' && (
                  <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    <form
                      onSubmit={handleBuildNewTool}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/12 flex flex-col gap-2"
                    >
                      <span className="text-[11px] font-bold text-white truncate">
                        {t.selfToolsTitle}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={newToolName}
                          onChange={(e) => setNewToolName(e.target.value)}
                          placeholder={t.selfToolNamePlaceholder}
                          className="h-8 bg-black/80 border border-white/15 rounded-lg px-2.5 text-[11px] text-white placeholder-white/35 focus:outline-none truncate"
                        />
                        <input
                          type="text"
                          value={newToolDesc}
                          onChange={(e) => setNewToolDesc(e.target.value)}
                          placeholder={t.selfToolDescPlaceholder}
                          className="h-8 bg-black/80 border border-white/15 rounded-lg px-2.5 text-[11px] text-white placeholder-white/35 focus:outline-none truncate"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newToolName.trim() || !newToolDesc.trim() || isCreatingTool}
                        className="h-8 rounded-lg bg-white text-[#050505] hover:bg-white/90 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Plus size={12} />
                        <span>{t.selfToolBuildBtn}</span>
                      </button>
                    </form>

                    {toolExecOutput && (
                      <div className="p-2 rounded-xl bg-white/10 border border-white/25 text-[10px] text-white font-mono">
                        {toolExecOutput}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      {selfTools.map((tool) => (
                        <div
                          key={tool.id}
                          className="p-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-white truncate block">
                              {tool.name}
                            </span>
                            <span className="text-[10px] text-white/60 truncate block">
                              {tool.description}
                            </span>
                          </div>
                          <CheckCircle2 size={13} className="text-white shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Human-in-the-Loop Escalation & Full Autonomy ("Machine Mode") Modal (Pure Monochrome) */}
      <AnimatePresence>
        {pendingBlocker && !pendingBlocker.resolved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl bg-[#070708] border border-white/25 shadow-[0_24px_80px_rgba(0,0,0,0.95)] p-5 text-white flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/25 flex items-center justify-center shrink-0">
                    <Lock size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.blockerTitle}</h3>
                    <p className="text-xs text-white/60">{t.blockerSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingBlocker(null)}
                  className="text-white/50 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-black/90 border border-white/15 flex flex-col gap-1.5 text-xs">
                <span className="font-mono text-[11px] text-white font-bold">
                  {pendingBlocker.stepTitle}
                </span>
                <p className="text-white/85 leading-relaxed">{pendingBlocker.reason}</p>
                <span className="font-mono text-[10px] text-white/50 truncate">
                  Target URL: {pendingBlocker.targetUrl}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleApproveMachineModeFromBlocker}
                  className="h-10 px-4 rounded-xl bg-white text-[#050505] hover:bg-white/90 font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.3)]"
                >
                  <Zap size={14} />
                  <span className="truncate">{t.blockerApproveMachineMode}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCompleteUserLoginStep}
                  className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span className="truncate">{t.blockerCompleteLogin}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
