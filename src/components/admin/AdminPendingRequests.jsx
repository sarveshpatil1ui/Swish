import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  User,
  ExternalLink,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  FileCheck,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { apiFetch } from '../../utils/auth'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-sm shadow-slate-200/40 dark:shadow-black/20'

const adminButtonClass =
  'transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:hover:translate-y-0 disabled:active:scale-100'

export default function AdminPendingRequests({
  selectedId = null,
  onSelectId = null,
  onStatsUpdated = null,
}) {
  const [reviewId, setReviewId] = useState(selectedId)

  // Sync if prop changes
  useEffect(() => {
    setReviewId(selectedId)
  }, [selectedId])

  const handleSelectRequest = (id) => {
    setReviewId(id)
    if (onSelectId) onSelectId(id)
  }

  const handleBackToList = () => {
    setReviewId(null)
    if (onSelectId) onSelectId(null)
  }

  if (reviewId) {
    return (
      <RequestReviewDetail
        id={reviewId}
        onBack={handleBackToList}
        onDecided={() => {
          handleBackToList()
          if (onStatsUpdated) onStatsUpdated()
        }}
      />
    )
  }

  return (
    <PendingRequestsList
      onReview={handleSelectRequest}
      onStatsUpdated={onStatsUpdated}
    />
  )
}

