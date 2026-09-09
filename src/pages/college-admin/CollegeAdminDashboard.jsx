import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, Building2, Megaphone,
  TrendingUp, Activity, Calendar, ArrowRight
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiGetUsers, apiGetDepartments, apiGetNotices } from '../../utils/auth'

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
        {typeof value === 'number' ? value.toLocaleString() : value}
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

export default function CollegeAdminDashboard() {
  const navigate = useNavigate()
  const { currentUser } = useSwish()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalDepartments: 0,
    totalNotices: 0,
  })
  const [recentNotices, setRecentNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [usersRes, deptsRes, noticesRes] = await Promise.all([
        apiGetUsers(),
        apiGetDepartments(),
        apiGetNotices(),
      ])

      if (usersRes.ok) {
        const students = usersRes.users.filter(u => u.role === 'student').length
        const faculty = usersRes.users.filter(u => u.role === 'faculty').length
        setStats(prev => ({
          ...prev,
          totalStudents: students,
          totalFaculty: faculty,
        }))
      }

      if (deptsRes.ok) {
        setStats(prev => ({ ...prev, totalDepartments: deptsRes.departments.length }))
      }

      if (noticesRes.ok) {
        setStats(prev => ({ ...prev, totalNotices: noticesRes.notices.length }))
        setRecentNotices(noticesRes.notices.slice(0, 5))
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome back, {currentUser?.name}
        </h1>
        <p className="text-slate-500 dark:text-gray-500 mt-1">
          Here's what's happening at {currentUser?.college}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          iconBg="bg-indigo-100 dark:bg-indigo-950/60"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={GraduationCap}
          label="Total Faculty"
          value={stats.totalFaculty}
          iconBg="bg-emerald-100 dark:bg-emerald-950/60"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={stats.totalDepartments}
          iconBg="bg-violet-100 dark:bg-violet-950/60"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={Megaphone}
          label="Active Notices"
          value={stats.totalNotices}
          iconBg="bg-amber-100 dark:bg-amber-950/60"
          iconColor="text-amber-600 dark:text-amber-400"
        />
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
            {recentNotices.map((notice) => (
              <div
                key={notice.id}
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
    </div>
  )
}
