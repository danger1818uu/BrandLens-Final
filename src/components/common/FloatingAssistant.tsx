import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Company, UserAccount, Role } from '../../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

const CHIPS = [
  'How do I create a post?',
  'Why was my post flagged?',
  'How do I fix a review issue?',
  'How do I connect my social account?'
];

interface FloatingAssistantProps {
  onFocusHelpPage?: () => void;
  isCurrentTabHelp?: boolean;
  currentUser?: UserAccount | null;
  currentCompany?: Company | null;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  onFocusHelpPage,
  isCurrentTabHelp = false,
  currentUser,
  currentCompany
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const companyName = currentCompany?.name || 'BrandLens Enterprise';
  const companyCategory = currentCompany?.category || 'General';
  const userRole = (currentUser?.role as Role) || 'Employee';
  const userName = currentUser?.name || currentUser?.username || currentUser?.loginId || 'Colleague';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'fa-welcome',
      role: 'assistant',
      content: `Hi ${userName}! I am your BrandLens AI Assistant for ${companyName}. How can I help you today with your drafts, reviews, or social publishing?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Position state (persisted in sessionStorage)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = sessionStorage.getItem('brandlens_assistant_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return { x: -1, y: -1 }; // -1 indicates default bottom-right
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false
  });
  const dragRafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  const buttonRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Default position resolution
  useEffect(() => {
    if (position.x === -1 || position.y === -1) {
      const defaultX = Math.max(16, window.innerWidth - 76);
      const defaultY = Math.max(16, window.innerHeight - 84);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [position]);

  // Keep within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (prev.x === -1) return prev;
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 60;
        return {
          x: Math.min(Math.max(16, prev.x), maxX),
          y: Math.min(Math.max(16, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages, isLoading]);

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse button or touch
    if (e.button !== 0) return;

    const el = buttonRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      moved: false
    };

    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    // Only consider it a drag if moved more than 8 pixels
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      dragStartRef.current.moved = true;
    }

    if (dragStartRef.current.moved) {
      const newX = dragStartRef.current.initialX + dx;
      const newY = dragStartRef.current.initialY + dy;

      const maxX = window.innerWidth - 56;
      const maxY = window.innerHeight - 56;

      const clampedX = Math.min(Math.max(12, newX), maxX);
      const clampedY = Math.min(Math.max(12, newY), maxY);

      pendingPosRef.current = { x: clampedX, y: clampedY };
      if (!dragRafRef.current) {
        dragRafRef.current = requestAnimationFrame(() => {
          if (pendingPosRef.current && buttonRef.current) {
            buttonRef.current.style.transform = `translate3d(${pendingPosRef.current.x - currentX}px, ${pendingPosRef.current.y - currentY}px, 0)`;
          }
          dragRafRef.current = null;
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }

    if (buttonRef.current) {
      buttonRef.current.style.transform = 'translate3d(0, 0, 0)';
    }

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If dragged, commit final position to state and sessionStorage
    if (dragStartRef.current.moved && pendingPosRef.current) {
      setPosition(pendingPosRef.current);
      try {
        sessionStorage.setItem('brandlens_assistant_pos', JSON.stringify(pendingPosRef.current));
      } catch {}
    }
    // Note: click handling is delegated to onClick to prevent double-toggle and support keyboard
  };

  const handleClickToggle = () => {
    // If a drag gesture just completed, ignore the subsequent click event
    if (dragStartRef.current.moved) {
      dragStartRef.current.moved = false;
      return;
    }
    // Always toggle the floating assistant panel open/close
    setIsOpen((prev) => !prev);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend !== undefined ? textToSend : input).trim();
    if (!rawText || isLoading) return;

    setErrorMessage(null);

    // Check for WhatsApp command /help {message}
    const isExactHelpCommand = /^\/help(\s+.*)?$/i.test(rawText);

    if (isExactHelpCommand) {
      const afterHelp = rawText.replace(/^\/help\s*/i, '').trim();

      if (!afterHelp) {
        setErrorMessage('Please add a message after /help');
        return;
      }

      try {
        const supportConfig = await apiClient.fetchSupportConfig();
        const rawNum = supportConfig.whatsappSupportNumber || '919310296839';
        const cleanNumber = rawNum.replace(/\D/g, '') || '919310296839';
        const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(afterHelp)}`;

        const userMsg: ChatMessage = {
          id: `fa-msg-${Date.now()}-user`,
          role: 'user',
          content: rawText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const sysMsg: ChatMessage = {
          id: `fa-msg-${Date.now()}-sys`,
          role: 'system',
          content: `Opening WhatsApp for: "${afterHelp}"`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages((prev) => [...prev, userMsg, sysMsg]);
        setInput('');
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        return;
      } catch {
        setErrorMessage('Failed to resolve support routing.');
        return;
      }
    }

