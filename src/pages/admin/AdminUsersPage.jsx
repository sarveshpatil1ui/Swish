import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Ban, UserCheck, CheckCircle, AlertTriangle, Users, ArrowUpRight, Filter } from 'lucide-react';
import { formatCount } from '../../utils/helpers';

const filterTabs = [
  { value: 'all', label: 'All Users' },
  { value: 'verified', label: 'Verified' },
  { value: 'banned', label: 'Banned' },
];

export default function AdminUsersPage() {
  const { users } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [bannedUsers, setBannedUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);

  const allUsers = users.filter(u => u.id !== 'me');

  const filtered = allUsers.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const isBanned = bannedUsers.includes(u.id);
    const matchFilter = filter === 'all' ||
      (filter === 'verified' && (u.isVerified || verifiedUsers.includes(u.id)) && !isBanned) ||
      (filter === 'banned' && isBanned);
    return matchSearch && matchFilter;
  });

  const toggleBan = (id) => {
    setBannedUsers(bs => bs.includes(id) ? bs.filter(b => b !== id) : [...bs, id]);
  };

  const toggleVerify = (id) => {
    setVerifiedUsers(vs => vs.includes(id) ? vs.filter(v => v !== id) : [...vs, id]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {allUsers.length.toLocaleString()} registered · {bannedUsers.length} banned · {allUsers.filter(u => u.isVerified || verifiedUsers.includes(u.id)).length} verified
          </p>
        </div>
        <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-500/10 px-4 py-2.5 rounded-xl">
          <Users size={16} className="text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-bold text-brand-700 dark:text-brand-400">{allUsers.length} Total</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                filter === tab.value
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-4 hidden md:table-cell">Department</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-4 hidden lg:table-cell">Stats</th>
                <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(u => {
                const isBanned = bannedUsers.includes(u.id);
                const isVerified = u.isVerified || verifiedUsers.includes(u.id);
                const wasVerifiedOverride = verifiedUsers.includes(u.id);
                return (
                  <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group ${isBanned ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                          {isVerified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                              <CheckCircle size={9} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[12px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{u.department}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{u.year}</p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-4 text-[13px] text-slate-600 dark:text-slate-400">
                        <div className="text-center">
                          <p className="font-bold text-slate-900 dark:text-white">{formatCount(u.posts)}</p>
                          <p className="text-[10px] text-slate-400">posts</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-900 dark:text-white">{formatCount(u.followers)}</p>
                          <p className="text-[10px] text-slate-400">followers</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-full">
                          <Ban size={10} /> Banned
                        </span>
                      ) : isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-brand-100 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 rounded-full">
                          <CheckCircle size={10} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleVerify(u.id)}
                          className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            isVerified
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                              : 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 hover:bg-brand-100 transition-colors'
                          }`}
                        >
                          {isVerified ? <AlertTriangle size={12} /> : <UserCheck size={12} />}
                          {isVerified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          onClick={() => toggleBan(u.id)}
                          className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            isBanned
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <Ban size={12} />
                          {isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white mb-1">No users found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
