import React from 'react';
import { mockAdminStats, mockUsers, mockPosts, mockReports } from '../../data/mockData';
import { formatCount } from '../../utils/helpers';
import {
  Users, FileText, Flag, TrendingUp, TrendingDown,
  Activity, AlertTriangle, CheckCircle, Clock, UserPlus,
  ArrowUpRight, Zap
} from 'lucide-react';

const statCards = [
  {
    label: 'Total Users',
    value: mockAdminStats.totalUsers.toLocaleString(),
    sub: `+${mockAdminStats.newUsersThisWeek} this week`,
    icon: Users,
    iconBg: 'bg-brand-100 dark:bg-brand-500/10',
    iconColor: 'text-brand-600 dark:text-brand-400',
    trend: 'up',
    trendVal: '+12.4%',
  },
  {
    label: 'Active Today',
    value: mockAdminStats.activeToday.toLocaleString(),
    sub: 'out of 4,821 users',
    icon: Activity,
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    trend: 'up',
    trendVal: '+8.2%',
  },
  {
    label: 'Total Posts',
    value: mockAdminStats.totalPosts.toLocaleString(),
    sub: `${mockAdminStats.postsToday} new today`,
    icon: FileText,
    iconBg: 'bg-violet-100 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    trend: 'up',
    trendVal: '+5.1%',
  },
  {
    label: 'Open Reports',
    value: mockAdminStats.pendingReports,
    sub: `${mockAdminStats.reports} total filed`,
    icon: Flag,
    iconBg: 'bg-red-100 dark:bg-red-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    trend: 'down',
    trendVal: '-2 vs yesterday',
  },
];

const activityFeed = [
  { icon: UserPlus, color: 'brand', text: 'Tanvi Kulkarni joined Swish', sub: 'New registration · CS Dept', time: '2m ago' },
  { icon: Flag, color: 'red', text: 'Post by rahul.mehta flagged as spam', sub: 'Reported by arya.sharma', time: '15m ago' },
  { icon: CheckCircle, color: 'emerald', text: 'Report #r3 resolved', sub: 'Action taken by admin', time: '1h ago' },
  { icon: AlertTriangle, color: 'amber', text: 'Spike in #Hackathon2026', sub: '42 posts in the last hour', time: '2h ago' },
  { icon: UserPlus, color: 'brand', text: '3 new users in the last hour', sub: 'MBA, Electronics, CS Dept', time: '2h ago' },
  { icon: Zap, color: 'violet', text: 'Post by sneha.patil went viral', sub: '300+ likes in 4 hours', time: '3h ago' },
];

const deptData = [
  { dept: 'Computer Science', pct: 78, count: 1240, color: 'from-brand-500 to-brand-600' },
  { dept: 'MBA Finance', pct: 55, count: 890, color: 'from-violet-500 to-violet-600' },
  { dept: 'Electronics & Telecom', pct: 45, count: 720, color: 'from-amber-500 to-orange-600' },
  { dept: 'Mechanical Engineering', pct: 30, count: 480, color: 'from-emerald-500 to-emerald-600' },
  { dept: 'Civil Engineering', pct: 22, count: 350, color: 'from-rose-500 to-rose-600' },
];

const reportsSummary = [
  { label: 'Pending', count: mockAdminStats.pendingReports, color: 'amber', dot: 'bg-amber-500' },
  { label: 'Reviewed', count: 7, color: 'brand', dot: 'bg-brand-500' },
  { label: 'Resolved', count: 4, color: 'emerald', dot: 'bg-emerald-500' },
  { label: 'Dismissed', count: 1, color: 'slate', dot: 'bg-slate-400' },
];

export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Good evening, Kedar 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here's what's happening on campus right now</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, iconBg, iconColor, trend, trendVal }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between mb-5">
              <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={iconColor} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trendVal}
              </span>
            </div>
            <p className="text-[28px] font-black text-slate-900 dark:text-white leading-none mb-1">{value}</p>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">Recent Activity</h2>
            <button className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:text-brand-700 transition-colors flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activityFeed.map((item, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                <div className={`w-9 h-9 bg-${item.color}-100 dark:bg-${item.color}-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                  <item.icon size={16} className={`text-${item.color}-600 dark:text-${item.color}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{item.text}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{item.sub}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mt-0.5">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Users by Department */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">
            <h2 className="font-bold text-[15px] text-slate-900 dark:text-white mb-5">Users by Department</h2>
            <div className="space-y-4">
              {deptData.map(({ dept, pct, count, color }) => (
                <div key={dept}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                    <span className="text-slate-400 font-medium">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reports Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">Reports</h2>
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                {mockAdminStats.pendingReports} pending
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportsSummary.map(({ label, count, color, dot }) => (
                <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                  <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full bg-${color === 'slate' ? 'slate' : color}-100 dark:bg-${color === 'slate' ? 'slate' : color}-500/10 text-${color === 'slate' ? 'slate' : color}-700 dark:text-${color === 'slate' ? 'slate' : color}-400`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">
            <h2 className="font-bold text-[15px] text-slate-900 dark:text-white mb-5">Recent Users</h2>
            <div className="space-y-3">
              {mockUsers.slice(0, 3).map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.department}</p>
                  </div>
                  {u.isVerified && (
                    <div className="w-5 h-5 bg-brand-100 dark:bg-brand-500/10 rounded-full flex items-center justify-center">
                      <CheckCircle size={12} className="text-brand-600 dark:text-brand-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
