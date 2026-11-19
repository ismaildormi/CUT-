import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanionViewport, CreatureHandle } from './components/CompanionViewport';
import { GlassmorphismPanel } from './components/GlassmorphismPanel';
import { PermissionModal, PermissionRequest } from './components/PermissionModal';
import { SetupWizard } from './components/SetupWizard';
import { NovaGenesisScreen } from './components/NovaGenesisScreen';
import { GhostCursor } from './components/GhostCursor';
import { CollaborationCanvas } from './components/CollaborationCanvas';
import { SwarmCompanyHUD, ConsoleTabId } from './components/SwarmCompanyHUD';
import { SpeechBubble } from './components/SpeechBubble';
import { CompanionAIEngine } from './services/companionAI';
import { globalAutonomousEngine } from './services/autonomousBehavior';
import { DesktopActionResult, executeDesktopCommand } from './services/mockBackend';
import {
  VirtualDesktopId,
  toggleAutonomousMachineMode,
  switchVirtualDesktopOnServer,
} from './services/enterpriseSwarmService';
import {
  LanguageProvider,
  useLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from './i18n/translations';
import { playCuteSound } from './services/audioSynth';
import { selfHealingDiagnosticService } from './services/selfHealingDiagnosticService';
import { AccountAuthModal } from './components/AccountAuthModal';
import { SovereignEmpireOS } from './components/SovereignEmpireOS';
import { DesktopDownloadCenterModal } from './components/DesktopDownloadCenterModal';
import {
  NeveaAccountProfile,
  getCachedNeveaAccount,
  syncNeveaAccountSession,
  subscribeToNeveaAccount,
  downloadRequiredValuesPdfClient,
} from './services/accountAndPdfService';
import { recordHybridChatTurn } from './services/supabaseClient';
import {
  Mic,
  Send,
  Globe,
  Zap,
  Layers,
  Cpu,
  User,
  Crown,
  LayoutGrid,
  Download,
  Sparkles,
  Sliders,
} from 'lucide-react';

const springBtn = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 24,
};

