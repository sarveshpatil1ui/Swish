import { useState, useEffect } from 'react'
import { Search, User, Mail, Briefcase, Shield, ShieldAlert, Award, Crown, Filter } from 'lucide-react'
import { apiGetUsers, apiToggleUserStatus, apiToggleVerifiedBadge, apiToggleHOD, apiGetDepartments } from '../../utils/auth'

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState([])
  const [filteredFaculty, setFilteredFaculty] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchFaculty()
    fetchDepartments()
  }, [])

  useEffect(() => {
    let filtered = faculty
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.dept?.toLowerCase().includes(q) ||
        f.designation?.toLowerCase().includes(q)
      )
    }
    if (deptFilter) {
      filtered = filtered.filter(f => f.dept === deptFilter)
    }
    setFilteredFaculty(filtered)
  }, [searchQuery, deptFilter, faculty])

  const fetchFaculty = async () => {
    try {
      const res = await apiGetUsers()
      if (res.ok) {
        const facultyList = res.users.filter(u => u.role === 'faculty')
        setFaculty(facultyList)
        setFilteredFaculty(facultyList)
      }
    } catch (err) {
      console.error('[FacultyManagement] Error fetching faculty:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await apiGetDepartments()
      if (res.ok) {
        setDepartments(res.departments || [])
      }
    } catch (err) {
      console.error('[FacultyManagement] Error fetching departments:', err)
    }
  }

  const handleToggleStatus = async (userId) => {
    try {
      const res = await apiToggleUserStatus(userId)
      if (res.ok) {
        setFaculty(prev => prev.map(f =>
          (f.id === userId || f._id === userId) ? { ...f, suspended: res.user.suspended } : f
        ))
      } else {
        console.error('[FacultyManagement] Failed to update faculty status:', res.error)
      }
    } catch (err) {
      console.error('[FacultyManagement] Error toggling status:', err)
    }
  }

  const handleToggleVerifiedBadge = async (userId, currentStatus) => {
    try {
      const res = await apiToggleVerifiedBadge(userId, !currentStatus)
      if (res.ok) {
        setFaculty(prev => prev.map(f =>
          (f.id === userId || f._id === userId) ? { ...f, verifiedBadge: res.user.verifiedBadge } : f
        ))
      } else {
        console.error('[FacultyManagement] Failed to update verified badge:', res.error)
        alert(res.error || 'Failed to update verified badge')
      }
    } catch (err) {
      console.error('[FacultyManagement] Error toggling verified badge:', err)
    }
  }

  const handleToggleHOD = async (userId, currentStatus, facultyDept) => {
    if (currentStatus) {
      if (!window.confirm('Are you sure you want to remove HOD status from this faculty member?')) return
    } else {
      const dept = departments.find(d => d.name === facultyDept)
      if (!dept) {
        alert('Faculty must be assigned to a department before becoming HOD')
        return
      }
      if (!window.confirm(`Are you sure you want to assign this faculty member as HOD of ${facultyDept}?`)) return
    }

    try {
      const dept = departments.find(d => d.name === facultyDept)
      const res = await apiToggleHOD(userId, !currentStatus, dept?.id)
      if (res.ok) {
        setFaculty(prev => prev.map(f =>
          (f.id === userId || f._id === userId) ? { ...f, isHOD: res.user.isHOD } : f
        ))
      } else {
        console.error('[FacultyManagement] Failed to update HOD status:', res.error)
        alert(res.error || 'Failed to update HOD status')
      }
    } catch (err) {
      console.error('[FacultyManagement] Error toggling HOD status:', err)
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faculty Management</h1>
        <p className="text-slate-500 dark:text-gray-500 mt-1">View and manage faculty in your college</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search faculty by name, email, department, or designation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Filter size={16} className="text-slate-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
          {deptFilter && (
            <button
              onClick={() => setDeptFilter('')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-2"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{faculty.length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Total Faculty</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{faculty.filter(f => !f.suspended).length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Active</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{faculty.filter(f => f.suspended).length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {filteredFaculty.length === 0 ? (
          <div className="text-center py-12">
            <User size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No faculty found</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">No faculty members are currently registered for this college.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Faculty</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Badges</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFaculty.map((fac) => (
                    <tr key={fac.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: fac.avatarColor || '#10b981' }}
                          >
                            {fac.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 dark:text-white font-medium text-sm truncate">{fac.name}</p>
                            <p className="text-slate-500 dark:text-gray-500 text-xs truncate flex items-center gap-1">
                              <Mail size={12} /> {fac.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900 dark:text-white text-sm">{fac.dept || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-900 dark:text-white text-sm flex items-center gap-1">
                          <Briefcase size={14} /> {fac.designation || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleVerifiedBadge(fac.id, fac.verifiedBadge)}
                            className={`p-1.5 rounded-lg transition-all ${fac.verifiedBadge ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            title={fac.verifiedBadge ? 'Revoke verified badge' : 'Grant verified badge'}
                          >
                            <Award size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleHOD(fac.id, fac.isHOD, fac.dept)}
                            className={`p-1.5 rounded-lg transition-all ${fac.isHOD ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            title={fac.isHOD ? 'Remove HOD status' : 'Assign as HOD'}
                          >
                            <Crown size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          fac.suspended
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        }`}>
                          {fac.suspended ? (
                            <>
                              <ShieldAlert size={12} /> Suspended
                            </>
                          ) : (
                            <>
                              <Shield size={12} /> Active
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(fac.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            fac.suspended
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                          }`}
                        >
                          {fac.suspended ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFaculty.map((fac) => (
                <div key={fac.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: fac.avatarColor || '#10b981' }}
                    >
                      {fac.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-semibold text-sm">{fac.name}</p>
                      <p className="text-slate-500 dark:text-gray-500 text-xs flex items-center gap-1 mt-1">
                        <Mail size={12} /> {fac.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 dark:text-gray-500">Department</p>
                      <p className="text-slate-900 dark:text-white font-medium">{fac.dept || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 dark:text-gray-500">Designation</p>
                      <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1">
                        <Briefcase size={12} /> {fac.designation || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleVerifiedBadge(fac.id, fac.verifiedBadge)}
                        className={`p-1.5 rounded-lg transition-all ${fac.verifiedBadge ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title={fac.verifiedBadge ? 'Revoke verified badge' : 'Grant verified badge'}
                      >
                        <Award size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleHOD(fac.id, fac.isHOD, fac.dept)}
                        className={`p-1.5 rounded-lg transition-all ${fac.isHOD ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-gray-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        title={fac.isHOD ? 'Remove HOD status' : 'Assign as HOD'}
                      >
                        <Crown size={16} />
                      </button>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      fac.suspended
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}>
                      {fac.suspended ? (
                        <>
                          <ShieldAlert size={12} /> Suspended
                        </>
                      ) : (
                        <>
                          <Shield size={12} /> Active
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(fac.id)}
                    className={`w-full text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                      fac.suspended
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                    }`}
                  >
                    {fac.suspended ? 'Activate' : 'Suspend'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
