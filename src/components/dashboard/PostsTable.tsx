import React, { useState, useMemo } from 'react';
import { PostRecord, Platform } from '../../types';
import { ExpandablePostCard } from '../common/ExpandablePostCard';
import { Search, Plus, Layers } from 'lucide-react';

interface PostsTableProps {
  posts: PostRecord[];
  username: string;
  onPostUpdated: (post: PostRecord) => void;
  onEditPost: (post: PostRecord) => void;
  onCreateNew: () => void;
  title?: string;
  emptyMessage?: string;
}

const PostsTableComponent: React.FC<PostsTableProps> = ({
  posts,
  username,
  onPostUpdated,
  onEditPost,
  onCreateNew,
  title = 'Your Posts',
  emptyMessage = 'No posts found matching the selected criteria.',
}) => {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'All' | Platform>('All');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q);
      const matchesPlatform = platformFilter === 'All' || p.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    });
  }, [posts, search, platformFilter]);

  return (
    <div className="bg-[rgba(12,13,20,0.75)] backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Table Header Controls */}
      <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white uppercase font-mono">
            {title}
          </h2>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 text-[#9cecff] border border-white/10">
            {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727382]"
            />
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs sm:text-[13px] bg-black/60 border border-white/15 rounded-md text-white placeholder-[#626270] focus:outline-none focus:border-[#a68bff] transition-colors w-44 sm:w-56 font-mono"
            />
          </div>

          {/* Platform filter pills */}
          <div className="flex rounded-md p-1 bg-black/50 border border-white/10 text-xs font-mono">
            {(['All', 'Instagram', 'LinkedIn', 'X'] as const).map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => setPlatformFilter(plat)}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  platformFilter === plat
                    ? 'bg-white/20 text-white font-medium shadow-sm'
                    : 'text-[#828392] hover:text-white'
                }`}
              >
                {plat}
              </button>
            ))}
          </div>

          {/* Create New Post action */}
          <button
            type="button"
            onClick={onCreateNew}
            className="btn-primary-glow flex items-center gap-2 px-4 py-2 text-xs sm:text-[13px] font-mono tracking-wider bg-[rgba(166,139,255,0.25)] hover:bg-[rgba(166,139,255,0.35)] text-white border border-[rgba(166,139,255,0.5)] rounded-md transition-all shadow-[0_0_15px_rgba(166,139,255,0.15)] font-medium cursor-pointer"
          >
            <Plus size={15} />
            <span>NEW POST</span>
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#727382]">
              <Layers size={24} />
            </div>
            <p className="text-sm sm:text-base text-[#9a9aa8] max-w-md mx-auto mb-5 leading-relaxed font-mono">
              {emptyMessage}
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-[13px] font-mono tracking-wider bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/20 rounded-md transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Create New Post</span>
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
                onEditPost={onEditPost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PostsTable = React.memo(PostsTableComponent);
