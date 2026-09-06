import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Lock, Shield, Palette, HelpCircle, Info,
  Sun, Moon, ChevronRight, ChevronLeft, Save, LogOut, Trash2, Eye, EyeOff,
  Check, AlertCircle, X, Heart, MessageCircle, UserPlus, AtSign, Calendar,
  Globe,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'

// ── Menu list ─────────────────────────────────────────────────────────────────
const MENU = [
  { id: 'account',       label: 'Account',            icon: User,        chevron: true },
  { id: 'appearance',    label: 'Appearance',          icon: Palette,     chevron: true },
  { id: 'notifications', label: 'Notifications',       icon: Bell,        chevron: true },
  { id: 'privacy',       label: 'Privacy',             icon: Globe,       chevron: true },
  { id: 'security',      label: 'Security',            icon: Shield,      chevron: true },
  { id: 'help',          label: 'Help & Support',      icon: HelpCircle,  chevron: true },
  { id: 'about',         label: 'About Swish',         icon: Info,        chevron: true },
]

// ── Shared primitives ─────────────────────────────────────────────────────────
const INPUT_BASE =
  'w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all'

function Toggle({ checked, onChange, id }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[28px] w-[50px] items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-gray-700'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

function ToggleRow({ label, sub, checked, onChange, id }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 dark:border-gray-800/80 last:border-0">
      <div className="min-w-0">
        <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{label}</p>
        {sub && <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  )
}

function MenuRow({ label, sub, icon: Icon, iconBg = 'bg-slate-100 dark:bg-gray-800', iconColor = 'text-slate-500 dark:text-gray-400', onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-slate-50 dark:active:bg-gray-800/60 transition-colors text-left ${
        danger ? 'text-rose-500 dark:text-rose-400' : ''
      }`}
    >
      {Icon && (
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={17} className={danger ? 'text-rose-500 dark:text-rose-400' : iconColor} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-rose-500 dark:text-rose-400' : 'text-slate-800 dark:text-gray-200'}`}>{label}</p>
        {sub && <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      <ChevronRight size={16} className="text-slate-300 dark:text-gray-600 flex-shrink-0" />
    </button>
  )
}

function GroupCard({ children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 overflow-hidden divide-y divide-slate-100 dark:divide-gray-800 mb-4">
      {children}
    </div>
  )
}

function SectionLabel({ label }) {
  return <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-2 mt-5 first:mt-0">{label}</p>
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
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100 transition-opacity"><X size={13} /></button>
    </motion.div>
  )
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.18 }}
        className="relative bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl"
      >
        <h3 className="text-slate-900 dark:text-white font-bold text-base mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
        <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-5">{body}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-800 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-5 py-2 text-sm font-semibold rounded-xl transition-colors ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Sub-section screens ───────────────────────────────────────────────────────

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

  return (
    <div className="space-y-4">
      {/* Avatar preview */}
      <div className="flex items-center gap-4 py-2 px-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}>
          {currentUser?.initials || '??'}
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-semibold text-sm">{currentUser?.name}</p>
          <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{currentUser?.dept} · {currentUser?.college}</p>
        </div>
      </div>

      <GroupCard>
        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="block text-slate-500 dark:text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Display Name</label>
            <input id="settings-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={INPUT_BASE} />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 text-sm">@</span>
              <input id="settings-username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className={`${INPUT_BASE} pl-8`} />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Email <span className="font-normal normal-case tracking-normal">(read only)</span></label>
            <input type="email" value={currentUser?.email ?? ''} readOnly className={`${INPUT_BASE} opacity-60 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-slate-500 dark:text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">Bio</label>
            <textarea id="settings-bio" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your campus about yourself…" className={`${INPUT_BASE} resize-none`} />
            <p className="text-slate-400 dark:text-gray-600 text-xs mt-1 text-right">{bio.length}/160</p>
          </div>
        </div>
      </GroupCard>

      <button id="settings-save" onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-2xl hover:bg-indigo-700 disabled:opacity-60 transition-colors">
        {saving
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
          : <><Save size={15} /> Save Changes</>
        }
      </button>

      {/* Read-only info */}
      <GroupCard>
        {[
          { label: 'Role',    value: currentUser?.role },
          { label: 'College', value: currentUser?.college || '—' },
          { label: 'Dept',    value: currentUser?.dept || '—' },
          ...(currentUser?.role === 'student'
            ? [{ label: 'Year', value: currentUser?.year || '—' }, { label: 'Student ID', value: currentUser?.studentId || '—' }]
            : currentUser?.role === 'faculty'
            ? [{ label: 'Designation', value: currentUser?.designation || '—' }, { label: 'Employee ID', value: currentUser?.employeeId || '—' }]
            : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-gray-800 last:border-0">
            <p className="text-slate-500 dark:text-gray-400 text-sm">{label}</p>
            <p className="text-slate-900 dark:text-white text-sm font-medium capitalize">{value}</p>
          </div>
        ))}
      </GroupCard>
    </div>
  )
}

function AppearanceSection({ dark, toggle }) {
  return (
    <GroupCard>
      {[
        { label: 'Light Mode', icon: Sun,  value: false },
        { label: 'Dark Mode',  icon: Moon, value: true  },
      ].map(({ label, icon: Icon, value }) => (
        <button key={label} onClick={() => { if (dark !== value) toggle() }}
          className={`w-full flex items-center justify-between gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-gray-800/50 transition-colors ${dark === value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-gray-300'}`}>
          <div className="flex items-center gap-3">
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
          </div>
          {dark === value && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
        </button>
      ))}
    </GroupCard>
  )
}

