import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, FileText, Flag, Activity, Search,
  CheckCircle, XCircle, Trash2, Shield,
  Building2, Globe, MapPin, Plus, ToggleLeft, ToggleRight,
  GraduationCap, Briefcase,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-slate-400 dark:text-gray-500 text-xs font-medium">{label}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-2xl">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  )
}

// ── Add College Form ──────────────────────────────────────────────────────────
function AddCollegeForm({ onAdd, onCancel }) {
  const [f, setF] = useState({ name: '', code: '', domain: '', location: '' })
  const [errs, setErrs] = useState({})

  const set = (k) => (e) => { setF(p => ({ ...p, [k]: e.target.value })); setErrs(p => ({ ...p, [k]: '' })) }

  const INPUT = 'w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all'

  const handleSubmit = (e) => {
    e.preventDefault()
    const v = {}
    if (!f.name.trim())     v.name     = 'Required'
    if (!f.code.trim())     v.code     = 'Required'
    if (!f.domain.trim())   v.domain   = 'Required'
    if (!f.location.trim()) v.location = 'Required'
    if (Object.keys(v).length) { setErrs(v); return }
    onAdd(f)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-4"
    >
      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-semibold text-sm mb-4">
        Add New College
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <input id="col-name" placeholder="College Name" value={f.name} onChange={set('name')} className={INPUT} />
          {errs.name && <p className="text-rose-500 text-xs mt-0.5">{errs.name}</p>}
        </div>
        <div>
          <input id="col-code" placeholder="Code (e.g. KJSCE)" value={f.code} onChange={set('code')} className={INPUT} />
          {errs.code && <p className="text-rose-500 text-xs mt-0.5">{errs.code}</p>}
        </div>
        <div>
          <input id="col-domain" placeholder="Email domain (e.g. kjsce.edu)" value={f.domain} onChange={set('domain')} className={INPUT} />
          {errs.domain && <p className="text-rose-500 text-xs mt-0.5">{errs.domain}</p>}
        </div>
        <div>
          <input id="col-location" placeholder="Location (e.g. Mumbai)" value={f.location} onChange={set('location')} className={INPUT} />
          {errs.location && <p className="text-rose-500 text-xs mt-0.5">{errs.location}</p>}
        </div>
        <div className="col-span-2 flex gap-3 justify-end pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-500 dark:text-gray-400 text-sm font-medium hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            Add College
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab,        setActiveTab]        = useState('Overview')
  const [userQuery,        setUserQuery]        = useState('')
  const [showAddCollege,   setShowAddCollege]   = useState(false)
  const [reportFilter,     setReportFilter]     = useState('all')
  const [postQuery,        setPostQuery]        = useState('')

  const { 
    currentUser: user, users, toggleUserStatus,
    colleges, addCollege, toggleCollege, 
    posts, hidePost, showPost, deletePost,
    reports, updateReportStatus
  } = useSwish()

  const navigate = useNavigate()

  const tabs = user?.role === 'admin' 
    ? ['Overview', 'Users', 'Colleges', 'Reports', 'Posts']
    : ['Overview', 'Users', 'Reports', 'Posts']

  // ── Live computed stats (friend's logic) ───────────────────────────────────
  const totalStudents  = users.filter(u => u.role === 'student').length
  const totalFaculty   = users.filter(u => u.role === 'faculty').length
  const totalUsers     = users.length
  const totalPosts     = posts.length
  const openReports    = reports.filter(r => r.status === 'pending' || !r.status).length
  const liveUsers      = Math.max(1, Math.round(totalUsers * 0.6))

  // ── Users tab helpers ──────────────────────────────────────────────────────
  const filteredUsers = users
    .filter(u => u.role !== 'admin') // don't show admin in user list
    .filter(u =>
      u.name.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userQuery.toLowerCase()) ||
      (u.dept || '').toLowerCase().includes(userQuery.toLowerCase())
    )

  const filteredReports = reports.filter(r => reportFilter === 'all' || (r.status || 'pending') === reportFilter)

  const filteredPosts = posts.filter(p =>
    (p.caption || '').toLowerCase().includes(postQuery.toLowerCase()) ||
    (p.userName || '').toLowerCase().includes(postQuery.toLowerCase()) ||
    (p.tags || []).some(t => t.toLowerCase().includes(postQuery.toLowerCase()))
  )

  const handleAddCollege = (data) => {
    addCollege(data)
    setShowAddCollege(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-xl">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 dark:text-gray-500 text-xs">Logged in as {user?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'Overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats grid — 3-column on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Users}         label="Total Users"     value={totalUsers}    color="bg-indigo-500" />
            <StatCard icon={FileText}      label="Total Posts"     value={totalPosts}    color="bg-violet-500" />
            <StatCard icon={Flag}          label="Open Reports"    value={openReports}   color="bg-rose-500" />
            <StatCard icon={Activity}      label="Live Users"      value={liveUsers}     color="bg-emerald-500" />
            <StatCard icon={GraduationCap} label="Total Students"  value={totalStudents} color="bg-sky-500" />
            <StatCard icon={Briefcase}     label="Total Faculty"   value={totalFaculty}  color="bg-amber-500" />
          </div>

          {/* Colleges quick view (Admin Only) */}
          {user?.role === 'admin' && (
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Registered Colleges</h2>
                <button onClick={() => setActiveTab('Colleges')} className="text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:text-indigo-700 transition-colors">
                  Manage →
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-2xl">{colleges.length}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">Total colleges</p>
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-emerald-600 dark:text-emerald-400 font-bold text-2xl">{colleges.filter(c => c.active).length}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">Active</p>
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-rose-500 dark:text-rose-400 font-bold text-2xl">{colleges.filter(c => !c.active).length}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">Disabled</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent reports preview */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Recent Reports</h2>
              <button onClick={() => setActiveTab('Reports')} className="text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:text-indigo-700 transition-colors">
                View all →
              </button>
            </div>
            {reports.slice(0, 2).map(r => (
              <div key={r.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{r.reason}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">by {r.reportedBy} · {r.time}</p>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
            {reports.length === 0 && (
              <p className="text-slate-400 dark:text-gray-500 text-sm text-center py-4">No open reports 🎉</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Users ── */}
      {activeTab === 'Users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search users by name, email or department…"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-slate-50 dark:bg-gray-800/60 border-b border-slate-100 dark:border-gray-800">
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">User</p>
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">Status</p>
              <p className="text-slate-500 dark:text-gray-500 text-xs font-semibold uppercase tracking-wide">Action</p>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 dark:text-gray-500 text-sm">No users found.</p>
              </div>
            ) : filteredUsers.map(u => {
              const status = u.suspended ? 'suspended' : 'active'
              return (
                <div key={u.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 items-start sm:items-center px-5 py-4 sm:py-3.5 border-b border-slate-50 dark:border-gray-800/60 last:border-0">
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <div
                      className="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                    >
                      {u.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 dark:text-gray-200 text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs truncate">
                        {u.dept} · {u.role === 'faculty' ? u.designation || 'Faculty' : u.year || u.role}
                        {u.college ? ` · ${u.college}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-1 sm:mt-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      status === 'suspended'
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        status === 'suspended'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                      }`}
                    >
                      {status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Colleges ── (friend's college management logic, your UI design) */}
      {activeTab === 'Colleges' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 dark:text-gray-400 text-sm">
              {colleges.length} college{colleges.length !== 1 ? 's' : ''} registered ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {colleges.filter(c => c.active).length} active
              </span>
            </p>
            <button
              onClick={() => setShowAddCollege(s => !s)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} />
              Add College
            </button>
          </div>

          {/* Add College Form */}
          <AnimatePresence>
            {showAddCollege && (
              <AddCollegeForm
                onAdd={handleAddCollege}
                onCancel={() => setShowAddCollege(false)}
              />
            )}
          </AnimatePresence>

          {/* College list */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            {colleges.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={28} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">No colleges added yet.</p>
                <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Add a college to allow its domain for registration.</p>
              </div>
            ) : colleges.map((c, i) => {
              const collegeUsers = users.filter(u => u.college === c.name).length
              return (
                <div
                  key={c.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 ${
                    i < colleges.length - 1 ? 'border-b border-slate-50 dark:border-gray-800/60' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    c.active
                      ? 'bg-indigo-100 dark:bg-indigo-950/60'
                      : 'bg-slate-100 dark:bg-gray-800'
                  }`}>
                    <Building2 size={18} className={c.active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{c.name}</p>
                      <span className="text-slate-400 dark:text-gray-600 text-xs font-mono">({c.code})</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs">
                        <Globe size={11} /> {c.domain}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs">
                        <MapPin size={11} /> {c.location}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs">
                        <Users size={11} /> {collegeUsers} user{collegeUsers !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Status + toggle */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${
                      c.active
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                        : 'text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'
                    }`}>
                      {c.active ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => toggleCollege(c.id)}
                      title={c.active ? 'Disable this college' : 'Enable this college'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        c.active
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                      }`}
                    >
                      {c.active
                        ? <><ToggleLeft size={13} /> Disable</>
                        : <><ToggleRight size={13} /> Enable</>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Domain approval note */}
          <p className="text-slate-400 dark:text-gray-600 text-xs leading-relaxed px-1">
            💡 <strong>Domain approval:</strong> When a college is <span className="text-emerald-600 dark:text-emerald-400">Active</span>, its email domain is accepted for new registrations. Disabling a college immediately blocks that domain from new signups.
          </p>
        </motion.div>
      )}

      {/* ── Reports ── */}
      {activeTab === 'Reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map(f => (
              <button
                key={f}
                onClick={() => setReportFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-all ${
                  reportFilter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <p className="text-slate-500 dark:text-gray-400 text-sm">{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}</p>
          {filteredReports.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
              <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-gray-400 font-semibold text-sm">All clear!</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">No reports matching this filter.</p>
            </div>
          ) : (
            filteredReports.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Flag size={14} className="text-rose-500" />
                      <p className="text-slate-900 dark:text-white font-semibold text-sm">{r.reason}</p>
                    </div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs">Reported by {r.reportedBy} · {r.time}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 capitalize ${
                    (r.status || 'pending') === 'pending' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                    (r.status || 'pending') === 'resolved' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                    'text-slate-600 bg-slate-50 border-slate-200'
                  }`}>
                    {r.status || 'pending'}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 mb-4 border border-slate-100 dark:border-gray-700">
                  <p className="text-slate-500 dark:text-gray-400 text-xs font-medium mb-1">Post caption:</p>
                  <p className="text-slate-700 dark:text-gray-300 text-sm italic">"{r.postCaption}"</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(r.status || 'pending') === 'pending' && (
                    <button onClick={() => updateReportStatus(r.id, 'reviewed')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-all">Mark Reviewed</button>
                  )}
                  {(r.status || 'pending') !== 'resolved' && (
                    <button onClick={() => updateReportStatus(r.id, 'resolved')} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-all">Resolve</button>
                  )}
                  {(r.status || 'pending') !== 'dismissed' && (
                    <button onClick={() => updateReportStatus(r.id, 'dismissed')} className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all">Dismiss</button>
                  )}
                  {((r.status || 'pending') === 'resolved' || (r.status || 'pending') === 'dismissed') && (
                    <button onClick={() => updateReportStatus(r.id, 'pending')} className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-all">Reopen</button>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* ── Posts ── */}
      {activeTab === 'Posts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search posts by content, author, or tags…"
              value={postQuery}
              onChange={e => setPostQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
            />
          </div>

          <p className="text-slate-500 dark:text-gray-400 text-sm">{filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} found</p>

          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
                <FileText size={28} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">No posts found.</p>
              </div>
            ) : filteredPosts.map(p => (
              <div key={p.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 ${p.hidden ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-gray-800'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.userAvatarColor || '#6366f1' }}>
                      {p.userInitials}
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white font-semibold text-sm">{p.userName}</p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs">{p.createdAt} {p.hidden && '· HIDDEN'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.hidden ? (
                      <button onClick={() => showPost(p.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-all">Show</button>
                    ) : (
                      <button onClick={() => hidePost(p.id)} className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-all">Hide</button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'faculty') && (
                      <button onClick={() => { if(window.confirm('Delete this post permanently?')) deletePost(p.id) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-all">
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-700 dark:text-gray-300 text-sm mb-3 whitespace-pre-wrap">{p.caption}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.tags?.map(t => (
                    <span key={t} className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span>{p.likes} Likes</span>
                  <span>{p.comments?.length || 0} Comments</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
