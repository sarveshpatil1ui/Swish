import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Mail,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Bug,
  HelpCircle,
  XCircle,
  FileText,
  Check,
  X,
} from 'lucide-react'
import { apiGetAdminReports, apiUpdateAdminReportStatus } from '../../utils/auth'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-xs'

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | pending | reviewed | resolved | dismissed
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [selectedReport, setSelectedReport] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Load reports ───────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGetAdminReports()
      if (res && res.ok) {
        setReports(res.reports || [])
        setError('')
      } else {
        setError(res?.error || 'Failed to fetch platform reports.')
      }
    } catch (err) {
      console.error('[AdminReports] Error fetching:', err)
      setError('Unable to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // ── Update report status ───────────────────────────────────────────────────
  const handleUpdateStatus = async (status) => {
    if (!selectedReport) return
    setActionLoading(true)
    try {
      const res = await apiUpdateAdminReportStatus(selectedReport.id, {
        status,
        resolutionNote,
      })
      if (res && res.ok && res.report) {
        setReports((prev) =>
          prev.map((r) => (r.id === selectedReport.id ? res.report : r))
        )
        setSelectedReport(res.report)
      }
    } catch (err) {
      console.error('[AdminReports] Status update error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Filtered reports ───────────────────────────────────────────────────────
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        r.description?.toLowerCase().includes(q) ||
        r.reporterName?.toLowerCase().includes(q) ||
        r.college?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' || r.status === statusFilter

      const matchesCategory =
        categoryFilter === 'all' || r.category === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [reports, searchQuery, statusFilter, categoryFilter])

  const pendingCount = useMemo(
    () => reports.filter((r) => r.status === 'pending').length,
    [reports]
  )

  const activeGrievanceCount = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.category === 'college_admin_misconduct' &&
          r.status !== 'resolved' &&
          r.status !== 'dismissed'
      ).length,
    [reports]
  )

  const getCategoryMeta = (category) => {
    switch (category) {
      case 'college_admin_misconduct':
        return {
          label: 'College Admin Misconduct',
          icon: ShieldAlert,
          color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800',
        }
      case 'platform_bug':
        return {
          label: 'Platform Bug',
          icon: Bug,
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        }
      case 'feature_request':
        return {
          label: 'Feature Request',
          icon: HelpCircle,
          color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        }
      default:
        return {
          label: 'General Issue',
          icon: AlertTriangle,
          color: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 border-slate-200 dark:border-gray-700',
        }
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
      case 'dismissed':
        return 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
          >
            Platform Reports & Grievances
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            Review user grievances against College Admins and reported platform bugs
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReports}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`${adminCardClass} p-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Reports</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {reports.length}
            </p>
          </div>
        </div>

        <div className={`${adminCardClass} p-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Pending Review</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {pendingCount}
            </p>
          </div>
        </div>

        <div className={`${adminCardClass} p-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Admin Grievances</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {activeGrievanceCount}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-gray-500">Unresolved</p>
          </div>
        </div>

        <div className={`${adminCardClass} p-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Resolved</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {reports.filter((r) => r.status === 'resolved').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`${adminCardClass} p-4 flex flex-col sm:flex-row items-center justify-between gap-3`}>
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by user, college or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-700 dark:text-gray-300 font-medium focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-700 dark:text-gray-300 font-medium focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="college_admin_misconduct">Admin Misconduct</option>
            <option value="platform_bug">Platform Bug</option>
            <option value="feature_request">Feature Request</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Reports Table / List */}
      <div className={`${adminCardClass} overflow-hidden`}>
        {loading && reports.length === 0 ? (
          <div className="py-16 text-center">
            <RefreshCw size={22} className="animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              No reports found
            </p>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
              There are no platform reports or user grievances matching the criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-800 overflow-x-auto">
            {filteredReports.map((report) => {
              const catMeta = getCategoryMeta(report.category)
              const CatIcon = catMeta.icon

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    setSelectedReport(report)
                    setResolutionNote(report.resolutionNote || '')
                  }}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer flex items-start justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catMeta.color}`}
                    >
                      <CatIcon size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {report.description?.split(']')[0]?.replace('[', '') || 'Report'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                            report.status
                          )}`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {report.description?.includes(']')
                          ? report.description.split(']').slice(1).join(']').trim()
                          : report.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 dark:text-gray-500 mt-2">
                        <span className="flex items-center gap-1.5">
                          <User size={11} />
                          <span className="font-medium text-slate-700 dark:text-gray-200">{report.reporterName}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              report.reporterRole === 'faculty'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800'
                                : report.reporterRole === 'college_admin'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800'
                            }`}
                          >
                            {report.reporterRole || 'student'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={11} />
                          <span>{report.college}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>Review</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    getCategoryMeta(selectedReport.category).color
                  }`}
                >
                  {getCategoryMeta(selectedReport.category).label}
                </span>
                <h3
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1.5"
                >
                  {selectedReport.description?.split(']')[0]?.replace('[', '') || 'Platform Report'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Reporter Meta */}
            <div className="bg-slate-50 dark:bg-gray-800/50 p-3.5 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-gray-300">
                <span className="text-slate-400">Reporter:</span>
                <span className="font-semibold flex items-center gap-1.5">
                  {selectedReport.reporterName}
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                      selectedReport.reporterRole === 'faculty'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800'
                        : selectedReport.reporterRole === 'college_admin'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800'
                    }`}
                  >
                    {selectedReport.reporterRole || 'student'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-gray-300">
                <span className="text-slate-400">Campus:</span>
                <span className="font-semibold">{selectedReport.college}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-gray-300">
                <span className="text-slate-400">Submitted:</span>
                <span>{new Date(selectedReport.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-gray-300">
                <span className="text-slate-400">Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${getStatusBadge(selectedReport.status)}`}>
                  {selectedReport.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                Report Details:
              </p>
              <div className="bg-slate-50 dark:bg-gray-800/40 border border-slate-200/80 dark:border-gray-700/80 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedReport.description?.includes(']')
                  ? selectedReport.description.split(']').slice(1).join(']').trim()
                  : selectedReport.description}
              </div>
            </div>

            {/* Resolution Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                Admin Resolution / Internal Note:
              </label>
              <textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Enter internal action note or resolution summary..."
                className="w-full p-3 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0 text-indigo-500" />
              <span>Updating status will instantly send a notification update with your note to the {selectedReport.reporterRole || 'student'} reporter.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
              >
                Close
              </button>

              {selectedReport.status !== 'reviewed' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('reviewed')}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
              )}

              {selectedReport.status !== 'dismissed' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('dismissed')}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Dismiss
                </button>
              )}

              {selectedReport.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('resolved')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Resolve Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

