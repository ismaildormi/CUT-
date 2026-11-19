import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  LogIn,
  LogOut,
  FileDown,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Zap,
  Server,
  Sparkles,
  Crown,
  KeyRound,
  LayoutGrid,
  Laptop,
} from 'lucide-react';
import {
  NeveaAccountProfile,
  registerAccountClient,
  loginAccountClient,
  logoutAccountClient,
  downloadRequiredValuesPdfClient,
  syncOwnerDeviceAcrossCloudClient,
} from '../services/accountAndPdfService';
import { playCuteSound } from '../services/audioSynth';

interface AccountAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: NeveaAccountProfile | null;
  onAccountChanged: (account: NeveaAccountProfile | null) => void;
  onOpenSovereignOS?: () => void;
  initialMode?: 'register' | 'login';
  lang?: string;
}

export const AccountAuthModal: React.FC<AccountAuthModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onAccountChanged,
  onOpenSovereignOS,
  initialMode = 'login',
  lang = 'en',
}) => {
  const isAr = lang === 'ar';
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const passwordsMatch =
    mode === 'login' || (password.length >= 6 && password === confirmPassword);

  const handleQuickFounderSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    playCuteSound('boop');
    try {
      const res = await loginAccountClient({
        username: 'HEYOKA',
        password: 'HEYOKA_FOUNDER_KEY',
      });
      if (res.success && res.account) {
        playCuteSound('yiii');
        onAccountChanged(res.account);
        setSuccessMsg(
          isAr
            ? `تم تسجيل الدخول كمالك مؤسس (@${res.account.username}) وتفعيل النظام السيادي.`
            : `Signed in as Founder Sovereign Owner (@${res.account.username}).`
        );
      } else {
        setErrorMsg(
          res.error ||
            (isAr
              ? 'تعذر تسجيل الدخول السريع، يرجى إدخال كلمة السر الخاصة بحساب HEYOKA.'
              : 'Please enter your HEYOKA password below to sign in.')
        );
        setUsername('HEYOKA');
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const res = await registerAccountClient({
          username,
          password,
          confirmPassword,
        });
        if (!res.success || !res.account) {
          const rawErr = res.error || '';
          let localizedErr = rawErr;
          if (isAr) {
            if (rawErr.includes('Account name must be at least 3 characters')) {
              localizedErr = 'يجب أن يتكون اسم الحساب من 3 أحرف على الأقل.';
            } else if (rawErr.includes('Password must be at least 6 characters')) {
              localizedErr = 'يجب أن تتكون كلمة السر من 6 أحرف على الأقل.';
            } else if (rawErr.includes('Passwords do not match')) {
              localizedErr = 'كلمتا السر غير متطابقتين. يرجى التأكيد بدقة.';
            } else if (rawErr.includes('already exists')) {
              localizedErr = `الحساب "${username}" مسجل بالفعل. يرجى تسجيل الدخول.`;
            } else {
              localizedErr = rawErr || 'تعذر إنشاء الحساب.';
            }
          }
          setErrorMsg(localizedErr);
          playCuteSound('squeak');
        } else {
          playCuteSound('yiii');
          onAccountChanged(res.account);
          setSuccessMsg(
            isAr
              ? res.account.isSovereignOwner
                ? `تم إنشاء حساب المالك المؤسس (@${res.account.username}) بنجاح.`
                : `تم إنشاء الحساب @${res.account.username} بنجاح.`
              : res.account.isSovereignOwner
              ? `Created Founder Sovereign Owner account (@${res.account.username}).`
              : `Account @${res.account.username} created successfully.`
          );
          setUsername('');
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const res = await loginAccountClient({
          username,
          password,
        });
        if (!res.success || !res.account) {
          const rawErr = res.error || '';
          let localizedErr = rawErr;
          if (isAr) {
            if (rawErr.includes('Please enter both')) {
              localizedErr = 'يرجى إدخال اسم الحساب وكلمة السر.';
            } else if (rawErr.includes('was not found')) {
              localizedErr = `الحساب "${username}" غير موجود. يرجى إنشاء حساب جديد.`;
            } else if (rawErr.includes('Incorrect password')) {
              localizedErr = 'كلمة السر غير صحيحة لهذا الحساب.';
            } else {
              localizedErr = rawErr || 'تعذر تسجيل الدخول.';
            }
          }
          setErrorMsg(localizedErr);
          playCuteSound('squeak');
        } else {
          playCuteSound('yiii');
          onAccountChanged(res.account);
          setSuccessMsg(
            isAr
              ? `مرحباً بك @${res.account.username}، تم التحقق من الجلسة بنجاح.`
              : `Welcome back @${res.account.username}, session verified.`
          );
          setUsername('');
          setPassword('');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    playCuteSound('boop');
    await logoutAccountClient();
    onAccountChanged(null);
    setSuccessMsg(null);
    setMode('login');
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    playCuteSound('yiii');
    try {
      const res = await downloadRequiredValuesPdfClient();
      if (res.success) {
        setSuccessMsg(
          isAr
            ? 'تم تحميل ملف القيم والمصادر بصيغة PDF بنجاح.'
            : 'Downloaded the Cloud Keys & 120 Sources PDF Manifest.'
        );
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl select-none"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl bg-[#0A0A0E] border border-white/15 shadow-[0_28px_90px_rgba(0,0,0,0.92)] overflow-hidden text-white"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-[#0E0E14] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white text-[#050505] flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={18} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-white truncate">
                    {isAr ? 'تسجيل الدخول وإدارة الهوية' : 'Account & Identity'}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-[9px] font-mono font-semibold text-white/80">
                    AES-256
                  </span>
                </div>
                <p className="text-[11px] text-white/55 truncate mt-0.5">
                  {isAr
                    ? 'حساب المالك المؤسس (HEYOKA) يفتح لوحة السيادة تلقائياً'
                    : 'Founder account (@HEYOKA) unlocks Sovereign Owner OS'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer shrink-0 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {currentAccount ? (
              <div className="flex flex-col gap-3.5">
                <div className="p-4 rounded-xl bg-[#111118] border border-white/12 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#050505] font-bold text-sm flex items-center justify-center shrink-0">
                        {currentAccount.isSovereignOwner ? (
                          <Crown size={17} strokeWidth={2.2} />
                        ) : (
                          currentAccount.username.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">
                            @{currentAccount.username}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-mono font-bold text-emerald-300">
                            {currentAccount.isSovereignOwner
                              ? isAr
                                ? 'المالك المؤسس'
                                : 'FOUNDER OWNER'
                              : isAr
                              ? 'مبدع'
                              : 'CREATOR'}
                          </span>
                        </div>
                        <span className="text-[11px] text-white/55 block mt-0.5 truncate">
                          {isAr
                            ? currentAccount.roleAr || 'جلسة مشفرة نشطة'
                            : currentAccount.roleEn || 'Active Encrypted Session'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-[11px] font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <LogOut size={12} />
                      <span>{isAr ? 'خروج' : 'Sign Out'}</span>
                    </button>
                  </div>

                  {currentAccount.ownerRecoveryKey && (
                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <KeyRound size={12} className="text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-white/65">
                          {isAr ? 'مفتاح الاسترداد:' : 'Recovery Key:'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                        {currentAccount.ownerRecoveryKey}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/8 flex flex-col">
                      <span className="text-[10px] text-white/50">
                        {isAr ? 'المضاعف' : 'Multiplier'}
                      </span>
                      <span className="text-xs font-mono font-bold text-white flex items-center gap-1 mt-0.5 tabular-nums">
                        <Zap size={11} className="text-emerald-400" />
                        {currentAccount.effectivePowerMultiplier}x
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/8 flex flex-col">
                      <span className="text-[10px] text-white/50">
                        {isAr ? 'المصادر' : 'Sources'}
                      </span>
                      <span className="text-xs font-mono font-bold text-white flex items-center gap-1 mt-0.5 tabular-nums">
                        <Sparkles size={11} className="text-cyan-400" />
                        120 Live
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/50 border border-white/8 flex flex-col">
                      <span className="text-[10px] text-white/50">
                        {isAr ? 'السحابات' : 'Gateways'}
                      </span>
                      <span className="text-xs font-mono font-bold text-white flex items-center gap-1 mt-0.5 tabular-nums">
                        <Server size={11} className="text-emerald-400" />
                        +{currentAccount.serversSpawnedByAccount || 4}
                      </span>
                    </div>
                  </div>

                  {currentAccount.isSovereignOwner && (
                    <div className="flex flex-col gap-2 pt-1">
                      {onOpenSovereignOS && (
                        <button
                          type="button"
                          onClick={() => {
                            playCuteSound('yiii');
                            onClose();
                            onOpenSovereignOS();
                          }}
                          className="w-full h-10 rounded-xl bg-white text-[#050505] hover:bg-white/90 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <LayoutGrid size={14} strokeWidth={2.2} />
                          <span>
                            {isAr
                              ? 'فتح نظام المالك السيادي (Sovereign OS)'
                              : 'Open Sovereign Owner OS'}
                          </span>
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            playCuteSound('yiii');
                            const res = await syncOwnerDeviceAcrossCloudClient({
                              deviceName: isAr ? 'جهاز المالك الإضافي' : 'Secondary Owner Workstation',
                            });
                            if (res.success) {
                              setSuccessMsg(
                                isAr
                                  ? `تمت مزامنة الجهاز (${res.totalSyncedDevices || 2} أجهزة متصلة).`
                                  : `Synced Owner device (${res.totalSyncedDevices || 2} active).`
                              );
                            }
                          }}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-white transition-colors"
                        >
                          <Laptop size={12} />
                          <span className="truncate">
                            {isAr ? 'مزامنة جهاز آخر' : 'Sync 2nd Device'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={isDownloadingPdf}
                          className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-white transition-colors"
                        >
                          <FileDown size={12} className="text-emerald-400" />
                          <span className="truncate">
                            {isDownloadingPdf
                              ? isAr
                                ? 'جاري التحميل...'
                                : 'Downloading...'
                              : isAr
                              ? 'ملف القيم (PDF)'
                              : 'Values PDF'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* 1-Click Quick Founder Sign-In (@HEYOKA) */}
                <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Crown size={13} className="text-emerald-400 shrink-0" />
                      <span>
                        {isAr ? 'دخول المالك المؤسس السريع' : 'Founder Owner Quick Access'}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-0.5 truncate">
                      {isAr
                        ? 'دخول فوري بحساب @HEYOKA وتفعيل لوحة السيادة'
                        : 'Instant sign-in as @HEYOKA with Sovereign OS privileges'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleQuickFounderSignIn}
                    className="h-8 px-3 rounded-lg bg-white text-[#050505] hover:bg-white/90 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  >
                    <Zap size={12} />
                    <span>@HEYOKA</span>
                  </button>
                </div>

                {/* Mode Switcher */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#111118] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white text-[#050505] shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <LogIn size={13} />
                    <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white text-[#050505] shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <UserPlus size={13} />
                    <span>{isAr ? 'حساب جديد' : 'Create Account'}</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/80 flex items-center justify-between">
                      <span>{isAr ? 'اسم الحساب' : 'Username'}</span>
                      <span className="text-[10px] font-mono text-white/40">
                        {isAr ? 'مطلوب' : 'REQUIRED'}
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <User
                        size={14}
                        className={`absolute ${
                          isAr ? 'right-3.5' : 'left-3.5'
                        } text-white/45 pointer-events-none`}
                      />
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={40}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={isAr ? 'مثال: HEYOKA' : 'e.g. HEYOKA'}
                        className={`w-full h-10 ${
                          isAr ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'
                        } rounded-xl bg-black/60 border border-white/15 focus:border-white/45 text-xs text-white placeholder-white/35 focus:outline-none transition-colors`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/80 flex items-center justify-between">
                      <span>{isAr ? 'كلمة السر' : 'Password'}</span>
                      <span className="text-[10px] font-mono text-white/40">
                        {isAr ? '6+ أحرف' : '6+ CHARS'}
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <Lock
                        size={14}
                        className={`absolute ${
                          isAr ? 'right-3.5' : 'left-3.5'
                        } text-white/45 pointer-events-none`}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isAr ? 'أدخل كلمة السر...' : 'Enter password...'}
                        className="w-full h-10 px-10 rounded-xl bg-black/60 border border-white/15 focus:border-white/45 text-xs text-white placeholder-white/35 focus:outline-none font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`absolute ${
                          isAr ? 'left-3' : 'right-3'
                        } text-white/45 hover:text-white cursor-pointer`}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-white/80 flex items-center justify-between">
                        <span>{isAr ? 'تأكيد كلمة السر' : 'Confirm Password'}</span>
                        {confirmPassword.length > 0 && (
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              passwordsMatch ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {passwordsMatch
                              ? isAr
                                ? 'متطابقة'
                                : 'MATCHED'
                              : isAr
                              ? 'غير متطابقة'
                              : 'MISMATCH'}
                          </span>
                        )}
                      </label>
                      <div className="relative flex items-center">
                        <Lock
                          size={14}
                          className={`absolute ${
                            isAr ? 'right-3.5' : 'left-3.5'
                          } text-white/45 pointer-events-none`}
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={
                            isAr ? 'أعد إدخال كلمة السر...' : 'Confirm password...'
                          }
                          className="w-full h-10 px-10 rounded-xl bg-black/60 border border-white/15 focus:border-white/45 text-xs text-white placeholder-white/35 focus:outline-none font-mono transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (mode === 'register' && !passwordsMatch)}
                    className="h-10 rounded-xl bg-white text-[#050505] hover:bg-white/90 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 mt-1 transition-colors"
                  >
                    {mode === 'register' ? <UserPlus size={14} /> : <LogIn size={14} />}
                    <span>
                      {isSubmitting
                        ? isAr
                          ? 'جاري التحقق...'
                          : 'Authenticating...'
                        : mode === 'register'
                        ? isAr
                          ? 'إنشاء الحساب'
                          : 'Create Account'
                        : isAr
                        ? 'تسجيل الدخول'
                        : 'Sign In'}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
