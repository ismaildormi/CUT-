export interface NeveaAccountProfile {
  id: string;
  username: string;
  isSovereignOwner?: boolean;
  ownerRecoveryKey?: string;
  role: string;
  roleAr?: string;
  roleEn?: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  compoundingGeneration: number;
  effectivePowerMultiplier: number;
  activeCosmicSources: number;
  activeFleetNodes: number;
  toolsSpawnedByAccount?: number;
  serversSpawnedByAccount?: number;
  quotaConsumptionUnits?: number;
  deviceFingerprintHash?: string;
  riskScore?: number;
  creativeFreedomStatus?: string;
  sessionToken: string;
}

export interface ExternalEnvCredentialClientItem {
  id: string;
  envKey: string;
  secondaryEnvKey?: string;
  providerNameEn: string;
  providerNameAr: string;
  categoryEn: string;
  categoryAr: string;
  isConfigured: boolean;
  freeQuotaEn: string;
  freeQuotaAr: string;
  portalUrl: string;
  statusNoteAr?: string;
  statusNoteEn?: string;
  latencyMs?: number;
  latencyHistoryMs?: number[];
}

export interface SovereignUnifiedSystemState {
  timestamp: string;
  sovereignArchitectureVersion: string;
  masterOwnerRecoveryKey: string;
  compoundingMetrics: {
    bootGeneration: number;
    powerMultiplier: number;
    effectivePowerMultiplier: number;
    totalCosmicSources: number;
    totalCyberDefenseSources: number;
    totalCombinedZeroKeySources: number;
    totalLoginsAcrossSystem: number;
    totalDownloadsCount?: number;
    totalToolsMultipliedLedger: number;
    totalServersMultipliedLedger: number;
    totalActiveCloudWorkerSlots: number;
    totalPooledCloudProviders: number;
    connectedCloudProvidersCount?: number;
    awaitingKeyCloudProvidersCount?: number;
    configuredExternalKeysCount?: number;
    totalExternalKeysCount?: number;
    totalQuotaConsumedUnits: number;
    estimatedLocalRamSavedMb: number;
    overallSystemRiskPercent: number;
  };
  externalCredentials?: ExternalEnvCredentialClientItem[];
  accountsLedger: Array<{
    id: string;
    username: string;
    isSovereignOwner: boolean;
    ownerRecoveryKey?: string;
    role: string;
    createdAt: string;
    lastLoginAt: string;
    loginCount: number;
    toolsSpawnedByAccount: number;
    serversSpawnedByAccount: number;
    quotaConsumptionUnits: number;
    deviceFingerprintHash: string;
    encryptedVaultPreview: string;
    riskScore: number;
    creativeFreedomStatus: string;
  }>;
  purgedHackerAccountsCount: number;
  multipliedToolsEvaluation: Array<{
    id: string;
    toolName: string;
    toolNameAr?: string;
    domain: string;
    domainAr?: string;
    baseInstances: number;
    multipliedInstances: number;
    aiQualityScore: number;
    latencyMs: number;
    latencyHistoryMs?: number[];
    consumptionUnits: number;
    status: string;
  }>;
  cloudFleetNodes: Array<{
    id: string;
    name: string;
    nameEn?: string;
    nameAr?: string;
    provider: string;
    providerEn?: string;
    providerAr?: string;
    category: string;
    zeroKeyAvailable: boolean;
    requiredEnvKey?: string;
    envKeyName?: string;
    isConfigured?: boolean;
    freeDailyQuotaHint: string;
    freeDailyQuotaEn?: string;
    freeDailyQuotaAr?: string;
    endpointUrl: string;
    healthStatus: string;
    baseWorkerSlots: number;
    activeWorkerSlots: number;
    totalTasksProcessed: number;
    latencyMs: number;
    latencyHistoryMs?: number[];
    latencyDeltaMs?: number;
    lastVerifiedAt?: string;
    statusNoteAr?: string;
    statusNoteEn?: string;
    descriptionAr: string;
    descriptionEn: string;
  }>;
  cyberDefenseSources: Array<{
    id: string;
    name: string;
    provider: string;
    endpointUrl: string;
    zeroKeyRequired: boolean;
    purposeAr: string;
    purposeEn: string;
    status: string;
  }>;
  fullCosmicSourcesCatalog?: Array<{
    id: string;
    name: string;
    category: string;
    endpoint: string;
    authRequired: 'NO_KEY_FREE' | 'OPTIONAL_FREE_KEY';
    dailyFreeQuota: string;
    descriptionAr: string;
    status: string;
  }>;
  compoundingGovernanceSpec?: {
    formula: string;
    nDefinitionAr: string;
    nDefinitionEn: string;
    currentN: number;
    maxSafeCapN: number;
    metricsDistinction: {
      virtualToolInstances: {
        labelAr: string;
        labelEn?: string;
        count: number;
        explanationAr: string;
        explanationEn?: string;
      };
      activeWorkerProcesses: {
        labelAr: string;
        labelEn?: string;
        count: number;
        explanationAr: string;
        explanationEn?: string;
      };
      cloudServerProviders: {
        labelAr: string;
        labelEn?: string;
        count: number;
        explanationAr: string;
        explanationEn?: string;
      };
    };
  };
  mouseAgentsProtocolSpec?: Array<{
    agentId: string;
    name: string;
    assignedModel: string;
    trajectoryMath: string;
    targetSelector: string;
    status: string;
  }>;
  aiModelsCharter: Array<{
    modelId: string;
    nameAr: string;
    nameEn: string;
    specialtyAr: string;
    specialtyEn: string;
    sovereignClearance: string;
    permissions: string[];
    assignedSourcesCount: number;
    autoEvaluatedScore: number;
    activeStatus: string;
  }>;
  ownerCompanies: Array<{
    id: string;
    name: string;
    sector: string;
    status: string;
    assignedModels: string[];
    dedicatedToolsCount: number;
    dedicatedServerSlots: number;
    currentObjective: string;
    efficiencyScore: number;
    createdAt: string;
  }>;
  securityEvents: Array<{
    id: string;
    timestamp: string;
    category: string;
    severity: string;
    targetAccount: string;
    actionTakenAr: string;
    actionTakenEn: string;
    handledByModel: string;
    sourceReference: string;
  }>;
  ownerCloudDevices?: Array<{
    deviceId: string;
    deviceName: string;
    fingerprintHash: string;
    cloudEdgeNode: string;
    syncedAt: string;
    status: string;
  }>;
  lastAmplificationDelta?: {
    toolsDelta: number;
    serversDelta: number;
    ramSavedDeltaMb: number;
    quotaDelta: number;
    generationDelta: number;
    blueprintRevision: number;
    lastTriggerReason: string;
    updatedAt: string;
  };
  blueprintRevisionCount?: number;
  strictOwnerUiIsolationPolicy?: {
    enforced: boolean;
    descriptionAr: string;
    descriptionEn: string;
  };
}

