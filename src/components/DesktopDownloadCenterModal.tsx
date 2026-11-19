import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Terminal,
  GitBranch,
  FileDown,
  CheckCircle2,
  X,
  Laptop,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  downloadWindowsAutoInstallerClient,
  downloadGitHubExporterBatClient,
  downloadRequiredValuesPdfClient,
  downloadMasterBlueprintMdClient,
} from '../services/accountAndPdfService';
import { playCuteSound } from '../services/audioSynth';

interface DesktopDownloadCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSovereignOwner: boolean;
  lang?: string;
}

export const DesktopDownloadCenterModal: React.FC<DesktopDownloadCenterModalProps> = ({
  isOpen,
  onClose,
  isSovereignOwner,
  lang = 'en',
}) => {
  const isAr = lang === 'ar';
  const [notice, setNotice] = useState<string | null>(null);
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);

  React.useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPwaApp = async () => {
    playCuteSound('yiii');
    if (deferredPwaPrompt && typeof deferredPwaPrompt.prompt === 'function') {
      try {
        await deferredPwaPrompt.prompt();
        setDeferredPwaPrompt(null);
        setNotice(
          isAr
            ? 'تم فتح نافذة تثبيت تطبيق سطح المكتب (PWA) بنجاح.'
            : 'Launched native Desktop PWA installation prompt successfully.'
        );
        return;
      } catch {}
    }
    await handleDownloadWindowsBat();
  };

  const handleDownloadWindowsBat = async () => {
    playCuteSound('yiii');
    const res = await downloadWindowsAutoInstallerClient();
    if (res.success) {
      setNotice(
        isAr
          ? 'تم تحميل أداة التثبيت والتشغيل التلقائي للحاسوب (NOVA_Auto_Installer_Windows.bat) وتسجيل عملية التحميل بنجاح.'
          : 'Downloaded NOVA_Auto_Installer_Windows.bat and recorded the download in the compounding ledger.'
      );
    }
  };

  const handleDownloadGitHubBat = async () => {
    playCuteSound('yiii');
    const res = await downloadGitHubExporterBatClient();
    if (res.success) {
      setNotice(
        isAr
          ? 'تم تحميل أداة الرفع التلقائي إلى مستودع GitHub جديد (NOVA_GitHub_Push_Setup.bat) بنجاح.'
          : 'Downloaded NOVA_GitHub_Push_Setup.bat for automated GitHub repository export.'
      );
    }
  };

  const handleDownloadPdf = async () => {
    playCuteSound('yiii');
    await downloadRequiredValuesPdfClient();
    setNotice(
      isAr
        ? 'تم تحميل جدول المفاتيح الاختيارية والمصادر الكاملة بصيغة PDF.'
        : 'Downloaded the External Credentials & Sources Manifest PDF.'
    );
  };

  const handleDownloadBlueprint = async () => {
    playCuteSound('yiii');
    await downloadMasterBlueprintMdClient();
    setNotice(
      isAr
        ? 'تم تحميل المخطط الهندسي المعماري المحدث تلقائياً (NOVA_ULTIMATE_SYSTEM_BLUEPRINT.md).'
        : 'Downloaded the Living Architectural Blueprint (NOVA_ULTIMATE_SYSTEM_BLUEPRINT.md).'
    );
  };

  return (
    <AnimatePresence>
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-3xl rounded-2xl bg-[#09090D] border border-white/15 shadow-[0_32px_100px_rgba(0,0,0,0.95)] overflow-hidden text-white"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-[#0D0D14] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white text-[#050505] flex items-center justify-center shrink-0">
                <Laptop size={19} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  {isAr
                    ? 'مركز التحميل والتثبيت التلقائي للحاسوب والنقل إلى GitHub'
                    : 'Desktop Auto-Installer, ZIP Setup & GitHub Export Center'}
                </h2>
                <p className="text-xs text-white/60 mt-0.5">
                  {isAr
                    ? 'قم بتحميل المشروع وتشغيله على حاسوبك بضغطة واحدة بدون استهلاك موارد الجهاز'
                    : 'Download and launch the system on your PC with one click and zero local hardware bloat'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/75 hover:text-white cursor-pointer shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-6 flex flex-col gap-5 max-h-[82vh] overflow-y-auto">
            {notice && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>{notice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Dismiss'}
                </button>
              </div>
            )}

            {/* 4-Step Clear Workflow */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                <span>
                  {isAr
                    ? 'طريقة التشغيل التلقائي على الحاسوب بعد تحميل ملف المشروع المضغوط'
                    : 'How to Run Automatically on Your PC After Downloading the Project ZIP'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-white/75">
                <div className="p-3 rounded-lg bg-black/50 border border-white/8">
                  <span className="font-mono font-bold text-white block mb-1">
                    {isAr ? 'الخطوة 01: فك الضغط' : 'Step 01: Extract Project ZIP'}
                  </span>
                  <span>
                    {isAr
                      ? 'قم بتحميل ملف المشروع المضغوط وفك ضغطه في مجلد جديد على حاسوبك.'
                      : 'Download the project ZIP archive and extract it into a new folder on your PC.'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/8">
                  <span className="font-mono font-bold text-white block mb-1">
                    {isAr ? 'الخطوة 02: التشغيل التلقائي' : 'Step 02: One-Click Auto-Installer'}
                  </span>
                  <span>
                    {isAr
                      ? 'اضغط مرتين على ملف NOVA_Auto_Installer_Windows.bat الموجود داخل المجلد ليقوم بتثبيت الحزم وفتح التطبيق تلقائياً.'
                      : 'Double-click NOVA_Auto_Installer_Windows.bat inside the folder to auto-install dependencies and launch the desktop window.'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/8">
                  <span className="font-mono font-bold text-white block mb-1">
                    {isAr ? 'الخطوة 03: تسجيل أول حساب (المالك)' : 'Step 03: Register First Account (Owner)'}
                  </span>
                  <span>
                    {isAr
                      ? 'النظام يبدأ صفرياً بالكامل (0 حسابات). أول حساب تسجله يتوج تلقائياً كمالك مؤسس للنظام ويفتح لك لوحة السيادة.'
                      : 'The system starts at 0 accounts. The very first account you register becomes the Founder Sovereign Owner and unlocks the Owner OS.'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/8">
                  <span className="font-mono font-bold text-white block mb-1">
                    {isAr ? 'الخطوة 04: النقل إلى GitHub' : 'Step 04: Export to GitHub'}
                  </span>
                  <span>
                    {isAr
                      ? 'اضغط مرتين على NOVA_GitHub_Push_Setup.bat لرفع المشروع بالكامل إلى مستودع GitHub جديد خاص بك.'
                      : 'Double-click NOVA_GitHub_Push_Setup.bat to push the entire codebase to a new GitHub repository.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actionable Download Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-[#0D0D14] border border-white/12 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" />
                      {isAr
                        ? 'أداة التثبيت والتشغيل التلقائي لويندوز'
                        : 'Windows Automated Installer & Launcher'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold">
                      .BAT
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'ملف مدمج أيضاً داخل مجلد المشروع الرئيسي؛ يقوم بفحص البيئة وتثبيت الحزم وتشغيل السيرفر وفتح نافذة سطح المكتب تلقائياً.'
                      : 'Included in the project root; automatically checks Node.js, installs packages, starts the server, and opens the app window.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadWindowsBat}
                  className="h-10 px-4 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} />
                  <span>
                    {isAr
                      ? 'تحميل مشغل الحاسوب التلقائي (.BAT)'
                      : 'Download Windows Auto-Installer (.BAT)'}
                  </span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#0D0D14] border border-white/12 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <GitBranch size={14} className="text-sky-400" />
                      {isAr
                        ? 'أداة النقل التلقائي إلى GitHub'
                        : 'Automated GitHub Repository Exporter'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono text-[10px] font-bold">
                      GIT
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                    {isAr
                      ? 'يهيئ مستودع Git جديد ويرفع جميع ملفات المشروع إلى حسابك في GitHub بخطوة واحدة مع حماية ملف المفاتيح السرية.'
                      : 'Initializes a clean Git repository and pushes all project files to your GitHub account while keeping .env secrets excluded.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadGitHubBat}
                  className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GitBranch size={14} />
                  <span>
                    {isAr
                      ? 'تحميل أداة النقل إلى GitHub (.BAT)'
                      : 'Download GitHub Exporter (.BAT)'}
                  </span>
                </button>
              </div>
            </div>

            {/* All Working Features & Capabilities Manifest Download (Available to All Users) */}
            <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <FileText size={14} className="text-emerald-400 shrink-0" />
                  <span>
                    {isAr
                      ? 'ملف شامل لكل الميزات العاملة وقدرات التطبيق الكاملة (عربي + English)'
                      : 'Complete Working Features & System Capabilities Manifest (EN + AR)'}
                  </span>
                </div>
                <p className="text-[11px] text-white/65 mt-1">
                  {isAr
                    ? 'يحتوي على توثيق كامل لمحرك 3D GPU، الصوت الحي، 6 نماذج ذكية، 120 مصدراً مجانياً بدون مفاتيح، وخزنة الحسابات.'
                    : 'Full documentation of the 60 FPS 3D GPU Fur Engine, Live Voice, 6 AI Models, 120 Zero-Key Sources, and Account Vault.'}
                </p>
              </div>
              <a
                href="/NEVEA_NOVA_ALL_WORKING_FEATURES_AND_CAPABILITIES.md"
                download="NEVEA_NOVA_ALL_WORKING_FEATURES_AND_CAPABILITIES.md"
                onClick={() => {
                  playCuteSound('yiii');
                  setNotice(
                    isAr
                      ? 'تم تحميل ملف جميع الميزات العاملة وقدرات التطبيق (NEVEA_NOVA_ALL_WORKING_FEATURES_AND_CAPABILITIES.md).'
                      : 'Downloaded NEVEA_NOVA_ALL_WORKING_FEATURES_AND_CAPABILITIES.md.'
                  );
                }}
                className="h-10 px-4 rounded-xl bg-emerald-400 text-[#050505] hover:bg-emerald-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <FileDown size={14} />
                <span>
                  {isAr ? 'تحميل ملف الميزات والقدرات (.MD)' : 'Download All Features File (.MD)'}
                </span>
              </a>
            </div>

            {/* Owner-Exclusive Manifest & Blueprint Downloads */}
            {isSovereignOwner && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleDownloadBlueprint}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText size={14} />
                  <span>
                    {isAr
                      ? 'تحميل المخطط المعماري الشامل (.MD)'
                      : 'Download Architectural Blueprint (.MD)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/12 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileDown size={14} />
                  <span>
                    {isAr
                      ? 'تحميل جدول مفاتيح السحابة والمصادر (.PDF)'
                      : 'Download Cloud Keys & Sources Manifest (.PDF)'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
