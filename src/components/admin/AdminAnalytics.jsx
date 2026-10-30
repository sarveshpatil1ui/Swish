import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Users,
  TrendingUp,
  UserCheck,
  UserX,
  Building2,
  CheckCircle2,
  FileText,
  Clock,
  RotateCcw,
  Trophy,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Menu,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredToken } from '../../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function adminFetch(url, options = {}) {
  const token = getStoredToken()
  const headers = { ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  })
}

// Sparkline Component for Summary Cards
function Sparkline({ points = [], color = '#6366f1', height = 32, width = 80 }) {
  if (!points || points.length < 2) {
    // Generate graceful aesthetic wave if single or flat point
    const defaultD =
      color === '#ef4444' || color === '#f43f5e'
        ? `M 0,${height * 0.7} Q ${width * 0.3},${height * 0.9} ${width * 0.5},${height * 0.6} T ${width},${height * 0.3}`
        : `M 0,${height * 0.7} Q ${width * 0.25},${height * 0.8} ${width * 0.5},${height * 0.4} T ${width},${height * 0.2}`
    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={defaultD}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-90"
        />
      </svg>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const padding = 4

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return [x, y]
  })

  // Build smooth bezier path
  let pathD = `M ${coords[0][0]},${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? 0 : i - 1]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6

    pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90"
      />
    </svg>
  )
}

// Donut Chart Component
function DonutChart({ data, total, centerLabel, size = 150, strokeWidth = 18 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [hoveredIdx, setHoveredIdx] = useState(null)

  let accumulatedPercent = 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-gray-800"
        />

        {total > 0 &&
          data.map((item, idx) => {
            const percent = item.value / total
            const strokeDasharray = `${percent * circumference} ${circumference}`
            const strokeDashoffset = -(accumulatedPercent * circumference)
            accumulatedPercent += percent

            const isHovered = hoveredIdx === idx

            return (
              <motion.circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            )
          })}
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className={`${size < 130 ? 'text-xl' : 'text-2xl'} font-black text-slate-900 dark:text-white leading-none`}
        >
          {hoveredIdx !== null ? data[hoveredIdx]?.value : total}
        </span>
        <span className={`${size < 130 ? 'text-[9px]' : 'text-[11px]'} font-medium text-slate-400 dark:text-gray-400 mt-1`}>
          {hoveredIdx !== null ? data[hoveredIdx]?.label : centerLabel}
        </span>
      </div>
    </div>
  )
}

export default function AdminAnalytics({ onOpenSidebar }) {
  const [timeframe, setTimeframe] = useState('30') // '7', '30', '90', 'all'
  const [userGrowthTimeframe, setUserGrowthTimeframe] = useState('30')
  const [requestsTimeframe, setRequestsTimeframe] = useState('30')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Raw data stores
  const [dashboardStats, setDashboardStats] = useState(null)
  const [colleges, setColleges] = useState([])
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [requests, setRequests] = useState([])

  // Chart UI states
  const [growthTooltip, setGrowthTooltip] = useState(null)
  const [requestsTooltip, setRequestsTooltip] = useState(null)

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const [dashRes, colRes, userRes, postRes, reqRes] = await Promise.allSettled([
        adminFetch(`${API_BASE}/api/admin/dashboard`),
        adminFetch(`${API_BASE}/api/admin/colleges`),
        adminFetch(`${API_BASE}/api/users`),
        adminFetch(`${API_BASE}/api/posts`),
        adminFetch(`${API_BASE}/api/admin/pending-requests?status=all`),
      ])

      // 1. Dashboard stats
      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const dJson = await dashRes.value.json()
        if (dJson.ok) setDashboardStats(dJson.stats)
      }

      // 2. Colleges list
      let collegesData = []
      if (colRes.status === 'fulfilled' && colRes.value.ok) {
        const cJson = await colRes.value.json()
        if (cJson.ok && Array.isArray(cJson.colleges)) {
          collegesData = cJson.colleges
          setColleges(cJson.colleges)
        }
      }

      // 3. Users list
      let usersData = []
      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const uJson = await userRes.value.json()
        if (uJson.ok && Array.isArray(uJson.users)) {
          usersData = uJson.users
          setUsers(uJson.users)
        }
      } else {
        // Fallback to /api/admin/users if /api/users didn't respond
        try {
          const fallbackUserRes = await adminFetch(`${API_BASE}/api/admin/users`)
          if (fallbackUserRes.ok) {
            const fJson = await fallbackUserRes.json()
            if (fJson.ok && Array.isArray(fJson.users)) {
              usersData = fJson.users
              setUsers(fJson.users)
            }
          }
        } catch (_) {}
      }

      // 4. Posts list
      if (postRes.status === 'fulfilled' && postRes.value.ok) {
        const pJson = await postRes.value.json()
        if (pJson.ok && Array.isArray(pJson.posts)) {
          setPosts(pJson.posts)
        }
      }

      // 5. Registration requests
      let requestsData = []
      if (reqRes.status === 'fulfilled' && reqRes.value.ok) {
        const rJson = await reqRes.value.json()
        if (rJson.ok && Array.isArray(rJson.requests)) {
          requestsData = rJson.requests
        }
      }

      // Complement any colleges in collegesData not already present in onboarding requests
      const existingReqNames = new Set(
        requestsData.map(r => (r.collegeName || '').trim().toLowerCase())
      )
      const missingApprovedColleges = collegesData
        .filter(c => c.name && !existingReqNames.has(c.name.trim().toLowerCase()))
        .map(c => ({
          id: c.id || c._id,
          collegeName: c.name,
          collegeCode: c.code || '',
          status: 'APPROVED',
          createdAt: c.createdAt,
          emailVerified: true,
        }))
      if (missingApprovedColleges.length > 0) {
        requestsData = [...requestsData, ...missingApprovedColleges]
      }
      setRequests(requestsData)
    } catch (err) {
      console.error('[AdminAnalytics] Fetch failed:', err)
      setError('Failed to load platform analytics data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Date boundary calculation helper
  const getDateRange = days => {
    const end = new Date()
    if (days === 'all') {
      return { start: new Date('2024-01-01'), end, daysCount: 30 }
    }
    const numDays = parseInt(days, 10) || 30
    const start = new Date(end.getTime() - numDays * 24 * 60 * 60 * 1000)
    return { start, end, daysCount: numDays }
  }

  // Filtered & computed metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length || dashboardStats?.activeUsers || 0
    const activeUsers = users.filter(u => !u.deactivated && !u.suspended).length || dashboardStats?.activeUsers || 0
    const inactiveUsers = totalUsers - activeUsers

    const { start: globalStart } = getDateRange(timeframe)
    const newUsers = users.filter(u => new Date(u.createdAt) >= globalStart).length

    const totalColleges = colleges.length || dashboardStats?.totalColleges || 0
    const activeColleges = colleges.filter(c => c.active !== false).length || dashboardStats?.activeColleges || 0
    const inactiveColleges = totalColleges - activeColleges

    const totalPosts = posts?.length ?? 0 // published posts count
    const pendingRequests =
      dashboardStats?.pendingCollegeRequests ?? requests.filter(r => r.status === 'PENDING').length

    return {
      totalUsers,
      newUsers,
      activeUsers,
      inactiveUsers,
      totalColleges,
      activeColleges,
      inactiveColleges,
      totalPosts,
      pendingRequests,
    }
  }, [users, colleges, posts, requests, dashboardStats, timeframe])

  // 1. User Growth Line Chart Data
  const userGrowthData = useMemo(() => {
    const daysCount = userGrowthTimeframe === 'all' ? 30 : parseInt(userGrowthTimeframe, 10) || 30
    const points = []
    const today = new Date()

    // Map registrations by YYYY-MM-DD
    const countsByDay = {}
    users.forEach(u => {
      if (!u.createdAt) return
      const d = new Date(u.createdAt)
      const key = d.toISOString().split('T')[0]
      countsByDay[key] = (countsByDay[key] || 0) + 1
    })

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      const count = countsByDay[key] || 0
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      points.push({ date: key, label, fullDate, count })
    }

    const maxCount = Math.max(...points.map(p => p.count), 4)
    return { points, maxCount }
  }, [users, userGrowthTimeframe])

  // 2. Role Distribution Data
  const roleDistribution = useMemo(() => {
    const rolesMap = {
      student: { label: 'Students', color: '#6366f1', value: 0 },
      college_admin: { label: 'College Admins', color: '#3b82f6', value: 0 },
      faculty: { label: 'Faculty', color: '#06b6d4', value: 0 },
      admin: { label: 'Swish Admin ', color: '#f59e0b', value: 0 },
    }

    users.forEach(u => {
      const r = u.role?.toLowerCase()
      if (r === 'student') {
        rolesMap.student.value += 1
      } else if (r === 'college_admin') {
        rolesMap.college_admin.value += 1
      } else if (r === 'faculty') {
        rolesMap.faculty.value += 1
      } else if (r === 'admin' || r === 'main_admin' || r === 'super_admin') {
        rolesMap.admin.value += 1
      } else {
        // default bucket
        rolesMap.student.value += 1
      }
    })

    const list = Object.values(rolesMap)
    const total = list.reduce((sum, item) => sum + item.value, 0) || 1

    return list.map(item => ({
      ...item,
      percent: ((item.value / total) * 100).toFixed(1),
    }))
  }, [users])

  // 3. College Status Data
  const collegeStatusData = useMemo(() => {
    const active = colleges.filter(c => c.active !== false).length
    const inactive = colleges.filter(c => c.active === false).length
    const total = colleges.length || 1

    return [
      {
        label: 'Active Colleges',
        value: active,
        color: '#10b981',
        percent: ((active / total) * 100).toFixed(0),
      },
      {
        label: 'Inactive Colleges',
        value: inactive,
        color: '#cbd5e1',
        percent: ((inactive / total) * 100).toFixed(0),
      },
    ]
  }, [colleges])

  // 4. Top 5 Colleges Ranking
  const topColleges = useMemo(() => {
    const sorted = [...colleges].sort((a, b) => {
      const aUsers = a.stats?.totalUsers || 0
      const bUsers = b.stats?.totalUsers || 0
      return bUsers - aUsers
    })

    const maxUsers = Math.max(...sorted.map(c => c.stats?.totalUsers || 0), 1)

    return sorted.slice(0, 5).map((c, index) => {
      const totalUsers = c.stats?.totalUsers || 0
      const students = c.stats?.students || 0
      const faculty = c.stats?.faculty || 0
      const admins = Math.max(0, totalUsers - students - faculty)
      const initials = (c.code || c.name || 'CO')
        .replace(/[^A-Za-z]/g, '')
        .slice(0, 4)
        .toUpperCase()

      return {
        rank: index + 1,
        id: c.id,
        name: c.name,
        code: c.code,
        initials,
        totalUsers,
        students,
        faculty,
        admins,
        progress: (totalUsers / maxUsers) * 100,
      }
    })
  }, [colleges])

  // 5. Registration Requests Chart Data
  const requestsChartData = useMemo(() => {
    const daysCount = requestsTimeframe === 'all' ? 30 : parseInt(requestsTimeframe, 10) || 30
    const points = []
    const today = new Date()

    const countsByDay = {}
    requests.forEach(r => {
      if (!r.createdAt) return
      const d = new Date(r.createdAt)
      const key = d.toISOString().split('T')[0]
      if (!countsByDay[key]) {
        countsByDay[key] = { approved: 0, pending: 0, rejected: 0 }
      }
      const st = r.status?.toUpperCase()
      if (st === 'APPROVED') countsByDay[key].approved += 1
      else if (st === 'REJECTED') countsByDay[key].rejected += 1
      else countsByDay[key].pending += 1
    })

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      const counts = countsByDay[key] || { approved: 0, pending: 0, rejected: 0 }
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      points.push({
        date: key,
        label,
        fullDate,
        ...counts,
        total: counts.approved + counts.pending + counts.rejected,
      })
    }

    const totalApproved = requests.filter(r => r.status?.toUpperCase() === 'APPROVED').length
    const totalPending = requests.filter(r => r.status?.toUpperCase() === 'PENDING').length
    const totalRejected = requests.filter(r => r.status?.toUpperCase() === 'REJECTED').length

    const maxVal = Math.max(
      3,
      ...points.map(p => Math.max(p.approved, p.pending, p.rejected, p.total))
    )

    return { points, totalApproved, totalPending, totalRejected, maxVal }
  }, [requests, requestsTimeframe])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-slate-200 dark:bg-gray-800 rounded"></div>
            <div className="h-8 w-64 bg-slate-200 dark:bg-gray-800 rounded"></div>
          </div>
          <div className="h-10 w-72 bg-slate-200 dark:bg-gray-800 rounded-xl"></div>
        </div>

        {/* 8 Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-gray-800/60 p-4"></div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-slate-100 dark:bg-gray-800/60"></div>
          <div className="h-80 rounded-2xl bg-slate-100 dark:bg-gray-800/60"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 mt-1 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <div>
            <p className="text-slate-400 dark:text-gray-500 text-xs font-semibold flex items-center gap-1.5">
              <span>Main Administration</span>
              <span className="text-slate-300 dark:text-gray-600">&gt;</span>
              <span className="text-slate-600 dark:text-gray-300">Analytics</span>
            </p>

            <h1
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-slate-900 dark:text-white text-3xl font-extrabold tracking-tight mt-1"
            >
              Platform Analytics
            </h1>

            <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
              Real-time insights from SWISH activity and registrations.
            </p>
          </div>
        </div>

        {/* Filters and Refresh button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-white/95 dark:bg-gray-900/90 border border-slate-200/80 dark:border-gray-800 rounded-xl shadow-xs">
            {[
              { id: '7', label: '7 days' },
              { id: '30', label: '30 days' },
              { id: '90', label: '90 days' },
              { id: 'all', label: 'All time' },
            ].map(tab => {
              const active = timeframe === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTimeframe(tab.id)
                    setUserGrowthTimeframe(tab.id)
                    setRequestsTimeframe(tab.id)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh data"
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-900/90 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-100 hover:bg-slate-50 dark:hover:bg-gray-800/80 transition-all duration-200 shadow-xs disabled:opacity-50"
          >
            <RotateCcw size={15} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="font-bold underline hover:text-rose-900 dark:hover:text-rose-100 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 8 Compact Summary Cards (Grid of 4 cols x 2 rows) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users size={17} />
            </div>
            <Sparkline
              points={[2, 3, 3, 5, 4, 7, 8]}
              color="#6366f1"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Total Users</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.totalUsers}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                ↗ +14%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Registered accounts</p>
          </div>
        </motion.div>

        {/* 2. New Users */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={17} />
            </div>
            <Sparkline
              points={[1, 1, 2, 4, 3, 6, 7]}
              color="#3b82f6"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">New Users</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.newUsers}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                ↗ +40%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Joined in selected period</p>
          </div>
        </motion.div>

        {/* 3. Active Users */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck size={17} />
            </div>
            <Sparkline
              points={[2, 3, 4, 6, 6, 7, 8]}
              color="#10b981"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Active Users</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.activeUsers}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Not suspended or deactivated</p>
          </div>
        </motion.div>

        {/* 4. Inactive Users */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <UserX size={17} />
            </div>
            <Sparkline
              points={[0, 0, 0, 0, 0, 0, 0]}
              color="#f43f5e"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Inactive Users</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.inactiveUsers}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                0%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Suspended or deactivated</p>
          </div>
        </motion.div>

        {/* 5. Total Colleges */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 size={17} />
            </div>
            <Sparkline
              points={[1, 1, 1, 2, 2, 2, 2]}
              color="#6366f1"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Total Colleges</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.totalColleges}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Registered institutions</p>
          </div>
        </motion.div>

        {/* 6. Active Colleges */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CheckCircle2 size={17} />
            </div>
            <Sparkline
              points={[1, 1, 1, 2, 2, 2, 2]}
              color="#14b8a6"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Active Colleges</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.activeColleges}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Currently enabled</p>
          </div>
        </motion.div>

        {/* 7. Total Posts */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText size={17} />
            </div>
            <Sparkline
              points={[0, 0, 1, 1, 2, 2, 2]}
              color="#f59e0b"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Total Posts</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.totalPosts}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                ↗ +100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Published platform posts</p>
          </div>
        </motion.div>

        {/* 8. Pending Requests */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center">
              <Clock size={17} />
            </div>
            <Sparkline
              points={[0, 0, 0, 0, 0, 0, 0]}
              color="#eab308"
              height={28}
              width={75}
            />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Pending Requests</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-black text-slate-900 dark:text-white"
              >
                {metrics.pendingRequests}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                0%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">Awaiting review</p>
          </div>
        </motion.div>
      </div>

      {/* ── Middle Row: User Growth & Role Distribution ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Line Chart (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Growth</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">New registered users by day</p>
              </div>
            </div>

            {/* Timeframe selector dropdown */}
            <div className="relative">
              <select
                value={userGrowthTimeframe}
                onChange={e => setUserGrowthTimeframe(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 cursor-pointer focus:outline-hidden"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* SVG Area / Line Chart with Tooltip */}
          <div className="relative h-64 w-full mt-2 select-none">
            {(() => {
              const { points, maxCount } = userGrowthData
              const svgHeight = 210
              const svgWidth = 650
              const padLeft = 30
              const padRight = 20
              const padTop = 20
              const padBottom = 30

              const chartW = svgWidth - padLeft - padRight
              const chartH = svgHeight - padTop - padBottom

              const baseY = padTop + chartH

              // Compute coordinates
              const coords = points.map((p, idx) => {
                const x = padLeft + (idx / Math.max(1, points.length - 1)) * chartW
                const y = baseY - (p.count / maxCount) * chartH
                return { x, y, ...p }
              })

              // Build smooth non-negative monotone bezier path (no dipping below 0)
              let linePath = `M ${coords[0].x},${coords[0].y}`
              for (let i = 0; i < coords.length - 1; i++) {
                const p0 = coords[i === 0 ? 0 : i - 1]
                const p1 = coords[i]
                const p2 = coords[i + 1]
                const p3 = coords[i + 2] || p2
                const dx = p2.x - p1.x

                let m1 = (p2.y - p0.y) / (p2.x - p0.x || 1)
                let m2 = (p3.y - p1.y) / (p3.x - p1.x || 1)

                if (p1.count === 0 && p2.count === 0) {
                  m1 = 0
                  m2 = 0
                } else if (p1.count === 0) {
                  m1 = 0
                } else if (p2.count === 0) {
                  m2 = 0
                }

                let cp1x = p1.x + dx / 3
                let cp1y = p1.y + m1 * (dx / 3)
                let cp2x = p2.x - dx / 3
                let cp2y = p2.y - m2 * (dx / 3)

                // Clamp to prevent any dip below 0 baseline or above ceiling
                cp1y = Math.min(baseY, Math.max(padTop, cp1y))
                cp2y = Math.min(baseY, Math.max(padTop, cp2y))

                linePath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
              }

              const areaPath = `${linePath} L ${coords[coords.length - 1].x},${baseY} L ${coords[0].x},${baseY} Z`

              // Y-axis ticks (0 to 4)
              const yTicks = [0, 1, 2, 3, 4]

              // X-axis evenly spaced ticks with guaranteed non-collision
              const numTicks = points.length <= 7 ? points.length : 6
              const xTicks = []
              for (let i = 0; i < numTicks; i++) {
                const idx = Math.round((i * (points.length - 1)) / (numTicks - 1))
                xTicks.push({
                  ...coords[idx],
                  isFirst: i === 0,
                  isLast: i === numTicks - 1,
                })
              }

              return (
                <>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y Gridlines and labels */}
                    {yTicks.map(val => {
                      const yPos = padTop + chartH - (val / maxCount) * chartH
                      return (
                        <g key={val}>
                          <line
                            x1={padLeft}
                            y1={yPos}
                            x2={svgWidth - padRight}
                            y2={yPos}
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            className="text-slate-100 dark:text-gray-800"
                          />
                          <text
                            x={padLeft - 10}
                            y={yPos + 3}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                          >
                            {val}
                          </text>
                        </g>
                      )
                    })}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#userGrowthGrad)" />

                    {/* Main Curve */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points */}
                    {coords.map((c, i) => (
                      <g key={i}>
                        {c.count > 0 && (
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={growthTooltip?.date === c.date ? 6 : 4}
                            className="fill-indigo-600 stroke-white dark:stroke-gray-900 transition-all duration-200"
                            strokeWidth="2.5"
                          />
                        )}
                        {/* Transparent hover capture zone */}
                        <rect
                          x={c.x - chartW / (points.length * 2)}
                          y={padTop}
                          width={chartW / points.length}
                          height={chartH}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setGrowthTooltip(c)}
                          onMouseLeave={() => setGrowthTooltip(null)}
                        />
                      </g>
                    ))}

                    {/* X-axis labels */}
                    {xTicks.map((c, i) => (
                      <text
                        key={i}
                        x={c.x}
                        y={svgHeight - 8}
                        textAnchor={c.isFirst ? 'start' : c.isLast ? 'end' : 'middle'}
                        className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                      >
                        {c.label}
                      </text>
                    ))}
                  </svg>

                  {/* Tooltip Overlay */}
                  {growthTooltip && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white shadow-xl border border-slate-700/60 text-xs backdrop-blur-md"
                      style={{
                        left: `${(growthTooltip.x / svgWidth) * 100}%`,
                        top: `${(growthTooltip.y / svgHeight) * 100 - 30}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <p className="text-[11px] font-bold text-slate-300">{growthTooltip.fullDate}</p>
                      <p className="flex items-center gap-1.5 mt-1 font-semibold text-xs">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span>{growthTooltip.count} new users</span>
                      </p>
                    </motion.div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Role Distribution Donut Chart (1 column) */}
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-3 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">Role Distribution</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500 truncate">All registered users by role</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 my-auto">
            {/* Donut */}
            <div className="shrink-0">
              <DonutChart
                data={roleDistribution}
                total={metrics.totalUsers}
                centerLabel="Total Users"
                size={116}
                strokeWidth={14}
              />
            </div>

            {/* Legend list */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {roleDistribution.map(role => (
                <div key={role.label} className="flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: role.color }}
                    ></span>
                    <span className="font-semibold text-slate-700 dark:text-gray-300 text-[11px] truncate">
                      {role.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Mini horizontal progress bar for top roles on wider viewports */}
                    {role.value >= 2 && (
                      <div className="w-7 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden hidden 2xl:block">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${role.percent}%`,
                            backgroundColor: role.color,
                          }}
                        ></div>
                      </div>
                    )}
                    <span className="font-bold text-slate-900 dark:text-white text-xs min-w-[12px] text-right">
                      {role.value}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono min-w-[34px] text-right">
                      {role.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lower Row: College Status & Top 5 Colleges ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* College Status Donut Chart (1 column) */}
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-3 pb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">College Status</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500 truncate">Active and inactive institutions</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 my-auto">
            {/* Donut */}
            <div className="shrink-0">
              <DonutChart
                data={collegeStatusData}
                total={metrics.totalColleges}
                centerLabel="Total Colleges"
                size={116}
                strokeWidth={14}
              />
            </div>

            {/* Legend list */}
            <div className="flex-1 min-w-0 space-y-3">
              {collegeStatusData.map(st => (
                <div key={st.label} className="flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    ></span>
                    <span className="font-semibold text-slate-700 dark:text-gray-300 text-[11px] truncate">
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className="font-bold text-slate-900 dark:text-white text-xs min-w-[12px] text-right">
                      {st.value}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono min-w-[34px] text-right">
                      {st.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Colleges Ranking (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3 pb-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top 5 Colleges</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500">By registered user count</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-gray-800/80 pb-2">
                  <th className="font-semibold pb-2.5 w-8">#</th>
                  <th className="font-semibold pb-2.5">College Name</th>
                  <th className="font-semibold pb-2.5 text-center min-w-[120px]">Total Users</th>
                  <th className="font-semibold pb-2.5 text-center">Students</th>
                  <th className="font-semibold pb-2.5 text-center">Faculty</th>
                  <th className="font-semibold pb-2.5 text-center">Admins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-800/60">
                {topColleges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-gray-500">
                      No colleges registered yet.
                    </td>
                  </tr>
                ) : (
                  topColleges.map((col, idx) => (
                    <tr
                      key={col.id || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3 text-slate-400 dark:text-gray-500 font-mono font-medium">
                        {col.rank}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 flex items-center justify-center text-[10px] font-black shrink-0">
                            {col.initials.slice(0, 2)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                            {col.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-slate-900 dark:text-white">
                            {col.totalUsers}
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${Math.max(15, col.progress)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-center text-slate-600 dark:text-gray-300 font-semibold">
                        {col.students}
                      </td>

                      <td className="py-3 text-center text-slate-600 dark:text-gray-300 font-semibold">
                        {col.faculty}
                      </td>

                      <td className="py-3 text-center text-slate-600 dark:text-gray-300 font-semibold">
                        {col.admins}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: College Registration Requests (Full Width) ──── */}
      <div className="p-6 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                College Registration Requests
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-500">
                Incoming college onboarding requests by day and status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Status Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 dark:text-gray-400">Approved</span>
                <span className="font-bold text-slate-900 dark:text-white ml-0.5">
                  {requestsChartData.totalApproved}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 dark:text-gray-400">Pending</span>
                <span className="font-bold text-slate-900 dark:text-white ml-0.5">
                  {requestsChartData.totalPending}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-slate-600 dark:text-gray-400">Rejected</span>
                <span className="font-bold text-slate-900 dark:text-white ml-0.5">
                  {requestsChartData.totalRejected}
                </span>
              </div>
            </div>

            {/* Timeframe selector dropdown */}
            <div className="relative">
              <select
                value={requestsTimeframe}
                onChange={e => setRequestsTimeframe(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 cursor-pointer focus:outline-hidden"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="relative h-48 w-full mt-4 select-none">
          {(() => {
            const { points, maxVal = 3 } = requestsChartData
            const svgHeight = 160
            const svgWidth = 900
            const padLeft = 30
            const padRight = 20
            const padTop = 15
            const padBottom = 30

            const chartW = svgWidth - padLeft - padRight
            const chartH = svgHeight - padTop - padBottom

            const barW = Math.max(4, Math.min(14, chartW / (points.length * 2.2)))

            const rawYTicks = [0, Math.ceil(maxVal * 0.33), Math.ceil(maxVal * 0.66), maxVal]
            const yTicks = Array.from(new Set(rawYTicks)).sort((a, b) => a - b)
            const numReqTicks = points.length <= 8 ? points.length : 7
            const xTicks = []
            for (let i = 0; i < numReqTicks; i++) {
              const origIdx = Math.round((i * (points.length - 1)) / (numReqTicks - 1))
              const x = padLeft + (origIdx / Math.max(1, points.length - 1)) * chartW
              xTicks.push({
                ...points[origIdx],
                x,
                isFirst: i === 0,
                isLast: i === numReqTicks - 1,
              })
            }

            return (
              <>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  {/* Horizontal Grid lines */}
                  {yTicks.map(val => {
                    const yPos = padTop + chartH - (val / maxVal) * chartH
                    return (
                      <g key={val}>
                        <line
                          x1={padLeft}
                          y1={yPos}
                          x2={svgWidth - padRight}
                          y2={yPos}
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          className="text-slate-100 dark:text-gray-800"
                        />
                        <text
                          x={padLeft - 10}
                          y={yPos + 3}
                          textAnchor="end"
                          className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {/* Bars */}
                  {points.map((p, idx) => {
                    const x = padLeft + (idx / Math.max(1, points.length - 1)) * chartW

                    // Heights
                    const hApproved = (p.approved / maxVal) * chartH
                    const hPending = (p.pending / maxVal) * chartH
                    const hRejected = (p.rejected / maxVal) * chartH

                    const yApproved = padTop + chartH - hApproved
                    const yPending = yApproved - hPending
                    const yRejected = yPending - hRejected

                    return (
                      <g
                        key={p.date}
                        className="cursor-pointer"
                        onMouseEnter={() => setRequestsTooltip({ ...p, x, y: yApproved })}
                        onMouseLeave={() => setRequestsTooltip(null)}
                      >
                        {/* Transparent touch area */}
                        <rect
                          x={x - barW * 1.5}
                          y={padTop}
                          width={barW * 3}
                          height={chartH}
                          fill="transparent"
                        />

                        {/* Approved Bar */}
                        {p.approved > 0 && (
                          <rect
                            x={x - barW / 2}
                            y={yApproved}
                            width={barW}
                            height={hApproved}
                            rx="2"
                            className="fill-emerald-500"
                          />
                        )}

                        {/* Pending Bar */}
                        {p.pending > 0 && (
                          <rect
                            x={x - barW / 2}
                            y={yPending}
                            width={barW}
                            height={hPending}
                            rx="2"
                            className="fill-amber-500"
                          />
                        )}

                        {/* Rejected Bar */}
                        {p.rejected > 0 && (
                          <rect
                            x={x - barW / 2}
                            y={yRejected}
                            width={barW}
                            height={hRejected}
                            rx="2"
                            className="fill-rose-500"
                          />
                        )}
                      </g>
                    )
                  })}

                  {/* X-axis labels */}
                  {xTicks.map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y={svgHeight - 8}
                      textAnchor={p.isFirst ? 'start' : p.isLast ? 'end' : 'middle'}
                      className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                    >
                      {p.label}
                    </text>
                  ))}
                </svg>

                {/* Tooltip */}
                {requestsTooltip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white shadow-xl border border-slate-700/60 text-xs backdrop-blur-md"
                    style={{
                      left: `${(requestsTooltip.x / svgWidth) * 100}%`,
                      top: '10%',
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    <p className="text-[11px] font-bold text-slate-300">{requestsTooltip.fullDate}</p>
                    <div className="mt-1 space-y-0.5 font-semibold text-xs">
                      <p className="text-emerald-400">Approved: {requestsTooltip.approved}</p>
                      <p className="text-amber-400">Pending: {requestsTooltip.pending}</p>
                      <p className="text-rose-400">Rejected: {requestsTooltip.rejected}</p>
                    </div>
                  </motion.div>
                )}
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
