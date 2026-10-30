import React, { useState, useEffect } from 'react';
import { Company, UserAccount, CompanyCategory } from '../../types';
import { apiClient } from '../../services/api';
import {
  X,
  Lock,
  Mail,
  Building2,
  User,
  Shield,
  Briefcase,
  Crown,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Check
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (session: { company: Company; user: UserAccount }) => void;
  initialTab?: 'register' | 'login';
  autoLoginConfig?: {
    loginId: string;
    pass: string;
    delayMs?: number;
    notice?: string;
  } | null;
}

const CATEGORIES: CompanyCategory[] = [
  'Technology',
  'Cosmetics',
  'Education',
  'Services',
  'Art and Design',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Media and Entertainment',
  'Manufacturing',
  'Consulting',
  'Other'
];

interface DemoAccount {
  id: string;
  role: string;
  name: string;
  title: string;
  loginId: string;
  pass: string;
  badgeStyle: string;
  icon: React.ReactNode;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-ceo',
    role: 'CEO',
    name: 'Alexander Vance',
    title: 'Brand Authority',
    loginId: 'novaunlimited0@gmail.com',
    pass: 'ceo123',
    badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <Crown size={13} className="text-emerald-400" />
  },
  {
    id: 'demo-emp',
    role: 'Employee',
    name: 'Sarah Lin',
    title: 'Content Creator',
    loginId: 'employee@novaunlimited.test',
    pass: 'employee123',
    badgeStyle: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    icon: <User size={13} className="text-sky-400" />
  },
  {
    id: 'demo-admin',
    role: 'Admin',
    name: 'BrandLens Root Admin',
    title: 'System Infrastructure',
    loginId: 'brandlens@gmail.com',
    pass: 'brandlensadmin',
    badgeStyle: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    icon: <ShieldCheck size={13} className="text-violet-400" />
  },
  {
    id: 'demo-mgr',
    role: 'Manager',
    name: 'Marcus Chen',
    title: 'Compliance Reviewer',
    loginId: 'manager@novaunlimited.test',
    pass: 'manager123',
    badgeStyle: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    icon: <Briefcase size={13} className="text-purple-400" />
  },
  {
    id: 'demo-hod',
    role: 'HOD',
    name: 'Dr. Elena Rostova',
    title: 'Departmental Sign-Off',
    loginId: 'hod@novaunlimited.test',
    pass: 'hod123',
    badgeStyle: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    icon: <Shield size={13} className="text-amber-400" />
  }
];

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'login',
  autoLoginConfig = null
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(initialTab);

  // Registration Form State
  const [regName, setRegName] = useState('Nova Unlimited');
  const [regCategory, setRegCategory] = useState<CompanyCategory>('Technology');
  const [regEmail, setRegEmail] = useState('novaunlimited0@gmail.com');
  const [regPassword, setRegPassword] = useState('ceo123');
  const [registering, setRegistering] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Login Form State
  const [loginId, setLoginId] = useState('novaunlimited0@gmail.com');
  const [loginPassword, setLoginPassword] = useState('ceo123');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle auto-login flow (e.g. Employee auto-filled when CEO logs out)
  useEffect(() => {
    if (!isOpen || !autoLoginConfig) return;

    setActiveTab('login');
    setLoginId(autoLoginConfig.loginId);
    setLoginPassword(autoLoginConfig.pass);
    setErrorMsg(null);
    setRegSuccessMsg(null);

    const delay = autoLoginConfig.delayMs ?? 1400;
    const timer = window.setTimeout(() => {
      handleLogin(undefined, autoLoginConfig.loginId, autoLoginConfig.pass);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, autoLoginConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRegSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    try {
      setRegistering(true);
      const res = await apiClient.registerCompany({
        companyName: regName.trim(),
        companyCategory: regCategory,
        companyEmail: regEmail.trim(),
        password: regPassword.trim()
      });

      setRegSuccessMsg(`Workspace for "${res.company.name}" created. CEO credentials pre-filled below. Click "Sign In" to continue.`);
      setLoginId(res.user.loginId || regEmail.trim());
      setLoginPassword(regPassword.trim());
      setActiveTab('login');
    } catch (err: any) {
      const errText = err.message || '';
      if (
        errText.toLowerCase().includes('already registered') ||
        errText.toLowerCase().includes('already exists') ||
        errText.toLowerCase().includes('duplicate')
      ) {
        setLoginId(regEmail.trim());
        setLoginPassword(regPassword.trim());
        setRegSuccessMsg(`Workspace "${regName}" active. CEO credentials loaded below. Click "Sign In" to continue.`);
        setActiveTab('login');
      } else {
        setErrorMsg(errText || 'Registration failed. Please verify inputs.');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Handle Login
  const handleLogin = async (e?: React.FormEvent, customId?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setRegSuccessMsg(null);

    const targetId = (customId !== undefined ? customId : loginId).trim();
    const targetPass = (customPass !== undefined ? customPass : loginPassword).trim();

    if (!targetId || !targetPass) {
      setErrorMsg('Work email / Login ID and password are required.');
      return;
    }

    try {
      setLoggingIn(true);
      const res = await apiClient.login({
        loginId: targetId,
        password: targetPass
      });

      onSuccess({
        company: res.company,
        user: res.user
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  // 1-Click Instant Demo Access
  const triggerDemoLogin = (acc: DemoAccount) => {
    setLoginId(acc.loginId);
    setLoginPassword(acc.pass);
    handleLogin(undefined, acc.loginId, acc.pass);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-[460px] max-h-[92vh] overflow-y-auto overscroll-contain bg-[#0c0d14] border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04)] p-6 sm:p-7 space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                BrandLens Identity
              </h2>
              <p className="text-xs text-zinc-400">
                Executive Governance &amp; Brand Access Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Minimalist Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950/80 border border-white/[0.06] rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08] font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08] font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register Workspace
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {regSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{regSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Profile Auto-Login Indicator Banner */}
        {autoLoginConfig && (
          <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/25 text-violet-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-white">
                  {autoLoginConfig.loginId.includes('employee')
                    ? 'Employee Profile'
                    : autoLoginConfig.loginId.includes('brandlens')
                    ? 'Admin Infrastructure'
                    : 'Workspace Profile'}
                </span>
                <span className="text-zinc-400 text-[11px] block truncate">
                  {autoLoginConfig.notice || 'Connecting to session...'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-medium text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              CONNECTING
            </span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {activeTab === 'login' ? (
          <form onSubmit={(e) => handleLogin(e)} className="space-y-3.5">
            {!autoLoginConfig && (
              <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2 min-w-0">
                  <Crown size={13} className="text-amber-400/90 shrink-0" />
                  <span className="truncate text-zinc-300">Nova Unlimited CEO profile ready</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] shrink-0">
                  READY
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Work Email or Login ID</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="name@company.com or login ID"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Password</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter account password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full mt-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(124,58,237,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {loggingIn ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Quick Access Passkeys / Role Switcher */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <KeyRound size={13} className="text-violet-400" />
                  <span>Quick Access Passkeys</span>
                </span>
                <span className="text-[11px] text-zinc-500">1-click test login</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => triggerDemoLogin(acc)}
                    disabled={loggingIn}
                    className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-white/[0.04] text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${acc.badgeStyle} flex items-center gap-1`}>
                        {acc.icon}
                        <span>{acc.role}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 group-hover:text-violet-300 transition-colors">
                        Enter →
                      </span>
                    </div>
                    <div className="truncate font-medium text-zinc-200 text-xs mt-1">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">
                      {acc.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* REGISTER BRAND WORKSPACE FORM */
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Nova Unlimited"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Industry Category
              </label>
              <select
                value={regCategory}
                onChange={(e) => setRegCategory(e.target.value as CompanyCategory)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 focus:outline-none transition-all cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#121320] text-zinc-100">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                CEO Work Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ceo@company.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">
                Master Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create master password (minimum 6 characters)"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-950/70 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={registering}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(124,58,237,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {registering ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Brand Workspace</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Assurance Footer */}
        <div className="pt-2 text-center">
          <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck size={11} className="text-zinc-500" />
            <span>256-bit encrypted credential storage &amp; role-based audit trail</span>
          </p>
        </div>
      </div>
    </div>
  );
}