const STORAGE_ACCOUNT_KEY = 'nova_active_account_profile_v12_zero';
const STORAGE_TOKEN_KEY = 'nova_active_session_token_v12_zero';

// Purge any legacy v11 test accounts from browser localStorage immediately
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('nevea_active_account_profile_v11');
    window.localStorage.removeItem('nevea_active_session_token_v11');
    window.localStorage.removeItem('nevea_local_accounts_vault_v11');
  }
} catch {}

type AccountListener = (account: NeveaAccountProfile | null) => void;
const listeners = new Set<AccountListener>();

function notifyListeners(account: NeveaAccountProfile | null) {
  for (const fn of listeners) {
    try {
      fn(account);
    } catch {}
  }
}

export function getCachedNeveaAccount(): NeveaAccountProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username && parsed.sessionToken) {
      return parsed as NeveaAccountProfile;
    }
  } catch {}
  return null;
}

function saveCachedNeveaAccount(account: NeveaAccountProfile | null) {
  try {
    if (!account) {
      localStorage.removeItem(STORAGE_ACCOUNT_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    } else {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
      if (account.sessionToken) {
        localStorage.setItem(STORAGE_TOKEN_KEY, account.sessionToken);
      }
    }
  } catch {}
  notifyListeners(account);
}

export function subscribeToNeveaAccount(listener: AccountListener): () => void {
  listeners.add(listener);
  listener(getCachedNeveaAccount());
  return () => {
    listeners.delete(listener);
  };
}

export async function syncNeveaAccountSession(): Promise<NeveaAccountProfile | null> {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY) || '';
    if (!token) {
      saveCachedNeveaAccount(null);
      return null;
    }
    const res = await fetch('/api/auth/me', {
      headers: { 'x-nevea-token': token },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.authenticated && data?.account) {
        saveCachedNeveaAccount(data.account);
        return data.account;
      } else {
        // Server says session is not authenticated: clear any cached account immediately!
        saveCachedNeveaAccount(null);
        return null;
      }
    }
  } catch {}
  return null;
}

