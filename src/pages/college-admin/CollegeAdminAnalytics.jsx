import { useState, useEffect } from 'react'
import { Users, MessageSquare, Heart, AlertTriangle, Shield, TrendingUp, Calendar, BarChart3, Loader2 } from 'lucide-react'
import { apiGetAnalyticsDashboard } from '../../utils/auth'

export default function CollegeAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await apiGetAnalyticsDashboard()
      if (res.ok) {
        setAnalytics(res.analytics)
      } else {
        setError(res.error || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('[CollegeAdminAnalytics] Error:', err)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={32} className="text-rose-500" />
        <p className="text-slate-600 dark:text-gray-400">{error}</p>
        <button onClick={fetchAnalytics} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Retry
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-gray-500">No analytics data available</p>
      </div>
    )
  }

  const { users, content, reports, departmentDistribution, postTrends } = analytics

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
        <p className="text-slate-500 dark:text-gray-500 mt-1">Overview of your college's activity and engagement</p>
      </div>

      {/* User Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" /> User Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Users"
            value={users.total}
            icon={Users}
            color="indigo"
          />
          <MetricCard
            label="Active Users"
            value={users.active}
            icon={Shield}
            color="emerald"
          />
          <MetricCard
            label="Suspended Users"
            value={users.suspended}
            icon={AlertTriangle}
            color="rose"
          />
          <MetricCard
            label="New (7 Days)"
            value={users.new7Days}
            icon={Calendar}
            color="blue"
          />
        </div>
      </div>

      {/* Content Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-600" /> Content Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Posts"
            value={content.totalPosts}
            icon={MessageSquare}
            color="indigo"
          />
          <MetricCard
            label="Total Comments"
            value={content.totalComments}
            icon={MessageSquare}
            color="blue"
          />
          <MetricCard
            label="Total Likes"
            value={content.totalLikes}
            icon={Heart}
            color="rose"
          />
          <MetricCard
            label="Posts (7 Days)"
            value={content.posts7Days}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
      </div>

      {/* Reports */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-indigo-600" /> Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Pending"
            value={reports.pending}
            icon={AlertTriangle}
            color="amber"
          />
          <MetricCard
            label="Reviewed"
            value={reports.reviewed}
            icon={Shield}
            color="blue"
          />
          <MetricCard
            label="Resolved"
            value={reports.resolved}
            icon={Shield}
            color="emerald"
          />
          <MetricCard
            label="Dismissed"
            value={reports.dismissed}
            icon={AlertTriangle}
            color="slate"
          />
        </div>
      </div>

      {/* Department Distribution */}
      {departmentDistribution && departmentDistribution.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" /> Department Distribution
          </h2>
          <div className="space-y-3">
            {departmentDistribution.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-gray-300">
                  {dept.department || 'Unassigned'}
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {dept.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Trends */}
      {postTrends && postTrends.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" /> Post Trends (Last 30 Days)
          </h2>
          <div className="space-y-2">
            {postTrends.map((trend, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-gray-300">
                  {trend.date}
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {trend.count} posts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-slate-700',
  }

  const colors = colorClasses[color] || colorClasses.indigo

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
        </div>
        <div className={`p-2 rounded-lg border ${colors}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
