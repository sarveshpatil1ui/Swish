import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Eye, EyeOff, AlertCircle, ArrowLeft,
  Mail, Lock, Heart, Users, Shield, Trophy, CheckCircle, RefreshCw,
} from 'lucide-react'
import { useSwish } from '../context/SwishContext'
import { apiVerifyOtp, apiResendOtp } from '../utils/auth'

// ── Tiny animated activity chip for the left panel ───────────────────────────
function ActivityChip({ delay, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function LoginPage() {
  const { login, onVerified } = useSwish()
  const navigate = useNavigate()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // ── OTP step (shown when login returns pendingVerification) ────────────
  const [otpStep,        setOtpStep]        = useState(false)
  const [pendingEmail,   setPendingEmail]   = useState('')
  const [otp,            setOtp]            = useState('')
  const [otpError,       setOtpError]       = useState('')
  const [otpLoading,     setOtpLoading]     = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your campus email and password.')
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.ok) {
      navigate(result.redirectTo)
    } else if (result.pendingVerification) {
      // Account exists but email not verified — show OTP step
      setPendingEmail(result.email || email.trim().toLowerCase())
      setOtpStep(true)
      startResendCooldown()
    } else {
      setError(result.error)
    }
  }

  // ── Resend cooldown ───────────────────────────────────────────────────
  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(cooldownRef.current), [])

  // ── OTP submit ──────────────────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setOtpError('')
    if (otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim())) {
      setOtpError('Please enter the 6-digit code from your email.')
      return
    }
    setOtpLoading(true)
    const result = await apiVerifyOtp(pendingEmail, otp.trim())
    setOtpLoading(false)
    if (result.ok) {
      onVerified(result.user)
      navigate(result.redirectTo)
    } else {
      setOtpError(result.error || 'Invalid or expired code.')
      if (result.expired) startResendCooldown(0)
    }
  }

  // ── OTP resend ──────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setOtpError('')
    const result = await apiResendOtp(pendingEmail)
    if (result.ok) startResendCooldown()
    else setOtpError(result.error || 'Failed to resend code.')
  }

  const fillDemo = (role = 'student') => {
    if (role === 'admin') {
      setEmail('admin@swish.com')
      setPassword('SwishAdmin@2026')
    } else if (role === 'faculty') {
      setEmail('faculty@campus.edu')
      setPassword('faculty123')
    } else if (role === 'college_admin') {
      setEmail('collegeadmin@campus.edu')
      setPassword('college123')
    } else {
      setEmail('student@campus.edu')
      setPassword('student123')
    }
    setError('')
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors duration-300">

      {/* ── LEFT — branding panel (desktop only) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[54%] relative overflow-hidden flex-col flex-shrink-0">

        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />

        {/* Soft radial highlights */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 10% 90%, rgba(139,92,246,0.35) 0%, transparent 65%),' +
              'radial-gradient(ellipse 50% 40% at 90% 10%, rgba(129,140,248,0.25) 0%, transparent 65%)',
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-10 xl:px-14 py-10">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-2xl text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Swish
            </span>
          </motion.div>

          {/* Hero copy */}
          <div className="flex-1 flex flex-col justify-center py-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3.5 py-1.5 text-white/90 text-[11px] font-semibold uppercase tracking-wider mb-6">
                <Shield size={11} className="flex-shrink-0" />
                Verified Campus Network
              </span>

              <h2
                className="font-extrabold text-4xl xl:text-[44px] leading-[1.08] tracking-tight text-white mb-5"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Your campus.<br />Your community.<br />
                <span className="text-indigo-200">Your Swish.</span>
              </h2>

              <p className="text-white/60 text-base leading-relaxed max-w-[280px]">
                A private social space built exclusively for verified campus members. No outsiders. Just your campus.
              </p>
            </motion.div>

            {/* Activity feed preview */}
            <div className="mt-10 space-y-3 max-w-[300px]">
              <ActivityChip delay={0.3}>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-violet-400/80 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">PP</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold leading-tight truncate">Campus Fest 2026 🎉</p>
                    <p className="text-white/50 text-xs mt-0.5">Priya Patel · CSE 2nd Year</p>
                  </div>
                  <span className="flex items-center gap-1 text-white/60 text-xs flex-shrink-0">
                    <Heart size={12} className="fill-rose-400 text-rose-400" /> 214
                  </span>
                </div>
              </ActivityChip>

              <ActivityChip delay={0.42}>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/25 border border-emerald-400/35 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">Aarav started following you</p>
                    <p className="text-white/40 text-xs mt-0.5">Just now · IT Club</p>
                  </div>
                </div>
              </ActivityChip>

              <ActivityChip delay={0.54}>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-400/25 border border-amber-400/35 flex items-center justify-center flex-shrink-0">
                    <Trophy size={14} className="text-amber-300" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">Hackathon 2026 — 1st Place 🏆</p>
                    <p className="text-white/40 text-xs mt-0.5">Rahul Sharma · 2h ago</p>
                  </div>
                </div>
              </ActivityChip>
            </div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="flex items-center gap-8 pt-6 border-t border-white/15"
          >
            {[['2,400+', 'Students'], ['15+', 'Departments'], ['100%', 'Verified']].map(([val, label]) => (
              <div key={label}>
                <p
                  className="text-white font-bold text-lg"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {val}
                </p>
                <p className="text-white/45 text-xs">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT — form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-gray-950 overflow-y-auto">
        <AnimatePresence mode="wait">

        {/* ═══════════ OTP VERIFICATION STEP ════════════════════════════════ */}
        {otpStep ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtp(''); setOtpError('') }}
              className="inline-flex items-center gap-1.5 text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400 text-sm mb-8 transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to login
            </button>

            <div className="flex lg:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <span className="font-extrabold text-xl text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Swish</span>
            </div>

            <div className="mb-7">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mb-4">
                <Mail size={22} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <h1 className="text-slate-900 dark:text-white font-bold text-[26px] mb-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Verify your email
              </h1>
              <p className="text-slate-500 dark:text-gray-500 text-sm leading-relaxed">
                Your account needs email verification. We sent a 6-digit code to{' '}
                <span className="font-semibold text-slate-700 dark:text-gray-300">{pendingEmail}</span>.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {otpError && (
                <motion.div
                  key="otp-err"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-4"
                >
                  <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{otpError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-otp-code" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                  Verification Code
                </label>
                <input
                  id="login-otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                  className={`w-full bg-slate-50 dark:bg-gray-900 border ${otpError ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-gray-700 rounded-xl px-4 py-4 text-3xl font-mono font-bold tracking-[0.5em] text-center focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                  autoFocus
                />
              </div>
              <button
                id="login-otp-submit"
                type="submit"
                disabled={otpLoading || otp.length < 6}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</>
                ) : (
                  <><CheckCircle size={16} />Verify & Sign In</>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-slate-500 dark:text-gray-500 text-sm">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {resendCooldown > 0 ? <><RefreshCw size={12} />Resend in {resendCooldown}s</> : <><RefreshCw size={12} />Resend code</>}
                </button>
              </p>
            </div>
          </motion.div>

        ) : (

        /* ═══════════ LOGIN FORM ══════════════════════════════════════════ */
        <motion.div
          key="login-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400 text-sm mb-8 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Swish
          </Link>

          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Zap size={15} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-xl text-slate-900 dark:text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Swish
            </span>
          </div>

          {/* Page heading */}
          <div className="mb-7">
            <h1
              className="text-slate-900 dark:text-white font-bold text-[26px] mb-1.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Welcome back
            </h1>
            <p className="text-slate-500 dark:text-gray-500 text-sm">
              Sign in to your campus account to continue
            </p>
          </div>

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-5"
              >
                <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Campus email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5"
              >
                Campus Email
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  placeholder="student@campus.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-slate-700 dark:text-gray-300 text-sm font-medium"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-gray-700 accent-indigo-600 cursor-pointer flex-shrink-0"
              />
              <label
                htmlFor="remember-me"
                className="text-slate-600 dark:text-gray-400 text-sm cursor-pointer select-none"
              >
                Remember me for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in to Swish'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100 dark:bg-gray-800" />
            <span className="text-slate-400 dark:text-gray-600 text-xs font-medium px-1">Quick demo access</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-gray-800" />
          </div>

          {/* Demo credentials — 4 roles */}
          <div className="grid grid-cols-4 gap-2 mb-7">
            <button
              type="button"
              onClick={() => fillDemo('student')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 rounded-xl text-xs font-semibold hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>DS</div>
              Student
            </button>
            <button
              type="button"
              onClick={() => fillDemo('faculty')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 rounded-xl text-xs font-semibold hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>DF</div>
              Faculty
            </button>
            <button
              type="button"
              onClick={() => fillDemo('college_admin')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 rounded-xl text-xs font-semibold hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>DA</div>
              College Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="flex flex-col items-center justify-center gap-1 py-2.5 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 rounded-xl text-xs font-semibold hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>AU</div>
              Admin
            </button>
          </div>

          {/* Join link */}
          <p className="text-center text-slate-500 dark:text-gray-500 text-sm">
            New to Swish?{' '}
            <Link
              to="/join"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Create your campus account →
            </Link>
          </p>
        </motion.div>

        )} {/* end ternary — otpStep ? ... : loginForm */}
        </AnimatePresence>
      </div>
    </div>
  )
}
