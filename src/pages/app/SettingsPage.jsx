import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Lock, Shield, Palette, HelpCircle, Info,
  Sun, Moon, ChevronRight, Save, LogOut, Trash2, Eye, EyeOff,
  Check, AlertCircle, X, GraduationCap, Briefcase, Globe,
  MessageCircle, Heart, UserPlus, AtSign, Calendar,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'

// ── Sidebar sections ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'account',      label: 'Account',       icon: User },
  { id: 'appearance',   label: 'Appearance',    icon: Palette },
  { id: 'notifications',label: 'Notifications', icon: Bell },
  { id: 'privacy',      label: 'Privacy',        icon: Globe },
  { id: 'security',     label: 'Security',       icon: Shield },
  { id: 'help',         label: 'Help & Support', icon: HelpCircle },
  { id: 'about',        label: 'About Swish',    icon: Info },
]

// ── Shared UI primitives ──────────────────────────────────────────────────────
const INPUT_BASE =
  'w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all'

function SectionCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-gray-800">
        <h2 className="text-slate-900 dark:text-white font-semibold text-sm"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function ToggleRow({ label, sub, checked, onChange, id }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{label}</p>
        {sub && <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  )
}

function Toast({ message, type = 'success', onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
        type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
      }`}
    >
      {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <X size={13} />
      </button>
    </motion.div>
  )
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
      >
        <h3 className="text-slate-900 dark:text-white font-bold text-base mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h3>
        <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-5">{body}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${
              danger
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Section components ────────────────────────────────────────────────────────

function AccountSection({ currentUser, updateUser, showToast }) {
  const [name,     setName]     = useState(currentUser?.name     ?? '')
  const [username, setUsername] = useState(currentUser?.username ?? '')
  const [bio,      setBio]      = useState(currentUser?.bio      ?? '')
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { showToast('Name cannot be empty.', 'error'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    updateUser({ name, username, bio })
    setSaving(false)
    showToast('Profile saved successfully!')
  }

  const roleLabel = currentUser?.role === 'faculty'
    ? `Faculty · ${currentUser.designation || 'Faculty'}`
    : currentUser?.role === 'admin'
    ? 'Administrator'
    : `Student · ${currentUser?.year || ''}`

  return (
    <>
      <SectionCard title="Profile">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
          >
            {currentUser?.initials || '??'}
          </div>
          <div>
            <p className="text-slate-900 dark:text-white font-semibold text-sm">{currentUser?.name}</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{roleLabel}</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs">{currentUser?.college}</p>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-slate-700 dark:text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
            Display Name
          </label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            className={INPUT_BASE}
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-slate-700 dark:text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 text-sm">@</span>
            <input
              id="settings-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              className={`${INPUT_BASE} pl-8`}
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-slate-700 dark:text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
            Email <span className="text-slate-400 dark:text-gray-600 font-normal normal-case tracking-normal">(cannot be changed)</span>
          </label>
          <input
            type="email"
            value={currentUser?.email ?? ''}
            readOnly
            className={`${INPUT_BASE} opacity-60 cursor-not-allowed`}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-slate-700 dark:text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
            Bio
          </label>
          <textarea
            id="settings-bio"
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell your campus about yourself…"
            className={`${INPUT_BASE} resize-none`}
          />
          <p className="text-slate-400 dark:text-gray-600 text-xs mt-1 text-right">{bio.length}/160</p>
        </div>

        {/* Save */}
        <button
          id="settings-save"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            : <><Save size={15} /> Save Changes</>
          }
        </button>
      </SectionCard>

      {/* Read-only info card */}
      <SectionCard title="Account Info">
        {[
          { label: 'Role',    value: currentUser?.role },
          { label: 'College', value: currentUser?.college || '—' },
          { label: 'Dept',    value: currentUser?.dept || '—' },
          ...(currentUser?.role === 'student'
            ? [
                { label: 'Year',       value: currentUser?.year || '—' },
                { label: 'Student ID', value: currentUser?.studentId || '—' },
              ]
            : currentUser?.role === 'faculty'
            ? [
                { label: 'Designation', value: currentUser?.designation || '—' },
                { label: 'Employee ID', value: currentUser?.employeeId  || '—' },
              ]
            : []
          ),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <p className="text-slate-500 dark:text-gray-400 text-sm">{label}</p>
            <p className="text-slate-900 dark:text-white text-sm font-medium capitalize">{value}</p>
          </div>
        ))}
      </SectionCard>
    </>
  )
}

function AppearanceSection({ dark, toggle }) {
  return (
    <SectionCard title="Theme">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Light Mode', icon: Sun,  value: false },
          { label: 'Dark Mode',  icon: Moon, value: true  },
        ].map(({ label, icon: Icon, value }) => (
          <button
            key={label}
            onClick={() => { if (dark !== value) toggle() }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
              dark === value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
                : 'border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-600'
            }`}
          >
            <Icon size={16} />
            {label}
            {dark === value && <Check size={14} className="ml-auto" />}
          </button>
        ))}
      </div>
      <p className="text-slate-400 dark:text-gray-600 text-xs">
        Theme preference is saved automatically and persists across sessions.
      </p>
    </SectionCard>
  )
}