function looksLikeCode(text: string): boolean {
  if (!text || text.trim().length < 12) return false;
  const codePatterns = [
    /\b(function|const|let|var|import|export|return|class|interface|type|async|await|def|elif|from)\b/,
    /[{};()=>]/,
    /<\/?[a-zA-Z][\w-]*(?:\s+[^>]*)?>/,
    /\bconsole\.log\b|\bprint\(/,
  ];
  let matches = 0;
  for (const pat of codePatterns) {
    if (pat.test(text)) matches++;
  }
  return matches >= 2;
}

const AppInner: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const isAr = lang === 'ar';

  const [creatureHandle, setCreatureHandle] = useState<CreatureHandle | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Hi! I'm HEYUKA, your sentient 3D companion. Speak or type any command!"
  );
  const [companionState, setCompanionState] = useState<string>('idle');
  const [isChaosEnabled, setIsChaosEnabled] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeEnv, setActiveEnv] = useState<string>('midnight');
  const [osLogs, setOsLogs] = useState<DesktopActionResult[]>([]);
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [commandInput, setCommandInput] = useState<string>('');
  const [isSendingCommand, setIsSendingCommand] = useState<boolean>(false);
  const [isCinemaAutoHide] = useState<boolean>(false);
  const [isHudIdle, setIsHudIdle] = useState<boolean>(false);
  const [isCommandFocused, setIsCommandFocused] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Virtual Desktop, Unified Bottom Console & Autonomous Machine Mode State
  const [activeDesktop, setActiveDesktop] = useState<VirtualDesktopId>('d1-3d');
  const [machineMode, setMachineMode] = useState<boolean>(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<ConsoleTabId>('blueprint');
  const [currentAccount, setCurrentAccount] = useState<NeveaAccountProfile | null>(() =>
    getCachedNeveaAccount()
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [activeAppMode, setActiveAppMode] = useState<
    'companion_studio' | 'split_unified' | 'sovereign_owner_os'
  >('companion_studio');
  const [previewCommunityUserMode, setPreviewCommunityUserMode] = useState<boolean>(false);

  // STRICT OWNER UI ISOLATION:
  // Owner controls are strictly hidden unless authenticated as the Founder Sovereign Owner.
  const isOwnerUiVisible =
    !previewCommunityUserMode && Boolean(currentAccount && currentAccount.isSovereignOwner);

  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);
  const [showGenesisScreen, setShowGenesisScreen] = useState<boolean>(false);

  const handleGenesisComplete = useCallback(() => {
    setShowGenesisScreen(false);
  }, []);

  // Speech Bubble, Drag & Drop File Overlay, Clipboard Code Watcher
  const [speechBubble, setSpeechBubble] = useState<{
    text: string | null;
    key: number;
    actionLabel?: string | null;
    onAction?: () => void;
  }>({ text: null, key: 0 });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const lastClipboardRef = useRef<string>('');
  const aiEngineRef = useRef<CompanionAIEngine | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  const triggerSpeechBubble = useCallback(
    (text: string, actionLabel?: string | null, onAction?: () => void) => {
      setSpeechBubble({
        text,
        key: Date.now() + Math.random(),
        actionLabel: actionLabel || null,
        onAction,
      });
    },
    []
  );

  // Expose global permission request gate for destructive OS tools
  useEffect(() => {
    (window as any).neveaRequestPermission = (toolName: string, details: string) => {
      return new Promise<boolean>((resolve) => {
        setPendingPermission({ toolName, details, resolve });
      });
    };
  }, []);

  const handleAddOSLog = useCallback((log: DesktopActionResult) => {
    setOsLogs((prev) => [log, ...prev.slice(0, 24)]);
    setStatusMessage(log.message);
  }, []);

  // Start periodic Self-Healing Diagnostic Service
  useEffect(() => {
    selfHealingDiagnosticService.startPeriodicAudit(25000);
    const onDiagLog = (e: Event) => {
      const detail = (e as CustomEvent).detail as DesktopActionResult | undefined;
      if (detail && detail.message) {
        handleAddOSLog(detail);
      }
    };
    window.addEventListener('nevea:diagnostic-os-log', onDiagLog);
    return () => {
      window.removeEventListener('nevea:diagnostic-os-log', onDiagLog);
      selfHealingDiagnosticService.stopPeriodicAudit();
    };
  }, [handleAddOSLog]);

  // Sync Account Session & Listen for Global Account/PDF Triggers
  useEffect(() => {
    syncNeveaAccountSession().then((acc) => {
      setCurrentAccount(acc);
      if (!acc) {
        setActiveAppMode('companion_studio');
      }
    });
    const unsub = subscribeToNeveaAccount((acc) => {
      setCurrentAccount(acc);
      if (!acc) {
        setActiveAppMode('companion_studio');
      }
    });
    const onOpenAccountModal = () => {
      playCuteSound('boop');
      setIsAccountModalOpen(true);
    };
    const onOpenSovereignOS = () => {
      playCuteSound('yiii');
      setActiveAppMode('sovereign_owner_os');
    };
    const onDownloadPdf = async () => {
      playCuteSound('yiii');
      const res = await downloadRequiredValuesPdfClient();
      if (res.success) {
        triggerSpeechBubble(
          isAr
            ? `تم تحميل ملف القيم والمصادر (${res.fileName}) بنجاح!`
            : `Downloaded ${res.fileName} (${Math.round(res.bytes / 1024)} KB) successfully!`
        );
      }
    };
    window.addEventListener('nevea:open-account-modal', onOpenAccountModal);
    window.addEventListener('nevea:open-sovereign-os', onOpenSovereignOS);
    window.addEventListener('nevea:download-values-pdf', onDownloadPdf);
    return () => {
      unsub();
      window.removeEventListener('nevea:open-account-modal', onOpenAccountModal);
      window.removeEventListener('nevea:open-sovereign-os', onOpenSovereignOS);
      window.removeEventListener('nevea:download-values-pdf', onDownloadPdf);
    };
  }, [isAr, triggerSpeechBubble]);

  const handleCreatureReady = useCallback(
    (handle: CreatureHandle) => {
      setCreatureHandle(handle);

      globalAutonomousEngine.attach({
        creature: handle.creature,
        setFurColor: handle.setFurColor,
        setEnvironment: (envId: string) => {
          setActiveEnv(envId);
          handle.setEnvironment(envId);
        },
        onEvent: ({ description }) => {
          setStatusMessage(description);
          triggerSpeechBubble(description);
        },
      });

      const engine = new CompanionAIEngine({
        creature: handle.creature,
        onStatusChange: ({ state, message }: { state: string; message: string }) => {
          setCompanionState(state);
          if (message) setStatusMessage(message);
        },
        onClientAction: (action: any) => {
          if (action.type === 'fur_color' && action.palette) {
            handle.setFurColor(action.palette.base, action.palette.tip);
          } else if (action.type === 'environment' && action.envId) {
            setActiveEnv(action.envId);
            handle.setEnvironment(action.envId);
          } else if (action.type === 'trigger_flight') {
            handle.triggerFlight(action.active ?? true, 14);
          } else if (action.type === 'change_size') {
            handle.changeSize(action.size ?? 'giant');
          } else if (action.type === 'catch_duck') {
            handle.catchDuck();
          } else if (action.type === 'press_ui_button') {
            handle.triggerButtonPress({ x: 1.05, y: 0.35 });
          }
        },
        onOSActionLog: (log: DesktopActionResult) => {
          handleAddOSLog(log);
        },
        onSpeak: (spokenText: string) => {
          triggerSpeechBubble(spokenText);
        },
      });
      aiEngineRef.current = engine;
    },
    [handleAddOSLog, triggerSpeechBubble]
  );

  const handleSendTurn = useCallback(async (prompt: string, includeScreen = false) => {
    window.dispatchEvent(
      new CustomEvent('nevea:voice-or-chat-command', { detail: { command: prompt } })
    );
    fetch('/api/collaboration/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: prompt }),
    }).catch(() => {});

    if (!aiEngineRef.current) return;
    const result: any = await aiEngineRef.current.sendTurn({ prompt, includeScreen });
    recordHybridChatTurn(
      prompt,
      String(result?.spoken || result?.text || 'Command executed')
    ).catch(() => {});
    return result;
  }, []);

  const handleToggleVoice = useCallback(() => {
    if (aiEngineRef.current) {
      aiEngineRef.current.toggleListening();
    }
  }, []);

  const handleCommandBarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed || isSendingCommand) return;
    setCommandInput('');
    setIsSendingCommand(true);
    playCuteSound('boop');
    try {
      const needsVision = /screen|window|desktop|look|see|inspect|canvas/i.test(trimmed);
      await handleSendTurn(trimmed, needsVision);
    } finally {
      setIsSendingCommand(false);
    }
  };

  const handleSelectDesktop = useCallback((desktopId: VirtualDesktopId) => {
    playCuteSound('boop');
    setActiveDesktop(desktopId);
    switchVirtualDesktopOnServer(desktopId);
  }, []);

  const handleToggleMachineMode = useCallback((nextEnabled?: boolean) => {
    playCuteSound('yiii');
    setMachineMode((prev) => {
      const target = nextEnabled !== undefined ? nextEnabled : !prev;
      toggleAutonomousMachineMode(target);
      return target;
    });
  }, []);

  // CLIPBOARD WATCHER: Listen to window 'focus' event & detect copied code
  useEffect(() => {
    const checkClipboardForCode = async () => {
      try {
        let clipText = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          try {
            clipText = await navigator.clipboard.readText();
          } catch {}
        }
        if (!clipText) {
          const res = await executeDesktopCommand({ action: 'read_clipboard', params: {} });
          clipText = res?.data?.content || '';
        }

        const trimmed = (clipText || '').trim();
        if (trimmed && trimmed !== lastClipboardRef.current && looksLikeCode(trimmed)) {
          lastClipboardRef.current = trimmed;
          playCuteSound('boop');
          const promptMsg = 'I see you copied some code. Want me to explain it?';
          setStatusMessage(promptMsg);
          triggerSpeechBubble(promptMsg, 'Explain Code', () => {
            handleSendTurn(
              `Please explain this code I just copied:\n\n\`\`\`\n${trimmed.slice(0, 3000)}\n\`\`\``,
              false
            );
          });
        }
      } catch {}
    };

    window.addEventListener('focus', checkClipboardForCode);
    return () => {
      window.removeEventListener('focus', checkClipboardForCode);
    };
  }, [handleSendTurn, triggerSpeechBubble]);

  // GLOBAL HOTKEY (Alt+Space for Voice, Cmd/Ctrl+K to focus Command Bar)
  useEffect(() => {
    const api = (window as any).electronAPI;
    let unsubscribe: (() => void) | undefined;
    if (api && typeof api.onTriggerVoice === 'function') {
      unsubscribe = api.onTriggerVoice(() => {
        playCuteSound('yiii');
        handleToggleVoice();
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        playCuteSound('yiii');
        handleToggleVoice();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsHudIdle(false);
        commandInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (unsubscribe) unsubscribe();
    };
  }, [handleToggleVoice]);

  // CINEMATIC MONOCHROME AUTO-HIDE HUD
  useEffect(() => {
    const resetIdleTimer = () => {
      setIsHudIdle(false);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (!isCinemaAutoHide || isDrawerOpen || isCommandFocused || Boolean(commandInput.trim())) {
        return;
      }
      idleTimerRef.current = setTimeout(() => {
        setIsHudIdle(true);
      }, 4000);
    };

    resetIdleTimer();
    window.addEventListener('mousemove', resetIdleTimer, { passive: true });
    window.addEventListener('mousedown', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    window.addEventListener('touchstart', resetIdleTimer, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
    };
  }, [isCinemaAutoHide, isDrawerOpen, isCommandFocused, commandInput]);

  const isCinemaHidden = isCinemaAutoHide && isHudIdle && !isDrawerOpen && !isCommandFocused;

  // DRAG & DROP FILE OVERLAY
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const filePath = (file as any).path || file.name;
    playCuteSound('yiii');
    creatureHandle?.triggerBoop(1.1);
    setStatusMessage(`Reading dropped file "${file.name}"...`);

    let extractedContent = '';
    try {
      const osRead = await executeDesktopCommand({
        action: 'read_file',
        params: { path: filePath },
      });
      handleAddOSLog(osRead);
      if (osRead?.data?.content && !String(osRead.data.content).includes('Simulated file content')) {
        extractedContent = String(osRead.data.content);
      }
    } catch {}

    if (!extractedContent) {
      try {
        if (file.type.startsWith('image/')) {
          extractedContent = `[Dropped Image File: ${file.name} (${file.type}, ${Math.round(
            file.size / 1024
          )} KB)]`;
        } else {
          extractedContent = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => resolve(`[File: ${file.name}]`);
            reader.readAsText(file);
          });
        }
      } catch {
        extractedContent = `[File: ${file.name}]`;
      }
    }

    const snippet = extractedContent.slice(0, 4000);
    await handleSendTurn(
      `I just dropped the file "${file.name}" onto you. Here is its content:\n\n${snippet}\n\nPlease summarize this file concisely and tell me the key takeaways!`,
      file.type.startsWith('image/')
    );
  };

  const handleToggleChaos = () => {
    const next = !isChaosEnabled;
    setIsChaosEnabled(next);
    globalAutonomousEngine.setEnabled(next);
    setStatusMessage(next ? 'Autonomous personality mode enabled!' : 'Autonomous mode paused.');
  };

  const handleTriggerChaos = () => {
    globalAutonomousEngine.triggerRandomAction();
  };

  const handleSelectEnv = (envId: string) => {
    setActiveEnv(envId);
    creatureHandle?.setEnvironment(envId);
  };

  const desktopTabs: Array<{ id: VirtualDesktopId; label: string }> = [
    { id: 'd1-3d', label: t.desktop3D },
    { id: 'd2-browser', label: t.desktopBrowser },
    { id: 'd3-masterplan', label: t.desktopMasterPlan },
    { id: 'd4-workspace', label: t.desktopWorkspace },
  ];

  return (
    <main className="w-screen h-screen flex flex-row overflow-hidden bg-[#050505] text-white select-none">
      {/* LEFT / CENTER VIEWPORT (`flex-1`) — UNOBSTRUCTED CINEMATIC 3D STAGE */}
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 h-full relative min-w-0 flex flex-col justify-between overflow-hidden"
      >
        {/* Top Minimalist Glassmorphic Monochrome Header Bar (h-14) */}
        {activeAppMode !== 'sovereign_owner_os' && (
          <header
            className={`relative z-20 h-14 px-4 flex items-center justify-between gap-2 border-b border-white/10 glass-monochrome transition-all duration-150 shrink-0 ${
              isCinemaHidden
                ? 'opacity-0 -translate-y-3 pointer-events-none'
                : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}
          >
            {/* Zone 1: Brand Identity */}
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="#viewport"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveAppMode('companion_studio');
                  handleSelectDesktop('d1-3d');
                }}
                className="text-sm font-bold font-display tracking-widest text-white hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                {t.brand}
              </a>
            </div>

            {/* Zone 2: Virtual Desktops & Sovereign Mode Switcher (Strictly Owner Exclusive) */}
            {isOwnerUiVisible ? (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {/* 3-Mode Application Switcher */}
                <div
                  className="flex items-center bg-white/5 p-1 rounded-xl border border-white/15 h-9 shrink-0"
                  data-agent-target="mode-switcher"
                >
                  <button
                    type="button"
                    onClick={() => {
                      playCuteSound('boop');
                      setActiveAppMode('companion_studio');
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeAppMode === 'companion_studio'
                        ? 'bg-white text-[#050505] shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Sparkles size={11} />
                    <span>{isAr ? 'مجسم 3D' : '3D Studio'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCuteSound('boop');
                      setActiveAppMode('split_unified');
                    }}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      activeAppMode === 'split_unified'
                        ? 'bg-white text-[#050505] shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <LayoutGrid size={11} />
                    <span>{isAr ? 'تقسيم الشاشة' : 'Split View'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCuteSound('yiii');
                      setActiveAppMode('sovereign_owner_os');
                    }}
                    className="h-7 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Crown size={11} />
                    <span>{isAr ? 'نظام المالك' : 'Sovereign OS'}</span>
                  </button>
                </div>

                {/* Virtual Desktops */}
                <nav className="hidden xl:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 h-9 shrink-0">
                  {desktopTabs.map((d) => {
                    const isActive = activeDesktop === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDesktop(d.id)}
                        className={`h-7 px-2 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-white text-[#050505]'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Layers size={11} />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-xs text-white/50 truncate">
                <span>
                  {isAr
                    ? 'محاكاة الفراء التفاعلية بـ 60 إطار/ثانية والذكاء الصوتي الحي'
                    : 'Interactive 60 FPS WebGL2 Fur Physics & Live Voice Companion'}
                </span>
              </div>
            )}

            {/* Zone 3: Quick Actions & Studio Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isOwnerUiVisible && (
                <>
                  {/* Execution Engine Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleMachineMode()}
                    className={`hidden sm:inline-flex h-8 px-2.5 rounded-lg text-[11px] font-bold items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      machineMode
                        ? 'bg-white text-[#050505]'
                        : 'btn-2030-obsidian text-white/75'
                    }`}
                  >
                    <Zap size={12} className="shrink-0" />
                    <span>{machineMode ? t.machineModeOn : t.machineModeOff}</span>
                  </button>

                  {/* Master Plan & Blueprint Console Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      playCuteSound('boop');
                      setIsConsoleOpen((prev) => !prev);
                    }}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      isConsoleOpen
                        ? 'bg-white text-[#050505]'
                        : 'btn-2030-obsidian text-white/85'
                    }`}
                  >
                    <Cpu size={12} className="shrink-0" />
                    <span className="hidden lg:inline">{t.tabMasterPlan}</span>
                  </button>
                </>
              )}

              {/* Download for PC Button */}
              <button
                type="button"
                onClick={() => {
                  playCuteSound('boop');
                  setIsDownloadModalOpen(true);
                }}
                className="h-8 px-2.5 rounded-lg btn-2030-obsidian text-[11px] font-bold text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 hover:bg-white/15 transition-colors"
              >
                <Download size={12} className="shrink-0" />
                <span className="hidden sm:inline">
                  {isAr ? 'تثبيت للحاسوب' : 'Download for PC'}
                </span>
              </button>

              {/* Account Login / Register Button */}
              <button
                type="button"
                onClick={() => {
                  playCuteSound('boop');
                  setIsAccountModalOpen(true);
                }}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  currentAccount
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                    : 'btn-2030-obsidian text-white/90 hover:bg-white/15'
                }`}
              >
                <User size={12} className="shrink-0" />
                <span className="max-w-[96px] truncate">
                  {currentAccount
                    ? `@${currentAccount.username}`
                    : isAr
                    ? 'تسجيل الدخول'
                    : 'Sign In'}
                </span>
              </button>

              {/* Multi-Language Dropdown Switcher */}
              <div className="relative flex items-center h-8 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg px-2 transition-colors shrink-0">
                <Globe size={12} className="text-white/70 mr-1 shrink-0 pointer-events-none" />
                <select
                  aria-label="Select Language"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as SupportedLanguage)}
                  className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer pr-1"
                >
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <option key={item.code} value={item.code} className="bg-[#09090D] text-white">
                      {item.shortCode} · {item.nativeLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Studio Drawer Toggle */}
              <button
                type="button"
                data-agent-target="btn-toggle-drawer"
                onClick={() => {
                  playCuteSound('boop');
                  setIsDrawerOpen((prev) => !prev);
                }}
                className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  isDrawerOpen ? 'btn-2030-obsidian text-white' : 'btn-2030-primary'
                }`}
              >
                <Sliders size={13} />
                <span>{isDrawerOpen ? t.closeStudio : t.openStudio}</span>
              </button>
            </div>
          </header>
        )}

        {/* Center 3D WebGL2 / GPGPU Canvas, Split View, OR Fullscreen Sovereign Owner OS */}
        <div id="viewport" className="flex-1 w-full relative min-h-0" data-agent-target="companion-canvas">
          {previewCommunityUserMode && (
            <div className="absolute top-3 left-3 z-40">
              <button
                type="button"
                onClick={() => {
                  playCuteSound('yiii');
                  setPreviewCommunityUserMode(false);
                  setActiveAppMode('sovereign_owner_os');
                }}
                className="h-9 px-3.5 rounded-xl bg-white text-[#050505] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xl"
              >
                <Crown size={14} />
                <span>
                  {isAr
                    ? 'العودة لنظام المالك السيادي'
                    : 'Return to Sovereign Owner OS'}
                </span>
              </button>
            </div>
          )}

          {isOwnerUiVisible && activeAppMode === 'sovereign_owner_os' && (
            <div className="absolute inset-0 z-30 bg-[#09090B] flex flex-col overflow-hidden">
              <SovereignEmpireOS
                activeAccount={currentAccount}
                lang={lang}
                onToggleLanguage={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                onSwitchToCompanionStudio={() => setActiveAppMode('companion_studio')}
                onSwitchToSplitMode={() => setActiveAppMode('split_unified')}
                onOpenAuthModal={() => setIsAccountModalOpen(true)}
              />
            </div>
          )}

          {isOwnerUiVisible && activeAppMode === 'split_unified' && (
            <div className="absolute top-0 right-0 bottom-0 w-full lg:w-[55%] z-30 bg-[#09090B]/95 border-l border-white/15 flex flex-col overflow-hidden shadow-[-24px_0_60px_rgba(0,0,0,0.9)]">
              <SovereignEmpireOS
                activeAccount={currentAccount}
                lang={lang}
                onToggleLanguage={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                onSwitchToCompanionStudio={() => setActiveAppMode('companion_studio')}
                onSwitchToSplitMode={() => setActiveAppMode('sovereign_owner_os')}
                onOpenAuthModal={() => setIsAccountModalOpen(true)}
              />
            </div>
          )}

          <SpeechBubble
            text={speechBubble.text}
            triggerKey={speechBubble.key}
            actionLabel={speechBubble.actionLabel}
            onActionClick={speechBubble.onAction}
            onDismiss={() => setSpeechBubble((prev) => ({ ...prev, text: null }))}
          />

          <CompanionViewport
            onCreatureReady={handleCreatureReady}
            toneMappingExposure={0.9}
            isDragOver={isDragOver}
            companionState={companionState}
            isCinemaHidden={isCinemaHidden}
            onRadialVoice={handleToggleVoice}
            onRadialVision={() =>
              handleSendTurn('Inspect the 3D viewport and describe Mochi-Puff', true)
            }
            onRadialSettings={() => setIsDrawerOpen(true)}
          />

          {/* Slide-Up Master Plan & Blueprint Console (Owner Exclusive) */}
          {isOwnerUiVisible && activeAppMode !== 'sovereign_owner_os' && (
            <SwarmCompanyHUD
              isCinemaHidden={isCinemaHidden}
              isDrawerOpen={isDrawerOpen}
              activeDesktop={activeDesktop}
              onChangeDesktop={handleSelectDesktop}
              machineMode={machineMode}
              onToggleMachineMode={handleToggleMachineMode}
              isConsoleOpen={isConsoleOpen}
              onToggleConsole={setIsConsoleOpen}
              activeConsoleTab={activeConsoleTab}
              onSelectConsoleTab={setActiveConsoleTab}
              onSpeakReport={(spokenText) => {
                triggerSpeechBubble(spokenText);
                aiEngineRef.current?.speak(spokenText);
              }}
            />
          )}

          {/* BOTTOM FLOATING SINGLE-ROW MONOCHROME COMMAND & VOICE DOCK */}
          <form
            onSubmit={handleCommandBarSubmit}
            className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl h-14 px-2.5 rounded-2xl glass-monochrome flex items-center gap-2 transition-all duration-150 ${
              isCinemaHidden || activeAppMode === 'sovereign_owner_os'
                ? 'opacity-0 translate-y-4 pointer-events-none hidden'
                : 'opacity-100 translate-y-0 pointer-events-auto'
            }`}
          >
            {/* 1. Primary Voice Trigger Button */}
            <motion.button
              type="button"
              data-agent-target="btn-voice"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={springBtn}
              onClick={handleToggleVoice}
              title="Toggle Live Voice Control (Alt+Space)"
              className={`h-9 px-3 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                companionState === 'listening'
                  ? 'btn-2030-primary ring-2 ring-white/40'
                  : 'btn-2030-obsidian'
              }`}
            >
              <Mic size={14} strokeWidth={1.75} className="shrink-0" />
              <span>
                {companionState === 'listening' ? t.voiceButtonListening : t.voiceButtonIdle}
              </span>
            </motion.button>

            {/* 2. Prompt Input */}
            <div className="flex-1 relative flex items-center h-9 min-w-0">
              <input
                ref={commandInputRef}
                type="text"
                data-agent-target="input-command"
                value={commandInput}
                onFocus={() => setIsCommandFocused(true)}
                onBlur={() => setIsCommandFocused(false)}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={t.voicePromptPlaceholder}
                className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/10 px-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors duration-150 truncate"
              />
            </div>

            {/* 3. Execute / Send Button */}
            <motion.button
              type="submit"
              data-agent-target="btn-send"
              disabled={!commandInput.trim() || isSendingCommand}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={springBtn}
              aria-label="Execute command"
              className="h-9 px-3.5 rounded-xl btn-2030-primary font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0 whitespace-nowrap"
            >
              <Send size={13} strokeWidth={2} className="shrink-0" />
              <span>{t.sendButton}</span>
            </motion.button>
          </form>
        </div>
      </section>

      {/* RIGHT 4-TAB STUDIO DRAWER (`w-[400px]`) */}
      <GlassmorphismPanel
        creatureHandle={creatureHandle}
        onSendTurn={handleSendTurn}
        onToggleVoice={handleToggleVoice}
        statusMessage={statusMessage}
        companionState={companionState}
        isChaosEnabled={isChaosEnabled}
        onToggleChaos={handleToggleChaos}
        onTriggerChaos={handleTriggerChaos}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        osLogs={osLogs}
        onAddOSLog={handleAddOSLog}
        activeEnv={activeEnv}
        onSelectEnv={handleSelectEnv}
        isOwnerUiVisible={isOwnerUiVisible}
        lang={lang}
      />

      {/* Background Animated Ghost Cursor for Hands-Free Co-Pilot */}
      <GhostCursor />

      {/* Spatial Multi-Agent Cursors Layer */}
      <CollaborationCanvas isDrawerOpen={isDrawerOpen} isCinemaHidden={isCinemaHidden} />

      {/* Destructive Command Security Permission Gate Modal */}
      <PermissionModal
        request={pendingPermission}
        onClose={() => setPendingPermission(null)}
      />

      {/* Clerk/Linear-Grade Account Authentication Modal */}
      <AccountAuthModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentAccount={currentAccount}
        onAccountChanged={(acc) => setCurrentAccount(acc)}
        onOpenSovereignOS={() => setActiveAppMode('sovereign_owner_os')}
        lang={lang}
      />

      {/* Desktop One-Click Auto-Installer (.bat), PWA & GitHub Export Modal */}
      <DesktopDownloadCenterModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        lang={lang}
        isSovereignOwner={Boolean(currentAccount?.isSovereignOwner)}
      />

      {/* Nova Genesis Protocol Loading Screen */}
      <AnimatePresence>
        {showGenesisScreen && (
          <NovaGenesisScreen onComplete={handleGenesisComplete} />
        )}
      </AnimatePresence>

      {/* First-Launch Secure Onboarding Setup Wizard */}
      <AnimatePresence>
        {showSetupWizard && !showGenesisScreen && (
          <SetupWizard onComplete={() => setShowSetupWizard(false)} />
        )}
      </AnimatePresence>
    </main>
  );
};

export const App: React.FC = () => (
  <LanguageProvider>
    <AppInner />
  </LanguageProvider>
);

export default App;
