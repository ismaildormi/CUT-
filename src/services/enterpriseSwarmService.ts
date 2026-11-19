import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export type SwarmAgentId =
  | 'atlas-ceo'
  | 'nova-research'
  | 'codex-engineer'
  | 'titan-os'
  | 'aegis-qa';

export type SwarmAgentStateType =
  | 'idle'
  | 'planning'
  | 'researching'
  | 'coding'
  | 'testing'
  | 'healing'
  | 'completed';

export type VirtualDesktopId = 'd1-3d' | 'd2-browser' | 'd3-masterplan' | 'd4-workspace';

export interface SwarmCompanyAgent {
  id: SwarmAgentId;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  state: SwarmAgentStateType;
  semanticColor: string;
  x: number;
  y: number;
  targetWindow: string;
  currentTask: string;
  thoughtBubble: string;
  progress: number;
  completedTasksCount: number;
  lastUpdated: number;
}

export interface InterAgentMessage {
  id: string;
  fromId: SwarmAgentId;
  fromName: string;
  toId: SwarmAgentId | 'all' | 'owner';
  toName: string;
  content: string;
  kind: 'plan' | 'research' | 'code' | 'os_exec' | 'qa_alert' | 'self_heal' | 'report';
  url?: string;
  artifactPath?: string;
  timestamp: string;
}

export interface WebSearchResultItem {
  id: string;
  source: string;
  title: string;
  snippet: string;
  url: string;
  score?: string;
}

export interface AdversarialCritiqueDimensionClient {
  id: string;
  nameAr: string;
  nameEn: string;
  initialScore: number;
  postRemediationScore: number;
  critiqueFindingAr: string;
  critiqueFindingEn: string;
  autonomousRemediationAr: string;
  autonomousRemediationEn: string;
  verifiedBySource: string;
  zeroFlawsRemaining: boolean;
}

export interface AdversarialCritiqueReportClient {
  id: string;
  timestamp: string;
  targetObjective: string;
  overallScoreBefore: number;
  overallScoreAfter: number;
  zeroFlawEquilibrium: boolean;
  hyperEvolutionBoostApplied: number;
  effectivePowerMultiplier: number;
  totalCosmicSourcesActive: number;
  totalProStyleVaultsActive: number;
  mouseAgentsVerifiedCount: number;
  dimensions: AdversarialCritiqueDimensionClient[];
  executiveSummaryAr: string;
  executiveSummaryEn: string;
}

export interface CompoundingPowerState {
  bootGeneration: number;
  powerMultiplier: number;
  hyperEvolutionBoost?: number;
  effectivePowerMultiplier?: number;
  selfCritiqueScore?: number;
  critiqueCyclesCompleted?: number;
  zeroFlawEquilibrium?: boolean;
  activeSourceConnectorsCount: number;
  totalCatalogSources: number;
  proStyleBlueprintsCount?: number;
  zeroWasteSavingsPercent?: number;
  cacheHitsCount?: number;
  parallelFanoutLimit: number;
  collectiveFactsCount: number;
  totalProjectsAmplified: number;
  lastBootTimestamp: string;
}

export interface UniversalSourceConnectorClient {
  id: string;
  name: string;
  category: string;
  endpointPattern: string;
  providesWhatAr: string;
  providesWhatEn: string;
  assignedAgents: string[];
  zeroKeyRequired: boolean;
  descriptionAr: string;
  descriptionEn: string;
}

export interface ProStyleBlueprintClient {
  id: string;
  nameEn: string;
  nameAr: string;
  archetype: string;
  bestForKeywords: string[];
  designTokens: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accentPrimary: string;
    borderToken: string;
    fontHeading: string;
    fontSans: string;
    fontMono: string;
    motionSpring: string;
  };
  tailwindRecipe: string;
  productionCodeTemplate: string;
}

export interface CosmicVerificationReport {
  verified: boolean;
  timestamp: string;
  totalCosmicSources: number;
  totalProStyleBlueprints: number;
  zeroKeyCompliance: boolean;
  routeTest: {
    query: string;
    matchedCategories: string[];
    skippedSourcesCount: number;
    estimatedTokenSavingsPercent: number;
    routingLatencyMs: number;
    cacheHit: boolean;
  };
  harvestedFactsCount: number;
  matchedStyleBlueprint: ProStyleBlueprintClient;
  modelInstructionManifestPreview: string;
}

export interface ExtractedProjectValue {
  id: string;
  key: string;
  value: string;
  source: string;
  agentId: SwarmAgentId;
  verified: boolean;
}

