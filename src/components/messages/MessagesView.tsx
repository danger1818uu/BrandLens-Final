import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Company, UserAccount, Role, TeamMessage, TeamRosterGrouped } from '../../types';
import { apiClient } from '../../services/api';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Shield,
  Briefcase,
  Crown,
  Check,
  CheckCheck,
  RotateCcw,
  Sparkles,
  Building2,
  X
} from 'lucide-react';

interface MessagesViewProps {
  currentUser: UserAccount;
  currentCompany: Company | null;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type RoleFilterKey = 'all' | 'Executive' | 'HOD' | 'Manager' | 'Employee';

const ROLE_BADGE_STYLE: Record<Role, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  Employee: {
    label: 'Employee',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
    icon: <User size={11} className="text-zinc-400" />
  },
  Manager: {
    label: 'Manager',
    badgeClass: 'bg-[#211f38] text-[#c4b5fd] border-[#3f3869]',
    icon: <Briefcase size={11} className="text-[#a68bff]" />
  },
  HOD: {
    label: 'Head of Dept',
    badgeClass: 'bg-[#292218] text-[#fcd34d] border-[#5e441c]',
    icon: <Shield size={11} className="text-[#fbbf24]" />
  },
  CEO: {
    label: 'Executive',
    badgeClass: 'bg-[#152722] text-[#6ee7b7] border-[#1d4d3d]',
    icon: <Crown size={11} className="text-[#34d399]" />
  },
  Administrator: {
    label: 'Admin',
    badgeClass: 'bg-[#1c2333] text-[#93c5fd] border-[#29426d]',
    icon: <Shield size={11} className="text-[#60a5fa]" />
  }
};

