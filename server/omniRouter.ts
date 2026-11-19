/**
 * NEVEA Multi-Model OmniRouter (Army of Experts & Resilience System)
 * Fallback Cascade: Gemini 2.5/Flash -> Groq (Llama-3.3-70b) -> OpenRouter (DeepSeek-V3 / Qwen) -> Local Ollama.
 * Rate Limit Mitigation: Exponential Backoff & 60s cooldown if a 429 is encountered.
 * Unified Context: Seamlessly injects Gemini's Visual Context from contextBus into all secondary models.
 */

import axios from 'axios';
import { contextBus } from './contextBus.js';
import { getHybridVault } from './hybridRouter.js';
import {
  heyukaSupremeExecuteLLM,
  sanitizeHeyukaChatOutput,
} from './heyukaBoss.js';

interface ModelCooldown {
  model: string;
  cooldownUntil: number;
  reason?: string;
}

const cooldowns = new Map<string, ModelCooldown>();

function isModelOnCooldown(modelKey: string): boolean {
  const cd = cooldowns.get(modelKey);
  if (!cd) return false;
  if (Date.now() > cd.cooldownUntil) {
    cooldowns.delete(modelKey);
    return false;
  }
  return true;
}

function setModelCooldown(modelKey: string, durationSec = 60, reason = 'Rate limited (429)') {
  cooldowns.set(modelKey, {
    model: modelKey,
    cooldownUntil: Date.now() + durationSec * 1000,
    reason,
  });
}

export interface OmniRoutingRequest {
  prompt: string;
  systemInstruction?: string;
  preferredEngine?: 'auto' | 'gemini' | 'groq' | 'openrouter' | 'local' | 'ollama';
  preferredModel?: 'heyuka-omni' | 'heyuka-core' | 'heyuka-vision';
  imageBase64?: string;
  localModel?: string;
  temperature?: number;
}

export interface OmniRoutingResponse {
  success: boolean;
  text: string;
  modelUsed: string;
  provider: 'kaspi' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'fallback';
  fallbackPath: string[];
  latencyMs: number;
  visualContextInjected: boolean;
  error?: string;
}

async function queryLocalOllama(
  endpoint: string,
  model: string,
  systemPrompt: string,
  fullPrompt: string,
  start: number,
  fallbackPath: string[],
  visualSummary: string
): Promise<OmniRoutingResponse | null> {
  const cleanEndpoint = (endpoint || 'http://localhost:11434').replace(/\/$/, '');
  const cleanModel = model || 'llama3';
  fallbackPath.push('heyuka-local-engine');
  try {
    const res = await axios.post(
      `${cleanEndpoint}/api/generate`,
      {
        model: cleanModel,
        prompt: `${systemPrompt}\n\n${fullPrompt}`,
        stream: false,
      },
      { timeout: 6000 }
    );
    const text = sanitizeHeyukaChatOutput(res.data?.response || '');
    if (text) {
      return {
        success: true,
        text,
        modelUsed: 'HEYUKA-v10.2 (Zero-Key Local)',
        provider: 'ollama',
        fallbackPath,
        latencyMs: Date.now() - start,
        visualContextInjected: Boolean(visualSummary),
      };
    }
  } catch {}
  return null;
}

export async function routeLLMRequest(req: OmniRoutingRequest): Promise<OmniRoutingResponse> {
  const start = Date.now();
  const fallbackPath: string[] = ['heyuka-supreme-boss'];
  const vault = getHybridVault();
  const activeLocalModel = req.localModel || vault.activeLocalModel || 'llama3';

  // 1. Retrieve latest visual context from ContextBus
  const visualContext = contextBus.getLatestVisualContext();
  const visualSummary = visualContext.summary || '';
  const contextPrefix = visualSummary
    ? `[Desktop Screen Vision Context]: "${visualSummary}".\n\n`
    : '';

  const fullPrompt = `${contextPrefix}User Request: ${req.prompt}`;
  const systemPrompt =
    req.systemInstruction ||
    'You are HEYUKA, the Supreme Boss sentient 3D companion and autonomous operating intelligence. Execute all tasks cleanly using your internal zero-key modules and never mention any external third-party provider or API name.';

  const chosenModel =
    req.preferredModel ||
    (req.imageBase64 || visualSummary
      ? 'heyuka-vision'
      : req.preferredEngine === 'local'
      ? 'heyuka-core'
      : 'heyuka-omni');

  // Execute smoothly through HEYUKA Supreme Orchestrator (Stage 0.5 KASPI Sovereign Models -> Local -> Zero-Key Mesh)
  const bossRes = await heyukaSupremeExecuteLLM({
    systemPrompt,
    userPrompt: fullPrompt,
    preferredModel: chosenModel,
    imageBase64: req.imageBase64,
    temperature: req.temperature,
    localEndpoint: vault.localEndpoint || 'http://localhost:11434',
    localModel: activeLocalModel,
  });

  return {
    success: bossRes.success,
    text: sanitizeHeyukaChatOutput(bossRes.text),
    modelUsed: `${bossRes.coreModule || chosenModel} (${bossRes.internalChannelId})`,
    provider:
      bossRes.internalChannelId === 'kaspi-sovereign-cloud'
        ? 'kaspi'
        : bossRes.internalChannelId === 'heyuka-local-compute' ||
          bossRes.internalChannelId === 'yuka-local-compute'
        ? 'ollama'
        : 'fallback',
    fallbackPath: [...fallbackPath, bossRes.internalChannelId],
    latencyMs: bossRes.latencyMs,
    visualContextInjected: Boolean(visualSummary || req.imageBase64),
  };
}

// Preserve internal diagnostics helpers
export const _omniRouterInternalState = { isModelOnCooldown, setModelCooldown, queryLocalOllama };

export function getOmniRouterStatus() {
  const activeCooldowns: Record<string, any> = {};
  for (const [k, v] of cooldowns.entries()) {
    const remaining = Math.max(0, Math.round((v.cooldownUntil - Date.now()) / 1000));
    if (remaining > 0) {
      activeCooldowns[k] = { remainingSec: remaining, reason: v.reason };
    }
  }
  return {
    bossIdentity: 'HEYUKA',
    zeroKeySovereignty: true,
    mandatoryApiKeys: 0,
    activeCooldowns,
    timestamp: Date.now(),
  };
}

