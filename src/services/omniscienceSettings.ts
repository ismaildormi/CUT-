/**
 * NEVEA Omniscience Protocol Settings Manager
 * Controls JARVIS Omniscient Mode:
 * 1. Auto-Start NEVEA on PC Boot (electron-store / app.setLoginItemSettings)
 * 2. Enable Live Vision (Continuous 3-second screen awareness with pixel delta hashing)
 * 3. Enable System Audio Hearing (Loopback audio stream via soundcard / WebSocket)
 */

export interface OmniscienceSettings {
  autoStartOnBoot: boolean;
  liveVisionEnabled: boolean;
  systemAudioEnabled: boolean;
}

const STORAGE_KEY = 'nevea:omniscience-settings';

const DEFAULT_SETTINGS: OmniscienceSettings = {
  autoStartOnBoot: false,
  liveVisionEnabled: false,
  systemAudioEnabled: false,
};

let cachedSettings: OmniscienceSettings = { ...DEFAULT_SETTINGS };

// Load initial settings synchronously from localStorage if present
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
}

/**
 * Fetch current Omniscience settings from electron-store or browser localStorage
 */
export async function getOmniscienceSettings(): Promise<OmniscienceSettings> {
  const electron = (window as any).electronAPI;
  if (electron && typeof electron.getOmniscienceSettings === 'function') {
    try {
      const res = await electron.getOmniscienceSettings();
      if (res && typeof res === 'object') {
        cachedSettings = {
          autoStartOnBoot: Boolean(res.autoStartOnBoot),
          liveVisionEnabled: Boolean(res.liveVisionEnabled),
          systemAudioEnabled: Boolean(res.systemAudioEnabled),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
        } catch {}
        return cachedSettings;
      }
    } catch (err) {
      console.warn('[Omniscience] Failed to read settings from Electron IPC:', err);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
  }
  return cachedSettings;
}

/**
 * Update Omniscience settings and persist to electron-store & localStorage
 */
export async function updateOmniscienceSettings(
  partial: Partial<OmniscienceSettings>
): Promise<OmniscienceSettings> {
  const updated: OmniscienceSettings = {
    ...cachedSettings,
    ...partial,
  };
  cachedSettings = updated;

  // Persist locally
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  // Sync to Electron main process
  const electron = (window as any).electronAPI;
  if (electron && typeof electron.setOmniscienceSettings === 'function') {
    try {
      await electron.setOmniscienceSettings(updated);
    } catch (err) {
      console.warn('[Omniscience] Failed to persist settings via Electron IPC:', err);
    }
  }

  // Broadcast change event across the application
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('nevea:omniscience-change', {
        detail: { settings: updated },
      })
    );
  }

  return updated;
}

/**
 * Synchronous accessor for currently cached settings
 */
export function getCachedOmniscienceSettings(): OmniscienceSettings {
  return cachedSettings;
}
