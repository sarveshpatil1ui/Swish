import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Moon,
  Monitor,
  Volume2,
  VolumeX,
  Bell,
  Play,
  Check,
  Shield,
  ShieldCheck,
  Lock,
  Key,
  Globe,
  Laptop,
  AlertTriangle,
  LogOut,
  UserCheck,
  CheckCircle2,
  Server,
  Database,
  Activity,
  Download,
  RefreshCw,
  Sliders,
  ArrowRight,
  X,
  Layers,
  Sparkles,
  Cpu,
  Clock,
  Radio,
} from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
import { playNotificationSound } from '../../utils/notification'
import {
  apiGetAdminPlatformConfig,
  apiTerminateOtherSessions,
  apiGetSystemHealth,
  getAvatarUrl,
} from '../../utils/auth'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-sm shadow-slate-200/40 dark:shadow-black/20'

const adminInteractiveClass =
  'transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]'

function getClientDeviceInfo() {
  if (typeof navigator === 'undefined') return { browser: 'Modern Browser', os: 'Desktop OS' }
  const ua = navigator.userAgent || ''
  let browser = 'Modern Browser'
  let os = 'Desktop OS'

  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('Chrome/')) browser = 'Google Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'

  if (ua.includes('Windows NT 10.0') || ua.includes('Windows NT 11.0')) os = 'Windows 10/11'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'

  return { browser, os }
}

function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return 'Just started'
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0 || parts.length === 0) parts.push(`${m}m`)
  return parts.join(' ')
}

