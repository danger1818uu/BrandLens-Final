import React, { useState } from 'react';
import {
  TextReviewResult,
  Role,
  Platform,
  SimplifiedVerdict,
  SimplifiedCheckStatus,
  GovernanceIssue,
  ResolvedIssue,
  IssueCode,
  IssueSeverity
} from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Wand2,
  Sparkles,
  RefreshCw,
  Check,
  Building2,
  UserCheck,
  ShieldCheck,
  Info,
  Loader2
} from 'lucide-react';

interface SimplifiedGovernanceCardProps {
  textReview: TextReviewResult;
  role: Role;
  platform: Platform;
  orgName?: string;
  isStale?: boolean;
  isRechecking?: boolean;
  onApplyFix?: (issue: GovernanceIssue, fixText?: string) => void;
  onRecheck?: () => void;
  resolvedIssues?: ResolvedIssue[];
  isApplyingFix?: boolean;
}

export const SimplifiedGovernanceCard: React.FC<SimplifiedGovernanceCardProps> = ({
  textReview,
  role,
  platform,
  orgName = 'Nova Unlimited',
  isStale = false,
  isRechecking = false,
  onApplyFix,
  onRecheck,
  resolvedIssues = [],
  isApplyingFix = false
}) => {
  const [openWhyFlagged, setOpenWhyFlagged] = useState<Record<string, boolean>>({});
  const [showResolved, setShowResolved] = useState(false);

  // 1. Calculate the 3 compact checks from Section 5 schema (with fallback to dimensions)
  const rawRelStatus = textReview.companyRelevance?.status ?? textReview.dimensions?.companyRelevance?.status;
  let relStatus: SimplifiedCheckStatus = 'check';
  if (rawRelStatus === 'pass') relStatus = 'pass';
  else if (rawRelStatus === 'fail') relStatus = 'action_needed';
  else if (rawRelStatus === 'warning' || rawRelStatus === 'unclear') relStatus = 'check';

  const rawRoleStatus = textReview.roleScope?.status ?? textReview.dimensions?.roleScope?.status;
  let roleStatus: SimplifiedCheckStatus = 'check';
  if (rawRoleStatus === 'pass') roleStatus = 'pass';
  else if (rawRoleStatus === 'fail') roleStatus = 'action_needed';
  else if (rawRoleStatus === 'warning' || rawRoleStatus === 'unclear') roleStatus = 'check';

  const rawQualityStatus = textReview.contentQuality?.status ??
    textReview.dimensions?.contentQuality?.status ??
    (textReview.dimensions?.platformSuitability?.status === 'fail' || textReview.dimensions?.brandIntegrity?.status === 'fail'
      ? 'fail'
      : textReview.dimensions?.brandIntegrity?.status === 'warning' || textReview.dimensions?.brandIntegrity?.status === 'needs_verification'
      ? 'warning'
      : textReview.dimensions?.brandIntegrity?.status === 'pass' && textReview.dimensions?.platformSuitability?.status === 'pass'
      ? 'pass'
      : 'unclear');

  let qualityStatus: SimplifiedCheckStatus = 'check';
  if (rawQualityStatus === 'pass') qualityStatus = 'pass';
  else if (rawQualityStatus === 'fail') qualityStatus = 'action_needed';
  else if (rawQualityStatus === 'warning' || rawQualityStatus === 'unclear' || rawQualityStatus === 'needs_verification') qualityStatus = 'check';

  // 2. Compute Top Verdict directly enforcing backend overallVerdict
  const backendVerdict = textReview.overallVerdict;
  const hasBlockingIssue = (textReview.structuredIssues || []).some(i => i.severity === 'blocking');
  const hasWarningIssue = (textReview.structuredIssues || []).some(i => i.severity === 'warning');

  let overallVerdict: SimplifiedVerdict = 'needs_review';
  if (isStale) {
    overallVerdict = 'needs_review';
  } else if (backendVerdict === 'blocked' || hasBlockingIssue || relStatus === 'action_needed' || roleStatus === 'action_needed' || qualityStatus === 'action_needed') {
    overallVerdict = 'needs_fix';
  } else if (backendVerdict === 'needs_changes' || hasWarningIssue) {
    overallVerdict = 'needs_fix';
  } else if (backendVerdict === 'needs_review' || backendVerdict === 'needs_clarification' || relStatus === 'check' || roleStatus === 'check' || qualityStatus === 'check') {
    overallVerdict = 'needs_review';
  } else if (
    backendVerdict === 'approved' &&
    relStatus === 'pass' &&
    roleStatus === 'pass' &&
    qualityStatus === 'pass' &&
    !hasBlockingIssue &&
    !hasWarningIssue &&
    !isStale
  ) {
    overallVerdict = 'ready_to_post';
  } else {
    overallVerdict = 'needs_review';
  }

  // Human-readable 1-sentence explanation strictly guarded
  let verdictSentence = '';
  if (isStale) {
    verdictSentence = 'Content was updated after the review. Please recheck before posting.';
  } else if (overallVerdict === 'ready_to_post' && backendVerdict === 'approved' && relStatus === 'pass' && roleStatus === 'pass' && qualityStatus === 'pass' && !hasBlockingIssue && !hasWarningIssue) {
    verdictSentence = 'All required checks have passed. This content is verified and ready to post.';
  } else if (overallVerdict === 'needs_fix' || backendVerdict === 'blocked') {
    verdictSentence = textReview.summary || textReview.briefAnalysis || 'One or more items require correction to comply with company and role policies.';
  } else if (overallVerdict === 'needs_review' || backendVerdict === 'needs_review') {
    verdictSentence = textReview.summary || textReview.briefAnalysis || 'Review could not be completed or requires verification before posting.';
  } else {
    verdictSentence = textReview.summary || textReview.briefAnalysis || 'Content requires adjustments to comply with brand standards.';
  }

  // 3. Extract active issues (clean, deduplicated)
  const activeIssues: GovernanceIssue[] = textReview.structuredIssues && textReview.structuredIssues.length > 0
    ? textReview.structuredIssues
    : (textReview.issues || []).map((msg) => ({
        code: 'BRAND_GUIDELINE_VIOLATION' as IssueCode,
        severity: (backendVerdict === 'blocked' ? 'blocking' : 'warning') as IssueSeverity,
        message: msg,
        suggestedFix: textReview.suggestion || undefined
      }));

  const toggleWhy = (idxKey: string) => {
    setOpenWhyFlagged((prev) => ({ ...prev, [idxKey]: !prev[idxKey] }));
  };

  // Helper to convert internal codes into friendly user titles
  const getFriendlyTitle = (issue: GovernanceIssue): string => {
    if (issue.code === 'UNSUPPORTED_CLAIM') return 'Unverified technical or pricing claim';
    if (issue.code === 'ROLE_SCOPE_MISMATCH') return `${role} role scope boundary`;
    if (issue.code === 'OFF_TOPIC') return 'Non-hosting topic / relevance notice';
    if (issue.code === 'PLATFORM_MISMATCH') return `${platform} formatting notice`;
    if (issue.code === 'APPROVAL_REQUIRED') return 'Manager approval required';
    if (issue.code === 'POTENTIALLY_MISLEADING') return 'Potentially misleading terminology';
    if (issue.code === 'MISSING_CONTEXT') return 'Clarification or context needed';
    return 'Policy or brand guideline notice';
  };

  const renderStatusPill = (status: SimplifiedCheckStatus) => {
    if (status === 'pass') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 size={12} className="text-emerald-400" /> Pass
        </span>
      );
    }
    if (status === 'check') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <HelpCircle size={12} className="text-amber-400" /> Check
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <AlertTriangle size={12} className="text-rose-400" /> Action needed
      </span>
    );
  };

  return (
    <div className="p-6 sm:p-7 bg-[rgba(16,17,26,0.85)] border border-white/15 rounded-xl space-y-6 shadow-2xl backdrop-blur-xl transition-all">
      {/* 1. TOP OVERALL RESULT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-[#a68bff]" />
            <span className="text-xs font-mono text-[#9a9aa8] uppercase tracking-wider font-medium">
              {orgName} Governance Review
            </span>
          </div>
          <p className="text-sm sm:text-[14.5px] text-[#e0e0ec] leading-normal font-sans">
            {verdictSentence}
          </p>
        </div>

        <div>
          {overallVerdict === 'ready_to_post' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs sm:text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle2 size={16} />
              <span>Ready to post</span>
            </div>
          )}
          {overallVerdict === 'needs_fix' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-xs sm:text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <AlertTriangle size={16} />
              <span>Needs a fix</span>
            </div>
          )}
          {overallVerdict === 'needs_review' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-xs sm:text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <HelpCircle size={16} />
              <span>Needs review</span>
            </div>
          )}
        </div>
      </div>

      {/* Stale content notice */}
      {isStale && (
        <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-amber-400" />
            <span>Content was updated after this review.</span>
          </div>
          {onRecheck && (
            <button
              type="button"
              disabled={isRechecking}
              onClick={onRecheck}
              className="text-white hover:text-amber-300 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              {isRechecking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Recheck now
            </button>
          )}
        </div>
      )}

      {/* 2. THE THREE COMPACT CHECKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Check 1: Company relevance */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-white">
              <Building2 size={13} className="text-[#a68bff]" />
              <span>Company relevance</span>
            </div>
            {renderStatusPill(relStatus)}
          </div>
          <p className="text-[11.5px] text-[#9090a2] leading-relaxed">
            {textReview.companyRelevance?.summary || textReview.dimensions?.companyRelevance?.summary || 'Nova Unlimited server & hosting relevance'}
          </p>
        </div>

        {/* Check 2: Role permissions */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-white">
              <UserCheck size={13} className="text-[#9cecff]" />
              <span>Role permissions</span>
            </div>
            {renderStatusPill(roleStatus)}
          </div>
          <p className="text-[11.5px] text-[#9090a2] leading-relaxed">
            {textReview.roleScope?.summary || textReview.dimensions?.roleScope?.summary || `${role} authority & commitments scope`}
          </p>
        </div>

        {/* Check 3: Content quality */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-white">
              <Sparkles size={13} className="text-[#a4e6cf]" />
              <span>Content quality</span>
            </div>
            {renderStatusPill(qualityStatus)}
          </div>
          <p className="text-[11.5px] text-[#9090a2] leading-relaxed">
            {textReview.contentQuality?.summary || textReview.dimensions?.contentQuality?.summary || `${platform} suitability & verified factual claims`}
          </p>
        </div>
      </div>

      {/* 3. UNRESOLVED ISSUES LIST */}
      {activeIssues.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono tracking-wider text-[#d0d0df] uppercase font-medium flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Issues Flagged ({activeIssues.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {activeIssues.map((issue, idx) => {
              const key = `issue-${idx}`;
              const isWhyOpen = Boolean(openWhyFlagged[key]);
              const friendlyTitle = getFriendlyTitle(issue);
              const hasFix = Boolean(issue.suggestedFix || textReview.suggestedCaption || textReview.suggestedTitle);

              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border transition-all ${
                    issue.severity === 'blocking'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Title & severity */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white font-sans">
                          {friendlyTitle}
                        </span>
                        {issue.severity === 'blocking' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                            Action needed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                            Check
                          </span>
                        )}
                      </div>

                      {/* Quick Apply button on issue card */}
                      {hasFix && onApplyFix && (
                        <button
                          type="button"
                          disabled={isApplyingFix}
                          onClick={() => onApplyFix(issue, issue.suggestedFix)}
                          className="btn-primary-glow flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-[#a68bff]/25 hover:bg-[#a68bff]/40 border border-[#a68bff]/60 text-white transition-all font-medium cursor-pointer shadow-[0_0_10px_rgba(166,139,255,0.2)]"
                        >
                          {isApplyingFix ? (
                            <Loader2 size={12} className="animate-spin text-[#c9beff]" />
                          ) : (
                            <Wand2 size={12} className="text-[#c9beff]" />
                          )}
                          <span>Apply Fix ↗</span>
                        </button>
                      )}
                    </div>

                    {/* Issue explanation */}
                    <p className="text-xs sm:text-[13px] text-[#e0e0ec] leading-relaxed font-sans">
                      {issue.message}
                    </p>

                    {/* Collapsible "Why was this flagged?" accordion */}
                    {(issue.evidence || issue.code) && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleWhy(key)}
                          className="text-[11px] font-mono text-[#9a9aa8] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isWhyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <span>Why was this flagged?</span>
                        </button>

                        {isWhyOpen && (
                          <div className="mt-2 p-3 bg-black/60 rounded border border-white/10 text-xs font-mono space-y-1.5 text-[#b0b0c0]">
                            {issue.code && (
                              <div className="text-[11px] text-[#808090]">
                                Internal rule: <span className="text-[#c9beff]">{issue.code}</span>
                              </div>
                            )}
                            {issue.evidence && (
                              <div className="text-[11.5px] text-[#d0d0e0]">
                                <span className="text-[#808090]">Context / Evidence:</span> {issue.evidence}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. AI SUGGESTED TITLE & CAPTION + APPLY FIX BUTTON */}
      {(textReview.suggestedTitle || textReview.suggestedCaption || textReview.suggestion) && onApplyFix && (
        <div className="p-5 bg-gradient-to-br from-black/70 via-[rgba(166,139,255,0.08)] to-black/70 border border-[#a68bff]/40 rounded-xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-mono text-[#9cecff] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#a68bff]" /> AI Suggested Revision (Title & Caption)
              </span>
              <p className="text-xs text-[#a0a0b2] font-sans">
                {textReview.suggestion || 'Review the suggested replacements that resolve all flagged policy and guideline items.'}
              </p>
            </div>

            <button
              type="button"
              disabled={isApplyingFix}
              onClick={() => onApplyFix({
                code: 'BRAND_GUIDELINE_VIOLATION',
                severity: 'suggestion',
                message: 'Apply suggested title and caption'
              })}
              className="btn-primary-glow flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-[13px] font-mono bg-gradient-to-r from-[#a68bff] to-[#9cecff] text-[#08090d] hover:brightness-110 font-bold transition-all shadow-[0_0_20px_rgba(166,139,255,0.35)] cursor-pointer shrink-0"
            >
              {isApplyingFix ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#08090d]" />
                  <span>Applying & Verifying...</span>
                </>
              ) : (
                <>
                  <Wand2 size={14} className="text-[#08090d]" />
                  <span>Apply Fix (Title & Caption) ↗</span>
                </>
              )}
            </button>
          </div>

          {/* Suggested Title */}
          {textReview.suggestedTitle && (
            <div className="p-3 bg-black/60 border border-white/10 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#828392] uppercase">
                <span>Suggested Title</span>
                <span className="text-[#a68bff]">Compliant</span>
              </div>
              <div className="text-sm font-sans font-medium text-white">
                {textReview.suggestedTitle}
              </div>
            </div>
          )}

          {/* Suggested Caption */}
          {textReview.suggestedCaption && (
            <div className="p-3 bg-black/60 border border-white/10 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#828392] uppercase">
                <span>Suggested Caption</span>
                <span className="text-[#9cecff]">Platform & SLA Verified</span>
              </div>
              <div className="text-xs sm:text-[13px] font-sans text-[#e0e0ec] leading-relaxed whitespace-pre-line">
                {textReview.suggestedCaption}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RESOLVED ISSUES ACCORDION */}
      {resolvedIssues.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center justify-between w-full text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Check size={13} /> Resolved Findings ({resolvedIssues.length})
            </span>
            {showResolved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showResolved && (
            <div className="mt-3 space-y-2">
              {resolvedIssues.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-md text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-300 font-sans">{res.title}</span>
                    <span className="font-mono text-[10px] text-[#808090]">
                      {new Date(res.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9090a0]">{res.originalMessage}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recheck footer button */}
      {onRecheck && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={isRechecking}
            onClick={onRecheck}
            className="text-xs font-mono text-[#9a9aa8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isRechecking ? 'animate-spin text-[#a68bff]' : ''} />
            <span>{isRechecking ? 'Rechecking content...' : 'Recheck Content'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
