import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Search, Eye, MessageSquare, User as UserIcon, Ban, EyeOff, ShieldAlert, Calendar, AlertCircle } from 'lucide-react'
import { apiGetReports, apiUpdateReportStatus, apiHidePost, apiHideComment, apiToggleUserStatus } from '../../utils/auth'

const STATUS_COLORS = {
  pending: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  reviewed: 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/40 border-accent-200 dark:border-accent-800',
  resolved: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  dismissed: 'text-base-600 dark:text-base-400 bg-base-50 dark:bg-base-800 border-base-150 dark:border-base-800',
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

    const targetPostId =
      selectedReport?.reportedPost?._id ||
      (typeof selectedReport?.reportedPostId === 'object'
        ? selectedReport?.reportedPostId?._id
        : selectedReport?.reportedPostId)

    const targetCommentId =
      selectedReport?.reportedComment?._id ||
      (typeof selectedReport?.reportedCommentId === 'object'
        ? selectedReport?.reportedCommentId?._id
        : selectedReport?.reportedCommentId)

    const targetUserId =
      typeof selectedReport?.reportedUserId === 'object'
        ? selectedReport?.reportedUserId?._id
        : selectedReport?.reportedUserId

    setActioning(true)
    try {
      if (actionType === 'hide_post' && targetPostId) {
        const res = await apiHidePost(targetPostId, actionReason)
        if (res.ok) {
          alert('Post hidden successfully')
        } else {
          alert(res.error || 'Failed to hide post')
        }
      } else if (actionType === 'hide_comment' && targetCommentId) {
        const res = await apiHideComment(targetCommentId, actionReason)
        if (res.ok) {
          alert('Comment hidden successfully')
        } else {
          alert(res.error || 'Failed to hide comment')
        }
      } else if (actionType === 'suspend_user' && targetUserId) {
        const res = await apiToggleUserStatus(targetUserId)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-base-900 dark:text-white">Reports & Moderation</h1>
          <p className="text-base-500 dark:text-base-400 mt-1 text-sm">Review and moderate user reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400 dark:text-base-500" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] text-base-900 dark:text-white placeholder-base-400 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all shadow-xs"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] text-base-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all shadow-xs cursor-pointer"
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
          className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] text-base-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all shadow-xs cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="post">Post</option>
          <option value="comment">Comment</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={32} className="text-base-300 dark:text-base-600 mx-auto mb-3" />
            <p className="text-base-500 dark:text-base-400 text-sm">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-base-100 dark:divide-base-800">
            {filteredReports.map((report) => {
              const StatusIcon = STATUS_ICONS[report.status]
              return (
                <div
                  key={report._id || report.id}
                  className="p-6 hover:bg-base-50 dark:hover:bg-base-800/40 transition-colors cursor-pointer"
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
                        <span className="text-xs text-base-500 dark:text-base-400">
                          {TYPE_LABELS[report.type]} · {CATEGORY_LABELS[report.category]}
                        </span>
                      </div>
                      <p className="text-base-900 dark:text-white font-medium text-sm mb-1">
                        {report.reporterName} reported {report.reportedUserName}
                      </p>
                      <p className="text-base-600 dark:text-base-400 text-sm line-clamp-2">
                        {report.description}
                      </p>
                      <p className="text-base-400 dark:text-base-500 text-xs mt-2">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedReport(null)}>
          <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-base-150 dark:border-base-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading text-base-900 dark:text-white">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-base-400 dark:text-base-500 hover:text-base-600 dark:hover:text-base-300 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-base-500 dark:text-base-400 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedReport.status]}`}>
                    {(() => {
                      const Icon = STATUS_ICONS[selectedReport.status]
                      return Icon ? <Icon size={12} /> : null
                    })()}
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-base-500 dark:text-base-400 mb-1">Type</p>
                  <p className="text-sm font-medium text-base-900 dark:text-white">{TYPE_LABELS[selectedReport.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-base-500 dark:text-base-400 mb-1">Category</p>
                  <p className="text-sm font-medium text-base-900 dark:text-white">{CATEGORY_LABELS[selectedReport.category]}</p>
                </div>
                <div>
                  <p className="text-xs text-base-500 dark:text-base-400 mb-1">Reported On</p>
                  <p className="text-sm font-medium text-base-900 dark:text-white">
                    {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Reporter Information */}
              <div>
                <p className="text-xs font-semibold text-base-500 dark:text-base-400 mb-1">Reporter</p>
                <div className="flex items-center gap-2 bg-base-50 dark:bg-base-800/50 p-2.5 rounded-xl border border-base-150 dark:border-base-800">
                  <UserIcon size={16} className="text-base-400 dark:text-base-500 shrink-0" />
                  <p className="text-sm font-medium text-base-900 dark:text-white">{selectedReport.reporterName}</p>
                </div>
              </div>

              {/* Reported Content / Target Details */}
              <div>
                <p className="text-xs font-semibold text-base-500 dark:text-base-400 mb-1.5">
                  Reported {TYPE_LABELS[selectedReport.type] || 'Content'}
                </p>
                {(() => {
                  if (selectedReport.type === 'post') {
                    const post =
                      selectedReport.reportedPost ||
                      (typeof selectedReport.reportedPostId === 'object' && selectedReport.reportedPostId?._id
                        ? selectedReport.reportedPostId
                        : null)
                    const isUnavailable = !post || post.isDeleted

                    if (isUnavailable) {
                      return (
                        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Original post unavailable or deleted</span>
                          </div>
                          {selectedReport.reportedUserName && (
                            <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1 pl-6">
                              Author: <span className="font-semibold">{selectedReport.reportedUserName}</span>
                            </p>
                          )}
                        </div>
                      )
                    }

                    const authorName = post.user?.name || selectedReport.reportedUserName || 'Unknown'
                    const authorUsername = post.user?.username
                    const authorInitials = post.user?.initials || authorName.slice(0, 2).toUpperCase()
                    const avatarColor = post.user?.avatarColor

                    return (
                      <div className="rounded-xl border border-base-150 dark:border-base-800 bg-base-50/80 dark:bg-base-800/50 p-4 space-y-3">
                        {/* Author Header & Date */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-base-150 dark:border-base-700/60">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {post.user?.profilePhoto ? (
                              <img
                                src={post.user.profilePhoto}
                                alt={authorName}
                                className="w-9 h-9 rounded-full object-cover shrink-0 border border-base-150 dark:border-base-700"
                              />
                            ) : (
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs bg-accent-600"
                                style={avatarColor ? { backgroundColor: avatarColor } : undefined}
                              >
                                {authorInitials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-base-900 dark:text-white truncate">
                                {authorName}
                              </p>
                              {authorUsername && (
                                <p className="text-xs text-base-500 dark:text-base-400 truncate">
                                  @{authorUsername}
                                </p>
                              )}
                            </div>
                          </div>
                          {post.createdAt && (
                            <div className="flex items-center gap-1.5 text-xs text-base-400 dark:text-base-500 shrink-0">
                              <Calendar size={13} />
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Post Caption */}
                        {post.caption ? (
                          <p className="text-sm text-base-800 dark:text-base-200 whitespace-pre-wrap leading-relaxed">
                            {post.caption}
                          </p>
                        ) : (
                          <p className="text-xs italic text-base-400 dark:text-base-500">
                            (No caption provided)
                          </p>
                        )}

                        {/* Post Image Attachment */}
                        {post.imageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-base-150 dark:border-base-700 max-h-72 bg-black/5 dark:bg-black/20 flex items-center justify-center">
                            <img
                              src={post.imageUrl}
                              alt="Reported content attachment"
                              className="max-h-72 w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {post.hidden && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                            <EyeOff size={12} /> Currently hidden from feed
                          </div>
                        )}
                      </div>
                    )
                  }

                  if (selectedReport.type === 'comment') {
                    const comment =
                      selectedReport.reportedComment ||
                      (typeof selectedReport.reportedCommentId === 'object' && selectedReport.reportedCommentId?._id
                        ? selectedReport.reportedCommentId
                        : null)
                    const isUnavailable = !comment || comment.isDeleted

                    if (isUnavailable) {
                      return (
                        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Original comment unavailable or deleted</span>
                          </div>
                          {selectedReport.reportedUserName && (
                            <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1 pl-6">
                              Author: <span className="font-semibold">{selectedReport.reportedUserName}</span>
                            </p>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div className="rounded-xl border border-base-150 dark:border-base-800 bg-base-50/80 dark:bg-base-800/50 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-base-500 dark:text-base-400 pb-2 border-b border-base-150 dark:border-base-700/60">
                          <span className="font-medium text-base-900 dark:text-white">
                            {comment.user?.name || selectedReport.reportedUserName}
                          </span>
                          {comment.createdAt && <span>{new Date(comment.createdAt).toLocaleDateString()}</span>}
                        </div>
                        <p className="text-sm text-base-800 dark:text-base-200 whitespace-pre-wrap">
                          {comment.text}
                        </p>
                      </div>
                    )
                  }

                  // Default / User report
                  return (
                    <div className="flex items-center gap-2 bg-base-50 dark:bg-base-800/50 p-2.5 rounded-xl border border-base-150 dark:border-base-800">
                      <UserIcon size={16} className="text-base-400 dark:text-base-500 shrink-0" />
                      <p className="text-sm font-medium text-base-900 dark:text-white">{selectedReport.reportedUserName}</p>
                    </div>
                  )
                })()}
              </div>

              {/* Reporter's Description / Reason */}
              <div>
                <p className="text-xs font-semibold text-base-500 dark:text-base-400 mb-1">
                  Reporter's Description
                </p>
                <p className="text-sm text-base-700 dark:text-base-300 bg-base-50 dark:bg-base-800/80 border border-base-150 dark:border-base-700/60 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.resolutionNotes && (
                <div>
                  <p className="text-xs font-semibold text-base-500 dark:text-base-400 mb-1">Resolution Notes</p>
                  <p className="text-sm text-base-700 dark:text-base-300 bg-base-50 dark:bg-base-800 rounded-lg p-3">
                    {selectedReport.resolutionNotes}
                  </p>
                </div>
              )}

              {selectedReport.status === 'pending' && (
                <>
                  <div className="flex gap-3 pt-4 border-t border-base-150 dark:border-base-800">
                    <button
                      onClick={() => openResolveModal(selectedReport)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm font-semibold rounded-xl hover:bg-accent-700 transition-colors shadow-xs"
                    >
                      <CheckCircle size={16} /> Resolve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedReport._id || selectedReport.id, 'dismissed')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-base-200 dark:bg-base-800 text-base-700 dark:text-base-300 text-sm font-semibold rounded-xl hover:bg-base-300 dark:hover:bg-base-700 transition-colors shadow-xs"
                    >
                      <XCircle size={16} /> Dismiss
                    </button>
                  </div>
                  <div className="pt-4 border-t border-base-150 dark:border-base-800">
                    <p className="text-xs text-base-500 dark:text-base-400 mb-3 font-semibold">Moderation Actions</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReport.reportedPostId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'hide_post')}
                          disabled={
                            selectedReport.type === 'post' &&
                            (!selectedReport.reportedPost || selectedReport.reportedPost.isDeleted)
                          }
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                        >
                          <EyeOff size={14} /> Hide Post
                        </button>
                      )}
                      {selectedReport.reportedCommentId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'hide_comment')}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors shadow-xs"
                        >
                          <MessageSquare size={14} /> Hide Comment
                        </button>
                      )}
                      {selectedReport.reportedUserId && (
                        <button
                          onClick={() => openActionModal(selectedReport, 'suspend_user')}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 text-xs font-medium rounded-xl hover:bg-accent-100 dark:hover:bg-accent-950/60 transition-colors shadow-xs"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowResolveModal(false)}>
          <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold font-heading text-base-900 dark:text-white mb-4">Resolve Report</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about how this was resolved..."
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 text-base-600 dark:text-base-400 text-sm font-medium hover:text-base-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedReport._id || selectedReport.id, 'resolved')}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-xs"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowActionModal(false)}>
          <div className="bg-white dark:bg-base-900 border border-base-150 dark:border-[rgba(255,255,255,0.07)] rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold font-heading text-base-900 dark:text-white mb-4">
              {actionType === 'hide_post' && 'Hide Post'}
              {actionType === 'hide_comment' && 'Hide Comment'}
              {actionType === 'suspend_user' && 'Suspend User'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
                  placeholder="Please provide a reason for this action..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowActionModal(false)}
                  disabled={actioning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-base-200 dark:bg-base-800 text-base-700 dark:text-base-300 text-sm font-semibold rounded-xl hover:bg-base-300 dark:hover:bg-base-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModerationAction}
                  disabled={actioning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-xs"
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