function NotificationsSection({ prefs, updatePreferences }) {
  const notifs = prefs?.notifications ?? {}
  const set = (key, val) => updatePreferences({ notifications: { [key]: val } })

  return (
    <GroupCard>
      {[
        { key: 'likes',    icon: Heart,         label: 'Likes',          sub: 'When someone likes your post' },
        { key: 'comments', icon: MessageCircle, label: 'Comments',       sub: 'When someone comments on your post' },
        { key: 'follows',  icon: UserPlus,      label: 'New Followers',  sub: 'When someone follows you' },
        { key: 'mentions', icon: AtSign,        label: 'Mentions',       sub: 'When you are mentioned' },
        { key: 'events',   icon: Calendar,      label: 'Campus Events',  sub: 'Announcements & events' },
      ].map(({ key, icon: Icon, label, sub }) => (
        <div key={key} className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-gray-800 last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-slate-500 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{label}</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs">{sub}</p>
            </div>
          </div>
          <Toggle id={`notif-${key}`} checked={!!notifs[key]} onChange={v => set(key, v)} />
        </div>
      ))}
    </GroupCard>
  )
}

function PrivacySection({ prefs, updatePreferences }) {
  const privacy = prefs?.privacy ?? {}
  const set = (key, val) => updatePreferences({ privacy: { [key]: val } })

  return (
    <GroupCard>
      <ToggleRow id="priv-private"  label="Private Account"      sub="Only followers can see your posts" checked={!!privacy.private}    onChange={v => set('private', v)} />
      <ToggleRow id="priv-email"    label="Show Email on Profile" sub="Visible to other users"           checked={!!privacy.showEmail}  onChange={v => set('showEmail', v)} />
      <ToggleRow id="priv-activity" label="Activity Status"       sub="Let others see when you're active" checked={!!privacy.activity}  onChange={v => set('activity', v)} />
      <ToggleRow id="priv-tagged"   label="Allow Tagging"         sub="Others can tag you in posts"      checked={!!privacy.tagged}     onChange={v => set('tagged', v)} />
    </GroupCard>
  )
}