    // Normal AI Question Flow
    const userMsg: ChatMessage = {
      id: `fa-msg-${Date.now()}-user`,
      role: 'user',
      content: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const res = await apiClient.askHelpQuestion({
        message: rawText,
        history,
        companyName,
        companyCategory,
        userRole,
        userName
      });

      if (res.success && res.answer) {
        const assistantMsg: ChatMessage = {
          id: `fa-msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(res.error || 'Failed to get answer.');
      }
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `fa-msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `I'm having a brief connection issue. For immediate support, you can reach out on WhatsApp at +91 93102 96839 or type "/help ${rawText}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setErrorMessage(err.message || 'Help service response delayed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentX = position.x === -1 ? window.innerWidth - 76 : position.x;
  const currentY = position.y === -1 ? window.innerHeight - 84 : position.y;

  // Compute flyout panel position so it stays inside screen
  const panelWidth = Math.min(390, window.innerWidth - 24);
  const panelHeight = 500;
  const panelLeft = Math.min(Math.max(12, currentX - panelWidth + 48), window.innerWidth - panelWidth - 12);
  const panelTop = Math.max(12, Math.min(currentY - panelHeight - 12, window.innerHeight - panelHeight - 12));

  return (
    <>
      {/* Floating Flyout Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: `${panelLeft}px`,
            top: `${panelTop}px`,
            width: `${panelWidth}px`,
            height: `${panelHeight}px`,
            zIndex: 9999
          }}
          className="rounded-2xl border border-white/15 bg-[#0b0c16]/98 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(166,139,255,0.2)] backdrop-blur-2xl flex flex-col overflow-hidden page-enter"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[rgba(166,139,255,0.2)] border border-[rgba(166,139,255,0.4)] flex items-center justify-center text-[#c9beff]">
                <Bot size={14} />
              </div>
              <div>
                <h4 className="text-sm font-mono font-semibold text-white leading-tight">
                  BrandLens AI Assistant
                </h4>
                <p className="text-xs text-[#8c8d9e] leading-none mt-0.5">Quick workspace answers</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href="https://wa.me/919310296839?text=Hello%20BrandLens%20Support%2C%20I%20need%20quick%20assistance."
                target="_blank"
                rel="noopener noreferrer"
                title="Chat with support on WhatsApp (+91 93102 96839)"
                className="text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 text-xs font-mono font-medium"
              >
                <MessageSquare size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#92939f] hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Example Chips */}
          <div className="px-3.5 py-2 border-b border-white/5 bg-white/[0.01] overflow-x-auto no-scrollbar flex items-center gap-2 whitespace-nowrap text-xs font-mono">
            {CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-[#a0a0b2] hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer text-xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSystem = msg.role === 'system';

              if (isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                      isUser
                        ? 'bg-[rgba(156,236,255,0.18)] text-[#9cecff] border border-[rgba(156,236,255,0.35)]'
                        : 'bg-[rgba(166,139,255,0.18)] text-[#c9beff] border border-[rgba(166,139,255,0.35)]'
                    }`}
                  >
                    {isUser ? <User size={12} /> : <Bot size={12} />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[rgba(166,139,255,0.22)] border border-[rgba(166,139,255,0.4)] text-white'
                        : msg.isError
                        ? 'bg-rose-500/10 border border-rose-500/25 text-rose-200'
                        : 'bg-[#131422] border border-white/10 text-zinc-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#a68bff] p-2">
                <Loader2 size={14} className="animate-spin text-[#a68bff]" />
                <span>Generating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mx-3.5 mb-1.5 p-2 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 border-t border-white/10 bg-black/50">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask assistant or type /help..."
                disabled={isLoading}
                className="flex-1 bg-white/[0.05] border border-white/15 focus:border-[#a68bff] text-white text-xs sm:text-sm rounded-xl p-2.5 outline-none font-sans placeholder:text-[#6a6a7a] resize-none"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl bg-gradient-to-r from-[#8a63ff] to-[#a68bff] hover:opacity-90 border border-transparent text-zinc-950 font-bold disabled:opacity-40 transition-colors cursor-pointer h-[48px] flex items-center justify-center"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Movable Button */}
      <button
        ref={buttonRef as any}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleClickToggle();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          left: `${currentX}px`,
          top: `${currentY}px`,
          zIndex: 9998,
          touchAction: 'none',
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
        className={`w-12 h-12 rounded-full flex items-center justify-center select-none transition-transform active:scale-95 cursor-pointer ${
          isDragging ? 'cursor-grabbing scale-105' : 'hover:scale-105'
        }`}
        title="BrandLens AI Assistant (Click to open, drag to move)"
        aria-label="BrandLens AI Assistant"
      >
        {/* Animated Breathing Halo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[rgba(166,139,255,0.4)] to-[rgba(156,236,255,0.3)] filter blur-md animate-pulse" />

        {/* Outer Lens Ring */}
        <div className="absolute inset-0 rounded-full border border-[rgba(195,183,255,0.6)] shadow-[0_0_20px_rgba(166,139,255,0.35),inset_0_0_12px_rgba(156,236,255,0.2)] bg-[#0c0d16]/90 backdrop-blur-xl" />

        {/* Inner Lens Caustic Refraction */}
        <div className="relative z-10 w-6 h-6 rounded-full border border-[rgba(156,236,255,0.85)] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
        </div>

        {/* Active Processing Indicator */}
        {isLoading && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#9cecff] shadow-[0_0_8px_#9cecff] animate-ping" />
        )}
      </button>
    </>
  );
};
