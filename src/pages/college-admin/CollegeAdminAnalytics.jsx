import { useState, useEffect } from 'react'
import { Users, MessageSquare, Heart, AlertTriangle, Shield, TrendingUp, Calendar, BarChart3, Loader2, Clock } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { apiGetAnalyticsDashboard } from '../../utils/auth'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function CollegeAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchAnalytics()
    // Refresh analytics every 5 minutes
    const refreshInterval = setInterval(() => fetchAnalytics(), 5 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await apiGetAnalyticsDashboard({ period })
      if (res.ok) {
        setAnalytics(res.analytics)
        setLastUpdated(new Date())
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

  const { users, content, reports, departmentDistribution, postTrends, userTrends, dateRange, activityTrends, moderationTrends, growth } = analytics

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never'
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">Overview of your college's activity and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-500">
            <Clock size={14} />
            <span>Last updated: {formatLastUpdated()}</span>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {[
              { value: 'today', label: 'Today' },
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
              { value: 'all', label: 'All' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dateRange && (
        <div className="text-xs text-slate-500 dark:text-gray-500">
          Showing data from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
        </div>
      )}

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
            growthLabel={growth?.users?.label}
            growthDirection={growth?.users?.direction}
            comparisonLabel={growth?.comparisonLabel}
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
            growthLabel={growth?.posts?.label}
            growthDirection={growth?.posts?.direction}
            comparisonLabel={growth?.comparisonLabel}
          />
          <MetricCard
            label="Total Comments"
            value={content.totalComments}
            icon={MessageSquare}
            color="blue"
            growthLabel={growth?.comments?.label}
            growthDirection={growth?.comments?.direction}
            comparisonLabel={growth?.comparisonLabel}
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
            growthLabel={growth?.reports?.label}
            growthDirection={growth?.reports?.direction}
            comparisonLabel={growth?.comparisonLabel}
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
            growthLabel={growth?.resolved?.label}
            growthDirection={growth?.resolved?.direction}
            comparisonLabel={growth?.comparisonLabel}
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentDistribution.map(d => ({ name: d.department || 'Unassigned', value: d.count }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Trends Chart — Posts + Comments dual line */}
      {(activityTrends?.length > 0 || postTrends?.length > 0) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" /> Post & Comment Activity Over Time
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrends?.length > 0 ? activityTrends : postTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => {
                    const d = new Date(value)
                    return activityTrends?.length > 0 && period === 'today'
                      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => {
                    const d = new Date(value)
                    return period === 'today'
                      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString()
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={activityTrends?.length > 0 ? 'posts' : 'count'}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="Posts"
                />
                {activityTrends?.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="comments"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Comments"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* User Registration Trends Chart */}
      {userTrends && userTrends.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" /> User Registrations Over Time
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Bar dataKey="users" fill="#10b981" name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Moderation Trends Chart — Reports filed vs. resolved */}
      {moderationTrends && moderationTrends.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" /> Report & Moderation Trends
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moderationTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => {
                    const d = new Date(value)
                    return period === 'today'
                      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => {
                    const d = new Date(value)
                    return period === 'today'
                      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString()
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Reports Filed"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, color, growthLabel, growthDirection, comparisonLabel }) {
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
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 hover:shadow-sm transition-all`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1 truncate">{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
            </p>
            {growthLabel && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  growthDirection === 'up'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : growthDirection === 'down'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title={comparisonLabel || 'vs previous period'}
              >
                {growthLabel}
              </span>
            )}
          </div>
          {comparisonLabel && (
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 truncate">{comparisonLabel}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg border ${colors} flex-shrink-0`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}