function NotificationsSection({ prefs, updatePreferences }) {
  const notifs = prefs?.notifications ?? {}
  const set = (key, val) => updatePreferences({ notifications: { [key]: val } })

  const items = [
    { key: 'likes',    icon: Heart,       label: 'Likes',         sub: 'When someone likes your post' },
    { key: 'comments', icon: MessageCircle, label: 'Comments',    sub: 'When someone comments on your post' },
    { key: 'follows',  icon: UserPlus,    label: 'New Followers', sub: 'When someone follows you' },
    { key: 'mentions', icon: AtSign,      label: 'Mentions',      sub: 'When you are mentioned in a post' },
    { key: 'events',   icon: Calendar,    label: 'Campus Events', sub: 'Announcements and campus events' },
  ]

  return (
    <SectionCard title="Notification Preferences">
      {items.map(({ key, icon: Icon, label, sub }) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-slate-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{label}</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs">{sub}</p>
            </div>
          </div>
          <Toggle id={`notif-${key}`} checked={!!notifs[key]} onChange={v => set(key, v)} />
        </div>
      ))}
    </SectionCard>
  )
}

function PrivacySection({ prefs, updatePreferences }) {
  const privacy = prefs?.privacy ?? {}
  const set = (key, val) => updatePreferences({ privacy: { [key]: val } })

  return (
    <SectionCard title="Privacy">
      <ToggleRow
        id="priv-private"
        label="Private Account"
        sub="Only followers can see your posts"
        checked={!!privacy.private}
        onChange={v => set('private', v)}
      />
      <ToggleRow
        id="priv-email"
        label="Show Email on Profile"
        sub="Your campus email will be visible to others"
        checked={!!privacy.showEmail}
        onChange={v => set('showEmail', v)}
      />
      <ToggleRow
        id="priv-activity"
        label="Activity Status"
        sub="Let others see when you're active on Swish"
        checked={!!privacy.activity}
        onChange={v => set('activity', v)}
      />
      <ToggleRow
        id="priv-tagged"
        label="Allow Tagging"
        sub="Others can tag you in posts and comments"
        checked={!!privacy.tagged}
        onChange={v => set('tagged', v)}
      />
    </SectionCard>
  )
}

