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
