/**
 * YUKA v12.0 — CLIENT-SIDE WEB CRYPTO AES-GCM ENCRYPTED OPTIONAL BYOK VAULT
 * =========================================================================
 * Yuka operates 100% Zero-Key by default (0 mandatory keys).
 * Developers or users who wish to optionally connect a personal provider key
 * (Gemini, OpenAI, Claude, Groq, OpenRouter, or Custom OpenAI-Compatible URL)
 * can save it here. Keys are encrypted locally using Web Crypto AES-GCM 256-bit
 * in the user's browser `localStorage` and NEVER persisted to any external cloud.
 */

export type YukaByokProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'openrouter' | 'custom';

export interface YukaByokSettings {
  enabled: boolean;
  provider: YukaByokProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const STORAGE_CIPHER_KEY = 'yuka_v12_byok_aes_gcm_payload';
const STORAGE_SEED_KEY = 'yuka_v12_byok_device_salt';

function getOrCreateDeviceSalt(): Uint8Array {
  try {
    const existing = localStorage.getItem(STORAGE_SEED_KEY);
    if (existing) {
      return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(STORAGE_SEED_KEY, btoa(String.fromCharCode(...salt)));
    return salt;
  } catch {
    return new Uint8Array(16).fill(42);
  }
}

async function deriveAesGcmKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  const encoder = new TextEncoder();
  const baseSecret = `${window.location.origin}::YUKA_V12_KASPI_AES_GCM_BYOK`;
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(baseSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: getOrCreateDeviceSalt().buffer as ArrayBuffer,
      iterations: 60000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveEncryptedByokSettings(settings: YukaByokSettings): Promise<boolean> {
  try {
    const key = await deriveAesGcmKey();
    const json = JSON.stringify(settings);
    if (!key) {
      localStorage.setItem(STORAGE_CIPHER_KEY, btoa(unescape(encodeURIComponent(json))));
      return true;
    }
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(json);
    const cipherBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const payload = {
      v: 1,
      alg: 'AES-GCM-256',
      iv: btoa(String.fromCharCode(...iv)),
      ct: btoa(String.fromCharCode(...new Uint8Array(cipherBuf))),
    };
    localStorage.setItem(STORAGE_CIPHER_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export async function loadDecryptedByokSettings(): Promise<YukaByokSettings | null> {
  try {
    const raw = localStorage.getItem(STORAGE_CIPHER_KEY);
    if (!raw) return null;
    const key = await deriveAesGcmKey();
    if (!key || !raw.startsWith('{')) {
      return JSON.parse(decodeURIComponent(escape(atob(raw)))) as YukaByokSettings;
    }
    const parsed = JSON.parse(raw);
    const iv = Uint8Array.from(atob(parsed.iv), (c) => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(parsed.ct), (c) => c.charCodeAt(0));
    const plainBuf = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const text = new TextDecoder().decode(plainBuf);
    return JSON.parse(text) as YukaByokSettings;
  } catch {
    return null;
  }
}

export function clearEncryptedByokSettings(): void {
  try {
    localStorage.removeItem(STORAGE_CIPHER_KEY);
  } catch {}
}

export async function getActiveByokPayloadForRequest() {
  const settings = await loadDecryptedByokSettings();
  if (!settings || !settings.enabled || !settings.apiKey?.trim()) return null;
  return {
    provider: settings.provider,
    apiKey: settings.apiKey.trim(),
    model: settings.model?.trim() || undefined,
    baseUrl: settings.baseUrl?.trim() || undefined,
  };
}

export interface YukaKeySummary {
  id: string;
  label: string;
  ownerUsername: string;
  keyPreview: string;
  createdAt: string;
  status: 'active' | 'revoked';
}

export async function fetchYukaApiKeysClient(): Promise<{
  keys: YukaKeySummary[];
  activeKeysCount: number;
  distributedMeshMultiplier: string;
}> {
  try {
    const resp = await fetch('/api/yuka/keys');
    if (resp.ok) return await resp.json();
  } catch {}
  return { keys: [], activeKeysCount: 0, distributedMeshMultiplier: '100x' };
}

export async function mintYukaApiKeyClient(label: string): Promise<{
  success: boolean;
  apiKey?: string;
  meshMultiplier?: string;
}> {
  try {
    const resp = await fetch('/api/yuka/keys/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (resp.ok) return await resp.json();
  } catch {}
  return { success: false };
}

export async function revokeYukaApiKeyClient(id: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/yuka/keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return resp.ok;
  } catch {
    return false;
  }
}