// ── 1. Pending Requests Table View ───────────────────────────────────────────
function PendingRequestsList({ onReview, onStatsUpdated }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadPendingRequests(isRetry = false) {
    try {
      setLoading(true)
      const data = await apiFetch('/api/admin/pending-requests')

      if (!data.ok) {
        if (!isRetry && data._status === 401) {
          setTimeout(() => loadPendingRequests(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load pending requests.')
      }

      setRequests(data.requests || [])
      setError('')
      if (onStatsUpdated) onStatsUpdated()
    } catch (err) {
      console.error('[Pending Requests]', err)
      setError(err.message || 'Unable to load pending college requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPendingRequests()
  }, [])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return requests

    return requests.filter((request) =>
      [
        request.collegeName,
        request.collegeCode,
        request.location,
        request.requesterName,
        request.officialEmail,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [requests, search])

  function formatDate(date) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-2xl font-extrabold text-slate-900 dark:text-white"
          >
            Pending College Requests
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            Review incoming college registration applications before granting full platform access.
          </p>
        </div>

        <button
          onClick={() => loadPendingRequests()}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50 text-slate-700 dark:text-gray-200 ${adminButtonClass}`}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div>
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search college, requester, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900 text-sm text-slate-900 dark:text-white outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/80 transition-all"
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className={`${adminCardClass} overflow-hidden`}>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-16 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <h3
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-semibold text-lg text-slate-900 dark:text-white"
            >
              No pending requests
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              {search
                ? 'No requests match your search criteria.'
                : 'There are currently no college registrations awaiting review. All caught up!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    College
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Requester
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Official Email
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Submitted
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Email Verification
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Documents
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-slate-100 dark:border-gray-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* College */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                          <Building2 size={18} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {request.collegeName || '—'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-gray-400 truncate">
                            {request.collegeCode || 'No code'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Requester */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-800 dark:text-gray-200">
                          {request.requesterName || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-gray-300">
                          {request.officialEmail || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                        <CalendarDays size={15} className="text-slate-400 shrink-0" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                    </td>

                    {/* Email verification */}
                    <td className="px-5 py-4">
                      {request.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-gray-500">
                          Not verified
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                        Pending Review
                      </span>
                    </td>

                    {/* Documents */}
                    <td className="px-5 py-4">
                      {request.proofPublicId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-gray-300">
                          <FileText size={14} />
                          Available
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not available
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onReview(request.id)}
                        className={`px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none ${adminButtonClass}`}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredRequests.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500">
          <MapPin size={13} />
          <span>
            {filteredRequests.length} pending college request{filteredRequests.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

// ── 2. Request Review Detailed View ──────────────────────────────────────────
function RequestReviewDetail({ id, onBack, onDecided }) {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [decisionError, setDecisionError] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [docLoading, setDocLoading] = useState(false)

  async function handleViewDocument() {
    if (request?.proofUrl) {
      window.open(request.proofUrl, '_blank', 'noopener,noreferrer')
      return
    }

    try {
      setDocLoading(true)
      const data = await apiFetch(`/api/admin/pending-requests/${id}/proof-url`)
      if (!data.ok || !data.proofUrl) {
        throw new Error(data.error || 'Failed to load document URL.')
      }
      window.open(data.proofUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert(err.message || 'Unable to open proof document.')
    } finally {
      setDocLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadRequest(isRetry = false) {
      try {
        setLoading(true)
        const data = await apiFetch(`/api/admin/pending-requests/${id}`)

        if (!data.ok) {
          if (!isRetry && data._status === 401) {
            setTimeout(() => {
              if (!cancelled) loadRequest(true)
            }, 500)
            return
          }
          throw new Error(data.error || 'Unable to load this request.')
        }

        if (!cancelled) {
          setRequest(data.request)
          setError('')
        }
      } catch (err) {
        console.error('[Request Review]', err)
        if (!cancelled) {
          setError(err.message || 'Unable to load this request.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (id) {
      loadRequest()
    }

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleApprove() {
    const confirmed = window.confirm(
      `Approve "${request.collegeName}"?\n\nThis will create the College and College Admin account and send an invitation email.`
    )
    if (!confirmed) return

    try {
      setDecisionLoading(true)
      setDecisionError('')

      const data = await apiFetch(`/api/admin/pending-requests/${id}/approve`, {
        method: 'POST',
      })

      if (!data.ok) {
        throw new Error(data.error || 'Unable to approve this request.')
      }

      alert('College approved successfully. The College Admin invitation has been sent.')
      if (onDecided) onDecided()
    } catch (err) {
      console.error('[Approve Request]', err)
      setDecisionError(err.message || 'Unable to approve this request.')
    } finally {
      setDecisionLoading(false)
    }
  }

  async function handleReject() {
    const trimmedReason = rejectionReason.trim()
    if (!trimmedReason) {
      setDecisionError('Please enter a reason before rejecting this request.')
      return
    }

    try {
      setDecisionLoading(true)
      setDecisionError('')

      const data = await apiFetch(`/api/admin/pending-requests/${id}/reject`, {
        method: 'POST',
        body: {
          reason: trimmedReason,
        },
      })

      if (!data.ok) {
        throw new Error(data.error || 'Unable to reject this request.')
      }

      alert('College request rejected successfully.')
      if (onDecided) onDecided()
    } catch (err) {
      console.error('[Reject Request]', err)
      setDecisionError(err.message || 'Unable to reject this request.')
    } finally {
      setDecisionLoading(false)
    }
  }

  function formatDate(date) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white ${adminButtonClass}`}
        >
          <ArrowLeft size={16} />
          <span>Back to Pending Requests</span>
        </button>
        <div className={`${adminCardClass} h-32 animate-pulse`} />
        <div className="grid lg:grid-cols-2 gap-5">
          <div className={`${adminCardClass} h-80 animate-pulse`} />
          <div className={`${adminCardClass} h-80 animate-pulse`} />
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white ${adminButtonClass}`}
        >
          <ArrowLeft size={16} />
          <span>Back to Pending Requests</span>
        </button>
        <div className={`${adminCardClass} p-8 text-center`}>
          <AlertCircle size={28} className="text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load request</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">{error || 'Request not found.'}</p>
          <button
            onClick={onBack}
            className={`mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl ${adminButtonClass}`}
          >
            Return to List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white mb-4 ${adminButtonClass}`}
        >
          <ArrowLeft size={16} />
          <span>Back to Pending Requests</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-2xl font-extrabold text-slate-900 dark:text-white"
              >
                Review College Request
              </h2>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                Pending Review
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              Review submitted details and authorization proof before making an approval decision.
            </p>
          </div>

          <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
            Submitted {formatDate(request.createdAt)}
          </div>
        </div>
      </div>

      {/* College Summary Card */}
      <div className={`${adminCardClass} p-6`}>
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <Building2 size={30} className="text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-xl font-bold text-slate-900 dark:text-white truncate"
              >
                {request.collegeName}
              </h3>
              {request.collegeCode && (
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 text-xs font-semibold text-slate-600 dark:text-gray-300">
                  {request.collegeCode}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-xs sm:text-sm text-slate-500 dark:text-gray-400">
              {request.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-slate-400" />
                  <span>{request.location}</span>
                </div>
              )}
              {request.website && (
                <a
                  href={request.website.startsWith('http') ? request.website : `https://${request.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <ExternalLink size={14} />
                  <span>{request.website}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Details Grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left Column: College Details */}
        <div className={`${adminCardClass} p-6 space-y-4`}>
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-3">
            <Building2 size={18} className="text-indigo-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">College Information</h4>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 dark:text-gray-500">Official Campus Address</p>
              <p className="font-medium text-slate-800 dark:text-gray-200 mt-0.5">
                {request.location || '—'}
              </p>
            </div>
            {request.collegeCode && (
              <div>
                <p className="text-xs text-slate-400 dark:text-gray-500">Institution Code</p>
                <p className="font-medium text-slate-800 dark:text-gray-200 mt-0.5">
                  {request.collegeCode}
                </p>
              </div>
            )}
            {request.phone && (
              <div>
                <p className="text-xs text-slate-400 dark:text-gray-500">College Phone</p>
                <p className="font-medium text-slate-800 dark:text-gray-200 mt-0.5">
                  {request.phone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Requester & Admin Candidate */}
        <div className={`${adminCardClass} p-6 space-y-4`}>
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-3">
            <User size={18} className="text-indigo-500" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Applicant & Admin Information</h4>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-400 dark:text-gray-500">Requester Full Name</p>
              <p className="font-semibold text-slate-800 dark:text-gray-200 mt-0.5">
                {request.requesterName}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-gray-500">Official Designation</p>
              <p className="font-medium text-slate-800 dark:text-gray-200 mt-0.5">
                {request.designation || 'College Administrator Candidate'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-gray-500">Official Campus Email</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-medium text-slate-800 dark:text-gray-200">
                  {request.officialEmail}
                </span>
                {request.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={12} />
                    Verified
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Unverified
                  </span>
                )}
              </div>
            </div>

            {request.requesterPhone && (
              <div>
                <p className="text-xs text-slate-400 dark:text-gray-500">Contact Number</p>
                <p className="font-medium text-slate-800 dark:text-gray-200 mt-0.5">
                  {request.requesterPhone}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification Document Card */}
      <div className={`${adminCardClass} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <FileCheck size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Authorization Proof Document
              </h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                {request.proofPublicId
                  ? 'Official institution authorization letter or affiliation document provided.'
                  : 'No document attached to this request.'}
              </p>
            </div>
          </div>

          {request.proofPublicId && (
            <button
              onClick={handleViewDocument}
              disabled={docLoading}
              className={`inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-semibold rounded-xl ${adminButtonClass}`}
            >
              {docLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ExternalLink size={14} />
              )}
              <span>View Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Decision Error Alert */}
      {decisionError && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {decisionError}
        </div>
      )}

      {/* Decision Card */}
      <div className={`${adminCardClass} p-6 border-indigo-100 dark:border-indigo-950/50`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-bold text-base text-slate-900 dark:text-white"
            >
              Approval Decision
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
              Approving creates the College & College Admin profile, generating secure temporary credentials.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={decisionLoading}
              onClick={() => setShowRejectForm((prev) => !prev)}
              className={`px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold ${adminButtonClass}`}
            >
              Reject Request
            </button>

            <button
              type="button"
              disabled={decisionLoading}
              onClick={handleApprove}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-300/40 dark:shadow-none ${adminButtonClass}`}
            >
              {decisionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              <span>Approve & Create College</span>
            </button>
          </div>
        </div>

        {/* Rejection Form Expansion */}
        {showRejectForm && (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-gray-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300">
              Reason for Rejection (sent to applicant)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Incomplete official authorization letter, domain mismatch, or unverified accreditation."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50 text-sm text-slate-900 dark:text-white outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:focus:ring-rose-950/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionLoading || !rejectionReason.trim()}
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {decisionLoading ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

