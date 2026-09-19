import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-sm shadow-slate-200/40 dark:shadow-black/20'

const adminButtonClass =
  'transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:hover:translate-y-0 disabled:active:scale-100'

export default function PendingRequestsPage() {
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadPendingRequests() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        'http://localhost:3001/api/admin/pending-requests',
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || 'Unable to load pending requests.'
        )
      }

      setRequests(data.requests || [])
    } catch (err) {
      console.error('[Pending Requests]', err)
      setError(
        err.message || 'Unable to load pending college requests.'
      )
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
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur sticky top-0 z-20">
        <div className="px-6 py-5">
          <button
            onClick={() => navigate('/admin')}
            className={`inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white mb-4 ${adminButtonClass}`}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                Pending College Requests
              </h1>

              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Review college registration requests awaiting approval.
              </p>
            </div>

            <button
              onClick={loadPendingRequests}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-gray-800 disabled:opacity-50 ${adminButtonClass}`}
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search college, requester or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/80 transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Table */}
        <div className={`${adminCardClass} overflow-hidden`}>
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse"
                />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <CheckCircle2
                  size={24}
                  className="text-emerald-500"
                />
              </div>

              <h3 className="font-semibold text-lg">
                No pending requests
              </h3>

              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                {search
                  ? 'No requests match your search.'
                  : 'There are currently no college registrations awaiting review.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-left">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      College
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Requester
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Official Email
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Submitted
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Documents
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                            <Building2
                              size={18}
                              className="text-indigo-500"
                            />
                          </div>

                          <div>
                            <div className="font-medium">
                              {request.collegeName || '—'}
                            </div>

                            <div className="text-xs text-slate-500 dark:text-gray-400">
                              {request.collegeCode || 'No code'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Requester */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <User
                            size={15}
                            className="text-slate-400"
                          />

                          <span className="text-sm">
                            {request.requesterName || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Mail
                            size={15}
                            className="text-slate-400"
                          />

                          <span className="text-sm">
                            {request.officialEmail || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />

                          {formatDate(request.createdAt)}
                        </div>
                      </td>

                      {/* Email verification */}
                      <td className="px-5 py-4">
                        {request.emailVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={15} />
                            Verified
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">
                            Not verified
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                          Pending Review
                        </span>
                      </td>

                      {/* Documents */}
                      <td className="px-5 py-4">
                        {request.proofPublicId ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-gray-300">
                            <FileText size={15} />
                            Available
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not available
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            navigate(
                              `/admin/pending-requests/${request.id}`
                            )
                          }
                          className={`px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none ${adminButtonClass}`}
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

        {/* Location info is intentionally not shown as a separate column
            to keep the table compact. */}
        {filteredRequests.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <MapPin size={13} />
            {filteredRequests.length} pending request
            {filteredRequests.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>
    </div>
  )
}
