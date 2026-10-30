import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Search, Eye, MessageSquare, User as UserIcon, Ban, EyeOff, ShieldAlert } from 'lucide-react'
import { apiGetReports, apiUpdateReportStatus, apiHidePost, apiHideComment, apiToggleUserStatus } from '../../utils/auth'

const STATUS_COLORS = {
  pending: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  reviewed: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  resolved: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  dismissed: 'text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800',
}

const STATUS_ICONS = {
  pending: Clock,
  reviewed: Eye,
  resolved: CheckCircle,
  dismissed: XCircle,
}

const CATEGORY_LABELS = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  misinformation: 'Misinformation',
  other: 'Other',
}

const TYPE_LABELS = {
  user: 'User',
  post: 'Post',
  comment: 'Comment',
}

export default function ReportsManagement() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actioning, setActioning] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [filterStatus, filterType])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await apiGetReports({ status: filterStatus, type: filterType, limit: 100 })
      if (res.ok) {
        setReports(res.reports)
      }
    } catch (err) {
      console.error('[ReportsManagement] Error fetching reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (reportId, newStatus) => {
    setUpdating(true)
    try {
      const res = await apiUpdateReportStatus(reportId, { status: newStatus, resolutionNotes })
      if (res.ok) {
        setReports(prev => prev.map(r => (r._id === reportId || r.id === reportId) ? res.report : r))
        setSelectedReport(res.report)
        setShowResolveModal(false)
        setResolutionNotes('')
      }
    } catch (err) {
      console.error('[ReportsManagement] Error updating report:', err)
    } finally {
      setUpdating(false)
    }
  }

  const openResolveModal = (report) => {
    setSelectedReport(report)
    setResolutionNotes(report.resolutionNotes || '')
    setShowResolveModal(true)
  }

  const openActionModal = (report, action) => {
    setSelectedReport(report)
    setActionType(action)
    setActionReason('')
    setShowActionModal(true)
  }

  const handleModerationAction = async () => {
    if (!actionReason.trim()) {
      alert('Please provide a reason for this action')
      return
    }

    setActioning(true)
    try {
      if (actionType === 'hide_post' && selectedReport.reportedPostId) {
        const res = await apiHidePost(selectedReport.reportedPostId, actionReason)
        if (res.ok) {
          alert('Post hidden successfully')
        } else {
          alert(res.error || 'Failed to hide post')
        }
      } else if (actionType === 'hide_comment' && selectedReport.reportedCommentId) {
        const res = await apiHideComment(selectedReport.reportedCommentId, actionReason)
        if (res.ok) {
          alert('Comment hidden successfully')
        } else {
          alert(res.error || 'Failed to hide comment')
        }
      } else if (actionType === 'suspend_user' && selectedReport.reportedUserId) {
        const res = await apiToggleUserStatus(selectedReport.reportedUserId)
        if (res.ok) {
          alert('User suspended successfully')
        } else {
          alert(res.error || 'Failed to suspend user')
        }
      }
      setShowActionModal(false)
      setActionReason('')
    } catch (err) {
      console.error('[ReportsManagement] Error performing action:', err)
      alert('Failed to perform action')
    } finally {
      setActioning(false)
    }
  }

  const filteredReports = reports.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        r.reporterName?.toLowerCase().includes(q) ||
        r.reportedUserName?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Moderation</h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">Review and moderate user reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
        >
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="post">Post</option>
          <option value="comment">Comment</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredReports.map((report) => {
              const StatusIcon = STATUS_ICONS[report.status]
              return (
                <div
                  key={report._id || report.id}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg border ${STATUS_COLORS[report.status]}`}>
                      <StatusIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status]}`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-gray-500">
                          {TYPE_LABELS[report.type]} · {CATEGORY_LABELS[report.category]}
                        </span>
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium text-sm mb-1">
                        {report.reporterName} reported {report.reportedUserName}
                      </p>
                      <p className="text-slate-600 dark:text-gray-400 text-sm line-clamp-2">
                        {report.description}
                      </p>
                      <p className="text-slate-400 dark:text-gray-600 text-xs mt-2">
                        {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedReport(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedReport.status]}`}>
                    {(() => {
                      const Icon = STATUS_ICONS[selectedReport.status]
                      return Icon ? <Icon size={12} /> : null
                    })()}
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Type</p>
                  <p className="text-sm text-slate-900 dark:text-white">{TYPE_LABELS[selectedReport.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Category</p>
                  <p className="text-sm text-slate-900 dark:text-white">{CATEGORY_LABELS[selectedReport.category]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Reported On</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Reporter</p>
                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="text-slate-400 dark:text-gray-500" />
                  <p className="text-sm text-slate-900 dark:text-white">{selectedReport.reporterName}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Reported {TYPE_LABELS[selectedReport.type]}</p>
                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="text-slate-400 dark:text-gray-500" />
                  <p className="text-sm text-slate-900 dark:text-white">{selectedReport.reportedUserName}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.resolutionNotes && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mb-1">Resolution Notes</p>
                  <p className="text-sm text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    {selectedReport.resolutionNotes}
                  </p>
                </div>
              )}

              {selectedReport.status === 'pending' && (
                <>
                  <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => openResolveModal(selectedReport)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <CheckCircle size={16} /> Resolve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport._id || selectedReport.id, 'dismissed')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      <XCircle size={16} /> Dismiss
                    </button>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-gray-500 mb-3">Moderation Actions</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReport.reportedPostId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'hide_post')}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                        >
                          <EyeOff size={14} /> Hide Post
                        </button>
                      )}
                      {selectedReport.reportedCommentId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'hide_comment')}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
                        >
                          <MessageSquare size={14} /> Hide Comment
                        </button>
                      )}
                      {selectedReport.reportedUserId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'suspend_user')}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-medium rounded-lg hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors"
                        >
                          <Ban size={14} /> Suspend User
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowResolveModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Resolve Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about how this was resolved..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReport._id || selectedReport.id, 'resolved')}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Action Modal */}
      {showActionModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowActionModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {actionType === 'hide_post' && 'Hide Post'}
              {actionType === 'hide_comment' && 'Hide Comment'}
              {actionType === 'suspend_user' && 'Suspend User'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                  placeholder="Please provide a reason for this action..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowActionModal(false)}
                  disabled={actioning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModerationAction}
                  disabled={actioning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {actioning ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
