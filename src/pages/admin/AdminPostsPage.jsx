import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Trash2, Eye, EyeOff, Heart, MessageCircle, Flag, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from '../../utils/helpers';

export default function AdminPostsPage() {
  const { posts, deletePost } = useApp();
  const [search, setSearch] = useState('');
  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [localDeletedPosts, setLocalDeletedPosts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const displayPosts = posts
    .filter(p => !localDeletedPosts.includes(p.id))
    .filter(p => !search || p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.author.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())));

  const toggleHide = (id) => setHiddenPosts(hs => hs.includes(id) ? hs.filter(h => h !== id) : [...hs, id]);
  
  const handleDelete = (id) => {
    setLocalDeletedPosts(ds => [...ds, id]);
    setConfirmDelete(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Post Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {displayPosts.length} visible posts · {hiddenPosts.length} hidden
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search posts by content, author, or tag..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
        />
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {displayPosts.map(post => {
          const isHidden = hiddenPosts.includes(post.id);
          return (
            <div key={post.id} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 transition-all duration-200 ${isHidden ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Author */}
                <img src={post.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-[14px] text-slate-900 dark:text-white">{post.author.name}</span>
                    <span className="text-[12px] text-slate-400">@{post.author.username}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-[12px] text-slate-400">{formatDistanceToNow(post.createdAt)}</span>
                    {isHidden && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full">Hidden</span>
                    )}
                  </div>
                  
                  <p className="text-[14px] text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                    {post.content}
                  </p>
                  
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.tags.map(t => (
                        <span key={t} className="text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-md">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Image Preview */}
                  {post.image && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      <img src={post.image} alt="" className="w-full max-h-32 object-cover" />
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-5 text-[12px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Heart size={13} className="text-red-400" />
                      {post.likes} likes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={13} className="text-brand-400" />
                      {post.comments} comments
                    </span>
                    <span className="ml-auto text-[11px] text-slate-300 dark:text-slate-600 capitalize">{post.visibility}</span>
                  </div>
                </div>

                {/* Actions Column */}
                <div className="flex flex-col gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => toggleHide(post.id)}
                    className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                      isHidden
                        ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700'
                    }`}
                  >
                    {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                    {isHidden ? 'Show' : 'Hide'}
                  </button>
                  
                  {confirmDelete === post.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <CheckCircle size={11} /> Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[11px] font-bold px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(post.id)}
                      className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayPosts.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-20 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Flag size={24} className="text-slate-400" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white mb-1">No posts found</p>
          <p className="text-sm text-slate-500">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
}