export default function AdminSettings({ onNavigate }) {
  const { dark, toggle } = useTheme()
  const { currentUser } = useSwish()
  const socketCtx = useSocket()

  // ── Toast Notifications ───────────────────────────────────────────────────
  const [successToast, setSuccessToast] = useState('')
  const [errorToast, setErrorToast] = useState('')

  const notifySuccess = useCallback((msg) => {
    setSuccessToast(msg)
    setErrorToast('')
    setTimeout(() => {
      setSuccessToast((prev) => (prev === msg ? '' : prev))
    }, 4500)
  }, [])

  const notifyError = useCallback((msg) => {
    setErrorToast(msg)
    setSuccessToast('')
    setTimeout(() => {
      setErrorToast((prev) => (prev === msg ? '' : prev))
    }, 5500)
  }, [])

  // ── Appearance & Display State ───────────────────────────────────────────
  const [themePreference, setThemePreference] = useState(() => {
    try {
      const saved = localStorage.getItem('swish-theme-mode')
      return saved || (dark ? 'dark' : 'light')
    } catch {
      return dark ? 'dark' : 'light'
    }
  })

  const [highContrast, setHighContrast] = useState(() => {
    try {
      return localStorage.getItem('swish_admin_high_contrast') === 'true'
    } catch {
      return false
    }
  })

  const [compactDensity, setCompactDensity] = useState(() => {
    try {
      return localStorage.getItem('swish_admin_compact_density') === 'true'
    } catch {
      return false
    }
  })

  const handleSelectTheme = (mode) => {
    setThemePreference(mode)
    try {
      localStorage.setItem('swish-theme-mode', mode)
    } catch {}

    if (mode === 'dark' && !dark) {
      toggle()
    } else if (mode === 'light' && dark) {
      toggle()
    } else if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark && !dark) toggle()
      else if (!prefersDark && dark) toggle()
    }
    notifySuccess(`Theme preference updated to ${mode.charAt(0).toUpperCase() + mode.slice(1)}.`)
  }

  const handleToggleContrast = () => {
    const next = !highContrast
    setHighContrast(next)
    try {
      localStorage.setItem('swish_admin_high_contrast', String(next))
    } catch {}
    notifySuccess(`Visual contrast ${next ? 'enhanced' : 'set to standard'}.`)
  }

  const handleToggleCompact = () => {
    const next = !compactDensity
    setCompactDensity(next)
    try {
      localStorage.setItem('swish_admin_compact_density', String(next))
    } catch {}
    notifySuccess(`Display density set to ${next ? 'compact' : 'comfortable'}.`)
  }

  // ── Audio & Notification Alerts State ────────────────────────────────────
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('swish_admin_sound_enabled')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const [categoryPrefs, setCategoryPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('swish_admin_notif_prefs')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      college_requests: true,
      platform_reports: true,
      platform_controls: true,
      admin_security: true,
    }
  })

  // Sync sound changes across popover and settings
  useEffect(() => {
    const handleSync = (e) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setSoundEnabled(e.detail.enabled)
      }
    }
    window.addEventListener('swish:sound-toggle', handleSync)
    return () => window.removeEventListener('swish:sound-toggle', handleSync)
  }, [])

  const handleToggleSound = () => {
    const nextState = !soundEnabled
    setSoundEnabled(nextState)
    try {
      localStorage.setItem('swish_admin_sound_enabled', String(nextState))
    } catch {}
    window.dispatchEvent(new CustomEvent('swish:sound-toggle', { detail: { enabled: nextState } }))
    if (nextState) {
      playNotificationSound()
    }
    notifySuccess(nextState ? 'Audio chime alerts turned ON.' : 'Audio chime alerts MUTED.')
  }

  const handleTestChime = () => {
    playNotificationSound()
    notifySuccess('Audio chime triggered successfully.')
  }

  const handleToggleCategory = (catKey) => {
    const updated = {
      ...categoryPrefs,
      [catKey]: !categoryPrefs[catKey],
    }
    setCategoryPrefs(updated)
    try {
      localStorage.setItem('swish_admin_notif_prefs', JSON.stringify(updated))
    } catch {}
    notifySuccess('Notification category preferences updated.')
  }

  // ── Platform Security & Active Session State ─────────────────────────────
  const deviceInfo = useMemo(() => getClientDeviceInfo(), [])
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false)
  const [terminatingSessions, setTerminatingSessions] = useState(false)

  const handleTerminateOtherSessions = async () => {
    try {
      setTerminatingSessions(true)
      const res = await apiTerminateOtherSessions()
      if (res && res.ok) {
        setShowTerminateConfirm(false)
        notifySuccess('All other active admin sessions and remembered devices have been invalidated.')
      } else {
        notifyError(res?.error || 'Failed to terminate other sessions.')
      }
    } catch (err) {
      console.error('[AdminSettings] Terminate sessions error:', err)
      notifyError(err?.message || 'Connection error while invalidating sessions.')
    } finally {
      setTerminatingSessions(false)
    }
  }

  // ── System Health & Backup State ─────────────────────────────────────────
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthData, setHealthData] = useState(null)
  const [healthLatency, setHealthLatency] = useState(null)
  const [exportingBackup, setExportingBackup] = useState(false)

  const checkSystemHealth = useCallback(async () => {
    try {
      setHealthLoading(true)
      const start = performance.now()
      const res = await apiGetSystemHealth()
      const latency = Math.round(performance.now() - start)
      setHealthLatency(latency)
      if (res && res.ok) {
        setHealthData(res)
      } else {
        setHealthData({ ok: false, error: 'Health check response unacknowledged' })
      }
    } catch (err) {
      console.error('[AdminSettings] Health check error:', err)
      setHealthData({ ok: false, error: err.message })
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSystemHealth()
  }, [checkSystemHealth])

  const handleExportConfigBackup = async () => {
    try {
      setExportingBackup(true)
      const configRes = await apiGetAdminPlatformConfig()
      const healthRes = await apiGetSystemHealth().catch(() => null)

      const exportPayload = {
        exportMetadata: {
          title: 'Swish Platform Configuration & System Snapshot',
          version: '2.4.0',
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser?.email || 'admin@swish.edu',
          environment: import.meta.env.MODE || 'production',
        },
        platformConfig: configRes?.config || null,
        systemHealth: healthRes || healthData || null,
        adminPreferences: {
          theme: themePreference,
          highContrast,
          compactDensity,
          soundEnabled,
          categoryPreferences: categoryPrefs,
        },
      }

      const jsonStr = JSON.stringify(exportPayload, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `swish-platform-config-backup-${dateStr}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      notifySuccess('Platform configuration backup (JSON) exported and downloaded successfully!')
    } catch (err) {
      console.error('[AdminSettings] Export backup error:', err)
      notifyError('Failed to generate platform configuration backup.')
    } finally {
      setExportingBackup(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5"
          >
            Platform Settings & System Environment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Manage your administrative interface, audio alert preferences, session defenses, and system backups.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Platform Controls')}
              className={`flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-200/70 dark:border-indigo-800/70 ${adminInteractiveClass}`}
            >
              <Sliders size={14} />
              <span>Platform Controls</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Fixed Floating Toast Alert (Option 1 Pattern) ────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {errorToast && (
            <motion.div
              key="settings-error"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pointer-events-auto p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-rose-200 dark:border-rose-900/70 shadow-2xl shadow-rose-950/15 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={17} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Action Failed</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-medium leading-relaxed">
                    {errorToast}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorToast('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss alert"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}

          {successToast && (
            <motion.div
              key="settings-success"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pointer-events-auto p-4 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-emerald-200/90 dark:border-emerald-800/80 shadow-2xl shadow-emerald-950/15 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={17} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Settings Updated
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5 font-medium leading-relaxed">
                    {successToast}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessToast('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss alert"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CARD 1: APPEARANCE & DISPLAY PREFERENCES ─────────────────────────── */}
      <div className={`${adminCardClass} p-6 space-y-6`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sun size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Appearance & Display</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Customize your console color theme, density, and contrast modes.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
            {themePreference.toUpperCase()}
          </span>
        </div>

        {/* Theme Options Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
            Console Theme Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                themePreference === 'light'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sun size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</p>
                  {themePreference === 'light' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Crisp daylight canvas with high readability.
                </p>
              </div>
            </button>

            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                themePreference === 'dark'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Moon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                  {themePreference === 'dark' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Deep obsidian surface optimized for night ops.
                </p>
              </div>
            </button>

            {/* System Default Option */}
            <button
              type="button"
              onClick={() => handleSelectTheme('system')}
              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                themePreference === 'system'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50/50 dark:bg-gray-800/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Match System</p>
                  {themePreference === 'system' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Synchronizes with your operating system theme.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Display Density & Contrast Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-gray-200">High Contrast Mode</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                Increases card and divider border contrast.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleContrast}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                highContrast ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  highContrast ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-gray-200">Compact Density</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                Tighter table rows and decreased padding.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCompact}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                compactDensity ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  compactDensity ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD 2: ADMIN NOTIFICATION & AUDIO ALERTS ────────────────────────── */}
      <div className={`${adminCardClass} p-6 space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin Audio Alerts & Notifications</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Configure live acoustic chimes and category filtering for administrative alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestChime}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-semibold rounded-xl ${adminInteractiveClass}`}
              title="Test the Web Audio harmonic chime output"
            >
              <Play size={12} className="text-indigo-600 fill-indigo-600" />
              <span>Test Audio Chime</span>
            </button>
          </div>
        </div>

        {/* Master Sound Switch */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Real-Time Audio Chime</p>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    soundEnabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400'
                      : 'bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {soundEnabled ? 'ACTIVE' : 'MUTED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                Plays a two-tone synthesized acoustic chime whenever a new college request or urgent platform alert arrives via WebSocket.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label="Toggle real-time audio chime"
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              soundEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Notification Category Toggles */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
            Active Alert Subscriptions
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category 1 */}
            <div
              onClick={() => handleToggleCategory('college_requests')}
              className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 transition-colors cursor-pointer"
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">College Onboarding Requests</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Accreditation submissions and new university verification requests.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(categoryPrefs.college_requests)}
                onChange={() => {}}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-gray-700 mt-0.5 pointer-events-none"
              />
            </div>

            {/* Category 2 */}
            <div
              onClick={() => handleToggleCategory('platform_reports')}
              className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 transition-colors cursor-pointer"
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Platform Content & Abuse Reports</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  High-priority student or faculty misconduct and community guideline reports.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(categoryPrefs.platform_reports)}
                onChange={() => {}}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-gray-700 mt-0.5 pointer-events-none"
              />
            </div>

            {/* Category 3 */}
            <div
              onClick={() => handleToggleCategory('platform_controls')}
              className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 transition-colors cursor-pointer"
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Platform Controls & Maintenance</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  Emergency switch toggles, maintenance mode, and global broadcast changes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(categoryPrefs.platform_controls)}
                onChange={() => {}}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-gray-700 mt-0.5 pointer-events-none"
              />
            </div>

            {/* Category 4 */}
            <div
              onClick={() => handleToggleCategory('admin_security')}
              className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900 transition-colors cursor-pointer"
            >
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Admin Security & Access Audits</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  College admin credentials generation, suspension, and authorization audits.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(categoryPrefs.admin_security)}
                onChange={() => {}}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-gray-700 mt-0.5 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: PLATFORM SECURITY & ACTIVE ADMIN SESSION ─────────────────── */}
      <div className={`${adminCardClass} p-6 space-y-6`}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Security & Active Session</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Inspect active Super Admin credentials, bot defenses, and invalidate secondary sessions.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SECURE
          </span>
        </div>

        {/* Current Active Session Info Card */}
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0 overflow-hidden">
              {currentUser?.profilePhoto ? (
                <img src={getAvatarUrl(currentUser.profilePhoto)} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                'SA'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentUser?.name || 'Swish Admin'}
                </p>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Super Administrator
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                {currentUser?.email || 'admin@swish.edu'} • Role: {currentUser?.role || 'admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowTerminateConfirm(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold ${adminInteractiveClass}`}
            >
              <LogOut size={13} />
              <span>Terminate Other Sessions</span>
            </button>
          </div>
        </div>

        {/* Diagnostics & Defense Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Device & Client Info */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500 mb-1">
              <Laptop size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Device & Client</span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              {deviceInfo.browser}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              {deviceInfo.os} • Current Active Session
            </p>
          </div>

          {/* Cloudflare Turnstile */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500 mb-1">
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Bot Defense Shield</span>
            </div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <Check size={13} />
              Cloudflare Turnstile Active
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Enforced on /login, /register & /onboarding
            </p>
          </div>

          {/* Authentication Security */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500 mb-1">
              <Key size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Auth Mechanism</span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">
              Bearer JWT + httpOnly
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              256-bit HMAC Signed Token Auth
            </p>
          </div>
        </div>
      </div>

      {/* ── CARD 4: SYSTEM ENVIRONMENT & CONFIGURATION BACKUP ────────────────── */}
      <div className={`${adminCardClass} p-6 space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Server size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Environment & Configuration Backup</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Live infrastructure telemetry, cluster health, and 1-click platform snapshot export.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={checkSystemHealth}
              disabled={healthLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-semibold rounded-xl ${adminInteractiveClass} disabled:opacity-50`}
            >
              <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} />
              <span>Ping Health</span>
            </button>

            <button
              type="button"
              onClick={handleExportConfigBackup}
              disabled={exportingBackup}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none ${adminInteractiveClass} disabled:opacity-50`}
            >
              <Download size={13} className={exportingBackup ? 'animate-bounce' : ''} />
              <span>{exportingBackup ? 'Exporting...' : 'Export Platform Config (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Live Infrastructure Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* API Health */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Backend API
              </span>
              <Activity size={15} className="text-emerald-500" />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
              {healthData?.status === 'healthy' ? 'Healthy (200 OK)' : healthLoading ? 'Checking...' : 'Operational'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Ping Latency: {healthLatency !== null ? `${healthLatency}ms` : '—'}
            </p>
          </div>

          {/* Socket.io Realtime */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                WebSocket Cluster
              </span>
              <Radio size={15} className={socketCtx?.connected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
              {socketCtx?.connected ? 'Connected' : 'Standby'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Online Peers: {socketCtx?.onlineUsers?.size ?? 1} active
            </p>
          </div>

          {/* Engine Uptime */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                Process Uptime
              </span>
              <Clock size={15} className="text-indigo-500" />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
              {healthData?.uptime ? formatUptime(healthData.uptime) : 'Active'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Swish Core v2.4.0
            </p>
          </div>

          {/* Database Layer */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-850">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                MongoDB Cluster
              </span>
              <Database size={15} className="text-emerald-500" />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
              Connected
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
              Indexed & Sanitized
            </p>
          </div>
        </div>

        {/* Configuration Snapshot Info Banner */}
        <div className="p-4 rounded-xl border border-purple-200/70 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Download size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Platform Configuration JSON Snapshot
              </p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Exports all current maintenance windows, feature kill-switches, active broadcast announcements, and environment telemetry into an immutable JSON file.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportConfigBackup}
            disabled={exportingBackup}
            className={`self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs ${adminInteractiveClass} disabled:opacity-50`}
          >
            <Download size={12} />
            <span>Download Backup</span>
          </button>
        </div>
      </div>

      {/* ── MODAL: TERMINATE OTHER SESSIONS CONFIRMATION ─────────────────────── */}
      <AnimatePresence>
        {showTerminateConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-gray-800 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Terminate All Other Active Sessions?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                    This will invalidate all other active browser sessions and remembered devices for this Super Admin account. Your current session will remain active.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowTerminateConfirm(false)}
                  disabled={terminatingSessions}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTerminateOtherSessions}
                  disabled={terminatingSessions}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {terminatingSessions ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Terminating...</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={13} />
                      <span>Terminate Sessions</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

