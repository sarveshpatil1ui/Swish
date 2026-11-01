import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, Building2, Megaphone,
  TrendingUp, Activity, Calendar, ArrowRight,
  AlertCircle, RefreshCw, Clock, MessageSquare, AlertTriangle,
  BarChart, LineChart
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiGetUserStats, apiGetNotices, apiGetActivityLogs, apiGetAnalyticsDashboard } from '../../utils/auth'
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

function TodayStatCard({ icon: Icon, label, value, color, onClick, clickable, growthLabel, growthDirection, comparisonLabel }) {
  const colorClasses = {
    indigo: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400',
    rose: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
  }

  const colors = colorClasses[color] || colorClasses.indigo

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl p-4 transition-all duration-200 ${
        clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 ${colors} rounded-lg flex items-center justify-center`}>
          <Icon size={16} />
        </div>
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
      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
        {typeof value === 'number' ? value.toLocaleString() : (value ?? '0')}
      </p>
      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
      {comparisonLabel && (
        <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 truncate">{comparisonLabel}</p>
      )}
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
    // Update clock every minute
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 60000)
    // Refresh analytics every 5 minutes
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
        apiGetActivityLogs({ limit: 10 }),
        apiGetAnalyticsDashboard({ period }),
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
          newUsers: analyticsRes.analytics.users.newToday ?? 0,
          newPosts: analyticsRes.analytics.content.postsToday ?? 0,
          newComments: analyticsRes.analytics.content.commentsToday ?? 0,
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
        setRecentNotices(unique.slice(0, 5))
      }

      if (logsRes.ok && Array.isArray(logsRes.logs)) {
        setActivityLogs(logsRes.logs)
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
      day: 'numeric'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
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
      {/* Welcome Header with Dynamic Date/Time */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {getGreeting()}, {currentUser?.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock size={14} className="text-slate-400" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">
              {formatDate(currentTime)} • {formatTime(currentTime)}
            </p>
          </div>
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

      {/* Today's Overview */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
              Today's Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
              Activity from {formatDate(currentTime)}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg">
            {['today', '7days', '30days'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7days' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <TodayStatCard
            icon={Users}
            label="New Registrations"
            value={todayStats?.newUsers ?? 0}
            color="indigo"
            growthLabel={analyticsData?.growth?.users?.label}
            growthDirection={analyticsData?.growth?.users?.direction}
            comparisonLabel={analyticsData?.growth?.comparisonLabel}
          />
          <TodayStatCard
            icon={Activity}
            label="New Posts"
            value={todayStats?.newPosts ?? 0}
            color="emerald"
            growthLabel={analyticsData?.growth?.posts?.label}
            growthDirection={analyticsData?.growth?.posts?.direction}
            comparisonLabel={analyticsData?.growth?.comparisonLabel}
          />
          <TodayStatCard
            icon={MessageSquare}
            label="New Comments"
            value={todayStats?.newComments ?? 0}
            color="blue"
            growthLabel={analyticsData?.growth?.comments?.label}
            growthDirection={analyticsData?.growth?.comments?.direction}
            comparisonLabel={analyticsData?.growth?.comparisonLabel}
          />
          <TodayStatCard
            icon={AlertTriangle}
            label="Pending Reports"
            value={todayStats?.pendingReports ?? 0}
            color="amber"
            growthLabel={analyticsData?.growth?.reports?.label}
            growthDirection={analyticsData?.growth?.reports?.direction}
            comparisonLabel={analyticsData?.growth?.comparisonLabel}
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <TodayStatCard
            icon={AlertCircle}
            label="Active Grievances"
            value={todayStats?.activeGrievances ?? 0}
            color="rose"
            onClick={() => navigate('/college-admin/reports')}
            clickable
          />
          <TodayStatCard
            icon={TrendingUp}
            label="Moderation Actions"
            value={analyticsData?.reports?.resolved ?? 0}
            color="violet"
            growthLabel={analyticsData?.growth?.resolved?.label}
            growthDirection={analyticsData?.growth?.resolved?.direction}
            comparisonLabel={analyticsData?.growth?.comparisonLabel}
          />
        </div>
        {lastUpdated && (
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-3">
            Last updated: {formatTime(lastUpdated)}
          </p>
        )}
      </div>

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

      {/* Activity Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Post/Comment Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-indigo-600 dark:text-indigo-400" />
              Post & Comment Activity
            </h2>
            <span className="text-xs text-slate-400 dark:text-gray-500">
              {period === 'today' ? 'Today' : period === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
            </span>
          </div>
          {(analyticsData?.activityTrends || analyticsData?.postTrends)?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RechartsLineChart data={analyticsData.activityTrends || analyticsData.postTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Line 
                  type="monotone" 
                  dataKey="posts" 
                  name="Posts"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="comments" 
                  name="Comments"
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-gray-500 text-sm">
              No activity data available for this period
            </div>
          )}
        </div>

        {/* User Registration Trends */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={20} className="text-emerald-600 dark:text-emerald-400" />
              User Registrations & Growth
            </h2>
            <span className="text-xs text-slate-400 dark:text-gray-500">
              {period === 'today' ? 'Today' : period === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
            </span>
          </div>
          {analyticsData?.userTrends && analyticsData.userTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RechartsBarChart data={analyticsData.userTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar 
                  dataKey="users" 
                  name="New Users" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-gray-500 text-sm">
              No registration data available for this period
            </div>
          )}
        </div>
      </div>

      {/* Report & Moderation Trends */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            Report & Moderation Trends
          </h2>
          <span className="text-xs text-slate-400 dark:text-gray-500">
            {period === 'today' ? 'Today' : period === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
          </span>
        </div>
        {analyticsData?.moderationTrends && analyticsData.moderationTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <RechartsLineChart data={analyticsData.moderationTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <Line 
                type="monotone" 
                dataKey="reports" 
                name="Reports Filed" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="resolved" 
                name="Resolved / Dismissed" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 dark:text-gray-500 text-sm">
            No report or moderation trend data available for this period
          </div>
        )}
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
            {recentNotices.map((notice, idx) => (
              <div
                key={notice._id || notice.id || `notice-${idx}`}
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

      {/* Activity Log */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
          <span className="text-xs text-slate-400 dark:text-gray-500">Last 10 actions</span>
        </div>
        {activityLogs.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No recent activity</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Admin actions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activityLogs.map((log, idx) => (
              <div
                key={log._id || log.id || `log-${idx}`}
                className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0">
                  <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium text-sm">{log.adminName}</p>
                  <p className="text-slate-500 dark:text-gray-500 text-xs mt-1">{getActionDescription(log.actionType, log.resourceName)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
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
    comment_hidden: `Hidden comment: ${resourceName}`,
    comment_restored: `Restored comment: ${resourceName}`,
    notice_created: `Created notice: ${resourceName}`,
    notice_edited: `Edited notice: ${resourceName}`,
    notice_pinned: `Pinned notice: ${resourceName}`,
    notice_unpinned: `Unpinned notice: ${resourceName}`,
    notice_deleted: `Deleted notice: ${resourceName}`,
    notice_published: `Published notice: ${resourceName}`,
    department_created: `Created department: ${resourceName}`,
    department_edited: `Edited department: ${resourceName}`,
    department_deactivated: `Deactivated department: ${resourceName}`,
    department_activated: `Activated department: ${resourceName}`,
    department_deleted: `Deleted department: ${resourceName}`,
  }
  return descriptions[actionType] || `${actionType}: ${resourceName}`
}
