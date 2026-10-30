import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Send,
  PhoneCall,
  ExternalLink,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Company, UserAccount, Role } from '../../types';
import { NavTab } from '../dashboard/Sidebar';

interface HelpViewProps {
  currentUser?: UserAccount | null;
  currentCompany?: Company | null;
  onNavigateTab?: (tab: NavTab) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isWhatsAppCard?: boolean;
  whatsappUrl?: string;
  whatsappText?: string;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  'How do I create and submit a post?',
  'What are the role permissions in BrandLens?',
  'How does 1-click social publishing work?',
  '/help Need urgent assistance with post review'
];

export const HelpView: React.FC<HelpViewProps> = ({
  currentUser,
  currentCompany
}) => {
  const companyName = currentCompany?.name || 'BrandLens Enterprise';
  const companyCategory = currentCompany?.category || 'General';
  const userRole = (currentUser?.role as Role) || 'Employee';
  const userName = currentUser?.name || currentUser?.username || currentUser?.loginId || 'Colleague';

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${userName}! I am your BrandLens AI Assistant for **${companyName}**.\n\nYou can ask me anything about drafting content, approval rules, or 1-click publishing.\n\n💡 **WhatsApp Support**: Type \`/help {your message}\` anytime to connect directly with human engineering support at **+91 93102 96839**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputText).trim();
    if (!rawText || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check for WhatsApp command /help {message}
    const isHelpCommand = /^\/help(\s+.*)?$/i.test(rawText);

    if (isHelpCommand) {
      const helpContent = rawText.replace(/^\/help\s*/i, '').trim();
      const messageForWhatsApp =
        helpContent ||
        `Hello BrandLens Support, I am ${userName} from ${companyName} (${userRole}) and need assistance.`;
      const whatsappUrl = `https://wa.me/919310296839?text=${encodeURIComponent(messageForWhatsApp)}`;

      const newUserMsg: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        text: rawText,
        timestamp
      };

      const newAssistantMsg: ChatMessage = {
        id: `assistant-wa-${Date.now()}`,
        sender: 'assistant',
        text: `I've opened a direct WhatsApp ticket for you with our support team at **+91 93102 96839**:`,
        timestamp,
        isWhatsAppCard: true,
        whatsappUrl,
        whatsappText: messageForWhatsApp
      };

      setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);
      setInputText('');

      try {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Popup blocked, click button below:', err);
      }
      return;
    }

    // Normal AI Q&A
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: rawText,
      timestamp
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => !m.isWhatsAppCard)
        .slice(-6)
        .map((m) => ({
          role: m.sender as 'user' | 'assistant',
          content: m.text
        }));

      const res = await apiClient.askHelpQuestion({
        message: rawText,
        history,
        companyName,
        companyCategory,
        userRole,
        userName
      });

      if (res.success && res.answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: res.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(res.error || 'Failed to get answer.');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: `I couldn't reach the assistant right now. You can try again or type \`/help ${rawText}\` for WhatsApp support.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reset. Ask me anything about ${companyName}'s brand guidelines, review checks, or 1-click publishing.\n\n💡 Tip: Type \`/help {your message}\` for WhatsApp human support.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-4 page-enter pb-8">
      {/* Sleek Minimalist Header */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-[#0c0d16]/90 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8a63ff]/30 to-[#38bdf8]/20 border border-[#a68bff]/40 flex items-center justify-center text-[#c4b5fd] shadow-[0_0_15px_rgba(166,139,255,0.25)] shrink-0">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold font-mono text-white tracking-tight flex items-center gap-2">
              BrandLens Assistant
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            </h1>
            <p className="text-xs text-zinc-400">
              {companyName} · Instant brand guidance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* WhatsApp Direct Support Button */}
          <a
            href="https://wa.me/919310296839?text=Hello%20BrandLens%20Support%2C%20I%20need%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            title="Chat with WhatsApp Support (+91 93102 96839)"
          >
            <PhoneCall size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">WhatsApp Support (+91 93102 96839)</span>
            <span className="sm:hidden">WhatsApp</span>
            <ExternalLink size={12} className="opacity-70" />
          </a>

          {/* Reset Chat */}
          <button
            onClick={handleResetChat}
            title="Clear and reset chat"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Clean Chatbot Container */}
      <div className="rounded-2xl border border-white/15 bg-[#0a0b14]/95 backdrop-blur-2xl shadow-2xl flex flex-col h-[580px] sm:h-[620px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-3.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8a63ff]/25 to-[#38bdf8]/15 border border-[#a68bff]/30 text-[#c4b5fd] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3.5 text-sm sm:text-[15px] leading-relaxed shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-[#1e1b38] border border-[#a68bff]/35 text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-950/30 border border-rose-500/30 text-rose-200 rounded-tl-none'
                    : 'bg-[#121320] border border-white/10 text-zinc-200 rounded-tl-none'
                }`}
              >
                {/* Special WhatsApp Card */}
                {msg.isWhatsAppCard && msg.whatsappUrl ? (
                  <div className="space-y-3">
                    <p>{msg.text}</p>
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-emerald-300 font-semibold">
                        <span>WhatsApp Human Ticket</span>
                        <span>+91 93102 96839</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 text-xs font-mono text-emerald-100 break-words">
                        "{msg.whatsappText}"
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={msg.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                        >
                          <ExternalLink size={13} />
                          <span>Open in WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 whitespace-pre-line text-zinc-200">
                    {msg.text.split('\n\n').map((para, idx) => (
                      <p
                        key={idx}
                        dangerouslySetInnerHTML={{
                          __html: para
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-[#9cecff] font-mono text-xs">$1</code>')
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400">
                  <span>{msg.timestamp}</span>
                  {!msg.isWhatsAppCard && (
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-zinc-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8a63ff]/25 to-[#38bdf8]/15 border border-[#a68bff]/30 text-[#c4b5fd] flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-none bg-[#121320] border border-white/10 flex items-center gap-2 text-sm text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-[#a68bff] animate-ping" />
                <span className="font-mono text-xs">Formulating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Prompts */}
        <div className="px-4 py-2 bg-[#080910] border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-mono text-zinc-500 uppercase shrink-0 flex items-center gap-1">
            <Sparkles size={12} className="text-[#a68bff]" />
            <span>Try:</span>
          </span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-[#a68bff]/15 border border-white/10 hover:border-[#a68bff]/30 text-zinc-300 hover:text-white text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Simple & Prominent Input Bar */}
        <div className="p-3.5 sm:p-4 bg-[#07080f] border-t border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask a question or type /help {message} for WhatsApp..."
              className="flex-1 bg-white/[0.05] border border-white/15 focus:border-[#a68bff] focus:ring-1 focus:ring-[#a68bff] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#8a63ff] to-[#a68bff] hover:opacity-90 disabled:opacity-40 text-zinc-950 font-mono text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-500 font-mono px-1">
            <span>Type <code className="text-[#a68bff]">/help &#123;text&#125;</code> for instant WhatsApp support</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
