import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, X, Terminal } from 'lucide-react';
import { playCuteSound } from '../services/audioSynth';

export interface PermissionRequest {
  id?: string;
  toolName?: string;
  action?: string;
  command?: string;
  path?: string;
  appName?: string;
  details?: string;
  timeoutSec?: number;
  resolve?: (allowed: boolean) => void;
}

export type PendingPermissionRequest = PermissionRequest;

interface PermissionModalProps {
  request: PermissionRequest | null;
  onDecide?: (id: string, allowed: boolean) => void;
  onClose?: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ request, onDecide, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!request) return;
    const initialTime = request.timeoutSec || 15;
    setTimeLeft(initialTime);
    playCuteSound('squeak');

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDecision(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request]);

  if (!request) return null;

  const handleDecision = (allowed: boolean) => {
    if (request.resolve) {
      request.resolve(allowed);
    }
    if (onDecide) {
      onDecide(request.id || request.toolName || 'unknown', allowed);
    }
    if (onClose) {
      onClose();
    }
  };

  const rawAction = request.action || request.toolName || 'Sensitive Action';
  const actionLabels: Record<string, string> = {
    execute_powershell: 'Execute PowerShell Command',
    execute_powershell_admin: 'Execute Administrative PowerShell',
    execute_terminal_command: 'Run Terminal Command',
    delete_file: 'Permanently Delete File',
    close_app: 'Force Close Application',
    clean_system: 'Clean System & Empty Recycle Bin',
    write_file: 'Create / Overwrite File',
    write_to_any_file: 'Write / Modify Local File (Universal File Engine)',
    click_element_background: 'Ghost Cursor Background Click (Sensitive App/UI)',
    type_text_background: 'Background Window Keystroke Injection',
    git_clone: 'Git Clone Repository',
    git_status: 'Check Git Status',
    git_commit: 'Git Commit Changes',
    git_push: 'Git Push to Remote',
    create_remote_repo: 'Create Remote Repository',
    delete_repo: 'Delete Remote Repository',
    upload_file_to_repo: 'Upload File to Remote Repository',
    install_npm_package: 'Install NPM Package',
    install_pip_package: 'Install Python PIP Package',
    run_script: 'Execute Project Script',
    install_system_tool: 'Install System Software (Winget)',
    execute_dynamic_tool: 'Execute Dynamic Tool',
    composio_execute_action: 'Execute Composio Action',
    slack_tool: 'Post to Slack via Universal Vault',
    notion_tool: 'Interact with Notion via Universal Vault',
  };

  const actionTitle =
    actionLabels[rawAction] ||
    (rawAction.endsWith('_tool')
      ? `Execute Autonomous Tool (${rawAction})`
      : rawAction.replace(/_/g, ' ').toUpperCase());

  // Construct exact command display for user transparency
  let exactCommand = request.command || request.path || request.appName || request.details || '';
  if (rawAction === 'write_to_any_file') {
    const targetPath = (request as any).file_path || request.path || request.details || 'local file';
    exactCommand = `write_to_any_file("${targetPath}") — Modify local file via Universal File Engine`;
  } else if (rawAction === 'click_element_background') {
    const x = (request as any).x ?? '?';
    const y = (request as any).y ?? '?';
    const win = (request as any).window_title || request.appName || request.details || 'Desktop UI';
    exactCommand = `click_element_background(x=${x}, y=${y}, window="${win}")`;
  } else if (rawAction === 'type_text_background') {
    const win = (request as any).window_title || request.appName || 'Background Window';
    exactCommand = `type_text_background(window="${win}", text="${request.details || '***'}")`;
  } else if (rawAction === 'git_clone') {
    const url = (request as any).repo_url || (request as any).repoUrl || (request as any).url || request.command || request.details || '';
    const dest = (request as any).destination_path || (request as any).target_dir || '';
    exactCommand = `git clone ${url}${dest ? ` ${dest}` : ''}`.trim();
  } else if (rawAction === 'git_push') {
    exactCommand = `NEVEA wants to push code to GitHub. Allow?`;
  } else if (rawAction === 'create_remote_repo') {
    exactCommand = `NEVEA wants to create remote repository "${request.details || 'app'}" on GitHub/GitLab. Allow?`;
  } else if (rawAction === 'delete_repo') {
    exactCommand = `NEVEA wants to permanently delete remote repository "${request.details || 'app'}". Allow?`;
  } else if (rawAction === 'upload_file_to_repo') {
    exactCommand = `NEVEA wants to upload and commit files to remote repository. Allow?`;
  } else if (rawAction === 'slack_tool') {
    exactCommand = `NEVEA wants to send a Slack notification using your Universal Vault SLACK_BOT_TOKEN. Allow?`;
  } else if (rawAction === 'notion_tool') {
    exactCommand = `NEVEA wants to interact with your Notion workspace using your Universal Vault NOTION_API_KEY. Allow?`;
  } else if (rawAction.endsWith('_tool') || rawAction === 'execute_dynamic_tool') {
    exactCommand = `NEVEA wants to execute autonomous tool "${rawAction}" via Universal Vault. Allow?`;
  } else if (rawAction === 'composio_execute_action') {
    exactCommand = `NEVEA wants to execute Composio action "${(request as any).action || request.details}". Allow?`;
  } else if (rawAction === 'install_npm_package') {
    const pkg = (request as any).package_name || (request as any).packageName || (request as any).package || request.command || request.details || '';
    exactCommand = `npm install ${pkg}`.trim();
  } else if (rawAction === 'install_pip_package') {
    const pkg = (request as any).package_name || (request as any).packageName || (request as any).package || request.command || request.details || '';
    exactCommand = `pip install ${pkg}`.trim();
  } else if (rawAction === 'install_system_tool') {
    const tool = (request as any).tool_name || (request as any).toolName || (request as any).tool || request.command || request.details || '';
    exactCommand = `winget install ${tool}`.trim();
  } else if (rawAction === 'git_commit') {
    const msg = (request as any).message || request.details || 'Update';
    exactCommand = `git add . && git commit -m "${msg}"`;
  } else if (rawAction === 'run_script') {
    exactCommand = (request as any).command || request.details || 'npm test';
  }

  const isHighRisk =
    rawAction.includes('admin') ||
    rawAction.includes('delete') ||
    rawAction.includes('clean') ||
    rawAction === 'write_to_any_file' ||
    rawAction === 'click_element_background' ||
    rawAction.includes('git_push') ||
    rawAction.includes('create_remote_repo') ||
    rawAction.includes('delete_repo') ||
    rawAction.endsWith('_tool') ||
    rawAction.includes('dynamic') ||
    rawAction === 'install_system_tool';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md p-5 rounded-2xl bg-[#0a0a0a] border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.15)] text-white flex flex-col gap-4 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <ShieldAlert size={16} />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Permission Gate
                </h3>
                <p className="text-[10px] text-white/50">User Consent Required</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isHighRisk
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                Risk Level: {isHighRisk ? (rawAction === 'install_system_tool' ? 'High (Admin Rights)' : 'High') : 'Moderate'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/80">
                Timeout: {timeLeft}s
              </span>
            </div>
          </div>

          {/* Action Prompt */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
            <span className="text-xs text-white/90 font-medium">
              NEVEA wants to run: <strong className="text-amber-300 font-mono">{exactCommand || actionTitle}</strong>. Allow?
            </span>
            <div className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Terminal size={14} className="text-amber-300 shrink-0" />
              <span>{actionTitle}</span>
            </div>

            {exactCommand && (
              <div className="mt-1 p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-white/80 break-all max-h-28 overflow-y-auto">
                $ {exactCommand}
              </div>
            )}
          </div>

          <p className="text-[10px] text-white/50 leading-relaxed">
            This action interacts with your local system. By clicking Allow, you authorize execution with standard user permissions.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                playCuteSound('boop');
                handleDecision(false);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <X size={14} />
              <span>Block / Cancel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playCuteSound('yiii');
                handleDecision(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-white/95 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              <Check size={14} />
              <span>Allow Action</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
