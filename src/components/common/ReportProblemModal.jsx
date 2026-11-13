import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, AlertCircle, Loader2, Send, CheckCircle2 } from 'lucide-react'
import { apiSubmitPlatformReport } from '../../utils/auth'

export default function ReportProblemModal({ onClose, showToast }) {
  const [category, setCategory] = useState('college_admin_misconduct')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and details.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await apiSubmitPlatformReport({
        category,
        subject: subject.trim(),
        description: description.trim(),
      })

      if (res && res.ok) {
        setSubmitted(true)
        if (showToast) {
          showToast('Report submitted directly to Platform Super Admin.')
        }
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(res?.error || 'Failed to submit report. Please try again.')
      }
    } catch {
      setError('Unable to submit report. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-900 dark:text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                Report a Problem / Grievance
              </h3>
              <p className="text-[11px] text-base-400">Escalated directly to Main Platform Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-base-400 hover:text-base-600 dark:hover:text-base-200 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-sm font-bold text-base-900 dark:text-white">Report Submitted</h4>
            <p className="text-xs text-base-500 dark:text-base-400 max-w-xs mx-auto">
              Your grievance has been safely delivered to Platform Super Admins. You will receive a notification when it is reviewed.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-base-600 dark:text-base-300 mb-1">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-xl px-3 py-2 text-xs text-base-900 dark:text-white focus:outline-hidden focus:border-accent-500"
                >
                  <option value="college_admin_misconduct">College Admin Grievance / Misconduct</option>
                  <option value="platform_bug">Platform Bug or Technical Error</option>
                  <option value="feature_request">Feature Request / Suggestion</option>
                  <option value="other">Other Issue</option>
                </select>
                <p className="text-[10px] text-base-400 mt-1">
                  {category === 'college_admin_misconduct'
                    ? 'Use this if a college administrator is abusing permissions or acting unfairly.'
                    : category === 'platform_bug'
                    ? 'Report app crashes, UI glitches, or unexpected technical errors.'
                    : 'Share your feedback or other concerns with platform maintainers.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-600 dark:text-base-300 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Unfair moderation by admin / Messages not loading"
                  maxLength={100}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-xl px-3 py-2 text-xs text-base-900 dark:text-white focus:outline-hidden focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-base-600 dark:text-base-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what occurred, when, and any other relevant context..."
                  maxLength={1000}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-xl p-3 text-xs text-base-900 dark:text-white focus:outline-hidden focus:border-accent-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-base-600 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit to Main Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

