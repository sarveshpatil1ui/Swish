import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  AlertCircle, CheckCircle, Shield, RefreshCw, KeyRound, Check
} from 'lucide-react'
import { apiForgotPassword, apiVerifyResetOtp, apiResetPassword } from '../utils/auth'
import TurnstileWidget from '../components/common/TurnstileWidget'

// ── Password strength helpers (matching JoinPage) ─────────────────────────────
const getStrength = (pass) => {
  if (!pass) return 0
  let score = 0
  if (pass.length >= 8) score++
  if (/[A-Z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  if (/[^a-zA-Z0-9]/.test(pass)) score++
  return score // 0–4
}

const STRENGTH_META = [
  { label: '', bar: '', text: 'text-slate-400 dark:text-gray-600' },
  { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-500' },
  { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-500' },
  { label: 'Good', bar: 'bg-yellow-400', text: 'text-yellow-500' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-500' },
]

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // ── Step control: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success ────────
  const [step, setStep] = useState(1)

  // Step 1: Email
  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  // Step 2: 6-box OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [expiryCountdown, setExpiryCountdown] = useState(600) // 10 minutes in seconds
  const cooldownRef = useRef(null)
  const expiryRef = useRef(null)
  const otpInputRefs = useRef([])

  // Step 3: Password reset
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(cooldownRef.current)
      clearInterval(expiryRef.current)
    }
  }, [])

  // Start resend cooldown timer
  const startResendTimer = (seconds = 60) => {
    setResendCooldown(seconds)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Start expiry countdown timer (10 mins)
  const startExpiryTimer = (seconds = 600) => {
    setExpiryCountdown(seconds)
    clearInterval(expiryRef.current)
    expiryRef.current = setInterval(() => {
      setExpiryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(expiryRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Format expiry countdown as mm:ss
  const formatCountdown = (secs) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  // ── Step 1 Submit: Request reset code ──────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setEmailError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setEmailError('Please enter a valid campus email address.')
      return
    }

    setEmailLoading(true)
    const res = await apiForgotPassword(trimmed, turnstileToken)
    setEmailLoading(false)

    if (res.ok) {
      setStep(2)
      startResendTimer(60)
      startExpiryTimer(600)
      setOtpDigits(['', '', '', '', '', ''])
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 100)
    } else {
      setEmailError(res.error || 'Failed to send reset code. Please try again.')
    }
  }

  // ── Step 2 OTP: Box interactions ──────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, '')
    setOtpError('')

    if (!clean) {
      const updated = [...otpDigits]
      updated[index] = ''
      setOtpDigits(updated)
      return
    }

    const updated = [...otpDigits]
    if (clean.length > 1) {
      // Handle multi-character typing / auto-paste into single box
      const chars = clean.slice(0, 6).split('')
      chars.forEach((c, i) => {
        if (index + i < 6) updated[index + i] = c
      })
      setOtpDigits(updated)
      const nextIndex = Math.min(5, index + chars.length)
      otpInputRefs.current[nextIndex]?.focus()
      return
    }

    updated[index] = clean
    setOtpDigits(updated)

    // Auto-advance to next box
    if (index < 5 && clean) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const updated = [...otpDigits]
    pasted.split('').forEach((char, i) => {
      if (i < 6) updated[i] = char
    })
    setOtpDigits(updated)
    const focusTarget = Math.min(5, pasted.length)
    otpInputRefs.current[focusTarget]?.focus()
  }

  // Step 2 Submit: Verify OTP code
  const handleOtpSubmit = async (e) => {
    e?.preventDefault()
    setOtpError('')
    const fullOtp = otpDigits.join('')
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.')
      return
    }

    setOtpLoading(true)
    const res = await apiVerifyResetOtp(email.trim().toLowerCase(), fullOtp)
    setOtpLoading(false)

    if (res.ok && res.resetToken) {
      setResetToken(res.resetToken)
      setStep(3)
    } else {
      setOtpError(res.error || 'Invalid or expired code.')
    }
  }

  // Step 2: Resend OTP code
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setOtpError('')
    const res = await apiForgotPassword(email.trim().toLowerCase())
    if (res.ok) {
      startResendTimer(60)
      startExpiryTimer(600)
      setOtpDigits(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } else {
      setOtpError(res.error || 'Failed to resend code.')
    }
  }

  // ── Step 3 Submit: Reset Password ──────────────────────────────────────────
  const strength = getStrength(newPassword)
  const strengthMeta = STRENGTH_META[strength]
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setResetError('')

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }

    setResetLoading(true)
    const res = await apiResetPassword(email.trim().toLowerCase(), resetToken, newPassword)
    setResetLoading(false)

    if (res.ok) {
      setStep(4)
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { passwordResetSuccess: true },
        })
      }, 2000)
    } else {
      setResetError(res.error || 'Failed to reset password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ── LEFT — branding panel (desktop only) ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative overflow-hidden flex-col flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 10% 90%, rgba(139,92,246,0.35) 0%, transparent 65%),' +
              'radial-gradient(ellipse 50% 40% at 90% 10%, rgba(129,140,248,0.25) 0%, transparent 65%)',
          }}
        />
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
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-2xl text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Swish
            </span>
          </Link>

          <div className="flex-1 flex flex-col justify-center py-10">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-3.5 py-1.5 text-white/90 text-[11px] font-semibold uppercase tracking-wider mb-6 w-fit">
              <Shield size={12} className="flex-shrink-0" />
              Account Security
            </span>

            <h2
              className="font-extrabold text-4xl xl:text-[44px] leading-[1.08] tracking-tight text-white mb-5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Secure account recovery<br />
              <span className="text-indigo-200">made effortless.</span>
            </h2>

            <p className="text-white/70 text-base leading-relaxed max-w-[360px]">
              Verify your campus identity using single-use email verification and set a new password securely.
            </p>
          </div>

          <div className="border-t border-white/15 pt-6 flex items-center justify-between text-white/50 text-xs">
            <span>© {new Date().getFullYear()} Swish Campus Network</span>
            <span>End-to-end security</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form panel ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 text-sm mb-8 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Sign in
          </Link>

          {/* Mobile logo */}
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

          <AnimatePresence mode="wait">
            {/* ═══════════ STEP 1: EMAIL ═════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <KeyRound size={20} />
                  </div>
                  <h1
                    className="text-slate-900 dark:text-white font-bold text-2xl mb-1.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Forgot your password?
                  </h1>
                  <p className="text-slate-500 dark:text-gray-400 text-sm">
                    Enter your verified campus email to receive a 6-digit recovery code.
                  </p>
                </div>

                {emailError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-5"
                    role="alert"
                  >
                    <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{emailError}</p>
                  </motion.div>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5"
                    >
                      Campus Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
                      />
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="student@campus.edu"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setEmailError('')
                        }}
                        autoComplete="email"
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                      />
                    </div>
                  </div>

                  <TurnstileWidget onVerify={setTurnstileToken} />

                  <button
                    id="forgot-submit-email"
                    type="submit"
                    disabled={emailLoading}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                  >
                    {emailLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending recovery code…
                      </>
                    ) : (
                      <>
                        Send verification code
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ═══════════ STEP 2: 6-BOX OTP ═══════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <Mail size={20} />
                  </div>
                  <h1
                    className="text-slate-900 dark:text-white font-bold text-2xl mb-1.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Enter 6-digit code
                  </h1>
                  <p className="text-slate-500 dark:text-gray-400 text-sm">
                    We sent a code to <strong className="text-slate-800 dark:text-gray-200">{email}</strong>.
                  </p>
                </div>

                {otpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-5"
                    role="alert"
                  >
                    <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{otpError}</p>
                  </motion.div>
                )}

                <form onSubmit={handleOtpSubmit} className="space-y-5" noValidate>
                  {/* 6 OTP Boxes */}
                  <div>
                    <label className="block text-slate-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
                      Verification Code
                    </label>
                    <div className="flex gap-2 sm:gap-2.5 justify-between" onPaste={handlePaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          id={`forgot-otp-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          aria-label={`Digit ${idx + 1}`}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-mono font-bold rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Expiry countdown */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 pt-1">
                    <span>
                      Code expires in: <strong className="font-mono text-slate-700 dark:text-gray-300">{formatCountdown(expiryCountdown)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Change email
                    </button>
                  </div>

                  <button
                    id="forgot-verify-code"
                    type="submit"
                    disabled={otpLoading || otpDigits.join('').length < 6}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2"
                  >
                    {otpLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying code…
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Verify code
                      </>
                    )}
                  </button>
                </form>

                {/* Resend button */}
                <div className="mt-6 text-center">
                  <p className="text-slate-500 dark:text-gray-400 text-sm">
                    Didn't receive the code?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <RefreshCw size={12} className={resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform duration-500'} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══════════ STEP 3: NEW PASSWORD ═══════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <Lock size={20} />
                  </div>
                  <h1
                    className="text-slate-900 dark:text-white font-bold text-2xl mb-1.5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Set new password
                  </h1>
                  <p className="text-slate-500 dark:text-gray-400 text-sm">
                    Must be at least 8 characters and different from previous passwords.
                  </p>
                </div>

                {resetError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-5"
                    role="alert"
                  >
                    <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{resetError}</p>
                  </motion.div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="forgot-new-password"
                      className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
                      />
                      <input
                        id="forgot-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          setResetError('')
                        }}
                        autoComplete="new-password"
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-0.5"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          {[1, 2, 3, 4].map((stepNum) => (
                            <div
                              key={stepNum}
                              className={`flex-1 h-full rounded-full transition-all duration-300 ${
                                strength >= stepNum ? strengthMeta.bar : 'bg-transparent'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 dark:text-gray-500">Strength</span>
                          <span className={`font-semibold ${strengthMeta.text}`}>{strengthMeta.label}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="forgot-confirm-password"
                      className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
                      />
                      <input
                        id="forgot-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setResetError('')
                        }}
                        autoComplete="new-password"
                        className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-11 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-0.5"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {confirmPassword && (
                      <p
                        className={`text-xs mt-1.5 flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check size={12} /> Passwords match
                          </>
                        ) : (
                          'Passwords do not match'
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    id="forgot-submit-reset"
                    type="submit"
                    disabled={resetLoading || !passwordsMatch || newPassword.length < 8}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2 mt-2"
                  >
                    {resetLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating password…
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ═══════════ STEP 4: SUCCESS ════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h2
                  className="text-slate-900 dark:text-white font-bold text-2xl mb-2"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Password Updated!
                </h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">
                  Your password has been securely reset. Redirecting you to sign in…
                </p>
                <div className="flex justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
