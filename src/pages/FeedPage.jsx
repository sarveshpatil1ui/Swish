import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import StoryBar from '../components/StoryBar';
import { useApp } from '../context/AppContext';
import { mockTrendingTopics } from '../data/mockData';
import { formatCount } from '../utils/helpers';
import { TrendingUp, Users, CalendarDays, Award, Sparkles, Image as ImageIcon } from 'lucide-react';

const campusEvents = [
  { id: 'e1', title: 'Business Conclave 2026', date: 'Aug 15', category: 'Event', color: 'brand' },
  { id: 'e2', title: 'Hackathon Results Day', date: 'Aug 12', category: 'Announcement', color: 'violet' },
  { id: 'e3', title: 'Sustainability Drive', date: 'Aug 10', category: 'Community', color: 'emerald' },
  { id: 'e4', title: 'Placement Prep Workshop', date: 'Aug 9', category: 'Career', color: 'amber' },
];

export default function FeedPage({ onCreatePost }) {
  const { posts, me, users } = useApp();
  const navigate = useNavigate();
  const suggestedUsers = users.filter(u => u.id !== 'me' && !u.isFollowing).slice(0, 3);

  return (
    <div className="flex gap-8 max-w-[1200px] mx-auto px-0 sm:px-4 pt-2 sm:pt-6 pb-20 lg:pb-8">
      {/* Main Feed */}
      <main className="flex-1 min-w-0 max-w-[600px] mx-auto lg:mx-0 w-full">
        {/* Stories */}
        <div className="mb-4 sm:mb-6">
          <StoryBar />
        </div>

        {/* Quick Create Post */}
        <div className="card p-4 mb-6 hidden sm:flex flex-col gap-3 shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <img src={me.avatar} alt={me.name} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
            <button
              onClick={onCreatePost}
              className="flex-1 text-left bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-700/50 rounded-full px-5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors"
            >
              What's happening on campus, {me.name.split(' ')[0]}?
            </button>
          </div>
          <div className="flex items-center justify-between pl-[52px]">
            <div className="flex gap-2">
              <button onClick={onCreatePost} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-brand-50 dark:hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-medium transition-colors">
                <ImageIcon size={18} />
                Photo
              </button>
              <button onClick={onCreatePost} className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-violet-50 dark:hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium transition-colors">
                <Sparkles size={18} />
                Event
              </button>
            </div>
            <button onClick={onCreatePost} className="btn-primary py-1.5 px-5 text-sm shadow-sm hover:shadow-md">
              Post
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4 sm:space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="card p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-900 dark:text-white font-bold text-lg mb-2">Welcome to Swish!</p>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Follow your batchmates and join clubs to see their posts here.</p>
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="w-[320px] flex-shrink-0 hidden lg:block space-y-6 pt-0">
        {/* Your Profile Card */}
        <div className="card p-5 shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3 mb-5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/user/${me.id}`)}>
            <img src={me.avatar} alt={me.name} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{me.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">@{me.username}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <div className="text-center cursor-pointer group" onClick={() => navigate(`/user/${me.id}`)}>
              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{formatCount(me.posts)}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Posts</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center cursor-pointer group">
              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{formatCount(me.followers)}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Followers</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center cursor-pointer group">
              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">{formatCount(me.following)}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Following</p>
            </div>
          </div>
        </div>

        {/* Suggested Users */}
        <div className="card p-5 shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              Suggested for you
            </h3>
            <button onClick={() => navigate('/search')} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-semibold transition-colors">See all</button>
          </div>
          <div className="space-y-4">
            {suggestedUsers.map(user => (
              <SuggestedUser key={user.id} user={user} />
            ))}
          </div>
        </div>

        {/* Trending */}
        <div className="card p-5 shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Trending on Campus</h3>
          </div>
          <div className="space-y-4">
            {mockTrendingTopics.slice(0, 5).map((t, i) => (
              <div
                key={t.id}
                className="flex items-start justify-between cursor-pointer group"
                onClick={() => navigate('/explore')}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-xs text-slate-500 mb-0.5">Trending in {t.tag.includes('2026') ? 'Events' : 'Campus'}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                    #{t.tag}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.posts} posts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card p-5 shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays size={16} className="text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Upcoming Events</h3>
          </div>
          <div className="space-y-4">
            {campusEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 cursor-pointer group">
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg w-10 h-10 flex-shrink-0 border border-slate-100 dark:border-slate-700 group-hover:border-brand-500/50 transition-colors">
                  <span className="text-[10px] font-bold text-red-500 uppercase leading-none mt-1">{ev.date.split(' ')[0]}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white leading-none mt-0.5">{ev.date.split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">{ev.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{ev.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">About</a>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Privacy</a>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Terms</a>
            <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Guidelines</a>
          </div>
          <p className="text-xs text-slate-400">© 2026 Swish · MIT Pune</p>
        </div>
      </aside>
    </div>
  );
}

function SuggestedUser({ user }) {
  const { toggleFollow, users } = useApp();
  const navigate = useNavigate();
  const live = users.find(u => u.id === user.id) || user;

  return (
    <div className="flex items-center gap-3">
      <img
        src={live.avatar}
        alt={live.name}
        className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity border border-slate-200 dark:border-slate-700"
        onClick={() => navigate(`/user/${live.id}`)}
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${live.id}`)}>
        <p className="text-sm font-bold text-slate-900 dark:text-white hover:underline truncate">{live.name}</p>
        <p className="text-xs text-slate-500 truncate">{live.department}</p>
      </div>
      <button
        onClick={() => toggleFollow(live.id)}
        className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
          live.isFollowing
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600'
            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
        }`}
      >
        {live.isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
