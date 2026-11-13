import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  MessageSquare,
  Heart,
  AlertTriangle,
  Shield,
  TrendingUp,
  Calendar,
  BarChart3,
  Loader2,
  Clock,
  RefreshCw,
  ChevronRight,
  Inbox,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { apiGetAnalyticsDashboard } from '../../utils/auth'

const COLORS = ['#5B5FEF', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#3b82f6', '#14b8a6']

// Custom styled tooltip matching SWISH dark & light theme
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-base-900/95 dark:bg-base-900/95 backdrop-blur-sm text-white px-3 py-2 rounded-xl shadow-lg border border-base-700/50 text-xs">
        <p className="font-semibold text-base-300 mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <div key={`tooltip-${idx}`} className="flex items-center gap-2 text-[11px] py-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-base-300">{entry.name}:</span>
            <span className="font-bold text-white">{entry.value?.toLocaleString?.() ?? entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function CollegeAdminAnalytics() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)
  const activeRequestIdRef = useRef(0)

  const fetchAnalytics = useCallback(
    async (selectedPeriod = period, isManual = false) => {
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
    },
    [period, analytics]
  )

  useEffect(() => {
    fetchAnalytics(period)
    const refreshInterval = setInterval(() => {
      fetchAnalytics(period, false)
    }, 5 * 60 * 1000)
    return () => clearInterval(refreshInterval)
  }, [period])

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 size={36} className="animate-spin text-accent-600 dark:text-accent-400" />
        <p className="text-xs font-medium text-base-500 dark:text-base-400">Loading college analytics...</p>
      </div>
    )
  }

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 bg-white dark:bg-base-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 p-8 max-w-md mx-auto my-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
          <AlertTriangle size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-base-900 dark:text-white font-heading">Analytics Unavailable</h3>
          <p className="text-xs text-base-500 dark:text-base-400 mt-1">{error}</p>
        </div>
        <button
          onClick={() => fetchAnalytics(period, true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white text-xs font-semibold rounded-xl hover:bg-accent-700 transition-colors shadow-xs"
        >
          <RefreshCw size={14} /> Retry Loading
        </button>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-base-500 dark:text-base-500 text-sm">No analytics data available</p>
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
    growth = {},
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

  const hasActivityData = activityTrends.some(
    (t) => (t.posts || 0) > 0 || (t.comments || 0) > 0 || (t.count || 0) > 0
  )
  const hasUserData = userTrends.some((t) => (t.users || 0) > 0 || (t.count || 0) > 0)
  const hasModerationData = moderationTrends.some(
    (t) => (t.reports || 0) > 0 || (t.resolved || 0) > 0
  )
  const hasDeptData = departmentDistribution && departmentDistribution.length > 0

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. HEADER & CONTROLS ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-base-900 dark:text-white font-heading">Analytics Dashboard</h1>
          <p className="text-base-500 dark:text-base-400 text-xs sm:text-sm mt-0.5">
            Deep insights into campus engagement, user registrations, and moderation activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-base-500 dark:text-base-400 bg-white dark:bg-base-900 px-3 py-1.5 rounded-xl border border-base-150 dark:border-[rgba(255,255,255,0.07)]">
            <Clock size={13} className="text-base-400" />
            <span>Updated: {formatLastUpdated()}</span>
            <button
              onClick={() => fetchAnalytics(period, true)}
              disabled={isRefreshing}
              className="p-1 hover:bg-base-100 dark:hover:bg-base-800 rounded text-base-500 hover:text-base-900 dark:hover:text-white transition-colors disabled:opacity-50 ml-0.5"
              title="Refresh Analytics"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-accent-600' : ''} />
            </button>
          </div>

          {/* Period Toggle Pills */}
          <div className="flex bg-base-100 dark:bg-base-800 p-1 rounded-xl border border-base-200/50 dark:border-base-700/60">
            {[
              { value: 'today', label: 'Today' },
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
              { value: 'all', label: 'All Time' },
            ].map((p) => {
              const active = period === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${active
                      ? 'bg-white dark:bg-base-700 text-accent-600 dark:text-white shadow-xs'
                      : 'text-base-600 dark:text-base-400 hover:text-base-900 dark:hover:text-white'
                    }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 2. DYNAMIC DATE RANGE BANNER ─────────────────────────────────── */}
      {dateRange && (
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-base-500 dark:text-base-400 bg-base-50 dark:bg-base-900/40 px-3.5 py-2 rounded-xl border border-base-150 dark:border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-accent-500 shrink-0" />
            <span>{formatRangeText()}</span>
          </div>
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-accent-600 dark:text-accent-400 text-[11px] font-semibold">
              <Loader2 size={12} className="animate-spin" /> Updating data...
            </span>
          )}
        </div>
      )}

      {/* ── 3. METRICS DOMAINS (Structured 3-Domain Overview) ─────────────── */}
      <div className="space-y-5">
        {/* Domain 1: User & Community Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-base-400 dark:text-base-500 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <Users size={14} className="text-accent-600 dark:text-accent-400" />
              Community & Accounts
            </h2>
            <button
              onClick={() => navigate('/college-admin/students')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Manage Directory</span>
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

        {/* Domain 2: Content & Engagement Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-base-400 dark:text-base-500 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <BarChart3 size={14} className="text-accent-600 dark:text-accent-400" />
              Content & Engagement
            </h2>
            <button
              onClick={() => navigate('/college-admin/moderation')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Moderate Content</span>
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

        {/* Domain 3: Reports & Safety Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-base-400 dark:text-base-500 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <AlertTriangle size={14} className="text-amber-500" />
              Moderation & Safety
            </h2>
            <button
              onClick={() => navigate('/college-admin/reports')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All Reports</span>
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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
              label="Under Review"
              value={reports.reviewed}
              icon={Shield}
              color="blue"
              onClick={() => navigate('/college-admin/reports')}
              clickable
            />
            <MetricCard
              label="Resolved Actions"
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
      </div>

      {/* ── 4. BALANCED ANALYTICS CHARTS (2x2 Grid) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Post & Comment Activity Over Time */}
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <TrendingUp size={16} className="text-accent-600 dark:text-accent-400" />
                Post & Comment Activity
              </h3>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                {period === 'today' ? 'Hourly View' : 'Daily Volume'}
              </p>
            </div>
          </div>

          {!hasActivityData ? (
            <EmptyChartState message="No post or comment activity recorded for this period." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activityTrends?.length > 0 ? activityTrends : postTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => {
                      if (period === 'today') return value
                      const d = new Date(value)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey={activityTrends?.length > 0 ? 'posts' : 'count'}
                    stroke="#5B5FEF"
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

        {/* Chart 2: User Registrations Over Time */}
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                User Registrations Over Time
              </h3>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                {period === 'today' ? 'Hourly Registrations' : 'Daily Registrations'}
              </p>
            </div>
          </div>

          {!hasUserData ? (
            <EmptyChartState message="No new user registrations recorded for this period." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => {
                      if (period === 'today') return value
                      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="users" fill="#10b981" radius={[5, 5, 0, 0]} name="New Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: Department Distribution */}
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <PieChartIcon size={16} className="text-violet-600 dark:text-violet-400" />
                Department Distribution
              </h3>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                Users across academic departments
              </p>
            </div>
            <button
              onClick={() => navigate('/college-admin/departments')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Manage</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {!hasDeptData ? (
            <EmptyChartState message="No department allocation data available." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution.map((d) => ({
                      name: d.department || 'Unassigned',
                      value: d.count,
                    }))}
                    cx="50%"
                    cy="48%"
                    outerRadius={75}
                    innerRadius={36}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {departmentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Report & Moderation Trends */}
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <AlertTriangle size={16} className="text-amber-500" />
                Report & Moderation Trends
              </h3>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                Reports filed vs. resolved
              </p>
            </div>
            <button
              onClick={() => navigate('/college-admin/reports')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Reports</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {!hasModerationData ? (
            <EmptyChartState message="No reports or moderation actions recorded for this period." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moderationTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(value) => {
                      if (period === 'today') return value
                      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    name="Reports Filed"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 2.5 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved / Actions"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 2.5 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── REUSABLE DOMAIN METRIC CARD ──────────────────────────────────────────────
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
    indigo: 'bg-accent-50 dark:bg-accent-950/50 text-accent-600 dark:text-accent-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    slate: 'bg-base-100 dark:bg-base-800 text-base-600 dark:text-base-300',
  }

  const iconStyle = colorClasses[color] || colorClasses.indigo

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between ${clickable
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-accent-300 dark:hover:border-accent-700/60'
          : 'shadow-xs'
        }`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') onClick?.()
          }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-xl ${iconStyle} flex items-center justify-center shrink-0`}>
          <Icon size={16} />
        </div>
        {growthLabel && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${growthDirection === 'up'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : growthDirection === 'down'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  : 'bg-base-100 dark:bg-base-800 text-base-500 dark:text-base-400'
              }`}
            title={comparisonLabel || 'vs previous period'}
          >
            {growthLabel}
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-extrabold text-base-900 dark:text-white leading-tight font-heading">
          {typeof value === 'number' ? value.toLocaleString() : (value ?? 0)}
        </p>
        <p className="text-xs font-semibold text-base-500 dark:text-base-400 mt-1 truncate">{label}</p>
        {comparisonLabel && (
          <p className="text-[10px] text-base-400 dark:text-base-500 mt-0.5 truncate">{comparisonLabel}</p>
        )}
      </div>
    </div>
  )
}

function EmptyChartState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 text-center p-6 bg-base-50 dark:bg-base-900/30 rounded-xl border border-dashed border-base-200 dark:border-base-800">
      <Inbox size={28} className="text-base-300 dark:text-base-600 mb-2 opacity-60" />
      <p className="text-xs text-base-500 dark:text-base-400 font-medium">{message}</p>
    </div>
  )
}
