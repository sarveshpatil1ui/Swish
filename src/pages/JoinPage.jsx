import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Shield, CheckCircle, Check, Mail, User,
  BookOpen, ChevronDown, Lock, Eye, EyeOff, ArrowRight,
  ArrowLeft, AlertCircle, GraduationCap, Briefcase,
  BadgeCheck, XCircle, RefreshCw,
} from 'lucide-react'
import { useSwish } from '../context/SwishContext'
import { apiVerifyOtp, apiResendOtp, apiCheckCollegeDomain, apiGetDepartmentsByDomain, redirectPathForRole } from '../utils/auth'
import TurnstileWidget from '../components/common/TurnstileWidget'

// ── Password strength helpers ─────────────────────────────────────────────────
const getStrength = (pass) => {
  if (!pass) return 0
  let score = 0
  if (pass.length >= 8)           score++
  if (/[A-Z]/.test(pass))         score++
  if (/[0-9]/.test(pass))         score++
  if (/[^a-zA-Z0-9]/.test(pass)) score++
  return score // 0–4
}

const STRENGTH_META = [
  { label: '',       bar: '',               text: 'text-slate-400 dark:text-gray-600' },
  { label: 'Weak',   bar: 'bg-rose-500',    text: 'text-rose-500' },
  { label: 'Fair',   bar: 'bg-amber-500',   text: 'text-amber-500' },
  { label: 'Good',   bar: 'bg-yellow-400',  text: 'text-yellow-500' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-500' },
]

// ── Static lists ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Information Technology',
  'Computer Science',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'MBA / Management',
  'Arts & Humanities',
  'Science',
  'Law',
  'Club / Society Account',
  'Other',
]

const STUDENT_YEARS  = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Masters / PhD']
const DESIGNATIONS   = ['HOD', 'Professor', 'Assistant Professor', 'Lecturer', 'Other']

// ── Verification flow steps ───────────────────────────────────────────────────
const VERIFY_STEPS = [
  {
    label: 'Submit campus email',
    sub:   'Must be a valid institute or .edu domain',
    done:  false,
  },
  {
    label: 'Domain automatically verified',
    sub:   'Our system confirms campus affiliation',
    done:  false,
  },
  {
    label: 'Full campus access granted',
    sub:   'Welcome to your campus community',
    done:  true,
  },
]

// ── Reusable field styles ─────────────────────────────────────────────────────
const INPUT_BASE =
  'w-full bg-base-50 dark:bg-base-800 border text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all'
const borderFor = (err) =>
  err
    ? 'border-rose-300 dark:border-rose-700'
    : 'border-base-200 dark:border-base-700'

// ── Blank form per role ───────────────────────────────────────────────────────
const blankForm = (role) => ({
  fullName:        '',
  email:           '',
  dept:            '',
  password:        '',
  confirmPassword: '',
  // student
  ...(role === 'student' ? { studentId: '', year: '' } : {}),
  // faculty
  ...(role === 'faculty' ? { designation: '', employeeId: '' } : {}),
})

// ─────────────────────────────────────────────────────────────────────────────
export default function JoinPage() {
  const { register, onVerified, platformConfig } = useSwish()
  const isRegistrationPaused = platformConfig?.features?.allowRegistration === false
  const navigate = useNavigate()
  const location = useLocation()

  const fromLocation = location.state?.from
  const targetDestination = fromLocation?.pathname
    ? (fromLocation.pathname + (fromLocation.search || '') + (fromLocation.hash || ''))
    : null

  // Role toggle
  const [role, setRole] = useState('student') // 'student' | 'faculty'

  const [form, setForm]           = useState(blankForm('student'))
  const [showPwd,        setShowPwd]        = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [agreed,         setAgreed]         = useState(false)
  const [errors,         setErrors]         = useState({})
  const [submitError,    setSubmitError]    = useState('')
  const [loading,        setLoading]        = useState(false)
  const [domainStatus, setDomainStatus] = useState('idle')
// idle | checking | approved | denied
  const [departments, setDepartments] = useState(DEPARTMENTS)
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  // ── OTP verification step ─────────────────────────────────────────────────
  const [otpStep,        setOtpStep]        = useState(false)  // show OTP form?
  const [pendingEmail,   setPendingEmail]   = useState('')     // email waiting for OTP
  const [otp,            setOtp]            = useState('')
  const [otpError,       setOtpError]       = useState('')
  const [otpLoading,     setOtpLoading]     = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)      // seconds until resend allowed
  const cooldownRef = useRef(null)

  // Switch role → reset form fields
  const switchRole = (newRole) => {
    if (newRole === role) return
    setRole(newRole)
    setForm(blankForm(newRole))
    setErrors({})
    setSubmitError('')
  }

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    setErrors(err => ({ ...err, [field]: '' }))
  }

  const strength     = getStrength(form.password)
  const strengthMeta = STRENGTH_META[strength]
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.confirmPassword === form.password

  // ── Live domain status ──────────────────────────────────────────────────────
 const emailHasDomain =
  form.email.includes('@') &&
  form.email.split('@')[1]?.length > 0

