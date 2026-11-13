import { useState, useEffect } from 'react'
import { Search, User, Mail, Calendar, MapPin, MoreVertical, Shield, ShieldAlert, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { apiGetUsers, apiToggleUserStatus, apiGetDepartments } from '../../utils/auth'

export default function StudentManagement() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const academicYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']

  useEffect(() => {
    fetchStudents()
    fetchDepartments()
  }, [])

  useEffect(() => {
    let filtered = students
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.dept?.toLowerCase().includes(q) ||
        s.year?.toLowerCase().includes(q) ||
        s.rollNumber?.toLowerCase().includes(q)
      )
    }
    if (deptFilter) {
      filtered = filtered.filter(s => s.dept === deptFilter)
    }
    if (yearFilter) {
      filtered = filtered.filter(s => s.year === yearFilter)
    }
    setFilteredStudents(filtered)
  }, [searchQuery, deptFilter, yearFilter, students])

  const fetchStudents = async () => {
    try {
      const res = await apiGetUsers()
      if (res.ok) {
        const studentList = res.users.filter(u => u.role === 'student')
        setStudents(studentList)
        setFilteredStudents(studentList)
      }
    } catch (err) {
      console.error('[StudentManagement] Error fetching students:', err)
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
      console.error('[StudentManagement] Error fetching departments:', err)
    }
  }

  const handleToggleStatus = async (userId) => {
    try {
      const res = await apiToggleUserStatus(userId)
      if (res.ok) {
        setStudents(prev => prev.map(s => 
          (s.id === userId || s._id === userId) ? { ...s, suspended: res.user.suspended } : s
        ))
      } else {
        console.error('[StudentManagement] Failed to update student status:', res.error)
      }
    } catch (err) {
      console.error('[StudentManagement] Error toggling status:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-base-900 dark:text-white font-heading">Student Management</h1>
        <p className="text-base-500 dark:text-base-400 mt-1 text-sm">View and manage students in your college</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
        <input
          type="text"
          placeholder="Search students by name, email, roll number, department, or year..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-accent-400 dark:focus:border-accent-600 transition-all text-sm"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-base-100 dark:bg-base-800 rounded-lg hover:bg-base-200 dark:hover:bg-base-700 transition-colors"
        >
          <Filter size={16} className="text-base-600 dark:text-base-400" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-4 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1">Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent-400 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1">Academic Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-accent-400 text-sm"
              >
                <option value="">All Years</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          {(deptFilter || yearFilter) && (
            <button
              onClick={() => { setDeptFilter(''); setYearFilter(''); }}
              className="text-xs text-accent-600 dark:text-accent-400 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 shadow-xs">
          <p className="text-2xl font-bold text-base-900 dark:text-white font-heading">{students.length}</p>
          <p className="text-xs text-base-500 dark:text-base-400">Total Students</p>
        </div>
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 shadow-xs">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">{students.filter(s => !s.suspended).length}</p>
          <p className="text-xs text-base-500 dark:text-base-400">Active</p>
        </div>
        <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3 shadow-xs">
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-heading">{students.filter(s => s.suspended).length}</p>
          <p className="text-xs text-base-500 dark:text-base-400">Suspended</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden shadow-xs">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User size={32} className="text-base-300 dark:text-base-600 mx-auto mb-3" />
            <p className="text-base-500 dark:text-base-400 text-sm">No students found</p>
            <p className="text-base-400 dark:text-base-500 text-xs mt-1">No students are currently registered for this college.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-base-50 dark:bg-base-800/60 border-b border-base-200 dark:border-base-800">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Student</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Roll Number</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Department</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Year</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-base-500 dark:text-base-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-100 dark:divide-base-800">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-base-50 dark:hover:bg-base-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: student.avatarColor || '#5B5FEF' }}
                          >
                            {student.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base-900 dark:text-white font-medium text-sm truncate">{student.name}</p>
                            <p className="text-base-500 dark:text-base-400 text-xs truncate flex items-center gap-1">
                              <Mail size={12} /> {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-base-900 dark:text-white text-sm font-mono">{student.rollNumber || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-base-900 dark:text-white text-sm">{student.dept || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-base-900 dark:text-white text-sm">{student.year || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.suspended
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        }`}>
                          {student.suspended ? (
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
                          onClick={() => handleToggleStatus(student.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            student.suspended
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                          }`}
                        >
                          {student.suspended ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-base-100 dark:divide-base-800">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: student.avatarColor || '#5B5FEF' }}
                    >
                      {student.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base-900 dark:text-white font-semibold text-sm">{student.name}</p>
                      <p className="text-base-500 dark:text-base-400 text-xs flex items-center gap-1 mt-1">
                        <Mail size={12} /> {student.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-xs text-base-400 dark:text-base-500">Roll Number</p>
                      <p className="text-base-900 dark:text-white font-medium font-mono">{student.rollNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-base-400 dark:text-base-500">Department</p>
                      <p className="text-base-900 dark:text-white font-medium">{student.dept || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-base-400 dark:text-base-500">Year</p>
                      <p className="text-base-900 dark:text-white font-medium">{student.year || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      student.suspended
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    }`}>
                      {student.suspended ? (
                        <>
                          <ShieldAlert size={12} /> Suspended
                        </>
                      ) : (
                        <>
                          <Shield size={12} /> Active
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(student.id)}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all min-w-[100px] ${
                        student.suspended
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                      }`}
                    >
                      {student.suspended ? 'Activate' : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
