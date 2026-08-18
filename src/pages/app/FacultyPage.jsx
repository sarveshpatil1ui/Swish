import { useState } from 'react'
import {
  Users, FileText, Flag, Activity, Search,
  CheckCircle, Trash2, Shield,
  GraduationCap, Eye, EyeOff,
  TrendingUp, TrendingDown, UserPlus,
  ArrowUpRight, AlertTriangle, Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'

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
            {trend === 'up' ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {trendVal}
          </span>
        )}
      </div>

      <p className="text-[28px] font-black text-slate-900 dark:text-white leading-none mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
        {label}
      </p>

      <p className="text-[11px] text-slate-400">
        {sub}
      </p>
    </div>
  )
}

export default function FacultyPage({ defaultTab = 'Overview' }) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
  const [reportFilter, setReportFilter] = useState('all')
  const [postQuery, setPostQuery] = useState('')

  const {
    currentUser: user,
    users,
    toggleUserStatus,
    posts,
    hidePost,
    showPost,
    deletePost,
    reports,
    updateReportStatus,
  } = useSwish()

  const tabs = ['Overview', 'Students', 'Reports', 'Moderation', 'Posts']

  // ============================================================
  // STATS
  // ============================================================

  const students = users.filter(u => u.role === 'student')

  const totalStudents = students.length

  const activeStudents = students.filter(
    u => !u.suspended
  ).length

  const suspendedStudents = students.filter(
    u => u.suspended
  ).length

  const totalPosts = posts.length

  const pendingReports = reports.filter(
    r => (r.status || 'pending') === 'pending'
  ).length

  const reviewedReports = reports.filter(
    r => r.status === 'reviewed'
  ).length

  const resolvedReports = reports.filter(
    r => r.status === 'resolved'
  ).length

  const dismissedReports = reports.filter(
    r => r.status === 'dismissed'
  ).length

  // ============================================================
  // STUDENTS
  // ============================================================

  const filteredStudents = users
    .filter(u => u.role === 'student')
    .filter(u => {
      if (studentFilter === 'active') return !u.suspended
      if (studentFilter === 'suspended') return u.suspended
      return true
    })
    .filter(u =>
      u.name.toLowerCase().includes(studentQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(studentQuery.toLowerCase()) ||
      (u.dept || '').toLowerCase().includes(studentQuery.toLowerCase())
    )

  // ============================================================
  // REPORTS
  // ============================================================

  const filteredReports = reports.filter(r =>
    reportFilter === 'all' ||
    (r.status || 'pending') === reportFilter
  )

  // ============================================================
  // POSTS
  // ============================================================

  const filteredPosts = posts.filter(p =>
    (p.caption || '')
      .toLowerCase()
      .includes(postQuery.toLowerCase()) ||
    (p.userName || '')
      .toLowerCase()
      .includes(postQuery.toLowerCase()) ||
    (p.tags || []).some(t =>
      t.toLowerCase().includes(postQuery.toLowerCase())
    )
  )

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
      color:
        departmentColors[index % departmentColors.length],
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

  if (reports.length > 0) {
    const latestReport = reports[reports.length - 1]

    activityFeed.push({
      icon: Flag,
      type: 'red',
      text: `New report: ${latestReport.reason}`,
      sub: `Reported by ${latestReport.reportedBy}`,
      time: latestReport.time || 'Recently',
    })
  }

  if (resolvedReports > 0) {
    activityFeed.push({
      icon: CheckCircle,
      type: 'emerald',
      text: `${resolvedReports} report${resolvedReports !== 1 ? 's' : ''} resolved`,
      sub: 'Moderation action completed',
      time: 'Recently',
    })
  }

  if (posts.length > 0) {
    const latestPost = posts[posts.length - 1]

    activityFeed.push({
      icon: FileText,
      type: 'violet',
      text: `New post by ${latestPost.userName}`,
      sub: `${latestPost.likes || 0} likes · ${
        latestPost.comments?.length || 0
      } comments`,
      time: latestPost.createdAt || 'Recently',
    })
  }

  if (suspendedStudents > 0) {
    activityFeed.push({
      icon: AlertTriangle,
      type: 'amber',
      text: `${suspendedStudents} suspended student${
        suspendedStudents !== 1 ? 's' : ''
      }`,
      sub: 'Requires faculty attention',
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
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="mb-7">

        <div className="flex items-center gap-3 mb-2">

          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <GraduationCap
              size={20}
              className="text-white"
            />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Good evening, {user?.name || 'Faculty'} 👋
            </h1>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Here's what's happening in your department right now
            </p>
          </div>

        </div>

      </div>

      {/* ========================================================
          TABS
      ======================================================== */}

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl mb-8 w-fit flex-wrap">

        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab}
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

          {/* ====================================================
              STAT CARDS
          ==================================================== */}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

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
              icon={FileText}
              label="Total Posts"
              value={totalPosts}
              sub={`${Math.min(totalPosts, 10)} new recently`}
              iconBg="bg-violet-100 dark:bg-violet-500/10"
              iconColor="text-violet-600 dark:text-violet-400"
              trend="up"
              trendVal="+5.1%"
            />

            <StatCard
              icon={Flag}
              label="Open Reports"
              value={pendingReports}
              sub={`${reports.length} total filed`}
              iconBg="bg-red-100 dark:bg-red-500/10"
              iconColor="text-red-600 dark:text-red-400"
              trend={pendingReports > 0 ? 'down' : 'up'}
              trendVal={
                pendingReports > 0
                  ? `${pendingReports} pending`
                  : 'All clear'
              }
            />

          </div>

          {/* ====================================================
              MAIN CONTENT
          ==================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ==================================================
                RECENT ACTIVITY
            ================================================== */}

            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">

              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">

                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">
                  Recent Activity
                </h2>

                <button
                  onClick={() => setActiveTab('Reports')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowUpRight size={12} />
                </button>

              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">

                {activityFeed.slice(0, 6).map((item, index) => {

                  const colors =
                    activityColors[item.type] ||
                    activityColors.brand

                  const Icon = item.icon

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >

                      <div
                        className={`w-9 h-9 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <Icon
                          size={16}
                          className={colors.text}
                        />
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
                          {item.text}
                        </p>

                        <p className="text-[12px] text-slate-400 mt-0.5">
                          {item.sub}
                        </p>

                      </div>

                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mt-0.5">
                        {item.time}
                      </span>

                    </div>
                  )
                })}

              </div>

            </div>

            {/* ==================================================
                RIGHT COLUMN
            ================================================== */}

            <div className="space-y-6">

              {/* ================================================
                  STUDENTS BY DEPARTMENT
              ================================================= */}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">

                <h2 className="font-bold text-[15px] text-slate-900 dark:text-white mb-5">
                  Students by Department
                </h2>

                <div className="space-y-4">

                  {departmentData.length === 0 ? (

                    <p className="text-sm text-slate-400 text-center py-4">
                      No department data available.
                    </p>

                  ) : (

                    departmentData.map(
                      ({ dept, count, color }) => {

                        const percentage =
                          (count / maxDepartmentCount) * 100

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
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />

                            </div>

                          </div>
                        )
                      }
                    )

                  )}

                </div>

              </div>

              {/* ================================================
                  REPORT SUMMARY
              ================================================= */}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">

                <div className="flex items-center justify-between mb-5">

                  <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">
                    Reports
                  </h2>

                  <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                    {pendingReports} pending
                  </span>

                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">

                  {[
                    {
                      label: 'Pending',
                      count: pendingReports,
                      dot: 'bg-amber-500',
                      color: 'amber',
                    },
                    {
                      label: 'Reviewed',
                      count: reviewedReports,
                      dot: 'bg-indigo-500',
                      color: 'indigo',
                    },
                    {
                      label: 'Resolved',
                      count: resolvedReports,
                      dot: 'bg-emerald-500',
                      color: 'emerald',
                    },
                    {
                      label: 'Dismissed',
                      count: dismissedReports,
                      dot: 'bg-slate-400',
                      color: 'slate',
                    },
                  ].map(item => (

                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >

                      <div className="flex items-center gap-2.5">

                        <div
                          className={`w-2 h-2 rounded-full ${item.dot}`}
                        />

                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                          {item.label}
                        </span>

                      </div>

                      <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.count}
                      </span>

                    </div>

                  ))}

                </div>

              </div>

              {/* ================================================
                  RECENT STUDENTS
              ================================================= */}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5">

                <div className="flex items-center justify-between mb-5">

                  <h2 className="font-bold text-[15px] text-slate-900 dark:text-white">
                    Recent Students
                  </h2>

                  <button
                    onClick={() => setActiveTab('Students')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold"
                  >
                    View all
                  </button>

                </div>

                <div className="space-y-3">

                  {students.slice(-3).reverse().map(u => (

                    <div
                      key={u.id}
                      className="flex items-center gap-3"
                    >

                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            u.avatarColor || '#6366f1',
                        }}
                      >
                        {u.initials ||
                          u.name
                            ?.split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)}
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                          {u.name}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {u.dept || 'Student'}
                        </p>

                      </div>

                      {!u.suspended && (
                        <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center">
                          <CheckCircle
                            size={12}
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      )}

                    </div>

                  ))}

                  {students.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-3">
                      No students yet.
                    </p>
                  )}

                </div>

              </div>

            </div>

          </div>

        </motion.div>
      )}

      {/* ========================================================
          STUDENTS TAB
      ======================================================== */}

      {activeTab === 'Students' && (

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >

          <div className="relative">

            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search students by name, email or department…"
              value={studentQuery}
              onChange={e => setStudentQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-all"
            />

          </div>

          <div className="flex gap-2 flex-wrap">

            {['all', 'active', 'suspended'].map(f => (

              <button
                key={f}
                onClick={() => setStudentFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-all ${
                  studentFilter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>

            ))}

          </div>

          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">

            <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-gray-800/60 border-b border-slate-100 dark:border-gray-800">

              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Student
              </p>

              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Status
              </p>

              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">
                Action
              </p>

            </div>

            {filteredStudents.length === 0 ? (

              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">
                  No students found.
                </p>
              </div>

            ) : (

              filteredStudents.map(u => {

                const status =
                  u.suspended ? 'suspended' : 'active'

                return (

                  <div
                    key={u.id}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 items-start sm:items-center px-5 py-4 border-b border-slate-50 dark:border-gray-800/60 last:border-0"
                  >

                    <div className="flex items-center gap-3 min-w-0 w-full">

                      <div
                        className="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor:
                            u.avatarColor || '#6366f1',
                        }}
                      >
                        {u.initials}
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-slate-800 dark:text-gray-200 text-sm font-semibold truncate">
                          {u.name}
                        </p>

                        <p className="text-slate-400 text-xs truncate">
                          @{u.username || u.name.toLowerCase().replace(/\s+/g, '')}
                          {u.email ? ` · ${u.email}` : ''}
                        </p>

                        <p className="text-slate-400 text-xs truncate">
                          {u.college || ''}
                          {u.dept ? ` · ${u.dept}` : ''}
                          {u.year ? ` · ${u.year}` : ''}
                          {u.studentId ? ` · ID: ${u.studentId}` : ''}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">

                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          status === 'suspended'
                            ? 'text-rose-600 bg-rose-50 border-rose-200'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {status === 'suspended'
                          ? 'Suspended'
                          : 'Active'}
                      </span>

                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                          status === 'suspended'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {status === 'suspended'
                          ? 'Activate'
                          : 'Suspend'}
                      </button>

                    </div>

                  </div>

                )
              })

            )}

          </div>

        </motion.div>
      )}

      {/* ========================================================
          REPORTS TAB
      ======================================================== */}

      {activeTab === 'Reports' && (

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >

          <div className="flex flex-wrap gap-2">

            {[
              'all',
              'pending',
              'reviewed',
              'resolved',
              'dismissed',
            ].map(f => {

              const count =
                f === 'all'
                  ? reports.length
                  : reports.filter(
                      r => (r.status || 'pending') === f
                    ).length

              return (

                <button
                  key={f}
                  onClick={() => setReportFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize ${
                    reportFilter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400'
                  }`}
                >
                  {f} ({count})
                </button>

              )
            })}

          </div>

          {filteredReports.length === 0 ? (

            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">

              <CheckCircle
                size={32}
                className="text-emerald-400 mx-auto mb-3"
              />

              <p className="text-slate-600 dark:text-gray-400 font-semibold text-sm">
                All clear!
              </p>

              <p className="text-slate-400 text-xs mt-1">
                No reports matching this filter.
              </p>

            </div>

          ) : (

            filteredReports.map(r => (

              <div
                key={r.id}
                className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5"
              >

                <div className="flex items-start justify-between gap-4 mb-4">

                  <div>

                    <div className="flex items-center gap-2 mb-1">

                      <Flag
                        size={14}
                        className="text-rose-500"
                      />

                      <p className="text-slate-900 dark:text-white font-semibold text-sm">
                        {r.reason}
                      </p>

                    </div>

                    <p className="text-slate-400 text-xs">
                      Reported by {r.reportedBy} · {r.time}
                    </p>

                  </div>

                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border capitalize">
                    {r.status || 'pending'}
                  </span>

                </div>

                <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-4">

                  <p className="text-slate-500 text-xs font-medium mb-1">
                    Post caption:
                  </p>

                  <p className="text-slate-700 dark:text-gray-300 text-sm italic">
                    "{r.postCaption}"
                  </p>

                </div>

                <div className="flex flex-wrap gap-2">

                  {(r.status || 'pending') === 'pending' && (
                    <button
                      onClick={() =>
                        updateReportStatus(r.id, 'reviewed')
                      }
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold"
                    >
                      Mark Reviewed
                    </button>
                  )}

                  {(r.status || 'pending') !== 'resolved' && (
                    <button
                      onClick={() =>
                        updateReportStatus(r.id, 'resolved')
                      }
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold"
                    >
                      Resolve
                    </button>
                  )}

                  {(r.status || 'pending') !== 'dismissed' && (
                    <button
                      onClick={() =>
                        updateReportStatus(r.id, 'dismissed')
                      }
                      className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  )}

                </div>

              </div>

            ))

          )}

        </motion.div>
      )}

      {/* ========================================================
          MODERATION TAB
      ======================================================== */}

      {activeTab === 'Moderation' && (

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >

          <p className="text-slate-500 text-sm">
            {reports.length} total reports · {pendingReports} pending
          </p>

          {reports.map(r => {

            const reportedPost = posts.find(
              p =>
                p.caption === r.postCaption ||
                p.id === r.postId
            )

            const reportedUser = reportedPost
              ? users.find(
                  u =>
                    u.id === reportedPost.userId ||
                    u.name === reportedPost.userName
                )
              : null

            return (

              <div
                key={r.id}
                className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5"
              >

                <div className="flex items-start justify-between gap-4 mb-3">

                  <div>

                    <div className="flex items-center gap-2 mb-1">

                      <Flag
                        size={14}
                        className="text-rose-500"
                      />

                      <p className="text-slate-900 dark:text-white font-semibold text-sm">
                        {r.reason}
                      </p>

                    </div>

                    <div className="flex gap-3 text-xs text-slate-400">

                      <span>
                        Reporter:{' '}
                        <b>{r.reportedBy}</b>
                      </span>

                      {reportedUser && (
                        <span>
                          Reported user:{' '}
                          <b>{reportedUser.name}</b>
                        </span>
                      )}

                      <span>{r.time}</span>

                    </div>

                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full border capitalize">
                    {r.status || 'pending'}
                  </span>

                </div>

                <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-4">

                  <p className="text-slate-500 text-xs font-medium mb-1">
                    Reported post content:
                  </p>

                  <p className="text-slate-700 dark:text-gray-300 text-sm italic">
                    "{r.postCaption}"
                  </p>

                  {reportedPost && (
                    <p className="text-slate-400 text-xs mt-1">
                      by {reportedPost.userName} ·{' '}
                      {reportedPost.likes} likes ·{' '}
                      {reportedPost.comments?.length || 0}{' '}
                      comments
                    </p>
                  )}

                </div>

                <div className="flex flex-wrap gap-2">

                  {reportedPost && !reportedPost.hidden && (
                    <button
                      onClick={() =>
                        hidePost(reportedPost.id)
                      }
                      className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <EyeOff size={12} />
                      Hide Post
                    </button>
                  )}

                  {reportedPost && reportedPost.hidden && (
                    <button
                      onClick={() =>
                        showPost(reportedPost.id)
                      }
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Show Post
                    </button>
                  )}

                  {reportedPost && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Delete this post permanently?'
                          )
                        ) {
                          deletePost(reportedPost.id)
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Delete Post
                    </button>
                  )}

                  {(r.status || 'pending') !== 'resolved' && (
                    <button
                      onClick={() =>
                        updateReportStatus(
                          r.id,
                          'resolved'
                        )
                      }
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold"
                    >
                      Resolve
                    </button>
                  )}

                  {(r.status || 'pending') !== 'dismissed' && (
                    <button
                      onClick={() =>
                        updateReportStatus(
                          r.id,
                          'dismissed'
                        )
                      }
                      className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  )}

                  {reportedUser &&
                    !reportedUser.suspended && (
                      <button
                        onClick={() =>
                          toggleUserStatus(
                            reportedUser.id
                          )
                        }
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold"
                      >
                        Suspend User
                      </button>
                    )}

                </div>

              </div>

            )
          })}

        </motion.div>
      )}

      {/* ========================================================
          POSTS TAB
      ======================================================== */}

      {activeTab === 'Posts' && (

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >

          <div className="relative">

            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search posts by content, author, or tags…"
              value={postQuery}
              onChange={e =>
                setPostQuery(e.target.value)
              }
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />

          </div>

          <p className="text-slate-500 text-sm">
            {filteredPosts.length} post
            {filteredPosts.length !== 1 ? 's' : ''}{' '}
            found
          </p>

          <div className="space-y-4">

            {filteredPosts.map(p => (

              <div
                key={p.id}
                className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 ${
                  p.hidden
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 dark:border-gray-800'
                }`}
              >

                <div className="flex items-start justify-between gap-4 mb-3">

                  <div className="flex items-center gap-3">

                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{
                        backgroundColor:
                          p.userAvatarColor ||
                          '#6366f1',
                      }}
                    >
                      {p.userInitials}
                    </div>

                    <div>

                      <p className="text-slate-900 dark:text-white font-semibold text-sm">
                        {p.userName}
                      </p>

                      <p className="text-slate-400 text-xs">
                        {p.createdAt}
                        {p.hidden && ' · HIDDEN'}
                      </p>

                    </div>

                  </div>

                  <div className="flex gap-2 flex-wrap">

                    {p.hidden ? (

                      <button
                        onClick={() =>
                          showPost(p.id)
                        }
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold"
                      >
                        Show
                      </button>

                    ) : (

                      <button
                        onClick={() =>
                          hidePost(p.id)
                        }
                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold"
                      >
                        Hide
                      </button>

                    )}

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Delete this post permanently?'
                          )
                        ) {
                          deletePost(p.id)
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>

                  </div>

                </div>

                <p className="text-slate-700 dark:text-gray-300 text-sm mb-3 whitespace-pre-wrap">
                  {p.caption}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">

                  {p.tags?.map(t => (

                    <span
                      key={t}
                      className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
                    >
                      {t}
                    </span>

                  ))}

                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">

                  <span>
                    {p.likes} Likes
                  </span>

                  <span>
                    {p.comments?.length || 0} Comments
                  </span>

                </div>

              </div>

            ))}

          </div>

        </motion.div>
      )}

    </div>
  )
}