import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  Sparkles,
  Database,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Cpu,
  Crown,
} from 'lucide-react';
import axios from 'axios';
import { playCuteSound } from '../services/audioSynth';

import {
  loadDecryptedByokSettings,
  saveEncryptedByokSettings,
} from '../services/yukaByokVault';
import { saveKaspiCredentials } from '../services/kaspiModelsClient';

export interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [heyukaApiKey, setHeyukaApiKey] = useState('');
  const [heyukaKeyId, setHeyukaKeyId] = useState('');
  const [showHeyukaKey, setShowHeyukaKey] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [pythonPath, setPythonPath] = useState('python');

  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [showSupabase, setShowSupabase] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Preload existing stored credentials if available
  useEffect(() => {
    try {
      const electron = (window as any).electron;
      if (electron?.store?.get) {
        const creds = electron.store.get('onboarding_credentials') || {};
        if (creds.heyukaApiKey) setHeyukaApiKey(creds.heyukaApiKey);
        if (creds.heyukaKeyId) setHeyukaKeyId(creds.heyukaKeyId);
        if (creds.geminiKey) setGeminiKey(creds.geminiKey);
        if (creds.groqKey) setGroqKey(creds.groqKey);
        if (creds.supabaseUrl) setSupabaseUrl(creds.supabaseUrl);
        if (creds.supabaseAnonKey) setSupabaseAnonKey(creds.supabaseAnonKey);
        if (creds.pythonPath) setPythonPath(creds.pythonPath);
      }
    } catch {}

    const localCreds = localStorage.getItem('nevea_onboarding_credentials');
    if (localCreds) {
      try {
        const parsed = JSON.parse(localCreds);
        if (parsed.heyukaApiKey) setHeyukaApiKey(parsed.heyukaApiKey);
        if (parsed.heyukaKeyId) setHeyukaKeyId(parsed.heyukaKeyId);
        if (parsed.geminiKey) setGeminiKey(parsed.geminiKey);
        if (parsed.groqKey) setGroqKey(parsed.groqKey);
        if (parsed.supabaseUrl) setSupabaseUrl(parsed.supabaseUrl);
        if (parsed.supabaseAnonKey) setSupabaseAnonKey(parsed.supabaseAnonKey);
        if (parsed.pythonPath) setPythonPath(parsed.pythonPath);
      } catch {}
    }
  }, []);

  const handleSaveAndContinue = async (skip = false) => {
    setIsSubmitting(true);
    setStatusMessage('Securing configurations locally in electron-store...');
    playCuteSound('boop');

    const credentials = {
      heyukaApiKey: heyukaApiKey.trim(),
      heyukaKeyId: heyukaKeyId.trim(),
      kaspiApiBaseUrl: 'https://kaspi-pos.vercel.app/api/v1',
      geminiKey: geminiKey.trim(),
      groqKey: groqKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      pythonPath: pythonPath.trim() || 'python',
      setupCompleted: true,
      timestamp: Date.now(),
    };

    // 1. Save directly into electron-store
    try {
      const electron = (window as any).electron;
      if (electron?.store?.set) {
        electron.store.set('onboarding_credentials', credentials);
        electron.store.set('setup_completed', true);
        if (credentials.heyukaApiKey) {
          electron.store.set('HEYUKA_API_KEY', credentials.heyukaApiKey);
        }
        if (credentials.heyukaKeyId) {
          electron.store.set('HEYUKA_KEY_ID', credentials.heyukaKeyId);
        }
        if (credentials.geminiKey) {
          electron.store.set('GEMINI_API_KEY', credentials.geminiKey);
        }
        if (credentials.groqKey) {
          electron.store.set('GROQ_API_KEY', credentials.groqKey);
        }
      }
    } catch (e) {
      console.warn('[SetupWizard] electron-store sync warning:', e);
    }

    // 2. Save in browser storage
    localStorage.setItem('nevea_onboarding_credentials', JSON.stringify(credentials));
    localStorage.setItem('nevea_setup_completed', 'true');

    // 3. Sync to local backend credential vault
    try {
      await axios.post('/api/vault/credentials', credentials, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 4000,
      });
      if (credentials.heyukaApiKey) {
        await saveKaspiCredentials({
          heyukaApiKey: credentials.heyukaApiKey,
          heyukaKeyId: credentials.heyukaKeyId,
          kaspiApiBaseUrl: credentials.kaspiApiBaseUrl,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[SetupWizard] Backend credential vault update note:', err);
    }

    playCuteSound('yiii');
    setStatusMessage('Setup complete! Awakening NEVEA...');
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-[#050505]/95 backdrop-blur-2xl text-white select-none">
      {/* Background Animated Ambient Spheres */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-[#090909] border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.08)] flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/logo.png"
                alt="NEVEA Logo"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='28' fill='%23111'/%3E%3Cpath d='M30 50c0-10 10-18 20-5s20 5 20-5-10-18-20-5-20 5-20-5z' fill='none' stroke='%23fff' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E";
                }}
                className="w-11 h-11 rounded-2xl object-cover shadow-lg border border-white/20 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-display font-bold tracking-tight text-white">
                  Welcome to NEVEA AI
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Secure Onboarding Setup · Keys stored locally in electron-store (No .env file needed)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-[10px] font-mono text-emerald-400">
            <ShieldCheck size={12} />
            <span>Local Vault</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5">
          <KeyRound size={16} className="text-white shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-white/75">
            <strong className="text-white">Zero-Config Security:</strong> Credentials entered here are saved directly onto your device via <span className="text-white font-mono">electron-store</span>. You do not need to create or edit <span className="text-white font-mono">.env</span> files.
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-3.5">
          {/* KASPI / HEYUKA Sovereign API Key & Key ID (Powering Omni / Core / Vision) */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Crown size={13} className="text-emerald-400" />
                <span>KASPI HEYUKA API Key &amp; Key ID (Omni / Core / Vision)</span>
              </label>
              <a
                href="https://kaspi-pos.vercel.app/en/heyuka#heyuka-api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-300 hover:text-white underline font-mono"
              >
                Get Gmail API Key
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type={showHeyukaKey ? 'text' : 'password'}
                  value={heyukaApiKey}
                  onChange={(e) => setHeyukaApiKey(e.target.value)}
                  placeholder="hk-live-..."
                  className="w-full px-3 py-2 pr-8 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowHeyukaKey(!showHeyukaKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showHeyukaKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <input
                type="text"
                value={heyukaKeyId}
                onChange={(e) => setHeyukaKeyId(e.target.value)}
                placeholder="Key ID (hk_... optional)"
                className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-white/90 flex items-center gap-1.5">
                <Sparkles size={13} className="text-white" />
                <span>Google Gemini API Key</span>
                <span className="text-white/40 font-normal">(Recommended)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-white/60 hover:text-white underline font-mono"
              >
                Get Gemini Key
              </a>
            </div>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 pr-9 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Groq API Key */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-white/90 flex items-center gap-1.5">
                <Cpu size={13} className="text-white" />
                <span>Groq API Key</span>
                <span className="text-white/40 font-normal">(Optional Fast Fallback)</span>
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-white/60 hover:text-white underline font-mono"
              >
                Get Groq Key
              </a>
            </div>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-3 py-2 pr-9 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showGroq ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Supabase URL & Anon Key */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <Database size={13} className="text-white" />
                <span>Supabase URL</span>
                <span className="text-white/40 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyz.supabase.co"
                className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-white/90 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-white" />
                  <span>Supabase Anon Key</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type={showSupabase ? 'text' : 'password'}
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbG..."
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSupabase(!showSupabase)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showSupabase ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Python Path */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-white/90 flex items-center gap-1.5">
                <Terminal size={13} className="text-white" />
                <span>Python Executable Path</span>
              </label>
              <span className="text-[10px] font-mono text-white/45">Default: python</span>
            </div>
            <input
              type="text"
              value={pythonPath}
              onChange={(e) => setPythonPath(e.target.value)}
              placeholder="python or C:\Python310\python.exe"
              className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        {statusMessage && (
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 size={13} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleSaveAndContinue(true)}
            className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5"
          >
            Skip for now
          </button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSaveAndContinue(false)}
            disabled={isSubmitting}
            className="py-2.5 px-5 rounded-2xl bg-white text-black font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.4)] hover:bg-white/90 transition-all"
          >
            <span>Launch NEVEA</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