function SecuritySection({ currentUser, changePassword, showToast }) {
  const prefs = currentUser?.preferences ?? {}
  const { updatePreferences } = useSwish()

  // Change password local state
  const [showPwdForm,  setShowPwdForm]  = useState(false)
  const [curPwd,       setCurPwd]       = useState('')
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [showCur,      setShowCur]      = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [showConf,     setShowConf]     = useState(false)
  const [pwdLoading,   setPwdLoading]   = useState(false)

  const handleChangePwd = async (e) => {
    e.preventDefault()
    if (!curPwd) { showToast('Please enter your current password.', 'error'); return }
    if (newPwd.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return }
    if (newPwd !== confirmPwd) { showToast('New passwords do not match.', 'error'); return }
    setPwdLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const result = changePassword(curPwd, newPwd)
    setPwdLoading(false)
    if (result.ok) {
      showToast('Password updated successfully!')
      setCurPwd(''); setNewPwd(''); setConfirmPwd('')
      setShowPwdForm(false)
    } else {
      showToast(result.error, 'error')
    }
  }

  const PwdField = ({ id, label, value, onChange, show, setShow }) => (
    <div>
      <label htmlFor={id} className="block text-slate-700 dark:text-gray-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${INPUT_BASE} pr-11`}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* 2FA toggle */}
      <SectionCard title="Two-Factor Authentication">
        <ToggleRow
          id="sec-2fa"
          label="Two-Factor Authentication"
          sub="Extra layer of security for your account (UI preference — demo only)"
          checked={!!prefs?.security?.twoFactor}
          onChange={v => updatePreferences({ security: { twoFactor: v } })}
        />
        {prefs?.security?.twoFactor && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <p className="text-amber-700 dark:text-amber-400 text-xs font-medium">
              ⚠️ This is a UI preference only. Real 2FA requires a backend implementation.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Change password */}
      <SectionCard title="Change Password">
        {!showPwdForm ? (
          <button
            id="sec-change-pwd"
            onClick={() => setShowPwdForm(true)}
            className="flex items-center justify-between w-full text-sm text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
          >
            <span>Change your password</span>
            <ChevronRight size={16} className="text-slate-400 dark:text-gray-600" />
          </button>
        ) : (
          <form onSubmit={handleChangePwd} className="space-y-3">
            <PwdField id="cur-pwd"  label="Current Password" value={curPwd}     onChange={setCurPwd}     show={showCur}  setShow={setShowCur}  />
            <PwdField id="new-pwd"  label="New Password"     value={newPwd}     onChange={setNewPwd}     show={showNew}  setShow={setShowNew}  />
            <PwdField id="conf-pwd" label="Confirm Password" value={confirmPwd} onChange={setConfirmPwd} show={showConf} setShow={setShowConf} />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={pwdLoading}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                {pwdLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {pwdLoading ? 'Updating…' : 'Update Password'}
              </button>
              <button type="button" onClick={() => { setShowPwdForm(false); setCurPwd(''); setNewPwd(''); setConfirmPwd('') }}
                className="px-4 py-2 text-slate-500 dark:text-gray-400 text-sm font-medium hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Active sessions (placeholder) */}
      <SectionCard title="Sessions">
        <button className="flex items-center justify-between w-full text-sm text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
          <div>
            <p>Active Sessions</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5 font-normal">Manage devices where you're logged in</p>
          </div>
          <ChevronRight size={16} className="text-slate-400 dark:text-gray-600 flex-shrink-0" />
        </button>
        <div className="bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-800 dark:text-gray-200 text-xs font-medium">Current Session</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">This device · Active now</p>
            </div>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
        </div>
        <p className="text-slate-400 dark:text-gray-600 text-xs">
          Full session management requires a backend. This is currently a frontend prototype.
        </p>
      </SectionCard>
    </>
  )
}

function HelpSection({ showToast }) {
  const items = [
    { label: 'Help Center',           sub: 'Browse frequently asked questions',  action: () => showToast('Help Center coming soon.') },
    { label: 'Contact Support',       sub: 'Get help from the Swish team',       action: () => showToast('Contact form coming soon.') },
    { label: 'Report a Problem',      sub: 'Something not working? Let us know', action: () => showToast('Problem reporting coming soon.') },
    { label: 'Community Guidelines',  sub: 'Learn about campus community rules', action: () => showToast('Guidelines coming soon.') },
  ]

  return (
    <SectionCard title="Help & Support">
      {items.map(({ label, sub, action }) => (
        <button
          key={label}
          onClick={action}
          className="flex items-center justify-between w-full group py-0.5"
        >
          <div className="text-left">
            <p className="text-slate-800 dark:text-gray-200 text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{sub}</p>
          </div>
          <ChevronRight size={15} className="text-slate-300 dark:text-gray-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0" />
        </button>
      ))}
    </SectionCard>
  )
}

function AboutSection() {
  return (
    <SectionCard title="About Swish">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>S</span>
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-bold text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Swish</p>
          <p className="text-slate-400 dark:text-gray-500 text-xs">Version 1.0.0 · Beta</p>
        </div>
      </div>
      <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">
        Swish is a private, verified campus social network — built exclusively for students and faculty of registered institutions. No outsiders. Just your campus community.
      </p>
      {[
        { label: 'Platform',   value: 'Swish Campus Network' },
        { label: 'Version',    value: '1.0.0-beta' },
        { label: 'Built with', value: 'React + Vite' },
        { label: 'License',    value: 'Private — Campus Use Only' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <p className="text-slate-400 dark:text-gray-500 text-sm">{label}</p>
          <p className="text-slate-700 dark:text-gray-300 text-sm font-medium">{value}</p>
        </div>
      ))}
    </SectionCard>
  )
}

function DangerZoneSection({ deactivateAccount, deleteAccount, logout, showToast }) {
  const navigate = useNavigate()
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete,     setConfirmDelete]     = useState(false)

  const handleDeactivate = () => {
    setConfirmDeactivate(false)
    deactivateAccount()
    navigate('/login')
  }

  const handleDelete = () => {
    setConfirmDelete(false)
    deleteAccount()
    navigate('/login')
  }

  return (
    <>
      <AnimatePresence>
        {confirmDeactivate && (
          <ConfirmModal
            title="Deactivate Account"
            body="Your account will be deactivated. You will be logged out and won't be able to log back in unless reactivated. Your data will be preserved."
            confirmLabel="Deactivate"
            onConfirm={handleDeactivate}
            onCancel={() => setConfirmDeactivate(false)}
            danger
          />
        )}
        {confirmDelete && (
          <ConfirmModal
            title="Permanently Delete Account"
            body="This action cannot be undone. Your account and all associated data will be permanently removed. Colleges and other users will not be affected."
            confirmLabel="Delete Forever"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
            danger
          />
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
          <h2 className="text-rose-700 dark:text-rose-400 font-semibold text-sm"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Danger Zone
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">Deactivate Account</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">Temporarily disable your account</p>
            </div>
            <button
              id="settings-deactivate"
              onClick={() => setConfirmDeactivate(true)}
              className="px-4 py-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors flex-shrink-0"
            >
              Deactivate
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">Delete Account Permanently</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">This action cannot be undone</p>
            </div>
            <button
              id="settings-delete"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors flex-shrink-0"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    currentUser,
    updateUser,
    updatePreferences,
    changePassword,
    deactivateAccount,
    deleteAccount,
    logout,
  } = useSwish()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState('account')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sectionContent = {
    account: (
      <AccountSection
        currentUser={currentUser}
        updateUser={updateUser}
        showToast={showToast}
      />
    ),
    appearance: (
      <AppearanceSection dark={dark} toggle={toggle} />
    ),
    notifications: (
      <NotificationsSection
        prefs={currentUser?.preferences}
        updatePreferences={updatePreferences}
      />
    ),
    privacy: (
      <PrivacySection
        prefs={currentUser?.preferences}
        updatePreferences={updatePreferences}
      />
    ),
    security: (
      <SecuritySection
        currentUser={currentUser}
        changePassword={changePassword}
        showToast={showToast}
      />
    ),
    help: <HelpSection showToast={showToast} />,
    about: <AboutSection />,
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="mb-6">
        <h1
          className="text-slate-900 dark:text-white font-bold text-xl"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Settings
        </h1>
        <p className="text-slate-400 dark:text-gray-500 text-sm mt-0.5">
          Manage your account, preferences and privacy
        </p>
      </div>

      <div className="flex gap-6">

        {/* ── Left sidebar nav (desktop) ─────────────────────────────────── */}
        <aside className="hidden md:flex flex-col gap-1 w-48 flex-shrink-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
                activeSection === id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {label}
            </button>
          ))}

          {/* Divider + logout */}
          <div className="border-t border-slate-100 dark:border-gray-800 mt-2 pt-2">
            <button
              id="settings-logout"
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all w-full font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </aside>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Mobile section tabs (horizontal scroll) */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                  activeSection === id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Animated section content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {sectionContent[activeSection]}

              {/* Danger zone (always at bottom of security, or when on account) */}
              {activeSection === 'security' && (
                <DangerZoneSection
                  deactivateAccount={deactivateAccount}
                  deleteAccount={deleteAccount}
                  logout={logout}
                  showToast={showToast}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Mobile logout */}
          <div className="md:hidden mt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
