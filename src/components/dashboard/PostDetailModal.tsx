import React, { useState } from 'react';
import { PostRecord, PostActivity } from '../../types';
import { X, CheckCircle, Info, AlertTriangle, Sparkles, Eye, Film, FileText, Loader2, Building2, UserCheck, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface PostDetailModalProps {
  post: PostRecord;
  activities: PostActivity[];
  onClose: () => void;
  onSave: (updated: { title: string; caption: string }) => Promise<void>;
  username: string;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  activities,
  onClose,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContentChanged = title !== post.title || caption !== post.caption;

  const handleSave = async () => {
    if (!title.trim() || !caption.trim()) {
      setError('Title and caption cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title, caption });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  };

  const getVerdictBadge = (verdict?: string) => {
    if (!verdict) return null;
    switch (verdict) {
      case 'looks_good':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
            <CheckCircle size={13} /> LOOKS GOOD
          </span>
        );
      case 'changes_suggested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
            <Info size={13} /> CHANGES SUGGESTED
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
            <AlertTriangle size={13} /> NEEDS ATTENTION
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-[#0d0e17] border border-white/20 rounded-xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent gradient line */}
        <div className="absolute top-0 left-10 right-10 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--violet)] to-transparent" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono tracking-widest text-[#a0a0b2] uppercase font-medium">
              POST DETAILS
            </span>
            <span className="text-white/20">/</span>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[#c9beff]">
              {post.platform}
            </span>
            <span
              className={`text-xs font-mono px-2.5 py-1 rounded font-medium ${
                post.status === 'ready_to_post'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : post.status === 'posted'
                  ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
              }`}
            >
              {post.status === 'ready_to_post'
                ? 'READY TO POST'
                : post.status === 'posted'
                ? 'POSTED'
                : 'PENDING FOR REVIEW'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#92939f] hover:text-white p-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-7">
          {error && (
            <div className="p-4 text-xs sm:text-[13px] bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Post Content Header / Edit mode */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono tracking-widest text-[#a0a0b2] uppercase font-medium">
                CONTENT & MESSAGING
              </label>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs sm:text-[13px] font-mono text-[#a68bff] hover:text-[#c7bbff] transition-colors cursor-pointer font-medium"
                >
                  [ Edit Content ]
                </button>
              ) : (
                <span className="text-xs font-mono text-amber-300">
                  Editing Mode Active
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4 p-5 bg-white/[0.02] border border-white/10 rounded-lg">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-[#9a9aa8]">
                    TITLE
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 text-base bg-black/60 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#a68bff]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-[#9a9aa8]">
                    CAPTION / DETAILS
                  </label>
                  <textarea
                    rows={5}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full px-4 py-3 text-base bg-black/60 border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#a68bff] leading-relaxed"
                  />
                </div>

                {hasContentChanged && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono rounded flex items-center gap-2">
                    <Info size={14} />
                    <span>Saving content changes will mark previous AI review results as stale.</span>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(post.title);
                      setCaption(post.caption);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-xs font-mono text-[#92939f] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="btn-primary-glow px-5 py-2 text-xs font-mono tracking-wider bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.35)] border border-[rgba(166,139,255,0.5)] text-white rounded-md transition-colors font-medium cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Changes ↗'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-white/[0.02] border border-white/10 rounded-lg space-y-3">
                <h3 className="text-lg sm:text-xl font-medium text-white">{post.title}</h3>
                <p className="text-sm sm:text-base text-[#c0c0d2] leading-relaxed whitespace-pre-wrap">
                  {post.caption}
                </p>
              </div>
            )}
          </div>

          {/* Media Preview if attached */}
          {post.mediaRef && (
            <div className="space-y-3">
              <label className="text-xs font-mono tracking-widest text-[#a0a0b2] uppercase block font-medium">
                ATTACHED MEDIA
              </label>
              <div className="p-5 bg-white/[0.02] border border-white/10 rounded-lg">
                {post.mediaType === 'image' ? (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden max-h-80 border border-white/10 bg-black/50 flex items-center justify-center p-2">
                      <img
                        src={post.mediaRef}
                        alt={post.title}
                        className="max-h-80 w-auto object-contain rounded"
                      />
                    </div>
                    <div className="text-xs font-mono text-[#8a8a9a] flex items-center justify-between">
                      <span>{post.mediaOriginalName || 'Visual Asset'}</span>
                      {post.mediaSize && (
                        <span>{(post.mediaSize / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5 p-4 bg-white/[0.03] rounded-lg border border-white/5">
                    {post.mediaType === 'video' ? (
                      <Film size={24} className="text-[#a68bff]" />
                    ) : (
                      <FileText size={24} className="text-[#9cecff]" />
                    )}
                    <div>
                      <div className="text-sm font-mono text-white font-medium">
                        {post.mediaOriginalName || 'Attached Media Asset'}
                      </div>
                      <div className="text-xs font-mono text-[#8a8a9a]">
                        {post.mediaType?.toUpperCase()} · {(post.mediaSize ? (post.mediaSize / (1024 * 1024)).toFixed(2) : '0')} MB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Reviews Section */}
          <div className="space-y-4">
            <label className="text-xs font-mono tracking-widest text-[#a0a0b2] uppercase block font-medium">
              AI BRAND INTELLIGENCE REVIEW
            </label>

            {/* Text review display */}
            {post.textReviewResult ? (
              <div className="p-5 bg-[rgba(166,139,255,0.04)] border border-[rgba(166,139,255,0.25)] rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#a68bff]" />
                    <span className="text-sm font-mono font-medium text-white">
                      Brand Governance Analysis
                      {post.textReviewResult.organizationName && (
                        <span className="text-[#8e8e9e] font-normal"> · {post.textReviewResult.organizationName}</span>
                      )}
                    </span>
                  </div>
                  {getVerdictBadge(post.textReviewResult.verdict)}
                </div>

                {post.textReviewResult.isStale && (
                  <div className="text-xs font-mono px-3 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded">
                    ⚠️ Content was modified after this review.
                  </div>
                )}

                <p className="text-sm text-[#d8d8e8] leading-relaxed">
                  {post.textReviewResult.briefAnalysis}
                </p>

                {/* 4 Governance Dimensions */}
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
                          <span className="text-rose-300 flex items-center gap-1"><XCircle size={11} /> Format</span>
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
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs sm:text-[13px] text-[#b0b0c2] space-y-1">
                    <span className="text-[11px] font-mono uppercase text-[#a68bff] block font-medium">
                      Recommended Action:
                    </span>
                    <p>{post.textReviewResult.suggestion}</p>
                  </div>
                )}

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
                      Flagged Considerations ({post.textReviewResult.issues.length}):
                    </span>
                    <ul className="text-xs sm:text-[13px] text-[#ffb6bd]/90 list-disc list-inside space-y-1">
                      {post.textReviewResult.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-4 text-xs font-mono text-[#828392] bg-white/[0.015] border border-white/5 rounded-lg">
                No text review performed yet.
              </div>
            )}

            {/* Image review display */}
            {post.imageReviewResult && (
              <div className="p-5 bg-[rgba(156,236,255,0.04)] border border-[rgba(156,236,255,0.25)] rounded-lg space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Eye size={16} className="text-[#9cecff]" />
                    <span className="text-sm font-mono font-medium text-white">
                      Image Review Analysis
                    </span>
                  </div>
                  {getVerdictBadge(post.imageReviewResult.verdict)}
                </div>

                <p className="text-sm text-[#d8d8e8] leading-relaxed">
                  {post.imageReviewResult.briefAnalysis}
                </p>

                {post.imageReviewResult.suggestion && (
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs sm:text-[13px] text-[#b0b0c2]">
                    <span className="text-[11px] font-mono uppercase text-[#9cecff] block mb-1 font-medium">
                      Visual Improvement Suggestion:
                    </span>
                    {post.imageReviewResult.suggestion}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity / Audit History */}
          <div className="space-y-3.5 pt-2">
            <label className="text-xs font-mono tracking-widest text-[#a0a0b2] uppercase block font-medium">
              ACTIVITY HISTORY
            </label>
            <div className="space-y-3 border-l border-white/10 ml-2 pl-4">
              {activities.length === 0 ? (
                <div className="text-xs font-mono text-[#7a7a8a]">
                  No historical events recorded.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative space-y-0.5 text-xs sm:text-[13px]">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#a68bff] shadow-[0_0_8px_#a68bff]" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white font-medium">
                        {act.description}
                      </span>
                      <span className="font-mono text-[11px] text-[#727382]">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#8a8a9a]">
                      by @{act.actorUsername}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-between bg-black/50">
          <div className="text-xs font-mono text-[#8a8a9a]">
            CREATED: {new Date(post.createdAt).toLocaleDateString()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-[13px] font-mono text-[#a0a0b0] hover:text-white bg-white/5 border border-white/10 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
