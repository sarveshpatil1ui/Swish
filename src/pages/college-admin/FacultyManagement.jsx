import { useState, useEffect } from 'react'
import { Search, User, Mail, Briefcase, Shield, ShieldAlert } from 'lucide-react'
import { apiGetUsers, apiToggleUserStatus } from '../../utils/auth'

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState([])
  const [filteredFaculty, setFilteredFaculty] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFaculty()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = faculty.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.dept?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.designation?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFaculty(filtered)
    } else {
      setFilteredFaculty(faculty)
    }
  }, [searchQuery, faculty])

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

  const handleToggleStatus = async (userId) => {
    try {
      const res = await apiToggleUserStatus(userId)
      if (res.ok) {
        setFaculty(prev => prev.map(f => 
          f.id === userId ? { ...f, suspended: res.user.suspended } : f
        ))
      } else {
        alert(res.error || 'Failed to update faculty status')
      }
    } catch (err) {
      console.error('[FacultyManagement] Error toggling status:', err)
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
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{faculty.length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Total Faculty</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{faculty.filter(f => !f.suspended).length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Active</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{faculty.filter(f => f.suspended).length}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {filteredFaculty.length === 0 ? (
          <div className="text-center py-12">
            <User size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No faculty found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-gray-800/60 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Faculty</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {filteredFaculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
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
        )}
      </div>
    </div>
  )
}
