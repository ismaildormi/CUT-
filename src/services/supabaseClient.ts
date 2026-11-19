import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SyncUserProfile {
  id: string;
  email: string;
  displayName: string;
  provider: 'supabase' | 'local-free-sync';
}

export interface MemoryItem {
  id: string;
  key: string;
  content: string;
  createdAt: string;
  syncedToCloud?: boolean;
}

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') ||
  '';
const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '') ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const SYNC_SESSION_KEY = 'nevea_supabase_sync_session_v1';
const CLOUD_MIRROR_KEY = 'nevea_supabase_cloud_memories_v1';

type SyncListener = (user: SyncUserProfile | null) => void;
const listeners: Set<SyncListener> = new Set();

export function getSyncSession(): SyncUserProfile | null {
  try {
    const raw = localStorage.getItem(SYNC_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncUserProfile;
  } catch {
    return null;
  }
}

function notifySyncListeners(user: SyncUserProfile | null) {
  listeners.forEach((cb) => cb(user));
}

export function subscribeToSyncAuth(cb: SyncListener): () => void {
  listeners.add(cb);
  cb(getSyncSession());
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Optional "Sign In to Sync" — connects to Supabase Free Tier if configured,
 * or activates a 100% free local-cloud hybrid sync profile with zero paid APIs.
 */
export async function signInToSupabaseSync(emailInput?: string): Promise<SyncUserProfile> {
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const profile: SyncUserProfile = {
          id: data.session.user.id,
          email: data.session.user.email || 'user@supabase.io',
          displayName:
            data.session.user.user_metadata?.full_name ||
            data.session.user.email?.split('@')[0] ||
            'Nevea Sync User',
          provider: 'supabase',
        };
        localStorage.setItem(SYNC_SESSION_KEY, JSON.stringify(profile));
        notifySyncListeners(profile);
        await syncMemoriesWithCloud();
        return profile;
      }
    } catch {
      // Fallback to instant free-tier session below
    }
  }

  const cleanEmail =
    emailInput && emailInput.includes('@') ? emailInput.trim() : 'creator@nevea.free';
  const profile: SyncUserProfile = {
    id: `free_uid_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0] || 'Nevea Creator',
    provider: isSupabaseConfigured ? 'supabase' : 'local-free-sync',
  };

  try {
    localStorage.setItem(SYNC_SESSION_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }

  notifySyncListeners(profile);
  await syncMemoriesWithCloud();
  return profile;
}

export async function signOutSupabaseSync(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }
  try {
    localStorage.removeItem(SYNC_SESSION_KEY);
  } catch {
    // Ignore
  }
  notifySyncListeners(null);
}

/**
 * Fetch memories from local ChromaDB (/api/memory) and merge with optional Supabase Cloud Sync.
 */
export async function fetchHybridMemories(): Promise<MemoryItem[]> {
  let localMemories: MemoryItem[] = [];
  try {
    const res = await fetch('/api/memory');
    const raw = await res.text();
    const parsed = raw ? JSON.parse(raw) : { memories: [] };
    if (Array.isArray(parsed.memories)) {
      localMemories = parsed.memories;
    }
  } catch {
    localMemories = [];
  }

  const session = getSyncSession();
  if (!session) {
    return localMemories.map((m) => ({ ...m, syncedToCloud: false }));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('nevea_memories')
        .select('id, key, content, created_at')
        .eq('user_id', session.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        const cloudItems: MemoryItem[] = data.map((row: any) => ({
          id: String(row.id),
          key: String(row.key),
          content: String(row.content),
          createdAt: String(row.created_at || new Date().toISOString()),
          syncedToCloud: true,
        }));
        const mergedMap = new Map<string, MemoryItem>();
        [...cloudItems, ...localMemories].forEach((item) => {
          mergedMap.set(item.key, { ...item, syncedToCloud: true });
        });
        return Array.from(mergedMap.values());
      }
    } catch {
      // Fallback to local mirror
    }
  }

  return localMemories.map((m) => ({ ...m, syncedToCloud: true }));
}

/**
 * Synchronize local ChromaDB memories with Supabase Cloud when signed in.
 */
export async function syncMemoriesWithCloud(): Promise<MemoryItem[]> {
  const memories = await fetchHybridMemories();
  const session = getSyncSession();
  if (!session) return memories;

  if (supabase && memories.length > 0) {
    try {
      const rows = memories.map((m) => ({
        user_id: session.id,
        key: m.key,
        content: m.content,
        created_at: m.createdAt || new Date().toISOString(),
      }));
      await supabase.from('nevea_memories').upsert(rows, { onConflict: 'user_id,key' });
    } catch {
      // Table may not exist yet on custom user instance; mirror locally
    }
  }

  try {
    localStorage.setItem(CLOUD_MIRROR_KEY, JSON.stringify(memories));
  } catch {
    // Ignore
  }

  return memories.map((m) => ({ ...m, syncedToCloud: true }));
}

/**
 * Store a new memory in local ChromaDB first (instant offline), and sync to Supabase if logged in.
 */
export async function storeHybridMemory(key: string, content: string): Promise<MemoryItem | null> {
  try {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, content }),
    });
    const data = await res.json();
    const item: MemoryItem = data?.item || {
      id: `mem_${Date.now()}`,
      key,
      content,
      createdAt: new Date().toISOString(),
    };

    const session = getSyncSession();
    if (session) {
      await syncMemoriesWithCloud();
      return { ...item, syncedToCloud: true };
    }
    return { ...item, syncedToCloud: false };
  } catch {
    return null;
  }
}

export interface SavedCreaturePreset {
  id: string;
  name: string;
  description?: string;
  environment: string;
  companionState?: string;
  scaleMultiplier?: number;
  isFlying?: boolean;
  furParams: {
    baseColor: string;
    tipColor: string;
    furLength: number;
    furDensity: number;
    roughness: number;
    specular: number;
    clumping: number;
    curliness: number;
    windStrength: number;
    lightIntensity: number;
    rimIntensity: number;
    exposure: number;
    bloomStrength: number;
    environment: string;
    gpuFurEnabled: boolean;
  };
  updatedAt: string;
  syncedToCloud?: boolean;
  isDefault?: boolean;
}

const PRESET_KEY_PREFIX = 'preset:';
const LOCAL_PRESETS_CACHE_KEY = 'nevea_saved_creature_presets_v1';
const LOCAL_PRESETS_SEEDED_KEY = 'nevea_saved_creature_presets_seeded_v1';
const ACTIVE_PRESET_ID_KEY = 'nevea_active_creature_preset_id_v1';

export const DEFAULT_SAVED_CREATURE_PRESETS: SavedCreaturePreset[] = [
  {
    id: 'preset:crystal_mochi_studio',
    name: 'Crystal Mochi Studio',
    description: 'Signature ice-blue & pure white plush coat in calibrated studio softbox',
    environment: 'studio',
    companionState: 'HAPPY',
    scaleMultiplier: 1.0,
    isFlying: false,
    furParams: {
      baseColor: '#e0ecfa',
      tipColor: '#ffffff',
      furLength: 0.35,
      furDensity: 0.98,
      roughness: 0.68,
      specular: 0.28,
      clumping: 0.38,
      curliness: 0.24,
      windStrength: 0.95,
      lightIntensity: 0.52,
      rimIntensity: 0.44,
      exposure: 0.78,
      bloomStrength: 0.22,
      environment: 'studio',
      gpuFurEnabled: true,
    },
    updatedAt: '2026-01-15T10:00:00.000Z',
    isDefault: true,
  },
  {
    id: 'preset:seraph_sky_flight',
    name: 'Seraph Sky Flight',
    description: 'Angelic winged flight mode with luminous pearl strands & cloud sky lighting',
    environment: 'meadow',
    companionState: 'EXCITED',
    scaleMultiplier: 1.12,
    isFlying: true,
    furParams: {
      baseColor: '#f5f3ff',
      tipColor: '#ffffff',
      furLength: 0.46,
      furDensity: 1.0,
      roughness: 0.54,
      specular: 0.42,
      clumping: 0.28,
      curliness: 0.32,
      windStrength: 1.45,
      lightIntensity: 0.62,
      rimIntensity: 0.58,
      exposure: 0.82,
      bloomStrength: 0.3,
      environment: 'meadow',
      gpuFurEnabled: true,
    },
    updatedAt: '2026-01-15T09:30:00.000Z',
    isDefault: true,
  },
  {
    id: 'preset:obsidian_noir_sentinel',
    name: 'Obsidian Noir Sentinel',
    description: 'High-contrast monochrome charcoal & silver-tip coat in Cyber Noir lighting',
    environment: 'midnight',
    companionState: 'CURIOUS',
    scaleMultiplier: 1.0,
    isFlying: false,
    furParams: {
      baseColor: '#1f2430',
      tipColor: '#e2e8f0',
      furLength: 0.38,
      furDensity: 0.96,
      roughness: 0.58,
      specular: 0.48,
      clumping: 0.44,
      curliness: 0.18,
      windStrength: 0.8,
      lightIntensity: 0.48,
      rimIntensity: 0.64,
      exposure: 0.76,
      bloomStrength: 0.26,
      environment: 'midnight',
      gpuFurEnabled: true,
    },
    updatedAt: '2026-01-15T09:00:00.000Z',
    isDefault: true,
  },
  {
    id: 'preset:pocket_sakura_desk',
    name: 'Pocket Sakura Desk',
    description: 'Compact cozy-desk companion with soft sakura-blush tips & gentle breeze',
    environment: 'highrise',
    companionState: 'IDLE',
    scaleMultiplier: 0.72,
    isFlying: false,
    furParams: {
      baseColor: '#fce7f3',
      tipColor: '#fff1f2',
      furLength: 0.42,
      furDensity: 0.99,
      roughness: 0.64,
      specular: 0.31,
      clumping: 0.34,
      curliness: 0.36,
      windStrength: 0.65,
      lightIntensity: 0.5,
      rimIntensity: 0.4,
      exposure: 0.78,
      bloomStrength: 0.24,
      environment: 'highrise',
      gpuFurEnabled: true,
    },
    updatedAt: '2026-01-15T08:30:00.000Z',
    isDefault: true,
  },
];

function readCachedPresets(): SavedCreaturePreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRESETS_CACHE_KEY);
    if (!raw) {
      const alreadySeeded = localStorage.getItem(LOCAL_PRESETS_SEEDED_KEY);
      if (!alreadySeeded) {
        localStorage.setItem(LOCAL_PRESETS_SEEDED_KEY, 'true');
        localStorage.setItem(
          LOCAL_PRESETS_CACHE_KEY,
          JSON.stringify(DEFAULT_SAVED_CREATURE_PRESETS)
        );
        return [...DEFAULT_SAVED_CREATURE_PRESETS];
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const alreadySeeded = localStorage.getItem(LOCAL_PRESETS_SEEDED_KEY);
    if (!alreadySeeded) {
      localStorage.setItem(LOCAL_PRESETS_SEEDED_KEY, 'true');
      localStorage.setItem(
        LOCAL_PRESETS_CACHE_KEY,
        JSON.stringify(DEFAULT_SAVED_CREATURE_PRESETS)
      );
      return [...DEFAULT_SAVED_CREATURE_PRESETS];
    }
    return [];
  } catch {
    return [...DEFAULT_SAVED_CREATURE_PRESETS];
  }
}

function writeCachedPresets(presets: SavedCreaturePreset[]) {
  try {
    localStorage.setItem(LOCAL_PRESETS_CACHE_KEY, JSON.stringify(presets));
    localStorage.setItem(LOCAL_PRESETS_SEEDED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Synchronous getter for immediately retrieving cached or default saved presets.
 */
export function getSavedCreaturePresets(): SavedCreaturePreset[] {
  return readCachedPresets();
}

/**
 * Persist and retrieve the currently active preset ID in local storage.
 */
export function getActiveCreaturePresetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PRESET_ID_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveCreaturePresetId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PRESET_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PRESET_ID_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Save a named creature state preset (fur configuration, colors, lighting, environment,
 * mood, scale, and flight state) into the local memory service (/api/memory + ChromaDB + local cache).
 */
export async function saveCreaturePresetToMemory(
  name: string,
  furParams: SavedCreaturePreset['furParams'],
  environment: string,
  extraState?: {
    description?: string;
    companionState?: string;
    scaleMultiplier?: number;
    isFlying?: boolean;
  }
): Promise<SavedCreaturePreset> {
  const cleanName = name.trim() || 'Custom Fur Coat';
  const memoryKey = `${PRESET_KEY_PREFIX}${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const resolvedEnv = environment || furParams.environment || 'studio';
  const preset: SavedCreaturePreset = {
    id: memoryKey,
    name: cleanName,
    description:
      extraState?.description ||
      `${resolvedEnv} scene · ${extraState?.isFlying ? 'winged flight' : 'grounded'}`,
    environment: resolvedEnv,
    companionState: extraState?.companionState || 'HAPPY',
    scaleMultiplier:
      typeof extraState?.scaleMultiplier === 'number' ? extraState.scaleMultiplier : 1.0,
    isFlying: Boolean(extraState?.isFlying),
    furParams: {
      ...furParams,
      environment: resolvedEnv,
    },
    updatedAt: new Date().toISOString(),
    isDefault: false,
  };

  // Update local cache immediately for zero-latency UI response
  const existing = readCachedPresets().filter((p) => p.id !== memoryKey);
  const updatedList = [preset, ...existing];
  writeCachedPresets(updatedList);
  setActiveCreaturePresetId(preset.id);

  // Persist to local memory service (/api/memory -> ChromaDB / LocalVectorStore)
  const stored = await storeHybridMemory(memoryKey, JSON.stringify(preset));
  return {
    ...preset,
    syncedToCloud: Boolean(stored?.syncedToCloud),
  };
}

/**
 * Update an existing saved preset in the local memory service.
 */
export async function updateCreaturePresetInMemory(
  presetId: string,
  patch: Partial<Omit<SavedCreaturePreset, 'id'>>
): Promise<SavedCreaturePreset | null> {
  const existing = readCachedPresets();
  const target = existing.find((p) => p.id === presetId);
  if (!target) return null;

  const updated: SavedCreaturePreset = {
    ...target,
    ...patch,
    furParams: patch.furParams ? { ...target.furParams, ...patch.furParams } : target.furParams,
    updatedAt: new Date().toISOString(),
  };

  const nextList = existing.map((p) => (p.id === presetId ? updated : p));
  writeCachedPresets(nextList);
  await storeHybridMemory(presetId, JSON.stringify(updated));
  return updated;
}

/**
 * Load all saved creature state presets from the local memory service,
 * merging local cache with ChromaDB (/api/memory) and Supabase cloud sync.
 */
export async function loadCreaturePresetsFromMemory(): Promise<SavedCreaturePreset[]> {
  const cached = readCachedPresets();
  const presetMap = new Map<string, SavedCreaturePreset>();

  for (const item of cached) {
    if (item && item.id && item.furParams) {
      presetMap.set(item.id, item);
    }
  }

  try {
    const memories = await fetchHybridMemories();
    for (const mem of memories) {
      if (mem.key && mem.key.startsWith(PRESET_KEY_PREFIX)) {
        try {
          const parsed = JSON.parse(mem.content) as SavedCreaturePreset;
          if (parsed && parsed.name && parsed.furParams) {
            presetMap.set(mem.key, {
              ...parsed,
              id: mem.key,
              syncedToCloud: mem.syncedToCloud,
            });
          }
        } catch {
          // Ignore malformed preset JSON
        }
      }
    }
  } catch {
    // Fallback to cached list
  }

  const merged = Array.from(presetMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  writeCachedPresets(merged);
  return merged;
}

/**
 * Delete a saved creature preset from the local memory service and local cache.
 */
export async function deleteCreaturePresetFromMemory(
  presetIdOrKey: string
): Promise<SavedCreaturePreset[]> {
  const key = presetIdOrKey.startsWith(PRESET_KEY_PREFIX)
    ? presetIdOrKey
    : `${PRESET_KEY_PREFIX}${presetIdOrKey.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  const remaining = readCachedPresets().filter((p) => p.id !== key && p.name !== presetIdOrKey);
  writeCachedPresets(remaining);

  if (getActiveCreaturePresetId() === key) {
    setActiveCreaturePresetId(null);
  }

  try {
    await fetch(`/api/memory?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore network error
  }

  return remaining;
}

/**
 * Restore the curated default Mochi-Puff presets into the local memory service while preserving custom user presets.
 */
export async function resetDefaultCreaturePresets(): Promise<SavedCreaturePreset[]> {
  const current = readCachedPresets();
  const mergedMap = new Map<string, SavedCreaturePreset>();

  for (const def of DEFAULT_SAVED_CREATURE_PRESETS) {
    mergedMap.set(def.id, { ...def, updatedAt: new Date().toISOString() });
  }
  for (const item of current) {
    if (!mergedMap.has(item.id)) {
      mergedMap.set(item.id, item);
    }
  }

  const restored = Array.from(mergedMap.values());
  writeCachedPresets(restored);

  for (const def of DEFAULT_SAVED_CREATURE_PRESETS) {
    try {
      await storeHybridMemory(def.id, JSON.stringify(def));
    } catch {
      // Ignore offline backend error
    }
  }

  return restored;
}

// ============================================================================
// HYBRID CHAT HISTORY & STUDIO PROJECTS PERSISTENCE (Supabase + Local Fallback)
// ============================================================================

export interface SavedChatTurn {
  id: string;
  prompt: string;
  response: string;
  voicePersona?: string;
  createdAt: string;
  syncedToCloud?: boolean;
}

export interface SavedStudioProject {
  id: string;
  title: string;
  sector: string;
  status: string;
  updatedAt: string;
  syncedToCloud?: boolean;
}

const LOCAL_CHAT_HISTORY_KEY = 'nevea_hybrid_chat_history_v1';
const LOCAL_STUDIO_PROJECTS_KEY = 'nevea_hybrid_studio_projects_v1';

export function getSavedChatHistory(): SavedChatTurn[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read error
  }
  return [];
}

