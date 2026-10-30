import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, User, Clock, FileText, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { apiGetActivityLogs, apiGetActivityLogStats } from '../../utils/auth'

const ACTION_TYPE_LABELS = {
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deleted: 'User Deleted',
  user_suspended: 'User Suspended',
  user_activated: 'User Activated',
  department_created: 'Department Created',
  department_updated: 'Department Updated',
  department_deleted: 'Department Deleted',
  department_activated: 'Department Activated',
  department_deactivated: 'Department Deactivated',
  notice_created: 'Notice Created',
  notice_updated: 'Notice Updated',
  notice_deleted: 'Notice Deleted',
  notice_published: 'Notice Published',
  post_hidden: 'Post Hidden',
  comment_hidden: 'Comment Hidden',
  badge_granted: 'Badge Granted',
  badge_revoked: 'Badge Revoked',
  hod_assigned: 'HOD Assigned',
  hod_removed: 'HOD Removed',
}

const RESOURCE_TYPE_LABELS = {
  user: 'User',
  department: 'Department',
  notice: 'Notice',
  post: 'Post',
  comment: 'Comment',
  college: 'College',
}

const ACTION_COLORS = {
  created: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  updated: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
  deleted: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
  suspended: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
  activated: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
  published: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40',
  hidden: 'text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-slate-800',
  granted: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
  revoked: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
  assigned: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40',
  removed: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedLog, setExpandedLog] = useState(null)

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [actionTypeFilter, resourceTypeFilter, startDate, endDate])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = {
        limit: 100,
      }
      if (actionTypeFilter) params.actionType = actionTypeFilter
      if (resourceTypeFilter) params.resourceType = resourceTypeFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await apiGetActivityLogs(params)
      if (res.ok) {
        setLogs(res.logs)
        setTotalLogs(res.total)
      }
    } catch (err) {
      console.error('[ActivityLog] Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await apiGetActivityLogStats()
      if (res.ok) {
        setStats(res.stats)
        setTotalLogs(res.totalLogs)
      }
    } catch (err) {
      console.error('[ActivityLog] Error fetching stats:', err)
    }
  }

  const getActionColor = (actionType) => {
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
      if (actionType.includes(key)) return color
    }
    return 'text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-slate-800'
  }

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        log.performedBy?.name?.toLowerCase().includes(q) ||
        log.actionType?.toLowerCase().includes(q) ||
        log.resourceType?.toLowerCase().includes(q) ||
        log.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Activity Log</h1>
        <p className="text-slate-600 dark:text-gray-400 text-sm">Track all administrative actions and changes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-4 py-3">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalLogs}</p>
          <p className="text-xs text-slate-500 dark:text-gray-500">Total Actions</p>
        </div>
        {stats.slice(0, 3).map(stat => (
          <div key={stat._id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stat.count}</p>
            <p className="text-xs text-slate-500 dark:text-gray-500 truncate">{ACTION_TYPE_LABELS[stat._id] || stat._id}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by user, action, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Action Type</label>
              <select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Resource Type</label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              >
                <option value="">All Resources</option>
                {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          {(actionTypeFilter || resourceTypeFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setActionTypeFilter('')
                setResourceTypeFilter('')
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-2"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Logs List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No activity logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => (
              <div
                key={log._id}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getActionColor(log.actionType)}`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getActionColor(log.actionType)}`}>
                        {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-gray-500">
                        {RESOURCE_TYPE_LABELS[log.resourceType] || log.resourceType}
                      </span>
                    </div>
                    <p className="text-slate-900 dark:text-white font-medium text-sm mb-1">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {log.performedBy?.name || 'System'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                      {log.collegeName && (
                        <span className="flex items-center gap-1">
                          <Building2 size={12} />
                          {log.collegeName}
                        </span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                        >
                          {expandedLog === log._id ? (
                            <>
                              <ChevronUp size={12} /> Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} /> Show Details
                            </>
                          )}
                        </button>
                        {expandedLog === log._id && (
                          <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs">
                            <pre className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
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
