import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Flag, Activity, Search, CheckCircle, XCircle, Trash2, Eye, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminStats, adminReports, adminUsers } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

const tabs = ['Overview', 'Users', 'Reports']

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-400 dark:text-gray-500 text-xs font-medium">{label}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-2xl">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [userQuery, setUserQuery] = useState('')
  const [userStatuses, setUserStatuses] = useState({})
  const [reports, setReports] = useState(adminReports)
  const [loadingReportId, setLoadingReportId] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  const filteredUsers = adminUsers.filter(u =>
    u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userQuery.toLowerCase()) ||
    u.dept.toLowerCase().includes(userQuery.toLowerCase())
  )

  const toggleUserStatus = (id) => {
    setUserStatuses(s => ({ ...s, [id]: s[id] === 'suspended' ? 'active' : 'suspended' }))
  }

  const handleReport = (id, action) => {
    setLoadingReportId(id)
    setTimeout(() => {
      setReports(rs => rs.filter(r => r.id !== id))
      setLoadingReportId(null)
    }, 600)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-xl">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 dark:text-gray-500 text-xs">Logged in as {user?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'Overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={adminStats.totalUsers} color="bg-indigo-500" />
            <StatCard icon={FileText} label="Total Posts" value={adminStats.totalPosts} color="bg-violet-500" />
            <StatCard icon={Flag} label="Open Reports" value={adminStats.openReports} color="bg-rose-500" />
            <StatCard icon={Activity} label="Active Today" value={adminStats.activeUsers} color="bg-emerald-500" />
          </div>

          {/* Recent reports preview */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Recent Reports</h2>
              <button onClick={() => setActiveTab('Reports')} className="text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:text-indigo-700 transition-colors">
                View all →
              </button>
            </div>
            {reports.slice(0, 2).map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{r.reason}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">by {r.reportedBy} · {r.time}</p>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Users */}
      {activeTab === 'Users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search users by name or department…"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-gray-800/60 border-b border-slate-100 dark:border-gray-800">
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">User</p>
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">Status</p>
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">Action</p>
            </div>
            {filteredUsers.map(u => {
              const status = userStatuses[u.id] || 'active'
              return (
                <div key={u.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 items-start sm:items-center px-5 py-4 sm:py-3.5 border-b border-slate-50 dark:border-gray-800/60 last:border-0">
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: u.avatarColor }}>
                      {u.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 dark:text-gray-200 text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs truncate">{u.dept} · {u.year}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-1 sm:mt-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      status === 'suspended'
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        status === 'suspended'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                      }`}
                    >
                      {status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Reports */}
      {activeTab === 'Reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-slate-500 dark:text-gray-400 text-sm">{reports.length} open reports</p>
          {reports.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
              <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-gray-400 font-semibold text-sm">All clear!</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">No open reports at the moment.</p>
            </div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Flag size={14} className="text-rose-500" />
                      <p className="text-slate-900 dark:text-white font-semibold text-sm">{r.reason}</p>
                    </div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs">Reported by {r.reportedBy} · {r.time}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full flex-shrink-0">
                    Pending
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-4 border border-slate-100 dark:border-gray-700">
                  <p className="text-slate-500 dark:text-gray-400 text-xs font-medium mb-1">Post caption:</p>
                  <p className="text-slate-700 dark:text-gray-300 text-sm italic">"{r.postCaption}"</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReport(r.id, 'remove')}
                    disabled={loadingReportId === r.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-50 transition-all"
                  >
                    {loadingReportId === r.id ? <span className="w-3.5 h-3.5 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" /> : <Trash2 size={13} />}
                    Remove Post
                  </button>
                  <button
                    onClick={() => handleReport(r.id, 'dismiss')}
                    disabled={loadingReportId === r.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-all"
                  >
                    <XCircle size={13} /> Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  )
}
