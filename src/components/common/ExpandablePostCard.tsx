import React, { useState } from 'react';
import { PostRecord, PostStatus } from '../../types';
import { apiClient } from '../../services/api';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Film,
  FileText,
  Share2,
  Clock,
  RotateCcw,
  CheckCheck,
  Send,
  Loader2,
  Building2,
  UserCheck,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

import { PublishModal } from '../publishing/PublishModal';

interface ExpandablePostCardProps {
  post: PostRecord;
  actorUsername: string;
  onPostUpdated: (updatedPost: PostRecord) => void;
  onEditPost?: (post: PostRecord) => void;
  defaultExpanded?: boolean;
}

const ExpandablePostCardComponent: React.FC<ExpandablePostCardProps> = ({
  post,
  actorUsername,
  onPostUpdated,
  onEditPost,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Confirmation modal states
  const [confirmPostedOpen, setConfirmPostedOpen] = useState(false);
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Status badge helper
  const renderStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'ready_to_post':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <CheckCheck size={13} className="text-emerald-400" />
            <span>Ready to Post</span>
          </span>
        );
      case 'posted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wider bg-[rgba(166,139,255,0.18)] text-[#c7bbff] border border-[rgba(166,139,255,0.4)] shadow-[0_0_12px_rgba(166,139,255,0.18)]">
            <Share2 size={13} className="text-[#a68bff]" />
            <span>Posted</span>
          </span>
        );
      case 'pending_review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock size={13} className="text-amber-400" />
            <span>Pending for Review</span>
          </span>
        );
    }
  };

  // Verdict badge helper
  const renderVerdictBadge = (verdict?: string) => {
    if (!verdict) return null;
    switch (verdict) {
      case 'looks_good':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle size={12} /> LOOKS GOOD
          </span>
        );
      case 'changes_suggested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30">
            <Info size={12} /> CHANGES SUGGESTED
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle size={12} /> NEEDS ATTENTION
          </span>
        );
      default:
        return null;
    }
  };

  // Action handlers
  const handleMarkReady = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionError(null);
    setLoadingAction('ready');
    try {
      const updated = await apiClient.markAsReady(post.id, actorUsername);
      onPostUpdated(updated);
    } catch (err: any) {
      console.error('Failed to mark post as ready:', err);
      setActionError(err.message || 'Failed to mark post as ready to post');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmMarkPosted = async () => {
    setActionError(null);
    setLoadingAction('posted');
    try {
      const updated = await apiClient.markAsPosted(post.id, actorUsername);
      onPostUpdated(updated);
      setConfirmPostedOpen(false);
    } catch (err: any) {
      console.error('Failed to mark post as posted:', err);
      setActionError(err.message || 'Failed to record manual publication');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmReopen = async () => {
    setActionError(null);
    setLoadingAction('reopen');
    try {
      const updated = await apiClient.reopenPost(post.id, actorUsername, 'pending_review');
      onPostUpdated(updated);
      setConfirmReopenOpen(false);
    } catch (err: any) {
      console.error('Failed to reopen post:', err);
      setActionError(err.message || 'Failed to reopen post');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-[rgba(15,16,25,0.78)] hover:bg-[rgba(18,19,30,0.92)] border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 overflow-hidden shadow-lg group">
      {/* Clickable Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
      >
        <div className="space-y-2 flex-1 pr-3">
          {/* Top metadata tags */}
          <div className="flex flex-wrap items-center gap-2.5">
            {renderStatusBadge(post.status)}

            {/* AI Enhanced badge */}
            {post.isEnhanced && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium tracking-wide bg-gradient-to-r from-[rgba(166,139,255,0.2)] to-[rgba(156,236,255,0.15)] text-[#c7bbff] border border-[rgba(166,139,255,0.4)] shadow-[0_0_10px_rgba(166,139,255,0.2)]">
                <Sparkles size={11} className="text-[#9cecff]" />
                <span>AI Enhanced</span>
              </span>
            )}

            {/* Platform pill */}
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#d0d0df]">
              {post.platform}
            </span>

            {/* Findings / Clean badge */}
            {post.unresolvedIssuesCount > 0 ? (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                <span>{post.unresolvedIssuesCount} {post.unresolvedIssuesCount === 1 ? 'finding' : 'findings'}</span>
              </span>
            ) : (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5">
                <CheckCircle size={11} />
                <span>Clean</span>
              </span>
            )}

            {/* Date info */}
            <span className="text-xs font-mono text-[#78788a]">
              {post.status === 'posted' && post.postedAt
                ? `Posted ${new Date(post.postedAt).toLocaleDateString()}`
                : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
            </span>
          </div>

          {/* Post Title */}
          <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-[#c7bbff] transition-colors line-clamp-1">
            {post.title}
          </h3>

          {/* Quick Caption Preview (when collapsed) */}
          {!isExpanded && (
            <p className="text-sm text-[#9494a8] line-clamp-1 leading-relaxed">
              {post.caption}
            </p>
          )}
        </div>

        {/* Right side controls / Expand Chevron */}
        <div className="flex items-center gap-3 self-end md:self-center">
          {/* Quick status trigger button when collapsed */}
          {!isExpanded && post.status === 'pending_review' && (
            <button
              type="button"
              onClick={handleMarkReady}
              disabled={loadingAction === 'ready'}
              className="px-3.5 py-1.5 text-xs font-mono bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Promote to Ready to Post"
            >
              {loadingAction === 'ready' ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
              <span>Mark Ready</span>
            </button>
          )}

          {!isExpanded && post.status === 'ready_to_post' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmPostedOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-mono bg-[rgba(166,139,255,0.2)] hover:bg-[rgba(166,139,255,0.3)] border border-[rgba(166,139,255,0.4)] text-white rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              title="Mark as Posted to external social media"
            >
              <Send size={12} />
              <span>Mark as Posted</span>
            </button>
          )}

          {/* Expand/Collapse Chevron Button */}
          <button
            type="button"
            className="p-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[#a0a0b2] hover:text-white transition-colors border border-white/10"
            aria-label={isExpanded ? 'Collapse post details' : 'Expand post details'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 border-t border-white/5 space-y-6 animate-fade-in">
          {/* Post Content & Messaging */}
          <div className="space-y-2">
            <label className="text-xs font-mono tracking-widest text-[#8a8a9a] uppercase block font-medium">
              POST CAPTION & CONTENT
            </label>
            <div className="p-4 rounded-lg bg-black/40 border border-white/10 text-sm sm:text-base text-[#e0e0ec] leading-relaxed whitespace-pre-wrap">
              {post.caption}
            </div>
          </div>

          {/* Media Asset Preview if attached */}
          {post.mediaRef && (
            <div className="space-y-2">
              <label className="text-xs font-mono tracking-widest text-[#8a8a9a] uppercase block font-medium">
                ATTACHED MEDIA ASSET
              </label>
              <div className="p-4 rounded-lg bg-black/35 border border-white/10">
                {post.mediaType === 'image' ? (
                  <div className="space-y-2.5">
                    <div className="rounded-md overflow-hidden max-h-72 border border-white/10 bg-black/50 flex items-center justify-center p-1.5">
                      <img
                        src={post.mediaRef}
                        alt={post.title}
                        className="max-h-72 w-auto object-contain rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-[#8a8a9a]">
                      <span>{post.mediaOriginalName || 'Visual Asset'}</span>
                      {post.mediaSize && (
                        <span>{(post.mediaSize / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-md border border-white/5">
                    {post.mediaType === 'video' ? (
                      <Film size={22} className="text-[#a68bff]" />
                    ) : (
                      <FileText size={22} className="text-[#9cecff]" />
                    )}
                    <div>
                      <div className="text-xs sm:text-sm font-mono text-white font-medium">
                        {post.mediaOriginalName || 'Attached Media Asset'}
                      </div>
                      <div className="text-[11px] font-mono text-[#828392]">
                        {post.mediaType?.toUpperCase()} · {(post.mediaSize ? (post.mediaSize / (1024 * 1024)).toFixed(2) : '0')} MB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Brand Intelligence & Governance Review */}
          {post.textReviewResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono tracking-widest text-[#a68bff] uppercase flex items-center gap-1.5 font-medium">
                  <Sparkles size={13} />
                  <span>BRAND GOVERNANCE REVIEW</span>
                  {post.textReviewResult.organizationName && (
                    <span className="text-[#8e8e9e]">· {post.textReviewResult.organizationName}</span>
                  )}
                </label>
                {renderVerdictBadge(post.textReviewResult.verdict)}
              </div>

              <div className="p-4 rounded-lg bg-[rgba(166,139,255,0.04)] border border-[rgba(166,139,255,0.2)] space-y-3">
                {post.textReviewResult.isStale && (
                  <div className="text-xs font-mono px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-md flex items-center gap-2">
                    <AlertTriangle size={13} />
                    <span>Post content was modified after this review was conducted.</span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-[#d0d0df] leading-relaxed">
                  {post.textReviewResult.briefAnalysis}
                </p>

                {/* 4 Governance Dimensions Compact Strip */}
                {post.textReviewResult.dimensions && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono space-y-1">
                      <div className="text-[#8e8e9e] truncate flex items-center gap-1">
                        <Building2 size={11} className="text-[#a68bff]" /> Relevance
                      </div>
                      <div className="font-medium text-white flex items-center gap-1">
                        {post.textReviewResult.dimensions.companyRelevance.status === 'pass' && (
                          <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Pass</span>
                        )}
                        {post.textReviewResult.dimensions.companyRelevance.status === 'warning' && (
                          <span className="text-amber-300 flex items-center gap-1"><AlertTriangle size={11} /> Warning</span>
                        )}
                        {post.textReviewResult.dimensions.companyRelevance.status === 'fail' && (
                          <span className="text-rose-300 flex items-center gap-1"><XCircle size={11} /> Off-Topic</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono space-y-1">
                      <div className="text-[#8e8e9e] truncate flex items-center gap-1">
                        <UserCheck size={11} className="text-[#9cecff]" /> Role Scope
                      </div>
                      <div className="font-medium text-white flex items-center gap-1">
                        {post.textReviewResult.dimensions.roleScope.status === 'pass' && (
                          <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Pass</span>
                        )}
                        {post.textReviewResult.dimensions.roleScope.status === 'warning' && (
                          <span className="text-amber-300 flex items-center gap-1"><AlertTriangle size={11} /> Approval</span>
                        )}
                        {post.textReviewResult.dimensions.roleScope.status === 'fail' && (
                          <span className="text-rose-300 flex items-center gap-1"><XCircle size={11} /> Mismatch</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono space-y-1">
                      <div className="text-[#8e8e9e] truncate flex items-center gap-1">
                        <FileText size={11} className="text-[#a4e6cf]" /> Platform
                      </div>
                      <div className="font-medium text-white flex items-center gap-1">
                        {post.textReviewResult.dimensions.platformSuitability.status === 'pass' ? (
                          <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Pass</span>
                        ) : (
                          <span className="text-rose-300 flex items-center gap-1"><XCircle size={11} /> Warning</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-white/10 text-[11px] font-mono space-y-1">
                      <div className="text-[#8e8e9e] truncate flex items-center gap-1">
                        <Sparkles size={11} className="text-[#ffb6bd]" /> Integrity
                      </div>
                      <div className="font-medium text-white flex items-center gap-1">
                        {post.textReviewResult.dimensions.brandIntegrity.status === 'pass' && (
                          <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Pass</span>
                        )}
                        {post.textReviewResult.dimensions.brandIntegrity.status === 'needs_verification' && (
                          <span className="text-amber-300 flex items-center gap-1"><HelpCircle size={11} /> Verify</span>
                        )}
                        {post.textReviewResult.dimensions.brandIntegrity.status === 'fail' && (
                          <span className="text-rose-300 flex items-center gap-1"><XCircle size={11} /> Misleading</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {post.textReviewResult.suggestion && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-md text-xs sm:text-[13px] text-[#b8b8cc] space-y-1">
                    <span className="text-[11px] font-mono uppercase text-[#a68bff] block font-medium">
                      Guideline Suggestion:
                    </span>
                    <p>{post.textReviewResult.suggestion}</p>
                  </div>
                )}

                {/* Structured Issues List */}
                {post.textReviewResult.structuredIssues && post.textReviewResult.structuredIssues.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs font-mono uppercase text-[#ffb6bd] block font-medium">
                      Flagged Considerations ({post.textReviewResult.structuredIssues.length}):
                    </span>
                    <div className="space-y-1.5">
                      {post.textReviewResult.structuredIssues.map((iss, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-black/30 border border-white/10 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium border ${
                              iss.severity === 'blocking'
                                ? 'bg-rose-500/20 border-rose-500/35 text-rose-300'
                                : 'bg-amber-500/20 border-amber-500/35 text-amber-300'
                            }`}>
                              {iss.severity.toUpperCase()}
                            </span>
                            <span className="font-mono text-[#e0e0ec] font-medium">{iss.code}</span>
                          </div>
                          <p className="text-[#d0d0df]">{iss.message}</p>
                          {iss.suggestedFix && (
                            <p className="text-[11px] text-[#a4e6cf] font-mono">Fix: {iss.suggestedFix}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : post.textReviewResult.issues && post.textReviewResult.issues.length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase text-[#ffb6bd] block font-medium">
                      Flagged Policy Considerations ({post.textReviewResult.issues.length}):
                    </span>
                    <ul className="text-xs sm:text-[13px] text-[#ffb6bd]/90 list-disc list-inside space-y-1">
                      {post.textReviewResult.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Interactive Status Transition & Edit Actions */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {onEditPost && (
                <button
                  type="button"
                  onClick={() => onEditPost(post)}
                  className="px-4 py-2 text-xs font-mono text-[#a0a0b2] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <ExternalLink size={13} />
                  <span>Edit / Update Content</span>
                </button>
              )}
            </div>

            {/* Action error banner if action failed */}
            {actionError && (
              <div className="w-full p-2.5 bg-rose-500/15 border border-rose-500/35 rounded-lg text-rose-300 text-xs font-mono flex items-center justify-between gap-2">
                <span className="flex-1">{actionError}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActionError(null); }}
                  className="text-rose-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded text-[11px]"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Canonical Status Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {post.status === 'pending_review' && (
                <button
                  type="button"
                  onClick={handleMarkReady}
                  disabled={loadingAction === 'ready'}
                  className="btn-primary-glow px-4 py-2 text-xs font-mono tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                >
                  {loadingAction === 'ready' ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                  <span>Mark as Ready to Post ↗</span>
                </button>
              )}

              {post.status === 'ready_to_post' && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmReopenOpen(true)}
                    className="px-3.5 py-2 text-xs font-mono text-[#a0a0b0] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reopen for Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmPostedOpen(true)}
                    className="px-3.5 py-2 text-xs font-mono text-[#c9beff] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={12} />
                    <span>Record Manual Post</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(true)}
                    className="btn-primary-glow px-5 py-2 text-xs font-mono tracking-wider bg-gradient-to-r from-[rgba(166,139,255,0.3)] to-[rgba(156,236,255,0.2)] hover:from-[rgba(166,139,255,0.45)] hover:to-[rgba(156,236,255,0.3)] border border-[rgba(166,139,255,0.6)] text-white rounded-md transition-all flex items-center gap-1.5 cursor-pointer font-medium shadow-[0_0_15px_rgba(166,139,255,0.25)]"
                  >
                    <Share2 size={13} className="text-[#9cecff]" />
                    <span>Publish Directly ↗</span>
                  </button>
                </>
              )}

              {post.status === 'posted' && (
                <button
                  type="button"
                  onClick={() => setConfirmReopenOpen(true)}
                  className="px-4 py-2 text-xs font-mono text-amber-200 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reopen for Correction</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Mark as Posted */}
      {confirmPostedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-[#0d0e17] border border-[rgba(166,139,255,0.35)] rounded-xl p-6 sm:p-7 shadow-2xl space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[rgba(166,139,255,0.15)] border border-[rgba(166,139,255,0.3)] flex items-center justify-center text-[#c7bbff]">
              <Send size={18} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-medium text-white font-mono">
                Confirm Mark as Posted
              </h3>
              <p className="text-sm text-[#a0a0b2] leading-relaxed">
                Confirm that this post has been published to <span className="text-white font-medium">{post.platform}</span>?
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs font-mono text-[#8a8a9a] space-y-1">
              <div>• Sets official publication timestamp to current time.</div>
              <div>• Moves post status to <span className="text-[#c7bbff]">Posted</span>.</div>
              <div>• Updates your Published metrics counter.</div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmPostedOpen(false)}
                className="px-4 py-2 text-xs font-mono text-[#8a8a9a] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingAction === 'posted'}
                onClick={handleConfirmMarkPosted}
                className="btn-primary-glow px-5 py-2 text-xs font-mono tracking-wider bg-[rgba(166,139,255,0.3)] hover:bg-[rgba(166,139,255,0.4)] border border-[rgba(166,139,255,0.5)] text-white rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              >
                {loadingAction === 'posted' ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Confirm & Mark as Posted ↗</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reopen for Correction */}
      {confirmReopenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            className="w-full max-w-md bg-[#0d0e17] border border-amber-500/35 rounded-xl p-6 sm:p-7 shadow-2xl space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <RotateCcw size={18} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-medium text-white font-mono">
                Reopen for Correction
              </h3>
              <p className="text-sm text-[#a0a0b2] leading-relaxed">
                Reopening this post will move it back to <span className="text-amber-300 font-medium">Pending for Review</span> so you or your team can revise messaging and re-evaluate brand guidelines.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmReopenOpen(false)}
                className="px-4 py-2 text-xs font-mono text-[#8a8a9a] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingAction === 'reopen'}
                onClick={handleConfirmReopen}
                className="px-5 py-2 text-xs font-mono tracking-wider bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
              >
                {loadingAction === 'reopen' ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Confirm & Reopen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Social Publishing Modal */}
      <PublishModal
        post={post}
        actorUsername={actorUsername}
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublished={(updatedPost) => {
          onPostUpdated(updatedPost);
        }}
      />
    </div>
  );
};

export const ExpandablePostCard = React.memo(ExpandablePostCardComponent);
