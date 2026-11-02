import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, MessageSquare, Heart, AlertTriangle, Shield, TrendingUp,
  Calendar, BarChart3, Loader2, Clock, RefreshCw, ChevronRight, Inbox
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { apiGetAnalyticsDashboard } from '../../utils/auth'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6']

export default function CollegeAdminAnalytics() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)
  const activeRequestIdRef = useRef(0)

  const fetchAnalytics = useCallback(async (selectedPeriod = period, isManual = false) => {
    const requestId = ++activeRequestIdRef.current
    if (isManual || !analytics) {
      if (!analytics) setLoading(true)
      else setIsRefreshing(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const res = await apiGetAnalyticsDashboard({
        period: selectedPeriod,
        timezoneOffset: new Date().getTimezoneOffset(),
      })

      // Stale request protection: if a newer request was dispatched while this was in-flight, discard
      if (requestId !== activeRequestIdRef.current) return

      if (res && res.ok && res.analytics) {
        setAnalytics(res.analytics)
        setLastUpdated(new Date())
        setError(null)
      } else {
        setError(res?.error || 'Failed to load analytics')
      }
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return
      console.error('[CollegeAdminAnalytics] Error:', err)
      setError('Failed to load analytics. Please try again.')
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [period, analytics])

  useEffect(() => {
    fetchAnalytics(period)
    // Background refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchAnalytics(period, false)
    }, 5 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [period])

  // Initial full-page loading skeleton/spinner
  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 size={36} className="animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Loading college analytics...</p>
      </div>
    )
  }

  // Error state when no data could be loaded
  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 p-8 max-w-md mx-auto my-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
          <AlertTriangle size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Analytics Unavailable</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{error}</p>
        </div>
        <button
          onClick={() => fetchAnalytics(period, true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-gray-500 text-sm">No analytics data available</p>
      </div>
    )
  }

  const {
    users = {},
    content = {},
    reports = {},
    departmentDistribution = [],
    postTrends = [],
    userTrends = [],
    dateRange,
    activityTrends = [],
    moderationTrends = [],
    growth = {}
  } = analytics

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Just now'
    return lastUpdated.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatRangeText = () => {
    if (!dateRange?.start || !dateRange?.end) return ''
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)

    if (period === 'today') {
      return `Showing data for Today (${start.toLocaleDateString()})`
    }
    if (period === 'all') {
      return `Showing all recorded data (from ${start.toLocaleDateString()} to ${end.toLocaleDateString()})`
    }
    return `Showing data from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
  }

  // Dynamic period-sensitive labels & values
  const userPeriodLabel =
    period === 'today'
      ? 'New (Today)'
      : period === '7days'
      ? 'New (7 Days)'
      : period === '30days'
      ? 'New (30 Days)'
      : 'New (All Time)'

  const userPeriodVal =
    period === 'today'
      ? (users.currentPeriod ?? users.newToday ?? 0)
      : period === '7days'
      ? (users.new7Days ?? users.currentPeriod ?? 0)
      : period === '30days'
      ? (users.new30Days ?? users.currentPeriod ?? 0)
      : (users.total ?? 0)

  const postPeriodLabel =
    period === 'today'
      ? 'Posts (Today)'
      : period === '7days'
      ? 'Posts (7 Days)'
      : period === '30days'
      ? 'Posts (30 Days)'
      : 'Posts (All Time)'

  const postPeriodVal =
    period === 'today'
      ? (content.currentPeriodPosts ?? content.postsToday ?? 0)
      : period === '7days'
      ? (content.posts7Days ?? content.currentPeriodPosts ?? 0)
      : period === '30days'
      ? (content.posts30Days ?? content.currentPeriodPosts ?? 0)
      : (content.totalPosts ?? 0)

  // Determine whether trend arrays have actual data points
  const hasActivityData = activityTrends.some(t => (t.posts || 0) > 0 || (t.comments || 0) > 0 || (t.count || 0) > 0)
  const hasUserData = userTrends.some(t => (t.users || 0) > 0 || (t.count || 0) > 0)
  const hasModerationData = moderationTrends.some(t => (t.reports || 0) > 0 || (t.resolved || 0) > 0)

  return (
    <div className="space-y-6">
      {/* Header with Period Filters & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">
            Overview of your college's community activity and engagement
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <Clock size={13} className="text-slate-400" />
            <span>Updated: {formatLastUpdated()}</span>
            <button
              onClick={() => fetchAnalytics(period, true)}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 ml-1"
              title="Refresh Analytics"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
            </button>
          </div>

          {/* Period Toggle Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/60">
            {[
              { value: 'today', label: 'Today' },
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
              { value: 'all', label: 'All' },
            ].map((p) => {
              const active = period === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Date Range Banner */}
      {dateRange && (
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-gray-400 bg-slate-50/70 dark:bg-slate-900/40 px-3.5 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-indigo-500 shrink-0" />
            <span>{formatRangeText()}</span>
          </div>
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-[11px]">
              <Loader2 size={12} className="animate-spin" /> Updating...
            </span>
          )}
        </div>
      )}

      {/* User Metrics */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
          <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span>User Metrics</span>
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
            onClick={() => navigate('/college-admin/students')}
            clickable
          />
          <MetricCard
            label="Active Users"
            value={users.active}
            icon={Shield}
            color="emerald"
            onClick={() => navigate('/college-admin/students')}
            clickable
          />
          <MetricCard
            label="Suspended Users"
            value={users.suspended}
            icon={AlertTriangle}
            color="rose"
            onClick={() => navigate('/college-admin/students')}
            clickable
          />
          <MetricCard
            label={userPeriodLabel}
            value={userPeriodVal}
            icon={Calendar}
            color="blue"
            growthLabel={growth?.users?.label}
            growthDirection={growth?.users?.direction}
            comparisonLabel={growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/students')}
            clickable
          />
        </div>
      </div>

      {/* Content Metrics */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
          <BarChart3 size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span>Content Metrics</span>
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
            onClick={() => navigate('/college-admin/moderation')}
            clickable
          />
          <MetricCard
            label="Total Comments"
            value={content.totalComments}
            icon={MessageSquare}
            color="blue"
            growthLabel={growth?.comments?.label}
            growthDirection={growth?.comments?.direction}
            comparisonLabel={growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/moderation')}
            clickable
          />
          <MetricCard
            label="Total Likes"
            value={content.totalLikes}
            icon={Heart}
            color="rose"
            clickable={false}
          />
          <MetricCard
            label={postPeriodLabel}
            value={postPeriodVal}
            icon={TrendingUp}
            color="emerald"
            growthLabel={growth?.posts?.label}
            growthDirection={growth?.posts?.direction}
            comparisonLabel={growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/moderation')}
            clickable
          />
        </div>
      </div>

      {/* Reports Metrics */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <span>Reports & Moderation</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Pending Reports"
            value={reports.pending}
            icon={AlertTriangle}
            color="amber"
            growthLabel={growth?.reports?.label}
            growthDirection={growth?.reports?.direction}
            comparisonLabel={growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <MetricCard
            label="Reviewed Reports"
            value={reports.reviewed}
            icon={Shield}
            color="blue"
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <MetricCard
            label="Resolved Reports"
            value={reports.resolved}
            icon={Shield}
            color="emerald"
            growthLabel={growth?.resolved?.label}
            growthDirection={growth?.resolved?.direction}
            comparisonLabel={growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <MetricCard
            label="Dismissed Reports"
            value={reports.dismissed}
            icon={AlertTriangle}
            color="slate"
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
        </div>
      </div>

      {/* Department Distribution */}
      {departmentDistribution && departmentDistribution.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Department Distribution</span>
            </h2>
            <button
              onClick={() => navigate('/college-admin/departments')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Departments</span>
              <ChevronRight size={12} />
            </button>
          </div>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Trends Chart — Posts & Comments Activity Over Time */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Post & Comment Activity Over Time</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">
            {period === 'today' ? 'Hourly View' : 'Daily View'}
          </span>
        </div>

        {!hasActivityData ? (
          <EmptyChartState message="No post or comment activity was recorded for this period." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrends?.length > 0 ? activityTrends : postTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => {
                    if (period === 'today') return value
                    const d = new Date(value)
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelFormatter={(value) => {
                    if (period === 'today') return `Hour ${value}`
                    return new Date(value).toLocaleDateString()
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey={activityTrends?.length > 0 ? 'posts' : 'count'}
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={period === 'today' ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                  name="Posts Published"
                />
                {activityTrends?.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="comments"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={period === 'today' ? { r: 3 } : false}
                    activeDot={{ r: 5 }}
                    name="Comments Made"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* User Registration Trends Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span>User Registrations Over Time</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">
            {period === 'today' ? 'Hourly Registrations' : 'Daily Registrations'}
          </span>
        </div>

        {!hasUserData ? (
          <EmptyChartState message="No new user registrations were recorded for this period." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => {
                    if (period === 'today') return value
                    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelFormatter={(value) => {
                    if (period === 'today') return `Hour ${value}`
                    return new Date(value).toLocaleDateString()
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Moderation Trends Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <span>Report & Moderation Trends</span>
          </h2>
          <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">Reports Filed vs. Resolved</span>
        </div>

        {!hasModerationData ? (
          <EmptyChartState message="No reports or moderation actions were recorded for this period." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moderationTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
                  className="text-xs text-slate-500 dark:text-gray-500"
                  tickFormatter={(value) => {
                    if (period === 'today') return value
                    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis className="text-xs text-slate-500 dark:text-gray-500" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelFormatter={(value) => {
                    if (period === 'today') return `Hour ${value}`
                    return new Date(value).toLocaleDateString()
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={period === 'today' ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                  name="Reports Filed"
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={period === 'today' ? { r: 3 } : false}
                  activeDot={{ r: 5 }}
                  name="Reports Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  growthLabel,
  growthDirection,
  comparisonLabel,
  onClick,
  clickable = false,
}) {
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
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-5 transition-all duration-200 ${
        clickable
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700'
          : 'hover:shadow-xs'
      }`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 truncate font-medium">
            {label}
          </p>
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
        <div className={`p-2 rounded-lg border ${colors} flex-shrink-0 flex items-center justify-center`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function EmptyChartState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <Inbox size={32} className="text-slate-300 dark:text-gray-600 mb-2" />
      <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{message}</p>
      </div>
  )
}
