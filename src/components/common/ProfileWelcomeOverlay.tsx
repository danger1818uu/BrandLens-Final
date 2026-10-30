import React, { useEffect, useState } from 'react';
import { Role } from '../../types';
import { Crown, User, Briefcase, Shield, ArrowRight, Sparkles, Building2 } from 'lucide-react';

interface ProfileWelcomeOverlayProps {
  role: Role;
  userName: string;
  companyName: string;
  department?: string;
  onComplete: () => void;
  durationMs?: number;
}

const ROLE_DISPLAY_CONFIG: Record<
  Role,
  {
    roleWord: string;
    subphrase: string;
    clearance: string;
    icon: React.ReactNode;
    glowColor: string;
    borderColor: string;
    tagClass: string;
  }
> = {
  CEO: {
    roleWord: 'CEO',
    subphrase: 'EXECUTIVE BRAND AUTHORITY',
    clearance: 'Unrestricted Global Governance & Strategic Policy Clearance',
    icon: <Crown size={28} className="text-[#34d399]" />,
    glowColor: 'rgba(52, 211, 153, 0.25)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
    tagClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  },
  Employee: {
    roleWord: 'EMPLOYEE',
    subphrase: 'CONTENT CREATION & COMPLIANCE',
    clearance: 'Post Generation, AI Enhancement & Direct Sign-off Clearance',
    icon: <User size={28} className="text-[#9cecff]" />,
    glowColor: 'rgba(156, 236, 255, 0.25)',
    borderColor: 'rgba(156, 236, 255, 0.4)',
    tagClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
  },
  Manager: {
    roleWord: 'MANAGER',
    subphrase: 'BRAND ALIGNMENT & REVIEW',
    clearance: 'Post Approval, Team Governance & Content Audit Clearance',
    icon: <Briefcase size={28} className="text-[#c4b5fd]" />,
    glowColor: 'rgba(196, 181, 253, 0.25)',
    borderColor: 'rgba(196, 181, 253, 0.4)',
    tagClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
  },
  HOD: {
    roleWord: 'HOD',
    subphrase: 'HEAD OF DEPARTMENT',
    clearance: 'Departmental Sign-Off, Executive Escalation & Strategy Clearance',
    icon: <Shield size={28} className="text-[#fbbf24]" />,
    glowColor: 'rgba(251, 191, 36, 0.25)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    tagClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  },
  Administrator: {
    roleWord: 'ADMINISTRATOR',
    subphrase: 'SYSTEM SECURITY CONTROLLER',
    clearance: 'Cryptographic Key Vault & Organization Infrastructure Clearance',
    icon: <Shield size={28} className="text-[#60a5fa]" />,
    glowColor: 'rgba(96, 165, 250, 0.25)',
    borderColor: 'rgba(96, 165, 250, 0.4)',
    tagClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
  }
};

export const ProfileWelcomeOverlay: React.FC<ProfileWelcomeOverlayProps> = ({
  role,
  userName,
  companyName,
  department,
  onComplete,
  durationMs = 2800
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const cfg = ROLE_DISPLAY_CONFIG[role] || ROLE_DISPLAY_CONFIG.Employee;

  useEffect(() => {
    // Dismiss automatically after durationMs
    const timer = setTimeout(() => {
      triggerDismiss();
    }, durationMs);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [durationMs]);

  const triggerDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onComplete();
    }, 280);
  };

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 sm:p-8 bg-[#07080d]/96 backdrop-blur-2xl transition-opacity duration-300 ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Welcome ${cfg.roleWord}`}
    >
      {/* Cinematic Ambient Halo */}
      <div
        className="absolute w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full pointer-events-none animate-pulse-slow"
        style={{
          background: `radial-gradient(circle, ${cfg.glowColor} 0%, rgba(166, 139, 255, 0.12) 40%, transparent 70%)`,
          filter: 'blur(40px)',
          transform: 'translateZ(0)'
        }}
      />

      {/* Orbiting Caustic Rings */}
      <div className="absolute w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-full border border-white/10 pointer-events-none animate-spin-ultra-slow opacity-60" />
      <div
        className="absolute w-[260px] sm:w-[380px] h-[260px] sm:h-[380px] rounded-full border border-dashed pointer-events-none animate-spin-reverse-slow opacity-40"
        style={{ borderColor: cfg.borderColor }}
      />

      {/* Main Big Message Content */}
      <div className="relative z-10 max-w-2xl w-full text-center space-y-6 sm:space-y-8 animate-welcome-entrance">
        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono text-zinc-300 shadow-lg">
          <Building2 size={13} className="text-[#a68bff]" />
          <span className="tracking-widest uppercase">{companyName}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            AUTHENTICATED
          </span>
        </div>

        {/* Big Icon Optic Core */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border shadow-2xl transition-transform"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderColor: cfg.borderColor,
              boxShadow: `0 0 35px ${cfg.glowColor}`
            }}
          >
            {cfg.icon}
          </div>
        </div>

        {/* THE BIG HERO WELCOME MESSAGE */}
        <div className="space-y-2 sm:space-y-3">
          <div className="text-xs sm:text-sm font-mono tracking-[0.3em] sm:tracking-[0.4em] text-[#a68bff] uppercase font-semibold">
            {cfg.subphrase}
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight font-mono leading-none">
            <span className="bg-gradient-to-r from-white via-[#f3f0ff] to-[#9cecff] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(166,139,255,0.45)]">
              WELCOME {cfg.roleWord}
            </span>
          </h1>

          <p className="text-base sm:text-xl font-medium text-white/90 font-mono pt-1">
            {userName}
            {department && (
              <span className="text-zinc-400 font-normal"> · {department}</span>
            )}
          </p>
        </div>

        {/* Clearance Card */}
        <div className="mx-auto max-w-lg p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm font-mono text-zinc-300">
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs mb-1">
            <Sparkles size={13} className="text-[#a68bff]" />
            <span className="tracking-wider uppercase text-[11px] text-zinc-400 font-semibold">
              Security Protocol Confirmed
            </span>
          </div>
          <p className="text-zinc-200">{cfg.clearance}</p>
        </div>

        {/* Progress Bar & Skip Action */}
        <div className="pt-2 sm:pt-4 max-w-xs mx-auto space-y-3">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#a68bff] to-[#9cecff] rounded-full animate-welcome-progress"
              style={{ animationDuration: `${durationMs}ms` }}
            />
          </div>

          <button
            type="button"
            onClick={triggerDismiss}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs font-mono text-white transition-all cursor-pointer shadow-lg hover:border-white/30"
          >
            <span>Enter Workspace</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
