import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Briefcase,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export default function PendingRequestReviewPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)
const [decisionError, setDecisionError] = useState('')
const [showRejectForm, setShowRejectForm] = useState(false)
const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRequest() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `http://localhost:3001/api/admin/pending-requests/${id}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        )

        const data = await response.json()

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error || 'Unable to load this request.'
          )
        }

        if (!cancelled) {
          setRequest(data.request)
        }
      } catch (err) {
        console.error('[Request Review]', err)

        if (!cancelled) {
          setError(
            err.message || 'Unable to load this request.'
          )
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

    const response = await fetch(
      `http://localhost:3001/api/admin/pending-requests/${id}/approve`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )

    const data = await response.json()

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || 'Unable to approve this request.'
      )
    }

    alert(
      'College approved successfully. The College Admin invitation has been sent.'
    )

    navigate('/admin/pending-requests')
  } catch (err) {
    console.error('[Approve Request]', err)

    setDecisionError(
      err.message || 'Unable to approve this request.'
    )
  } finally {
    setDecisionLoading(false)
  }
}
async function handleReject() {
  const trimmedReason = rejectionReason.trim()

  if (!trimmedReason) {
    setDecisionError(
      'Please enter a reason before rejecting this request.'
    )
    return
  }

  try {
    setDecisionLoading(true)
    setDecisionError('')

    const response = await fetch(
      `http://localhost:3001/api/admin/pending-requests/${id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: trimmedReason,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || 'Unable to reject this request.'
      )
    }

    alert('College request rejected successfully.')

    navigate('/admin/pending-requests')
  } catch (err) {
    console.error('[Reject Request]', err)

    setDecisionError(
      err.message || 'Unable to reject this request.'
    )
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

  function formatDateTime(date) {
    if (!date) return '—'

    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white">
        <div className="border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-6 py-5">
            <div className="h-4 w-40 bg-slate-200 dark:bg-gray-800 rounded animate-pulse mb-5" />
            <div className="h-7 w-72 bg-slate-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-gray-800 rounded animate-pulse mt-2" />
          </div>
        </div>

        <main className="p-6 max-w-6xl mx-auto space-y-5">
          <div className="h-32 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 animate-pulse" />

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="h-80 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 animate-pulse" />
            <div className="h-80 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white">
        <div className="p-6 max-w-4xl mx-auto">
          <button
            onClick={() =>
              navigate('/admin/pending-requests')
            }
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white mb-6"
          >
            <ArrowLeft size={16} />
            Back to Pending Requests
          </button>

          <div className="bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
              <AlertCircle
                size={24}
                className="text-rose-500"
              />
            </div>

            <h2 className="text-lg font-semibold">
              Unable to load request
            </h2>

            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              {error || 'This request could not be found.'}
            </p>

            <button
              onClick={() =>
                navigate('/admin/pending-requests')
              }
              className="mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Return to Pending Requests
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-6 py-5">
          <button
            onClick={() =>
              navigate('/admin/pending-requests')
            }
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white mb-5"
          >
            <ArrowLeft size={16} />
            Back to Pending Requests
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">
                  Review College Request
                </h1>

                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                  Pending Review
                </span>
              </div>

              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Review the submitted information and authorization proof before making a decision.
              </p>
            </div>

            <div className="text-sm text-slate-500 dark:text-gray-400">
              Submitted {formatDate(request.createdAt)}
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto space-y-5">
        {/* College Summary */}
        <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
              <Building2
                size={30}
                className="text-indigo-600 dark:text-indigo-400"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">
                {request.collegeName || 'Unnamed College'}
              </h2>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-sm text-slate-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={15} />
                  {request.collegeCode || 'No code'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} />
                  {request.location || 'Location not provided'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Globe size={15} />
                  @{request.emailDomain || '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Information */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* College Information */}
          <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800">
              <h2 className="font-semibold flex items-center gap-2">
                <Building2
                  size={18}
                  className="text-indigo-500"
                />
                College Information
              </h2>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-4">
              <InfoItem
                label="College Name"
                value={request.collegeName}
              />

              <InfoItem
                label="Short Code"
                value={request.collegeCode}
              />

              <InfoItem
                label="Location"
                value={request.location}
              />

              <InfoItem
                label="Email Domain"
                value={
                  request.emailDomain
                    ? `@${request.emailDomain}`
                    : ''
                }
              />

              <InfoItem
                label="Institution Type"
                value={request.campusType}
              />

              <InfoItem
                label="Campus Size"
                value={request.campusSize}
              />
            </div>
          </section>

          {/* Proposed Admin */}
          <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800">
              <h2 className="font-semibold flex items-center gap-2">
                <User
                  size={18}
                  className="text-violet-500"
                />
                Proposed College Admin
              </h2>
            </div>

            <div className="p-6 grid sm:grid-cols-2 gap-4">
              <InfoItem
                label="Full Name"
                value={request.adminName}
              />

              <InfoItem
                label="Designation"
                value={request.designation}
              />

              <InfoItem
                label="Official Email"
                value={request.officialEmail}
              />

              <InfoItem
                label="Phone"
                value={request.phone}
              />
            </div>
          </section>
        </div>

        {/* Verification */}
        <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldCheck
                size={18}
                className="text-emerald-500"
              />
              Verification
            </h2>
          </div>

          <div className="p-6 grid md:grid-cols-3 gap-4">
            <VerificationItem
              label="Official Email"
              verified={request.emailVerified}
              value={
                request.emailVerified
                  ? 'Email verified'
                  : 'Email not verified'
              }
            />

            <VerificationItem
              label="Verification Date"
              verified={Boolean(request.verifiedAt)}
              value={formatDateTime(request.verifiedAt)}
            />

            <VerificationItem
              label="Request Status"
              verified={request.status === 'PENDING'}
              value="Pending Main Admin review"
            />
          </div>
        </section>

        {/* Proof */}
        <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800">
            <h2 className="font-semibold flex items-center gap-2">
              <FileCheck
                size={18}
                className="text-amber-500"
              />
              Authorization Proof
            </h2>
          </div>

          <div className="p-6">
            {request.proofPublicId ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                    <FileCheck
                      size={20}
                      className="text-indigo-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      Official authorization document
                    </p>

                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                      {request.proofPublicId}
                    </p>
                  </div>
                </div>

                {request.proofUrl ? (
                  <a
                    href={request.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 shrink-0"
                  >
                    View Document
                    <ExternalLink size={15} />
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">
                    Document reference available
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                No authorization proof was attached to this request.
              </div>
            )}
          </div>
        </section>

        {/* Submission Timeline */}
        <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-gray-800">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarDays
                size={18}
                className="text-sky-500"
              />
              Submission Information
            </h2>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                <CalendarDays
                  size={17}
                  className="text-sky-500"
                />
              </div>

              <div>
                <p className="text-sm font-medium">
                  College registration request submitted
                </p>

                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  {formatDateTime(request.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </section>
{/* Decision Area */}
<section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
    <div>
      <h2 className="font-semibold">
        Review Decision
      </h2>

      <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
        Approve the registration if all submitted information is valid.
      </p>
    </div>

    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => {
          setShowRejectForm((value) => !value)
          setDecisionError('')
        }}
        disabled={decisionLoading}
        className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
      >
        Reject Request
      </button>

      <button
        type="button"
        onClick={handleApprove}
        disabled={decisionLoading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {decisionLoading ? (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            Approve Request
          </>
        )}
      </button>
    </div>
  </div>

  {showRejectForm && (
    <div className="mt-5 pt-5 border-t border-slate-200 dark:border-gray-800">
      <label className="block text-sm font-medium mb-2">
        Rejection Reason
      </label>

      <textarea
        value={rejectionReason}
        onChange={(e) => {
          setRejectionReason(e.target.value)
          setDecisionError('')
        }}
        rows={4}
        placeholder="Explain why this college registration request is being rejected..."
        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none"
      />

      <div className="flex justify-end gap-3 mt-3">
        <button
          type="button"
          onClick={() => {
            setShowRejectForm(false)
            setRejectionReason('')
            setDecisionError('')
          }}
          disabled={decisionLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={
            decisionLoading ||
            !rejectionReason.trim()
          }
          className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
        >
          {decisionLoading
            ? 'Rejecting...'
            : 'Confirm Rejection'}
        </button>
      </div>
    </div>
  )}

  {decisionError && (
    <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
      {decisionError}
    </div>
  )}
</section>
      </main>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-800 p-4">
      <p className="text-xs text-slate-400 dark:text-gray-500 mb-1">
        {label}
      </p>

      <p className="text-sm font-medium break-words">
        {value || 'Not provided'}
      </p>
    </div>
  )
}

function VerificationItem({ label, verified, value }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 dark:text-gray-500">
          {label}
        </p>

        {verified ? (
          <CheckCircle2
            size={16}
            className="text-emerald-500"
          />
        ) : (
          <AlertCircle
            size={16}
            className="text-amber-500"
          />
        )}
      </div>

      <p className="text-sm font-medium mt-2">
        {value || '—'}
      </p>
    </div>
  )
}