import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  RefreshCw,
  Zap,
  Terminal,
  Server,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  selfHealingDiagnosticService,
  SelfHealingDiagnosticSnapshot,
  DiagnosticLogLevel,
} from '../services/selfHealingDiagnosticService';
import { playCuteSound } from '../services/audioSynth';

interface SelfHealingDiagnosticConsoleProps {
  compact?: boolean;
}

const FAULT_TARGETS = [
  { id: 'codex-engineer', label: 'Agent: Codex Engineer' },
  { id: 'nova-research', label: 'Agent: Nova Researcher' },
  { id: 'titan-os', label: 'Agent: Titan Desktop & OS' },
  { id: 'api-swarm-company', label: 'API: /api/company/state' },
  { id: 'api-cosmic-sources', label: 'API: /api/company/universal-sources' },
  { id: 'api-hybrid-memory', label: 'API: Hybrid Vector Memory' },
];

export const SelfHealingDiagnosticConsole: React.FC<SelfHealingDiagnosticConsoleProps> = ({
  compact = false,
}) => {
  const [snapshot, setSnapshot] = useState<SelfHealingDiagnosticSnapshot>(() =>
    selfHealingDiagnosticService.getSnapshot()
  );
  const [activeView, setActiveView] = useState<'console' | 'agents' | 'apis'>('console');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ISSUES' | 'RECOVERY'>('ALL');
  const [faultIndex, setFaultIndex] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = selfHealingDiagnosticService.subscribe((nextSnap) => {
      setSnapshot(nextSnap);
    });
    return unsubscribe;
  }, []);

  const handleRunManualAudit = async () => {
    playCuteSound('boop');
    await selfHealingDiagnosticService.runDiagnosticCycle();
  };

  const handleSimulateFaultAndHeal = async () => {
    playCuteSound('squeak');
    const target = FAULT_TARGETS[faultIndex % FAULT_TARGETS.length];
    setFaultIndex((prev) => prev + 1);
    setActiveView('console');
    await selfHealingDiagnosticService.runDiagnosticCycle({
      injectFaultTarget: target.id,
    });
  };

  const handleTogglePeriodic = () => {
    playCuteSound('boop');
    if (snapshot.isRunning) {
      selfHealingDiagnosticService.stopPeriodicAudit();
    } else {
      selfHealingDiagnosticService.startPeriodicAudit(snapshot.intervalMs);
    }
  };

  const filteredLogs = snapshot.consoleLogs.filter((entry) => {
    if (logFilter === 'ISSUES') return entry.level === 'WARN' || entry.level === 'ERROR';
    if (logFilter === 'RECOVERY') return entry.level === 'RECOVERY';
    return true;
  });

  const getLevelBadgeStyle = (level: DiagnosticLogLevel) => {
    switch (level) {
      case 'RECOVERY':
        return 'bg-white text-[#050505] border-white font-bold';
      case 'ERROR':
        return 'bg-white/20 text-white border-white/40 font-bold';
      case 'WARN':
        return 'bg-white/15 text-white/90 border-white/25';
      default:
        return 'bg-white/[0.06] text-white/65 border-white/10';
    }
  };

  return (
    <div className="p-3 rounded-xl bg-[#070708] border border-white/20 flex flex-col gap-2.5 text-white">
      {/* Top Status & Watchdog Control Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white text-[#050505] flex items-center justify-center shrink-0">
            <ShieldCheck size={15} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-display font-bold text-white truncate">
                Self-Healing Watchdog & System Console
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white text-[#050505] font-mono text-[9px] font-bold shrink-0">
                {snapshot.overallHealthScore}% HEALTH
              </span>
            </div>
            <p className="text-[10px] font-mono text-white/55 truncate">
              Audits: #{snapshot.totalAuditsRun} · Issues: {snapshot.totalIssuesDetected} ·
              Auto-Healed: {snapshot.totalAutoRecoveries} · Last: {snapshot.lastAuditTimestamp}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleTogglePeriodic}
            className={`h-7 px-2 rounded-lg text-[10px] font-mono font-bold inline-flex items-center gap-1 border cursor-pointer transition-colors ${
              snapshot.isRunning
                ? 'bg-white text-[#050505] border-white'
                : 'bg-white/10 text-white/75 border-white/20 hover:text-white'
            }`}
            title="Toggle Periodic Health Audit Loop"
          >
            {snapshot.isRunning ? <Pause size={10} /> : <Play size={10} />}
            <span>{snapshot.isRunning ? `AUTO (${snapshot.intervalMs / 1000}s)` : 'PAUSED'}</span>
          </button>

          <button
            type="button"
            disabled={snapshot.isAuditingNow}
            onClick={handleRunManualAudit}
            className="h-7 px-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-mono font-bold text-white inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Audit All Agents & APIs Immediately"
          >
            <RefreshCw size={10} className={snapshot.isAuditingNow ? 'animate-spin' : ''} />
            <span>Audit Now</span>
          </button>

          <button
            type="button"
            disabled={snapshot.isAuditingNow}
            onClick={handleSimulateFaultAndHeal}
            className="h-7 px-2.5 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Inject a fault to verify live detection & automated self-healing recovery"
          >
            <Wrench size={10} />
            <span>Simulate Fault & Heal</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs: System Console | 6 Agents | 6 API Connections */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/80 border border-white/12">
        <button
          type="button"
          onClick={() => setActiveView('console')}
          className={`h-7 rounded-lg text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            activeView === 'console'
              ? 'bg-white text-[#050505]'
              : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Terminal size={11} />
          <span>System Console ({snapshot.consoleLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('agents')}
          className={`h-7 rounded-lg text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            activeView === 'agents'
              ? 'bg-white text-[#050505]'
              : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Cpu size={11} />
          <span>6 Agents ({snapshot.agents.length}/6)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('apis')}
          className={`h-7 rounded-lg text-[10px] font-mono font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            activeView === 'apis'
              ? 'bg-white text-[#050505]'
              : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <Server size={11} />
          <span>6 APIs ({snapshot.apis.length}/6)</span>
        </button>
      </div>

      {/* VIEW 1: NEVEA SYSTEM CONSOLE LOG STREAM */}
      {activeView === 'console' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1">
              {(['ALL', 'ISSUES', 'RECOVERY'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer border transition-colors ${
                    logFilter === f
                      ? 'bg-white text-[#050505] border-white'
                      : 'bg-black/60 text-white/60 border-white/12 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={snapshot.intervalMs}
                onChange={(e) =>
                  selfHealingDiagnosticService.setAuditInterval(Number(e.target.value))
                }
                className="bg-black border border-white/15 rounded px-1.5 py-0.5 text-[9px] font-mono text-white/80 focus:outline-none"
                title="Periodic Audit Interval"
              >
                <option value={15000}>Every 15s</option>
                <option value={25000}>Every 25s</option>
                <option value={60000}>Every 60s</option>
              </select>
              <button
                type="button"
                onClick={() => selfHealingDiagnosticService.clearConsoleLogs()}
                className="text-[9px] font-mono text-white/50 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                title="Clear Console Logs"
              >
                <Trash2 size={10} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div
            className={`p-2 rounded-xl bg-black/95 border border-white/15 font-mono flex flex-col gap-1.5 overflow-y-auto ${
              compact ? 'max-h-40' : 'max-h-52'
            }`}
          >
            {filteredLogs.length === 0 ? (
              <div className="py-4 text-center text-[10px] text-white/45">
                No console entries matching filter [{logFilter}].
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex flex-col gap-1 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[8px] border shrink-0 ${getLevelBadgeStyle(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                      <span className="text-[9px] text-white/60 truncate">
                        [{log.subsystem}:{log.targetId}]
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[9px] text-white/45">
                      {typeof log.latencyMs === 'number' && <span>{log.latencyMs}ms</span>}
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-white/90 leading-relaxed break-words">{log.message}</p>
                  {log.remediationAction && (
                    <div className="px-2 py-1 rounded bg-white/10 border border-white/20 text-[9px] text-white flex items-center gap-1.5">
                      <Zap size={10} className="shrink-0" />
                      <span className="truncate">Auto-Remediation: {log.remediationAction}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 6 AUTONOMOUS AGENTS HEALTH MATRIX */}
      {activeView === 'agents' && (
        <div
          className={`flex flex-col gap-1.5 overflow-y-auto pr-0.5 ${
            compact ? 'max-h-44' : 'max-h-56'
          }`}
        >
          {snapshot.agents.map((agent) => (
            <div
              key={agent.id}
              className="p-2 rounded-lg bg-black/80 border border-white/12 flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="text-[11px] font-bold text-white truncate">{agent.name}</span>
                  <span className="text-[9px] font-mono text-white/50 truncate">
                    · ({agent.coordinates.x}, {agent.coordinates.y}) · {agent.latencyMs}ms
                  </span>
                </div>
                <p className="text-[9px] font-mono text-white/65 truncate mt-0.5">
                  {agent.currentTask}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {agent.recoveryCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[8px] font-mono text-white">
                    Healed ×{agent.recoveryCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    selfHealingDiagnosticService.runDiagnosticCycle({
                      injectFaultTarget: agent.id,
                    })
                  }
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/25 border border-white/20 text-[9px] font-mono text-white cursor-pointer"
                  title="Simulate fault & auto-heal this agent"
                >
                  Heal
                </button>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                    agent.status === 'RECOVERED'
                      ? 'bg-white text-[#050505]'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: 6 CORE API CONNECTIONS HEALTH MATRIX */}
      {activeView === 'apis' && (
        <div
          className={`flex flex-col gap-1.5 overflow-y-auto pr-0.5 ${
            compact ? 'max-h-44' : 'max-h-56'
          }`}
        >
          {snapshot.apis.map((api) => (
            <div
              key={api.id}
              className="p-2 rounded-lg bg-black/80 border border-white/12 flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-white shrink-0" />
                  <span className="text-[11px] font-bold text-white truncate">{api.name}</span>
                  <span className="text-[9px] font-mono text-white/50 shrink-0">
                    HTTP {api.httpStatus} · {api.latencyMs}ms
                  </span>
                </div>
                <p className="text-[9px] font-mono text-white/65 truncate mt-0.5">
                  {api.endpoint} — {api.detail}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {api.recoveryCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[8px] font-mono text-white">
                    Healed ×{api.recoveryCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    selfHealingDiagnosticService.runDiagnosticCycle({
                      injectFaultTarget: api.id,
                    })
                  }
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/25 border border-white/20 text-[9px] font-mono text-white cursor-pointer"
                  title="Simulate fault & auto-heal this API connection"
                >
                  Heal
                </button>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                    api.status === 'RECOVERED'
                      ? 'bg-white text-[#050505]'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  {api.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