const PROFESSIONAL_SUGGESTIONS = [
  'Could you review the latest post draft for brand guideline alignment?',
  'The revised copy is ready in the compliance queue for your sign-off.',
  'Let\'s align on the visual tone before scheduled publication.'
];

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  currentCompany,
  onShowToast
}) => {
  const companyId = currentCompany?.id || currentUser.companyId || 'org-nova-unlimited';
  const companyName = currentCompany?.name || 'Company Workspace';

  const [roster, setRoster] = useState<TeamRosterGrouped>({
    employees: [],
    managers: [],
    hods: [],
    ceo: null,
    all: []
  });
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<RoleFilterKey>('all');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollTimerRef = useRef<number | null>(null);
  const prevMessagesRef = useRef<TeamMessage[]>([]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load team roster
  const loadRoster = useCallback(async () => {
    try {
      setLoadingRoster(true);
      const data = await apiClient.getTeamRoster(companyId);
      setRoster(data);

      // Fetch conversations to get unread badge counts
      const convs = await apiClient.getRecentConversations(companyId, currentUser.id);
      const uMap: Record<string, number> = {};
      convs.forEach((c) => {
        if (c.unreadCount > 0) {
          uMap[c.otherUser.id] = c.unreadCount;
        }
      });
      setUnreadMap(uMap);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Auto-select first teammate if none selected yet
      if (!selectedUser) {
        const otherTeammates = data.all.filter(
          (u) => u.id !== currentUser.id && u.loginId?.toLowerCase() !== currentUser.loginId?.toLowerCase()
        );
        if (otherTeammates.length > 0) {
          setSelectedUser(otherTeammates[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load team roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  }, [companyId, currentUser.id, currentUser.loginId, selectedUser]);

  useEffect(() => {
    loadRoster();
  }, [companyId]);

  // Load thread messages with diff checking to prevent wasteful re-renders
  const loadThread = useCallback(async (isPolling: boolean = false) => {
    if (!selectedUser) return;
    try {
      if (!isPolling) setLoadingMessages(true);
      const thread = await apiClient.getTeamThread(companyId, currentUser.id, selectedUser.id);
      
      const prev = prevMessagesRef.current;
      const hasChanged =
        thread.length !== prev.length ||
        (thread.length > 0 && thread[thread.length - 1]?.id !== prev[prev.length - 1]?.id) ||
        (thread.length > 0 && thread[thread.length - 1]?.isRead !== prev[prev.length - 1]?.isRead);

      if (hasChanged || !isPolling) {
        prevMessagesRef.current = thread;
        setMessages(thread);
        if (!isPolling) {
          setTimeout(() => scrollToBottom('auto'), 40);
        } else {
          setTimeout(() => scrollToBottom('smooth'), 40);
        }
      }

      // Clear unread badge for selected user locally
      setUnreadMap((prevMap) => {
        if (!prevMap[selectedUser.id]) return prevMap;
        const next = { ...prevMap };
        delete next[selectedUser.id];
        return next;
      });
    } catch (err: any) {
      console.error('Failed to load thread:', err);
    } finally {
      if (!isPolling) setLoadingMessages(false);
    }
  }, [companyId, currentUser.id, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      prevMessagesRef.current = [];
      loadThread(false);
    }
  }, [selectedUser]);

  // Quiet polling every 4 seconds, paused when tab is hidden to save battery & CPU
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = window.setInterval(() => {
      if (document.hidden) return; // skip when backgrounded
      if (selectedUser) {
        loadThread(true);
      }
    }, 4000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedUser, loadThread]);

  // Send message
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputContent).trim();
    if (!text || !selectedUser || sending) return;

    try {
      setSending(true);
      const newMsg = await apiClient.sendTeamMessage({
        companyId,
        senderId: currentUser.id,
        receiverId: selectedUser.id,
        content: text
      });

      prevMessagesRef.current = [...prevMessagesRef.current, newMsg];
      setMessages((prev) => [...prev, newMsg]);
      setInputContent('');
      setTimeout(() => scrollToBottom('smooth'), 40);
      inputRef.current?.focus();
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter members cleanly
  const filteredTeammates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return roster.all
      .filter((m) => m.id !== currentUser.id && m.loginId?.toLowerCase() !== currentUser.loginId?.toLowerCase())
      .filter((m) => {
        if (activeRoleFilter === 'all') return true;
        if (activeRoleFilter === 'Executive') return m.role === 'CEO' || m.role === 'Administrator';
        return m.role === activeRoleFilter;
      })
      .filter((m) => {
        if (!query) return true;
        return (
          m.name.toLowerCase().includes(query) ||
          m.role.toLowerCase().includes(query) ||
          (m.department && m.department.toLowerCase().includes(query))
        );
      });
  }, [roster.all, currentUser.id, currentUser.loginId, activeRoleFilter, searchQuery]);

  const getInitials = (name: string) => {
    return (
      name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U'
    );
  };

  return (
    <div className="space-y-4 page-enter">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <MessageSquare size={20} className="text-[#a68bff]" />
              <span>Team Messaging</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/[0.05] border border-white/10 text-zinc-300">
              {companyName}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-light">
            Direct brand communication across organizational roles and departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            Synced: {lastRefreshedAt}
          </span>
          <button
            type="button"
            onClick={() => {
              loadRoster();
              if (selectedUser) loadThread(false);
            }}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh directory and thread"
          >
            <RotateCcw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main 2-Pane Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-230px)] min-h-[580px]">
        {/* LEFT COLUMN: Team Directory */}
        <div className="lg:col-span-4 flex flex-col rounded-xl border border-white/10 bg-[#0c0d15] overflow-hidden shadow-xl">
          {/* Search bar & segmented filters */}
          <div className="p-3.5 border-b border-white/10 space-y-2.5 bg-white/[0.02]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teammates by name or department..."
                className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-[#a68bff]/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Segmented Filter Bar */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono overflow-x-auto no-scrollbar">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'Executive', label: 'Executive' },
                  { key: 'HOD', label: 'HODs' },
                  { key: 'Manager', label: 'Managers' },
                  { key: 'Employee', label: 'Employees' }
                ] as const
              ).map((tab) => {
                const isActive = activeRoleFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveRoleFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-md transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white/15 text-white font-medium shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Directory Teammate List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingRoster ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500 flex flex-col items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-[#a68bff] rounded-full animate-spin" />
                <span>Loading team directory...</span>
              </div>
            ) : filteredTeammates.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-zinc-500">
                No teammates found matching your criteria.
              </div>
            ) : (
              filteredTeammates.map((member) => {
                const isSelected = selectedUser?.id === member.id;
                const unread = unreadMap[member.id] || 0;
                const roleConfig = ROLE_BADGE_STYLE[member.role] || ROLE_BADGE_STYLE.Employee;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedUser(member)}
                    className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between gap-3 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#181928] border-l-2 border-l-[#a68bff] border-white/10 shadow-sm'
                        : 'bg-transparent hover:bg-white/[0.04] border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                          isSelected
                            ? 'bg-[#2a264a] text-[#c4b5fd] border-[#a68bff]/40'
                            : 'bg-white/[0.05] text-zinc-300 border-white/10'
                        }`}
                      >
                        {getInitials(member.name)}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate font-mono">
                            {member.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${roleConfig.badgeClass}`}
                          >
                            {roleConfig.icon}
                            <span>{roleConfig.label}</span>
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono truncate">
                            {member.department || 'Workspace'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#a68bff]/25 border border-[#a68bff]/50 text-[#d8cdff] font-mono text-[10px] font-semibold shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Current User Identity Footer */}
          <div className="p-3 border-t border-white/10 bg-white/[0.015] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="truncate">
                Logged in: <strong className="text-white font-medium">{currentUser.name}</strong>
              </span>
            </span>
            <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] text-zinc-300">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Thread */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-white/10 bg-[#0c0d15] overflow-hidden shadow-xl">
          {selectedUser ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a264a] to-[#17152b] border border-[#a68bff]/30 flex items-center justify-center font-mono font-bold text-[#c4b5fd] text-sm shrink-0">
                    {getInitials(selectedUser.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-white font-mono truncate">
                        {selectedUser.name}
                      </h2>
                      {ROLE_BADGE_STYLE[selectedUser.role] && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${ROLE_BADGE_STYLE[selectedUser.role].badgeClass}`}
                        >
                          {ROLE_BADGE_STYLE[selectedUser.role].icon}
                          <span>{ROLE_BADGE_STYLE[selectedUser.role].label}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                      {selectedUser.department || 'Operations'} · <span className="text-zinc-500">{companyName}</span>
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Workspace Active</span>
                  </span>
                </div>
              </div>

              {/* Thread History */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-zinc-500 gap-2">
                    <span className="w-5 h-5 border-2 border-white/20 border-t-[#a68bff] rounded-full animate-spin" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-zinc-400">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#a68bff]">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white font-mono">No messages yet</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                        Start an internal discussion with {selectedUser.name} regarding brand strategy, drafts, or guidelines.
                      </p>
                    </div>

                    {/* Quick Professional Starters */}
                    <div className="flex flex-col gap-1.5 max-w-md w-full pt-3">
                      {PROFESSIONAL_SUGGESTIONS.map((starter, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputContent(starter);
                            inputRef.current?.focus();
                          }}
                          className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#a68bff]/30 text-left text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                        >
                          "{starter}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-center py-1">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                        Internal Discussion Thread
                      </span>
                    </div>

                    {messages.map((msg) => {
                      const isMe =
                        msg.senderId === currentUser.id ||
                        msg.senderName.toLowerCase() === currentUser.name.toLowerCase();
                      const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-zinc-500">
                            <span>{isMe ? 'You' : msg.senderName}</span>
                            <span>·</span>
                            <span>{timeStr}</span>
                          </div>

                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-[#232042] text-zinc-100 border border-[#403874]/70 rounded-tr-xs'
                                : 'bg-[#131422] text-zinc-200 border border-white/[0.08] rounded-tl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          {isMe && (
                            <div className="mt-1 px-1 flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                              {msg.isRead ? (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <CheckCheck size={12} />
                                  <span>Read</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-zinc-500">
                                  <Check size={12} />
                                  <span>Delivered</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-white/[0.015]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-end gap-2.5">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${selectedUser.name}...`}
                        rows={1}
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 focus:border-[#a68bff] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none min-h-[44px] max-h-[120px] transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!inputContent.trim() || sending}
                      className="h-[44px] px-4 rounded-xl bg-[#a68bff] hover:bg-[#b8a2ff] text-zinc-950 font-mono font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      {sending ? (
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">Send</span>
                          <Send size={14} />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1">
                    <span>Press <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">Enter</kbd> to send</span>
                    <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">Shift + Enter</kbd> for line break</span>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <Building2 size={36} className="text-zinc-600 mb-3" />
              <h3 className="text-base font-semibold text-white font-mono">Select a team member</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Choose an executive, manager, or colleague from the left directory to open their message thread.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
