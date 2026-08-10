import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { formatCount } from '../utils/helpers';
import { Grid3x3, List, MapPin, Award, CalendarDays, Edit3, Camera } from 'lucide-react';

export default function ProfilePage({ onCreatePost }) {
  const { me, posts } = useApp();
  const [activeTab, setActiveTab] = useState('posts');
  const [viewMode, setViewMode] = useState('list');

  const myPosts = posts.filter(p => p.author.id === 'me');
  const bookmarkedPosts = posts.filter(p => p.isBookmarked);

  const tabs = [
    { id: 'posts', label: 'Posts', count: myPosts.length },
    { id: 'bookmarks', label: 'Saved', count: bookmarkedPosts.length },
  ];

  const displayPosts = activeTab === 'posts' ? myPosts : bookmarkedPosts;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 lg:pb-8">
      {/* Cover + Avatar */}
      <div className="card overflow-hidden mb-5">
        {/* Cover */}
        <div className="h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-violet-700 relative">
          <div className="absolute inset-0 opacity-20">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="absolute rounded-full border-2 border-white"
                style={{ width: 60 + i*40, height: 60 + i*40, top: `${10+i*10}%`, left: `${5+i*15}%`, opacity: 0.4 }}
              />
            ))}
          </div>
          <button className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-black/40 transition-colors">
            <Camera size={13} /> Edit cover
          </button>
        </div>

        {/* Avatar + Info */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={me.avatar}
                alt={me.name}
                className="w-24 h-24 avatar ring-4 ring-white dark:ring-slate-900 shadow-lg"
              />
              <button className="absolute bottom-1 right-1 w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center hover:bg-brand-700 transition-colors shadow">
                <Camera size={13} className="text-white" />
              </button>
            </div>
            <button onClick={onCreatePost} className="btn-primary flex items-center gap-2 text-sm">
              <Edit3 size={15} />
              Create Post
            </button>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">{me.name}</h1>
                {me.isVerified && (
                  <span className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">@{me.username}</p>
            </div>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">{me.bio}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={13} /> {me.college}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarDays size={13} /> Joined {new Date(me.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Badges */}
          {me.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {me.badges.map(b => (
                <span key={b} className="flex items-center gap-1 badge-brand">
                  <Award size={11} /> {b}
                </span>
              ))}
            </div>
          )}

          {/* Department + Year */}
          <div className="flex gap-2 mt-3">
            <span className="badge bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{me.department}</span>
            <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{me.year}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(me.posts)}</p>
              <p className="text-xs text-slate-400 font-medium">Posts</p>
            </div>
            <div className="text-center cursor-pointer hover:text-brand-600 transition-colors">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(me.followers)}</p>
              <p className="text-xs text-slate-400 font-medium">Followers</p>
            </div>
            <div className="text-center cursor-pointer hover:text-brand-600 transition-colors">
              <p className="text-xl font-black text-slate-900 dark:text-white">{formatCount(me.following)}</p>
              <p className="text-xs text-slate-400 font-medium">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {t.label} <span className="text-slate-400 text-xs">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-brand-100 dark:bg-brand-950/50 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Grid3x3 size={18} />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {displayPosts.filter(p => p.image).map(post => (
            <div key={post.id} className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative">
              <img src={post.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <span className="text-white text-sm font-bold flex items-center gap-1">❤️ {post.likes}</span>
                <span className="text-white text-sm font-bold flex items-center gap-1">💬 {post.comments}</span>
              </div>
            </div>
          ))}
          {displayPosts.filter(p => p.image).length === 0 && (
            <div className="col-span-3 card p-10 text-center">
              <p className="text-slate-400">No media posts yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayPosts.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-400">{activeTab === 'bookmarks' ? 'No saved posts yet' : 'No posts yet — share something!'}</p>
            </div>
          ) : (
            displayPosts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      )}
    </div>
  );
}
