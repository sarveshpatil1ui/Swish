import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Shield, CheckCircle, Check, Mail, User,
  BookOpen, ChevronDown, Lock, Eye, EyeOff, ArrowRight,
  ArrowLeft, AlertCircle, GraduationCap, Briefcase,
  BadgeCheck, XCircle,
} from 'lucide-react'
import { useSwish } from '../context/SwishContext'

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
  'w-full bg-slate-50 dark:bg-gray-900 border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all'
const borderFor = (err) =>
  err
    ? 'border-rose-300 dark:border-rose-700'
    : 'border-slate-200 dark:border-gray-800'

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
  const { register, domainApproved } = useSwish()
  const navigate = useNavigate()

  // Role toggle
  const [role, setRole] = useState('student') // 'student' | 'faculty'

  const [form, setForm]           = useState(blankForm('student'))
  const [showPwd,        setShowPwd]        = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [agreed,         setAgreed]         = useState(false)
  const [errors,         setErrors]         = useState({})
  const [submitError,    setSubmitError]    = useState('')
  const [loading,        setLoading]        = useState(false)

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
  const emailHasDomain = form.email.includes('@') && form.email.split('@')[1]?.length > 0
  const emailApproved  = emailHasDomain && domainApproved(form.email)
  const emailDenied    = emailHasDomain && !emailApproved

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const errs = {}

    if (!form.fullName.trim())        errs.fullName  = 'Full name is required'
    if (!form.email.trim())           errs.email     = 'Campus email is required'
    else if (!emailApproved)          errs.email     = 'This email domain is not registered with Swish.'
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
    await new Promise(r => setTimeout(r, 800)) // brief UX delay

    const result = register({
      name:        form.fullName,
      email:       form.email,
      password:    form.password,
      role,
      dept:        form.dept,
      // student
      ...(role === 'student' && { year: form.year, studentId: form.studentId }),
      // faculty
      ...(role === 'faculty' && { designation: form.designation, employeeId: form.employeeId }),
    })

    setLoading(false)

    if (result.ok) {
      navigate(result.redirectTo) // auto-logged in → /home
    } else {
      setSubmitError(result.error)
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 transition-colors duration-300">

      {/* ── LEFT — verification panel (desktop only) ──────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative overflow-hidden flex-col flex-shrink-0">

        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 45% at 15% 85%, rgba(99,102,241,0.22) 0%, transparent 65%),' +
              'radial-gradient(ellipse 50% 40% at 85% 15%, rgba(139,92,246,0.18) 0%, transparent 65%)',
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
            <div className="w-9 h-9 rounded-xl bg-white/12 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span
              className="font-extrabold text-2xl text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
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
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Not open<br />to the public.
              </h2>
              <p className="text-white/55 text-sm leading-relaxed max-w-[260px]">
                Swish is a closed network. Every account is linked to a verified campus email. No exceptions.
              </p>
            </motion.div>

            {/* Verification flow card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 mb-7"
            >
              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-white/12">
                <div className="w-8 h-8 bg-indigo-500/25 border border-indigo-400/35 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield size={15} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">Campus Verification</p>
                  <p className="text-white/40 text-xs mt-0.5">How access works</p>
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
                      <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{step.sub}</p>
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
                <div key={perk} className="flex items-center gap-2 text-white/60 text-xs">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-indigo-300" />
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
            <p className="text-white/30 text-xs leading-relaxed italic mb-3">
              "Swish is the only place where I can share campus moments with people who were actually there."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-400/80 flex items-center justify-center text-white font-bold" style={{ fontSize: '9px' }}>
                PP
              </div>
              <p className="text-white/40 text-xs">Priya Patel · CSE 2nd Year · KJSCE Mumbai</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT — form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-gray-950 overflow-y-auto">
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
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

          {/* Heading */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-full px-3 py-1 mb-4">
              <Shield size={11} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                Campus Verified Access Only
              </span>
            </div>
            <h1
              className="text-slate-900 dark:text-white font-bold text-[26px] mb-1.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Join your campus
            </h1>
            <p className="text-slate-500 dark:text-gray-500 text-sm">
              Create your verified campus account on Swish.
            </p>
          </div>

          {/* ── Role toggle ── */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-gray-800/60 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => switchRole('student')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                role === 'student'
                  ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
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
                  ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
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

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="Registration form">

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
                  placeholder="Rahul Sharma"
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
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1">{errors.email}</p>
              ) : emailApproved ? (
                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 flex items-center gap-1">
                  <BadgeCheck size={12} /> Campus domain verified
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
                  className={`${INPUT_BASE} ${borderFor(errors.dept)} pl-10 pr-8 cursor-pointer appearance-none`}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
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
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-gray-700 accent-indigo-600 cursor-pointer flex-shrink-0"
                />
                <label htmlFor="join-terms" className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium transition-colors">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.agreed && (
                <p className="text-rose-500 dark:text-rose-400 text-xs mt-1 ml-6">{errors.agreed}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="join-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm shadow-sm flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
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

          {/* Sign in link */}
          <p className="text-center text-slate-500 dark:text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
