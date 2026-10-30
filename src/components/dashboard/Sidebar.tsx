import React from 'react';
import { Role } from '../../types';
import { LayoutDashboard, PenSquare, Clock, AlertCircle, HelpCircle, Info, LogOut, X, Share2, Sparkles, Database, MessageSquare } from 'lucide-react';

export type NavTab = 'dashboard' | 'new-post' | 'enhancer' | 'pending' | 'history' | 'messages' | 'data-security' | 'help' | 'about';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  username: string;
  role: Role;
  companyName?: string;
  companyCategory?: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingCount?: number;
  unreadMessagesCount?: number;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  username,
  role,
  companyName,
  companyCategory,
  onLogout,
  mobileOpen,
  onCloseMobile,
  pendingCount = 0,
  unreadMessagesCount = 0,
}) => {
  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'new-post',
      label: 'New Post',
      icon: <PenSquare size={18} />,
    },
    {
      id: 'enhancer',
      label: 'Enhancer',
      icon: <Sparkles size={18} className="text-[#a68bff]" />,
    },
    {
      id: 'pending',
      label: 'Pending',
      icon: <AlertCircle size={18} />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'history',
      label: 'History',
      icon: <Clock size={18} />,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: <MessageSquare size={18} className="text-[#a68bff]" />,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
  ];

  const resourceItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'data-security',
      label: 'Database & Security',
      icon: <Database size={18} className="text-emerald-400" />,
    },
    {
      id: 'help',
      label: 'Help & Assistant',
      icon: <HelpCircle size={18} />,
    },
    {
      id: 'about',
      label: 'About & Guidelines',
      icon: <Info size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0a0b12]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="wordmark-icon w-6 h-6" />
            <span className="font-bold tracking-tight text-lg text-white font-mono">BrandLens</span>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-[#92939f] hover:text-white p-2 rounded hover:bg-white/5"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Organization & Role Context Pill */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.015]">
          <div className="text-[10px] font-mono tracking-widest text-[#828392] uppercase mb-0.5">
            ORGANIZATION
          </div>
          <div className="text-xs font-mono font-medium text-white mb-2 truncate">
            {companyName || 'BrandLens'} <span className="text-[#8e8e9e] font-normal">· {companyCategory || 'Enterprise'}</span>
          </div>

          <div className="text-[10px] font-mono tracking-widest text-[#92939f] uppercase mb-1">
            WORKSPACE SCOPE
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#a68bff] shadow-[0_0_10px_#a68bff]" />
            <span className="text-sm font-mono font-medium tracking-wide text-[#c9beff]">
              {role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-mono tracking-widest text-[#828392] uppercase">
            Workspace
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tour-id={`nav-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[15px] tracking-wide transition-all duration-200 text-left font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-[rgba(166,139,255,0.22)] to-[rgba(156,236,255,0.1)] text-white border border-[rgba(166,139,255,0.5)] shadow-[0_0_20px_rgba(166,139,255,0.18)]'
                    : 'text-[#a0a0af] hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className={isActive ? 'text-[#a68bff]' : 'text-[#858595]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-mono tracking-widest text-[#727382] uppercase">
            Resources
          </div>

          {resourceItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tour-id={`nav-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[15px] tracking-wide transition-all duration-200 text-left font-medium cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[rgba(166,139,255,0.22)] to-[rgba(156,236,255,0.1)] text-white border border-[rgba(166,139,255,0.5)] shadow-[0_0_20px_rgba(166,139,255,0.18)]'
                    : 'text-[#a0a0af] hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className={isActive ? 'text-[#a68bff]' : 'text-[#858595]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer profile & logout */}
        <div className="p-4 border-t border-white/10 bg-black/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-white truncate capitalize font-mono">
                @{username}
              </div>
              <div className="text-xs font-mono text-[#9a9aa8] truncate">
                {role} Account
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              ACTIVE
            </span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              data-tour-id="team-nav-logout"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 text-[11px] font-mono tracking-wider text-[#a0a0b0] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded transition-all cursor-pointer"
            >
              <LogOut size={12} />
              <span>LOG OUT</span>
              <span className="text-[#a68bff] font-mono text-xs">↗</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const Sidebar = React.memo(SidebarComponent);
