import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { formatCount } from '../utils/helpers';
import { ArrowLeft, MapPin, CalendarDays, Award, Grid3x3, List, Share2, MoreHorizontal, MessageCircle } from 'lucide-react';

export default function OtherProfilePage() {
  const { userId } = useParams();
  const { users, toggleFollow, posts } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [viewMode, setViewMode] = useState('list');

  const user = users.find(u => u.id === userId);
  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 pt-8 text-center">
      <p className="text-slate-500">User not found</p>
      <button onClick={() => navigate(-1)} className="btn-primary mt-4">Go Back</button>
    </div>
  );

  const live = users.find(u => u.id === userId) || user;
  const userPosts = posts.filter(p => p.author.id === userId);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 lg:pb-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="card overflow-hidden mb-5">
        {/* Cover */}
        <div className="h-36 bg-gradient-to-br from-violet-500 via-brand-600 to-brand-700 relative">
          <div className="absolute inset-0 opacity-20">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="absolute rounded-full border-2 border-white"
                style={{ width: 50 + i*40, height: 50 + i*40, bottom: `${10+i*10}%`, right: `${5+i*12}%`, opacity: 0.4 }}
              />
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <img src={live.avatar} alt={live.name} className="w-20 h-20 avatar ring-4 ring-white dark:ring-slate-900 shadow-lg" />
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={() => toggleFollow(live.id)}
                className={`text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 ${
                  live.isFollowing
                    ? 'btn-secondary'
                    : 'btn-primary'
                }`}
              >
                {live.isFollowing ? 'Following' : 'Follow'}
              </button>
              <button className="btn-secondary p-2.5 rounded-xl" title="Message">
                <MessageCircle size={16} />
              </button>
              <button className="btn-ghost p-2.5 rounded-xl" title="Share">
                <Share2 size={16} />
              </button>
              <button className="btn-ghost p-2.5 rounded-xl">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{live.name}</h1>
            {live.isVerified && (
              <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-2">@{live.username}</p>

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{live.bio}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={13} /> {live.college}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarDays size={13} /> Joined {new Date(live.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {live.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {live.badges.map(b => (
                <span key={b} className="flex items-center gap-1 badge-brand">
                  <Award size={11} /> {b}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <span className="badge bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{live.department}</span>
            <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{live.year}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(userPosts.length || live.posts)}</p>
              <p className="text-xs text-slate-400">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(live.followers)}</p>
              <p className="text-xs text-slate-400">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(live.following)}</p>
              <p className="text-xs text-slate-400">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + View Toggle */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {['posts', 'media'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                activeTab === t
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/30' : 'text-slate-400'}`}><List size={17} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/30' : 'text-slate-400'}`}><Grid3x3 size={17} /></button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'posts' && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {userPosts.filter(p => p.image).map(post => (
              <div key={post.id} className="aspect-square rounded-2xl overflow-hidden group relative cursor-pointer">
                <img src={post.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="text-white text-sm font-bold">❤️ {post.likes}</span>
                  <span className="text-white text-sm font-bold">💬 {post.comments}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-slate-400">No posts yet</p>
              </div>
            ) : (
              userPosts.map(post => <PostCard key={post.id} post={post} />)
            )}
          </div>
        )
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {userPosts.filter(p => p.image).map(post => (
            <div key={post.id} className="aspect-square rounded-2xl overflow-hidden group relative cursor-pointer">
              <img src={post.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
