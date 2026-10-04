import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, Building2, Megaphone,
  TrendingUp, Activity, Calendar, ArrowRight,
  AlertCircle, RefreshCw
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiGetUserStats, apiGetNotices } from '../../utils/auth'

function StatCard({ icon: Icon, label, value, iconBg, iconColor, trend, trendVal }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-5">
        <div
          className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}
        >
          <Icon size={20} className={iconColor} />
        </div>

        {trendVal && (
          <span
            className={`flex items-center gap-1 text-xs font-bold ${
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trendVal}
          </span>
        )}
      </div>

      <p className="text-[28px] font-black text-slate-900 dark:text-white leading-none mb-1">
        {typeof value === 'number' ? value.toLocaleString() : (value ?? '-')}
      </p>

      <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
        {label}
      </p>

      <p className="text-[11px] text-slate-400">
        {trend ? (trend === 'up' ? 'Active' : 'Inactive') : 'Total'}
      </p>
    </div>
  )
}

export default function CollegeAdminDashboard() {
  const navigate = useNavigate()
  const { currentUser } = useSwish()
  const [stats, setStats] = useState(null)
  const [recentNotices, setRecentNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, noticesRes] = await Promise.all([
        apiGetUserStats(),
        apiGetNotices(),
      ])

      if (!statsRes.ok) {
        throw new Error(statsRes.error || 'Failed to load dashboard statistics.')
      }

      setStats({
        totalStudents: statsRes.stats.totalStudents ?? 0,
        activeStudents: statsRes.stats.activeStudents ?? 0,
        suspendedStudents: statsRes.stats.suspendedStudents ?? 0,
        totalFaculty: statsRes.stats.totalFaculty ?? 0,
        activeFaculty: statsRes.stats.activeFaculty ?? 0,
        suspendedFaculty: statsRes.stats.suspendedFaculty ?? 0,
        totalDepartments: statsRes.stats.totalDepartments ?? 0,
        activeNotices: statsRes.stats.activeNotices ?? 0,
      })

      if (noticesRes.ok && Array.isArray(noticesRes.notices)) {
        setRecentNotices(noticesRes.notices.slice(0, 5))
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
      setError(err.message || 'Unable to connect to the dashboard service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-xs text-slate-400">Loading dashboard statistics...</p>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unable to Load Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">
            Here's what's happening at {currentUser?.college || 'your college'}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
          title="Refresh statistics"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && stats && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-semibold text-rose-600 hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents}
          iconBg="bg-indigo-100 dark:bg-indigo-950/60"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={GraduationCap}
          label="Total Faculty"
          value={stats?.totalFaculty}
          iconBg="bg-emerald-100 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={stats?.totalDepartments}
          iconBg="bg-violet-100 dark:bg-violet-950/60"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={Megaphone}
          label="Active Notices"
          value={stats?.activeNotices}
          iconBg="bg-amber-100 dark:bg-amber-950/60"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Active Students"
          value={stats?.activeStudents}
          iconBg="bg-emerald-100 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
          trend="up"
          trendVal="Active"
        />
        <StatCard
          icon={Activity}
          label="Active Faculty"
          value={stats?.activeFaculty}
          iconBg="bg-emerald-100 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
          trend="up"
          trendVal="Active"
        />
        <StatCard
          icon={TrendingUp}
          label="Suspended Students"
          value={stats?.suspendedStudents}
          iconBg="bg-rose-100 dark:bg-rose-950/60"
          iconColor="text-rose-600 dark:text-rose-400"
          trend="down"
          trendVal="Suspended"
        />
        <StatCard
          icon={TrendingUp}
          label="Suspended Faculty"
          value={stats?.suspendedFaculty}
          iconBg="bg-rose-100 dark:bg-rose-950/60"
          iconColor="text-rose-600 dark:text-rose-400"
          trend="down"
          trendVal="Suspended"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/college-admin/students')}
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Manage Students</span>
          </button>
          <button
            onClick={() => navigate('/college-admin/faculty')}
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <GraduationCap size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Manage Faculty</span>
          </button>
          <button
            onClick={() => navigate('/college-admin/departments')}
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <Building2 size={20} className="text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Departments</span>
          </button>
          <button
            onClick={() => navigate('/college-admin/notices')}
            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <Megaphone size={20} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Create Notice</span>
          </button>
        </div>
      </div>

      {/* Recent Notices */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Notices</h2>
          <button
            onClick={() => navigate('/college-admin/notices')}
            className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            View All <ArrowRight size={16} />
          </button>
        </div>
        {recentNotices.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No notices yet</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Create a notice to communicate important information to your college.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotices.map((notice) => (
              <div
                key={notice.id}
                className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  notice.priority === 'urgent' ? 'bg-rose-100 dark:bg-rose-950/60' :
                  notice.priority === 'high' ? 'bg-amber-100 dark:bg-amber-950/60' :
                  'bg-slate-200 dark:bg-gray-700'
                }`}>
                  <Megaphone size={18} className="text-slate-600 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium text-sm truncate">{notice.title}</p>
                  <p className="text-slate-500 dark:text-gray-500 text-xs mt-1 line-clamp-2">{notice.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      notice.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {notice.published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
