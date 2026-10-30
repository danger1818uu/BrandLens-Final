import React, { useState, useEffect } from 'react';

export interface TourStep {
  title: string;
  description: string;
  badge: string;
  targetRole?: string;
  actionHint?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Step 1: Register Company',
    badge: 'Nova Onboarding',
    description:
      'Begin by registering a new organization workspace. In this demo, Nova Unlimited is pre-filled as a technology hosting provider specializing in high-performance cloud infrastructure.',
    actionHint: 'Fill in details or click "⚡ Fill Nova Demo Details" then click Register.'
  },
  {
    title: 'Step 2: CEO Login',
    badge: 'CEO Authentication',
    description:
      'Log into the CEO Workspace using the registered company email (novaunlimited0@gmail.com) and secure password (ceo123). As CEO, you manage organization policy, team accounts, and AI instructions.',
    actionHint: 'Click Login to enter the CEO Workspace.'
  },
  {
    title: 'Step 3: Team Account Governance',
    badge: 'Add Team Members',
    description:
      'Inspect the top summary cards (Employees, Managers, HODs, Total Team). Click any card to filter accounts or click "+ Add Member" to generate unique company-scoped login identifiers.',
    actionHint: 'Click Employees, Managers, or HODs to view accounts and add team members.'
  },
  {
    title: 'Step 4: About Company & Identity',
    badge: 'Company Profile',
    description:
      'Navigate to the ABOUT COMPANY tab. Defining Nova Unlimited’s services, target audience, brand voice, and approved terminology automatically triggers the AI engine to synthesize a compact company context.',
    actionHint: 'Review company details and click "Save Company Profile & Regenerate AI".'
  },
  {
    title: 'Step 5: Guidelines & Compact Prompts',
    badge: 'Policy Synchronization',
    description:
      'Navigate to GUIDELINES to inspect company-wide and role-specific rules. When saved, BrandLens refreshes the compact prompt version and configures concise 250–450 char image visual guidelines.',
    actionHint: 'Click "Save Guidelines & Refresh AI Instructions" to synchronize prompts.'
  },
  {
    title: 'Step 6: CEO Logout',
    badge: 'Role Transition',
    description:
      'Now that the company identity, team accounts, and guidelines are configured, log out of the CEO Workspace to test the workflow from an Employee’s perspective.',
    actionHint: 'Click "Logout" in the top right corner.'
  },
  {
    title: 'Step 7: Employee Posting Experience',
    badge: 'Content Creation',
    description:
      'Log in with employee@novaunlimited.test (password: employee123). The Employee Dashboard automatically consumes Nova Unlimited’s saved compact context and role rules for text review, enhancer, and image generation!',
    actionHint: 'Select "👤 Employee" in Quick-Select Demo Accounts and click Login.'
  }
];

interface DemoTourProps {
  currentStepIndex?: number;
  onClose?: () => void;
  onOpenAuth?: (tab: 'register' | 'login') => void;
}

export function DemoTour({ currentStepIndex, onClose, onOpenAuth }: DemoTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if tour was previously dismissed
    const tourDismissed = localStorage.getItem('brandlens_tour_dismissed');
    if (!tourDismissed) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof currentStepIndex === 'number' && currentStepIndex >= 0 && currentStepIndex < TOUR_STEPS.length) {
      setStep(currentStepIndex);
    }
  }, [currentStepIndex]);

  const handleDismiss = () => {
    localStorage.setItem('brandlens_tour_dismissed', 'true');
    setIsOpen(false);
    onClose?.();
  };

  const handleReplay = () => {
    localStorage.removeItem('brandlens_tour_dismissed');
    setStep(0);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleReplay}
        className="fixed bottom-5 right-5 z-40 px-3.5 py-2 rounded-xl bg-[#131424] hover:bg-[#1a1c32] border border-white/10 text-xs font-mono text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2 transition-all group"
      >
        <span className="w-2 h-2 rounded-full bg-[#9cecff] group-hover:animate-ping" />
        <span>Explore Nova Tour</span>
      </button>
    );
  }

  const current = TOUR_STEPS[step];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0d0e1c] border border-white/15 rounded-2xl shadow-2xl p-5 space-y-4 backdrop-blur-xl animate-slide-up font-sans text-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#a68bff]/15 text-[#9cecff] border border-[#a68bff]/30">
            {current.badge}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {step + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors text-xs"
        >
          Skip Tour
        </button>
      </div>

      <div className="space-y-1.5">
        <h4 className="text-sm font-bold text-white">{current.title}</h4>
        <p className="text-xs text-slate-300 leading-relaxed">{current.description}</p>
      </div>

      {current.actionHint && (
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-[#9cecff] flex items-center gap-2 font-mono">
          <span>👉</span>
          <span>{current.actionHint}</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="grid grid-cols-7 gap-1">
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i <= step ? 'bg-[#9cecff]' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Next/Prev Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          Back
        </button>

        {step < TOUR_STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1))}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#a68bff] to-[#7f5af0] hover:from-[#b79eff] hover:to-[#8c67ff] text-white text-xs font-semibold tracking-wide shadow-md transition-all"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold tracking-wide shadow-md transition-all"
          >
            Got It!
          </button>
        )}
      </div>
    </div>
  );
}
