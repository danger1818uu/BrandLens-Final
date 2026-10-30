import React, { useState, useEffect } from 'react';
import { PostRecord, Platform, ConnectedAccount } from '../../types';
import { apiClient } from '../../services/api';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
  Film
} from 'lucide-react';

interface PublishModalProps {
  post: PostRecord;
  actorUsername: string;
  isOpen: boolean;
  onClose: () => void;
  onPublished: (updatedPost: PostRecord, publishedUrl?: string) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  post,
  actorUsername,
  isOpen,
  onClose,
  onPublished
}) => {
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRecordingManual, setIsRecordingManual] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const charLimits: Record<Platform, number> = {
    LinkedIn: 3000,
    Instagram: 2200,
    X: 280
  };

  const maxChars = charLimits[post.platform];
  const charCount = post.caption.length;
  const isOverLimit = charCount > maxChars;
  const isPdfUnsupported = post.mediaType === 'pdf' && (post.platform === 'Instagram' || post.platform === 'X');
  const isInstagramMissingMedia = post.platform === 'Instagram' && !post.mediaRef;

  useEffect(() => {
    if (!isOpen) return;
    setPublishError(null);
    async function loadAccount() {
      try {
        setLoadingAccount(true);
        const accounts = await apiClient.fetchConnectedAccounts(post.organizationId);
        const matching = accounts.find((a) => a.platform === post.platform && a.isActive);
        setConnectedAccount(matching || null);
      } catch (err) {
        console.error('Failed to load connected account:', err);
      } finally {
        setLoadingAccount(false);
      }
    }
    loadAccount();
  }, [isOpen, post.platform, post.organizationId]);

  if (!isOpen) return null;

  const handleConfirmPublish = async () => {
    setPublishError(null);
    setIsPublishing(true);

    try {
      const res = await apiClient.publishPost(post.id, actorUsername, post.organizationId);
      if (res.post) {
        onPublished(res.post, res.publishedUrl);
        onClose();
      }
    } catch (err: any) {
      setPublishError(err.message || 'Direct publishing failed. Please verify account permissions.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRecordManual = async () => {
    setPublishError(null);
    setIsRecordingManual(true);
    try {
      const updated = await apiClient.markAsPosted(post.id, actorUsername);
      onPublished(updated);
      onClose();
    } catch (err: any) {
      setPublishError(err.message || 'Failed to record manual publication.');
    } finally {
      setIsRecordingManual(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0f1019] border border-white/20 rounded-xl max-w-xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative page-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[rgba(166,139,255,0.2)] border border-[rgba(166,139,255,0.4)] flex items-center justify-center text-[#c9beff]">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-medium text-white font-mono">
                Direct Social Publication
              </h3>
              <p className="text-xs text-[#828392]">
                Target: <span className="text-white font-mono">{post.platform}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#92939f] hover:text-white p-1 rounded cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation Errors */}
        {isOverLimit && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono rounded flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>Post exceeds {post.platform}'s limit of {maxChars} characters ({charCount} characters).</span>
          </div>
        )}

        {isPdfUnsupported && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono rounded flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{post.platform} does not support PDF documents. Please remove PDF attachment.</span>
          </div>
        )}

        {isInstagramMissingMedia && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono rounded flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Instagram requires media:</span> Feed posts strictly require an image or video attachment. Attach an image in the editor to publish via API, or use <strong>Record Manual Post</strong> below.
            </div>
          </div>
        )}

        {publishError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono rounded space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-400" />
              <div className="flex-1 text-xs leading-relaxed">{publishError}</div>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-rose-500/20 text-[11px]">
              <span className="text-[#a0a0b0]">Posted directly on {post.platform}?</span>
              <button
                type="button"
                onClick={handleRecordManual}
                disabled={isRecordingManual}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isRecordingManual ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                )}
                <span>Record Manual Post</span>
              </button>
            </div>
          </div>
        )}

        {/* Connected Account Verification */}
        <div className="p-4 bg-white/[0.025] border border-white/10 rounded-lg space-y-2">
          <div className="text-xs font-mono text-[#828392] uppercase">
            Publishing Channel
          </div>
          {loadingAccount ? (
            <div className="flex items-center gap-2 text-xs font-mono text-[#a0a0b0]">
              <Loader2 size={13} className="animate-spin text-[#a68bff]" />
              <span>Verifying active account connection...</span>
            </div>
          ) : connectedAccount ? (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-white font-mono flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>{connectedAccount.accountName} ({connectedAccount.accountIdentifier})</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Connected by CEO · 1-Click Post
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-amber-300 flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>No connected account configured for {post.platform}. Please contact your CEO to configure {post.platform} credentials in the CEO section.</span>
            </div>
          )}
        </div>

        {/* Post Preview Summary */}
        <div className="p-4 bg-black/60 border border-white/10 rounded-lg space-y-3">
          <div className="text-xs font-mono text-[#828392] uppercase">
            Content Preview
          </div>
          {post.title && (
            <div className="text-sm font-semibold text-white font-mono">
              {post.title}
            </div>
          )}
          <div className="text-xs text-[#d0d0df] leading-relaxed line-clamp-4">
            {post.caption}
          </div>

          {/* Media tag if any */}
          {post.mediaRef && (
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-[#9cecff]">
              {post.mediaType === 'image' && <ImageIcon size={14} />}
              {post.mediaType === 'video' && <Film size={14} />}
              {post.mediaType === 'pdf' && <FileText size={14} />}
              <span>{post.mediaOriginalName || 'Attached Media'}</span>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#727382]">
            <span>Character count:</span>
            <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-[#a0a0b0]'}>
              {charCount} / {maxChars}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-3">
          <button
            type="button"
            onClick={handleRecordManual}
            disabled={isPublishing || isRecordingManual}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-emerald-300 hover:text-emerald-200 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            title="Record post as published without calling social API"
          >
            {isRecordingManual ? (
              <Loader2 size={13} className="animate-spin text-emerald-300" />
            ) : (
              <CheckCircle2 size={13} className="text-emerald-400" />
            )}
            <span>Record Manual Post</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[#a0a0b0] hover:text-white rounded bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!connectedAccount || isOverLimit || isPdfUnsupported || isInstagramMissingMedia || isPublishing || isRecordingManual}
              onClick={handleConfirmPublish}
              className={`btn-primary-glow flex items-center gap-2 px-6 py-2.5 rounded-md text-xs font-mono font-medium tracking-wide border transition-all ${
                !connectedAccount || isOverLimit || isPdfUnsupported || isInstagramMissingMedia || isPublishing || isRecordingManual
                  ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-[#7a7a8a]'
                  : 'bg-gradient-to-r from-[rgba(166,139,255,0.35)] to-[rgba(156,236,255,0.22)] hover:from-[rgba(166,139,255,0.5)] hover:to-[rgba(156,236,255,0.35)] text-white border-[rgba(166,139,255,0.7)] shadow-[0_0_20px_rgba(166,139,255,0.25)] cursor-pointer'
              }`}
            >
              {isPublishing ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : (
                <Share2 size={14} className="text-[#c9beff]" />
              )}
              <span>{isPublishing ? 'PUBLISHING TO API...' : 'CONFIRM & PUBLISH NOW ↗'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
