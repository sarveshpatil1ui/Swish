import React, { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Power,
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  Radio,
  Sliders,
  Send,
  Eye,
  Info,
  Lock,
  Unlock,
  MessageSquare,
  FileText,
  Building2,
} from 'lucide-react'
import {
  apiGetAdminPlatformConfig,
  apiUpdateMaintenanceMode,
  apiUpdateFeatureFlags,
  apiUpdateBroadcastBanner,
} from '../../utils/auth'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-xs'

export default function PlatformControls({ onShowToast }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Maintenance form states
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceNote, setMaintenanceNote] = useState('')
  const [expectedBack, setExpectedBack] = useState('')
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Feature flags states
  const [features, setFeatures] = useState({
    allowRegistration: true,
    allowPostCreation: true,
    allowDirectMessaging: true,
  })
  const [savingFeatures, setSavingFeatures] = useState(false)

  // Broadcast banner states
  const [broadcastActive, setBroadcastActive] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastType, setBroadcastType] = useState('info')
  const [broadcastLink, setBroadcastLink] = useState('')
  const [broadcastDismissible, setBroadcastDismissible] = useState(true)
  const [savingBroadcast, setSavingBroadcast] = useState(false)

  // ── Load Platform Config ───────────────────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGetAdminPlatformConfig()
      if (res && res.ok && res.config) {
        const c = res.config
        setConfig(c)
        setMaintenanceEnabled(Boolean(c.maintenance?.enabled))
        setMaintenanceNote(c.maintenance?.note || '')
        setExpectedBack(c.maintenance?.expectedBack || '')
        setFeatures({
          allowRegistration: c.features?.allowRegistration !== false,
          allowPostCreation: c.features?.allowPostCreation !== false,
          allowDirectMessaging: c.features?.allowDirectMessaging !== false,
        })
        setBroadcastActive(Boolean(c.broadcast?.active))
        setBroadcastTitle(c.broadcast?.title || '')
        setBroadcastMessage(c.broadcast?.message || '')
        setBroadcastType(c.broadcast?.type || 'info')
        setBroadcastLink(c.broadcast?.link || '')
        setBroadcastDismissible(c.broadcast?.dismissible !== false)
        setError('')
      } else {
        setError(res?.error || 'Failed to load platform controls.')
      }
    } catch (err) {
      console.error('[PlatformControls] fetchConfig error:', err)
      setError(err?.message || 'Unable to reach server. Please check your network.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const notifySuccess = (msg) => {
    setSuccessMessage(msg)
    setError('')
    if (typeof onShowToast === 'function') {
      try {
        onShowToast(msg)
      } catch (toastErr) {
        console.warn('[PlatformControls] onShowToast error:', toastErr)
      }
    }
    setTimeout(() => {
      setSuccessMessage((prev) => (prev === msg ? '' : prev))
    }, 4500)
  }

  // ── Save Maintenance Mode ──────────────────────────────────────────────────
  const handleSaveMaintenance = async (targetState) => {
    setError('')
    setSuccessMessage('')
    setSavingMaintenance(true)
    try {
      const res = await apiUpdateMaintenanceMode({
        enabled: targetState,
        note: maintenanceNote,
        expectedBack,
      })

      if (res && res.ok) {
        setMaintenanceEnabled(targetState)
        setShowConfirmModal(false)
        notifySuccess(
          targetState
            ? 'Platform Maintenance Mode is now ACTIVE. Regular users are seeing the maintenance screen.'
            : 'Maintenance Mode DEACTIVATED. Platform returned to normal.'
        )
      } else {
        setError(res?.error || 'Failed to update maintenance mode.')
      }
    } catch (err) {
      console.error('[PlatformControls] Update maintenance mode error:', err)
      setError(err?.message || 'Connection error while updating maintenance mode.')
    } finally {
      setSavingMaintenance(false)
    }
  }

  // ── Save Feature Flags ─────────────────────────────────────────────────────
  const handleToggleFeature = async (featureKey) => {
    setError('')
    setSuccessMessage('')
    const updated = {
      ...features,
      [featureKey]: !features[featureKey],
    }
    setFeatures(updated)
    setSavingFeatures(true)
    try {
      const res = await apiUpdateFeatureFlags(updated)
      if (res && res.ok) {
        notifySuccess('Feature flag updated successfully.')
      } else {
        setError(res?.error || 'Failed to update feature flags.')
        setFeatures(features) // rollback
      }
    } catch (err) {
      console.error('[PlatformControls] Update feature flags error:', err)
      setError(err?.message || 'Connection error while updating feature flags.')
      setFeatures(features)
    } finally {
      setSavingFeatures(false)
    }
  }

  // ── Save Broadcast Banner ──────────────────────────────────────────────────
  const handleSaveBroadcast = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setSavingBroadcast(true)
    try {
      const res = await apiUpdateBroadcastBanner({
        active: broadcastActive,
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType,
        link: broadcastLink,
        dismissible: broadcastDismissible,
      })

      if (res && res.ok) {
        notifySuccess(
          broadcastActive
            ? 'Global broadcast banner published across all campuses.'
            : 'Broadcast banner deactivated.'
        )
      } else {
        setError(res?.error || 'Failed to update broadcast banner.')
      }
    } catch (err) {
      console.error('[PlatformControls] Save broadcast error:', err)
      setError(err?.message || 'Connection error while saving broadcast.')
    } finally {
      setSavingBroadcast(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5"
          >
            <span>Platform Controls & Maintenance</span>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              Super Admin
            </span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
            Toggle platform maintenance, manage feature availability, and broadcast system announcements
          </p>
        </div>

        <button
          type="button"
          onClick={fetchConfig}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh State</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-300 text-[11px] font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 text-[11px] font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── SECTION 1: MAINTENANCE MODE (THE BIG SWITCH) ──────────────────────── */}
      <div className={`${adminCardClass} p-6 border-l-4 ${maintenanceEnabled ? 'border-l-amber-500' : 'border-l-emerald-500'} space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${maintenanceEnabled ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
              <Wrench size={24} className={maintenanceEnabled ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Platform Maintenance Mode
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${maintenanceEnabled ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'}`}>
                  {maintenanceEnabled ? 'Active (Locked)' : 'Normal Operations'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {maintenanceEnabled
                  ? 'All regular students and faculty are locked out and seeing the maintenance page. Administrators retain full access.'
                  : 'The platform is operating normally. All students, faculty, and college admins have full access.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {maintenanceEnabled ? (
              <button
                type="button"
                onClick={() => handleSaveMaintenance(false)}
                disabled={savingMaintenance}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Power size={14} />
                <span>{savingMaintenance ? 'Deactivating...' : 'Turn Off Maintenance'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Wrench size={14} />
                <span>Enter Maintenance Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Maintenance Message Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Custom Maintenance Note / Reason
              </label>
              <textarea
                rows={3}
                value={maintenanceNote}
                onChange={(e) => setMaintenanceNote(e.target.value)}
                placeholder="e.g. Swish is upgrading cloud infrastructure to version 2.2. Thank you for your patience!"
                maxLength={500}
                className="w-full p-3 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This message will be shown prominently to students and visitors on the maintenance screen.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Estimated Return Time (Expected Uptime)
              </label>
              <input
                type="text"
                value={expectedBack}
                onChange={(e) => setExpectedBack(e.target.value)}
                placeholder="e.g. Today at 2:30 AM IST (approx 30 mins)"
                maxLength={100}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {maintenanceEnabled && (
              <button
                type="button"
                onClick={() => handleSaveMaintenance(true)}
                disabled={savingMaintenance}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {savingMaintenance ? 'Updating Note...' : 'Update Note & Uptime'}
              </button>
            )}
          </div>

          {/* Live Preview Box */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye size={13} />
              <span>Student / User Live Preview</span>
            </p>
            <div className="bg-slate-100 dark:bg-gray-950 p-5 rounded-2xl border border-slate-200/80 dark:border-gray-800 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                <Wrench size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">We're Tuning Up Swish</p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">Scheduled maintenance in progress</p>
              </div>
              <div className="p-3 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300">
                <p className="italic">
                  "{maintenanceNote || 'Swish is currently undergoing scheduled platform maintenance. We will be back online shortly!'}"
                </p>
                {expectedBack && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Clock size={12} />
                    <span>Estimated Return: {expectedBack}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: GRANULAR FEATURE KILL-SWITCHES ────────────────────────── */}
      <div className={`${adminCardClass} p-6 space-y-4`}>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Feature Availability Switches (Soft Freeze)
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Pause specific subsystems without locking the entire platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Feature 1: College Registrations */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${features.allowRegistration ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
                <Building2 size={17} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">College Registrations (/join)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Allow colleges to submit onboarding requests</p>
              </div>
            </div>

            <button
              type="button"
              disabled={savingFeatures}
              onClick={() => handleToggleFeature('allowRegistration')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${features.allowRegistration ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'}`}
            >
              {features.allowRegistration ? <Unlock size={12} /> : <Lock size={12} />}
              <span>{features.allowRegistration ? 'Active (Enabled)' : 'Paused (Locked)'}</span>
            </button>
          </div>

          {/* Feature 2: Post Creation */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${features.allowPostCreation ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
                <FileText size={17} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Post & Media Creation</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Allow students to publish new campus posts</p>
              </div>
            </div>

            <button
              type="button"
              disabled={savingFeatures}
              onClick={() => handleToggleFeature('allowPostCreation')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${features.allowPostCreation ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'}`}
            >
              {features.allowPostCreation ? <Unlock size={12} /> : <Lock size={12} />}
              <span>{features.allowPostCreation ? 'Active (Enabled)' : 'Paused (Locked)'}</span>
            </button>
          </div>

          {/* Feature 3: Direct Messaging */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/40 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${features.allowDirectMessaging ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
                <MessageSquare size={17} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Direct Messaging</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Allow live chatting between students</p>
              </div>
            </div>

            <button
              type="button"
              disabled={savingFeatures}
              onClick={() => handleToggleFeature('allowDirectMessaging')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${features.allowDirectMessaging ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'}`}
            >
              {features.allowDirectMessaging ? <Unlock size={12} /> : <Lock size={12} />}
              <span>{features.allowDirectMessaging ? 'Active (Enabled)' : 'Paused (Locked)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: GLOBAL BROADCAST BANNER ───────────────────────────────── */}
      <form onSubmit={handleSaveBroadcast} className={`${adminCardClass} p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Global Broadcast Banner
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Display an immediate announcement bar at the top of all user apps across all campuses
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={broadcastActive}
              onChange={(e) => setBroadcastActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-gray-200">
              {broadcastActive ? 'Banner Active (Broadcasting)' : 'Banner Deactivated'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Banner Type / Theme
            </label>
            <select
              value={broadcastType}
              onChange={(e) => setBroadcastType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="info">Info (Indigo / Blue)</option>
              <option value="warning">Warning (Amber)</option>
              <option value="success">Success (Emerald / Green)</option>
              <option value="critical">Critical / Emergency (Rose / Red)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Title Prefix (Optional)
            </label>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="e.g. Maintenance Scheduled"
              maxLength={60}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Action Link (Optional URL)
            </label>
            <input
              type="url"
              value={broadcastLink}
              onChange={(e) => setBroadcastLink(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
            Announcement Message
          </label>
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="e.g. Swish will undergo scheduled maintenance tonight at 2 AM. All features will be temporarily paused."
            maxLength={250}
            required={broadcastActive}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden"
          />
        </div>

        {/* Live Banner Preview */}
        {broadcastMessage && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Eye size={12} />
              <span>Broadcast Live Preview</span>
            </p>
            <div
              className={`p-2.5 rounded-xl text-white text-xs font-medium flex items-center justify-between gap-3 ${broadcastType === 'warning' ? 'bg-amber-600' : broadcastType === 'success' ? 'bg-emerald-600' : broadcastType === 'critical' ? 'bg-rose-600' : 'bg-indigo-600'}`}
            >
              <div className="flex items-center gap-2 truncate">
                <Radio size={14} className="shrink-0 animate-pulse" />
                <span className="truncate">
                  {broadcastTitle && <strong>{broadcastTitle}: </strong>}
                  {broadcastMessage}
                </span>
              </div>
              <span className="text-[10px] opacity-75 shrink-0">[X]</span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingBroadcast}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send size={13} />
            <span>{savingBroadcast ? 'Publishing...' : 'Save & Publish Banner'}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Entering Maintenance Mode */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Confirm Entering Maintenance Mode
                </h3>
                <p className="text-xs text-slate-400">Platform-wide lockout</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
              Activating maintenance mode will immediately lock out all regular students, faculty, and visitors across all colleges. They will be presented with your maintenance note.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">⚠️ Administrator Bypass is Active:</p>
              <p>You and other platform administrators will still be able to access the admin console uninterrupted to manage systems.</p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingMaintenance}
                onClick={() => handleSaveMaintenance(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingMaintenance ? 'Activating...' : 'Yes, Lock & Activate Maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

