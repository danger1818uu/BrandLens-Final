import React, { useState } from 'react';
import { PostRecord, PostActivity, Platform, PostStatus } from '../../types';
import { ExpandablePostCard } from '../common/ExpandablePostCard';
import { PostDetailModal } from '../dashboard/PostDetailModal';
import { apiClient } from '../../services/api';
import { Search, Archive, Plus } from 'lucide-react';

interface HistoryViewProps {
  posts: PostRecord[];
  username: string;
  onPostUpdated: (updatedPost: PostRecord) => void;
  onCreateNew: () => void;
}

type StatusFilterTag = 'All' | 'pending_review' | 'ready_to_post' | 'posted';

export const HistoryView: React.FC<HistoryViewProps> = ({
  posts,
  username,
  onPostUpdated,
  onCreateNew,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterTag>('All');
  const [platformFilter, setPlatformFilter] = useState<'All' | Platform>('All');
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [activities, setActivities] = useState<PostActivity[]>([]);

  // Filter posts by search, canonical status tag, and platform
  const filtered = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.caption.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesPlatform = platformFilter === 'All' || p.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const handleEditModal = async (post: PostRecord) => {
    setSelectedPost(post);
    try {
      const acts = await apiClient.fetchActivities(post.id);
      setActivities(acts);
    } catch (e) {
      setActivities([]);
    }
  };

  const handleSaveModal = async (updated: { title: string; caption: string }) => {
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
  };

  const statusTags: Array<{ id: StatusFilterTag; label: string; count: number }> = [
    { id: 'All', label: 'All', count: posts.length },
    {
      id: 'pending_review',
      label: 'Pending for Review',
      count: posts.filter((p) => p.status === 'pending_review').length,
    },
    {
      id: 'ready_to_post',
      label: 'Clean / Ready to Post',
      count: posts.filter((p) => p.status === 'ready_to_post').length,
    },
    {
      id: 'posted',
      label: 'Posted',
      count: posts.filter((p) => p.status === 'posted').length,
    },
  ];

  return (
    <div className="space-y-8 page-enter">
      {/* Archive Header & Control Bar */}
      <div className="bg-[rgba(12,13,20,0.75)] backdrop-blur-2xl border border-white/10 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white font-mono flex items-center gap-2.5">
              <Archive size={20} className="text-[#a68bff]" />
              <span>COMPLETE POST ARCHIVE & LIFECYCLE HISTORY</span>
            </h2>
            <p className="text-xs sm:text-[13px] text-[#9a9aa8]">
              Inspect, search, and manage all your historical posts, AI evaluations, and publication status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCreateNew}
              className="btn-primary-glow flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.35)] text-white border border-[rgba(166,139,255,0.5)] rounded-md transition-all font-medium cursor-pointer"
            >
              <Plus size={14} />
              <span>NEW POST</span>
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tags Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {statusTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setStatusFilter(tag.id)}
                className={`px-3.5 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer font-medium ${
                  statusFilter === tag.id
                    ? 'bg-white/15 text-white border border-white/25 shadow-sm'
                    : 'text-[#828392] hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{tag.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-[#c7bbff] border border-white/10">
                  {tag.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Platform Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727382]"
              />
              <input
                type="text"
                placeholder="Search by title or caption..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs font-mono bg-black/60 border border-white/15 rounded-md text-white placeholder-[#626270] focus:outline-none focus:border-[#a68bff] transition-colors w-48 sm:w-60"
              />
            </div>

            {/* Platform pills */}
            <div className="flex rounded-md p-1 bg-black/50 border border-white/10 text-xs font-mono">
              {(['All', 'Instagram', 'LinkedIn', 'X'] as const).map((plat) => (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setPlatformFilter(plat)}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    platformFilter === plat
                      ? 'bg-white/20 text-white font-medium shadow-sm'
                      : 'text-[#828392] hover:text-white'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History Posts List */}
      {filtered.length === 0 ? (
        <div className="py-20 px-6 text-center bg-[rgba(12,13,20,0.6)] border border-white/10 rounded-xl font-mono">
          <Archive size={28} className="mx-auto mb-3 text-[#727382]" />
          <h4 className="text-base font-medium text-white mb-1">No Matching Posts Found</h4>
          <p className="text-xs sm:text-sm text-[#828392] max-w-md mx-auto mb-5">
            No records matched your search query or filter tags. Try clearing filters or searching for another term.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('All');
              setPlatformFilter('All');
            }}
            className="px-4 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-md transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
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

      {/* Detail / Edit Modal */}
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
