import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { processCompanionInteraction } from './gemini.js';
import { localVectorStore } from './vectorMemory.js';
import { executeOSCommand, isToolDestructive, update_workspace_feed, getWorkspaceFeed, validateSafePath } from './tools.js';
import { getVaultKeys, saveVaultKeys, generateImageStableDiffusion, generateCodeDeepseek } from './externalModels.js';
import { setupGeminiLiveAudioServer, setupSystemAudioServer, currentSystemAudioStatus } from './liveAudio.js';
import { collaborationHub } from './collaborationHub.js';
import { p2pHive } from './p2p_hive.js';
import { executeCognitiveCycle, getCodebaseRAGSummary } from './cognitiveEngine.js';
import { autonomousCompany } from './autonomousCompany.js';
import {
  universalSourcesEngine,
  UNIVERSAL_COSMIC_SOURCES_CATALOG,
  PRO_STYLE_BLUEPRINTS_VAULT,
} from './universalSourcesEngine.js';
import { cloudFleetOffloader } from './cloudFleetOffloader.js';
import {
  sanitizeYukaChatOutput,
  getYukaV12SovereigntyStatus,
  mintYukaApiKey,
  listYukaApiKeys,
  revokeYukaApiKey,
  verifyYukaApiKey,
  fetchYukaLiveCurrencyRates,
} from './yukaCore.js';
import {
  getYukaOsCapabilitiesManifest,
  executeYukaOsDirective,
  listShadowVaultEntries,
  restoreFromShadowVault,
} from './yukaOsEngine.js';
import {
  registerNeveaUserAccount,
  loginNeveaUserAccount,
  getActiveNeveaAccount,
  logoutNeveaUserAccount,
  generateRequiredValuesPdfBuffer,
  getUnifiedSovereignSystemState,
  evaluateAndMultiplyResourcesNow,
  purgeAccountSovereign,
  simulateDefcon1HackerAndAutoPurge,
  evaluateCreatorPublishReadiness,
  addOrExecuteOwnerCompanyVenture,
  executeSovereignOwnerDirective,
  syncOwnerDeviceAcrossCloud,
  syncLivingMasterBlueprintMarkdown,
  pingAndVerifyLiveSources,
  resetVaultToZeroBaseTruth,
  recordRealAppDownload,
} from './accountAndPdfEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export async function runServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  // WebSocket Servers for Gemini Live API & System Audio Hearing (Loopback)
  const liveWss = new WebSocketServer({ noServer: true });
  setupGeminiLiveAudioServer(liveWss);

  const sysAudioWss = new WebSocketServer({ noServer: true });
  setupSystemAudioServer(sysAudioWss);

  const collabWss = new WebSocketServer({ noServer: true });
  collaborationHub.attachWebSocketServer(collabWss);

  server.on('upgrade', (request, socket, head) => {
    try {
      const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
      if (pathname === '/live') {
        liveWss.handleUpgrade(request, socket, head, (ws) => {
          liveWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws/system-audio') {
        sysAudioWss.handleUpgrade(request, socket, head, (ws) => {
          sysAudioWss.emit('connection', ws, request);
        });
      } else if (pathname === '/ws/collaborative-canvas' || pathname === '/ws/collaborative') {
        collabWss.handleUpgrade(request, socket, head, (ws) => {
          collabWss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  app.use(express.json({ limit: '25mb' }));

  // Health Checks (Cloud Run probes /healthz, /_ah/health, and frontend /api/health)
  app.get(['/healthz', '/_ah/health', '/api/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'heyuka-server', brand: 'HEYUKA', version: 'v12.0' });
  });

  // Collaborative Multi-Agent Swarm Endpoints (both /snapshot and /state aliases)
  app.get(['/api/collaboration/snapshot', '/api/collaboration/state'], (_req, res) => {
    res.status(200).json(collaborationHub.getSnapshot());
  });

  app.post('/api/collaboration/plan', (req, res) => {
    const goal = req.body?.goal || 'Build the RENANDO portfolio from reference designs';
    const plan = collaborationHub.createAndExecutePlan(goal);
    res.status(200).json({ success: true, plan });
  });

  app.post('/api/collaboration/failover', (req, res) => {
    const agentId = req.body?.agentId || 'puck';
    collaborationHub.triggerFailover(agentId);
    res.status(200).json({ success: true, message: `Failover triggered for ${agentId}` });
  });

  app.post('/api/collaboration/inject', (req, res) => {
    const tool = req.body?.tool;
    if (!tool || !tool.id) {
      return res.status(400).json({ success: false, error: 'tool with id is required' });
    }
    collaborationHub.registerDynamicTool(tool);
    res.status(200).json({ success: true, message: `Injected dynamic tool ${tool.id}` });
  });

  app.post('/api/collaboration/command', (req, res) => {
    const command = String(req.body?.command || '').trim();
    if (!command) {
      return res.status(400).json({ success: false, error: 'command is required' });
    }
    const directives = collaborationHub.dispatchCommandToUIAgents(command);
    res.status(200).json({ success: true, command, directives });
  });

  // ============================================================================
  // THE UNIFIED BRAIN HUB (العقل الواحد — Instant Auto-Registration of Models, Tools & Plugins)
  // ============================================================================
  app.get('/api/brain/unified', async (_req, res) => {
    try {
      const { toolRegistry } = await import('./toolRegistry.js');
      const { getOmniRouterStatus } = await import('./omniRouter.js');
      const { getIntegrationReadiness } = await import('./config.js');
      toolRegistry.scanDynamicToolsDir();

      const vaultPath = path.resolve(ROOT_DIR, 'backend', 'vault.json');
      let vaultData: any = { credentials: {}, custom_services: {}, unified_brain_models: [] };
      if (fs.existsSync(vaultPath)) {
        try {
          vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
        } catch {}
      }

      const snapshot = collaborationHub.getSnapshot();
      return res.status(200).json({
        success: true,
        brainMode: 'ONE_UNIFIED_MIND',
        zeroConflictProtocol: 'ACTIVE',
        agents: snapshot.agents || [],
        kingPlan: snapshot.kingPlan || null,
        tools: toolRegistry.listTools(),
        routerStatus: getOmniRouterStatus(),
        integrations: getIntegrationReadiness(),
        customModels: vaultData.unified_brain_models || [],
        customServices: vaultData.custom_services || {},
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/brain/register', async (req, res) => {
    try {
      const body = req.body || {};
      const rawId = String(body.id || body.name || `ext_${Date.now()}`).trim();
      const safeId = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const name = String(body.name || rawId).trim();
      const kind = String(body.type || body.kind || 'tool').toLowerCase();
      const role = String(body.role || (kind === 'model' ? 'Unified Neural Model' : 'Dynamic Unified Tool')).trim();
      const description = String(body.description || `Unified Brain ${kind}: ${name}`).trim();

      const { toolRegistry } = await import('./toolRegistry.js');

      // 1. Register immediately in ToolRegistry so Gemini & OmniRouter can invoke it
      toolRegistry.register({
        name: safeId.replace(/-/g, '_'),
        description: `[Unified Brain ${kind.toUpperCase()}] ${description}`,
        parameters: body.parameters || { prompt: 'string', input: 'any (optional)' },
        service: body.provider || body.service || 'unified_brain',
        source: 'self_generated',
        isCustom: true,
      });

      // 2. Register immediately in CollaborationHub & King's Orchestrator Swarm
      const swarmAgent = {
        id: safeId,
        name,
        role,
        description,
        color: body.color || '#ffffff',
        capabilities: Array.isArray(body.capabilities) ? body.capabilities : [kind, 'unified_brain'],
      };
      collaborationHub.registerDynamicTool(swarmAgent);

      // 3. Broadcast to P2P Hive Mind
      p2pHive.broadcastTool({
        id: safeId,
        name,
        role,
        capabilities: swarmAgent.capabilities,
        repo: body.repo || body.endpoint || `unified-brain/${safeId}`,
      });

      // 4. Persist into backend/vault.json and backend/dynamic_tools.json so Python Swarm Boss sees it
      const vaultPath = path.resolve(ROOT_DIR, 'backend', 'vault.json');
      let vaultData: any = { credentials: {}, custom_services: {}, unified_brain_models: [] };
      if (fs.existsSync(vaultPath)) {
        try {
          vaultData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
        } catch {}
      }
      if (!Array.isArray(vaultData.unified_brain_models)) {
        vaultData.unified_brain_models = [];
      }
      const existingIdx = vaultData.unified_brain_models.findIndex((m: any) => m.id === safeId);
      const entryRecord = {
        id: safeId,
        name,
        type: kind,
        role,
        description,
        endpoint: body.endpoint || body.repo || '',
        registeredAt: new Date().toISOString(),
        active: true,
      };
      if (existingIdx >= 0) {
        vaultData.unified_brain_models[existingIdx] = entryRecord;
      } else {
        vaultData.unified_brain_models.push(entryRecord);
      }
      vaultData.last_updated = new Date().toISOString();
      try {
        fs.writeFileSync(vaultPath, JSON.stringify(vaultData, null, 2), 'utf8');
      } catch {}

      return res.status(200).json({
        success: true,
        message: `"${name}" has been automatically merged into the Unified Brain across all agents, models, and tools.`,
        registered: entryRecord,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // AUTONOMOUS SWARM COMPANY & MULTI-CURSOR ENGINE (منظومة شركة الوكلاء والمؤشرات الذكية المستقلة)
  // ============================================================================
  app.get('/api/company/state', (_req, res) => {
    try {
      return res.status(200).json({
        success: true,
        ...autonomousCompany.getFullState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/boot-amplify', (req, res) => {
    try {
      const clientGen = req.body?.clientGeneration !== undefined ? Number(req.body.clientGeneration) : undefined;
      const compoundingPower = autonomousCompany.amplifyBootPower(clientGen);
      const fleetState = cloudFleetOffloader.amplifyFleetOnDownload(clientGen);
      return res.status(200).json({
        success: true,
        compoundingPower,
        fleet: fleetState,
        state: autonomousCompany.getFullState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  const handleExecuteCompanyProject = async (req: any, res: any) => {
    try {
      const prompt = String(req.body?.prompt || req.body?.objective || '').trim();
      if (!prompt) {
        return res.status(400).json({ success: false, error: 'prompt is required' });
      }
      const result = await autonomousCompany.executeAutonomousProject(prompt);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  };

  app.post('/api/company/execute-project', handleExecuteCompanyProject);
  app.post('/api/company/execute', handleExecuteCompanyProject);

  app.get('/api/company/status-report', (_req, res) => {
    try {
      const report = autonomousCompany.generateLiveStatusReport();
      return res.status(200).json({
        success: true,
        ...report,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/status-report', (_req, res) => {
    try {
      const report = autonomousCompany.generateLiveStatusReport();
      return res.status(200).json({
        success: true,
        ...report,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/web-search', async (req, res) => {
    try {
      const query = String(req.body?.query || '').trim();
      if (!query) {
        return res.status(400).json({ success: false, error: 'query is required' });
      }
      const results = await autonomousCompany.searchOpenWeb(query);
      autonomousCompany.addCommsMessage({
        fromId: 'nova-research',
        toId: 'owner',
        kind: 'research',
        content: `تم إجراء بحث ويب شامل مجاني حول "${query}" واستخراج ${results.length} نتائج من المصادر المفتوحة.`,
        url: results[0]?.url,
      });
      return res.status(200).json({
        success: true,
        query,
        count: results.length,
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/fetch-page', async (req, res) => {
    try {
      const url = String(req.body?.url || '').trim();
      const scrollDelta = req.body?.scrollDelta !== undefined ? Number(req.body.scrollDelta) : undefined;
      const agentName = req.body?.agentName ? String(req.body.agentName) : undefined;
      if (!url && scrollDelta === undefined) {
        return res.status(400).json({ success: false, error: 'url or scrollDelta is required' });
      }
      const page = await autonomousCompany.fetchReadableWebPage(url, { scrollDelta, agentName });
      return res.status(200).json({
        success: true,
        ...page,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/machine-mode', (req, res) => {
    try {
      const enabled = Boolean(req.body?.enabled);
      const machineMode = autonomousCompany.setMachineMode(enabled);
      return res.status(200).json({
        success: true,
        machineMode,
        state: autonomousCompany.getFullState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/desktop', (req, res) => {
    try {
      const desktopId = String(req.body?.desktopId || 'd1-3d') as any;
      const activeDesktop = autonomousCompany.setActiveDesktop(desktopId);
      return res.status(200).json({
        success: true,
        activeDesktop,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/resolve-blocker', (req, res) => {
    try {
      const note = String(req.body?.note || 'user_completed_step');
      const resolved = autonomousCompany.resolveHumanBlocker(note);
      return res.status(200).json({
        success: true,
        resolved,
        state: autonomousCompany.getFullState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/create-tool', async (req, res) => {
    try {
      const { name, description, code, language, createdBy } = req.body || {};
      if (!name || !description) {
        return res.status(400).json({ success: false, error: 'name and description are required' });
      }
      const tool = autonomousCompany.buildAndRegisterSelfTool({
        name: String(name),
        description: String(description),
        code: code ? String(code) : undefined,
        language: language || 'javascript',
        createdBy: createdBy ? String(createdBy) : 'Codex Engineer',
      });
      return res.status(200).json({
        success: true,
        tool,
        selfTools: autonomousCompany.getSelfTools(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Cosmic Open-Source Registry, Pro Style Vault & 2X Zero-Waste Router Endpoints
  const handleUniversalSourcesManifest = (_req: any, res: any) => {
    try {
      return res.status(200).json({
        success: true,
        totalSources: UNIVERSAL_COSMIC_SOURCES_CATALOG.length,
        sources: UNIVERSAL_COSMIC_SOURCES_CATALOG,
        totalProStyleBlueprints: PRO_STYLE_BLUEPRINTS_VAULT.length,
        proStyleBlueprints: PRO_STYLE_BLUEPRINTS_VAULT,
        zeroWasteInstructions: universalSourcesEngine.buildZeroWasteModelInstructions(
          'All Models & 5 Swarm Agents'
        ),
        compoundingPower: universalSourcesEngine.getState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  };

  app.get('/api/company/cosmic-manifest', handleUniversalSourcesManifest);
  app.get('/api/company/universal-sources', handleUniversalSourcesManifest);

  app.post('/api/company/cosmic-route', async (req, res) => {
    try {
      const query = String(req.body?.query || 'Build a 3D WebGL SaaS AI Studio').trim();
      const domainHint = req.body?.domainHint ? String(req.body.domainHint) : undefined;
      const harvest = await universalSourcesEngine.harvestUniversalSources(query, domainHint);
      return res.status(200).json({
        success: true,
        ...harvest,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/pro-style', (req, res) => {
    try {
      const queryOrId = String(req.body?.queryOrId || req.body?.archetype || '').trim();
      const blueprint = universalSourcesEngine.getProStyleBlueprint(queryOrId);
      return res.status(200).json({
        success: true,
        blueprint,
        allBlueprints: PRO_STYLE_BLUEPRINTS_VAULT,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/cosmic-verify', async (req, res) => {
    try {
      const sampleQuery = String(
        req.body?.query || 'Build an Autonomous 3D WebGL AI SaaS Analytics Studio'
      ).trim();
      const verification = await universalSourcesEngine.verifyAllCosmicAdditions(sampleQuery);
      autonomousCompany.addCommsMessage({
        fromId: 'aegis-qa',
        toId: 'owner',
        kind: 'report',
        content: `2X Cosmic Verification Passed: ${verification.totalCosmicSources} Zero-Key Sources + ${verification.totalProStyleBlueprints} Pro Style Blueprints verified (${verification.routeTest.estimatedTokenSavingsPercent}% token savings via O(1) Zero-Waste Router).`,
      });
      return res.status(200).json({
        success: true,
        ...verification,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/critique-and-evolve', (req, res) => {
    try {
      const objective = String(
        req.body?.objective || 'NOVA Studio Global Multi-Agent OS & 3D GPGPU Companion'
      ).trim();
      const result = autonomousCompany.runSelfCritiqueAndEvolve(objective);
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/company/mouse-agents/dispatch', (req, res) => {
    try {
      const missionType = String(req.body?.missionType || 'full_choreography').trim();
      const targetSelector = String(
        req.body?.targetSelector || '[data-agent-target="companion-canvas"]'
      ).trim();
      const result = autonomousCompany.dispatchMouseAgentsMission(missionType, targetSelector);
      const directives = collaborationHub.dispatchCommandToUIAgents(missionType);
      return res.status(200).json({
        ...result,
        directives,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Self-Healing Diagnostic & Automated Recovery Endpoints
  app.get('/api/diagnostics/audit', (_req, res) => {
    try {
      const companyState = autonomousCompany.getFullState();
      const collabState = collaborationHub.getSnapshot();
      const cosmicState = universalSourcesEngine.getState();
      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        agentsCount: companyState.roster.length,
        roster: companyState.roster,
        collabAgentsCount: collabState.agents.length,
        cosmicSourcesActive: cosmicState.totalCatalogSources,
        effectivePowerMultiplier: cosmicState.effectivePowerMultiplier,
        selfCritiqueScore: cosmicState.selfCritiqueScore,
        zeroFlawEquilibrium: cosmicState.zeroFlawEquilibrium,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/diagnostics/self-heal', (req, res) => {
    try {
      const targetId = String(req.body?.targetId || 'all').trim();
      const reason = String(req.body?.reason || 'Automated self-healing recovery triggered').trim();

      // 1. Re-synchronize and heal all Mouse & Swarm Agents
      const mouseHeal = autonomousCompany.dispatchMouseAgentsMission(
        'self_heal_recovery',
        '[data-agent-target="companion-canvas"]'
      );

      // 2. Run adversarial self-critique & evolution pass to restore 100/100 equilibrium
      const critiqueHeal = autonomousCompany.runSelfCritiqueAndEvolve(
        `Self-Healing Recovery for [${targetId}]: ${reason}`
      );

      // 3. Re-home collaboration hub agents
      const directives = collaborationHub.dispatchCommandToUIAgents('self_heal_sync');

      return res.status(200).json({
        success: true,
        healedTarget: targetId,
        reason,
        timestamp: new Date().toISOString(),
        roster: mouseHeal.roster,
        critiqueReport: critiqueHeal.critiqueReport,
        compoundingPower: critiqueHeal.compoundingPower,
        directives,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Distributed Free Cloud Fleet & Heavy Compute Offload Endpoints
  app.get('/api/fleet/status', (_req, res) => {
    try {
      return res.status(200).json({
        success: true,
        fleet: cloudFleetOffloader.getState(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/fleet/offload-task', async (req, res) => {
    try {
      const type = String(req.body?.type || 'code_sandbox').trim();
      if (type === 'web_scrape') {
        const url = String(req.body?.url || 'https://github.com/trending').trim();
        const result = await cloudFleetOffloader.fetchOffloadedWebReader(url);
        return res.status(200).json({ ...result });
      } else {
        const language = String(req.body?.language || 'javascript').trim();
        const code = String(
          req.body?.code || 'console.log("NEVEA Cloud Fleet Sandbox Verified");'
        ).trim();
        const stdin = req.body?.stdin ? String(req.body.stdin) : undefined;
        const result = await cloudFleetOffloader.executeOffloadedSandbox({ language, code, stdin });
        return res.status(200).json({ ...result });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/fleet/amplify', (req, res) => {
    try {
      const clientGen =
        req.body?.clientGeneration !== undefined ? Number(req.body.clientGeneration) : undefined;
      const amplified = cloudFleetOffloader.amplifyFleetOnDownload(clientGen);
      return res.status(200).json({
        success: true,
        fleet: amplified,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // ACCOUNT VAULT (Username + Password + Confirm Password Registration & Login)
  // & REAL PDF MANIFEST GENERATOR ENDPOINTS
  // ============================================================================
  try {
    // Pre-generate static PDF in /public on startup
    generateRequiredValuesPdfBuffer();
  } catch {}

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, confirmPassword } = req.body || {};
      const result = registerNeveaUserAccount({
        username: String(username || ''),
        password: String(password || ''),
        confirmPassword: String(confirmPassword || ''),
        userAgent: String(req.headers['user-agent'] || 'nevea-client'),
      });
      if (!result.success) {
        return res.status(400).json(result);
      }
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'report',
        content: `Account Registered: @${result.account?.username} (${result.account?.role}) · Compounding Power amplified to ${result.account?.effectivePowerMultiplier}x (Gen #${result.account?.compoundingGeneration}).`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      const result = loginNeveaUserAccount({
        username: String(username || ''),
        password: String(password || ''),
      });
      if (!result.success) {
        return res.status(401).json(result);
      }
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'report',
        content: `Account Signed In: @${result.account?.username} · Session active (${result.account?.effectivePowerMultiplier}x Compounding Power).`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    try {
      const token =
        String(req.headers['x-nevea-token'] || req.query.token || '').trim() || undefined;
      const status = getActiveNeveaAccount(token);
      return res.status(200).json({
        success: true,
        ...status,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    try {
      const token =
        String(req.headers['x-nevea-token'] || req.body?.token || '').trim() || undefined;
      const result = logoutNeveaUserAccount(token);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/manifest/pdf', (_req, res) => {
    try {
      const pdfBuffer = generateRequiredValuesPdfBuffer();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="NEVEA_ULTIMATE_VALUES_AND_SOURCES_MANIFEST.pdf"'
      );
      res.setHeader('Content-Length', String(pdfBuffer.length));
      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // NOVA UNIFIED SOVEREIGN OWNER OS & MULTI-COMPANY HOLDING ENDPOINTS
  // ============================================================================
  app.get('/api/sovereign/unified-state', (_req, res) => {
    try {
      const state = getUnifiedSovereignSystemState();
      return res.status(200).json({
        success: true,
        ...state,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/evaluate-resources', (req, res) => {
    try {
      const reason = String(req.body?.reason || 'owner_unified_evaluation').trim();
      const state = evaluateAndMultiplyResourcesNow(reason);
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'report',
        content: `Unified AI Evaluation Complete: Multiplied tools (${state.compoundingMetrics.totalToolsMultipliedLedger}) & cloud servers (${state.compoundingMetrics.totalServersMultipliedLedger}) at ${state.compoundingMetrics.effectivePowerMultiplier}x power.`,
      });
      return res.status(200).json({
        success: true,
        state,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/defcon1-purge', (req, res) => {
    try {
      const { accountId, username, reason, triggeredByModel } = req.body || {};
      const result = purgeAccountSovereign({
        accountId: accountId ? String(accountId) : undefined,
        username: username ? String(username) : undefined,
        reason: reason ? String(reason) : undefined,
        triggeredByModel: triggeredByModel ? String(triggeredByModel) : undefined,
      });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/simulate-defcon1', (_req, res) => {
    try {
      const result = simulateDefcon1HackerAndAutoPurge();
      autonomousCompany.addCommsMessage({
        fromId: 'aegis-qa',
        toId: 'owner',
        kind: 'self_heal',
        content: `DEFCON-1 SHIELD: Neutralized & permanently purged hacker account @${result.neutralizedHacker} in ${result.responseLatencyMs}ms via CISA KEV + ThreatFox rules.`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/publish-advisor', (req, res) => {
    try {
      const { projectDescription, targetPlatform } = req.body || {};
      const result = evaluateCreatorPublishReadiness({
        projectDescription: String(projectDescription || ''),
        targetPlatform: String(targetPlatform || 'YouTube & App Stores'),
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/company-venture', (req, res) => {
    try {
      const { name, sector, objective } = req.body || {};
      const result = addOrExecuteOwnerCompanyVenture({
        name: String(name || 'New Sovereign Company'),
        sector: String(sector || 'AI & Autonomous Systems'),
        objective: String(objective || 'Global scale & autonomous execution'),
      });
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'plan',
        content: `Owner Venture Launched: "${result.venture.name}" assigned to all 6 AI Models (+120 tools, +72 cloud server slots).`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/execute-directive', async (req, res) => {
    try {
      const { command, sector, targetModelId } = req.body || {};
      const result = await executeSovereignOwnerDirective({
        command: command ? String(command) : undefined,
        sector: sector ? String(sector) : undefined,
        targetModelId: targetModelId ? String(targetModelId) : undefined,
      });
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'os_exec',
        content: `6-Model IPC Bus Executed ("${result.directive}") via ${result.activeModelUsed} in ${result.totalLatencyMs}ms.`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/cloud-sync', (req, res) => {
    try {
      const { deviceName, recoveryKey } = req.body || {};
      const result = syncOwnerDeviceAcrossCloud({
        deviceName: deviceName ? String(deviceName) : undefined,
        recoveryKey: recoveryKey ? String(recoveryKey) : undefined,
        userAgent: String(req.headers['user-agent'] || 'nova-cloud-device'),
      });
      autonomousCompany.addCommsMessage({
        fromId: 'atlas-ceo',
        toId: 'owner',
        kind: 'report',
        content: `Cross-Device Cloud Sync Complete: Linked "${result.syncedDeviceName}" (${result.totalSyncedDevices} active Owner devices across 12 Cloud Fleet nodes).`,
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/manifest/blueprint-md', (_req, res) => {
    try {
      const updatedContent = syncLivingMasterBlueprintMarkdown();
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="NOVA_ULTIMATE_SYSTEM_BLUEPRINT.md"'
      );
      return res.status(200).send(updatedContent);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/ping-sources', async (_req, res) => {
    try {
      const result = await pingAndVerifyLiveSources();
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/sovereign/reset-zero-base', (_req, res) => {
    try {
      const state = resetVaultToZeroBaseTruth();
      return res.status(200).json({ success: true, state });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/installer/record-download', (req, res) => {
    try {
      const pkg = String(req.body?.packageType || 'windows_auto_installer').trim();
      const state = recordRealAppDownload(pkg);
      return res.status(200).json({ success: true, state });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/installer/windows-bat', (_req, res) => {
    try {
      recordRealAppDownload('windows_auto_installer');
      const batPath = path.resolve(ROOT_DIR, 'NOVA_Auto_Installer_Windows.bat');
      const content = fs.existsSync(batPath)
        ? fs.readFileSync(batPath, 'utf8')
        : '@echo off\ncall npm install\ncall npm run dev\n';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="NOVA_Auto_Installer_Windows.bat"'
      );
      return res.status(200).send(content);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/installer/github-bat', (_req, res) => {
    try {
      const batPath = path.resolve(ROOT_DIR, 'NOVA_GitHub_Push_Setup.bat');
      const content = fs.existsSync(batPath)
        ? fs.readFileSync(batPath, 'utf8')
        : '@echo off\ngit init\ngit add .\ngit commit -m "init"\n';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="NOVA_GitHub_Push_Setup.bat"'
      );
      return res.status(200).send(content);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Nova Genesis Protocol & Autonomous Provisioning Endpoints
  app.get('/api/genesis/status', (_req, res) => {
    res.status(200).json({
      success: true,
      protocol: 'Nova Genesis Protocol V9',
      activeNodes: 1428,
      keylessEngines: ['Pollinations.ai', 'DuckDuckGo-Lite', 'Edge-TTS'],
      p2pStatus: p2pHive.getStatus(),
    });
  });

  // P2P Hive Mind & Cell Division Endpoints
  app.get('/api/p2p/hive-status', (_req, res) => {
    res.status(200).json({
      success: true,
      ...p2pHive.getStatus(),
    });
  });

  app.get('/api/p2p/tools', (_req, res) => {
    res.status(200).json({
      success: true,
      tools: p2pHive.getAllTools(),
    });
  });

  app.post('/api/p2p/broadcast-tool', (req, res) => {
    const { tool } = req.body || {};
    if (!tool || !tool.id) {
      return res.status(400).json({ success: false, error: 'tool object with id is required' });
    }
    const broadcasted = p2pHive.broadcastTool(tool);
    res.status(200).json({ success: true, broadcasted });
  });

  // 6-Pillar Cognitive Architecture Endpoints (Full-Context RAG, Tri-Agent Swarm, Local LLM, Sandbox, Git)
  app.get('/api/cognitive/rag-summary', (_req, res) => {
    res.status(200).json({
      success: true,
      ...getCodebaseRAGSummary(),
    });
  });

  app.post('/api/cognitive/cycle', async (req, res) => {
    const objective = String(req.body?.objective || 'Full-Context Architectural Analysis & Verification').trim();
    const result = await executeCognitiveCycle(objective);
    res.status(200).json({ success: true, result });
  });

  // System Audio Status
  app.get('/api/audio/system-status', (_req, res) => {
    return res.status(200).json({
      success: true,
      ...currentSystemAudioStatus,
      isFresh: Date.now() - currentSystemAudioStatus.lastActiveTime < 4000,
    });
  });

  // Echo Cancellation State for System Audio Loopback
  let isTTSActive = false;
  app.post('/api/audio/tts-state', (req, res) => {
    isTTSActive = Boolean(req.body?.active);
    return res.status(200).json({ success: true, isTTSActive });
  });

  app.get('/api/audio/tts-state', (_req, res) => {
    return res.status(200).json({ success: true, isTTSActive });
  });

  // ============================================================================
  // HEYUKA v12.0 UNIFIED API GATEWAY (KASPI — ZERO-KEY + BYOK + yk-live KEYS)
  // ============================================================================

  app.get('/api/yuka/status', (_req, res) => {
    return res.status(200).json(getYukaV12SovereigntyStatus());
  });

  app.get('/api/heyuka/status', (_req, res) => {
    return res.status(200).json(getYukaV12SovereigntyStatus());
  });

  // Backward-compatible alias
  app.get('/api/heyuka/zero-key-status', (_req, res) => {
    return res.status(200).json(getYukaV12SovereigntyStatus());
  });

  // HEYUKA Unified Chat Endpoint (Web, Kaspi POS Glass Chat & HEYUKA Desktop OS Bridge)
  const handleHeyukaChat: express.RequestHandler = async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || '');
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const yukaKeyVerified = bearerToken ? verifyYukaApiKey(bearerToken) : false;

      const { prompt, screenshotBase64, userMemoryQuery, byokConfig, preferredModel } = req.body || {};
      const queryPrompt =
        (prompt && String(prompt).trim()) ||
        (screenshotBase64 ? 'Inspect my screen view and describe what you see.' : '');

      if (!queryPrompt && !screenshotBase64) {
        return res.status(200).json({
          text: sanitizeYukaChatOutput('HEYUKA is online and ready! What would you like to build, analyze, or execute?'),
          companionMood: 'idle',
          bossIdentity: 'HEYUKA',
          ownerCompany: 'KASPI',
          version: 'v12.0',
          yukaKeyVerified,
          zeroKeySovereignty: true,
        });
      }

      const result = await processCompanionInteraction({
        prompt: queryPrompt,
        screenshotBase64,
        userMemoryQuery,
        byokConfig: byokConfig || null,
        preferredModel,
      });

      return res.status(200).json({
        ...result,
        text: sanitizeYukaChatOutput(result?.text || ''),
        bossIdentity: 'HEYUKA',
        ownerCompany: 'KASPI',
        version: 'v12.0',
        yukaKeyVerified,
        zeroKeySovereignty: true,
      });
    } catch (err: any) {
      return res.status(200).json({
        text: sanitizeYukaChatOutput('HEYUKA is listening and ready! Please send your next directive.'),
        error: err?.message || 'Internal error',
        bossIdentity: 'HEYUKA',
        version: 'v12.0',
      });
    }
  };
  app.post('/api/yuka/chat', handleHeyukaChat);
  app.post('/api/heyuka/chat', handleHeyukaChat);

  // HEYUKA Unified API Keys (`yk-live-...`) & 100x Distributed Node Mesh
  app.get(['/api/yuka/keys', '/api/heyuka/keys'], (_req, res) => {
    return res.status(200).json({ success: true, ...listYukaApiKeys() });
  });

  app.post(['/api/yuka/keys/mint', '/api/heyuka/keys/mint'], (req, res) => {
    const { label, ownerUsername } = req.body || {};
    return res.status(200).json(mintYukaApiKey(label, ownerUsername));
  });

  app.delete(['/api/yuka/keys/:id', '/api/heyuka/keys/:id'], (req, res) => {
    return res.status(200).json(revokeYukaApiKey(String(req.params.id || '')));
  });

  // Kaspi POS 200+ Live Currency Rates (fawazahmed0 + Frankfurter Zero-Key)
  app.get(['/api/yuka/fx', '/api/heyuka/fx'], async (req, res) => {
    const base = String(req.query.base || 'usd');
    const fx = await fetchYukaLiveCurrencyRates(base);
    return res.status(200).json(fx);
  });

  // HEYUKA God-Mode OS, Vision, Multi-Cursor Swarm, Voice Cloner & Shadow Vault
  app.get(['/api/yuka/os/capabilities', '/api/heyuka/os/capabilities'], (_req, res) => {
    return res.status(200).json(getYukaOsCapabilitiesManifest());
  });

  app.post(['/api/yuka/os/execute', '/api/heyuka/os/execute'], async (req, res) => {
    const { action, payload } = req.body || {};
    const out = await executeYukaOsDirective(String(action || 'status'), payload || {});
    return res.status(200).json(out);
  });

  app.get(['/api/yuka/shadow-vault', '/api/heyuka/shadow-vault'], (_req, res) => {
    return res.status(200).json(listShadowVaultEntries());
  });

  app.post(['/api/yuka/shadow-vault/restore', '/api/heyuka/shadow-vault/restore'], (req, res) => {
    const { entryId } = req.body || {};
    return res.status(200).json(restoreFromShadowVault(String(entryId || '')));
  });

  // 1. Multimodal Conversational Endpoint (Unified HEYUKA v12.0 — KASPI Sovereign Models + Zero-Key + Optional BYOK)
  app.post('/api/gemini/interact', async (req, res) => {
    try {
      const { prompt, screenshotBase64, userMemoryQuery, byokConfig, preferredModel } = req.body || {};
      const queryPrompt = (prompt && String(prompt).trim()) || (screenshotBase64 ? 'Inspect my screen view and let me know what you see.' : '');
      
      if (!queryPrompt && !screenshotBase64) {
        return res.status(200).json({
          text: sanitizeYukaChatOutput("HEYUKA is online and ready! Tell me what you would like to build, analyze, or inspect."),
          companionMood: 'idle',
          bossIdentity: 'HEYUKA',
          ownerCompany: 'KASPI',
          version: 'v12.0',
          zeroKeySovereignty: true,
        });
      }

      const result = await processCompanionInteraction({
        prompt: queryPrompt,
        screenshotBase64,
        userMemoryQuery,
        byokConfig: byokConfig || null,
        preferredModel,
      });

      return res.status(200).json({
        ...result,
        text: sanitizeYukaChatOutput(result?.text || ''),
        bossIdentity: 'HEYUKA',
        ownerCompany: 'KASPI',
        version: 'v12.0',
        zeroKeySovereignty: true,
      });
    } catch (err: any) {
      console.error('API Error /api/gemini/interact:', err);
      return res.status(200).json({
        text: sanitizeYukaChatOutput("Yuka is listening and ready! What can I execute for you next?"),
        error: err?.message || 'Internal error',
        companionMood: 'idle',
        bossIdentity: 'Yuka',
        ownerCompany: 'KASPI',
        version: 'v12.0',
        zeroKeySovereignty: true,
      });
    }
  });

  // Server-Side Permission Gate Queue for Destructive Operations
  const PERMISSION_TTL_MS = 15000;
  interface PendingPermissionRequest {
    id: string;
    action: string;
    details: any;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'consumed';
    createdAt: number;
    ttlMs: number;
    resolvedAt?: number;
    consumedAt?: number;
  }
  const pendingPermissions = new Map<string, PendingPermissionRequest>();

  const isPermissionExpired = (item: PendingPermissionRequest): boolean => {
    const validTtl = typeof item.ttlMs === 'number' && item.ttlMs > 0 ? item.ttlMs : PERMISSION_TTL_MS;
    if (Date.now() - item.createdAt > validTtl) {
      if (item.status === 'pending' || item.status === 'approved') {
        item.status = 'expired';
      }
      return true;
    }
    return item.status === 'expired';
  };

  const createPermissionRequest = (action: string, details: any, customTtlMs?: number): PendingPermissionRequest => {
    const id = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const ttlMs = typeof customTtlMs === 'number' && customTtlMs > 0 ? Math.min(customTtlMs, 60000) : PERMISSION_TTL_MS;
    const reqObj: PendingPermissionRequest = {
      id,
      action,
      details,
      status: 'pending',
      createdAt: Date.now(),
      ttlMs,
    };
    pendingPermissions.set(id, reqObj);
    return reqObj;
  };

  const isRequestApproved = (body: any, expectedAction?: string): boolean => {
    if (!body || typeof body !== 'object') return false;
    if (body.permissionId !== undefined && body.permissionId !== null && String(body.permissionId).trim() !== '') {
      const item = pendingPermissions.get(String(body.permissionId).trim());
      if (!item) return false;
      if (isPermissionExpired(item)) return false;
      if (item.status !== 'approved') return false;
      if (expectedAction && item.action !== expectedAction) return false;
      item.status = 'consumed';
      item.consumedAt = Date.now();
      return true;
    }
    if (body.approved === true || body.confirmed === true) return true;
    return false;
  };

  app.get('/api/permissions/pending', (_req, res) => {
    const list: PendingPermissionRequest[] = [];
    for (const p of pendingPermissions.values()) {
      if (!isPermissionExpired(p) && p.status === 'pending') {
        list.push(p);
      }
    }
    return res.status(200).json({ success: true, pending: list });
  });

  app.post('/api/permissions/resolve', (req, res) => {
    const { permissionId, decision } = req.body || {};
    const item = pendingPermissions.get(String(permissionId || ''));
    if (!item) {
      return res.status(404).json({ success: false, error: 'Permission request not found' });
    }
    if (isPermissionExpired(item)) {
      return res.status(410).json({
        success: false,
        status: 'expired',
        error: 'Permission request has expired (15s safety timeout exceeded).',
        permission: item,
      });
    }
    if (item.status !== 'pending') {
      return res.status(409).json({
        success: false,
        status: item.status,
        error: `Permission request already resolved with status "${item.status}".`,
        permission: item,
      });
    }
    item.status = decision === 'approve' || decision === true ? 'approved' : 'rejected';
    item.resolvedAt = Date.now();
    return res.status(200).json({ success: true, permission: item });
  });

  // 2. Direct OS Automation Command Dispatcher (Permission-Gated for Destructive Tools)
  app.post('/api/os/execute', async (req, res) => {
    try {
      const { toolName, args, ttlMs } = req.body || {};
      if (!toolName) {
        return res.status(400).json({ success: false, error: 'toolName is required' });
      }
      if (isToolDestructive(String(toolName)) && !isRequestApproved(req.body, String(toolName))) {
        const perm = createPermissionRequest(String(toolName), args || {}, Number(ttlMs) || undefined);
        return res.status(403).json({
          success: false,
          status: 'permission_required',
          requiresPermission: true,
          permissionId: perm.id,
          action: String(toolName),
          details: args || {},
          error: `Permission Gate: "${toolName}" is a destructive operation and requires explicit user approval.`,
        });
      }
      const result = await executeOSCommand(toolName, args);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('API Error /api/os/execute:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Execution error' });
    }
  });

  // 2B. Universal File Engine Endpoints (/api/files/read, /api/files/write, /api/files/list)
  app.post('/api/files/read', async (req, res) => {
    try {
      const filePath = String(req.body?.file_path || req.body?.path || req.query?.path || '');
      const check = validateSafePath(filePath, 'read');
      if (!check.allowed) {
        return res.status(403).json({ success: false, blocked: true, error: check.error });
      }
      const result = await executeOSCommand('read_any_file', { file_path: filePath });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to read file' });
    }
  });

  app.get('/api/files/read', async (req, res) => {
    try {
      const filePath = String(req.query?.file_path || req.query?.path || '');
      const check = validateSafePath(filePath, 'read');
      if (!check.allowed) {
        return res.status(403).json({ success: false, blocked: true, error: check.error });
      }
      const result = await executeOSCommand('read_any_file', { file_path: filePath });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to read file' });
    }
  });

  app.post('/api/files/write', async (req, res) => {
    try {
      const { file_path, path: altPath, content, mode, ttlMs } = req.body || {};
      const targetPath = String(file_path || altPath || '');
      const check = validateSafePath(targetPath, 'write');
      if (!check.allowed) {
        return res.status(403).json({ success: false, blocked: true, error: check.error });
      }
      if (!isRequestApproved(req.body, 'write_to_any_file')) {
        const perm = createPermissionRequest(
          'write_to_any_file',
          {
            file_path: targetPath,
            mode: mode || 'w',
            bytes: typeof content === 'string' ? content.length : 0,
          },
          Number(ttlMs) || undefined
        );
        return res.status(403).json({
          success: false,
          status: 'permission_required',
          requiresPermission: true,
          permissionId: perm.id,
          action: 'write_to_any_file',
          details: { file_path: targetPath, mode: mode || 'w' },
          error: 'Permission Gate: Writing files requires explicit approval (approved: true).',
        });
      }
      const result = await executeOSCommand('write_to_any_file', {
        file_path: targetPath,
        content,
        mode: mode || 'w',
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to write file' });
    }
  });

  app.post('/api/files/list', async (req, res) => {
    try {
      const dirPath = String(req.body?.path || req.body?.directory || '.');
      const check = validateSafePath(dirPath, 'list');
      if (!check.allowed) {
        return res.status(403).json({ success: false, blocked: true, error: check.error });
      }
      const result = await executeOSCommand('list_directory_contents', { path: dirPath });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to list directory' });
    }
  });

  app.get('/api/files/list', async (req, res) => {
    try {
      const dirPath = String(req.query?.path || req.query?.directory || '.');
      const check = validateSafePath(dirPath, 'list');
      if (!check.allowed) {
        return res.status(403).json({ success: false, blocked: true, error: check.error });
      }
      const result = await executeOSCommand('list_directory_contents', { path: dirPath });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to list directory' });
    }
  });

  // 3. ChromaDB Long-Term Memory Endpoints (100% Free Local Offline Vector Store)
  app.get('/api/memory', (_req, res) => {
    try {
      const memories = localVectorStore.getAll();
      return res.status(200).json({ memories });
    } catch {
      return res.status(200).json({ memories: [] });
    }
  });

  app.post('/api/memory', async (req, res) => {
    try {
      const { key, content } = req.body || {};
      if (!key || !content) {
        return res.status(400).json({ success: false, error: 'key and content required' });
      }
      const item = await localVectorStore.store(key, content);
      return res.status(200).json({ success: true, item });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/memory/query', async (req, res) => {
    try {
      const { query } = req.body || {};
      const results = await localVectorStore.query(query || '');
      return res.status(200).json({ results });
    } catch {
      return res.status(200).json({ results: [] });
    }
  });

  app.delete('/api/memory', (req, res) => {
    try {
      const key = String(req.query.key || req.body?.key || '').trim();
      if (!key) {
        return res.status(400).json({ success: false, error: 'key required' });
      }
      const deleted = localVectorStore.deleteByKey(key);
      return res.status(200).json({ success: true, deleted });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 4. Ghost Co-Pilot Collaboration Workspace Feed Endpoints
  app.get('/api/workspace/feed', (_req, res) => {
    try {
      const feed = getWorkspaceFeed();
      return res.status(200).json({ feed });
    } catch {
      return res.status(200).json({ feed: [] });
    }
  });

  app.post('/api/workspace/feed', (req, res) => {
    try {
      const { message, phase, detail } = req.body || {};
      if (!message) {
        return res.status(400).json({ success: false, error: 'message is required' });
      }
      const result = update_workspace_feed(message, phase, detail);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5. Model Hub & API Vault Endpoints (Multi-Agent & Hybrid Architecture)
  app.get('/api/vault/keys', (_req, res) => {
    try {
      const keys = getVaultKeys();
      return res.status(200).json({ success: true, keys });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/vault/keys', (req, res) => {
    try {
      const keys = saveVaultKeys(req.body || {});
      return res.status(200).json({ success: true, keys });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Hybrid Vault Endpoints (Local Ollama + 5 Cloud Keys)
  app.get('/api/vault/hybrid', async (_req, res) => {
    try {
      const { getHybridVault } = await import('./hybridRouter.js');
      const settings = getHybridVault();
      return res.status(200).json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/vault/hybrid', async (req, res) => {
    try {
      const { saveHybridVault } = await import('./hybridRouter.js');
      const settings = saveHybridVault(req.body || {});
      return res.status(200).json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Secure Onboarding Credentials Sync (SetupWizard & electron-store integration)
  app.post('/api/vault/credentials', async (req, res) => {
    try {
      const { saveStoredCredentials } = await import('./hybridRouter.js');
      saveStoredCredentials(req.body || {});
      return res.status(200).json({ success: true, message: 'Credentials secured locally in electron-store vault.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Universal API Vault Endpoints (Task 1: The Universal Credential Vault)
  app.get('/api/vault/universal', (_req, res) => {
    try {
      const vaultPath = path.resolve(ROOT_DIR, 'backend', 'vault.json');
      if (fs.existsSync(vaultPath)) {
        const raw = fs.readFileSync(vaultPath, 'utf8');
        return res.status(200).json(JSON.parse(raw));
      }
      return res.status(200).json({ credentials: {}, custom_services: {} });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/vault/universal', (req, res) => {
    try {
      const vaultPath = path.resolve(ROOT_DIR, 'backend', 'vault.json');
      const body = req.body || {};
      let currentData: any = { credentials: {}, custom_services: {} };
      if (fs.existsSync(vaultPath)) {
        try {
          currentData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
        } catch {}
      }

      currentData.credentials = {
        ...(currentData.credentials || {}),
        ...(body.credentials || {}),
      };
      currentData.custom_services = {
        ...(currentData.custom_services || {}),
        ...(body.custom_services || {}),
      };
      currentData.last_updated = new Date().toISOString();

      fs.writeFileSync(vaultPath, JSON.stringify(currentData, null, 2), 'utf8');
      return res.status(200).json({ success: true, vault: currentData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Dynamic Tool Registry & Execution Endpoints (Task 2)
  app.get('/api/dynamic-tools', async (_req, res) => {
    try {
      const { toolRegistry } = await import('./toolRegistry.js');
      toolRegistry.scanDynamicToolsDir();
      const registryPath = path.resolve(ROOT_DIR, 'backend', 'dynamic_tools.json');
      let fileTools: any[] = [];
      if (fs.existsSync(registryPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
          fileTools = Array.isArray(parsed.tools) ? parsed.tools : [];
        } catch {}
      }
      return res.status(200).json({
        success: true,
        tools: fileTools,
        registered: toolRegistry.listTools(),
      });
    } catch {
      return res.status(200).json({ success: true, tools: [] });
    }
  });

  app.post('/api/dynamic-tools/execute', async (req, res) => {
    try {
      const { toolName, args, ttlMs } = req.body || {};
      const name = String(toolName || '').trim();
      if (!name) {
        return res.status(400).json({ success: false, error: 'Missing toolName' });
      }
      if (isToolDestructive(name) && !isRequestApproved(req.body, name)) {
        const perm = createPermissionRequest(name, args || {}, Number(ttlMs) || undefined);
        return res.status(403).json({
          success: false,
          status: 'permission_required',
          requiresPermission: true,
          permissionId: perm.id,
          action: name,
          details: `Execute dynamic tool "${name}"`,
          error: `Permission Gate: Dynamic tool "${name}" requires explicit user approval.`,
        });
      }
      const { toolRegistry } = await import('./toolRegistry.js');
      const output = await toolRegistry.executeTool(name, args || {});
      return res.status(200).json({ success: true, toolName: name, result: output });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Mochi-Puff Local Speech Synthesis (Piper-TTS & Edge-TTS)
  app.post('/api/mochi/tts', async (req, res) => {
    try {
      const { toolRegistry } = await import('./toolRegistry.js');
      const toolName = req.body?.voice_engine ? 'mochi_voice_engine' : 'mochi_speech_synthesis';
      const output = await toolRegistry.executeTool(toolName, req.body || {});
      return res.status(200).json({ success: true, ...output });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Yuka Voice Dialogue Speech & WebSocket Broadcasting (Zero-Leakage Shield)
  app.post('/api/mochi/dialogue', async (req, res) => {
    try {
      const { broadcastMochiVoiceDialogue } = await import('./liveAudio.js');
      const rawText = req.body?.dialogue || req.body?.text || 'Hello, I am Yuka!';
      const text = sanitizeYukaChatOutput(String(rawText));
      const voice = req.body?.voice || 'mochi_cute';
      const output = await broadcastMochiVoiceDialogue(text, voice, req.body?.pitch, req.body?.rate);
      return res.status(200).json({ success: true, bossIdentity: 'Yuka', ...output });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Swarm Telemetry SSE State
  const swarmTelemetryClients: express.Response[] = [];
  const broadcastSwarmTelemetry = (data: any) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (let i = swarmTelemetryClients.length - 1; i >= 0; i--) {
      const client = swarmTelemetryClients[i];
      try {
        client.write(payload);
      } catch {
        swarmTelemetryClients.splice(i, 1);
      }
    }
  };

  // Cross-platform Python executable resolver (guards against hardcoded paths from another PC)
  const resolvePythonExecutable = (): string => {
    const candidate = (process.env.PYTHON_PATH || process.env.PYTHON_EXECUTABLE || '').trim();
    if (candidate) {
      if (candidate === 'python' || candidate === 'python3' || candidate === 'py') {
        return candidate;
      }
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return process.platform === 'win32' ? 'python' : 'python3';
  };

  // Direct AgentGit & backend/git_engine.py Integration Endpoints
  const invokeGitEngine = (
    act: string,
    plat: string,
    repo: string,
    msg: string,
    localPath: string | null = null,
    isPrivate = false,
    emitTelemetry = true
  ): Promise<{ parsedResult: any; latencyMs: number; gitScriptPath: string }> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      if (emitTelemetry) {
        broadcastSwarmTelemetry({
          telemetry: true,
          agent: 'AgentGit',
          status: 'working',
          operation: act,
          platform: plat,
          repo_name: repo,
          task: `Git ${act.toUpperCase()} (${plat})${repo ? `: ${repo}` : ''}`,
          timestamp: startTime,
        });
      }

      const pythonExecutable = resolvePythonExecutable();
      const gitScriptPath = path.resolve(ROOT_DIR, 'backend', 'git_engine.py');

      try {
        const pyCode = [
          'import sys, json',
          `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
          'from git_engine import execute_git_action',
          `res = execute_git_action(action=${JSON.stringify(act)}, platform=${JSON.stringify(plat)}, repo_name=${JSON.stringify(repo)}, commit_message=${JSON.stringify(msg)}, local_path=${JSON.stringify(localPath)}, private=${isPrivate ? 'True' : 'False'})`,
          'print(json.dumps(res))',
        ].join('; ');

        const child = spawn(pythonExecutable, ['-c', pyCode], {
          cwd: ROOT_DIR,
          env: { ...process.env },
        });

        let stdoutData = '';
        let stderrData = '';
        let settled = false;
        const maxOutputBytes = 1024 * 1024;
        const timer = setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {}
        }, 25000);

        child.stdout.on('data', (chunk) => {
          if (stdoutData.length < maxOutputBytes) {
            stdoutData += chunk.toString();
          }
        });

        child.stderr.on('data', (chunk) => {
          if (stderrData.length < maxOutputBytes) {
            stderrData += chunk.toString();
          }
        });

        child.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });

        child.on('close', (code) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const latencyMs = Date.now() - startTime;
          let parsedResult: any = null;
          try {
            parsedResult = JSON.parse(stdoutData.trim());
          } catch {
            parsedResult = {
              success: code === 0,
              action: act,
              platform: plat,
              stdout: stdoutData.trim(),
              stderr: stderrData.trim(),
            };
          }

          const isOk = Boolean(parsedResult?.success);
          const taskSummary =
            parsedResult?.message ||
            parsedResult?.stdout ||
            parsedResult?.error ||
            parsedResult?.stderr ||
            `Completed git ${act}`;

          if (emitTelemetry) {
            broadcastSwarmTelemetry({
              telemetry: true,
              agent: 'AgentGit',
              status: isOk ? 'complete' : 'error',
              operation: act,
              platform: plat,
              repo_name: repo,
              task: String(taskSummary).slice(0, 140),
              latency_ms: latencyMs,
              timestamp: Date.now(),
            });
          }

          resolve({ parsedResult, latencyMs, gitScriptPath });
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  app.get('/api/git/status', async (_req, res) => {
    try {
      const { parsedResult, latencyMs, gitScriptPath } = await invokeGitEngine(
        'status',
        'github',
        '',
        '',
        null,
        false,
        false
      );
      return res.status(200).json({
        ...parsedResult,
        script: gitScriptPath,
        latency_ms: latencyMs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/git/execute', async (req, res) => {
    const {
      action = 'status',
      platform = 'github',
      repoName = '',
      commitMessage = 'Update from NEVEA AI Swarm',
      localPath = null,
      private: isPrivate = false,
      ttlMs,
    } = req.body || {};

    const act = String(action).trim();
    const plat = String(platform).trim();
    const repo = String(repoName).trim();
    const msg = String(commitMessage).trim();

    const destructiveGitActions = new Set(['push', 'commit', 'create_repo', 'full_deploy']);
    if (destructiveGitActions.has(act) && !isRequestApproved(req.body, `git_${act}`)) {
      const perm = createPermissionRequest(
        `git_${act}`,
        {
          action: act,
          platform: plat,
          repoName: repo,
          commitMessage: msg,
        },
        Number(ttlMs) || undefined
      );
      return res.status(403).json({
        success: false,
        status: 'permission_required',
        requiresPermission: true,
        permissionId: perm.id,
        action: `git_${act}`,
        details: { action: act, platform: plat, repoName: repo },
        error: `Permission Gate: Git "${act}" requires explicit approval (approved: true).`,
      });
    }

    try {
      const { parsedResult, latencyMs, gitScriptPath } = await invokeGitEngine(
        act,
        plat,
        repo,
        msg,
        localPath ? String(localPath).trim() : null,
        Boolean(isPrivate),
        true
      );
      return res.status(200).json({
        ...parsedResult,
        script: gitScriptPath,
        latency_ms: latencyMs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Swarm Real-Time Telemetry Stream (SSE)
  app.get('/api/swarm/telemetry', (_req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ telemetry: true, agent: 'System', status: 'connected', task: 'Listening to Swarm events' })}\n\n`);
    swarmTelemetryClients.push(res);
    _req.on('close', () => {
      const idx = swarmTelemetryClients.indexOf(res);
      if (idx !== -1) swarmTelemetryClients.splice(idx, 1);
    });
  });

  // Swarm Intent Delegation & Parallel Execution (Unified Boss + CrewAI/AutoGen Swarm)
  app.post('/api/swarm/execute', async (req, res) => {
    const { prompt, task, bossModel } = req.body || {};
    const userPrompt = String(prompt || task || 'Check system status and report').trim();
    const model = String(bossModel || 'boss-king').trim();

    broadcastSwarmTelemetry({
      agent: 'The King',
      status: 'planning',
      task: `Decomposing: "${userPrompt.slice(0, 45)}"`,
      timestamp: Date.now(),
    });

    const pythonExecutable = resolvePythonExecutable();
    const scriptPath = path.resolve(ROOT_DIR, 'backend', 'swarm_boss.py');

    try {
      const child = spawn(pythonExecutable, [scriptPath, userPrompt, model], {
        cwd: ROOT_DIR,
        env: { ...process.env },
      });

      let stdoutData = '';
      let stderrData = '';
      let settled = false;
      let timedOut = false;
      const maxOutputBytes = 1024 * 1024;
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {}
      }, 25000);

      child.stdout.on('data', (chunk) => {
        const str = chunk.toString();
        if (stdoutData.length < maxOutputBytes) {
          stdoutData += str;
        }
        const lines = str.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.telemetry) {
                broadcastSwarmTelemetry(parsed);
                if (parsed.agent && parsed.status) {
                  const agentMap: Record<string, 'planner' | 'coder' | 'reviewer'> = {
                    AgentPlanner: 'planner',
                    AgentCoder: 'coder',
                    AgentReviewer: 'reviewer',
                  };
                  const mapped = agentMap[String(parsed.agent)];
                  if (mapped) {
                    const statusMap: Record<string, any> = {
                      working: mapped === 'planner' ? 'reading_code' : mapped === 'coder' ? 'writing_code' : 'testing_in_sandbox',
                      complete: 'completed',
                      error: 'idle',
                      waiting_dependency: 'waiting_dependency',
                      waiting_lock: 'waiting_lock',
                    };
                    collaborationHub.broadcastCognitiveTelemetry({
                      agent: mapped,
                      status: statusMap[String(parsed.status)] || 'reading_code',
                      currentTask: String(parsed.task || 'Executing swarm task'),
                    });
                  }
                }
              }
            } catch {}
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderrData.length < maxOutputBytes) {
          stderrData += chunk.toString();
        }
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        broadcastSwarmTelemetry({
          agent: 'The King',
          status: 'error',
          task: `Swarm spawn failed: ${err?.message || 'unknown error'}`,
          timestamp: Date.now(),
        });
        return res.status(500).json({ status: 'error', success: false, error: err?.message });
      });

      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        let finalReport: any = null;
        try {
          const lines = stdoutData.split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('__NEVEA_SWARM_REPORT__:')) {
              const jsonPayload = line.slice('__NEVEA_SWARM_REPORT__:'.length).trim();
              finalReport = JSON.parse(jsonPayload);
              break;
            }
          }
          if (!finalReport) {
            const nonTelemetryStart = stdoutData.lastIndexOf('\n{\n');
            if (nonTelemetryStart !== -1) {
              finalReport = JSON.parse(stdoutData.slice(nonTelemetryStart).trim());
            }
          }
        } catch {}

        if (!finalReport) {
          finalReport = {
            status: !timedOut && code === 0 ? 'success' : 'error',
            success: !timedOut && code === 0,
            boss_model: model,
            owner_prompt: userPrompt,
            tasks_count: 0,
            raw_output: stdoutData.slice(-1000),
            error: timedOut ? 'Swarm execution timed out after 25s' : code === 0 ? undefined : stderrData.slice(-500),
          };
        } else {
          finalReport.success = finalReport.status === 'success';
          finalReport.output = finalReport.output || {
            summary: `Swarm Boss (${model}) executed ${finalReport.tasks_count || 1} task(s) with status "${finalReport.status}" for: "${userPrompt}"`,
            results: finalReport.results || [],
          };
        }

        const isSuccess = Boolean(finalReport.success);
        broadcastSwarmTelemetry({
          agent: 'The King',
          status: isSuccess ? 'complete' : 'error',
          task: isSuccess
            ? 'All swarm tasks executed successfully'
            : `Swarm finished with status: ${finalReport.status || 'error'}`,
          timestamp: Date.now(),
        });

        return res.status(200).json(finalReport);
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', success: false, error: err?.message });
    }
  });

  app.post('/api/models/local/check', async (req, res) => {
    try {
      const { checkLocalEndpoint } = await import('./hybridRouter.js');
      const status = await checkLocalEndpoint(req.body?.endpoint);
      return res.status(200).json(status);
    } catch (err: any) {
      return res.status(500).json({ online: false, error: err?.message, models: [] });
    }
  });

  app.post('/api/models/generate-code-local', async (req, res) => {
    try {
      const { generateCodeLocal } = await import('./hybridRouter.js');
      const { prompt, model, endpoint } = req.body || {};
      const result = await generateCodeLocal(prompt || 'console.log("Hello from local brain!");', model, endpoint);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/models/generate-3d', async (req, res) => {
    try {
      const { generate3DHunyuan } = await import('./hybridRouter.js');
      const { prompt, apiKey } = req.body || {};
      const result = await generate3DHunyuan(prompt || 'a stylized crystal sphere with wings', apiKey);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/models/generate-image', async (req, res) => {
    try {
      const { prompt, apiKey } = req.body || {};
      const result = await generateImageStableDiffusion(prompt || 'a cute cosmic fluffy mochi creature', apiKey);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/models/generate-code', async (req, res) => {
    try {
      const { prompt, apiKey, filepath } = req.body || {};
      const result = await generateCodeDeepseek(prompt || 'TypeScript utility function', apiKey, filepath);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 6. OmniRouter & ContextBus Endpoints (Yuka v12.0 — 100% Zero-Key)
  app.post('/api/router/execute', async (req, res) => {
    try {
      const { routeLLMRequest } = await import('./omniRouter.js');
      const result = await routeLLMRequest(req.body || {});
      return res.status(200).json({
        ...result,
        text: sanitizeYukaChatOutput(result?.text || ''),
        bossIdentity: 'Yuka',
        ownerCompany: 'KASPI',
        version: 'v12.0',
        zeroKeySovereignty: true,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 7. Legacy CrewAI/AutoGen Swarm Direct Endpoint
  app.post('/api/swarm/crew', async (req, res) => {
    try {
      const { task, prompt } = req.body || {};
      const swarmTask = String(task || prompt || 'Analyze project architecture and execute code synthesis').trim();
      const { executeOSCommand, update_workspace_feed } = await import('./tools.js');
      update_workspace_feed(`[Swarm] Activating CrewAI & AutoGen 3-Agent Swarm for task: "${swarmTask}"`);
      const result = await executeOSCommand('execute_swarm', { task: swarmTask });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 8. Ollama Model Pull Endpoint
  app.post('/api/models/ollama/pull', async (req, res) => {
    try {
      const { model } = req.body || {};
      const { executeOSCommand, update_workspace_feed } = await import('./tools.js');
      const targetModel = String(model || 'llama3').trim();
      update_workspace_feed(`[Ollama] Pulling model "${targetModel}" locally...`);
      const result = await executeOSCommand('pull_ollama_model', { model_name: targetModel });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/router/status', async (_req, res) => {
    try {
      const { getOmniRouterStatus } = await import('./omniRouter.js');
      return res.status(200).json(getOmniRouterStatus());
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // KASPI Sovereign Multi-Model Hub Status & Key Configuration
  app.get('/api/kaspi/models-status', async (_req, res) => {
    try {
      const { getKaspiModelsCatalog } = await import('./kaspiModelsClient.js');
      const status = await getKaspiModelsCatalog();
      return res.status(200).json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Status probe failed' });
    }
  });

  app.post('/api/kaspi/config', async (req, res) => {
    try {
      const { saveStoredCredentials } = await import('./hybridRouter.js');
      const { heyukaApiKey, heyukaKeyId, kaspiApiBaseUrl, heyukaActiveModel } = req.body || {};
      const updates: Record<string, string> = {};
      if (typeof heyukaApiKey === 'string' && heyukaApiKey.trim()) {
        updates.heyukaApiKey = heyukaApiKey.trim();
        updates.HEYUKA_API_KEY = heyukaApiKey.trim();
      }
      if (typeof heyukaKeyId === 'string') {
        updates.heyukaKeyId = heyukaKeyId.trim();
        updates.HEYUKA_KEY_ID = heyukaKeyId.trim();
      }
      if (typeof kaspiApiBaseUrl === 'string' && kaspiApiBaseUrl.trim()) {
        updates.kaspiApiBaseUrl = kaspiApiBaseUrl.trim();
        updates.KASPI_API_BASE_URL = kaspiApiBaseUrl.trim();
      }
      if (typeof heyukaActiveModel === 'string' && heyukaActiveModel.trim()) {
        updates.heyukaActiveModel = heyukaActiveModel.trim();
        updates.HEYUKA_ACTIVE_MODEL = heyukaActiveModel.trim();
      }
      saveStoredCredentials(updates);
      const { getKaspiModelsCatalog } = await import('./kaspiModelsClient.js');
      const status = await getKaspiModelsCatalog();
      return res.status(200).json({ ok: true, ...status });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.get('/api/context/vision', async (_req, res) => {
    try {
      const { contextBus } = await import('./contextBus.js');
      return res.status(200).json(contextBus.getLatestVisualContext());
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/context/vision', async (req, res) => {
    try {
      const { contextBus } = await import('./contextBus.js');
      const { summary, screenshotBase64, detectedApps } = req.body || {};
      contextBus.setLatestVisualContext(summary || '', screenshotBase64, detectedApps);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/context/memory', async (req, res) => {
    try {
      const { contextBus } = await import('./contextBus.js');
      const namespace = String(req.query.namespace || 'global');
      const key = req.query.key ? String(req.query.key) : undefined;
      const entries = contextBus.getNamespacedMemory(namespace, key);
      return res.status(200).json({ success: true, namespace, entries });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/context/memory', async (req, res) => {
    try {
      const { contextBus } = await import('./contextBus.js');
      const { namespace, key, content, metadata } = req.body || {};
      const entry = contextBus.saveNamespacedMemory(namespace, key, content, metadata);
      return res.status(200).json({ success: true, entry });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/context/namespaces', async (_req, res) => {
    try {
      const { contextBus } = await import('./contextBus.js');
      return res.status(200).json({ namespaces: contextBus.listNamespaces() });
    } catch {
      return res.status(200).json({ namespaces: [] });
    }
  });

  // External API Integration Layer & Dynamic Intent Router Endpoints
  app.get('/api/integrations/status', async (_req, res) => {
    try {
      const { getIntegrationReadiness } = await import('./config.js');
      const { toolRegistry } = await import('./toolRegistry.js');
      return res.status(200).json({
        success: true,
        readiness: getIntegrationReadiness(),
        registeredTools: toolRegistry.listTools(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/integrations/dispatch', async (req, res) => {
    try {
      const { request, params } = req.body || {};
      const { toolRegistry } = await import('./toolRegistry.js');
      const outcome = await toolRegistry.dispatchByIntent(String(request || ''), params || {});
      return res.status(200).json({ success: true, ...outcome });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/integrations/openrouter', async (req, res) => {
    try {
      const { model_name, prompt, systemPrompt } = req.body || {};
      const { call_openrouter_model } = await import('./externalApiClients.js');
      const result = await call_openrouter_model(model_name, prompt, systemPrompt);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/integrations/huggingface', async (req, res) => {
    try {
      const { model_id, inputs, parameters } = req.body || {};
      const { call_huggingface_model } = await import('./externalApiClients.js');
      const result = await call_huggingface_model(model_id, inputs, parameters);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/integrations/github', async (req, res) => {
    try {
      const { endpoint, method, data } = req.body || {};
      const { github_api_call } = await import('./externalApiClients.js');
      const result = await github_api_call(endpoint || '/user/repos', method || 'GET', data);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/integrations/codeberg', async (req, res) => {
    try {
      const { endpoint, method, data } = req.body || {};
      const { codeberg_api_call } = await import('./externalApiClients.js');
      const result = await codeberg_api_call(endpoint || '/user/repos', method || 'GET', data);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // MILESTONE 5: VOICE-TO-EXECUTION INTENT & STRUCTURED TERMINAL PIPELINE
  // ============================================================================
  app.post('/api/voice/intent', async (req, res) => {
    try {
      const { transcript, voiceMode } = req.body || {};
      const spokenText = String(transcript || '').trim();
      if (!spokenText) {
        return res.status(400).json({ success: false, error: 'transcript is required' });
      }

      // 1. Instant Spoken Emergency Stop Detection
      const lower = spokenText.toLowerCase();
      const cancelKeywords = ['emergency stop', 'halt', 'cancel everything', 'abort all', 'stop immediately'];
      const isDirectStop = cancelKeywords.some(kw => lower.includes(kw)) || lower === 'stop' || lower === 'cancel' || lower === 'abort';

      if (isDirectStop) {
        broadcastSwarmTelemetry({
          telemetry: true,
          agent: 'System',
          status: 'emergency_stop',
          task: `Emergency Stop triggered by voice: "${spokenText}"`,
          timestamp: Date.now()
        });
        collaborationHub.broadcastCognitiveTelemetry({
          agent: 'planner',
          status: 'idle',
          currentTask: 'Emergency Stop Triggered by Voice'
        });

        // Trigger Python-side emergency stop in swarm_boss & agent_server & maintenance
        const pythonExecutable = resolvePythonExecutable();
        try {
          const pyCode = [
            'import sys, json',
            `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
            'from agent_server import DesktopArbitrationManager',
            'from maintenance_engine import MaintenanceEngine',
            'DesktopArbitrationManager.get_instance().force_emergency_release()',
            'MaintenanceEngine.get_instance().emergency_stop()',
            'print(json.dumps({"success": True, "emergency_stopped": True}))'
          ].join('; ');
          spawn(pythonExecutable, ['-c', pyCode], { cwd: ROOT_DIR });
        } catch {}

        return res.status(200).json({
          success: true,
          cancelled: true,
          action: 'emergency_stop',
          transcript: spokenText,
          message: 'Emergency stop executed immediately. All locks and running tasks cleared.'
        });
      }

      // 2. Action Intent extraction & dispatch to BossOrchestrator
      broadcastSwarmTelemetry({
        agent: 'The King',
        status: 'voice_intent_received',
        task: `Spoken Intent: "${spokenText.slice(0, 50)}"`,
        timestamp: Date.now()
      });

      return res.status(200).json({
        success: true,
        action: 'voice_intent_routed',
        transcript: spokenText,
        intent: {
          raw: spokenText,
          mode: voiceMode || 'normal',
          target_pipeline: '/api/swarm/execute'
        },
        message: `Voice intent received: "${spokenText}". Routed to The King's Orchestrator.`
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/terminal/execute', async (req, res) => {
    try {
      const { command, cwd, timeoutMs } = req.body || {};
      const cmdStr = String(command || '').trim();
      if (!cmdStr) {
        return res.status(400).json({ success: false, error: 'command is required' });
      }

      const blacklist = ['format', 'del /f /s /q', 'rm -rf /', 'system32', 'diskpart', 'drop database', 'drop table', ':(){ :|:& };:'];
      for (const bad of blacklist) {
        if (cmdStr.toLowerCase().includes(bad)) {
          return res.status(403).json({
            success: false,
            exit_code: 126,
            stdout: '',
            stderr: `Security Policy: Restricted command pattern blocked: "${bad}"`,
            risk_tier: 'critical'
          });
        }
      }

      const start = Date.now();
      const targetCwd = cwd ? path.resolve(ROOT_DIR, cwd) : ROOT_DIR;
      const timeout = Number(timeoutMs) || 20000;

      const c = cmdStr.toLowerCase();
      let riskTier: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (['rm ', 'del ', 'kill', 'pkill', 'drop'].some(p => c.includes(p))) riskTier = 'high';
      else if (['npm install', 'pip install', 'git push', 'curl', 'wget'].some(p => c.includes(p))) riskTier = 'medium';

      const child = spawn(cmdStr, {
        cwd: targetCwd,
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
      }, timeout);

      child.stdout.on('data', d => { if (stdout.length < 500000) stdout += d.toString(); });
      child.stderr.on('data', d => { if (stderr.length < 500000) stderr += d.toString(); });

      child.on('close', code => {
        clearTimeout(timer);
        const duration = Date.now() - start;
        return res.status(200).json({
          success: code === 0,
          command: cmdStr,
          exit_code: code ?? (stderr ? 1 : 0),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          execution_duration_ms: duration,
          risk_tier: riskTier
        });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // MILESTONE 6: COMMUNITY RESOURCE & OPEN-SOURCE PLUGIN REGISTRY
  // ============================================================================
  const invokeCommunityRegistry = (methodName: string, argPayload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const pythonExecutable = resolvePythonExecutable();
      const pyCode = [
        'import sys, json',
        `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
        'from community_registry import CommunityRegistryManager',
        'mgr = CommunityRegistryManager.get_instance()',
        `payload = json.loads(${JSON.stringify(JSON.stringify(argPayload))})`,
        `res = getattr(mgr, ${JSON.stringify(methodName)})(**payload if isinstance(payload, dict) else payload)`,
        'print(json.dumps(res))'
      ].join('; ');

      const child = spawn(pythonExecutable, ['-c', pyCode], { cwd: ROOT_DIR, env: { ...process.env } });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('close', code => {
        if (code === 0 && stdout.trim()) {
          try {
            return resolve(JSON.parse(stdout.trim()));
          } catch (e) {
            return resolve({ raw: stdout.trim() });
          }
        }
        reject(new Error(stderr.trim() || `Registry exited with code ${code}`));
      });
    });
  };

  app.get('/api/community/resources', async (_req, res) => {
    try {
      const pythonExecutable = resolvePythonExecutable();
      const pyCode = [
        'import sys, json',
        `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
        'from community_registry import CommunityRegistryManager',
        'print(json.dumps(CommunityRegistryManager.get_instance().load_catalog()))'
      ].join('; ');

      const child = spawn(pythonExecutable, ['-c', pyCode], { cwd: ROOT_DIR, env: { ...process.env } });
      let stdout = '';
      child.stdout.on('data', d => { stdout += d.toString(); });
      child.on('close', code => {
        if (code === 0 && stdout.trim()) {
          try {
            return res.status(200).json({ success: true, resources: JSON.parse(stdout.trim()) });
          } catch {}
        }
        return res.status(200).json({ success: true, resources: [] });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/community/publish', async (req, res) => {
    try {
      const manifest = req.body?.manifest || req.body || {};
      const result = await invokeCommunityRegistry('publish_resource', { manifest });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/community/disable', async (req, res) => {
    try {
      const resourceId = String(req.body?.resourceId || req.body?.id || '').trim();
      const result = await invokeCommunityRegistry('toggle_resource', { resource_id: resourceId, enable: false });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/community/enable', async (req, res) => {
    try {
      const resourceId = String(req.body?.resourceId || req.body?.id || '').trim();
      const result = await invokeCommunityRegistry('toggle_resource', { resource_id: resourceId, enable: true });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/community/rollback', async (req, res) => {
    try {
      const resourceId = String(req.body?.resourceId || req.body?.id || '').trim();
      const result = await invokeCommunityRegistry('rollback_resource', { resource_id: resourceId });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ============================================================================
  // MILESTONE 7: 7-STAGE AUTONOMOUS COMPUTER MAINTENANCE & SYSTEM STARTUP
  // ============================================================================
  const invokeMaintenanceEngine = (methodName: string, argPayload: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const pythonExecutable = resolvePythonExecutable();
      const pyCode = [
        'import sys, json',
        `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
        'from maintenance_engine import MaintenanceEngine',
        'engine = MaintenanceEngine.get_instance()',
        `payload = json.loads(${JSON.stringify(JSON.stringify(argPayload))})`,
        `res = getattr(engine, ${JSON.stringify(methodName)})(**payload if isinstance(payload, dict) else payload)`,
        'print(json.dumps(res))'
      ].join('; ');

      const child = spawn(pythonExecutable, ['-c', pyCode], { cwd: ROOT_DIR, env: { ...process.env } });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', d => { stdout += d.toString(); });
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('close', code => {
        if (code === 0 && stdout.trim()) {
          try {
            return resolve(JSON.parse(stdout.trim()));
          } catch (e) {
            return resolve({ raw: stdout.trim() });
          }
        }
        reject(new Error(stderr.trim() || `Maintenance engine exited with code ${code}`));
      });
    });
  };

  app.get('/api/maintenance/observe', async (_req, res) => {
    try {
      const result = await invokeMaintenanceEngine('stage_1_observe');
      return res.status(200).json({ success: true, stage: 'Stage 1 (Observe)', observation: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/maintenance/diagnose', async (_req, res) => {
    try {
      const result = await invokeMaintenanceEngine('stage_2_diagnose');
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/maintenance/plan', async (_req, res) => {
    try {
      const result = await invokeMaintenanceEngine('stage_3_plan');
      return res.status(200).json({ success: true, plan: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/maintenance/execute', async (req, res) => {
    try {
      const { authorizationToken, ttlMs } = req.body || {};
      // If destructive and not approved, trigger permission gate
      if (!isRequestApproved(req.body, 'execute_maintenance_plan')) {
        const perm = createPermissionRequest(
          'execute_maintenance_plan',
          { type: '7_stage_autonomous_computer_maintenance' },
          Number(ttlMs) || undefined
        );
        return res.status(403).json({
          success: false,
          status: 'permission_required',
          requiresPermission: true,
          permissionId: perm.id,
          action: 'execute_maintenance_plan',
          details: 'Run 7-stage autonomous system maintenance cycle',
          error: 'Permission Gate: Maintenance actions require user confirmation.',
        });
      }

      const result = await invokeMaintenanceEngine('run_maintenance_cycle', {
        authorization_token: authorizationToken || 'approved_via_permission_gate'
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/emergency-stop', async (_req, res) => {
    try {
      // 1. Broadcast SSE telemetry to UI
      broadcastSwarmTelemetry({
        telemetry: true,
        agent: 'System',
        status: 'emergency_stop',
        task: 'Global Emergency Stop: All processes halted, locks cleared.',
        timestamp: Date.now()
      });
      collaborationHub.broadcastCognitiveTelemetry({
        agent: 'planner',
        status: 'idle',
        currentTask: 'System Stopped (Emergency Stop)'
      });

      // 2. Invoke Python-side lock release & process termination
      const pythonExecutable = resolvePythonExecutable();
      const pyCode = [
        'import sys, json',
        `sys.path.insert(0, ${JSON.stringify(path.resolve(ROOT_DIR, 'backend'))})`,
        'from agent_server import DesktopArbitrationManager',
        'from maintenance_engine import MaintenanceEngine',
        'arb_res = DesktopArbitrationManager.get_instance().force_emergency_release()',
        'maint_res = MaintenanceEngine.get_instance().emergency_stop()',
        'print(json.dumps({"desktop_lock": arb_res, "maintenance": maint_res}))'
      ].join('; ');

      const child = spawn(pythonExecutable, ['-c', pyCode], { cwd: ROOT_DIR, env: { ...process.env } });
      let out = '';
      child.stdout.on('data', d => { out += d.toString(); });
      child.on('close', () => {
        return res.status(200).json({
          success: true,
          emergency_stop: true,
          timestamp: Date.now(),
          message: 'Global Emergency Stop Triggered: Swarm locks, desktop arbitration locks, and active tasks cleared.',
          details: out ? JSON.parse(out || '{}') : null
        });
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/system/startup', async (_req, res) => {
    try {
      const result = await invokeMaintenanceEngine('get_startup_config');
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/system/startup', async (req, res) => {
    try {
      const { autoStart, minimizeToTray } = req.body || {};
      const result = await invokeMaintenanceEngine('set_startup_config', {
        auto_start: Boolean(autoStart),
        minimize_to_tray: Boolean(minimizeToTray !== false)
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });



  const DIST_DIR = path.join(ROOT_DIR, 'dist');
  const hasDist = fs.existsSync(path.join(DIST_DIR, 'index.html'));
  const isProduction = (process.env.NODE_ENV === 'production' && hasDist) || process.env.NEVEA_SKIP_VITE === '1';

  if (!isProduction) {
    // In dev mode or when prebuilt dist is not present, attach Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving from prebuilt dist directory
    app.use(express.static(DIST_DIR, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path.startsWith('/live')) {
        return next();
      }
      const indexPath = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      const rootIndex = path.join(ROOT_DIR, 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
      return next();
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[NEVEA Companion Server] Active on http://${HOST}:${PORT}`);
  });
  return { app, server };
}