export async function registerAccountClient(params: {
  username: string;
  password: string;
  confirmPassword: string;
}): Promise<{
  success: boolean;
  error?: string;
  account?: NeveaAccountProfile;
}> {
  const username = String(params.username || '').trim();
  const password = String(params.password || '');
  const confirmPassword = String(params.confirmPassword || '');

  if (username.length < 3) {
    return {
      success: false,
      error: 'Account name must be at least 3 characters.',
    };
  }
  if (password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters.',
    };
  }
  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match. Please repeat the exact same password.',
    };
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword }),
    });
    const data = await res.json();
    if (res.ok && data?.success && data?.account) {
      saveCachedNeveaAccount(data.account);
      return { success: true, account: data.account };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Registration request failed.' };
  }

  return { success: false, error: 'Registration failed.' };
}

export async function loginAccountClient(params: {
  username: string;
  password: string;
}): Promise<{
  success: boolean;
  error?: string;
  account?: NeveaAccountProfile;
}> {
  const username = String(params.username || '').trim();
  const password = String(params.password || '');

  if (!username || !password) {
    return {
      success: false,
      error: 'Please enter Account Name and Password.',
    };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok && data?.success && data?.account) {
      saveCachedNeveaAccount(data.account);
      return { success: true, account: data.account };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sign in request failed.' };
  }

  return {
    success: false,
    error: 'Invalid Account Name or Password.',
  };
}

export async function logoutAccountClient(): Promise<void> {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY) || '';
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-nevea-token': token } : {}),
      },
      body: JSON.stringify({ token }),
    });
  } catch {}
  saveCachedNeveaAccount(null);
}

// ============================================================================
// SOVEREIGN OWNER OS API CLIENT HELPERS
// ============================================================================
export async function fetchUnifiedSovereignState(): Promise<SovereignUnifiedSystemState | null> {
  try {
    const res = await fetch('/api/sovereign/unified-state');
    if (res.ok) {
      const data = await res.json();
      if (data?.success) return data as SovereignUnifiedSystemState;
    }
  } catch {}
  return null;
}

export async function evaluateAndMultiplyResourcesClient(
  reason = 'owner_manual_evaluation'
): Promise<SovereignUnifiedSystemState | null> {
  try {
    const res = await fetch('/api/sovereign/evaluate-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.state || null;
    }
  } catch {}
  return null;
}

export async function pingAndVerifyLiveSourcesClient(): Promise<{
  success: boolean;
  verifiedAt?: string;
  results?: Array<{
    nodeId: string;
    nameEn: string;
    nameAr: string;
    reachable: boolean;
    latencyMs: number;
    httpStatus: number;
  }>;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/ping-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function resetVaultToZeroBaseTruthClient(): Promise<{
  success: boolean;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/reset-zero-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    saveCachedNeveaAccount(null);
    return data;
  } catch {
    return { success: false };
  }
}

export async function purgeAccountDefcon1Client(params: {
  accountId?: string;
  username?: string;
  reason?: string;
}): Promise<{
  success: boolean;
  messageAr?: string;
  messageEn?: string;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/defcon1-purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, messageEn: err?.message };
  }
}

