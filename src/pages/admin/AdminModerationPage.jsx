import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, Zap, Activity, Cpu } from 'lucide-react';

const rules = [
  { id: 'r1', name: 'Hate Speech Filter', desc: 'Automatically flag posts containing hate speech keywords for review', enabled: true, triggered: 23, icon: Shield },
  { id: 'r2', name: 'Spam Detection', desc: 'Detect and hide spam posts from accounts less than 24 hours old', enabled: true, triggered: 47, icon: Zap },
  { id: 'r3', name: 'NSFW Filter', desc: 'Block explicit content using AI-powered image and text moderation', enabled: false, triggered: 8, icon: XCircle },
  { id: 'r4', name: 'Campus Email Verification', desc: 'Only allow .edu email domains during registration', enabled: true, triggered: 12, icon: CheckCircle },
  { id: 'r5', name: 'Rate Limiting', desc: 'Prevent any user from posting more than 10 times per hour', enabled: true, triggered: 5, icon: Activity },
];

const actionLog = [
  { id: 'a1', type: 'auto', text: 'Spam post auto-hidden from new user @tanvi.k', time: '5m ago', status: 'success' },
  { id: 'a2', type: 'manual', text: 'Admin resolved report #r2 — Spam confirmed', time: '20m ago', status: 'success' },
  { id: 'a3', type: 'auto', text: 'Hate speech detected in comment — flagged for review', time: '1h ago', status: 'warning' },
  { id: 'a4', type: 'manual', text: 'User @karan.joshi issued a warning for repeated violations', time: '2h ago', status: 'warning' },
  { id: 'a5', type: 'auto', text: 'NSFW filter is disabled — content policy check skipped', time: '3h ago', status: 'info' },
  { id: 'a6', type: 'manual', text: 'Report #r5 dismissed (false report by new user)', time: '4h ago', status: 'info' },
];

const moderationStats = [
  { label: 'Auto Actions', val: '95', color: 'violet', icon: Cpu },
  { label: 'Resolved', val: '34', color: 'emerald', icon: CheckCircle },
  { label: 'Warnings', val: '12', color: 'amber', icon: AlertTriangle },
  { label: 'Users Banned', val: '3', color: 'red', icon: XCircle },
];

const statusIcon = { success: CheckCircle, warning: AlertTriangle, info: Clock };
const statusColor = { success: 'emerald', warning: 'amber', info: 'brand' };

export default function AdminModerationPage() {
  const [localRules, setLocalRules] = useState(rules);

  const toggleRule = (id) => {
    setLocalRules(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Moderation</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Configure automated rules and review moderation actions
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {moderationStats.map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className={`w-10 h-10 bg-${color}-100 dark:bg-${color}-500/10 rounded-xl flex items-center justify-center mb-4`}>
              <Icon size={18} className={`text-${color}-600 dark:text-${color}-400`} />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{val}</p>
            <p className="text-[12px] text-slate-500 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Automated Rules */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-100 dark:bg-brand-500/10 rounded-xl flex items-center justify-center">
                <Shield size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">Automated Rules</h2>
                <p className="text-[11px] text-slate-400">{localRules.filter(r => r.enabled).length} of {localRules.length} active</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {localRules.map(rule => {
              const RuleIcon = rule.icon;
              return (
                <div key={rule.id} className={`px-6 py-5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${rule.enabled ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        rule.enabled ? 'bg-brand-100 dark:bg-brand-500/10' : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <RuleIcon size={15} className={rule.enabled ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[14px] text-slate-900 dark:text-white">{rule.name}</p>
                          {rule.enabled 
                            ? <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full">Active</span>
                            : <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">Off</span>
                          }
                        </div>
                        <p className="text-[12px] text-slate-500 leading-relaxed">{rule.desc}</p>
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <Zap size={10} className="text-amber-500" />
                          Triggered {rule.triggered}× this week
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                        rule.enabled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        rule.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Log */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/10 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">Action Log</h2>
                <p className="text-[11px] text-slate-400">Recent moderation activity</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {actionLog.map(action => {
              const Icon = statusIcon[action.status];
              const color = statusColor[action.status];
              return (
                <div key={action.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className={`w-8 h-8 bg-${color}-100 dark:bg-${color}-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={15} className={`text-${color}-600 dark:text-${color}-400`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{action.text}</p>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        action.type === 'auto'
                          ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {action.type === 'auto' ? 'AUTO' : 'MANUAL'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{action.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
