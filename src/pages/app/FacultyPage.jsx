import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import {
  FileText, Activity,
  GraduationCap,
  TrendingUp, TrendingDown, UserPlus,
  AlertTriangle, Building2, Megaphone, BarChart3,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import { apiGetNotices } from '../../utils/auth'
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
  // Track whether Notices tab has ever been activated (for preload hint)
  const noticesEverActive = useRef(activeTab === 'Notices')

  const {
    currentUser: user,
    users,
    posts,
  } = useSwish()

  const tabs = ['Overview', 'Notices']

  // Prefetch NoticeManagement chunk when user hovers/focuses the Notices tab button
  const handleNoticesHint = () => {
    if (!noticesEverActive.current) {
      import('../college-admin/NoticeManagement').catch(() => {})
    }
  }

  // Fetch count and recent campus notices — uses module-level cache
  useEffect(() => {
    let mounted = true
    const now = Date.now()

    // Serve from cache if fresh
    if (_noticeCache && (now - _noticeCacheAt) < NOTICE_TTL_MS) {
      setNoticeCount(_noticeCache.length)
      setRecentNotices(_noticeCache.slice(0, 4))
      return
    }

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
    return () => { mounted = false }
  }, [])

  // ============================================================
  // STATS
  // ============================================================

  const students = users.filter(u => u.role === 'student')
  const totalStudents = students.length
  const activeStudents = students.filter(u => !u.suspended).length
  const suspendedStudents = students.filter(u => u.suspended).length
  const totalPosts = posts.length

  // ============================================================
  // DEPARTMENT DATA
  // ============================================================

  const departmentMap = {}

  students.forEach(student => {
    const department = student.dept || 'Other'
    if (!departmentMap[department]) {
      departmentMap[department] = 0
    }
    departmentMap[department]++
  })

  const departmentColors = [
    'from-indigo-500 to-indigo-600',
    'from-violet-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-emerald-600',
    'from-rose-500 to-rose-600',
  ]

  const departmentData = Object.entries(departmentMap)
    .map(([dept, count], index) => ({
      dept,
      count,
      color: departmentColors[index % departmentColors.length],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const maxDepartmentCount =
    departmentData.length > 0
      ? Math.max(...departmentData.map(d => d.count))
      : 1

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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-500/20">
            <GraduationCap
              size={20}
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
      </div>

      {/* ========================================================
          TABS
      ======================================================== */}

      <div className="grid grid-cols-2 sm:flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl mb-6 sm:mb-8 w-full sm:w-fit">
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
            {tab === 'Notices' && <Megaphone size={15} />}
            <span>{tab}</span>
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
              sub={`+${Math.min(totalStudents, 12)} registered recently`}
              iconBg="bg-indigo-100 dark:bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              trend="up"
              trendVal="+8.4%"
            />

            <StatCard
              icon={Activity}
              label="Active Students"
              value={activeStudents}
              sub={`out of ${totalStudents.toLocaleString()} students`}
              iconBg="bg-emerald-100 dark:bg-emerald-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
              trend="up"
              trendVal="+6.2%"
            />

            <StatCard
              icon={Megaphone}
              label="Campus Notices"
              value={noticeCount}
              sub="Official announcements"
              iconBg="bg-indigo-100 dark:bg-indigo-500/10"
              iconColor="text-indigo-600 dark:text-indigo-400"
              trend="up"
              trendVal="Published"
            />

            <StatCard
              icon={Building2}
              label="Departments"
              value={departmentData.length}
              sub="Academic branches"
              iconBg="bg-amber-100 dark:bg-amber-500/10"
              iconColor="text-amber-600 dark:text-amber-400"
              trend="up"
              trendVal={`${departmentData.length} active`}
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
                          <span>{notice.category || 'General'}</span>
                          <span className={notice.published ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                            {notice.published ? 'Published' : 'Draft'}
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