const emailApproved = domainStatus === 'approved'
const emailDenied = domainStatus === 'denied'
const domainChecking = domainStatus === 'checking'
useEffect(() => {
  if (!emailHasDomain) {
    setDomainStatus('idle')
    setDepartments(DEPARTMENTS)
    return
  }

  const domain = form.email.trim().toLowerCase().split('@')[1]

  let cancelled = false

  const checkDomain = async () => {
    setDomainStatus('checking')

    try {
      const result = await apiCheckCollegeDomain(domain)

      if (!cancelled) {
        const approved = result.ok && result.approved === true
        setDomainStatus(approved ? 'approved' : 'denied')

        // Fetch departments if domain is approved
        if (approved) {
          setLoadingDepartments(true)
          try {
            const deptResult = await apiGetDepartmentsByDomain(domain)
            if (deptResult.ok && deptResult.departments && deptResult.departments.length > 0) {
              setDepartments(deptResult.departments.map(d => d.name))
            } else {
              // Fallback to static list if no departments found
              setDepartments(DEPARTMENTS)
            }
          } catch (err) {
            console.error('[JoinPage] Failed to fetch departments:', err)
            setDepartments(DEPARTMENTS)
          } finally {
            setLoadingDepartments(false)
          }
        } else {
          setDepartments(DEPARTMENTS)
        }
      }
    } catch (err) {
      console.error('[JoinPage] Domain check failed:', err)

      if (!cancelled) {
        setDomainStatus('denied')
        setDepartments(DEPARTMENTS)
      }
    }
  }

  checkDomain()

  return () => {
    cancelled = true
  }
}, [form.email, emailHasDomain])
  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isRegistrationPaused) {
      setSubmitError('Account registrations are temporarily paused for routine platform maintenance.')
      return
    }
    setSubmitError('')
    const errs = {}

    if (!form.fullName.trim())        errs.fullName  = 'Full name is required'
    if (!form.email.trim())           errs.email     = 'Campus email is required'
    else if (domainStatus !== 'approved') {
  errs.email =
    domainStatus === 'checking'
      ? 'Please wait while we verify your campus domain.'
      : 'This email domain is not registered with Swish.'
}
    if (!form.dept)                   errs.dept      = 'Please select your department'
    if (!form.password)               errs.password  = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Must be at least 8 characters'
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match.'
    if (!agreed)                      errs.agreed    = 'You must agree to the terms'

    // Role-specific validation
    if (role === 'student') {
      if (!form.year)      errs.year      = 'Please select your year'
      if (!form.studentId) errs.studentId = 'Student ID is required'
    }
    if (role === 'faculty') {
      if (!form.designation) errs.designation = 'Please select a designation'
      if (!form.employeeId)  errs.employeeId  = 'Employee ID is required'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)

    const result = await register({
      name:        form.fullName,
      email:       form.email,
      password:    form.password,
      role,
      dept:        form.dept,
      hp_field:    form.hp_field || '',
      turnstileToken: turnstileToken || undefined,
      // student
      ...(role === 'student' && { year: form.year, studentId: form.studentId }),
      // faculty
      ...(role === 'faculty' && { designation: form.designation, employeeId: form.employeeId }),
    })

    setLoading(false)

    if (result.ok && result.pendingVerification) {
      // Show OTP step — do NOT navigate yet
      setPendingEmail(result.email || form.email.trim().toLowerCase())
      setOtpStep(true)
      startResendCooldown()
    } else if (!result.ok) {
      setSubmitError(result.error)
    }
  }

  // ── Resend cooldown timer ─────────────────────────────────────────────────
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

  // ── OTP submit ─────────────────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    if (isRegistrationPaused) {
      setSubmitError('Account registrations are temporarily paused for routine platform maintenance.')
      return
    }
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
      navigate(targetDestination || result.redirectTo || redirectPathForRole(result.user?.role) || '/home', { replace: true })
    } else {
      setOtpError(result.error || 'Invalid or expired code.')
      if (result.expired) startResendCooldown(0) // allow immediate resend
    }
  }

  // ── OTP resend ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setOtpError('')
    const result = await apiResendOtp(pendingEmail)
    if (result.ok) {
      startResendCooldown()
    } else {
      setOtpError(result.error || 'Failed to resend code.')
    }
  }

  return (
    <div className="min-h-screen flex bg-base-25 dark:bg-base-950 transition-colors duration-300">

      {/* ── LEFT — verification panel (desktop only) ──────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative overflow-hidden flex-col flex-shrink-0">

        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600 via-accent-700 to-accent-900" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 15% 85%, rgba(91,95,239,0.25) 0%, transparent 65%),' +
              'radial-gradient(ellipse 50% 40% at 85% 15%, rgba(129,140,248,0.2) 0%, transparent 65%)',
          }}
        />
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize:  '28px 28px',
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
            <div className="w-9 h-9 rounded-xl bg-white/12 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xs">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-2xl text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Swish
            </span>
          </motion.div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center py-10">

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8"
            >
              <h2
                className="font-extrabold text-3xl xl:text-[38px] leading-[1.08] tracking-tight text-white mb-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Not open<br />to the public.
              </h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-[280px]">
                Swish is a closed network. Every account is linked to a verified campus email. No exceptions.
              </p>
            </motion.div>

            {/* Verification flow card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-5 mb-7 shadow-xs"
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/12">
                <div className="w-8 h-8 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield size={15} className="text-accent-200" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">Campus Verification</p>
                  <p className="text-white/60 text-xs mt-0.5">How access works</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-0">
                {VERIFY_STEPS.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.32 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    {/* Step node + connector */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.done
                            ? 'bg-emerald-500/25 border border-emerald-400/45'
                            : 'bg-white/10 border border-white/20'
                        }`}
                      >
                        {step.done
                          ? <Check size={13} className="text-emerald-400" />
                          : <span className="text-white/65 text-xs font-bold">{i + 1}</span>
                        }
                      </div>
                      {i < VERIFY_STEPS.length - 1 && (
                        <div className="w-px h-6 bg-white/12 mt-1" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="pb-4">
                      <p className="text-white text-sm font-medium leading-tight">{step.label}</p>
                      <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{step.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* What you get */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="grid grid-cols-2 gap-2.5"
            >
              {[
                'Private campus feed',
                'Verified profiles only',
                'Clubs & events',
                'Faculty connect',
              ].map(perk => (
                <div key={perk} className="flex items-center gap-2 text-white/70 text-xs">
                  <div className="w-4 h-4 rounded-full bg-accent-500/30 border border-accent-400/30 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-accent-200" />
                  </div>
                  {perk}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-5 border-t border-white/10"
          >
            <p className="text-white/60 text-xs leading-relaxed italic mb-3">
              "Swish is the only place where I can share campus moments with people who were actually there."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-400/80 flex items-center justify-center text-white font-bold" style={{ fontSize: '9px' }}>
                VS
              </div>
              <p className="text-white/60 text-xs">Verified Student · Campus Member</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT — form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-base-900 overflow-y-auto">
        <AnimatePresence mode="wait">

        {/* ═══════════════ OTP VERIFICATION STEP ═══════════════════════════ */}
        {otpStep ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[420px]"
          >
            {/* Back to form */}
            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtp(''); setOtpError('') }}
              className="inline-flex items-center gap-1.5 text-base-400 dark:text-base-500 hover:text-base-600 dark:hover:text-base-300 text-sm mb-8 transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-xl bg-accent-500 flex items-center justify-center shadow-xs">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <span className="font-extrabold text-xl text-base-900 dark:text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Swish</span>
            </div>

            {/* Header */}
            <div className="mb-7">
              <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center mb-4">
                <Mail size={22} className="text-accent-500 dark:text-accent-400" />
              </div>
              <h1 className="text-base-900 dark:text-white font-bold text-[26px] mb-1.5 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Check your email
              </h1>
              <p className="text-base-500 dark:text-base-400 text-sm leading-relaxed">
                We sent a 6-digit verification code to{' '}
                <span className="font-semibold text-base-800 dark:text-base-200">{pendingEmail}</span>.
                Enter it below to activate your account.
              </p>
            </div>

            {/* OTP error banner */}
            <AnimatePresence mode="wait">
              {otpError && (
                <motion.div
                  key="otp-error"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl px-4 py-3 mb-4"
                >
                  <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{otpError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP form */}
            <form onSubmit={handleOtpSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="otp-code" className="block text-base-700 dark:text-base-300 text-sm font-medium mb-1.5">
                  Verification Code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                  className={`w-full bg-base-50 dark:bg-base-800 border ${otpError ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-300 dark:placeholder-base-600 rounded-xl px-4 py-4 text-3xl font-mono font-bold tracking-[0.5em] text-center focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                  autoFocus
                />
              </div>

              <button
                id="otp-submit"
                type="submit"
                disabled={otpLoading || otp.length < 6}
                className="w-full py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 active:bg-accent-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-xs flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Verify & Continue
                  </>
                )}
              </button>
            </form>

            {/* Resend OTP */}
            <div className="mt-5 text-center">
              <p className="text-base-500 dark:text-base-400 text-sm">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1 text-accent-500 dark:text-accent-400 font-semibold hover:text-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {resendCooldown > 0 ? (
                    <>
                      <RefreshCw size={12} />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Resend code
                    </>
                  )}
                </button>
              </p>
            </div>
          </motion.div>

        ) : (

        /* ═══════════════ REGISTRATION FORM ══════════════════════════════ */
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-base-400 dark:text-base-500 hover:text-base-600 dark:hover:text-base-300 text-sm mb-8 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Swish
          </Link>

          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-accent-500 flex items-center justify-center shadow-xs">
              <Zap size={15} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-xl text-base-900 dark:text-white tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Swish
            </span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 rounded-full px-3 py-1 mb-4">
              <Shield size={11} className="text-accent-500 dark:text-accent-400 flex-shrink-0" />
              <span className="text-accent-600 dark:text-accent-400 text-[11px] font-semibold">
                Campus Verified Access Only
              </span>
            </div>
            <h1
              className="text-base-900 dark:text-white font-bold text-[26px] mb-1.5 tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Join your campus
            </h1>
            <p className="text-base-500 dark:text-base-400 text-sm">
              Create your verified campus account on Swish.
            </p>
          </div>

          {/* ── Role toggle ── */}
          <div className="flex gap-2 p-1 bg-base-100 dark:bg-base-800/60 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => switchRole('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                role === 'student'
                  ? 'bg-white dark:bg-base-900 text-accent-600 dark:text-accent-400 shadow-xs'
                  : 'text-base-500 dark:text-base-400 hover:text-base-700 dark:hover:text-base-300'
              }`}
            >
              <GraduationCap size={15} />
              Student
            </button>
            <button
              type="button"
              onClick={() => switchRole('faculty')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                role === 'faculty'
                  ? 'bg-white dark:bg-base-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-base-500 dark:text-base-400 hover:text-base-700 dark:hover:text-base-300'
              }`}
            >
              <Briefcase size={15} />
              Faculty
            </button>
          </div>

          {/* Global submit error banner */}
          <AnimatePresence mode="wait">
            {submitError && (
              <motion.div
                key="submit-error"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 mb-4"
              >
                <AlertCircle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-rose-600 dark:text-rose-400 text-sm leading-snug">{submitError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isRegistrationPaused && (
            <div className="p-3.5 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Registrations Temporarily Paused</p>
                <p className="text-[11px] mt-0.5">Account creation is temporarily paused for routine platform maintenance. Please check back shortly.</p>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Registration form">

            {/* Honeypot field for bot protection */}
            <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="join-hp-field">Leave this empty</label>
              <input
                id="join-hp-field"
                type="text"
                name="hp_field"
                value={form.hp_field || ''}
                onChange={set('hp_field')}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="join-firstname" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="join-firstname"
                  type="text"
                  placeholder="Your Full Name"
                  value={form.fullName}
                  onChange={set('fullName')}
                  className={`${INPUT_BASE} ${borderFor(errors.fullName)} pl-10 pr-4`}
                />
              </div>
              {errors.fullName && (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Campus Email + live domain badge */}
            <div>
              <label htmlFor="join-email" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Campus Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="join-email"
                  type="email"
                  placeholder="you@campus.edu"
                  value={form.email}
                  onChange={set('email')}
                  className={`${INPUT_BASE} ${
                    errors.email
                      ? 'border-rose-300 dark:border-rose-700'
                      : emailApproved
                        ? 'border-emerald-300 dark:border-emerald-700'
                        : emailDenied
                          ? 'border-rose-300 dark:border-rose-700'
                          : 'border-slate-200 dark:border-gray-800'
                  } pl-10 pr-4`}
                />
              </div>
              {/* Domain feedback */}
              {errors.email ? (
  <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">
    {errors.email}
  </p>
) : emailApproved ? (
  <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 flex items-center gap-1">
    <BadgeCheck size={12} /> Campus domain verified
  </p>
) : domainChecking ? (
  <p className="text-indigo-500 dark:text-indigo-400 text-xs mt-1 flex items-center gap-1">
    <RefreshCw size={12} className="animate-spin" /> Checking campus domain…
  </p>
) : emailDenied ? (
  <p className="text-rose-500 dark:text-rose-400 text-xs mt-1 flex items-center gap-1">
    <XCircle size={12} /> This email domain is not registered with Swish.
  </p>
) : (
                <p className="text-slate-400 dark:text-gray-600 text-xs mt-1.5">
                  Must be a valid campus or institute email address.
                </p>
              )}
            </div>

            {/* Department — shared by both roles */}
            <div>
              <label htmlFor="join-dept" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Department
              </label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none z-10" />
                <select
                  id="join-dept"
                  value={form.dept}
                  onChange={set('dept')}
                  disabled={loadingDepartments}
                  className={`${INPUT_BASE} ${borderFor(errors.dept)} pl-10 pr-8 cursor-pointer appearance-none ${loadingDepartments ? 'opacity-60' : ''}`}
                >
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {loadingDepartments ? (
                  <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 animate-spin" />
                ) : (
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                )}
              </div>
              {errors.dept && (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.dept}</p>
              )}
            </div>

            {/* ── Role-specific fields (animated) ── */}
            <AnimatePresence mode="wait">

              {role === 'student' && (
                <motion.div
                  key="student-fields"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-[1fr_120px] gap-3"
                >
                  {/* Student ID */}
                  <div>
                    <label htmlFor="join-student-id" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                      Student ID / Roll No.
                    </label>
                    <input
                      id="join-student-id"
                      type="text"
                      placeholder="CS2024001"
                      value={form.studentId}
                      onChange={set('studentId')}
                      className={`${INPUT_BASE} ${borderFor(errors.studentId)} px-4`}
                    />
                    {errors.studentId && (
                      <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.studentId}</p>
                    )}
                  </div>

                  {/* Year */}
                  <div>
                    <label htmlFor="join-year" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                      Year
                    </label>
                    <div className="relative">
                      <select
                        id="join-year"
                        value={form.year}
                        onChange={set('year')}
                        className={`${INPUT_BASE} ${borderFor(errors.year)} pl-3 pr-7 cursor-pointer appearance-none`}
                      >
                        <option value="">Year</option>
                        {STUDENT_YEARS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                    {errors.year && (
                      <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.year}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {role === 'faculty' && (
                <motion.div
                  key="faculty-fields"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-[1fr_130px] gap-3"
                >
                  {/* Employee ID */}
                  <div>
                    <label htmlFor="join-employee-id" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                      Employee ID
                    </label>
                    <input
                      id="join-employee-id"
                      type="text"
                      placeholder="EMP2024001"
                      value={form.employeeId}
                      onChange={set('employeeId')}
                      className={`${INPUT_BASE} ${borderFor(errors.employeeId)} px-4`}
                    />
                    {errors.employeeId && (
                      <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.employeeId}</p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label htmlFor="join-designation" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                      Designation
                    </label>
                    <div className="relative">
                      <select
                        id="join-designation"
                        value={form.designation}
                        onChange={set('designation')}
                        className={`${INPUT_BASE} ${borderFor(errors.designation)} pl-3 pr-7 cursor-pointer appearance-none`}
                      >
                        <option value="">Select</option>
                        {DESIGNATIONS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                    {errors.designation && (
                      <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.designation}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div>
              <label htmlFor="join-password" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="join-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={set('password')}
                  className={`${INPUT_BASE} ${borderFor(errors.password)} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength indicator */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength
                            ? strengthMeta.bar
                            : 'bg-slate-100 dark:bg-gray-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${strengthMeta.text}`}>
                    {strengthMeta.label} password
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="join-confirm-password" className="block text-slate-700 dark:text-gray-300 text-sm font-medium mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="join-confirm-password"
                  type={showConfirmPwd ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  className={`${INPUT_BASE} ${
                    errors.confirmPassword
                      ? 'border-rose-300 dark:border-rose-700'
                      : passwordsMatch
                        ? 'border-emerald-300 dark:border-emerald-700'
                        : 'border-slate-200 dark:border-gray-800'
                  } pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword ? (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.confirmPassword}</p>
              ) : passwordsMatch ? (
                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 flex items-center gap-1">
                  <Check size={11} /> Passwords match
                </p>
              ) : null}
            </div>

            {/* Terms */}
            <div>
              <div className="flex items-start gap-2.5">
                <input
                  id="join-terms"
                  type="checkbox"
                  checked={agreed}
                  onChange={e => { setAgreed(e.target.checked); setErrors(err => ({ ...err, agreed: '' })) }}
                  className="w-4 h-4 mt-0.5 rounded border-base-300 dark:border-base-700 accent-accent-500 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="join-terms" className="text-base-600 dark:text-base-400 text-sm leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-accent-500 dark:text-accent-400 hover:text-accent-600 font-medium transition-colors">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-accent-500 dark:text-accent-400 hover:text-accent-600 font-medium transition-colors">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.agreed && (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1 ml-6">{errors.agreed}</p>
              )}
            </div>

            {/* Turnstile Captcha */}
            <TurnstileWidget onVerify={setTurnstileToken} />

            {/* Submit */}
            <button
              id="join-submit"
              type="submit"
              disabled={loading || isRegistrationPaused}
              className="w-full py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 active:bg-accent-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-xs flex items-center justify-center gap-2 mt-1"
            >
              {isRegistrationPaused ? (
                'Registrations Temporarily Paused'
              ) : loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create Campus Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Sign in and Forgot password links */}
          <div className="flex items-center justify-center gap-2.5 text-sm mt-6 text-base-500 dark:text-base-400">
            <span>
              Already have an account?{' '}
              <Link
                to="/login"
                state={fromLocation ? { from: fromLocation } : undefined}
                className="text-accent-500 dark:text-accent-400 font-semibold hover:text-accent-600 transition-colors"
              >
                Sign in
              </Link>
            </span>
            <span className="text-base-300 dark:text-base-700">·</span>
            <Link
              to="/forgot-password"
              className="text-base-500 dark:text-base-400 hover:text-accent-500 dark:hover:text-accent-400 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
        </motion.div>

        )} {/* end ternary — otpStep ? ... : registrationForm */}
        </AnimatePresence>
      </div>
    </div>
  )
}
