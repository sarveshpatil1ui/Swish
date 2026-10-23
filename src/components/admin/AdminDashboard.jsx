// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Building2,
  UserCheck,
  Clock,
  TrendingUp,
  FileText,
  ChevronDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Rocket,
  Activity,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredToken } from '../../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Format relative time dynamically (e.g. "Just now", "5 mins ago", "2 hours ago", "Yesterday", "3 days ago")
 */
export function formatTimeAgo(dateInput) {
  if (!dateInput) return 'Recently'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return 'Recently'

  const now = Date.now()
  const diffMs = Math.max(0, now - date.getTime())

  if (diffMs < 45 * 1000) return 'Just now'

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffMin < 60) {
    return diffMin === 1 ? '1 min ago' : `${diffMin} mins ago`
  }
  if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`
  }
  if (diffDay === 1) {
    return 'Yesterday'
  }
  if (diffDay < 7) {
    return `${diffDay} days ago`
  }
  if (diffWeek < 5) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`
  }
  if (diffMonth < 12) {
    return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`
  }
  return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`
}

/**
 * Format exact human-readable date & time for hover tooltips
 */
export function formatFullDateTime(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

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

// Mini Sparkline component
function Sparkline({ points = [], color = '#6366f1', height = 28, width = 75 }) {
  if (!points || points.length < 2) {
    const defaultD = `M 0,${height * 0.7} Q ${width * 0.25},${height * 0.8} ${width * 0.5},${height * 0.4} T ${width},${height * 0.2}`
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
  const range = max - min
  const padding = 3

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width
    const y =
      range === 0
        ? height * 0.6
        : height - padding - ((val - min) / range) * (height - padding * 2)
    return [x, y]
  })

  let pathD = `M ${coords[0][0]},${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const dx = p2[0] - p1[0]
    pathD += ` C ${p1[0] + dx / 3},${p1[1]} ${p2[0] - dx / 3},${p2[1]} ${p2[0]},${p2[1]}`
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

// Donut Chart component for Dashboard
function DonutChart({ data, total, centerLabel, size = 125, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [hoveredIdx, setHoveredIdx] = useState(null)

  let accumulatedPercent = 0

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
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
                key={item.label || idx}
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

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-xl font-black text-slate-900 dark:text-white leading-none"
        >
          {hoveredIdx !== null ? data[hoveredIdx]?.value : total}
        </span>
        <span className="text-[10px] font-medium text-slate-400 dark:text-gray-400 mt-0.5">
          {hoveredIdx !== null ? data[hoveredIdx]?.label : centerLabel}
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboard({ onNavigate, user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [growthTimeframe, setGrowthTimeframe] = useState('30')
  const [growthMetric, setGrowthMetric] = useState('all') // 'all' | 'users' | 'colleges'
  const [growthMode, setGrowthMode] = useState('cumulative') // 'cumulative' | 'daily'
  const [distributionTimeframe, setDistributionTimeframe] = useState('all')

  const [dashboardStats, setDashboardStats] = useState(null)
  const [colleges, setColleges] = useState([])
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])

  const [growthTooltip, setGrowthTooltip] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [dashRes, colRes, userRes, reqRes] = await Promise.allSettled([
        adminFetch(`${API_BASE}/api/admin/dashboard`),
        adminFetch(`${API_BASE}/api/admin/colleges`),
        adminFetch(`${API_BASE}/api/users`),
        adminFetch(`${API_BASE}/api/admin/pending-requests?status=all`),
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
        const d = await dashRes.value.json()
        if (d.ok) setDashboardStats(d.stats)
      }

      let fetchedColleges = []
      if (colRes.status === 'fulfilled' && colRes.value.ok) {
        const c = await colRes.value.json()
        if (c.ok && Array.isArray(c.colleges)) {
          fetchedColleges = c.colleges
          setColleges(c.colleges)
        }
      }

      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const u = await userRes.value.json()
        if (u.ok && Array.isArray(u.users)) {
          setUsers(u.users)
        }
      } else {
        const fallbackRes = await adminFetch(`${API_BASE}/api/admin/users`)
        if (fallbackRes.ok) {
          const f = await fallbackRes.json()
          if (f.ok && Array.isArray(f.users)) {
            setUsers(f.users)
          }
        }
      }

      let fetchedRequests = []
      if (reqRes.status === 'fulfilled' && reqRes.value.ok) {
        const r = await reqRes.value.json()
        if (r.ok && Array.isArray(r.requests)) {
          fetchedRequests = r.requests
        }
      }

      if (fetchedRequests.length === 0 && fetchedColleges.length > 0) {
        fetchedRequests = fetchedColleges.map(c => ({
          id: c.id,
          collegeName: c.name,
          status: 'APPROVED',
          createdAt: c.createdAt,
        }))
      }
      setRequests(fetchedRequests)
    } catch (err) {
      console.error('[AdminDashboard] Fetch error:', err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Real-time Live Clock & Date
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedToday = useMemo(() => {
    return currentDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }, [currentDateTime])

  const formattedCurrentTime = useMemo(() => {
    return currentDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [currentDateTime])

  // Metrics
  const metrics = useMemo(() => {
    const totalUsers = users?.length ?? dashboardStats?.activeUsers ?? 0
    const activeUsers = users
      ? users.filter(u => !u.deactivated && !u.suspended).length
      : (dashboardStats?.activeUsers ?? 0)
    const totalColleges = colleges?.length ?? dashboardStats?.totalColleges ?? 0
    const activeColleges = colleges
      ? colleges.filter(c => c.active !== false).length
      : (dashboardStats?.activeColleges ?? 0)
    const inactiveColleges = Math.max(0, totalColleges - activeColleges)
    const pendingRequests = dashboardStats?.pendingCollegeRequests ?? requests.filter(r => r.status === 'PENDING').length

    return {
      totalUsers,
      totalColleges,
      activeUsers,
      pendingRequests,
      activeColleges,
      inactiveColleges,
    }
  }, [users, colleges, requests, dashboardStats])

  // Real KPI Card Statistics, Dynamic Trends, and Real Sparklines
  const cardStats = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // 1. Total Users
    const totalUsers = users?.length ?? dashboardStats?.activeUsers ?? 0
    const usersLast30 = users.filter(u => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo).length
    const usersPrev30 = users.filter(u => {
      if (!u.createdAt) return false
      const d = new Date(u.createdAt)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    }).length

    let userTrend = '+100%'
    let userTrendPositive = true
    if (usersPrev30 > 0) {
      const diff = usersLast30 - usersPrev30
      const rawPct = Math.round((diff / usersPrev30) * 100)
      const cappedPct = Math.min(100, Math.abs(rawPct))
      userTrend = `${rawPct >= 0 ? '+' : '-'}${cappedPct}%`
      userTrendPositive = rawPct >= 0
    } else if (usersLast30 > 0) {
      const pct = Math.min(100, Math.round((usersLast30 / totalUsers) * 100))
      userTrend = `+${pct}%`
      userTrendPositive = true
    } else {
      userTrend = '+0%'
    }

    // 2. Total Colleges
    const totalColleges = colleges?.length ?? dashboardStats?.totalColleges ?? 0
    const collegesLast30 = colleges.filter(c => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo).length
    const collegesPrev30 = colleges.filter(c => {
      if (!c.createdAt) return false
      const d = new Date(c.createdAt)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    }).length

    let collegeTrend = '+100%'
    let collegeTrendPositive = true
    if (collegesPrev30 > 0) {
      const diff = collegesLast30 - collegesPrev30
      const rawPct = Math.round((diff / collegesPrev30) * 100)
      const cappedPct = Math.min(100, Math.abs(rawPct))
      collegeTrend = `${rawPct >= 0 ? '+' : '-'}${cappedPct}%`
      collegeTrendPositive = rawPct >= 0
    } else if (collegesLast30 > 0 && totalColleges > 0) {
      const pct = Math.min(100, Math.round((collegesLast30 / totalColleges) * 100))
      collegeTrend = `+${pct}%`
      collegeTrendPositive = true
    } else {
      collegeTrend = '+0%'
    }

    // 3. Active Users
    const activeUsers = users
      ? users.filter(u => !u.deactivated && !u.suspended).length
      : (dashboardStats?.activeUsers ?? 0)
    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100

    // 4. Pending Requests
    const pendingRequests =
      dashboardStats?.pendingCollegeRequests ?? requests.filter(r => r.status === 'PENDING').length
    const pendingTrend = pendingRequests === 0 ? 'All clear' : `+${pendingRequests} new`

    // Real dynamic 7-day sparklines (cumulative progression)
    const userSparkline = []
    const collegeSparkline = []
    const activeSparkline = []
    const pendingSparkline = []

    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayDate.setHours(23, 59, 59, 999)

      const uCount = users.filter(u => u.createdAt && new Date(u.createdAt) <= dayDate).length
      userSparkline.push(uCount)

      const cCount = colleges.filter(c => c.createdAt && new Date(c.createdAt) <= dayDate).length
      collegeSparkline.push(cCount)

      const aCount = users.filter(
        u => !u.deactivated && !u.suspended && u.createdAt && new Date(u.createdAt) <= dayDate
      ).length
      activeSparkline.push(aCount)

      const pCount = requests.filter(
        r => r.status === 'PENDING' && r.createdAt && new Date(r.createdAt) <= dayDate
      ).length
      pendingSparkline.push(pCount)
    }

    return {
      totalUsers,
      userTrend,
      userTrendPositive,
      userSparkline,
      totalColleges,
      collegeTrend,
      collegeTrendPositive,
      collegeSparkline,
      activeUsers,
      activeRate,
      activeSparkline,
      pendingRequests,
      pendingTrend,
      pendingSparkline,
    }
  }, [users, colleges, requests, dashboardStats])

  // Platform Growth Line Chart Data (Smooth Cumulative & Daily Modes)
  const growthData = useMemo(() => {
    const days = growthTimeframe === 'all' ? 30 : parseInt(growthTimeframe, 10) || 30
    const today = new Date()
    const points = []

    const userCountsByDay = {}
    users.forEach(u => {
      if (!u.createdAt) return
      const k = new Date(u.createdAt).toISOString().split('T')[0]
      userCountsByDay[k] = (userCountsByDay[k] || 0) + 1
    })

    const colCountsByDay = {}
    colleges.forEach(c => {
      if (!c.createdAt) return
      const k = new Date(c.createdAt).toISOString().split('T')[0]
      colCountsByDay[k] = (colCountsByDay[k] || 0) + 1
    })

    // Baseline counts before current timeframe window for smooth cumulative curve
    const windowStart = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    windowStart.setHours(0, 0, 0, 0)

    let runningUsers = users.filter(u => u.createdAt && new Date(u.createdAt) < windowStart).length
    let runningColleges = colleges.filter(c => c.createdAt && new Date(c.createdAt) < windowStart).length

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      const dailyUsers = userCountsByDay[key] || 0
      const dailyColleges = colCountsByDay[key] || 0

      runningUsers += dailyUsers
      runningColleges += dailyColleges

      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

      const usersVal = growthMode === 'cumulative' ? runningUsers : dailyUsers
      const colVal = growthMode === 'cumulative' ? runningColleges : dailyColleges

      points.push({
        date: key,
        label,
        fullDate,
        users: usersVal,
        colleges: colVal,
        dailyUsers,
        dailyColleges,
        totalUsers: runningUsers,
        totalColleges: runningColleges,
      })
    }

    let rawMax = 4
    if (growthMetric === 'users') {
      rawMax = Math.max(...points.map(p => p.users), 4)
    } else if (growthMetric === 'colleges') {
      rawMax = Math.max(...points.map(p => p.colleges), 3)
    } else {
      rawMax = Math.max(...points.map(p => Math.max(p.users, p.colleges)), 4)
    }

    // Ensure nice integer upper bound
    const maxVal = Math.max(rawMax, growthMetric === 'colleges' ? 3 : 4)
    return { points, maxVal }
  }, [users, colleges, growthTimeframe, growthMetric, growthMode])

  // User Distribution Data (Donut)
  const distributionData = useMemo(() => {
    const counts = { student: 0, college_admin: 0, faculty: 0 }
    users.forEach(u => {
      const r = u.role?.toLowerCase()
      if (counts[r] !== undefined) counts[r] += 1
      else counts.student += 1
    })

    const total = (counts.student + counts.college_admin + counts.faculty) || 1

    return [
      {
        label: 'Students',
        value: counts.student,
        color: '#6366f1',
        percent: ((counts.student / total) * 100).toFixed(0),
      },
      {
        label: 'College Admins',
        value: counts.college_admin,
        color: '#3b82f6',
        percent: ((counts.college_admin / total) * 100).toFixed(0),
      },
      {
        label: 'Faculty',
        value: counts.faculty,
        color: '#06b6d4',
        percent: ((counts.faculty / total) * 100).toFixed(0),
      },
    ]
  }, [users])

  // Recent Registrations (4 users with real-time timestamps)
  const recentRegistrations = useMemo(() => {
    const list = [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list.slice(0, 4).map(u => {
      const initials = (u.name || 'User')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

      const timeAgo = formatTimeAgo(u.createdAt)
      const exactTime = formatFullDateTime(u.createdAt)

      let rolePillClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      let roleLabel = 'Student'
      if (u.role === 'college_admin') {
        rolePillClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
        roleLabel = 'College Admin'
      } else if (u.role === 'faculty') {
        rolePillClass = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
        roleLabel = 'Faculty'
      } else if (u.role === 'main_admin' || u.role === 'super_admin' || u.role === 'swish_admin') {
        rolePillClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
        roleLabel = 'Swish Admin'
      }

      return {
        id: u._id || u.id,
        name: u.name || 'User',
        email: u.email || '',
        initials,
        timeAgo,
        exactTime,
        roleLabel,
        rolePillClass,
      }
    })
  }, [users])

  // Platform Activities (4 items with real-time timestamps from live database data)
  const platformActivities = useMemo(() => {
    // 1. Sort latest requests
    const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    const latestReq = sortedRequests[0]

    // 2. Sort latest users
    const sortedUsers = [...users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    const latestUser = sortedUsers[0]

    // 3. Sort latest colleges
    const sortedColleges = [...colleges].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    const latestCol = sortedColleges[0]

    // 4. Latest faculty or next user
    const facultyUsers = users.filter(u => u.role === 'faculty').sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    const latestFaculty = facultyUsers[0] || sortedUsers[1] || sortedUsers[0]

    const items = [
      {
        id: 'act-1',
        title: latestReq?.status === 'APPROVED' ? 'College registration approved' : 'New college registration request',
        subtitle: latestReq?.collegeName || latestCol?.name || 'College Registration',
        timeAgo: formatTimeAgo(latestReq?.createdAt || latestCol?.createdAt),
        exactTime: formatFullDateTime(latestReq?.createdAt || latestCol?.createdAt),
        badge: latestReq?.status || 'Pending',
        badgeClass: latestReq?.status === 'APPROVED'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        icon: Building2,
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      },
      {
        id: 'act-2',
        title: 'New user registered',
        subtitle: latestUser ? (latestUser.name ? `${latestUser.name} (${latestUser.email})` : latestUser.email) : 'User registration',
        timeAgo: formatTimeAgo(latestUser?.createdAt),
        exactTime: formatFullDateTime(latestUser?.createdAt),
        badge: latestUser?.role === 'college_admin' ? 'College Admin' : latestUser?.role === 'faculty' ? 'Faculty' : 'Student',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        icon: Users,
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      },
      {
        id: 'act-3',
        title: 'College active on platform',
        subtitle: latestCol?.name || 'Affiliated College',
        timeAgo: formatTimeAgo(latestCol?.createdAt),
        exactTime: formatFullDateTime(latestCol?.createdAt),
        badge: latestCol?.active !== false ? 'Active' : 'Inactive',
        badgeClass: latestCol?.active !== false
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300',
        icon: ShieldCheck,
        iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      },
      {
        id: 'act-4',
        title: latestFaculty?.role === 'faculty' ? 'New faculty registered' : 'User account verified',
        subtitle: latestFaculty ? (latestFaculty.name ? `${latestFaculty.name} (${latestFaculty.email})` : latestFaculty.email) : 'Staff account',
        timeAgo: formatTimeAgo(latestFaculty?.createdAt),
        exactTime: formatFullDateTime(latestFaculty?.createdAt),
        badge: latestFaculty?.role === 'faculty' ? 'Faculty' : 'Active',
        badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
        icon: UserCheck,
        iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
      },
    ]
    return items
  }, [requests, users, colleges])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between py-2">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-gray-800 rounded-lg"></div>
            <div className="h-4 w-48 bg-slate-200 dark:bg-gray-800 rounded"></div>
          </div>
          <div className="h-12 w-64 bg-slate-200 dark:bg-gray-800 rounded-2xl"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-gray-800/60 p-4"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-80 rounded-2xl bg-slate-100 dark:bg-gray-800/60"></div>
          <div className="lg:col-span-4 h-80 rounded-2xl bg-slate-100 dark:bg-gray-800/60"></div>
          <div className="lg:col-span-3 h-80 rounded-2xl bg-slate-100 dark:bg-gray-800/60"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Header + Date Card ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-slate-900 dark:text-white text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2"
          >
            <span>Welcome Back, <span className="text-indigo-600 dark:text-indigo-400">Swish Admin!</span></span>
            <span className="inline-block animate-wiggle">👋</span>
          </h1>

          <p className="text-slate-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Here's what's happening on SWISH today.
          </p>
        </div>

        {/* Date card on right */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-gray-900/90 border border-slate-200/80 dark:border-gray-800 shadow-xs self-start sm:self-auto">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-800 dark:text-gray-100 leading-tight">
                {formattedToday}
              </p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-semibold tracking-wide">
                {formattedCurrentTime}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 leading-tight mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live system time
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="font-bold underline hover:text-rose-900 dark:hover:text-rose-100 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Row 1: 4 Top KPI Cards ────────────────────────────────────────── */}
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
              points={cardStats.userSparkline}
              color="#6366f1"
              height={26}
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
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                  cardStats.userTrendPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                }`}
              >
                {cardStats.userTrendPositive ? '↑' : '↓'} {cardStats.userTrend}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Registered accounts</p>
          </div>
        </motion.div>

        {/* 2. Total Colleges */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Building2 size={17} />
            </div>
            <Sparkline
              points={cardStats.collegeSparkline}
              color="#a855f7"
              height={26}
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
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                  cardStats.collegeTrendPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                }`}
              >
                {cardStats.collegeTrendPositive ? '↑' : '↓'} {cardStats.collegeTrend}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Registered institutions</p>
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
              points={cardStats.activeSparkline}
              color="#10b981"
              height={26}
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
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                {cardStats.activeRate}% active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Currently active</p>
          </div>
        </motion.div>

        {/* 4. Pending Requests */}
        <motion.div
          whileHover={{ y: -2 }}
          className="p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={17} />
            </div>
            <Sparkline
              points={cardStats.pendingSparkline}
              color="#f59e0b"
              height={26}
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
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                  cardStats.pendingRequests === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                }`}
              >
                {cardStats.pendingRequests === 0 ? '✓ All clear' : `↑ ${cardStats.pendingTrend}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Awaiting review</p>
          </div>
        </motion.div>
      </div>

      {/* ── Row 2: Middle Section (Platform Growth, User Distribution, Quick Actions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Platform Growth (Line Chart) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Growth</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">
                  {growthMode === 'cumulative'
                    ? 'Cumulative platform reach trajectory'
                    : 'Daily user and college additions'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cumulative vs Daily Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-gray-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-gray-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setGrowthMode('cumulative')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    growthMode === 'cumulative'
                      ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                  }`}
                  title="Smooth cumulative growth trajectory"
                >
                  Cumulative
                </button>
                <button
                  type="button"
                  onClick={() => setGrowthMode('daily')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    growthMode === 'daily'
                      ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                  }`}
                  title="Daily additions"
                >
                  Daily
                </button>
              </div>

              <div className="relative">
                <select
                  value={growthTimeframe}
                  onChange={e => setGrowthTimeframe(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 cursor-pointer focus:outline-hidden"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Interactive Metric Filter & Legend */}
          <div className="flex items-center justify-between py-1 px-1 text-xs border-b border-slate-100 dark:border-gray-800/60 pb-2.5">
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-gray-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-gray-700/60">
              <button
                type="button"
                onClick={() => setGrowthMetric('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  growthMetric === 'all'
                    ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setGrowthMetric('users')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  growthMetric === 'users'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    growthMetric === 'users' ? 'bg-white' : 'bg-indigo-600'
                  }`}
                ></span>
                <span>Users</span>
                <span className="text-[10px] opacity-80 font-mono">({users.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGrowthMetric('colleges')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  growthMetric === 'colleges'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    growthMetric === 'colleges' ? 'bg-white' : 'bg-emerald-500'
                  }`}
                ></span>
                <span>Colleges</span>
                <span className="text-[10px] opacity-80 font-mono">({colleges.length})</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded-full bg-indigo-600"></span>
                <span>Users</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 rounded-full bg-emerald-500"></span>
                <span>Colleges</span>
              </span>
            </div>
          </div>

          {/* SVG Growth Chart */}
          <div className="relative h-56 w-full mt-2 select-none">
            {(() => {
              const { points, maxVal } = growthData
              const svgHeight = 190
              const svgWidth = 520
              const padLeft = 25
              const padRight = 15
              const padTop = 15
              const padBottom = 25

              const chartW = svgWidth - padLeft - padRight
              const chartH = svgHeight - padTop - padBottom
              const baseY = padTop + chartH

              // Coords for Users
              const userCoords = points.map((p, idx) => ({
                x: padLeft + (idx / Math.max(1, points.length - 1)) * chartW,
                y: baseY - (p.users / maxVal) * chartH,
                count: p.users,
                date: p.date,
                label: p.label,
                fullDate: p.fullDate,
              }))

              // Coords for Colleges
              const colCoords = points.map((p, idx) => ({
                x: padLeft + (idx / Math.max(1, points.length - 1)) * chartW,
                y: baseY - (p.colleges / maxVal) * chartH,
                count: p.colleges,
                date: p.date,
                label: p.label,
                fullDate: p.fullDate,
              }))

              // Smooth curve builder with gentle tension and bounded control points
              const buildSmoothPath = coords => {
                if (!coords || coords.length === 0) return { line: '', area: '' }
                if (coords.length === 1) {
                  return {
                    line: `M ${coords[0].x},${coords[0].y}`,
                    area: `M ${coords[0].x},${coords[0].y} L ${coords[0].x},${baseY} Z`,
                  }
                }

                let line = `M ${coords[0].x},${coords[0].y}`
                for (let i = 0; i < coords.length - 1; i++) {
                  const p0 = coords[i === 0 ? 0 : i - 1]
                  const p1 = coords[i]
                  const p2 = coords[i + 1]
                  const p3 = coords[i + 2] || p2
                  const dx = p2.x - p1.x

                  // Gentle tension ensures curves are smooth rather than sharp spikes
                  let cp1x = p1.x + dx / 3
                  let cp1y = p1.y + ((p2.y - p0.y) / 6) * 0.75

                  let cp2x = p2.x - dx / 3
                  let cp2y = p2.y - ((p3.y - p1.y) / 6) * 0.75

                  // Clamp Y control points within chart bounds
                  cp1y = Math.min(baseY, Math.max(padTop, cp1y))
                  cp2y = Math.min(baseY, Math.max(padTop, cp2y))

                  line += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
                }
                const area = `${line} L ${coords[coords.length - 1].x},${baseY} L ${coords[0].x},${baseY} Z`
                return { line, area }
              }

              const { line: userLine, area: userArea } = buildSmoothPath(userCoords)
              const { line: colLine, area: colArea } = buildSmoothPath(colCoords)

              // Dynamic Y-ticks based on current maxVal
              const rawYTicks = [
                0,
                Math.round(maxVal * 0.25),
                Math.round(maxVal * 0.5),
                Math.round(maxVal * 0.75),
                maxVal,
              ]
              const yTicks = Array.from(new Set(rawYTicks)).sort((a, b) => a - b)

              // X-ticks
              const numTicks = points.length <= 7 ? points.length : 6
              const xTicks = []
              for (let i = 0; i < numTicks; i++) {
                const idx = Math.round((i * (points.length - 1)) / (numTicks - 1))
                xTicks.push({
                  ...userCoords[idx],
                  isFirst: i === 0,
                  isLast: i === numTicks - 1,
                })
              }

              const showUsers = growthMetric === 'all' || growthMetric === 'users'
              const showColleges = growthMetric === 'all' || growthMetric === 'colleges'

              return (
                <>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="colGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y Gridlines */}
                    {yTicks.map(val => {
                      const yPos = baseY - (val / maxVal) * chartH
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
                            x={padLeft - 8}
                            y={yPos + 3}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                          >
                            {val}
                          </text>
                        </g>
                      )
                    })}

                    {/* Users Area & Line */}
                    {showUsers && <path d={userArea} fill="url(#userGrowthGrad)" />}
                    {showUsers && (
                      <path
                        d={userLine}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Colleges Area & Line */}
                    {showColleges && <path d={colArea} fill="url(#colGrowthGrad)" />}
                    {showColleges && (
                      <path
                        d={colLine}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* User Data Points */}
                    {showUsers &&
                      userCoords.map((c, i) => (
                        <React.Fragment key={`user-dot-${i}`}>
                          {c.count > 0 && (
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={growthTooltip?.date === c.date ? 5 : 3.5}
                              className="fill-indigo-600 stroke-white dark:stroke-gray-900 transition-all duration-200"
                              strokeWidth="2"
                            />
                          )}
                        </React.Fragment>
                      ))}

                    {/* College Data Points */}
                    {showColleges &&
                      colCoords.map((c, i) => (
                        <React.Fragment key={`col-dot-${i}`}>
                          {c.count > 0 && (
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={growthTooltip?.date === c.date ? 5 : 3.5}
                              className="fill-emerald-500 stroke-white dark:stroke-gray-900 transition-all duration-200"
                              strokeWidth="2"
                            />
                          )}
                        </React.Fragment>
                      ))}

                    {/* Interactive hover & click columns */}
                    {points.map((p, idx) => {
                      const x = padLeft + (idx / Math.max(1, points.length - 1)) * chartW
                      return (
                        <rect
                          key={`hover-${idx}`}
                          x={x - chartW / (points.length * 2)}
                          y={padTop}
                          width={chartW / points.length}
                          height={chartH}
                          fill="transparent"
                          className="cursor-pointer"
                          onClick={() =>
                            setGrowthTooltip(curr =>
                              curr?.date === p.date
                                ? null
                                : {
                                    ...p,
                                    x,
                                    userY: userCoords[idx].y,
                                    colY: colCoords[idx].y,
                                  }
                            )
                          }
                          onMouseEnter={() =>
                            setGrowthTooltip({
                              ...p,
                              x,
                              userY: userCoords[idx].y,
                              colY: colCoords[idx].y,
                            })
                          }
                          onMouseLeave={() => setGrowthTooltip(null)}
                        />
                      )
                    })}

                    {/* X-axis labels */}
                    {xTicks.map((c, i) => (
                      <text
                        key={i}
                        x={c.x}
                        y={svgHeight - 6}
                        textAnchor={c.isFirst ? 'start' : c.isLast ? 'end' : 'middle'}
                        className="text-[10px] fill-slate-400 dark:fill-gray-500 font-mono"
                      >
                        {c.label}
                      </text>
                    ))}
                  </svg>

                  {/* Dual Hover & Click Tooltip with smart non-clipping placement */}
                  {growthTooltip && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute pointer-events-none z-30 px-3.5 py-2.5 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white shadow-2xl border border-slate-700/60 text-xs backdrop-blur-md min-w-[155px]"
                      style={(() => {
                        const xRatio = growthTooltip.x / svgWidth
                        let transformOrigin = 'translate(-50%, -100%)'
                        let leftPercent = xRatio * 100

                        if (xRatio > 0.65) {
                          // Tooltip sits to the LEFT of the hovered/clicked point
                          transformOrigin = 'translate(-100%, -100%)'
                          leftPercent = Math.min(xRatio * 100 + 4, 98)
                        } else if (xRatio < 0.28) {
                          // Tooltip sits to the RIGHT of the hovered/clicked point
                          transformOrigin = 'translate(0%, -100%)'
                          leftPercent = Math.max(xRatio * 100 - 4, 2)
                        }

                        const targetY = Math.min(
                          showUsers ? growthTooltip.userY : 9999,
                          showColleges ? growthTooltip.colY : 9999
                        )
                        const showBelow = targetY < 55
                        const finalTransform = showBelow
                          ? transformOrigin.replace('-100%)', '15px)')
                          : transformOrigin.replace('-100%)', '-15px)')
                        const topPercent = Math.max(10, Math.min(80, (targetY / svgHeight) * 100))

                        return {
                          left: `${leftPercent}%`,
                          top: `${topPercent}%`,
                          transform: finalTransform,
                        }
                      })()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/50 pb-1 mb-1.5 text-[11px] font-bold text-slate-300">
                        <span>{growthTooltip.fullDate}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold px-1 py-0.5 rounded bg-slate-800">
                          {growthMode === 'cumulative' ? 'Total' : 'Daily'}
                        </span>
                      </div>
                      {showUsers && (
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-indigo-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                            <span>Users</span>
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-white font-bold">{growthTooltip.users}</span>
                            {growthMode === 'cumulative' && growthTooltip.dailyUsers > 0 && (
                              <span className="text-[10px] text-indigo-300 font-normal">
                                (+{growthTooltip.dailyUsers})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {showColleges && (
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-400 mt-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>Colleges</span>
                          </span>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-white font-bold">{growthTooltip.colleges}</span>
                            {growthMode === 'cumulative' && growthTooltip.dailyColleges > 0 && (
                              <span className="text-[10px] text-emerald-300 font-normal">
                                (+{growthTooltip.dailyColleges})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Card 2: User Distribution (Donut Chart) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Distribution</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Total users by role</p>
              </div>
            </div>

            <div className="relative">
              <select
                value={distributionTimeframe}
                onChange={e => setDistributionTimeframe(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Time</option>
                <option value="30">Last 30 Days</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 my-auto pt-2">
            <DonutChart
              data={distributionData}
              total={metrics.totalUsers}
              centerLabel="Total Users"
              size={128}
              strokeWidth={15}
            />

            <div className="space-y-3">
              {distributionData.map(role => (
                <div key={role.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  ></span>
                  <span className="font-semibold text-slate-700 dark:text-gray-300">
                    {role.label}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white ml-auto">
                    {role.value}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                    ({role.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-3 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Rocket size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Actions</h3>
              <p className="text-xs text-slate-400 dark:text-gray-500">Common admin tasks</p>
            </div>
          </div>

          <div className="space-y-2.5 my-auto">
            {/* Action 1: Review College Requests */}
            <button
              onClick={() => onNavigate('Pending Requests')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">Review College Requests</span>
              </div>
              <ChevronDown size={14} className="-rotate-90 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action 2: Manage Colleges */}
            <button
              onClick={() => onNavigate('All Colleges')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">Manage Colleges</span>
              </div>
              <ChevronDown size={14} className="-rotate-90 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action 3: View All Users */}
            <button
              onClick={() => onNavigate('Users')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <Users size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">View All Users</span>
              </div>
              <ChevronDown size={14} className="-rotate-90 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Action 4: Generate Reports */}
            <button
              onClick={() => onNavigate('Reports')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all duration-200 group text-left"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Generate Reports</span>
              </div>
              <ChevronDown size={14} className="-rotate-90 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 3: Bottom Section (Colleges Overview, Recent Registrations, Platform Activity) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Colleges Overview */}
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Building2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Colleges Overview</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Institution status across platform</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('All Colleges')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="flex items-center justify-around gap-4 pt-3 pb-2">
            <DonutChart
              data={[
                { label: 'Active', value: metrics.activeColleges, color: '#10b981' },
                { label: 'Inactive', value: metrics.inactiveColleges, color: '#cbd5e1' },
              ]}
              total={metrics.totalColleges}
              centerLabel="Total Colleges"
              size={120}
              strokeWidth={14}
            />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-slate-700 dark:text-gray-300">Active</span>
                <span className="font-bold text-slate-900 dark:text-white ml-2">
                  {metrics.activeColleges}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                  (100%)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-gray-600 shrink-0"></span>
                <span className="font-semibold text-slate-700 dark:text-gray-300">Inactive</span>
                <span className="font-bold text-slate-900 dark:text-white ml-2">
                  {metrics.inactiveColleges}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                  (0%)
                </span>
              </div>
            </div>
          </div>

          {/* Bottom illustration & badge */}
          <div className="pt-3 border-t border-slate-100 dark:border-gray-800/80 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 dark:text-gray-500 flex items-center gap-1.5 font-medium">
              <Building2 size={14} className="text-indigo-500" />
              <span>Campus network active</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <span>100% Active</span>
              <ArrowUpRight size={14} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Card 2: Recent Registrations */}
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <UserPlus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Registrations</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Latest user signups on platform</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('Users')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-gray-800/80 my-auto">
            {recentRegistrations.map((u, i) => (
              <div key={u.id || i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                    {u.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    title={u.exactTime}
                    className="text-[11px] text-slate-400 dark:text-gray-500 cursor-help hover:text-slate-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {u.timeAgo}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.rolePillClass}`}>
                    {u.roleLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Platform Activity */}
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Activity</h3>
                <p className="text-xs text-slate-400 dark:text-gray-500">Recent important activities</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('Pending Requests')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-gray-800/80 my-auto">
            {platformActivities.map(act => {
              const Icon = act.icon
              return (
                <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl ${act.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate">{act.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      title={act.exactTime}
                      className="text-[11px] text-slate-400 dark:text-gray-500 cursor-help hover:text-slate-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {act.timeAgo}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.badgeClass}`}>
                      {act.badge}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
