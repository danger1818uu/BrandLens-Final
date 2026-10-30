import React from 'react';
import { Menu } from 'lucide-react';
import { Role } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  role: Role;
  companyName?: string;
  onOpenMobile: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  title,
  subtitle,
  companyName,
  onOpenMobile,
}) => {
  return (
    <header className="py-6 border-b border-white/10 bg-[#08090d]/85 backdrop-blur-xl px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden text-[#92939f] hover:text-white p-2 rounded border border-white/10 hover:bg-white/5 transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-[28px] font-medium text-white tracking-tight leading-snug">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-[13.5px] text-[#9a9aa8] leading-normal hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {companyName && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#a68bff]/10 border border-[#a68bff]/20 text-xs font-mono text-[#9cecff]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9cecff]" />
            <span>{companyName}</span>
          </div>
        )}
        {/* Restrained system status pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-mono text-[#9a9aa8] tracking-wider shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#a4e6cf] shadow-[0_0_10px_#a4e6cf] animate-pulse" />
          <span className="hidden md:inline">SYSTEM ·</span> ONLINE
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
