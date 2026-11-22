import { getStoredCredential } from './hybridRouter.js';

export type KaspiModelId = 'heyuka-omni' | 'heyuka-core' | 'heyuka-vision';

export interface KaspiModelSpec {
  id: KaspiModelId;
  name: string;
  role: string;
  capabilities: string[];
  contextWindow: number;
}

export const KASPI_SOVEREIGN_MODELS: readonly KaspiModelSpec[] = [
  {
    id: 'heyuka-omni',
    name: 'HEYUKA Omni',
    role: 'Flagship Multimodal, Deep Reasoning, Swarm Orchestration & Bilingual Chat',
    capabilities: ['reasoning', 'code', 'vision', 'tools', 'arabic-darija-french-english'],
    contextWindow: 128000,
  },
  {
    id: 'heyuka-core',
    name: 'HEYUKA Core',
    role: 'High-Speed Software Engineering, Structured Tool Logic, Math/POS & RAG Synthesis',
    capabilities: ['reasoning', 'code', 'math', 'tools', 'multilingual'],
    contextWindow: 128000,
  },
  {
    id: 'heyuka-vision',
    name: 'HEYUKA Vision',
    role: 'Live Desktop Screen Understanding, Studio Image Generation, PNG Cutout & 3D Mesh Hub',
    capabilities: ['vision', 'image-gen', 'cutout', '3d', 'audio'],
    contextWindow: 128000,
  },
];

export interface KaspiAuthOverrides {
  apiKey?: string;
  keyId?: string;
  baseUrl?: string;
}

export function resolveKaspiConnection(overrides?: KaspiAuthOverrides): {
  baseUrl: string;
  apiKey: string;
  keyId: string;
  activeModel: KaspiModelId;
  configured: boolean;
} {
  const baseUrl = (
    overrides?.baseUrl ||
    process.env.KASPI_API_BASE_URL ||
    getStoredCredential('KASPI_API_BASE_URL') ||
    'https://kaspi-pos.vercel.app/api/v1'
  ).replace(/\/$/, '');

  const apiKey = (
    overrides?.apiKey ||
    process.env.HEYUKA_API_KEY ||
    process.env.KASPI_API_KEY ||
    getStoredCredential('HEYUKA_API_KEY') ||
    ''
  ).trim();

  const keyId = (
    overrides?.keyId ||
    process.env.HEYUKA_KEY_ID ||
    process.env.KASPI_KEY_ID ||
    getStoredCredential('HEYUKA_KEY_ID') ||
    ''
  ).trim();

  const storedModel = (
    process.env.HEYUKA_ACTIVE_MODEL ||
    getStoredCredential('HEYUKA_ACTIVE_MODEL') ||
    'heyuka-omni'
  ).trim();

  const activeModel: KaspiModelId =
    storedModel === 'heyuka-core' || storedModel === 'heyuka-vision'
      ? storedModel
      : 'heyuka-omni';

  return {
    baseUrl,
    apiKey,
    keyId,
    activeModel,
    configured: Boolean(apiKey),
  };
}

function buildKaspiHeaders(auth: { apiKey: string; keyId: string }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'HEYUKA-Desktop-CUT/1.0 (+https://kaspi-pos.vercel.app)',
  };
  if (auth.apiKey) headers.Authorization = `Bearer ${auth.apiKey}`;
  if (auth.keyId) headers['X-API-Key-Id'] = auth.keyId;
  return headers;
}

export interface KaspiChatResponse {
  ok: boolean;
  text: string;
  model: KaspiModelId;
  latencyMs: number;
  statusCode?: number;
  error?: string;
}

/**
 * Calls KASPI Sovereign OpenAI-compatible Chat Completions endpoint (`heyuka-omni`, `heyuka-core`, `heyuka-vision`).
 * Automatically structures multimodal `image_url` payloads when `imageBase64` is provided.
 */
