import React from 'react';
import { useApp } from '../context/AppContext';
import { Heart, MessageCircle, UserPlus, AtSign, Bell, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const typeConfig = {
  like:    { icon: Heart,          color: 'red',     bg: 'bg-red-50 dark:bg-red-500/10' },
  comment: { icon: MessageCircle,  color: 'brand',   bg: 'bg-brand-50 dark:bg-brand-500/10' },
  follow:  { icon: UserPlus,       color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  mention: { icon: AtSign,         color: 'violet',  bg: 'bg-violet-50 dark:bg-violet-500/10' },
};

export default function NotificationsPage() {
  const { notifications, markAllRead, markRead, unreadCount } = useApp();
  const navigate = useNavigate();

  // Helper to group notifications
  const getGroup = (timeStr) => {
    if (timeStr.includes('m') || timeStr.includes('h')) return 'Today';
    if (timeStr.includes('d') && parseInt(timeStr) < 7) return 'This Week';
    return 'Earlier';
  };

  const groups = notifications.reduce((acc, n) => {
    const g = getGroup(n.time);
    if (!acc[g]) acc[g] = [];
    acc[g].push(n);
    return acc;
  }, {});

  const groupOrder = ['Today', 'This Week', 'Earlier'];

  return (
    <div className="max-w-2xl mx-auto sm:px-4 pt-4 sm:pt-6 pb-24 lg:pb-8 min-h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-6 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Alerts</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-sm font-semibold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
          >
            <Check size={16} />
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="card mx-4 sm:mx-0 p-16 text-center border-slate-200/60 dark:border-slate-800/60 shadow-sm mt-8">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-brand-500" />
          </div>
          <p className="text-slate-900 dark:text-white font-bold text-lg mb-2">You're all caught up!</p>
          <p className="text-slate-500 text-sm">When you get likes, comments, or followers, they'll show up here.</p>
        </div>
      )}

      {/* Grouped Notifications */}
      <div className="bg-white dark:bg-slate-900 sm:card sm:border-slate-200/60 dark:sm:border-slate-800/60 sm:shadow-sm overflow-hidden">
        {groupOrder.map(group => {
          const groupNotifs = groups[group];
          if (!groupNotifs || groupNotifs.length === 0) return null;
          
          return (
            <div key={group}>
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-y border-slate-100 dark:border-slate-800/60 first:border-t-0 sticky top-[60px] lg:top-0 z-10 backdrop-blur-md">
                <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider">{group}</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {groupNotifs.map(n => <NotifItem key={n.id} notif={n} onRead={markRead} navigate={navigate} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotifItem({ notif, onRead, navigate }) {
  const cfg = typeConfig[notif.type] || typeConfig.like;
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => { onRead(notif.id); if (notif.post) navigate(`/feed`); }}
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
        !notif.isRead ? 'bg-brand-50/50 dark:bg-brand-500/5 relative' : ''
      }`}
    >
      {/* Unread indicator bar */}
      {!notif.isRead && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0 ml-1">
        <img src={notif.actor.avatar} alt={notif.actor.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${cfg.bg} rounded-full flex items-center justify-center border-[2.5px] border-white dark:border-slate-900 shadow-sm`}>
          <Icon size={12} className={`text-${cfg.color}-500`} strokeWidth={2.5} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-tight">
          <span className="font-bold text-slate-900 dark:text-white mr-1">{notif.actor.name}</span>
          {notif.message}
        </p>
        {notif.post && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">"{notif.post.content}"</p>
        )}
        <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-1.5">{notif.time}</p>
      </div>

      {/* Post thumbnail */}
      {notif.post?.image && (
        <img src={notif.post.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 ml-2" />
      )}
    </div>
  );
}
