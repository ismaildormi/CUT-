/**
 * NEVEA Unified Context Bus & Namespaced Memory Engine
 * Provides:
 * 1. Global Visual Context Broadcasting (Gemini's active screen vision shared with all models)
 * 2. Namespaced Project Memory ("Save this under project X", "Retrieve channel Y")
 * 3. Event-driven updates for Multi-Model Routing
 */

import fs from 'fs';
import path from 'path';

export interface VisualContextSnapshot {
  summary: string;
  screenshotBase64?: string;
  timestamp: number;
  detectedApps?: string[];
  hasError?: boolean;
}

export interface NamespacedEntry {
  namespace: string;
  key: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const MEMORY_FILE = path.resolve(process.cwd(), 'Nevea_Backup', 'namespaced_memory.json');

class ContextBus {
  private latestVision: VisualContextSnapshot = {
    summary: 'Desktop environment active.',
    timestamp: Date.now(),
  };

  private memoryStore: Map<string, Map<string, NamespacedEntry>> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
        const obj = JSON.parse(raw);
        for (const [ns, entries] of Object.entries(obj)) {
          const map = new Map<string, NamespacedEntry>();
          for (const [k, v] of Object.entries(entries as any)) {
            map.set(k, v as NamespacedEntry);
          }
          this.memoryStore.set(ns, map);
        }
      }
    } catch (e) {
      console.warn('[ContextBus] Memory file load warning:', e);
    }
  }

  private persistToDisk() {
    try {
      const dir = path.dirname(MEMORY_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const out: Record<string, Record<string, NamespacedEntry>> = {};
      for (const [ns, map] of this.memoryStore.entries()) {
        out[ns] = {};
        for (const [k, v] of map.entries()) {
          out[ns][k] = v;
        }
      }
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(out, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[ContextBus] Memory file persist warning:', e);
    }
  }

  // --- Visual Context ---
  public setLatestVisualContext(summary: string, screenshotBase64?: string, detectedApps?: string[]) {
    this.latestVision = {
      summary,
      screenshotBase64,
      timestamp: Date.now(),
      detectedApps,
      hasError: /error|exception|fail|crash|bug/i.test(summary),
    };
  }

  public getLatestVisualContext(): VisualContextSnapshot {
    return { ...this.latestVision };
  }

  // --- Namespaced Project Memory ---
  public saveNamespacedMemory(
    namespace: string,
    key: string,
    content: string,
    metadata?: Record<string, any>
  ): NamespacedEntry {
    const cleanNs = (namespace || 'global').trim().toLowerCase();
    const cleanKey = (key || `entry_${Date.now()}`).trim();

    if (!this.memoryStore.has(cleanNs)) {
      this.memoryStore.set(cleanNs, new Map());
    }

    const entry: NamespacedEntry = {
      namespace: cleanNs,
      key: cleanKey,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.memoryStore.get(cleanNs)!.set(cleanKey, entry);
    this.persistToDisk();
    return entry;
  }

  public getNamespacedMemory(namespace: string, key?: string): NamespacedEntry[] {
    const cleanNs = (namespace || 'global').trim().toLowerCase();
    const map = this.memoryStore.get(cleanNs);
    if (!map) return [];

    if (key) {
      const item = map.get(key.trim());
      return item ? [item] : [];
    }

    return Array.from(map.values());
  }

  public listNamespaces(): string[] {
    return Array.from(this.memoryStore.keys());
  }

  public deleteNamespacedMemory(namespace: string, key?: string): boolean {
    const cleanNs = (namespace || 'global').trim().toLowerCase();
    if (!this.memoryStore.has(cleanNs)) return false;

    if (key) {
      const deleted = this.memoryStore.get(cleanNs)!.delete(key.trim());
      this.persistToDisk();
      return deleted;
    } else {
      const deleted = this.memoryStore.delete(cleanNs);
      this.persistToDisk();
      return deleted;
    }
  }
}

export const contextBus = new ContextBus();
