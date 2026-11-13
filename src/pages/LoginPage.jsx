import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Eye, EyeOff, AlertCircle, ArrowLeft,
  Mail, Lock, ShieldCheck, CheckCircle, RefreshCw,
  Building2, GraduationCap,
} from 'lucide-react'
import { useSwish } from '../context/SwishContext'
import { apiVerifyOtp, apiResendOtp, redirectPathForRole } from '../utils/auth'

export default function LoginPage() {
  const { login, onVerified } = useSwish()
  const navigate = useNavigate()
  const location = useLocation()

  const fromLocation = location.state?.from
  const targetDestination = fromLocation?.pathname
    ? (fromLocation.pathname + (fromLocation.search || '') + (fromLocation.hash || ''))
    : null

  const getDestination = (role, defaultRedirect) => {
    if (role === 'college_admin' || role === 'admin' || role === 'main_admin') {
      return defaultRedirect || redirectPathForRole(role)
    }
    return targetDestination || defaultRedirect || redirectPathForRole(role)
  }

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [successBanner, setSuccessBanner] = useState(
    location.state?.passwordResetSuccess
      ? 'Password updated successfully. Please sign in with your new password.'
      : ''
  )

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
      navigate(getDestination(result.role, result.redirectTo), { replace: true })
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
      navigate(getDestination(result.user?.role, result.redirectTo), { replace: true })
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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-base-25 dark:bg-base-950 text-base-900 dark:text-white transition-colors duration-200">
      
      {/* ── Top Header Navigation ─────────────────────────────────────── */}
      <header className="w-full border-b border-base-200/80 dark:border-base-800/80 bg-white/70 dark:bg-base-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-base-600 dark:text-base-400 hover:text-base-900 dark:hover:text-white text-xs sm:text-sm font-medium transition-colors group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Swish</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-500 flex items-center justify-center shadow-xs">
              <Zap size={13} className="text-white fill-white" />
            </div>
            <span
              className="font-bold text-base tracking-tight text-base-900 dark:text-white"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Swish
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-wider text-base-400 dark:text-base-500 border-l border-base-200 dark:border-base-800 pl-2 ml-1">
              Campus Gateway
            </span>
          </div>

          <Link
            to="/college-onboarding"
            className="text-xs font-medium text-base-500 dark:text-base-400 hover:text-accent-500 dark:hover:text-accent-400 transition-colors"
          >
            Register College
          </Link>
        </div>
      </header>

      {/* ── Main Gateway Container ────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px]">
          
          <AnimatePresence mode="wait">
            {/* ═══════════ OTP VERIFICATION VIEW ════════════════════════════ */}
            {otpStep ? (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white dark:bg-base-900 border border-base-200 dark:border-base-800 rounded-2xl p-6 sm:p-8 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => { setOtpStep(false); setOtp(''); setOtpError('') }}
                  className="inline-flex items-center gap-1.5 text-base-500 hover:text-base-800 dark:hover:text-base-200 text-xs font-medium mb-6 transition-colors group"
                >
                  <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                  Back to sign in
                </button>

                <div className="mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/70 border border-accent-100 dark:border-accent-900 flex items-center justify-center mb-3.5 text-accent-500 dark:text-accent-400">
                    <ShieldCheck size={20} />
                  </div>
                  <h1
                    className="text-xl font-bold tracking-tight text-base-900 dark:text-white"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Confirm Campus Email
                  </h1>
                  <p className="text-base-500 dark:text-base-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    A 6-digit verification code was sent to{' '}
                    <span className="font-semibold text-base-800 dark:text-base-200 font-mono text-xs">{pendingEmail}</span>.
                    Enter it below to confirm your institutional account.
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl px-3.5 py-2.5 mb-5 text-xs text-rose-600 dark:text-rose-400"
                  >
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </motion.div>
                )}

                <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="login-otp-code"
                      className="block text-xs font-medium text-base-700 dark:text-base-300 mb-1.5"
                    >
                      6-Digit Security Code
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
                      className="w-full bg-base-50 dark:bg-base-850 border border-base-200 dark:border-base-750 text-base-900 dark:text-white rounded-xl px-4 py-3.5 text-2xl font-mono font-bold tracking-[0.45em] text-center focus:outline-hidden focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
                      autoFocus
                    />
                  </div>

                  <button
                    id="login-otp-submit"
                    type="submit"
                    disabled={otpLoading || otp.length < 6}
                    className="w-full py-2.5 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {otpLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying code…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-base-100 dark:border-base-800 text-center">
                  <p className="text-xs text-base-500 dark:text-base-400">
                    Didn't receive the email?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="inline-flex items-center gap-1 font-semibold text-accent-500 dark:text-accent-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline cursor-pointer"
                    >
                      {resendCooldown > 0 ? (
                        <>Resend in {resendCooldown}s</>
                      ) : (
                        <><RefreshCw size={11} /> Resend verification code</>
                      )}
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (

            /* ═══════════ FOCUSED GATEWAY LOGIN FORM ═══════════════════════════ */
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white dark:bg-base-900 border border-base-200 dark:border-base-800 rounded-2xl p-6 sm:p-8 shadow-xs"
            >
              {/* Header metadata */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 text-base-600 dark:text-base-400 text-[11px] font-mono uppercase tracking-wider mb-3">
                  <ShieldCheck size={12} className="text-accent-500" />
                  <span>Verified Campus Access</span>
                </div>

                <h1
                  className="text-2xl font-bold tracking-tight text-base-900 dark:text-white"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Sign in to Swish
                </h1>
                <p className="text-base-500 dark:text-base-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  Enter your campus credentials to access your college community.
                </p>
              </div>

              {/* Shared post notice */}
              {targetDestination?.startsWith('/post/') && (
                <div className="flex items-start gap-2.5 bg-accent-50/70 dark:bg-accent-950/40 border border-accent-200/80 dark:border-accent-900/60 rounded-xl p-3 mb-5 text-xs text-accent-700 dark:text-accent-300">
                  <ShieldCheck size={15} className="text-accent-500 flex-shrink-0 mt-0.5" />
                  <span>This post is restricted to members of this campus. Please sign in to view it.</span>
                </div>
              )}

              {/* Success notice */}
              {successBanner && (
                <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3 mb-5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{successBanner}</span>
                </div>
              )}

              {/* Error notice */}
              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 mb-5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Campus Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-base-700 dark:text-base-300 mb-1.5"
                  >
                    Campus Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none"
                    />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="student@college.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full bg-base-50 dark:bg-base-850 border border-base-200 dark:border-base-750 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-hidden focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-base-400 dark:text-base-500 mt-1">
                    Use your official college or university-issued email.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-medium text-base-700 dark:text-base-300"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-accent-500 dark:text-accent-400 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none"
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full bg-base-50 dark:bg-base-850 border border-base-200 dark:border-base-750 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-hidden focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-700 dark:hover:text-base-200 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-base-300 dark:border-base-700 accent-accent-500 cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-xs text-base-600 dark:text-base-400 cursor-pointer select-none"
                  >
                    Remember this device for 30 days
                  </label>
                </div>

                {/* Submit button */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <span>Sign In to Campus</span>
                  )}
                </button>
              </form>

              {/* Authentic Platform Context (Linear/Arc style restrained architectural strip) */}
              <div className="mt-6 pt-5 border-t border-base-100 dark:border-base-800">
                <div className="grid grid-cols-2 gap-2 text-[11px] text-base-500 dark:text-base-400">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-accent-500 flex-shrink-0" />
                    <span className="truncate">Campus-only isolation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-accent-500 flex-shrink-0" />
                    <span className="truncate">Official college notices</span>
                  </div>
                </div>
              </div>

              {/* Secondary links */}
              <div className="mt-5 pt-4 border-t border-base-100 dark:border-base-800 text-center space-y-2">
                <p className="text-xs text-base-500 dark:text-base-400">
                  New to Swish?{' '}
                  <Link
                    to="/join"
                    state={fromLocation ? { from: fromLocation } : undefined}
                    className="font-semibold text-accent-500 dark:text-accent-400 hover:underline"
                  >
                    Create campus account →
                  </Link>
                </p>
                <p className="text-[11px] text-base-400 dark:text-base-500">
                  College administrator or student council?{' '}
                  <Link
                    to="/college-onboarding"
                    className="hover:text-base-700 dark:hover:text-base-300 underline"
                  >
                    Register your institution
                  </Link>
                </p>
              </div>

            </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* ── Minimalist Institutional System Footer ──────────────────────── */}
      <footer className="w-full border-t border-base-200/80 dark:border-base-800/80 py-4 text-center text-[11px] text-base-400 dark:text-base-500 font-mono">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Swish Campus Systems · Institutional Domain Security</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/college-onboarding" className="hover:underline">College Registration</Link>
            <Link to="/join" className="hover:underline">Join Campus</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
