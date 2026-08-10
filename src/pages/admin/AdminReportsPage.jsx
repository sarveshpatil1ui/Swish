import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Flag, CheckCircle, X, Clock, AlertTriangle, Eye, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from '../../utils/helpers';

const statusConfig = {
  pending:   { label: 'Pending',   color: 'amber',   icon: Clock,          bg: 'bg-amber-100 dark:bg-amber-500/10',   text: 'text-amber-700 dark:text-amber-400' },
  reviewed:  { label: 'Reviewed',  color: 'brand',   icon: Eye,            bg: 'bg-brand-100 dark:bg-brand-500/10',   text: 'text-brand-700 dark:text-brand-400' },
  resolved:  { label: 'Resolved',  color: 'emerald', icon: CheckCircle,    bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
  dismissed: { label: 'Dismissed', color: 'slate',   icon: X,              bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-400' },
};

const filterTabs = ['all', 'pending', 'reviewed', 'resolved', 'dismissed'];

export default function AdminReportsPage() {
  const { reports, updateReportStatus } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const filtered = filterStatus === 'all' ? reports : reports.filter(r => r.status === filterStatus);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {reports.filter(r => r.status === 'pending').length} pending · {reports.length} total reports
          </p>
        </div>
        {reports.filter(r => r.status === 'pending').length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {reports.filter(r => r.status === 'pending').length} need attention
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterTabs.map(s => {
          const count = s === 'all' ? reports.length : reports.filter(r => r.status === s).length;
          const cfg = s !== 'all' ? statusConfig[s] : null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold capitalize transition-all ${
                filterStatus === s
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {s}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                filterStatus === s 
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.map(report => {
          const cfg = statusConfig[report.status];
          const StatusIcon = cfg.icon;
          const isExpanded = expanded === report.id;

          return (
            <div key={report.id} className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
              report.status === 'pending'
                ? 'border-amber-200 dark:border-amber-500/20 shadow-sm'
                : 'border-slate-200/60 dark:border-slate-800/60'
            }`}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Flag size={17} className={cfg.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <div className="flex items-center gap-2">
                        <img src={report.reporter.avatar} alt="" className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700" />
                        <span className="font-bold text-[14px] text-slate-900 dark:text-white">{report.reporter.name}</span>
                      </div>
                      <span className="text-[12px] text-slate-400">reported</span>
                      <div className="flex items-center gap-2">
                        <img src={report.reported.avatar} alt="" className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700" />
                        <span className="font-bold text-[14px] text-slate-900 dark:text-white">{report.reported.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        {report.reason}
                      </span>
                    </div>
                    
                    {report.post && !isExpanded && (
                      <p className="text-[12px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 line-clamp-1">
                        "{report.post.content.slice(0, 100)}..."
                      </p>
                    )}

                    {isExpanded && report.post && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          <img src={report.post.author.avatar} alt="" className="w-6 h-6 rounded-full" />
                          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{report.post.author.name}</span>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{report.post.content}</p>
                        {report.post.image && (
                          <img src={report.post.image} alt="" className="mt-2 w-full max-h-32 object-cover rounded-lg" />
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[11px] text-slate-400">{formatDistanceToNow(report.createdAt)}</p>
                      {report.post && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : report.id)}
                          className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 flex items-center gap-0.5 transition-colors"
                        >
                          {isExpanded ? 'Show less' : 'View post'}
                          <ChevronDown size={11} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateReportStatus(report.id, 'reviewed')}
                          className="text-[12px] font-bold px-3 py-2 bg-brand-50 dark:bg-brand-500/10 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Eye size={12} /> Review
                        </button>
                        <button
                          onClick={() => updateReportStatus(report.id, 'resolved')}
                          className="text-[12px] font-bold px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle size={12} /> Resolve
                        </button>
                        <button
                          onClick={() => updateReportStatus(report.id, 'dismissed')}
                          className="text-[12px] font-bold px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                        >
                          <X size={12} /> Dismiss
                        </button>
                      </>
                    )}
                    {report.status === 'reviewed' && (
                      <button
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                        className="text-[12px] font-bold px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle size={12} /> Resolve
                      </button>
                    )}
                    {(report.status === 'resolved' || report.status === 'dismissed') && (
                      <button
                        onClick={() => updateReportStatus(report.id, 'pending')}
                        className="text-[12px] font-bold px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-20 text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white mb-1">All clear!</p>
          <p className="text-sm text-slate-500">No reports with this status</p>
        </div>
      )}
    </div>
  );
}
