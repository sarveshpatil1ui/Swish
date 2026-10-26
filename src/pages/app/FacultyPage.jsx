import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Activity,
  GraduationCap,
  TrendingUp, TrendingDown, UserPlus,
  AlertTriangle, Building2, Megaphone, BarChart3,
  Award, BadgeCheck, Users, Search, Mail, ExternalLink, Filter, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import { apiGetNotices, apiGetUserStats, apiGetDepartments } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/posts'
import Stories from '../../components/app/Stories'

// Lazy-load NoticeManagement — only downloaded when Notices tab is first clicked
const NoticeManagement = lazy(() => import('../college-admin/NoticeManagement'))

// Module-level cache so re-mounting FacultyPage doesn't re-fetch notices within 60s
let _noticeCache = null
let _noticeCacheAt = 0
const NOTICE_TTL_MS = 60_000

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  trend,
  trendVal,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-3.5 sm:p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3 sm:mb-5">
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <Icon size={18} className={iconColor} />
        </div>

        {trendVal && (
          <span
            className={`flex items-center gap-1 text-[11px] sm:text-xs font-bold ${
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp size={11} />
            ) : (
              <TrendingDown size={11} />
            )}
            {trendVal}
          </span>
        )}
      </div>

      <p className="text-xl sm:text-[28px] font-black text-slate-900 dark:text-white leading-none mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      <p className="text-xs sm:text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 truncate">
        {label}
      </p>

      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
        {sub}
      </p>
    </div>
  )
}

// Lightweight spinner shown while NoticeManagement chunk loads
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-7 h-7 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
    </div>
  )
}

export default function FacultyPage({ defaultTab = 'Overview' }) {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [noticeCount, setNoticeCount] = useState(0)
  const [recentNotices, setRecentNotices] = useState([])
  const [statsData, setStatsData] = useState(null)
  const [departmentsList, setDepartmentsList] = useState([])
  // Track whether Notices tab has ever been activated (for preload hint)
  const noticesEverActive = useRef(activeTab === 'Notices')

  const {
    currentUser: user,
    users,
    posts,
  } = useSwish()

  const tabs = ['Overview', 'Students', 'Notices']

  // Student Roster Filter States
  const [studentSearch, setStudentSearch] = useState('')
  const [studentDeptFilter, setStudentDeptFilter] = useState('all')
  const [studentYearFilter, setStudentYearFilter] = useState('all')

  // Set default department filter to faculty's own department if available
  useEffect(() => {
    if (user?.dept && studentDeptFilter === 'all') {
      setStudentDeptFilter(user.dept)
    }
  }, [user?.dept])

  // Prefetch NoticeManagement chunk when user hovers/focuses the Notices tab button
  const handleNoticesHint = () => {
    if (!noticesEverActive.current) {
      import('../college-admin/NoticeManagement').catch(() => {})
    }
  }

  // Fetch genuine backend stats, departments with counts, and campus notices
  useEffect(() => {
    let mounted = true
    const now = Date.now()

    // Serve notices from cache if fresh
    if (_noticeCache && (now - _noticeCacheAt) < NOTICE_TTL_MS) {
      setNoticeCount(_noticeCache.length)
      setRecentNotices(_noticeCache.slice(0, 4))
    } else {
      apiGetNotices()
        .then(res => {
          if (mounted && res?.ok && Array.isArray(res.notices)) {
            _noticeCache = res.notices
            _noticeCacheAt = Date.now()
            setNoticeCount(res.notices.length)
            setRecentNotices(res.notices.slice(0, 4))
          }
        })
        .catch(() => {})
    }

    // Fetch real aggregated college statistics
    apiGetUserStats()
      .then(res => {
        if (mounted && res?.ok && res.stats) {
          setStatsData(res.stats)
        }
      })
      .catch(() => {})

    // Fetch real college departments
    apiGetDepartments()
      .then(res => {
        if (mounted && res?.ok && Array.isArray(res.departments)) {
          setDepartmentsList(res.departments)
        }
      })
      .catch(() => {})

    return () => { mounted = false }
  }, [])

  // ============================================================
  // STATS (Real backend stats with graceful context fallback)
  // ============================================================

  const students = users.filter(u => u.role === 'student')
  const totalStudents = statsData?.totalStudents ?? students.length
  const activeStudents = statsData?.activeStudents ?? students.filter(u => !u.suspended).length
  const suspendedStudents = statsData?.suspendedStudents ?? students.filter(u => u.suspended).length
  const totalDepartments = statsData?.totalDepartments ?? departmentsList.length
  const publishedNoticesCount = statsData?.activeNotices ?? noticeCount
  const totalPosts = posts.length

  // ============================================================
  // DEPARTMENT DATA (Dynamic from backend departments)
  // ============================================================

  const departmentColors = [
    'from-indigo-500 to-indigo-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-emerald-600',
    'from-rose-500 to-rose-600',
  ]

  let departmentData = []
  if (departmentsList.length > 0) {
    departmentData = departmentsList
      .map((d, index) => ({
        dept: d.name,
        count: d.studentCount || 0,
        color: departmentColors[index % departmentColors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  } else {
    const departmentMap = {}
    students.forEach(student => {
      const department = student.dept || 'Other'
      departmentMap[department] = (departmentMap[department] || 0) + 1
    })
    departmentData = Object.entries(departmentMap)
      .map(([dept, count], index) => ({
        dept,
        count,
        color: departmentColors[index % departmentColors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const maxDepartmentCount =
    departmentData.length > 0
      ? Math.max(...departmentData.map(d => d.count), 1)
      : 1

  // ============================================================
  // STUDENT ROSTER FILTER LOGIC
  // ============================================================

  const availableDepts = departmentsList.length > 0
    ? departmentsList.map(d => d.name)
    : Array.from(new Set(students.map(s => s.dept).filter(Boolean)))

  const availableYears = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  const filteredRoster = students.filter(s => {
    if (studentDeptFilter !== 'all' && s.dept?.toLowerCase() !== studentDeptFilter.toLowerCase()) {
      return false
    }
    if (studentYearFilter !== 'all' && s.year !== studentYearFilter) {
      return false
    }
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim()
      const matches = (
        s.name?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        (s.studentId && s.studentId.toLowerCase().includes(q))
      )
      if (!matches) return false
    }
    return true
  })

  // ============================================================
  // ACTIVITY
  // ============================================================

  const activityFeed = []

  if (users.length > 0) {
    const latestUser = users[users.length - 1]
    activityFeed.push({
      icon: UserPlus,
      type: 'brand',
      text: `${latestUser.name} joined Swish`,
      sub: `New student registration${latestUser.dept ? ` · ${latestUser.dept}` : ''}`,
      time: 'Recently',
    })
  }

  if (posts.length > 0) {
    const latestPost = posts[posts.length - 1]
    activityFeed.push({
      icon: FileText,
      type: 'violet',
      text: `New post by ${latestPost.userName}`,
      sub: `${latestPost.likes || 0} likes · ${latestPost.comments?.length || 0} comments`,
      time: latestPost.createdAt || 'Recently',
    })
  }

  if (suspendedStudents > 0) {
    activityFeed.push({
      icon: AlertTriangle,
      type: 'amber',
      text: `${suspendedStudents} suspended student${suspendedStudents !== 1 ? 's' : ''}`,
      sub: 'Actioned by College Administration',
      time: 'Recently',
    })
  }

  if (activityFeed.length === 0) {
    activityFeed.push({
      icon: Activity,
      type: 'brand',
      text: 'No recent activity',
      sub: 'Activity will appear here',
      time: '—',
    })
  }

  // ============================================================
  // COLOR HELPERS
  // ============================================================

  const activityColors = {
    brand: {
      bg: 'bg-indigo-100 dark:bg-indigo-500/10',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
    },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
    },
    violet: {
      bg: 'bg-violet-100 dark:bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
    },
  }

  // ============================================================
  // RETURN
  // ============================================================

  return (
    <div className="px-3.5 py-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-24 md:pb-8">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="mb-5 sm:mb-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/25">
              <GraduationCap
                size={22}
                className="text-white"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                {getGreeting()}, {user?.name || 'Faculty'} 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 truncate">
                Campus academics, official notices, and departmental overview
              </p>
            </div>
          </div>

          {/* Faculty Profile Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              <Award size={13} className="text-indigo-600 dark:text-indigo-400" />
              {user?.designation || 'Faculty Member'}
            </span>
            {user?.dept && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
                <Building2 size={13} className="text-slate-500 dark:text-gray-400" />
                {user.dept}
              </span>
            )}
            {user?.employeeId && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-100 dark:border-violet-900/50 shadow-sm">
                <BadgeCheck size={13} className="text-violet-600 dark:text-violet-400" />
                ID: {user.employeeId}
              </span>
            )}
            {(user?.college || user?.collegeName) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                <GraduationCap size={13} className="text-emerald-600 dark:text-emerald-400" />
                {user.college || user.collegeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          TABS
      ======================================================== */}

      <div className="grid grid-cols-3 sm:flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl mb-6 sm:mb-8 w-full sm:w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab === 'Notices') noticesEverActive.current = true
              setActiveTab(tab)
            }}
            onMouseEnter={tab === 'Notices' ? handleNoticesHint : undefined}
            onFocus={tab === 'Notices' ? handleNoticesHint : undefined}
            className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'Overview' && <BarChart3 size={15} />}
            {tab === 'Students' && <Users size={15} />}
            {tab === 'Notices' && <Megaphone size={15} />}
            <span>{tab}</span>
            {tab === 'Students' && students.length > 0 && (
              <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {students.length}
              </span>
            )}
            {tab === 'Notices' && noticeCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                {noticeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================
          OVERVIEW
      ======================================================== */}

      {activeTab === 'Overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* CAMPUS STORIES */}
          <div className="mb-8">
            <Stories />
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard
              icon={GraduationCap}
              label="Total Students"
              value={totalStudents}
              sub={activeStudents ? `${activeStudents.toLocaleString()} active enrolled` : 'Registered campus students'}
              iconBg="bg-indigo-100 dark:bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              trend="up"
              trendVal={totalStudents > 0 ? `${totalStudents} Enrolled` : null}
            />

            <StatCard
              icon={Activity}
              label="Active Students"
              value={activeStudents}
              sub="In good academic standing"
              iconBg="bg-emerald-100 dark:bg-emerald-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
              trend="up"
              trendVal={totalStudents > 0 ? `${Math.round((activeStudents / Math.max(totalStudents, 1)) * 100)}% active` : null}
            />

            <StatCard
              icon={Megaphone}
              label="Campus Notices"
              value={publishedNoticesCount}
              sub="Official announcements"
              iconBg="bg-indigo-100 dark:bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              trend="up"
              trendVal="Published"
            />

            <StatCard
              icon={Building2}
              label="Departments"
              value={totalDepartments || departmentData.length}
              sub="Academic branches"
              iconBg="bg-amber-100 dark:bg-amber-500/10"
              iconColor="text-amber-600 dark:text-amber-400"
              trend="up"
              trendVal={`${totalDepartments || departmentData.length} Branches`}
            />
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">

            {/* RECENT ACTIVITY */}
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">
                  Recent Activity
                </h2>
                <span className="text-xs text-slate-400">
                  Real-time updates
                </span>
              </div>

              <div className="p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                {activityFeed.map((item, index) => {
                  const Icon = item.icon
                  const colorConfig = activityColors[item.type] || activityColors.brand

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 sm:gap-4 py-3.5 sm:py-4 first:pt-0 last:pb-0"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${colorConfig.bg}`}
                      >
                        <Icon
                          size={18}
                          className={colorConfig.text}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {item.text}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.sub}
                        </p>
                      </div>

                      <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">

              {/* DEPARTMENT DISTRIBUTION */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 sm:p-5">
                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white mb-4">
                  Department Distribution
                </h2>

                <div className="space-y-4">
                  {departmentData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No departments yet.
                    </p>
                  ) : (
                    departmentData.map(({ dept, count, color }) => {
                      const percentage = Math.round((count / maxDepartmentCount) * 100)

                      return (
                        <div key={dept}>
                          <div className="flex justify-between text-[12px] mb-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {dept}
                            </span>
                            <span className="text-slate-400 font-medium">
                              {count.toLocaleString()}
                            </span>
                          </div>

                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* RECENT NOTICES */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">
                    Recent Campus Notices
                  </h2>
                  <button
                    onClick={() => {
                      noticesEverActive.current = true
                      setActiveTab('Notices')
                    }}
                    onMouseEnter={handleNoticesHint}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="space-y-3">
                  {recentNotices.length > 0 ? (
                    recentNotices.map(notice => (
                      <div
                        key={notice._id || notice.id}
                        onClick={() => {
                          noticesEverActive.current = true
                          setActiveTab('Notices')
                        }}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                            {notice.title}
                          </p>
                          {notice.pinned && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex-shrink-0">
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{notice.targetAudience ? `Audience: ${notice.targetAudience}` : 'General'}</span>
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            notice.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : notice.priority === 'high'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                          }`}>
                            {notice.priority || 'Normal'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-xs text-slate-400 mb-2">No notices published yet.</p>
                      <button
                        onClick={() => {
                          noticesEverActive.current = true
                          setActiveTab('Notices')
                        }}
                        onMouseEnter={handleNoticesHint}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                      >
                        + Create Notice
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </motion.div>
      )}

      {/* ========================================================
          STUDENTS ROSTER TAB
      ======================================================== */}

      {activeTab === 'Students' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Search & Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search students by name, username, roll no, or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all"
                />
                {studentSearch && (
                  <button
                    onClick={() => setStudentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 p-1 rounded-md"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Department Filter */}
              <div className="w-full md:w-56">
                <select
                  value={studentDeptFilter}
                  onChange={(e) => setStudentDeptFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {availableDepts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="w-full md:w-44">
                <select
                  value={studentYearFilter}
                  onChange={(e) => setStudentYearFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Showing <strong className="text-slate-900 dark:text-white font-semibold">{filteredRoster.length}</strong> {filteredRoster.length === 1 ? 'student' : 'students'}
                </span>
                {studentDeptFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-medium">
                    {studentDeptFilter}
                  </span>
                )}
                {studentYearFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                    {studentYearFilter}
                  </span>
                )}
              </div>

              {(studentSearch || studentDeptFilter !== 'all' || studentYearFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStudentSearch('')
                    setStudentDeptFilter('all')
                    setStudentYearFilter('all')
                  }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Student Cards Grid */}
          {filteredRoster.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users size={24} />
              </div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">No Students Found</h3>
              <p className="text-slate-400 dark:text-gray-500 text-xs sm:text-sm max-w-sm mx-auto mb-4">
                No students match your current search query or filter criteria.
              </p>
              <button
                onClick={() => {
                  setStudentSearch('')
                  setStudentDeptFilter('all')
                  setStudentYearFilter('all')
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoster.map((student) => {
                const avatarSrc = student.profilePhoto ? resolveImageUrl(student.profilePhoto) : null
                return (
                  <div
                    key={student.id || student._id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/70 rounded-2xl p-4 sm:p-5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top: Avatar & Name */}
                      <div className="flex items-start gap-3 mb-3">
                        <Link to={`/profile/${student.id || student._id}`} className="flex-shrink-0 group">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt=""
                              className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-indigo-400 transition-all"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: student.avatarColor || '#6366f1' }}
                            >
                              {student.initials}
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <Link
                              to={`/profile/${student.id || student._id}`}
                              className="text-slate-900 dark:text-white font-bold text-sm truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              {student.name}
                            </Link>
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                              student.suspended ? 'bg-rose-500' : 'bg-emerald-500'
                            }`} title={student.suspended ? 'Suspended' : 'Active'} />
                          </div>
                          <p className="text-slate-400 dark:text-gray-500 text-xs truncate">
                            @{student.username}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Badges (Dept, Year, Roll No) */}
                      <div className="flex flex-wrap gap-1.5 mb-3.5">
                        {student.dept && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {student.dept}
                          </span>
                        )}
                        {student.year && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                            {student.year}
                          </span>
                        )}
                        {student.studentId && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-gray-400 border border-slate-200/50 dark:border-slate-700/50">
                            Roll: {student.studentId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Email & View Profile action */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2">
                      <a
                        href={`mailto:${student.email}`}
                        className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex items-center gap-1.5 transition-colors"
                        title={student.email}
                      >
                        <Mail size={13} className="flex-shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </a>

                      <Link
                        to={`/profile/${student.id || student._id}`}
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex-shrink-0 flex items-center gap-1"
                      >
                        Profile <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================
          NOTICES TAB — lazy loaded
      ======================================================== */}

      {activeTab === 'Notices' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Suspense fallback={<TabLoader />}>
            <NoticeManagement />
          </Suspense>
        </motion.div>
      )}

    </div>
  )
}