export interface MasterPlanPhase {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string;
  assignedAgentId: SwarmAgentId;
  assignedAgentName: string;
  status: 'pending' | 'running' | 'completed' | 'healed' | 'awaiting_user';
  progress: number;
  detail: string;
  artifactOrUrl?: string;
}

export interface MasterPlanRecord {
  id: string;
  projectTitle: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
  cloudSynced: boolean;
  machineModeActive: boolean;
  compoundingGeneration?: number;
  compoundingMultiplier?: number;
  universalSourcesActive?: number;
  phases: MasterPlanPhase[];
  extractedValues: ExtractedProjectValue[];
  synthesizedCodeSnippet: string;
}

export interface LiveBrowserViewportState {
  url: string;
  title: string;
  content: string;
  scrollY: number;
  lastActionByAgent: string;
  requiresAuth: boolean;
  authServiceTitle?: string;
  updatedAt: string;
}

export interface HumanActionBlocker {
  id: string;
  projectId: string;
  stepTitle: string;
  reason: string;
  targetUrl: string;
  agentId: SwarmAgentId;
  resolved: boolean;
  createdAt: string;
}

export interface SelfBuiltTool {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  code: string;
  language: 'javascript' | 'python' | 'shell';
  usageExample: string;
  createdAt: string;
  executionCount: number;
}

export interface CompanyProjectState {
  id: string;
  title: string;
  prompt: string;
  status: 'idle' | 'running' | 'self_healing' | 'awaiting_user' | 'completed';
  overallProgress: number;
  startedAt: string;
  completedAt?: string;
  filesCreated: string[];
  webSourcesConsulted: WebSearchResultItem[];
  toolsBuilt: string[];
  selfHealedCount: number;
  summaryAr: string;
  summaryEn?: string;
  masterPlan?: MasterPlanRecord;
}

export interface SwarmCompanySnapshot {
  roster: SwarmCompanyAgent[];
  commsLog: InterAgentMessage[];
  selfTools: SelfBuiltTool[];
  activeProject: CompanyProjectState | null;
  projectHistory: CompanyProjectState[];
  machineMode: boolean;
  activeDesktop: VirtualDesktopId;
  liveBrowser: LiveBrowserViewportState;
  pendingBlocker: HumanActionBlocker | null;
  compoundingPower?: CompoundingPowerState;
  universalSourcesCatalogCount?: number;
  universalSourcesCatalog?: UniversalSourceConnectorClient[];
  proStyleBlueprints?: ProStyleBlueprintClient[];
  zeroWasteManifest?: string;
  selfCritiqueReport?: AdversarialCritiqueReportClient;
}

export interface LiveStatusReportResponse {
  spokenReportAr: string;
  spokenReportEn?: string;
  overallProgress: number;
  activeProject: CompanyProjectState | null;
  agentBreakdown: Array<{
    id: SwarmAgentId;
    nameAr: string;
    nameEn?: string;
    state: SwarmAgentStateType;
    progress: number;
    currentTask: string;
    completedTasksCount: number;
  }>;
}

/**
 * Checks whether a user prompt is asking for status report ("فين وصلو؟" / "status report")
 */
export function isStatusInquiryCommand(text: string): boolean {
  const lower = String(text || '').trim().toLowerCase();
  const patterns = [
    'فين وصلو',
    'فين وصلتو',
    'شنو دارو',
    'اش دارو',
    'اش درتو',
    'واش ساليتو',
    'فين وصل المشروع',
    'اعطني تقرير',
    'تقرير الوكلاء',
    'where are they',
    'what did they do',
    'swarm status',
    'status report',
    'rapport',
    'informe',
  ];
  return patterns.some((p) => lower.includes(p));
}

/**
 * Parses natural voice/text commands for Master Plan, Virtual Desktops, Browser Scrolling, and Machine Mode
 */
