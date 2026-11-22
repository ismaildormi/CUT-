export type KaspiModelId = 'heyuka-omni' | 'heyuka-core' | 'heyuka-vision';

export interface KaspiModelMetadata {
  id: KaspiModelId;
  shortLabel: string;
  name: string;
  roleEn: string;
  roleAr: string;
}

export const KASPI_SOVEREIGN_MODELS: readonly KaspiModelMetadata[] = [
  {
    id: 'heyuka-omni',
    shortLabel: 'Omni',
    name: 'HEYUKA Omni',
    roleEn: 'Flagship reasoning, planning, voice dialogue & Arabic/Darija/FR/EN orchestration',
    roleAr: 'النموذج الشامل للتفكير العميق، التخطيط، والحوار متعدد اللغات',
  },
  {
    id: 'heyuka-core',
    shortLabel: 'Core',
    name: 'HEYUKA Core',
    roleEn: 'Fast engineering, TypeScript/Python code generation, structured logic & RAG',
    roleAr: 'محرك البرمجة السريع، الهندسة التقنية، والمنطق المهيكل',
  },
  {
    id: 'heyuka-vision',
    shortLabel: 'Vision',
    name: 'HEYUKA Vision',
    roleEn: 'Live screen inspection, image studio synthesis, cutout & 3D scene workflows',
    roleAr: 'تحليل الشاشة المباشر، توليد الصور، وتصميم الأبعاد الثلاثية',
  },
];

const ACTIVE_MODEL_STORAGE_KEY = 'heyuka_active_kaspi_model';

export function getActiveKaspiModel(): KaspiModelId | 'auto' {
  try {
    const val = localStorage.getItem(ACTIVE_MODEL_STORAGE_KEY);
    if (val === 'heyuka-omni' || val === 'heyuka-core' || val === 'heyuka-vision' || val === 'auto') {
      return val;
    }
  } catch {}
  return 'auto';
}

export function setActiveKaspiModel(model: KaspiModelId | 'auto'): void {
  try {
    localStorage.setItem(ACTIVE_MODEL_STORAGE_KEY, model);
    window.dispatchEvent(new CustomEvent('heyuka:model-change', { detail: { model } }));
  } catch {}
}

/**
 * Automatically selects the best KASPI model based on request intent unless explicitly pinned.
 */
export function resolveIntentModel(
  prompt: string,
  includeScreen = false,
  pinned?: KaspiModelId | 'auto'
): KaspiModelId {
  const mode = pinned || getActiveKaspiModel();
  if (mode !== 'auto') return mode;
  if (includeScreen) return 'heyuka-vision';
  const low = String(prompt || '').toLowerCase();
  if (/(3d|mesh|image|draw|render|screen|vision|camera|foto|photo|screenshot|صورة|ثلاثي|شاشة)/i.test(low)) {
    return 'heyuka-vision';
  }
  if (/(code|typescript|python|bug|fix|refactor|sql|api|debug|math|calc|script|كود|برمجة|حساب)/i.test(low)) {
    return 'heyuka-core';
  }
  return 'heyuka-omni';
}

export async function fetchKaspiModelsStatus() {
  try {
    const resp = await fetch('/api/kaspi/models-status');
    if (resp.ok) return await resp.json();
  } catch {}
  return {
    baseUrl: 'https://kaspi-pos.vercel.app/api/v1',
    configured: false,
    hasKeyId: false,
    activeModel: 'heyuka-omni',
    liveReachable: false,
    authValid: null,
    models: KASPI_SOVEREIGN_MODELS,
  };
}

export async function saveKaspiCredentials(payload: {
  heyukaApiKey: string;
  heyukaKeyId?: string;
  kaspiApiBaseUrl?: string;
  heyukaActiveModel?: string;
}) {
  const resp = await fetch('/api/kaspi/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return resp.json().catch(() => ({ ok: false }));
}

export async function callKaspiSpawnDesktopBotClient(payload: {
  action?: 'spawn' | 'list' | 'takeover' | 'resume' | 'destroy';
  task?: string;
  role?: string;
  displayEngine?: string;
  botId?: string;
}) {
  const resp = await fetch('/api/kaspi/desktops/spawn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return resp.json().catch(() => ({ ok: false }));
}

export async function callKaspiOsExecClient(payload: {
  action?: 'shell' | 'file_lifecycle' | 'sentinel_health' | 'app_operate';
  command?: string;
  targetPath?: string;
  appTitle?: string;
  editSnippet?: string;
}) {
  const resp = await fetch('/api/kaspi/os/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return resp.json().catch(() => ({ ok: false }));
}

export async function callKaspiAiPcControlClient(payload: {
  action?: 'scroll' | 'zoom' | 'self_unblock' | 'webcam_vision' | 'panic_stop' | 'dispatch';
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
  zoomDelta?: number;
  blockedReason?: string;
  cameraMode?: string;
  prompt?: string;
}) {
  const resp = await fetch('/api/kaspi/ai-pc/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return resp.json().catch(() => ({ ok: false }));
}

export async function fetchKaspiSovereignVaultClient(query = '', limit = 25) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) qs.set('q', query.trim());
  const resp = await fetch(`/api/kaspi/vault?${qs.toString()}`);
  return resp.json().catch(() => ({ ok: false }));
}
