import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  GraduationCap,
  Building2,
  Megaphone,
  TrendingUp,
  Activity,
  Calendar,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Clock,
  MessageSquare,
  AlertTriangle,
  Shield,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import {
  apiGetUserStats,
  apiGetNotices,
  apiGetActivityLogs,
  apiGetAnalyticsDashboard,
} from '../../utils/auth'
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Custom tooltip for chart clarity across light & dark modes
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

// ── PRIMARY PILLAR CARD (Consolidates Total + Active + Suspended) ─────────────
function PrimaryHubCard({
  icon: Icon,
  title,
  value,
  iconBg,
  iconColor,
  activeCount,
  suspendedCount,
  subtext,
  onClick,
  manageLabel,
}) {
  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 hover:border-accent-300 dark:hover:border-accent-700/60 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div
            className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-105`}
          >
            <Icon size={20} className={iconColor} />
          </div>
          <span className="text-xs font-semibold text-accent-600 dark:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {manageLabel || 'Manage'} <ChevronRight size={12} />
          </span>
        </div>

        <p className="text-xs font-semibold text-base-500 dark:text-base-400 mb-1">{title}</p>
        <p className="text-3xl font-extrabold text-base-900 dark:text-white tracking-tight leading-none font-heading">
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-base-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs">
        {activeCount !== undefined && suspendedCount !== undefined ? (
          <>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{activeCount.toLocaleString()} Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{suspendedCount.toLocaleString()} Suspended</span>
            </div>
          </>
        ) : (
          <span className="text-base-400 dark:text-base-500 font-medium">{subtext || 'Active in directory'}</span>
        )}
      </div>
    </div>
  )
}

// ── CAMPUS PULSE MINI-TILE (Period Activity Ribbon) ───────────────────────────
function PulseTile({
  icon: Icon,
  label,
  value,
  color,
  growthLabel,
  growthDirection,
  onClick,
  clickable,
}) {
  const colorMap = {
    indigo: 'bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
  }

  return (
    <div
      onClick={onClick}
      className={`p-3.5 rounded-xl bg-base-50/80 dark:bg-base-800/40 border border-base-150 dark:border-[rgba(255,255,255,0.06)] flex flex-col justify-between transition-all ${
        clickable
          ? 'cursor-pointer hover:bg-base-100/80 dark:hover:bg-base-800/70 hover:border-base-300 dark:hover:border-base-700'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.indigo}`}>
          <Icon size={14} />
        </div>
        {growthLabel && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              growthDirection === 'up'
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                : growthDirection === 'down'
                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                : 'bg-base-200 dark:bg-base-700 text-base-600 dark:text-base-300'
            }`}
          >
            {growthLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-xl font-bold text-base-900 dark:text-white leading-tight font-heading">
          {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
        </p>
        <p className="text-[11px] font-medium text-base-500 dark:text-base-400 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function CollegeAdminDashboard() {
  const navigate = useNavigate()
  const { currentUser } = useSwish()
  const [stats, setStats] = useState(null)
  const [todayStats, setTodayStats] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [recentNotices, setRecentNotices] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [period, setPeriod] = useState('today')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchDashboardData()
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000)
    const refreshInterval = setInterval(() => fetchDashboardData(), 300000)
    return () => {
      clearInterval(clockInterval)
      clearInterval(refreshInterval)
    }
  }, [period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, noticesRes, logsRes, analyticsRes] = await Promise.all([
        apiGetUserStats(),
        apiGetNotices(),
        apiGetActivityLogs({ limit: 6 }),
        apiGetAnalyticsDashboard({ period, timezoneOffset: new Date().getTimezoneOffset() }),
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

      if (analyticsRes.ok && analyticsRes.analytics) {
        setAnalyticsData(analyticsRes.analytics)
        setTodayStats({
          newUsers: analyticsRes.analytics.users.currentPeriod ?? analyticsRes.analytics.users.newToday ?? 0,
          newPosts: analyticsRes.analytics.content.currentPeriodPosts ?? analyticsRes.analytics.content.postsToday ?? 0,
          newComments: analyticsRes.analytics.content.currentPeriodComments ?? analyticsRes.analytics.content.commentsToday ?? 0,
          pendingReports: analyticsRes.analytics.reports.pending ?? 0,
          activeGrievances: analyticsRes.analytics.reports.reviewed ?? 0,
        })
      }

      if (noticesRes.ok && Array.isArray(noticesRes.notices)) {
        const seen = new Set()
        const unique = []
        for (const n of noticesRes.notices) {
          const id = (n.id || n._id)?.toString()
          if (id && !seen.has(id)) {
            seen.add(id)
            unique.push(n)
          }
        }
        setRecentNotices(unique.slice(0, 4))
      }

      if (logsRes.ok && Array.isArray(logsRes.logs)) {
        setActivityLogs(logsRes.logs.slice(0, 6))
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
      setError(err.message || 'Unable to connect to the dashboard service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        <p className="text-xs text-base-400">Loading dashboard statistics...</p>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-white dark:bg-base-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-base-900 dark:text-white mb-2 font-heading">Unable to Load Dashboard</h2>
        <p className="text-sm text-base-500 dark:text-base-400 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── 1. WELCOME HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-base-900 dark:text-white font-heading">
              {getGreeting()}, {currentUser?.name}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 border border-accent-200/60 dark:border-accent-800/60">
              {currentUser?.college || 'College Admin'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-base-500 dark:text-base-400">
            <Clock size={13} className="text-base-400" />
            <span>
              {formatDate(currentTime)} • {formatTime(currentTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate('/college-admin/analytics')}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-50 dark:bg-accent-950/50 hover:bg-accent-100 text-accent-700 dark:text-accent-300 text-xs font-semibold rounded-xl transition-colors"
          >
            <TrendingUp size={14} />
            <span>Deep Analytics</span>
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-base-800 border border-base-200 dark:border-base-700 hover:bg-base-50 dark:hover:bg-base-700/60 text-base-700 dark:text-base-200 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && stats && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-xs font-semibold text-rose-600 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 2. PRIMARY METRIC HUBS (Unified Pillars: Students, Faculty, Depts, Notices) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Students Hub */}
        <PrimaryHubCard
          icon={Users}
          title="Total Students"
          value={stats?.totalStudents}
          iconBg="bg-accent-50 dark:bg-accent-950/60"
          iconColor="text-accent-600 dark:text-accent-400"
          activeCount={stats?.activeStudents}
          suspendedCount={stats?.suspendedStudents}
          onClick={() => navigate('/college-admin/students')}
          manageLabel="Manage"
        />

        {/* Card 2: Faculty Hub */}
        <PrimaryHubCard
          icon={GraduationCap}
          title="Total Faculty"
          value={stats?.totalFaculty}
          iconBg="bg-purple-50 dark:bg-purple-950/60"
          iconColor="text-purple-600 dark:text-purple-400"
          activeCount={stats?.activeFaculty}
          suspendedCount={stats?.suspendedFaculty}
          onClick={() => navigate('/college-admin/faculty')}
          manageLabel="Manage"
        />

        {/* Card 3: Academic Departments */}
        <PrimaryHubCard
          icon={Building2}
          title="Academic Departments"
          value={stats?.totalDepartments}
          iconBg="bg-violet-50 dark:bg-violet-950/60"
          iconColor="text-violet-600 dark:text-violet-400"
          subtext="Active academic divisions"
          onClick={() => navigate('/college-admin/departments')}
          manageLabel="View"
        />

        {/* Card 4: Campus Notices */}
        <PrimaryHubCard
          icon={Megaphone}
          title="Active Notices"
          value={stats?.activeNotices}
          iconBg="bg-amber-50 dark:bg-amber-950/60"
          iconColor="text-amber-600 dark:text-amber-400"
          subtext="Published campus bulletins"
          onClick={() => navigate('/college-admin/notices')}
          manageLabel="Broadcast"
        />
      </div>

      {/* ── 3. CAMPUS PULSE (Period Activity Executive Ribbon) ────────────── */}
      <div className="bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accent-600 dark:text-accent-400" />
            <h2 className="text-sm font-bold text-base-900 dark:text-white uppercase tracking-wider font-heading">
              Campus Activity Pulse
            </h2>
            <span className="text-xs text-base-400 dark:text-base-500 font-normal">
              ({period === 'today' ? 'Today' : period === '7days' ? 'Past 7 Days' : 'Past 30 Days'})
            </span>
          </div>

          <div className="flex items-center gap-1 bg-base-100 dark:bg-base-800 p-1 rounded-xl">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === tab.id
                    ? 'bg-white dark:bg-base-700 text-accent-600 dark:text-white shadow-xs'
                    : 'text-base-600 dark:text-base-400 hover:text-base-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Compact Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <PulseTile
            icon={Users}
            label="New Registrations"
            value={todayStats?.newUsers ?? 0}
            color="indigo"
            growthLabel={analyticsData?.growth?.users?.label}
            growthDirection={analyticsData?.growth?.users?.direction}
          />
          <PulseTile
            icon={Activity}
            label="Posts Created"
            value={todayStats?.newPosts ?? 0}
            color="emerald"
            growthLabel={analyticsData?.growth?.posts?.label}
            growthDirection={analyticsData?.growth?.posts?.direction}
            onClick={() => navigate('/college-admin/moderation')}
            clickable
          />
          <PulseTile
            icon={MessageSquare}
            label="Comments Added"
            value={todayStats?.newComments ?? 0}
            color="blue"
            growthLabel={analyticsData?.growth?.comments?.label}
            growthDirection={analyticsData?.growth?.comments?.direction}
            onClick={() => navigate('/college-admin/moderation')}
            clickable
          />
          <PulseTile
            icon={AlertTriangle}
            label="Pending Reports"
            value={todayStats?.pendingReports ?? 0}
            color="amber"
            growthLabel={analyticsData?.growth?.reports?.label}
            growthDirection={analyticsData?.growth?.reports?.direction}
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <PulseTile
            icon={Shield}
            label="Resolved / Actions"
            value={analyticsData?.reports?.resolved ?? 0}
            color="violet"
            growthLabel={analyticsData?.growth?.resolved?.label}
            growthDirection={analyticsData?.growth?.resolved?.direction}
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
        </div>
      </div>

      {/* ── 4. ANALYTICS CHARTS (Balanced 2-Column Responsive Layout) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Post & Comment Activity */}
        <div className="bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <Activity size={16} className="text-accent-600 dark:text-accent-400" />
                Post & Comment Activity
              </h2>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                {period === 'today' ? 'Hourly distribution' : 'Daily volume'}
              </p>
            </div>
            <button
              onClick={() => navigate('/college-admin/analytics')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {(analyticsData?.activityTrends || analyticsData?.postTrends)?.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={analyticsData.activityTrends || analyticsData.postTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(val) => {
                      if (period === 'today') return val
                      const d = new Date(val)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    name="Posts"
                    stroke="#5B5FEF"
                    strokeWidth={2.5}
                    dot={{ fill: '#5B5FEF', r: 2.5 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="comments"
                    name="Comments"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ fill: '#0ea5e9', r: 2.5 }}
                    activeDot={{ r: 5 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-base-400 dark:text-base-500 text-xs">
              <MessageSquare size={28} className="mb-2 opacity-40" />
              <span>No activity recorded for this period</span>
            </div>
          )}
        </div>

        {/* Chart 2: User Registrations & Growth */}
        <div className="bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                User Registrations & Growth
              </h2>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                New students & faculty onboarded
              </p>
            </div>
            <button
              onClick={() => navigate('/college-admin/analytics')}
              className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {analyticsData?.userTrends && analyticsData.userTrends.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={analyticsData.userTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(val) => {
                      if (period === 'today') return val
                      const d = new Date(val)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="users"
                    name="New Users"
                    fill="#10b981"
                    radius={[5, 5, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-base-400 dark:text-base-500 text-xs">
              <Users size={28} className="mb-2 opacity-40" />
              <span>No user registrations recorded for this period</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. OPERATIONAL DUAL SECTION (Recent Notices & Activity Logs) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Recent Notices */}
        <div className="bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
              <Megaphone size={16} className="text-amber-500" />
              Recent Notices
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/college-admin/notices')}
                className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {recentNotices.length === 0 ? (
            <div className="text-center py-10">
              <Megaphone size={28} className="text-base-300 dark:text-base-600 mx-auto mb-2" />
              <p className="text-base-500 dark:text-base-400 text-xs font-medium">No notices published yet</p>
              <button
                onClick={() => navigate('/college-admin/notices')}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 text-white text-xs font-semibold rounded-lg hover:bg-accent-700 transition-colors"
              >
                <Plus size={13} /> Create Notice
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentNotices.map((notice, idx) => (
                <div
                  key={notice._id || notice.id || `notice-${idx}`}
                  className="flex items-start gap-3 p-3 bg-base-50 dark:bg-base-800/50 rounded-xl border border-base-100 dark:border-[rgba(255,255,255,0.06)]"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      notice.priority === 'urgent'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                        : notice.priority === 'high'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                        : 'bg-accent-50 dark:bg-accent-950/60 text-accent-600'
                    }`}
                  >
                    <Megaphone size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base-900 dark:text-white font-semibold text-xs truncate">
                        {notice.title}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          notice.published
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-base-200 text-base-600 dark:bg-base-700 dark:text-base-400'
                        }`}
                      >
                        {notice.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-base-500 dark:text-base-400 text-xs mt-0.5 line-clamp-1">
                      {notice.content}
                    </p>
                    <span className="text-[10px] text-base-400 mt-1 block">
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Activity Log & Quick Navigation */}
        <div className="bg-white dark:bg-base-900 rounded-2xl border border-base-150 dark:border-[rgba(255,255,255,0.07)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-base-900 dark:text-white flex items-center gap-2 font-heading">
                <Activity size={16} className="text-accent-600 dark:text-accent-400" />
                Recent Administration Actions
              </h2>
              <span className="text-xs text-base-400">Live logs</span>
            </div>

            {activityLogs.length === 0 ? (
              <div className="text-center py-10">
                <Activity size={28} className="text-base-300 dark:text-base-600 mx-auto mb-2" />
                <p className="text-base-500 dark:text-base-400 text-xs font-medium">No recent actions logged</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activityLogs.map((log, idx) => (
                  <div
                    key={log._id || log.id || `log-${idx}`}
                    className="flex items-center justify-between gap-3 p-2.5 bg-base-50 dark:bg-base-800/40 rounded-xl border border-base-100 dark:border-[rgba(255,255,255,0.06)] text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-base-800 dark:text-base-200 font-medium truncate">
                          {getActionDescription(log.actionType, log.resourceName)}
                        </p>
                        <p className="text-[10px] text-base-400">By {log.adminName || 'Admin'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-base-400 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hub Navigation Toolbar */}
          <div className="mt-4 pt-3 border-t border-base-100 dark:border-[rgba(255,255,255,0.06)] grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/college-admin/students')}
              className="px-2.5 py-1.5 bg-base-50 dark:bg-base-800/70 hover:bg-base-100 dark:hover:bg-base-800 rounded-lg text-xs font-semibold text-base-700 dark:text-base-300 transition-colors text-center"
            >
              Students
            </button>
            <button
              onClick={() => navigate('/college-admin/faculty')}
              className="px-2.5 py-1.5 bg-base-50 dark:bg-base-800/70 hover:bg-base-100 dark:hover:bg-base-800 rounded-lg text-xs font-semibold text-base-700 dark:text-base-300 transition-colors text-center"
            >
              Faculty
            </button>
            <button
              onClick={() => navigate('/college-admin/moderation')}
              className="px-2.5 py-1.5 bg-base-50 dark:bg-base-800/70 hover:bg-base-100 dark:hover:bg-base-800 rounded-lg text-xs font-semibold text-base-700 dark:text-base-300 transition-colors text-center"
            >
              Moderation
            </button>
            <button
              onClick={() => navigate('/college-admin/reports')}
              className="px-2.5 py-1.5 bg-base-50 dark:bg-base-800/70 hover:bg-base-100 dark:hover:bg-base-800 rounded-lg text-xs font-semibold text-base-700 dark:text-base-300 transition-colors text-center"
            >
              Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getActionDescription(actionType, resourceName) {
  const descriptions = {
    user_blocked: `Blocked user: ${resourceName}`,
    user_unblocked: `Unblocked user: ${resourceName}`,
    user_suspended: `Suspended user: ${resourceName}`,
    user_reactivated: `Reactivated user: ${resourceName}`,
    report_reviewed: `Reviewed report: ${resourceName}`,
    report_resolved: `Resolved report: ${resourceName}`,
    report_dismissed: `Dismissed report: ${resourceName}`,
    post_hidden: `Hidden post: ${resourceName}`,
    post_restored: `Restored post: ${resourceName}`,
    post_deleted: `Deleted post: ${resourceName}`,
    comment_hidden: `Hidden comment: ${resourceName}`,
    comment_restored: `Restored comment: ${resourceName}`,
    comment_deleted: `Deleted comment: ${resourceName}`,
    notice_created: `Created notice: ${resourceName}`,
    notice_edited: `Edited notice: ${resourceName}`,
    notice_pinned: `Pinned notice: ${resourceName}`,
    notice_unpinned: `Unpinned notice: ${resourceName}`,
    notice_deleted: `Deleted notice: ${resourceName}`,
    notice_published: `Published notice: ${resourceName}`,
    department_created: `Created dept: ${resourceName}`,
    department_edited: `Edited dept: ${resourceName}`,
    department_deactivated: `Deactivated dept: ${resourceName}`,
    department_activated: `Activated dept: ${resourceName}`,
    department_deleted: `Deleted dept: ${resourceName}`,
    warning_issued: `Issued warning to: ${resourceName}`,
  }
  return descriptions[actionType] || `${actionType?.replace(/_/g, ' ')}: ${resourceName || ''}`
}