function SecuritySection({ currentUser, changePassword, showToast, deactivateAccount, deleteAccount, logout }) {
  const navigate = useNavigate()
  const { updatePreferences } = useSwish()
  const prefs = currentUser?.preferences ?? {}
  const [showPwdForm,       setShowPwdForm]       = useState(false)
  const [curPwd,            setCurPwd]            = useState('')
  const [newPwd,            setNewPwd]            = useState('')
  const [confirmPwd,        setConfirmPwd]        = useState('')
  const [showCur,           setShowCur]           = useState(false)
  const [showNew,           setShowNew]           = useState(false)
  const [showConf,          setShowConf]          = useState(false)
  const [pwdLoading,        setPwdLoading]        = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmDelete,     setConfirmDelete]     = useState(false)

  const handleChangePwd = async (e) => {
    e.preventDefault()
    if (!curPwd) { showToast('Enter your current password.', 'error'); return }
    if (newPwd.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return }
    if (newPwd !== confirmPwd) { showToast('Passwords do not match.', 'error'); return }
    setPwdLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const result = changePassword(curPwd, newPwd)
    setPwdLoading(false)
    if (result.ok) {
      showToast('Password updated!')
      setCurPwd(''); setNewPwd(''); setConfirmPwd(''); setShowPwdForm(false)
    } else {
      showToast(result.error, 'error')
    }
  }

  const PwdField = ({ id, label, value, onChange, show, setShow }) => (
    <div>
      <label htmlFor={id} className="block text-slate-500 dark:text-gray-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} className={`${INPUT_BASE} pr-11`} placeholder="••••••••" />
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <GroupCard>
        <ToggleRow id="sec-2fa" label="Two-Factor Authentication" sub="Extra security layer (demo only)" checked={!!prefs?.security?.twoFactor} onChange={v => updatePreferences({ security: { twoFactor: v } })} />
      </GroupCard>

      <GroupCard>
        <div className="px-4 py-3.5">
          {!showPwdForm ? (
            <button id="sec-change-pwd" onClick={() => setShowPwdForm(true)}
              className="w-full flex items-center justify-between text-sm text-slate-800 dark:text-gray-200 font-medium">
              <span>Change Password</span>
              <ChevronRight size={16} className="text-slate-300 dark:text-gray-600" />
            </button>
          ) : (
            <form onSubmit={handleChangePwd} className="space-y-3">
              <PwdField id="cur-pwd"  label="Current Password" value={curPwd}     onChange={setCurPwd}     show={showCur}  setShow={setShowCur} />
              <PwdField id="new-pwd"  label="New Password"     value={newPwd}     onChange={setNewPwd}     show={showNew}  setShow={setShowNew} />
              <PwdField id="conf-pwd" label="Confirm Password" value={confirmPwd} onChange={setConfirmPwd} show={showConf} setShow={setShowConf} />
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={pwdLoading}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                  {pwdLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {pwdLoading ? 'Updating…' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setShowPwdForm(false); setCurPwd(''); setNewPwd(''); setConfirmPwd('') }}
                  className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-700 transition-colors">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </GroupCard>

      {/* Danger zone */}
      <div className="bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl overflow-hidden divide-y divide-rose-100 dark:divide-rose-900/40">
        <div className="px-4 py-3 bg-rose-50/50 dark:bg-rose-950/20">
          <p className="text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-widest">Danger Zone</p>
        </div>
        <button id="settings-deactivate" onClick={() => setConfirmDeactivate(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-rose-50 dark:active:bg-rose-950/20 transition-colors text-left">
          <div>
            <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">Deactivate Account</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">Temporarily disable your account</p>
          </div>
          <ChevronRight size={16} className="text-slate-300 dark:text-gray-600" />
        </button>
        <button id="settings-delete" onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 active:bg-rose-50 dark:active:bg-rose-950/20 transition-colors text-left">
          <div>
            <p className="text-rose-600 dark:text-rose-400 text-sm font-medium flex items-center gap-2"><Trash2 size={14} /> Delete Account Permanently</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">This cannot be undone</p>
          </div>
          <ChevronRight size={16} className="text-slate-300 dark:text-gray-600" />
        </button>
      </div>

      <AnimatePresence>
        {confirmDeactivate && (
          <ConfirmModal title="Deactivate Account" body="Your account will be deactivated. Data is preserved." confirmLabel="Deactivate"
            onConfirm={() => { setConfirmDeactivate(false); deactivateAccount(); navigate('/login') }}
            onCancel={() => setConfirmDeactivate(false)} danger />
        )}
        {confirmDelete && (
          <ConfirmModal title="Delete Account" body="This cannot be undone. All your data will be permanently removed." confirmLabel="Delete Forever"
            onConfirm={() => { setConfirmDelete(false); deleteAccount(); navigate('/login') }}
            onCancel={() => setConfirmDelete(false)} danger />
        )}
      </AnimatePresence>
    </div>
  )
}

function HelpSection({ showToast }) {
  const items = [
    { label: 'Help Center',          sub: 'Browse frequently asked questions' },
    { label: 'Contact Support',      sub: 'Get help from the Swish team' },
    { label: 'Report a Problem',     sub: 'Something not working? Let us know' },
    { label: 'Community Guidelines', sub: 'Learn about campus community rules' },
  ]
  return (
    <GroupCard>
      {items.map(({ label, sub }) => (
        <button key={label} onClick={() => showToast(`${label} coming soon.`)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-gray-800 last:border-0 active:bg-slate-50 dark:active:bg-gray-800/50 transition-colors">
          <div className="text-left">
            <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{label}</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{sub}</p>
          </div>
          <ChevronRight size={15} className="text-slate-300 dark:text-gray-600 flex-shrink-0" />
        </button>
      ))}
    </GroupCard>
  )
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>S</span>
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-bold text-base" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Swish</p>
          <p className="text-slate-400 dark:text-gray-500 text-xs">Version 1.0.0 · Beta</p>
        </div>
      </div>
      <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed px-1">
        Swish is a private, verified campus social network — built exclusively for students and faculty of registered institutions.
      </p>
      <GroupCard>
        {[
          { label: 'Platform',   value: 'Swish Campus Network' },
          { label: 'Version',    value: '1.0.0-beta' },
          { label: 'Built with', value: 'React + Vite' },
          { label: 'License',    value: 'Private — Campus Use Only' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-gray-800 last:border-0">
            <p className="text-slate-500 dark:text-gray-400 text-sm">{label}</p>
            <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{value}</p>
          </div>
        ))}
      </GroupCard>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { currentUser, updateUser, updatePreferences, changePassword, deactivateAccount, deleteAccount, logout } = useSwish()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState(null) // null = main menu
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), 3500)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const sectionProps = { account: { currentUser, updateUser, showToast }, appearance: { dark, toggle }, notifications: { prefs: currentUser?.preferences, updatePreferences }, privacy: { prefs: currentUser?.preferences, updatePreferences }, security: { currentUser, changePassword, showToast, deactivateAccount, deleteAccount, logout }, help: { showToast }, about: {} }

  const SectionComponent = { account: AccountSection, appearance: AppearanceSection, notifications: NotificationsSection, privacy: PrivacySection, security: SecuritySection, help: HelpSection, about: AboutSection }

  const sectionLabel = MENU.find(m => m.id === activeSection)?.label

  const slideVariants = {
    enterFromRight: { x: '100%', opacity: 0 },
    center:         { x: 0, opacity: 1 },
    exitToLeft:     { x: '-30%', opacity: 0 },
    enterFromLeft:  { x: '-30%', opacity: 0 },
    exitToRight:    { x: '100%', opacity: 0 },
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {!activeSection ? (
            /* ── Main menu list ── */
            <motion.div
              key="main"
              initial="enterFromLeft"
              animate="center"
              exit="exitToLeft"
              variants={slideVariants}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0, 0.67, 0] }}
              className="px-4 pt-5 pb-8"
            >
              {/* Header */}
              <div className="mb-5 px-1">
                <h1 className="text-slate-900 dark:text-white font-bold text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h1>
              </div>

              {/* Menu groups */}
              <SectionLabel label="Account" />
              <GroupCard>
                <MenuRow label="Account" sub="Edit profile, username, bio" icon={User} onClick={() => setActiveSection('account')} />
                <MenuRow label="Security" sub="Password & 2FA" icon={Shield} onClick={() => setActiveSection('security')} />
              </GroupCard>

              <SectionLabel label="Preferences" />
              <GroupCard>
                <MenuRow label="Appearance" sub={dark ? 'Dark mode' : 'Light mode'} icon={Palette} onClick={() => setActiveSection('appearance')} />
                <MenuRow label="Notifications" sub="Likes, comments, follows" icon={Bell} onClick={() => setActiveSection('notifications')} />
                <MenuRow label="Privacy" sub="Account visibility & activity" icon={Globe} onClick={() => setActiveSection('privacy')} />
              </GroupCard>

              <SectionLabel label="More" />
              <GroupCard>
                <MenuRow label="Help & Support" sub="FAQs and contact" icon={HelpCircle} onClick={() => setActiveSection('help')} />
                <MenuRow label="About Swish" sub="Version & info" icon={Info} onClick={() => setActiveSection('about')} />
              </GroupCard>

              {/* Logout */}
              <div className="mt-2">
                <button id="settings-logout" onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl text-rose-500 dark:text-rose-400 text-sm font-semibold active:bg-rose-50 dark:active:bg-rose-950/30 transition-colors">
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Sub-section screen ── */
            <motion.div
              key={activeSection}
              initial="enterFromRight"
              animate="center"
              exit="exitToRight"
              variants={slideVariants}
              transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0, 0.67, 0] }}
              className="px-4 pt-4 pb-8"
            >
              {/* Back header */}
              <button
                onClick={() => setActiveSection(null)}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-4 -ml-1 active:opacity-70 transition-opacity"
              >
                <ChevronLeft size={20} />
                {sectionLabel}
              </button>

              {(() => {
                const Comp = SectionComponent[activeSection]
                const props = sectionProps[activeSection] || {}
                return <Comp {...props} />
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