export async function callKaspiChat(params: {
  model?: KaspiModelId;
  systemPrompt?: string;
  userPrompt: string;
  imageBase64?: string;
  maxTokens?: number;
  temperature?: number;
  overrides?: KaspiAuthOverrides;
}): Promise<KaspiChatResponse> {
  const start = Date.now();
  const conn = resolveKaspiConnection(params.overrides);
  const selectedModel: KaspiModelId =
    params.imageBase64 && !params.model
      ? 'heyuka-vision'
      : params.model || conn.activeModel;

  const rootBaseUrl = conn.baseUrl.endsWith('/api/v1')
    ? conn.baseUrl.slice(0, -'/api/v1'.length)
    : conn.baseUrl;

  const userContent: any = params.imageBase64
    ? [
        { type: 'text', text: params.userPrompt },
        {
          type: 'image_url',
          image_url: {
            url: params.imageBase64.startsWith('data:')
              ? params.imageBase64
              : `data:image/jpeg;base64,${params.imageBase64}`,
          },
        },
      ]
    : params.userPrompt;

  // Stage 1: Direct KASPI Chat Completions when API key is configured
  if (conn.apiKey) {
    try {
      const resp = await fetch(`${conn.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildKaspiHeaders(conn),
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
            { role: 'user', content: userContent },
          ],
          max_tokens: params.maxTokens || 1024,
          temperature: params.temperature ?? 0.5,
        }),
        signal: AbortSignal.timeout(22000),
      });

      const data: any = await resp.json().catch(() => ({}));
      const reply = String(
        data?.choices?.[0]?.message?.content ||
          data?.text ||
          data?.output ||
          ''
      ).trim();
      if (resp.ok && reply) {
        return {
          ok: true,
          text: reply,
          model: selectedModel,
          statusCode: resp.status,
          latencyMs: Date.now() - start,
        };
      }
    } catch {
      // Fall through cleanly to unlimited zero-key local/edge cascade
    }
  }

  // Stage 2: Unlimited Client-Compute Cascade (Local Ollama -> Local Node 4040 -> Zero-Key Sovereign Local-SDK)
  try {
    const ollamaHost = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const ollamaResp = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.YUKA_LOCAL_MODEL || 'llama3',
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          { role: 'user', content: params.userPrompt },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (ollamaResp.ok) {
      const oData: any = await ollamaResp.json().catch(() => ({}));
      const oReply = String(oData?.message?.content || oData?.response || '').trim();
      if (oReply) {
        return {
          ok: true,
          text: oReply,
          model: selectedModel,
          statusCode: 200,
          latencyMs: Date.now() - start,
        };
      }
    }
  } catch {}

  for (const sdkUrl of [
    'http://127.0.0.1:4040/api/v1/heyuka/local-sdk',
    `${rootBaseUrl}/api/v1/heyuka/local-sdk`,
  ]) {
    try {
      const sdkResp = await fetch(sdkUrl, {
        method: 'POST',
        headers: buildKaspiHeaders(conn),
        body: JSON.stringify({
          prompt: params.userPrompt,
          mode: 'auto',
          locale: 'ar',
        }),
        signal: AbortSignal.timeout(18000),
      });
      if (sdkResp.ok) {
        const sData: any = await sdkResp.json().catch(() => ({}));
        const sReply = String(sData?.answer || sData?.reply || '').trim();
        if (sReply) {
          return {
            ok: true,
            text: sReply,
            model: selectedModel,
            statusCode: 200,
            latencyMs: Date.now() - start,
          };
        }
      }
    } catch {}
  }

  return {
    ok: false,
    text: '',
    model: selectedModel,
    latencyMs: Date.now() - start,
    error: 'All KASPI local & cloud endpoints unreachable',
  };
}

export async function callKaspiImageGenerate(
  prompt: string,
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; imageUrl?: string; model: string; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, model: 'heyuka-vision', error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(`${conn.baseUrl}/images/generate`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify({ prompt, model: 'heyuka-vision' }),
      signal: AbortSignal.timeout(25000),
    });
    const data: any = await resp.json().catch(() => ({}));
    const imageUrl = data?.imageUrl || data?.url || data?.data?.[0]?.url;
    if (resp.ok && imageUrl) {
      return { ok: true, imageUrl: String(imageUrl), model: 'heyuka-vision' };
    }
    return { ok: false, model: 'heyuka-vision', error: data?.error || `HTTP ${resp.status}` };
  } catch (err: any) {
    return { ok: false, model: 'heyuka-vision', error: err?.message || 'Image request failed' };
  }
}

export async function callKaspiRemoveBg(
  payload: { imageBase64?: string; imageUrl?: string },
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; imageUrl?: string; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(`${conn.baseUrl}/vision/remove-bg`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return {
      ok: Boolean(resp.ok && (data?.imageUrl || data?.url)),
      imageUrl: data?.imageUrl || data?.url,
      error: data?.error,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Remove-bg failed' };
  }
}

export async function callKaspi3DAssets(
  q: string,
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; assets?: any[]; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(
      `${conn.baseUrl}/3d/assets?q=${encodeURIComponent(q)}&type=models&limit=6`,
      { headers: buildKaspiHeaders(conn), signal: AbortSignal.timeout(15000) }
    );
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, assets: data?.assets || data?.items || data?.data || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || '3D assets failed' };
  }
}

export async function callKaspi3DGenerate(
  prompt: string,
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; meshUrl?: string; meshData?: any; model: string; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, model: 'heyuka-vision', error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(`${conn.baseUrl}/3d/generate`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify({ prompt, model: 'heyuka-vision' }),
      signal: AbortSignal.timeout(25000),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (resp.ok) {
      return {
        ok: true,
        meshUrl: data?.meshUrl || data?.glbUrl || data?.url,
        meshData: data?.meshData || data,
        model: 'heyuka-vision',
      };
    }
    return { ok: false, model: 'heyuka-vision', error: data?.error || `HTTP ${resp.status}` };
  } catch (err: any) {
    return { ok: false, model: 'heyuka-vision', error: err?.message || '3D generation failed' };
  }
}

export async function callKaspiWebResearch(
  query: string,
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; results?: any[]; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(`${conn.baseUrl}/web/research`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(18000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: Boolean(resp.ok && data?.ok !== false), results: data?.results || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Web research failed' };
  }
}

export async function callKaspiCodeSandbox(
  language: string,
  code: string,
  overrides?: KaspiAuthOverrides
): Promise<{ ok: boolean; stdout?: string; stderr?: string; error?: string }> {
  const conn = resolveKaspiConnection(overrides);
  if (!conn.apiKey) return { ok: false, error: 'No HEYUKA_API_KEY' };
  try {
    const resp = await fetch(`${conn.baseUrl}/sandbox/execute`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify({ language, code }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, stdout: data?.stdout, stderr: data?.stderr, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Sandbox failed' };
  }
}

export async function callKaspiSpawnDesktopBot(
  payload: {
    action?: 'spawn' | 'list' | 'takeover' | 'resume' | 'destroy';
    task?: string;
    role?: string;
    displayEngine?: string;
    botId?: string;
  },
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  try {
    const resp = await fetch(`${conn.baseUrl}/desktops/spawn`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Desktop bot spawn failed' };
  }
}

export async function callKaspiOsExec(
  payload: {
    action?: 'shell' | 'file_lifecycle' | 'sentinel_health' | 'app_operate';
    command?: string;
    targetPath?: string;
    appTitle?: string;
    editSnippet?: string;
  },
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  try {
    const resp = await fetch(`${conn.baseUrl}/os/exec`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'OS exec plan failed' };
  }
}

export async function callKaspiAiPcControl(
  payload: {
    action?: 'scroll' | 'zoom' | 'self_unblock' | 'webcam_vision' | 'panic_stop' | 'dispatch';
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    zoomDelta?: number;
    blockedReason?: string;
    cameraMode?: string;
    prompt?: string;
  },
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  try {
    const resp = await fetch(`${conn.baseUrl}/ai-pc/control`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'AI PC control failed' };
  }
}

export async function callKaspiSearchVault(
  query = '',
  limit = 25,
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  const rootBaseUrl = conn.baseUrl.endsWith('/api/v1')
    ? conn.baseUrl.slice(0, -'/api/v1'.length)
    : conn.baseUrl;
  const qs = new URLSearchParams({ vault: '1', limit: String(limit) });
  if (query.trim()) qs.set('q', query.trim());
  try {
    const resp = await fetch(`${rootBaseUrl}/api/v1/heyuka/local-sdk?${qs.toString()}`, {
      headers: buildKaspiHeaders(conn),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Vault search failed' };
  }
}

export async function callKaspiStudioCouncil(
  payload: {
    prompt: string;
    scale?: 'auto' | '3x_fast' | '6x_pro' | '12x_titan';
    brand?: 'heyuka' | 'kaspi_pos';
    locale?: 'ar' | 'fr' | 'en';
  },
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  try {
    const resp = await fetch(`${conn.baseUrl}/studio/council`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Studio Elastic Council failed' };
  }
}

export async function callKaspiMagic(
  payload: {
    prompt: string;
    brand?: 'heyuka' | 'kaspi_pos';
    scale?: 'auto' | '3x_fast' | '6x_pro' | '12x_titan';
    locale?: 'ar' | 'fr' | 'en';
    enhanceOnly?: boolean;
  },
  overrides?: KaspiAuthOverrides
) {
  const conn = resolveKaspiConnection(overrides);
  try {
    const resp = await fetch(`${conn.baseUrl}/magic`, {
      method: 'POST',
      headers: buildKaspiHeaders(conn),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, ...data };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Magic engine call failed' };
  }
}

export async function getKaspiModelsCatalog(overrides?: KaspiAuthOverrides) {
  const conn = resolveKaspiConnection(overrides);
  let liveReachable = false;
  let authValid: boolean | null = null;
  let remoteModels: any[] = [];
  let probeLatencyMs = 0;
  const t0 = Date.now();

  try {
    const resp = await fetch(`${conn.baseUrl}/models`, {
      headers: buildKaspiHeaders(conn),
      signal: AbortSignal.timeout(8000),
    });
    probeLatencyMs = Date.now() - t0;
    if (resp.ok) {
      liveReachable = true;
      const json: any = await resp.json().catch(() => ({}));
      remoteModels = Array.isArray(json?.data) ? json.data : [];
      if (json?.authCheck?.checked) {
        authValid = Boolean(json.authCheck.valid);
      }
    }
  } catch {
    probeLatencyMs = Date.now() - t0;
  }

  return {
    baseUrl: conn.baseUrl,
    configured: conn.configured,
    zeroKeyReady: true,
    unlimitedRequests: true,
    cognitiveClusters: 18,
    v52_v54_ready: true,
    v55_v60_studioReady: true,
    studioUrl: 'https://kaspi-pos.vercel.app/ar/studio?brand=heyuka',
    hasKeyId: Boolean(conn.keyId),
    activeModel: conn.activeModel,
    liveReachable,
    authValid,
    probeLatencyMs,
    models: remoteModels.length > 0 ? remoteModels : KASPI_SOVEREIGN_MODELS,
  };
}
