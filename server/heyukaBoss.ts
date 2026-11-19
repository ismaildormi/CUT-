/**
 * Backward-compatibility bridge -> Yuka v12.0 Unified Core (KASPI)
 * Preserves existing symbol names while routing 100% of execution,
 * Zero-Key engines, BYOK booster, and Zero-Leakage chat sanitization
 * exclusively through `server/yukaCore.ts` under the official name `Yuka`.
 */

import {
  YUKA_ZERO_KEY_REPLACEMENT_MATRIX,
  sanitizeYukaChatOutput,
  anonymizeOutboundTaskPayload,
  yukaSupremeExecuteLLM,
  executeYukaZeroKeyLedger,
  executeYukaZeroKeyNotification,
  getYukaV12SovereigntyStatus,
  type ZeroKeyReplacementEntry,
  type YukaLLMResult,
  type YukaByokConfig,
} from './yukaCore.js';

export type { ZeroKeyReplacementEntry, YukaByokConfig };
export type HeyukaLLMResult = YukaLLMResult;

export const HEYUKA_ZERO_KEY_REPLACEMENT_MATRIX = YUKA_ZERO_KEY_REPLACEMENT_MATRIX;
export const sanitizeHeyukaChatOutput = sanitizeYukaChatOutput;
export const heyukaSupremeExecuteLLM = yukaSupremeExecuteLLM;
export const executeHeyukaZeroKeyLedger = executeYukaZeroKeyLedger;
export const executeHeyukaZeroKeyNotification = executeYukaZeroKeyNotification;
export const getHeyukaZeroKeySovereigntyStatus = getYukaV12SovereigntyStatus;

export {
  anonymizeOutboundTaskPayload,
  sanitizeYukaChatOutput,
  yukaSupremeExecuteLLM,
  getYukaV12SovereigntyStatus,
};
