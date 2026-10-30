import React, { useState, useEffect, useRef } from 'react';
import { Platform, Role, TextReviewResult, ImageReviewResult, PostRecord, AITaskRecord, GovernanceIssue, ResolvedIssue } from '../../types';
import { apiClient } from '../../services/api';
import { getOrganizationConfig } from '../../config/organizations';
import { SimplifiedGovernanceCard } from '../governance/SimplifiedGovernanceCard';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Film,
  FileText,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Wand2,
  Loader2,
  Check,
  Building2,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface NewPostProps {
  organizationId?: string;
  companyName?: string;
  companyCategory?: string;
  authorUsername: string;
  role: Role;
  onPostSaved: (post: PostRecord) => void;
  onCancel: () => void;
}

export const NewPost: React.FC<NewPostProps> = ({
  organizationId = 'org-nova-unlimited',
  companyName,
  companyCategory,
  authorUsername,
  role,
  onPostSaved,
  onCancel,
}) => {
  // Post content state
  const [platform, setPlatform] = useState<Platform>('LinkedIn');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');

  // Media state
  const [mediaFile, setMediaFile] = useState<{
    mediaRef: string;
    mediaType: 'image' | 'video' | 'pdf';
    mediaOriginalName: string;
    mediaSize: number;
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  // Review states
  const [textReview, setTextReview] = useState<TextReviewResult | null>(null);
  const [imageReview, setImageReview] = useState<ImageReviewResult | null>(null);

  // Autosave status: 'idle' | 'saving' | 'saved' | 'failed'
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Active persistent AI Tasks
  const [activeTextTask, setActiveTextTask] = useState<AITaskRecord | null>(null);
  const [activeImageReviewTask, setActiveImageReviewTask] = useState<AITaskRecord | null>(null);
  const [activeImageGenTask, setActiveImageGenTask] = useState<AITaskRecord | null>(null);

  // AI enhancement tracker (applied AI suggestion or AI-generated image)
  const [isEnhanced, setIsEnhanced] = useState(false);

  // Resolved findings tracker for session
  const [resolvedIssues, setResolvedIssues] = useState<ResolvedIssue[]>([]);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isCheckingText, setIsCheckingText] = useState(false);
  const [isRecheckingText, setIsRecheckingText] = useState(false);

  // Save as pending state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);
  const mediaSectionRef = useRef<HTMLDivElement>(null);

  // Smooth auto-scroll when media upload error appears
  useEffect(() => {
    if (mediaUploadError) {
      mediaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [mediaUploadError]);

  // Platform limits & descriptions
  const platformRules: Record<Platform, { maxChars: number; allowedMedia: string[]; desc: string }> = {
    LinkedIn: {
      maxChars: 3000,
      allowedMedia: ['Images', 'Videos', 'PDF Documents'],
      desc: 'Professional networks, thought leadership & announcements',
    },
    Instagram: {
      maxChars: 2200,
      allowedMedia: ['Images', 'Videos'],
      desc: 'Visual storytelling & engaging creative updates',
    },
    X: {
      maxChars: 280,
      allowedMedia: ['Images', 'Videos'],
      desc: 'Concise, high-velocity community & brand updates',
    },
  };

  // 1. Restore saved draft on mount
  useEffect(() => {
    async function restoreDraftAndTasks() {
      try {
        const draft = await apiClient.fetchDraft(authorUsername);
        if (draft && draft.title) {
          setTitle(draft.title);
          setCaption(draft.caption || '');
          setPlatform(draft.platform || 'LinkedIn');
          if (draft.mediaRef) {
            setMediaFile({
              mediaRef: draft.mediaRef,
              mediaType: draft.mediaType || 'image',
              mediaOriginalName: draft.mediaOriginalName || 'Saved Asset',
              mediaSize: draft.mediaSize || 0
            });
          }
          if (draft.textReviewResult) setTextReview(draft.textReviewResult);
          if (draft.imageReviewResult) setImageReview(draft.imageReviewResult);
        }

        // Restore any active tasks for this author
        const tasks = await apiClient.fetchTasks(authorUsername);
        for (const t of tasks) {
          if (['QUEUED', 'PROCESSING'].includes(t.status)) {
            if (t.taskType === 'text_review') setActiveTextTask(t);
            else if (t.taskType === 'image_review') setActiveImageReviewTask(t);
            else if (t.taskType === 'image_generation') setActiveImageGenTask(t);
          }
        }
      } catch (err) {
        console.error('Failed to restore draft/tasks:', err);
      } finally {
        isInitialLoadRef.current = false;
      }
    }

    restoreDraftAndTasks();
  }, [authorUsername]);

  // 2. Debounced Autosave (1000ms after user types)
  const triggerAutosave = (newTitle: string, newCaption: string, newPlatform: Platform, newMedia: any, newTextRev: any, newImgRev: any) => {
    if (isInitialLoadRef.current) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    setAutosaveStatus('saving');

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiClient.saveDraft({
          authorUsername,
          authorRole: role,
          platform: newPlatform,
          title: newTitle,
          caption: newCaption,
          mediaRef: newMedia?.mediaRef || null,
          mediaType: newMedia?.mediaType || null,
          mediaOriginalName: newMedia?.mediaOriginalName || null,
          mediaSize: newMedia?.mediaSize || null,
          textReviewResult: newTextRev || null,
          imageReviewResult: newImgRev || null,
          organizationId,
          updatedAt: new Date().toISOString()
        });
        setAutosaveStatus('saved');
      } catch (err) {
        setAutosaveStatus('failed');
      }
    }, 900);
  };

  // 3. Polling active background AI tasks
  useEffect(() => {
    const hasActiveTask =
      Boolean(activeTextTask && ['QUEUED', 'PROCESSING'].includes(activeTextTask.status)) ||
      Boolean(activeImageReviewTask && ['QUEUED', 'PROCESSING'].includes(activeImageReviewTask.status)) ||
      Boolean(activeImageGenTask && ['QUEUED', 'PROCESSING'].includes(activeImageGenTask.status));

    if (!hasActiveTask) return;

    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        if (activeTextTask && ['QUEUED', 'PROCESSING'].includes(activeTextTask.status)) {
          const updated = await apiClient.fetchTask(activeTextTask.id);
          setActiveTextTask(updated);
          if (updated.status === 'NEEDS_REVIEW' || updated.status === 'READY_FOR_POST' || updated.status === 'COMPLETED') {
            if (updated.outputPayload?.textReview) {
              setTextReview(updated.outputPayload.textReview);
            }
          }
        }

        if (activeImageReviewTask && ['QUEUED', 'PROCESSING'].includes(activeImageReviewTask.status)) {
          const updated = await apiClient.fetchTask(activeImageReviewTask.id);
          setActiveImageReviewTask(updated);
          if (updated.status === 'NEEDS_REVIEW' || updated.status === 'READY_FOR_POST' || updated.status === 'COMPLETED') {
            if (updated.outputPayload?.imageReview) {
              setImageReview(updated.outputPayload.imageReview);
            }
          }
        }

        if (activeImageGenTask && ['QUEUED', 'PROCESSING'].includes(activeImageGenTask.status)) {
          const updated = await apiClient.fetchTask(activeImageGenTask.id);
          setActiveImageGenTask(updated);
          if (updated.outputPayload?.mediaRef) {
            setMediaFile({
              mediaRef: updated.outputPayload.mediaRef,
              mediaType: 'image',
              mediaOriginalName: 'ai-generated-visual.png',
              mediaSize: 1024 * 512
            });
            setImageReview(null);
            setIsEnhanced(true);
          }
        }
      } catch (err) {
        // network glitch while polling, will retry next tick
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [activeTextTask, activeImageReviewTask, activeImageGenTask]);

  // AI Text Check via Direct Fast Execution & Background Audit Queue
  const handleCheckText = async () => {
    if (!title.trim() || !caption.trim()) {
      return;
    }

    setIsCheckingText(true);
    setSaveError(null);

    // 1. Autosave immediately before check
    try {
      await apiClient.saveDraft({
        authorUsername,
        authorRole: role,
        platform,
        title,
        caption,
        mediaRef: mediaFile?.mediaRef || null,
        mediaType: mediaFile?.mediaType || null,
        mediaOriginalName: mediaFile?.mediaOriginalName || null,
        mediaSize: mediaFile?.mediaSize || null,
        textReviewResult: textReview ? { ...textReview, isStale: true } : null,
        imageReviewResult: imageReview,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}

    // 2. Queue background task for asynchronous audit history
    apiClient.startTask({
      taskType: 'text_review',
      authorUsername,
      authorRole: role,
      platform,
      title,
      caption,
      organizationId
    }).then(res => {
      if (res?.task) setActiveTextTask(res.task);
    }).catch(err => {
      console.warn('Background task audit log notice:', err);
    });

    // 3. Fast direct check for instant UI response
    try {
      const res = await apiClient.checkText({
        title,
        caption,
        platform,
        role,
        organizationId
      });

      if (res.success && res.data) {
        setTextReview(res.data);
        // Persist draft with review result
        await apiClient.saveDraft({
          authorUsername,
          authorRole: role,
          platform,
          title,
          caption,
          mediaRef: mediaFile?.mediaRef || null,
          mediaType: mediaFile?.mediaType || null,
          mediaOriginalName: mediaFile?.mediaOriginalName || null,
          mediaSize: mediaFile?.mediaSize || null,
          textReviewResult: res.data,
          imageReviewResult: imageReview,
          organizationId,
          updatedAt: new Date().toISOString()
        });
      } else {
        setSaveError(res.error || 'Failed to complete AI governance check.');
      }
    } catch (err: any) {
      console.error('Failed to run text review:', err);
      setSaveError(err.message || 'Governance check failed. Please try again.');
    } finally {
      setIsCheckingText(false);
    }
  };

  // End-to-End Apply Fix pipeline: applies suggested title & caption, persists draft, and verifies clean state
  const handleApplyFix = async (issue?: GovernanceIssue, fixText?: string) => {
    setIsApplyingFix(true);
    setSaveError(null);
    try {
      let updatedTitle = title;
      let updatedCaption = caption;

      // 1. Apply suggested title if available
      if (textReview?.suggestedTitle && textReview.suggestedTitle.trim()) {
        updatedTitle = textReview.suggestedTitle.trim();
      }

      // 2. Apply suggested caption if available
      if (textReview?.suggestedCaption && textReview.suggestedCaption.trim()) {
        updatedCaption = textReview.suggestedCaption.trim();
      } else if (fixText && !fixText.toLowerCase().includes('consult') && !fixText.toLowerCase().includes('obtain')) {
        // Fallback adjustments
        if (issue?.code === 'UNSUPPORTED_CLAIM' || issue?.code === 'POTENTIALLY_MISLEADING') {
          updatedCaption = caption.replace(/100%\s*uptime/gi, '99.9% uptime SLA');
        }
      }

      // 3. Update React input state immediately so the user sees the changes in the form fields!
      setTitle(updatedTitle);
      setCaption(updatedCaption);
      setIsEnhanced(true);

      // 4. Invalidate existing review while rechecking
      setTextReview((prev) => (prev ? { ...prev, isStale: true } : null));

      // 5. Persist draft to server with new content
      await apiClient.saveDraft({
        authorUsername,
        authorRole: role,
        platform,
        title: updatedTitle,
        caption: updatedCaption,
        mediaRef: mediaFile?.mediaRef || null,
        mediaType: mediaFile?.mediaType || null,
        mediaOriginalName: mediaFile?.mediaOriginalName || null,
        mediaSize: mediaFile?.mediaSize || null,
        textReviewResult: null,
        imageReviewResult: imageReview,
        updatedAt: new Date().toISOString()
      });

      // 6. Run fresh governance review on the updated content
      const freshCheck = await apiClient.checkText({
        title: updatedTitle,
        caption: updatedCaption,
        platform,
        role,
        organizationId
      });

      if (freshCheck.success && freshCheck.data) {
        const freshReview = freshCheck.data;
        setTextReview(freshReview);

        // 7. Record resolution in resolved findings history
        const previousIssues = textReview?.structuredIssues || [];
        const newlyResolved: ResolvedIssue[] = previousIssues
          .filter(prevIssue => !(freshReview.structuredIssues || []).some(fi => fi.code === prevIssue.code))
          .map(iss => ({
            id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: iss.code === 'UNSUPPORTED_CLAIM' ? 'Unverified Claim Corrected' : `${iss.code.replace(/_/g, ' ')} Resolved`,
            originalMessage: iss.message,
            fixApplied: fixText || textReview?.suggestion || 'Applied suggested title and caption revision',
            resolvedAt: new Date().toISOString()
          }));

        if (newlyResolved.length > 0) {
          setResolvedIssues((prev) => [...newlyResolved, ...prev]);
        }

        // 8. Persist fresh review to draft
        await apiClient.saveDraft({
          authorUsername,
          authorRole: role,
          platform,
          title: updatedTitle,
          caption: updatedCaption,
          mediaRef: mediaFile?.mediaRef || null,
          mediaType: mediaFile?.mediaType || null,
          mediaOriginalName: mediaFile?.mediaOriginalName || null,
          mediaSize: mediaFile?.mediaSize || null,
          textReviewResult: freshReview,
          imageReviewResult: imageReview,
          organizationId,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Failed to apply fix and recheck content:', err);
      setSaveError(err.message || 'Failed to apply suggested fix.');
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Recheck Content on-demand
  const handleRecheckContent = async () => {
    if (!title.trim() || !caption.trim()) return;
    setIsRecheckingText(true);
    try {
      const res = await apiClient.checkText({
        title: title.trim(),
        caption: caption.trim(),
        platform,
        role,
        organizationId
      });
      if (res.success && res.data) {
        setTextReview(res.data);
        triggerAutosave(title, caption, platform, mediaFile, res.data, imageReview);
      }
    } catch (err) {
      console.error('Failed to recheck content:', err);
    } finally {
      setIsRecheckingText(false);
    }
  };

  // File upload handling
  const handleFileUpload = async (file: File) => {
    setMediaUploadError(null);

    const maxMb = 25;
    if (file.size > maxMb * 1024 * 1024) {
      setMediaUploadError(`File exceeds maximum size of ${maxMb}MB.`);
      return;
    }

    const isPdf = file.type === 'application/pdf';
    if ((platform === 'Instagram' || platform === 'X') && isPdf) {
      setMediaUploadError(`${platform} does not support PDF documents. Please upload an image or video.`);
      return;
    }

    setUploadingMedia(true);
    try {
      const res = await apiClient.uploadMedia(file);
      setMediaFile(res);
      setImageReview(null);
      triggerAutosave(title, caption, platform, res, textReview, null);
    } catch (err: any) {
      setMediaUploadError(err.message || 'Failed to upload media file.');
    } finally {
      setUploadingMedia(false);
    }
  };

  // AI Image Check via Background Task
  const handleCheckImage = async () => {
    if (!mediaFile || mediaFile.mediaType !== 'image') return;

    try {
      await apiClient.saveDraft({
        authorUsername,
        authorRole: role,
        platform,
        title,
        caption,
        mediaRef: mediaFile.mediaRef,
        mediaType: mediaFile.mediaType,
        mediaOriginalName: mediaFile.mediaOriginalName,
        mediaSize: mediaFile.mediaSize,
        textReviewResult: textReview,
        imageReviewResult: imageReview,
        updatedAt: new Date().toISOString()
      });

      const res = await apiClient.startTask({
        taskType: 'image_review',
        authorUsername,
        authorRole: role,
        platform,
        title,
        caption,
        mediaRef: mediaFile.mediaRef,
        organizationId
      });
      setActiveImageReviewTask(res.task);
    } catch (err) {
      console.error('Failed to queue image review task:', err);
    }
  };

  // AI Image Generation via Background Task
  const handleGenerateImage = async () => {
    if (!title.trim() || !caption.trim()) return;

    try {
      await apiClient.saveDraft({
        authorUsername,
        authorRole: role,
        platform,
        title,
        caption,
        mediaRef: mediaFile?.mediaRef || null,
        mediaType: mediaFile?.mediaType || null,
        mediaOriginalName: mediaFile?.mediaOriginalName || null,
        mediaSize: mediaFile?.mediaSize || null,
        textReviewResult: textReview,
        imageReviewResult: imageReview,
        updatedAt: new Date().toISOString()
      });

      const res = await apiClient.startTask({
        taskType: 'image_generation',
        authorUsername,
        authorRole: role,
        platform,
        title,
        caption,
        organizationId
      });
      setActiveImageGenTask(res.task);
    } catch (err) {
      console.error('Failed to queue image generation task:', err);
    }
  };

  // Save as Pending with moving redirection to validation errors
  const handleSaveAsPending = async () => {
    setSaveError(null);

    if (!title.trim()) {
      setSaveError('Post title is required. Please enter a title for your post.');
      setTimeout(() => {
        titleInputRef.current?.focus();
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    if (!caption.trim()) {
      setSaveError('Post caption / details are required. Please enter your post messaging.');
      setTimeout(() => {
        captionInputRef.current?.focus();
        errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setIsSaving(true);

    try {
      const textBlockingOrWarning = (textReview?.structuredIssues || []).filter(
        i => i.severity === 'blocking' || i.severity === 'warning'
      ).length;
      const totalIssues = textBlockingOrWarning + (imageReview?.issues?.length || 0);
      const hasBlocking = (textReview?.structuredIssues || []).some(i => i.severity === 'blocking');
      const isApproved = textReview?.overallVerdict === 'approved' &&
        textReview?.verdict === 'looks_good' &&
        !textReview.isStale &&
        !hasBlocking &&
        textReview.companyRelevance?.status === 'pass' &&
        textReview.roleScope?.status === 'pass' &&
        textReview.contentQuality?.status === 'pass' &&
        totalIssues === 0;
      const statusToSave = isApproved ? 'ready_to_post' : 'pending_review';

      const newPost = await apiClient.createPost({
        organizationId: organizationId || 'org-nova-unlimited',
        authorUsername,
        authorRole: role,
        platform,
        title: title.trim(),
        caption: caption.trim(),
        status: statusToSave,
        isEnhanced: isEnhanced || Boolean(mediaFile?.mediaOriginalName?.includes('ai-generated')),
        mediaRef: mediaFile?.mediaRef || null,
        mediaType: mediaFile?.mediaType || null,
        mediaOriginalName: mediaFile?.mediaOriginalName || null,
        mediaSize: mediaFile?.mediaSize || null,
        textReviewResult: textReview,
        imageReviewResult: imageReview,
        unresolvedIssuesCount: totalIssues,
      });

      // Clear draft on successful save
      await apiClient.clearDraft(authorUsername);

      onPostSaved(newPost);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save post to persistent database.');
    } finally {
      setIsSaving(false);
    }
  };

  const isTextProcessing = isCheckingText || Boolean(activeTextTask && ['QUEUED', 'PROCESSING'].includes(activeTextTask.status));
  const isImageReviewProcessing = Boolean(activeImageReviewTask && ['QUEUED', 'PROCESSING'].includes(activeImageReviewTask.status));
  const isImageGenProcessing = Boolean(activeImageGenTask && ['QUEUED', 'PROCESSING'].includes(activeImageGenTask.status));

  const org = getOrganizationConfig(organizationId);
  const displayCompName = (companyName || org.name).toUpperCase();
  const displayIndustry = companyCategory || org.industry;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 page-enter">
      {/* Top Banner with Autosave Status and Organization Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.025] border border-white/10 rounded-xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(166,139,255,0.15)] text-[#c9beff] border border-[rgba(166,139,255,0.3)] font-medium">
              {displayCompName}
            </span>
            <span className="text-xs font-mono text-[#828392]">· {displayIndustry}</span>
          </div>
          <h2 className="text-base sm:text-lg font-medium text-white tracking-tight uppercase font-mono">
            Create Governed Content
          </h2>
          <p className="text-xs sm:text-[13px] text-[#9a9aa8]">
            Author: <span className="text-[#a68bff] font-mono font-medium">@{authorUsername}</span> · Scope: <span className="text-[#c9beff] font-mono font-medium">{role}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded bg-black/40 border border-white/10">
            {autosaveStatus === 'saving' && (
              <>
                <Loader2 size={12} className="animate-spin text-[#9cecff]" />
                <span className="text-[#9cecff]">Autosaving...</span>
              </>
            )}
            {autosaveStatus === 'saved' && (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-300">Draft Saved</span>
              </>
            )}
            {autosaveStatus === 'failed' && (
              <>
                <AlertTriangle size={12} className="text-amber-400" />
                <span className="text-amber-300">Autosave Error</span>
              </>
            )}
            {autosaveStatus === 'idle' && (
              <span className="text-[#808090]">Autosave Active</span>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-xs sm:text-[13px] font-mono text-[#9a9aa8] hover:text-white px-3.5 py-1.5 rounded hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {saveError && (
        <div
          ref={errorBannerRef}
          className="p-4 bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 text-xs sm:text-[13px] font-mono rounded-xl flex items-center justify-between gap-3 shadow-lg shadow-rose-950/30 animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle size={17} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">Required Field Alert</span>
              <span>{saveError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-[11px] font-mono px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Platform Selection */}
      <div className="bg-[rgba(12,13,20,0.8)] backdrop-blur-2xl border border-white/10 rounded-xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs sm:text-[13px] font-mono tracking-widest text-[#a0a0b2] uppercase flex items-center gap-2.5 font-medium">
            <span className="text-[#a68bff] text-sm">01</span> SELECT TARGET PLATFORM
          </label>
          <span className="text-xs font-mono text-[#828392]">
            {platformRules[platform].desc}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['LinkedIn', 'Instagram', 'X'] as const).map((plat) => {
            const isSelected = platform === plat;
            return (
              <button
                key={plat}
                type="button"
                onClick={() => {
                  setPlatform(plat);
                  triggerAutosave(title, caption, plat, mediaFile, textReview, imageReview);
                }}
                className={`p-5 rounded-lg border text-left transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[rgba(166,139,255,0.2)] to-[rgba(156,236,255,0.08)] border-[#a68bff] text-white shadow-[0_8px_25px_rgba(166,139,255,0.2)]'
                    : 'bg-white/[0.02] border-white/10 text-[#8e8e9e] hover:border-white/20 hover:text-white'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" />
                )}
                <div className="text-base sm:text-lg font-medium tracking-wide mb-1.5 font-mono text-white">
                  {plat}
                </div>
                <div className="text-xs text-[#828392]">
                  Max length: {platformRules[plat].maxChars} chars
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Content & AI Check */}
      <div className="bg-[rgba(12,13,20,0.8)] backdrop-blur-2xl border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-[13px] font-mono tracking-widest text-[#a0a0b2] uppercase flex items-center gap-2.5 font-medium">
            <span className="text-[#a68bff] text-sm">02</span> POST CONTENT & MESSAGING
          </label>
          <span className="text-xs font-mono text-[#808090]">
            Editable at all times
          </span>
        </div>

        {/* Title Input (15-16px text) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-[13.5px] font-mono text-[#d0d0df] font-medium">
              POST TITLE <span className="text-rose-400">*</span>
            </label>
            <span className="text-xs font-mono text-[#727382]">
              {title.length} characters
            </span>
          </div>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="e.g. BrandLens Precision Optics 2.0 Launch"
            value={title}
            onChange={(e) => {
              const val = e.target.value;
              setTitle(val);
              if (textReview) setTextReview((prev) => (prev ? { ...prev, isStale: true } : null));
              triggerAutosave(val, caption, platform, mediaFile, textReview ? { ...textReview, isStale: true } : null, imageReview);
            }}
            className="w-full px-4 py-3 text-base bg-black/60 border border-white/15 rounded-lg text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#a68bff] focus:ring-1 focus:ring-[#a68bff]/30 transition-all font-sans"
          />
        </div>

        {/* Caption Textarea (15-16px text) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-[13.5px] font-mono text-[#d0d0df] font-medium">
              CAPTION / POST DETAILS <span className="text-rose-400">*</span>
            </label>
            <span className="text-xs font-mono text-[#727382]">
              {caption.length} / {platformRules[platform].maxChars}
            </span>
          </div>
          <textarea
            ref={captionInputRef}
            rows={5}
            placeholder="Write the full post caption, message details, specifications, or announcements..."
            value={caption}
            onChange={(e) => {
              const val = e.target.value;
              setCaption(val);
              if (textReview) setTextReview((prev) => (prev ? { ...prev, isStale: true } : null));
              triggerAutosave(title, val, platform, mediaFile, textReview ? { ...textReview, isStale: true } : null, imageReview);
            }}
            className="w-full px-4 py-3.5 text-base bg-black/60 border border-white/15 rounded-lg text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#a68bff] focus:ring-1 focus:ring-[#a68bff]/30 transition-all leading-relaxed font-sans"
          />
        </div>

        {/* AI CHECK Button & Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <button
            type="button"
            disabled={isTextProcessing || !title.trim() || !caption.trim()}
            onClick={handleCheckText}
            className={`btn-primary-glow flex items-center gap-2.5 px-6 py-3 rounded-md text-xs sm:text-[13px] font-mono tracking-wider transition-all duration-300 border font-medium ${
              isTextProcessing || !title.trim() || !caption.trim()
                ? 'opacity-40 cursor-not-allowed bg-white/[0.02] border-white/10 text-[#7a7a8a]'
                : 'bg-[rgba(166,139,255,0.22)] hover:bg-[rgba(166,139,255,0.35)] border-[rgba(166,139,255,0.6)] text-white shadow-[0_0_20px_rgba(166,139,255,0.25)] cursor-pointer'
            }`}
          >
            {isTextProcessing ? (
              <Loader2 size={16} className="animate-spin text-[#a68bff]" />
            ) : (
              <Sparkles size={16} className="text-[#a68bff]" />
            )}
            <span>{isTextProcessing ? 'REVIEWING YOUR CONTENT...' : 'AI CHECK (TEXT & TITLE)'}</span>
          </button>

          <span className="text-xs font-mono text-[#828392]">
            Assesses messaging against <span className="text-[#c9beff]">{role}</span> standards
          </span>
        </div>

        {/* Live Processing Indicator for Text Review */}
        {isTextProcessing && activeTextTask && (
          <div className="p-4 bg-[rgba(166,139,255,0.06)] border border-[rgba(166,139,255,0.3)] rounded-lg flex items-center gap-3.5 ai-pulse-aura">
            <div className="w-8 h-8 rounded-full bg-[rgba(166,139,255,0.15)] flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#a68bff]" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-medium text-white font-mono">
                {activeTextTask.progressMessage || 'Reviewing your content...'}
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa8]">
                Task ID: {activeTextTask.id} · Runs in background even if page is closed
              </div>
            </div>
          </div>
        )}

        {/* Failed Task Banner */}
        {activeTextTask?.status === 'FAILED' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-[13px] font-mono rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} />
              <span>{activeTextTask.errorMessage || 'Text review operation failed.'}</span>
            </div>
            <button
              type="button"
              onClick={handleCheckText}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Simplified AI Governance Review Result */}
        {textReview && !isTextProcessing && (
          <SimplifiedGovernanceCard
            textReview={textReview}
            role={role}
            platform={platform}
            orgName={org.name}
            isStale={Boolean(textReview.isStale)}
            isRechecking={isRecheckingText}
            onApplyFix={handleApplyFix}
            onRecheck={handleRecheckContent}
            resolvedIssues={resolvedIssues}
            isApplyingFix={isApplyingFix}
          />
        )}
      </div>

      {/* SECTION 3: Media Attachment & Visual AI */}
      <div className="bg-[rgba(12,13,20,0.8)] backdrop-blur-2xl border border-white/10 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs sm:text-[13px] font-mono tracking-widest text-[#a0a0b2] uppercase flex items-center gap-2.5 font-medium">
            <span className="text-[#a68bff] text-sm">03</span> MEDIA ATTACHMENT & AI VISUAL GENERATION
          </label>
          <span className="text-xs font-mono text-[#808090]">
            Max 25MB · {platformRules[platform].allowedMedia.join(', ')}
          </span>
        </div>

        {/* Dropzone or Media Preview */}
        {!mediaFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-white/15 hover:border-[rgba(166,139,255,0.5)] rounded-xl p-10 text-center cursor-pointer transition-all bg-white/[0.015] hover:bg-white/[0.03]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
              accept="image/*,video/*,application/pdf"
            />

            <div className="w-12 h-12 mx-auto mb-3.5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#a68bff]">
              <Upload size={22} />
            </div>

            <p className="text-base text-white font-medium mb-1 font-mono">
              {uploadingMedia ? 'Uploading media...' : 'Drag & drop media or Click to Browse'}
            </p>
            <p className="text-xs text-[#828392]">
              Supports PNG, JPG, WebP, MP4, WebM{platform === 'LinkedIn' ? ', and PDF' : ''}
            </p>
          </div>
        ) : (
          <div className="p-5 bg-white/[0.025] border border-white/15 rounded-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {mediaFile.mediaType === 'image' && <ImageIcon size={22} className="text-[#9cecff]" />}
                {mediaFile.mediaType === 'video' && <Film size={22} className="text-[#a68bff]" />}
                {mediaFile.mediaType === 'pdf' && <FileText size={22} className="text-[#c9beff]" />}
                <div>
                  <div className="text-sm font-mono text-white font-medium">
                    {mediaFile.mediaOriginalName}
                  </div>
                  <div className="text-xs font-mono text-[#828392]">
                    {mediaFile.mediaType.toUpperCase()} · {(mediaFile.mediaSize / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-mono text-[#a0a0b0] hover:text-white bg-white/5 rounded-md border border-white/10"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaFile(null);
                    setImageReview(null);
                    triggerAutosave(title, caption, platform, null, textReview, null);
                  }}
                  className="p-1.5 text-[#ffb6bd] hover:text-white rounded"
                  title="Remove media"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Visual Preview */}
            {mediaFile.mediaType === 'image' && (
              <div className="rounded-lg overflow-hidden max-h-72 border border-white/10 bg-black/60 flex items-center justify-center p-2">
                <img
                  src={mediaFile.mediaRef}
                  alt="Post visual"
                  className="max-h-72 w-auto object-contain rounded"
                />
              </div>
            )}

            {/* AI CHECK IMAGE Action */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/5">
              <button
                type="button"
                disabled={isImageReviewProcessing || mediaFile.mediaType !== 'image'}
                onClick={handleCheckImage}
                className={`btn-primary-glow flex items-center gap-2.5 px-5 py-2.5 rounded-md text-xs sm:text-[13px] font-mono tracking-wider border transition-all font-medium ${
                  mediaFile.mediaType !== 'image'
                    ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-[#727382]'
                    : isImageReviewProcessing
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-[rgba(156,236,255,0.18)] hover:bg-[rgba(156,236,255,0.3)] border-[rgba(156,236,255,0.5)] text-white shadow-[0_0_15px_rgba(156,236,255,0.2)] cursor-pointer'
                }`}
              >
                {isImageReviewProcessing ? (
                  <Loader2 size={15} className="animate-spin text-[#9cecff]" />
                ) : (
                  <Sparkles size={15} className="text-[#9cecff]" />
                )}
                <span>{isImageReviewProcessing ? 'CHECKING IMAGE SUITABILITY...' : 'AI CHECK IMAGE'}</span>
              </button>

              {mediaFile.mediaType !== 'image' && (
                <span className="text-xs font-mono text-[#828392]">
                  Image review currently supports images only
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live Processing Indicator for Image Review */}
        {isImageReviewProcessing && activeImageReviewTask && (
          <div className="p-4 bg-[rgba(156,236,255,0.06)] border border-[rgba(156,236,255,0.3)] rounded-lg flex items-center gap-3.5 ai-pulse-aura">
            <Loader2 size={16} className="animate-spin text-[#9cecff]" />
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-medium text-white font-mono">
                {activeImageReviewTask.progressMessage || 'Checking image suitability...'}
              </div>
              <div className="text-[11px] font-mono text-[#9a9aa8]">
                Task ID: {activeImageReviewTask.id} · Persisted on server
              </div>
            </div>
          </div>
        )}

        {/* Image Review Result */}
        {imageReview && !isImageReviewProcessing && (
          <div className="p-6 bg-[rgba(156,236,255,0.05)] border border-[rgba(156,236,255,0.3)] rounded-xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-medium text-white flex items-center gap-2">
                <Sparkles size={16} className="text-[#9cecff]" /> Image Analysis Result
              </span>
              <span className="text-xs font-mono px-3 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium">
                {imageReview.verdict.toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-[#d0d0df] leading-relaxed">
              {imageReview.briefAnalysis}
            </p>
            {imageReview.suggestion && (
              <p className="text-xs sm:text-[13px] text-[#9cecff] bg-black/40 p-3 rounded-lg border border-white/5">
                Suggestion: {imageReview.suggestion}
              </p>
            )}
          </div>
        )}

        {mediaUploadError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-[13px] font-mono rounded-lg">
            {mediaUploadError}
          </div>
        )}

        {/* GENERATE IMAGE Action (2-step persistent pipeline) */}
        <div className="pt-5 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm sm:text-base font-mono text-white flex items-center gap-2 font-medium">
                <Wand2 size={16} className="text-[#a68bff]" />
                AI VISUAL SYNTHESIS
              </div>
              <div className="text-xs sm:text-[13px] text-[#8e8e9e]">
                Generates a visual asset via background task. You can close or refresh the page at any time.
              </div>
            </div>

            <button
              type="button"
              disabled={isImageGenProcessing || !title.trim() || !caption.trim()}
              onClick={handleGenerateImage}
              className={`btn-primary-glow flex items-center gap-2.5 px-6 py-3 rounded-md text-xs sm:text-[13px] font-mono tracking-wider border transition-all font-medium cursor-pointer ${
                isImageGenProcessing || !title.trim() || !caption.trim()
                  ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/10 text-[#7a7a8a]'
                  : 'bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.4)] border-[rgba(166,139,255,0.6)] text-white shadow-[0_0_20px_rgba(166,139,255,0.25)]'
              }`}
            >
              {isImageGenProcessing ? (
                <Loader2 size={16} className="animate-spin text-[#a68bff]" />
              ) : (
                <Wand2 size={16} className="text-[#a68bff]" />
              )}
              <span>{isImageGenProcessing ? 'GENERATING VISUAL...' : 'GENERATE IMAGE ↗'}</span>
            </button>
          </div>

          {/* Calm Animated Visual Synthesis State (Part 2 & Part 3) */}
          {isImageGenProcessing && activeImageGenTask && (
            <div className="p-6 bg-gradient-to-r from-[rgba(166,139,255,0.1)] to-[rgba(156,236,255,0.06)] border border-[rgba(166,139,255,0.35)] rounded-xl space-y-3 ai-pulse-aura">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[rgba(166,139,255,0.2)] border border-[rgba(166,139,255,0.4)] flex items-center justify-center">
                  <Wand2 size={18} className="animate-pulse text-[#c7bbff]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-medium text-white font-mono">
                    Creative Synthesis In Progress
                  </h4>
                  <p className="text-xs font-mono text-[#a0a0b2]">
                    {activeImageGenTask.progressMessage || 'Synthesizing visual asset from prompt...'}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-[11px] font-mono text-[#8a8a9a]">
                Task ID: {activeImageGenTask.id} · Safe to navigate away or refresh. Output will automatically attach to draft.
              </div>
            </div>
          )}

          {activeImageGenTask?.status === 'FAILED' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-[13px] font-mono rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} />
                <span>{activeImageGenTask.errorMessage || 'Image generation failed.'}</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateImage}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Save as Pending & Cancel Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:p-8 bg-[rgba(15,16,24,0.9)] backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl">
        <div className="space-y-1">
          <div className="text-xs sm:text-[13px] font-mono text-white font-medium flex items-center gap-2">
            <span>Store post in workspace database</span>
            {textReview?.overallVerdict === 'approved' &&
            !textReview.isStale &&
            textReview.companyRelevance?.status === 'pass' &&
            textReview.roleScope?.status === 'pass' &&
            textReview.contentQuality?.status === 'pass' &&
            (textReview.structuredIssues?.length || 0) === 0 ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Ready to Post
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pending for Review
              </span>
            )}
          </div>
          <div className="text-xs text-[#8e8e9e]">
            Posts are securely stored in the database. When approved, content transitions directly to Ready to Post.
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-xs sm:text-[13px] font-mono text-[#a0a0b0] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors cursor-pointer"
          >
            CANCEL
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAsPending}
            className="btn-primary-glow flex items-center gap-2.5 px-8 py-3 text-xs sm:text-[13px] font-mono tracking-widest bg-gradient-to-r from-[rgba(166,139,255,0.35)] to-[rgba(156,236,255,0.22)] hover:from-[rgba(166,139,255,0.5)] hover:to-[rgba(156,236,255,0.35)] text-white border border-[rgba(166,139,255,0.7)] rounded-md shadow-[0_0_25px_rgba(166,139,255,0.3)] transition-all font-medium cursor-pointer"
          >
            {isSaving && <Loader2 size={16} className="animate-spin text-white" />}
            <span>{isSaving ? 'SAVING...' : 'SAVE POST ↗'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