export function parseAutonomousVoiceDirective(text: string): {
  type: 'master_plan' | 'switch_desktop' | 'browser_navigate' | 'browser_scroll' | 'machine_mode' | null;
  desktopId?: VirtualDesktopId;
  urlOrQuery?: string;
  scrollDelta?: number;
  machineMode?: boolean;
} {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();

  // 1. Master Plan request
  if (
    lower.includes('master plan') ||
    lower.includes('ماستر بلان') ||
    lower.includes('ماستر بلين') ||
    lower.includes('خطة المشروع') ||
    lower.includes('الخطة الرئيسية') ||
    lower.includes('وريني الخطة')
  ) {
    return { type: 'master_plan', desktopId: 'd3-masterplan' };
  }

  // 2. Machine Mode / Full Autonomy toggle
  if (
    lower.includes('machine mode') ||
    lower.includes('full autonomy') ||
    lower.includes('ماكينة تنفيذ') ||
    lower.includes('مكينة تنفيد') ||
    lower.includes('تفويض كامل') ||
    lower.includes('افعل اي شيء') ||
    lower.includes('دير كلشي')
  ) {
    const turnOff = lower.includes('off') || lower.includes('ايقاف') || lower.includes('وقف');
    return { type: 'machine_mode', machineMode: !turnOff };
  }

  // 3. Browser Scroll Up / Down
  if (
    lower.includes('scroll down') ||
    lower.includes('هبط الصفحة') ||
    lower.includes('حرك لتحت') ||
    lower.includes('انزل في الصفحة')
  ) {
    return { type: 'browser_scroll', scrollDelta: 360 };
  }
  if (
    lower.includes('scroll up') ||
    lower.includes('طلع الصفحة') ||
    lower.includes('حرك لفوق') ||
    lower.includes('اصعد في الصفحة')
  ) {
    return { type: 'browser_scroll', scrollDelta: -360 };
  }

  // 4. Switch Virtual Desktops
  if (
    lower.includes('desktop 1') ||
    lower.includes('ديسكتوب 1') ||
    lower.includes('الديسكتوب الاول') ||
    lower.includes('3d core')
  ) {
    return { type: 'switch_desktop', desktopId: 'd1-3d' };
  }
  if (
    lower.includes('desktop 2') ||
    lower.includes('ديسكتوب 2') ||
    lower.includes('الديسكتوب الثاني') ||
    lower.includes('live browser') ||
    lower.includes('المتصفح الحي')
  ) {
    return { type: 'switch_desktop', desktopId: 'd2-browser' };
  }
  if (
    lower.includes('desktop 3') ||
    lower.includes('ديسكتوب 3') ||
    lower.includes('الديسكتوب الثالث')
  ) {
    return { type: 'switch_desktop', desktopId: 'd3-masterplan' };
  }
  if (
    lower.includes('desktop 4') ||
    lower.includes('ديسكتوب 4') ||
    lower.includes('الديسكتوب الرابع') ||
    lower.includes('code & cloud')
  ) {
    return { type: 'switch_desktop', desktopId: 'd4-workspace' };
  }

  // 5. Open / Display a Web Page
  const pageMatch = raw.match(
    /(?:open page|go to|navigate to|عرض صفحة|افتح صفحة|ادخل لصفحة|افتح موقع)\s+(.+)/i
  );
  if (pageMatch && pageMatch[1]) {
    return {
      type: 'browser_navigate',
      urlOrQuery: pageMatch[1].trim(),
      desktopId: 'd2-browser',
    };
  }

  return { type: null };
}

/**
 * Animates the 5 physical smart cursors across the screen during project execution
 */
export function dispatchFiveCursorsChoreography(
  stage: 'start' | 'research' | 'code' | 'heal' | 'complete',
  promptLabel = ''
) {
  if (typeof window === 'undefined') return;
  const vw = window.innerWidth || 1280;
  const vh = window.innerHeight || 800;

  const emitCursor = (
    agentId: SwarmAgentId,
    name: string,
    role: string,
    color: string,
    x: number,
    y: number,
    action: string,
    currentTask: string,
    progress: number
  ) => {
    window.dispatchEvent(
      new CustomEvent('nevea:agent-cursor-telemetry', {
        detail: {
          agentId,
          id: agentId,
          name,
          role,
          color,
          x: Math.round(x),
          y: Math.round(y),
          action,
          status: action,
          currentTask,
          progress,
        },
      })
    );
  };

  if (stage === 'start') {
    emitCursor(
      'atlas-ceo',
      'Atlas CEO',
      'Master Plan',
      '#FFFFFF',
      vw * 0.28,
      vh * 0.22,
      'moving',
      `Master Plan: ${promptLabel.slice(0, 32)}`,
      35
    );
    emitCursor(
      'nova-research',
      'Nova Search',
      'Google Grounding',
      '#D97706',
      vw * 0.48,
      vh * 0.26,
      'reading',
      'Google Search + Wikipedia + GitHub + StackOverflow',
      55
    );
    emitCursor(
      'codex-engineer',
      'Codex AI',
      'Code & Tooling',
      '#16A34A',
      vw * 0.36,
      vh * 0.52,
      'typing',
      'Synthesizing code & building self-tool',
      70
    );
    emitCursor(
      'titan-os',
      'Titan OS',
      'Multi-Desktop',
      '#FFFFFF',
      vw * 0.62,
      vh * 0.44,
      'clicking',
      'Controlling Desktops & Live Browser',
      80
    );
    emitCursor(
      'aegis-qa',
      'Aegis QA',
      'Machine Self-Heal',
      '#DC2626',
      vw * 0.52,
      vh * 0.66,
      'generating',
      'Self-Healing & QA Verification',
      90
    );
  } else if (stage === 'complete') {
    const docks: Array<{ id: SwarmAgentId; name: string; role: string; color: string; y: number }> = [
      { id: 'atlas-ceo', name: 'Atlas CEO', role: 'Master Plan', color: '#FFFFFF', y: 120 },
      { id: 'nova-research', name: 'Nova Search', role: 'Google Grounding', color: '#D97706', y: 185 },
      { id: 'codex-engineer', name: 'Codex AI', role: 'Code & Tooling', color: '#16A34A', y: 250 },
      { id: 'titan-os', name: 'Titan OS', role: 'Multi-Desktop', color: '#FFFFFF', y: 315 },
      { id: 'aegis-qa', name: 'Aegis QA', role: 'Self-Heal', color: '#16A34A', y: 380 },
    ];
    docks.forEach((d) => {
      emitCursor(d.id, d.name, d.role, d.color, 36, d.y, 'idle', '100% Complete', 100);
    });
  }
}