export async function simulateDefcon1HackerAttackClient(): Promise<{
  success: boolean;
  neutralizedHacker?: string;
  responseLatencyMs?: number;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/simulate-defcon1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function evaluateCreatorPublishAdvisorClient(params: {
  projectDescription: string;
  targetPlatform: string;
}): Promise<{
  success: boolean;
  advisoryAr?: string;
  advisoryEn?: string;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/publish-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function launchOwnerCompanyVentureClient(params: {
  name: string;
  sector: string;
  objective: string;
}): Promise<{
  success: boolean;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/company-venture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export interface InterModelBusStepClient {
  stepNumber: number;
  modelId: string;
  modelName: string;
  modelNameAr?: string;
  roleTitle: string;
  ipcProtocolMessageId: string;
  inputStateSummary: string;
  actionExecutedAr: string;
  actionExecutedEn: string;
  toolsAndSourcesUsed: string[];
  cloudNodeUsed: string;
  latencyMs: number;
  outputPayloadPreview: string;
  status: string;
}

export async function executeSovereignDirectiveClient(params: {
  command: string;
  sector?: string;
  targetModelId?: string;
}): Promise<{
  success: boolean;
  directive?: string;
  targetModelId?: string;
  activeModelUsed?: string;
  liveAiResponse?: string;
  sandboxOutput?: string;
  liveFacts?: Array<{ source: string; summary: string; url?: string }>;
  busProtocol?: string;
  totalLatencyMs?: number;
  ipcSteps?: InterModelBusStepClient[];
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/execute-directive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export async function syncOwnerDeviceAcrossCloudClient(params?: {
  deviceName?: string;
  recoveryKey?: string;
}): Promise<{
  success: boolean;
  syncedDeviceName?: string;
  ownerAccount?: NeveaAccountProfile | null;
  totalSyncedDevices?: number;
  estimatedLocalRamSavedMb?: number;
  state?: SovereignUnifiedSystemState;
}> {
  try {
    const res = await fetch('/api/sovereign/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    const data = await res.json();
    if (data?.ownerAccount) {
      saveCachedNeveaAccount(data.ownerAccount);
    }
    return data;
  } catch {
    return { success: false };
  }
}

export async function downloadWindowsAutoInstallerClient(): Promise<{
  success: boolean;
  fileName: string;
}> {
  const fileName = 'NOVA_Auto_Installer_Windows.bat';
  try {
    const res = await fetch('/api/installer/windows-bat');
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/octet-stream' });
      triggerBrowserBlobDownload(blob, fileName);
      return { success: true, fileName };
    }
  } catch {}
  return { success: false, fileName };
}

export async function downloadGitHubExporterBatClient(): Promise<{
  success: boolean;
  fileName: string;
}> {
  const fileName = 'NOVA_GitHub_Push_Setup.bat';
  try {
    const res = await fetch('/api/installer/github-bat');
    if (res.ok) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/octet-stream' });
      triggerBrowserBlobDownload(blob, fileName);
      return { success: true, fileName };
    }
  } catch {}
  return { success: false, fileName };
}

export async function downloadMasterBlueprintMdClient(): Promise<{
  success: boolean;
  fileName: string;
}> {
  const fileName = 'NOVA_ULTIMATE_SYSTEM_BLUEPRINT.md';
  try {
    const res = await fetch('/api/manifest/blueprint-md');
    if (res.ok) {
      const text = await res.text();
      if (text.length > 100) {
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        triggerBrowserBlobDownload(blob, fileName);
        return { success: true, fileName };
      }
    }
  } catch {}
  try {
    const res2 = await fetch('/NOVA_ULTIMATE_SYSTEM_BLUEPRINT.md');
    if (res2.ok) {
      const text = await res2.text();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      triggerBrowserBlobDownload(blob, fileName);
      return { success: true, fileName };
    }
  } catch {}
  return { success: false, fileName };
}

export async function downloadRequiredValuesPdfClient(): Promise<{
  success: boolean;
  fileName: string;
  bytes: number;
}> {
  const fileName = 'NEVEA_ULTIMATE_VALUES_AND_SOURCES_MANIFEST.pdf';
  try {
    const res = await fetch('/api/manifest/pdf');
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 200) {
        triggerBrowserBlobDownload(blob, fileName);
        return { success: true, fileName, bytes: blob.size };
      }
    }
  } catch {}

  try {
    const staticRes = await fetch('/NEVEA_ULTIMATE_VALUES_AND_SOURCES_MANIFEST.pdf');
    if (staticRes.ok) {
      const blob = await staticRes.blob();
      if (blob.size > 200) {
        triggerBrowserBlobDownload(blob, fileName);
        return { success: true, fileName, bytes: blob.size };
      }
    }
  } catch {}

  const fallbackBlob = buildClientFallbackPdfBlob();
  triggerBrowserBlobDownload(fallbackBlob, fileName);
  return { success: true, fileName, bytes: fallbackBlob.size };
}

function triggerBrowserBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 600);
}

function buildClientFallbackPdfBlob(): Blob {
  const stream = [
    'BT',
    '/F1 12 Tf',
    '42 740 Td',
    '(NOVA / NEVEA STUDIO V12.0 - REQUIRED VALUES & 70 COSMIC/SECURITY SOURCES MANIFEST) Tj',
    '0 -22 Td',
    '/F1 9 Tf',
    '(Compounding Formula: Power(N) = 2^N x 1.5 | 70 Zero-Key Sources | 12 Cloud Fleet Nodes) Tj',
    '0 -18 Td',
    '(Core LLM Keys: GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, HF_TOKEN) Tj',
    '0 -15 Td',
    '(Cloud Fleet Keys: CLOUDFLARE_API_TOKEN, UPSTASH_REDIS_REST_URL, SUPABASE_URL, SUPABASE_ANON_KEY) Tj',
    'ET',
  ].join('\n');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${350 + stream.length}
%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
