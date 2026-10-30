import React, { useState, useRef, useMemo, useCallback } from 'react';
import { PostRecord, MetricCounts, Role, PostActivity } from '../../types';
import { MetricCards, MetricFilterType } from './MetricCards';
import { PostsTable } from './PostsTable';
import { PostDetailModal } from './PostDetailModal';
import { getRoleGuideline } from '../../config/guidelines';
import { getOrganizationConfig } from '../../config/organizations';
import { apiClient } from '../../services/api';
import { Shield, Sparkles, Building2 } from 'lucide-react';

interface DashboardViewProps {
  posts: PostRecord[];
  metrics: MetricCounts;
  role: Role;
  username: string;
  organizationId?: string;
  companyName?: string;
  onPostUpdated: (updatedPost: PostRecord) => void;
  onCreateNew: () => void;
}

const DashboardViewComponent: React.FC<DashboardViewProps> = ({
  posts,
  metrics,
  role,
  username,
  organizationId,
  companyName,
  onPostUpdated,
  onCreateNew,
}) => {
  const [activeFilter, setActiveFilter] = useState<MetricFilterType>('all');
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  const [activities, setActivities] = useState<PostActivity[]>([]);
  const postsTableRef = useRef<HTMLDivElement>(null);

  const org = getOrganizationConfig(organizationId);
  const guideline = getRoleGuideline(role);

  const handleSelectFilter = useCallback((filter: MetricFilterType) => {
    setActiveFilter(filter);
    setTimeout(() => {
      postsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (activeFilter === 'pending') return p.status === 'pending_review' || p.status === 'ready_to_post';
      if (activeFilter === 'enhanced') return Boolean(p.isEnhanced);
      if (activeFilter === 'published') return p.status === 'posted';
      return true;
    });
  }, [posts, activeFilter]);

  const handleEditPost = useCallback(async (post: PostRecord) => {
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
    <div className="space-y-10 page-enter">
      {/* Role Guideline Header Card */}
      <div className="p-6 lg:p-7 bg-gradient-to-r from-[rgba(166,139,255,0.12)] to-[rgba(156,236,255,0.04)] border border-[rgba(166,139,255,0.25)] rounded-xl backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-xs sm:text-[13px] font-mono tracking-widest text-[#a68bff] uppercase font-medium">
            <Shield size={15} />
            <span>{org.name.toUpperCase()} BRAND GOVERNANCE · {role.toUpperCase()} SCOPE</span>
          </div>
          <p className="text-sm sm:text-base text-[#e0e0ec] max-w-3xl leading-relaxed">
            {org.companyContext} AI Check continuously enforces Company Relevance, Role Scope ({role}), Platform suitability, and Factual Integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-black/50 text-[#9cecff] border border-white/15 flex items-center gap-2 shadow-inner">
            <Sparkles size={13} />
            <span>4-Check Governance</span>
          </span>
        </div>
      </div>

      {/* Live Clickable 4 Metric Cards with Smooth Auto-Scroll */}
      <MetricCards
        metrics={metrics}
        activeFilter={activeFilter}
        onSelectFilter={handleSelectFilter}
      />

      {/* Filtered Posts List using Expandable Post Cards */}
      <div ref={postsTableRef} className="scroll-mt-8 transition-all">
        <PostsTable
          posts={filteredPosts}
          username={username}
          onPostUpdated={onPostUpdated}
          onEditPost={handleEditPost}
          onCreateNew={onCreateNew}
          title={
            activeFilter === 'all'
              ? 'All Author Posts'
              : activeFilter === 'pending'
              ? 'Pending Posts Queue'
              : activeFilter === 'enhanced'
              ? 'AI Enhanced Posts'
              : 'Published Posts Archive'
          }
          emptyMessage={
            activeFilter === 'published'
              ? 'No posts marked as published yet. Advance a ready post or confirm external publishing.'
              : activeFilter === 'enhanced'
              ? 'No posts with applied AI enhancements yet. Apply an AI suggestion or generate an AI asset in New Post.'
              : activeFilter === 'pending'
              ? 'No posts currently in pending status. All authored posts are published or completed.'
              : 'No matching posts found for your account.'
          }
        />
      </div>

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

export const DashboardView = React.memo(DashboardViewComponent);