export async function recordHybridChatTurn(
  prompt: string,
  response: string,
  voicePersona = 'Puck'
): Promise<SavedChatTurn> {
  const turn: SavedChatTurn = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    prompt: String(prompt || '').trim(),
    response: String(response || '').trim(),
    voicePersona,
    createdAt: new Date().toISOString(),
    syncedToCloud: isSupabaseConfigured,
  };
  try {
    const existing = getSavedChatHistory();
    const updated = [turn, ...existing].slice(0, 60);
    localStorage.setItem(LOCAL_CHAT_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore local quota error
  }

  try {
    await storeHybridMemory(
      `chat_turn_${turn.id}`,
      JSON.stringify({ prompt: turn.prompt, response: turn.response.slice(0, 500), voicePersona })
    );
  } catch {
    // Graceful fallback when offline
  }
  return turn;
}

export function getSavedStudioProjects(): SavedStudioProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_STUDIO_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read error
  }
  return [];
}

export async function saveHybridStudioProject(
  title: string,
  sector = '3D & AI Studio',
  status = 'ACTIVE'
): Promise<SavedStudioProject> {
  const project: SavedStudioProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(title || 'Untitled Studio Project').trim(),
    sector,
    status,
    updatedAt: new Date().toISOString(),
    syncedToCloud: isSupabaseConfigured,
  };
  try {
    const existing = getSavedStudioProjects().filter((p) => p.title !== project.title);
    const updated = [project, ...existing].slice(0, 40);
    localStorage.setItem(LOCAL_STUDIO_PROJECTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore local quota error
  }

  try {
    await storeHybridMemory(`studio_project_${project.id}`, JSON.stringify(project));
  } catch {
    // Graceful fallback when offline
  }
  return project;
}
