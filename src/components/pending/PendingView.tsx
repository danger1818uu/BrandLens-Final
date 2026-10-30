import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PostRecord, PostActivity, AITaskRecord } from '../../types';
import { PostDetailModal } from '../dashboard/PostDetailModal';
import { ExpandablePostCard } from '../common/ExpandablePostCard';
import { apiClient } from '../../services/api';
import {
  AlertCircle,
  Clock,
  CheckCheck,
  Share2,
  RefreshCw,
  Plus,
  Loader2,
  Layers,
  Sparkles,
  FileEdit
} from 'lucide-react';

interface PendingViewProps {
  posts: PostRecord[];
  username: string;
  onPostUpdated: (updatedPost: PostRecord) => void;
  onCreateNew: () => void;
  onEditDraft?: () => void;
}

type PendingTab = 'pending_review' | 'ready_to_post' | 'done_posted';

export const PendingView: React.FC<PendingViewProps> = ({
  posts,
  username,
  onPostUpdated,
  onCreateNew,
  onEditDraft,
}) => {
  const [activeTab, setActiveTab] = useState<PendingTab>('pending_review');
  const [tasks, setTasks] = useState<AITaskRecord[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [activities, setActivities] = useState<PostActivity[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Fetch user background AI tasks
  const loadTasks = async (isManual = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      if (isManual) setLoadingTasks(true);
      const userTasks = await apiClient.fetchTasks(username);
      setTasks((prev) => {
        if (
          prev.length === userTasks.length &&
          prev.every(
            (t, i) =>
              t.id === userTasks[i]?.id &&
              t.status === userTasks[i]?.status &&
              t.progressMessage === userTasks[i]?.progressMessage
          )
        ) {
          return prev;
        }
        return userTasks;
      });
    } catch (err) {
      console.error('Failed to load pending tasks:', err);
    } finally {
      if (isManual) setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks(true);
    const interval = setInterval(() => loadTasks(false), 5000);
    return () => clearInterval(interval);
  }, [username]);

  const handleRetryTask = async (taskId: string) => {
    try {
      await apiClient.retryTask(taskId);
      await loadTasks(true);
    } catch (err) {
      console.error('Failed to retry task:', err);
    }
  };

  // Canonical post categories (memoized for lag-free re-renders)
  const pendingReviewPosts = useMemo(
    () => posts.filter((p) => p.status === 'pending_review'),
    [posts]
  );
  const readyToPostPosts = useMemo(
    () => posts.filter((p) => p.status === 'ready_to_post'),
    [posts]
  );
  const donePostedPosts = useMemo(
    () => posts.filter((p) => p.status === 'posted'),
    [posts]
  );

  // Background active / interrupted AI tasks (kept distinctly separate from post lifecycle)
  const activeTasks = useMemo(
    () => tasks.filter((t) => ['QUEUED', 'PROCESSING'].includes(t.status)),
    [tasks]
  );
  const interruptedTasks = useMemo(
    () => tasks.filter((t) => ['INTERRUPTED', 'PENDING_WORK'].includes(t.status)),
    [tasks]
  );

  const handleEditModal = useCallback(async (post: PostRecord) => {
    setSelectedPost(post);
    try {
      const acts = await apiClient.fetchActivities(post.id);
      setActivities(acts);
    } catch (e) {
      setActivities([]);
    }
  }, []);

  const handleSaveModal = useCallback(async (updated: { title: string; caption: string }) => {
    if (!selectedPost) return;
    const res = await apiClient.updatePost(
      selectedPost.id,
      {
        title: updated.title,
        caption: updated.caption,
        textReviewResult: selectedPost.textReviewResult
          ? { ...selectedPost.textReviewResult, isStale: true }
          : null,
      },
      username
    );
    setSelectedPost(res);
    onPostUpdated(res);
  }, [selectedPost, username, onPostUpdated]);

  return (
    <div className="space-y-8 page-enter">
      {/* Workspace Header */}
      <div className="p-6 sm:p-7 bg-gradient-to-r from-[rgba(166,139,255,0.09)] to-[rgba(156,236,255,0.03)] border border-white/10 rounded-xl backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-white font-mono flex items-center gap-3">
            <AlertCircle size={22} className="text-[#9cecff]" />
            <span>POST LIFECYCLE & PENDING WORKSPACE</span>
          </h2>
          <p className="text-xs sm:text-[13.5px] text-[#9a9aa8] max-w-2xl leading-relaxed">
            Manage your drafts across three canonical states: Pending for Review, Ready to Post, and Done / Posted. Background AI tasks run persistently without interfering with post states.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            type="button"
            onClick={() => loadTasks(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono text-[#a0a0b0] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loadingTasks ? 'animate-spin' : ''} />
            <span>Refresh Tasks</span>
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="btn-primary-glow flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.35)] text-white border border-[rgba(166,139,255,0.5)] rounded-md transition-colors cursor-pointer font-medium"
          >
            <Plus size={14} />
            <span>NEW POST</span>
          </button>
        </div>
      </div>

      {/* Persistent AI Background Tasks Banner (Surfaced clearly without conflating task status with post status) */}
      {(activeTasks.length > 0 || interruptedTasks.length > 0) && (
        <div className="p-5 rounded-xl bg-[rgba(18,20,32,0.85)] border border-[rgba(156,236,255,0.25)] space-y-3.5 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-mono text-[#9cecff] font-medium">
              <Loader2 size={14} className="animate-spin" />
              <span>PERSISTENT AI BACKGROUND ENGINE · {activeTasks.length} RUNNING, {interruptedTasks.length} INTERRUPTED</span>
            </div>
            {onEditDraft && (
              <button
                type="button"
                onClick={onEditDraft}
                className="text-xs font-mono text-[#c7bbff] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileEdit size={12} />
                <span>Resume in Editor</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-lg bg-black/40 border border-[rgba(156,236,255,0.2)] flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span className="px-2 py-0.5 rounded bg-[rgba(156,236,255,0.15)] text-[#9cecff]">
                      {task.taskType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="truncate max-w-[180px]">{task.inputPayload.title}</span>
                  </div>
                  <div className="text-[#8e8ea0] text-[11px]">{task.progressMessage}</div>
                </div>
                <div className="flex items-center gap-1.5 text-[#9cecff]">
                  <Loader2 size={13} className="animate-spin" />
                  <span>{task.status}</span>
                </div>
              </div>
            ))}

            {interruptedTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-200 font-medium">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      INTERRUPTED
                    </span>
                    <span className="truncate max-w-[180px] text-white">{task.inputPayload.title}</span>
                  </div>
                  <div className="text-amber-300/80 text-[11px]">{task.progressMessage}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRetryTask(task.id)}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded transition-colors cursor-pointer"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 Canonical Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-3 font-mono text-xs sm:text-[13px]">
        {/* Tab 1: PENDING FOR REVIEW */}
        <button
          type="button"
          onClick={() => setActiveTab('pending_review')}
          className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium ${
            activeTab === 'pending_review'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35 shadow-md'
              : 'text-[#828392] hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Clock size={14} />
          <span>PENDING FOR REVIEW</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-black/50 text-amber-300 border border-amber-500/25">
            {pendingReviewPosts.length}
          </span>
        </button>

        {/* Tab 2: READY TO POST */}
        <button
          type="button"
          onClick={() => setActiveTab('ready_to_post')}
          className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium ${
            activeTab === 'ready_to_post'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-md'
              : 'text-[#828392] hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <CheckCheck size={14} />
          <span>READY TO POST</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-black/50 text-emerald-300 border border-emerald-500/25">
            {readyToPostPosts.length}
          </span>
        </button>

        {/* Tab 3: DONE / POSTED */}
        <button
          type="button"
          onClick={() => setActiveTab('done_posted')}
          className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium ${
            activeTab === 'done_posted'
              ? 'bg-[rgba(166,139,255,0.2)] text-[#c7bbff] border border-[rgba(166,139,255,0.4)] shadow-md'
              : 'text-[#828392] hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Share2 size={14} />
          <span>DONE / POSTED</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-black/50 text-[#c7bbff] border border-[rgba(166,139,255,0.25)]">
            {donePostedPosts.length}
          </span>
        </button>
      </div>

      {/* Section Content Area */}
      <div className="space-y-4">
        {/* TAB 1: PENDING FOR REVIEW */}
        {activeTab === 'pending_review' && (
          <div className="space-y-4">
            {pendingReviewPosts.length === 0 ? (
              <div className="py-20 px-6 text-center bg-[rgba(12,13,20,0.6)] border border-white/10 rounded-xl font-mono">
                <Clock size={28} className="mx-auto mb-3 text-amber-400/60" />
                <h4 className="text-base font-medium text-white mb-1">No Posts Pending for Review</h4>
                <p className="text-xs sm:text-sm text-[#828392] max-w-md mx-auto mb-5">
                  All authored drafts have either passed validation and moved to Ready to Post, or been published.
                </p>
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="px-4 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-md transition-colors"
                >
                  + Create New Draft
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReviewPosts.map((post) => (
                  <ExpandablePostCard
                    key={post.id}
                    post={post}
                    actorUsername={username}
                    onPostUpdated={onPostUpdated}
                    onEditPost={handleEditModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: READY TO POST */}
        {activeTab === 'ready_to_post' && (
          <div className="space-y-4">
            {readyToPostPosts.length === 0 ? (
              <div className="py-20 px-6 text-center bg-[rgba(12,13,20,0.6)] border border-white/10 rounded-xl font-mono">
                <CheckCheck size={28} className="mx-auto mb-3 text-emerald-400/60" />
                <h4 className="text-base font-medium text-white mb-1">No Posts Ready to Post</h4>
                <p className="text-xs sm:text-sm text-[#828392] max-w-md mx-auto">
                  When a post passes AI brand intelligence review with clean findings, you can promote it to Ready to Post.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {readyToPostPosts.map((post) => (
                  <ExpandablePostCard
                    key={post.id}
                    post={post}
                    actorUsername={username}
                    onPostUpdated={onPostUpdated}
                    onEditPost={handleEditModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DONE / POSTED */}
        {activeTab === 'done_posted' && (
          <div className="space-y-4">
            {donePostedPosts.length === 0 ? (
              <div className="py-20 px-6 text-center bg-[rgba(12,13,20,0.6)] border border-white/10 rounded-xl font-mono">
                <Share2 size={28} className="mx-auto mb-3 text-[#a68bff]/60" />
                <h4 className="text-base font-medium text-white mb-1">No Completed / Posted Posts</h4>
                <p className="text-xs sm:text-sm text-[#828392] max-w-md mx-auto">
                  Posts confirmed and marked as posted externally will be archived here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {donePostedPosts.map((post) => (
                  <ExpandablePostCard
                    key={post.id}
                    post={post}
                    actorUsername={username}
                    onPostUpdated={onPostUpdated}
                    onEditPost={handleEditModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit / Quick Update Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          activities={activities}
          onClose={() => setSelectedPost(null)}
          onSave={handleSaveModal}
          username={username}
        />
      )}
    </div>
  );
};
