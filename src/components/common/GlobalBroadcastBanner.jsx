import React, { useState, useEffect } from 'react'
import { useSwish } from '../../context/SwishContext'
import { Info, AlertTriangle, CheckCircle, AlertOctagon, X, ExternalLink } from 'lucide-react'

export default function GlobalBroadcastBanner({ broadcast }) {
  const { isAuthenticated, currentUser } = useSwish()
  const [dismissed, setDismissed] = useState(false)

  const updatedAtKey = broadcast?.updatedAt || 'latest'
  const storageKey = `swish_broadcast_dismissed_${updatedAtKey}`

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(storageKey) === 'true'
      setDismissed(isDismissed)
    } catch {
      setDismissed(false)
    }
  }, [storageKey, broadcast?.updatedAt])

  // Banner is strictly visible ONLY to logged-in users (student, faculty, clg-admin, admin)
  // Hidden from public pages (landing, login, join, signup, onboarding, forgot-password)
  if (!isAuthenticated || !currentUser || !broadcast?.active || !broadcast?.message || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(storageKey, 'true')
    } catch {
      // ignore
    }
  }

  const typeStyles = {
    info: {
      bg: 'bg-accent-500 text-white',
      icon: Info,
    },
    warning: {
      bg: 'bg-amber-600 text-white',
      icon: AlertTriangle,
    },
    success: {
      bg: 'bg-emerald-600 text-white',
      icon: CheckCircle,
    },
    critical: {
      bg: 'bg-rose-600 text-white',
      icon: AlertOctagon,
    },
  }

  const currentType = typeStyles[broadcast.type] || typeStyles.info
  const Icon = currentType.icon

  return (
    <div
      role="alert"
      className={`${currentType.bg} px-4 py-2 text-xs font-medium shadow-sm transition-all flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1 min-w-0">
        <Icon size={15} className="shrink-0" />
        <p className="truncate">
          {broadcast.title && <strong className="font-bold mr-1.5">{broadcast.title}:</strong>}
          <span>{broadcast.message}</span>
        </p>
        {broadcast.link && (
          <a
            href={broadcast.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 ml-2 hover:opacity-85 font-semibold shrink-0 inline-flex items-center gap-1"
          >
            <span>Learn more</span>
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {broadcast.dismissible !== false && (
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-black/15 rounded-md transition-colors shrink-0"
          title="Dismiss announcement"
          aria-label="Dismiss announcement"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

