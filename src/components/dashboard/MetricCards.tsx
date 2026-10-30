import React, { useEffect, useState } from 'react';
import { MetricCounts } from '../../types';
import { Layers, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

export type MetricFilterType = 'all' | 'pending' | 'enhanced' | 'published';

interface MetricCardsProps {
  metrics: MetricCounts;
  activeFilter: MetricFilterType;
  onSelectFilter: (filter: MetricFilterType) => void;
}

// Animated counter component for genuine data updates
const AnimatedCount: React.FC<{ value: number; color?: string }> = ({ value, color }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || (typeof document !== 'undefined' && document.hidden)) {
      setDisplayValue(value);
      return;
    }

    const duration = 350; // ms
    const startTime = performance.now();
    let rafId: number | null = null;

    const update = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.round(start + (end - start) * progress);
      setDisplayValue(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(update);
      }
    };

    rafId = requestAnimationFrame(update);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [value]);

  return (
    <span className={`text-3xl sm:text-4xl font-medium tracking-tight ${color || 'text-white'}`}>
      {displayValue}
    </span>
  );
};

const MetricCardsComponent: React.FC<MetricCardsProps> = ({
  metrics,
  activeFilter,
  onSelectFilter,
}) => {
  const cards: Array<{
    id: MetricFilterType;
    label: string;
    count: number;
    icon: React.ReactNode;
    description: string;
    badgeColor?: string;
  }> = [
    {
      id: 'all',
      label: 'TOTAL POSTS',
      count: metrics.total,
      icon: <Layers size={22} className="text-[#a68bff]" />,
      description: 'All posts authored by your account',
    },
    {
      id: 'pending',
      label: 'PENDING',
      count: metrics.pending,
      icon: <Clock size={22} className="text-[#9cecff]" />,
      description: 'Awaiting review or ready to post',
      badgeColor: 'text-[#9cecff]',
    },
    {
      id: 'enhanced',
      label: 'ENHANCED',
      count: metrics.enhanced,
      icon: <Sparkles size={22} className="text-[#c7bbff]" />,
      description: 'Posts refined via AI suggestions or visuals',
      badgeColor: metrics.enhanced > 0 ? 'text-[#c7bbff]' : undefined,
    },
    {
      id: 'published',
      label: 'PUBLISHED',
      count: metrics.published,
      icon: <CheckCircle2 size={22} className="text-[#a8e8d0]" />,
      description: 'Confirmed external social publications',
      badgeColor: 'text-[#a8e8d0]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
      {cards.map((card, idx) => {
        const isActive = activeFilter === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            style={{ animationDelay: `${idx * 0.08}s` }}
            className={`alive-spotlight text-left p-6 rounded-lg transition-all duration-300 relative overflow-hidden backdrop-blur-2xl border group cursor-pointer ${
              isActive
                ? 'bg-[rgba(23,24,36,0.92)] border-[rgba(166,139,255,0.7)] shadow-[0_12px_36px_rgba(166,139,255,0.22),inset_0_1px_1px_rgba(255,255,255,0.25)] -translate-y-1'
                : 'bg-[rgba(15,16,24,0.65)] hover:bg-[rgba(22,23,34,0.85)] border-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]'
            }`}
          >
            {/* Top accent glow line when active */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[var(--violet)] via-[#c7bbff] to-[var(--cyan)] shadow-[0_0_12px_var(--cyan)]" />
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs sm:text-[13px] font-mono tracking-widest text-[#a0a0b2] uppercase font-medium">
                {card.label}
              </span>
              <div className="p-2.5 rounded-md bg-white/[0.04] border border-white/10 group-hover:border-white/20 transition-colors">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline gap-2.5 mb-2">
              <AnimatedCount value={card.count} color={card.badgeColor} />
              <span className="text-xs font-mono text-[#8a8a9a]">
                {card.count === 1 ? 'record' : 'records'}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-[#8e8e9e] line-clamp-1 leading-relaxed">
              {card.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export const MetricCards = React.memo(MetricCardsComponent);
