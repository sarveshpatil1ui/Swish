import React, { useState } from 'react';
import { Search, TrendingUp, Hash, Flame, BookOpen, Users, Star, Heart, MessageCircle, LayoutGrid, AlignJustify, X } from 'lucide-react';
import { mockTrendingTopics, exploreImages } from '../data/mockData';
import PostCard from '../components/PostCard';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCount } from '../utils/helpers';

const categories = [
  { id: 'all',       label: 'All',       icon: Flame },
  { id: 'academics', label: 'Academics', icon: BookOpen },
  { id: 'events',    label: 'Events',    icon: Star },
  { id: 'people',    label: 'People',    icon: Users },
];

const campusClubs = [
  { name: 'Tech Club', members: 342, avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=techclub&backgroundColor=b6e3f4' },
  { name: 'Coding Club', members: 218, avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=coding&backgroundColor=d1d4f9' },
  { name: 'Drama Society', members: 156, avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=drama&backgroundColor=ffd5dc' },
  { name: 'Photography', members: 203, avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=photo&backgroundColor=c0aede' },
];

export default function ExplorePage() {
  const { posts, users, toggleFollow } = useApp();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [lightboxImg, setLightboxImg] = useState(null);

  const filteredPosts = posts.filter(p =>
    !searchQuery || p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Explore</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Discover what's trending on your campus</p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400'}`}
          >
            <AlignJustify size={17} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search posts, tags, people..."
          className="input-field pl-11 text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeCategory === id
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* When searching — show filtered list */}
      {searchQuery ? (
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="card p-12 text-center">
              <Search size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No posts match "{searchQuery}"</p>
            </div>
          ) : (
            filteredPosts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Instagram-style Masonry Grid ── */
        <div className="flex gap-5">
          {/* Left: masonry photo grid */}
          <div className="flex-1 min-w-0">
            {/* Trending hashtag chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {mockTrendingTopics.slice(0, 6).map(t => (
                <span
                  key={t.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
                >
                  <Hash size={11} />
                  {t.tag}
                  <span className="text-slate-400 font-normal ml-1">{t.posts}</span>
                </span>
              ))}
            </div>

            {/* 3-column masonry grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {exploreImages.map((img, i) => {
                // Large images span 2 rows
                const isLarge = img.size === 'large';
                return (
                  <div
                    key={img.id}
                    className={`relative overflow-hidden rounded-lg cursor-pointer group bg-slate-100 dark:bg-slate-800 ${isLarge ? 'row-span-2' : ''}`}
                    style={{ aspectRatio: isLarge ? '1 / 2.07' : '1 / 1' }}
                    onClick={() => setLightboxImg(img)}
                  >
                    <img
                      src={img.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                        <Heart size={16} className="fill-white" />
                        {formatCount(img.likes)}
                      </span>
                      <span className="flex items-center gap-1.5 text-white text-sm font-bold">
                        <MessageCircle size={16} className="fill-white" />
                        {formatCount(img.comments)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-72 flex-shrink-0 hidden lg:block space-y-4">
            {/* Trending */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <Flame size={14} className="text-white" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Trending Today</h2>
              </div>
              <div className="space-y-3">
                {mockTrendingTopics.map((topic, i) => (
                  <div key={topic.id} className="flex items-center gap-3 group cursor-pointer">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                      i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600 text-white' :
                      i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                        #{topic.tag}
                      </p>
                      <p className="text-xs text-slate-400">{topic.posts} posts</p>
                    </div>
                    <span className={`text-xs font-bold flex-shrink-0 ${parseInt(topic.growth) > 50 ? 'text-emerald-500' : 'text-sky-500'}`}>
                      {topic.growth}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular People */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <Users size={14} className="text-white" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Popular This Week</h2>
              </div>
              <div className="space-y-3">
                {users.filter(u => u.id !== 'me').map(user => {
                  const live = users.find(u => u.id === user.id) || user;
                  return (
                    <div key={user.id} className="flex items-center gap-2.5">
                      <img
                        src={live.avatar}
                        alt={live.name}
                        className="w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-brand-400 transition-all"
                        onClick={() => navigate(`/user/${live.id}`)}
                      />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${live.id}`)}>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{live.name}</p>
                        <p className="text-[10px] text-slate-400">{formatCount(live.followers)} followers</p>
                      </div>
                      <button
                        onClick={() => toggleFollow(live.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                          live.isFollowing
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
                        }`}
                      >
                        {live.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campus Clubs */}
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">Campus Clubs</h2>
              <div className="space-y-3">
                {campusClubs.map(club => (
                  <div key={club.name} className="flex items-center gap-2.5 cursor-pointer group">
                    <img src={club.avatar} alt={club.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{club.name}</p>
                      <p className="text-[10px] text-slate-400">{club.members} members</p>
                    </div>
                    <button className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-brand-600 hover:text-white transition-all">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List mode */
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setLightboxImg(null)}
          >
            <X size={24} />
          </button>
          <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImg.image.replace('w=400', 'w=800')}
              alt=""
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-2xl p-4">
              <div className="flex items-center gap-4 text-white">
                <span className="flex items-center gap-1.5 text-sm font-bold"><Heart size={16} className="fill-white" /> {lightboxImg.likes}</span>
                <span className="flex items-center gap-1.5 text-sm font-bold"><MessageCircle size={16} /> {lightboxImg.comments}</span>
                {lightboxImg.tags.map(t => (
                  <span key={t} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
