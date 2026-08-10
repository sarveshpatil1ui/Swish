import React from 'react';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  const { posts } = useApp();
  const saved = posts.filter(p => p.isBookmarked);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 lg:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-950/50 rounded-xl flex items-center justify-center">
          <Bookmark size={20} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Saved Posts</h1>
          <p className="text-sm text-slate-400">{saved.length} post{saved.length !== 1 ? 's' : ''} saved</p>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="card p-16 text-center">
          <Bookmark size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No saved posts yet</p>
          <p className="text-slate-400 text-sm mt-1">Tap the bookmark icon on any post to save it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {saved.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}
