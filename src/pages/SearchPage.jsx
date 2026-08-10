import React, { useState } from 'react';
import { Search, X, Hash, Users } from 'lucide-react';
import { mockUsers, mockTrendingTopics } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { users, toggleFollow } = useApp();
  const navigate = useNavigate();

  const filteredUsers = users.filter(u =>
    u.id !== 'me' && (
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.department.toLowerCase().includes(query.toLowerCase())
    )
  );

  const filteredTags = mockTrendingTopics.filter(t =>
    t.tag.toLowerCase().includes(query.toLowerCase())
  );

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'people', label: 'People' },
    { id: 'tags', label: 'Tags' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 lg:pb-8">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-5">Search</h1>

      {/* Search Input */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, tags, departments..."
          className="input-field pl-11 pr-10 text-base"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tabs */}
      {query && (
        <div className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Recent / No query */}
      {!query && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">Trending Tags</h2>
            <div className="flex flex-wrap gap-2">
              {mockTrendingTopics.slice(0, 8).map(t => (
                <button
                  key={t.id}
                  onClick={() => setQuery(t.tag)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <Hash size={13} />
                  {t.tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">Suggested People</h2>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {users.filter(u => u.id !== 'me').slice(0, 4).map(u => (
                <UserRow key={u.id} user={u} navigate={navigate} toggleFollow={toggleFollow} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {query && (
        <div className="space-y-5">
          {/* People */}
          {(activeTab === 'all' || activeTab === 'people') && filteredUsers.length > 0 && (
            <div>
              {activeTab === 'all' && <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1"><Users size={14}/> People</h2>}
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map(u => (
                  <UserRow key={u.id} user={u} navigate={navigate} toggleFollow={toggleFollow} />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {(activeTab === 'all' || activeTab === 'tags') && filteredTags.length > 0 && (
            <div>
              {activeTab === 'all' && <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1"><Hash size={14}/> Tags</h2>}
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTags.map(t => (
                  <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <div className="w-10 h-10 bg-brand-100 dark:bg-brand-950/50 rounded-xl flex items-center justify-center">
                      <Hash size={18} className="text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">#{t.tag}</p>
                      <p className="text-xs text-slate-400">{t.posts} posts · {t.growth} this week</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {filteredUsers.length === 0 && filteredTags.length === 0 && (
            <div className="card p-12 text-center">
              <Search size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">No results for "{query}"</p>
              <p className="text-slate-400 text-sm mt-1">Try a different name, username, or tag</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, navigate, toggleFollow }) {
  const { users } = useApp();
  const live = users.find(u => u.id === user.id) || user;

  return (
    <div className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <img
        src={live.avatar}
        alt={live.name}
        className="w-11 h-11 avatar cursor-pointer"
        onClick={() => navigate(`/user/${live.id}`)}
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/user/${live.id}`)}>
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{live.name}</p>
          {live.isVerified && <span className="w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white text-[8px]">✓</span></span>}
        </div>
        <p className="text-xs text-slate-400 truncate">@{live.username} · {live.department}</p>
      </div>
      <button
        onClick={() => toggleFollow(live.id)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
          live.isFollowing
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {live.isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