export async function syncSwarmProjectToFirestore(project: CompanyProjectState): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = project.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  const path = `users/${user.uid}/swarm_projects/${safeId}`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'swarm_projects', safeId), {
      userId: user.uid,
      title: (project.title || 'Autonomous Project').slice(0, 200),
      prompt: (project.prompt || 'Project').slice(0, 2000),
      status: project.status === 'awaiting_user' ? 'running' : project.status,
      overallProgress: Math.min(100, Math.max(0, Math.round(project.overallProgress))),
      summaryAr: (project.summaryAr || project.summaryEn || 'Completed').slice(0, 4000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncSwarmToolToFirestore(tool: SelfBuiltTool): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = tool.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  const path = `users/${user.uid}/swarm_tools/${safeId}`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'swarm_tools', safeId), {
      userId: user.uid,
      name: (tool.name || tool.id).slice(0, 120),
      description: (tool.description || 'Self-built tool').slice(0, 1000),
      code: (tool.code || '// code').slice(0, 8000),
      createdBy: (tool.createdBy || 'Codex').slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchSwarmCompanyState(): Promise<SwarmCompanySnapshot | null> {
  try {
    const res = await fetch('/api/company/state');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

let bootAmplifiedInSession = false;

/**
 * Triggers the Compounding Boot Multiplier on project load so active sources,
 * parallel fan-out, and swarm intelligence double/compound on every load across all users.
 */
export async function amplifySwarmBootPower(): Promise<CompoundingPowerState | null> {
  if (bootAmplifiedInSession) {
    const snap = await fetchSwarmCompanyState();
    return snap?.compoundingPower || null;
  }
  bootAmplifiedInSession = true;

  let localGen = 1;
  try {
    const saved = Number(localStorage.getItem('nevea_compounding_generation') || '1');
    if (Number.isFinite(saved) && saved >= 1) {
      localGen = saved;
    }
  } catch {}

  try {
    const res = await fetch('/api/company/boot-amplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientGeneration: localGen }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const comp: CompoundingPowerState | undefined = data?.compoundingPower;
    if (comp) {
      try {
        localStorage.setItem('nevea_compounding_generation', String(comp.bootGeneration));
      } catch {}

      const user = auth.currentUser;
      if (user && user.emailVerified) {
        const memPath = `users/${user.uid}/memories/compounding_power_state`;
        setDoc(doc(db, 'users', user.uid, 'memories', 'compounding_power_state'), {
          userId: user.uid,
          key: 'compounding_power_state',
          content: JSON.stringify({
            bootGeneration: comp.bootGeneration,
            powerMultiplier: comp.powerMultiplier,
            activeSources: comp.totalCatalogSources,
            collectiveFactsCount: comp.collectiveFactsCount,
          }).slice(0, 1900),
          createdAt: serverTimestamp(),
        }).catch((err) => {
          try {
            handleFirestoreError(err, OperationType.WRITE, memPath);
          } catch {}
        });
      }
      return comp;
    }
    return null;
  } catch {
    return null;
  }
}

export async function executeSwarmCompanyProject(prompt: string): Promise<{
  project: CompanyProjectState;
  reportAr: string;
  reportEn?: string;
  roster: SwarmCompanyAgent[];
  comms: InterAgentMessage[];
  liveBrowser?: LiveBrowserViewportState;
  pendingBlocker?: HumanActionBlocker | null;
} | null> {
  dispatchFiveCursorsChoreography('start', prompt);
  try {
    const res = await fetch('/api/company/execute-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.project) {
      syncSwarmProjectToFirestore(data.project).catch(() => {});
    }
    setTimeout(() => {
      dispatchFiveCursorsChoreography('complete', prompt);
    }, 1800);
    return data;
  } catch {
    dispatchFiveCursorsChoreography('complete', prompt);
    return null;
  }
}

export async function fetchLiveSwarmStatusReport(): Promise<LiveStatusReportResponse | null> {
  try {
    const res = await fetch('/api/company/status-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function performOpenWebSearch(query: string): Promise<WebSearchResultItem[]> {
  try {
    const res = await fetch('/api/company/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function fetchLiveWebPageContent(
  url: string,
  scrollDelta?: number
): Promise<LiveBrowserViewportState | null> {
  try {
    const res = await fetch('/api/company/fetch-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, scrollDelta }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function toggleAutonomousMachineMode(enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/company/machine-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) return enabled;
    const data = await res.json();
    return Boolean(data?.machineMode);
  } catch {
    return enabled;
  }
}

export async function switchVirtualDesktopOnServer(desktopId: VirtualDesktopId): Promise<VirtualDesktopId> {
  try {
    await fetch('/api/company/desktop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desktopId }),
    });
    return desktopId;
  } catch {
    return desktopId;
  }
}

export async function resolveHumanActionBlocker(note = 'user_completed_login'): Promise<boolean> {
  try {
    const res = await fetch('/api/company/resolve-blocker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createDynamicSelfTool(params: {
  name: string;
  description: string;
  code?: string;
  language?: 'javascript' | 'python' | 'shell';
}): Promise<SelfBuiltTool | null> {
  try {
    const res = await fetch('/api/company/create-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.tool) {
      syncSwarmToolToFirestore(data.tool).catch(() => {});
      window.dispatchEvent(
        new CustomEvent('nevea:agent-spawned', {
          detail: {
            id: data.tool.id,
            name: data.tool.name,
            role: 'Self-Built Unified Tool',
            color: '#16A34A',
          },
        })
      );
      return data.tool;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyAllCosmicAdditionsClient(
  sampleQuery = 'Build an Autonomous 3D WebGL AI SaaS Analytics Studio'
): Promise<CosmicVerificationReport | null> {
  try {
    const res = await fetch('/api/company/cosmic-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sampleQuery }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function runSelfCritiqueAndEvolveClient(
  objective = 'NOVA Studio Global Multi-Agent OS & 3D GPGPU Companion'
): Promise<{
  critiqueReport: AdversarialCritiqueReportClient;
  compoundingPower: CompoundingPowerState;
  roster: SwarmCompanyAgent[];
} | null> {
  try {
    const res = await fetch('/api/company/critique-and-evolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function dispatchMouseAgentsMissionClient(
  missionType = 'full_choreography',
  targetSelector = '[data-agent-target="companion-canvas"]',
  performClick = false
): Promise<{
  success: boolean;
  missionType: string;
  targetSelector: string;
  activeCursorsCount: number;
  roster: SwarmCompanyAgent[];
} | null> {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nevea:mouse-agents-choreography', {
        detail: {
          missionType,
          targetSelector,
          performClick,
          label: `Swarm Mouse Mission → ${targetSelector.replace(/\[data-agent-target="|"]/g, '')}`,
        },
      })
    );
  }
  dispatchFiveCursorsChoreography('start', `Mouse Mission: ${missionType}`);

  try {
    const res = await fetch('/api/company/mouse-agents/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionType, targetSelector }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function togglePinAllMouseCursorsClient(pinAll?: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('nevea:mouse-agents-pin-toggle', {
      detail: typeof pinAll === 'boolean' ? { pinAll } : {},
    })
  );
}

export async function fetchCloudFleetStatusClient(): Promise<any | null> {
  try {
    const res = await fetch('/api/fleet/status');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.fleet || null;
  } catch {
    return null;
  }
}

export async function offloadTaskToCloudFleetClient(
  type: 'code_sandbox' | 'web_scrape',
  payload: { language?: string; code?: string; url?: string }
): Promise<any | null> {
  try {
    const res = await fetch('/api/fleet/offload-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}



