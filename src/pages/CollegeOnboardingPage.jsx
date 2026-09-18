import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Building2, Shield, Mail, User, MapPin, Globe,
  UploadCloud, CheckCircle2, ArrowLeft, ArrowRight, AlertCircle,
  Phone, FileCheck, X, BadgeCheck, RefreshCw, KeyRound, ShieldCheck
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const CAMPUS_TYPES = [
  'University / Deemed University',
  'Engineering & Technology Institute',
  'Management / Business School',
  'Medical & Health Sciences College',
  'Arts, Science & Commerce College',
  'Autonomous Institution',
  'Other / Specialized Institute',
]

const CAMPUS_SIZES = [
  'Under 1,000 students',
  '1,000 – 5,000 students',
  '5,000 – 10,000 students',
  '10,000+ students',
]

const DESIGNATIONS = [
  'College Administrator / IT Head',
  'Dean of Student Affairs',
  'Principal / Director / Vice Chancellor',
  'Department Head (HOD) / Professor',
  'Student Council President / Lead',
  'Campus Ambassador / Official Student Rep',
  'Other Authorized Representative',
]

export default function CollegeOnboardingPage() {
  const navigate = useNavigate()

  // Form state
  const [form, setForm] = useState({
    // College details
    collegeName: '',
    collegeCode: '',
    emailDomain: '',
    location: '',
    campusType: '',
    campusSize: '',
    
    // Requester details
    adminName: '',
    designation: '',
    phone: '',
    
    // Email details
    officialEmail: '',
    confirmEmail: '',

    // Declaration
    agreed: false,
  })

  // OTP Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [verifiedEmail, setVerifiedEmail]     = useState('')
  const [verificationToken, setVerificationToken] = useState('') // server-issued short-lived token
  const [otpSent, setOtpSent]                 = useState(false)
  const [otp, setOtp]                         = useState('')
  const [otpLoading, setOtpLoading]           = useState(false)
  const [otpError, setOtpError]               = useState('')
  const [resendCooldown, setResendCooldown]   = useState(0)
  // Conflict detection state

  const cooldownRef = useRef(null);

  // File upload state (UI mock for direct Cloudinary upload)
  const [proofFile, setProofFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  // Validation & UI states
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Resend Cooldown Timer Helper
  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(cooldownRef.current), [])

  // Input Handler — invalidates verification if official email changes
  const setField = (field) => (e) => {
    const val = e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
    setErrors(prev => ({ ...prev, [field]: '' }))

    if (field === 'officialEmail') {
      if (isEmailVerified || otpSent) {
        setIsEmailVerified(false)
        setVerifiedEmail('')
        setVerificationToken('')
        setOtpSent(false)
        setOtp('')
        setOtpError('')
      }
    }
  }

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleFileSelect = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, proofFile: 'Please upload a PDF, PNG, JPG, or WEBP document.' }))
      return
    }
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, proofFile: 'File size must be under 5MB.' }))
      return
    }

    setProofFile(file)
    setErrors(prev => ({ ...prev, proofFile: '' }))
  }

  const removeFile = () => {
    setProofFile(null)
  }

  // Send OTP Handler
  const handleSendOtp = async () => {
    setOtpError('')
    const emailVal = form.officialEmail.trim().toLowerCase()

    if (!emailVal) {
      setErrors(prev => ({ ...prev, officialEmail: 'Please enter your official campus email first.' }))
      return
    }
    if (!emailVal.includes('@') || !emailVal.includes('.')) {
      setErrors(prev => ({ ...prev, officialEmail: 'Please enter a valid official email address.' }))
      return
    }

    if (form.confirmEmail && form.confirmEmail.trim().toLowerCase() !== emailVal) {
      setErrors(prev => ({ ...prev, confirmEmail: 'Email addresses do not match.' }))
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/onboarding/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialEmail: emailVal,
          adminName: form.adminName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setOtpError(data.error || 'Failed to send verification code. Please try again.')
        return
      }
      setOtpSent(true)
      startResendCooldown(60)
    } catch {
      setOtpError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Verify OTP Handler
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()
    setOtpError('')
    const trimmedOtp = otp.trim()

    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      setOtpError('Please enter a valid 6-digit verification code.')
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/onboarding/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialEmail: form.officialEmail.trim().toLowerCase(),
          otp: trimmedOtp,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setOtpError(data.error || 'Verification failed. Please try again.')
        return
      }
      // Store the server-issued short-lived token; never trust emailVerified flag alone
      setIsEmailVerified(true)
      setVerifiedEmail(data.officialEmail)
      setVerificationToken(data.verificationToken)
      setOtpError('')
    } catch {
      setOtpError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
  e.preventDefault()
  setSubmitError('')
  const errs = {}

  // ── Existing form validation ─────────────────────────────────────────────
  if (!form.collegeName.trim()) {
    errs.collegeName = 'College name is required.'
  }

  if (!form.collegeCode.trim()) {
    errs.collegeCode = 'Short code is required.'
  }

  if (!form.emailDomain.trim()) {
    errs.emailDomain = 'Email domain is required.'
  } else if (form.emailDomain.includes('@')) {
    errs.emailDomain =
      'Enter domain only (e.g. kjsce.edu, not name@kjsce.edu).'
  }

  if (!form.location.trim()) {
    errs.location = 'Location (City, State) is required.'
  }

  if (!form.campusType) {
    errs.campusType = 'Please select an institution type.'
  }

  if (!form.adminName.trim()) {
    errs.adminName = 'Your full name is required.'
  }

  if (!form.designation) {
    errs.designation = 'Please select your role/designation.'
  }

  if (!form.phone.trim()) {
    errs.phone = 'Contact phone number is required.'
  }

  if (!form.officialEmail.trim()) {
    errs.officialEmail = 'Official campus email is required.'
  } else if (!form.officialEmail.includes('@')) {
    errs.officialEmail =
      'Please enter a valid official email address.'
  }

  if (
    form.confirmEmail.trim().toLowerCase() !==
    form.officialEmail.trim().toLowerCase()
  ) {
    errs.confirmEmail = 'Email addresses do not match.'
  }

  // ── Mandatory OTP verification ───────────────────────────────────────────
  if (
    !isEmailVerified ||
    !verificationToken ||
    form.officialEmail.trim().toLowerCase() !== verifiedEmail
  ) {
    errs.officialEmail =
      'You must verify your official email with OTP before submitting.'

    setSubmitError(
      'Please verify your official email address using OTP before submitting.'
    )

    setErrors(errs)
    return
  }

  // ── Proof document validation ────────────────────────────────────────────
  if (!proofFile) {
    errs.proofFile =
      'Please upload a verification document / ID proof.'
  }

  if (!form.agreed) {
    errs.agreed =
      'You must confirm authorization to request onboarding.'
  }

  if (Object.keys(errs).length > 0) {
    setErrors(errs)
    return
  }

  setIsSubmitting(true)

  try {
    // ── 1. Determine Cloudinary resource type ──────────────────────────────
    const resourceType =
      proofFile.type === 'application/pdf'
        ? 'raw'
        : 'image'

    // ── 2. Request secure upload signature from backend ────────────────────
    const signatureRes = await fetch(
      'http://localhost:3001/api/onboarding/proof-upload-signature',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceType,
        }),
      }
    )

    const signatureData = await signatureRes.json()

    if (!signatureRes.ok || !signatureData.ok) {
      throw new Error(
        signatureData.error ||
          'Could not prepare secure proof upload.'
      )
    }

    const upload = signatureData.upload

    // ── 3. Upload proof directly to Cloudinary ─────────────────────────────
    const cloudinaryForm = new FormData()

    cloudinaryForm.append('file', proofFile)
    cloudinaryForm.append('api_key', upload.apiKey)
    cloudinaryForm.append('timestamp', String(upload.timestamp))
    cloudinaryForm.append('signature', upload.signature)
    cloudinaryForm.append('folder', upload.folder)
    cloudinaryForm.append('public_id', upload.publicId)
    cloudinaryForm.append('type', upload.type)

    const cloudinaryUrl =
      `https://api.cloudinary.com/v1_1/${upload.cloudName}/` +
      `${resourceType}/upload`

    const cloudinaryRes = await fetch(
      cloudinaryUrl,
      {
        method: 'POST',
        body: cloudinaryForm,
      }
    )

    const cloudinaryData = await cloudinaryRes.json()

    if (
      !cloudinaryRes.ok ||
      !cloudinaryData.public_id
    ) {
      throw new Error(
        cloudinaryData.error?.message ||
          'Proof upload failed. Please try again.'
      )
    }

    // ── 4. Submit onboarding request to backend ────────────────────────────
    const submitRes = await fetch(
      'http://localhost:3001/api/onboarding/submit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collegeName: form.collegeName.trim(),
          collegeCode: form.collegeCode.trim(),
          emailDomain: form.emailDomain.trim(),
          location: form.location.trim(),
          campusType: form.campusType,
          campusSize: form.campusSize,
          adminName: form.adminName.trim(),
          designation: form.designation,
          phone: form.phone.trim(),
          officialEmail:
            form.officialEmail.trim().toLowerCase(),

          verificationToken,

          proofPublicId: cloudinaryData.public_id,
          proofResourceType: resourceType,
        }),
      }
    )

    const submitData = await submitRes.json()

    if (!submitRes.ok || !submitData.ok) {
      throw new Error(
        submitData.error ||
          'Failed to submit onboarding request.'
      )
    }

    // ── 5. Show existing success screen only after DB save ────────────────
    setIsSubmitting(false)
    setIsSubmitted(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  } catch (err) {
    console.error('[College Onboarding Submit]', err)

    setIsSubmitting(false)

    setSubmitError(
      err.message ||
        'Something went wrong while submitting your application. Please try again.'
    )
  }
}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300 text-slate-900 dark:text-white flex flex-col justify-between">
      {/* Navigation */}
      <Navbar />

      <main className="pt-24 pb-20 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto">

          {/* Breadcrumb / Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Landing Page
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {isSubmitted ? (
              /* ════════════════ SUCCESS / PENDING STATE PREVIEW ════════════════ */
              <motion.div
                key="submitted-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm"
              >
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                  <Shield size={38} />
                </div>

                <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-1.5 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Status: PENDING REVIEW
                </div>

                <h1
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4"
                >
                  Application Submitted!
                </h1>

                <p className="text-slate-600 dark:text-gray-400 text-base max-w-xl mx-auto leading-relaxed mb-8">
                  Thank you for requesting to onboard <strong className="text-slate-900 dark:text-white">{form.collegeName}</strong> to SWISH. Our verification team is reviewing your details and official proof document.
                </p>

                {/* Summary Card */}
                <div className="bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-2xl p-6 max-w-lg mx-auto text-left mb-8 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700">
                    <span className="text-slate-500 dark:text-gray-400">College Name:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{form.collegeName} ({form.collegeCode})</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700">
                    <span className="text-slate-500 dark:text-gray-400">Email Domain:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{form.emailDomain}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-gray-700">
                    <span className="text-slate-500 dark:text-gray-400">Applicant:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{form.adminName} ({form.designation})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-gray-400">Verified Email:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <BadgeCheck size={15} />
                      {form.officialEmail}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl max-w-lg mx-auto text-left flex items-start gap-3 mb-8">
                  <Mail size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                   Your application has been successfully submitted and is now pending verification. Our SWISH team will review your details and verification document, and you will be informed of the decision within <strong>4–5 working days</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                  >
                    Return to SWISH Homepage
                  </button>
                  <button
                    onClick={() => {
                      setIsSubmitted(false)
                      setProofFile(null)
                      setIsEmailVerified(false)
                      setVerifiedEmail('')
                      setOtpSent(false)
                      setOtp('')
                    }}
                    className="px-6 py-3 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    Submit Another Application
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ════════════════ ONBOARDING FORM UI ════════════════ */
              <motion.div
                key="form-state"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
              >
                {/* Header Title Section */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 text-white rounded-3xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-md">
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  
                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-indigo-200 mb-4">
                      <Building2 size={13} />
                      Official Campus Onboarding
                    </div>

                    <h1
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
                    >
                      Bring SWISH to Your Campus
                    </h1>

                    <p className="text-indigo-100/80 text-base leading-relaxed">
                      Register your college or university to establish a private, verified network for your campus community. Submit your details below to begin verification.
                    </p>
                  </div>
                </div>

                {/* Form Container */}
                <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm">
                  
                  {/* Banner notice */}
                  <div className="flex items-start gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-4 mb-8">
                    <Shield size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-indigo-950 dark:text-indigo-200 text-sm font-semibold">Strict Campus Verification</p>
                      <p className="text-slate-600 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">
                        Every college on SWISH must be verified with an official institutional domain and valid proof of authorization. Unverified domains cannot create accounts.
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl px-4 py-3 mb-6 text-rose-600 dark:text-rose-400 text-sm">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-10" noValidate>

                    {/* ── SECTION 1: College Details ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Building2 size={16} />
                        </div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-lg font-bold text-slate-900 dark:text-white">
                          1. Institutional Information
                        </h2>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* College Full Name */}
                        <div className="sm:col-span-2">
                          <label htmlFor="college-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Full College / University Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="college-name"
                            type="text"
                            placeholder="e.g. K. J. Somaiya College of Engineering"
                            value={form.collegeName}
                            onChange={setField('collegeName')}
                            className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.collegeName ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                          />
                          {errors.collegeName && <p className="text-rose-500 text-xs mt-1">{errors.collegeName}</p>}
                        </div>

                        {/* Short Abbreviation */}
                        <div>
                          <label htmlFor="college-code" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            College Code / Short Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="college-code"
                            type="text"
                            placeholder="e.g. KJSCE"
                            value={form.collegeCode}
                            onChange={setField('collegeCode')}
                            className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.collegeCode ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                          />
                          {errors.collegeCode && <p className="text-rose-500 text-xs mt-1">{errors.collegeCode}</p>}
                        </div>

                        {/* Official Email Domain */}
                        <div>
                          <label htmlFor="email-domain" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Official Email Domain <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="email-domain"
                              type="text"
                              placeholder="e.g. somaiya.edu"
                              value={form.emailDomain}
                              onChange={setField('emailDomain')}
                              className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.emailDomain ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                            />
                          </div>
                          {errors.emailDomain ? (
                            <p className="text-rose-500 text-xs mt-1">{errors.emailDomain}</p>
                          ) : (
                            <p className="text-slate-400 dark:text-gray-500 text-[11px] mt-1">Domain after the @ in campus emails (e.g. Stanford.edu)</p>
                          )}
                        </div>

                        {/* Location */}
                        <div>
                          <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            City & State <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="location"
                              type="text"
                              placeholder="e.g. Mumbai, Maharashtra"
                              value={form.location}
                              onChange={setField('location')}
                              className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.location ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                            />
                          </div>
                          {errors.location && <p className="text-rose-500 text-xs mt-1">{errors.location}</p>}
                        </div>

                        {/* Campus Type */}
                        <div>
                          <label htmlFor="campus-type" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Institution Type <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="campus-type"
                            value={form.campusType}
                            onChange={setField('campusType')}
                            className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.campusType ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all cursor-pointer`}
                          >
                            <option value="">Select type</option>
                            {CAMPUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {errors.campusType && <p className="text-rose-500 text-xs mt-1">{errors.campusType}</p>}
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 2: Requester / College Admin Details ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-100 dark:border-violet-900 flex items-center justify-center text-violet-600 dark:text-violet-400">
                          <User size={16} />
                        </div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-lg font-bold text-slate-900 dark:text-white">
                          2. Requester & Contact Details
                        </h2>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Admin Name */}
                        <div>
                          <label htmlFor="admin-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Applicant / Contact Name <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="admin-name"
                              type="text"
                              placeholder="Prof. Rajesh Sharma"
                              value={form.adminName}
                              onChange={setField('adminName')}
                              className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.adminName ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                            />
                          </div>
                          {errors.adminName && <p className="text-rose-500 text-xs mt-1">{errors.adminName}</p>}
                        </div>

                        {/* Designation */}
                        <div>
                          <label htmlFor="designation" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Your Designation / Role <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="designation"
                            value={form.designation}
                            onChange={setField('designation')}
                            className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.designation ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all cursor-pointer`}
                          >
                            <option value="">Select designation</option>
                            {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          {errors.designation && <p className="text-rose-500 text-xs mt-1">{errors.designation}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Contact Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="phone"
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={form.phone}
                              onChange={setField('phone')}
                              className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.phone ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                            />
                          </div>
                          {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        {/* Campus Size */}
                        <div>
                          <label htmlFor="campus-size" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Approximate Student Body Size
                          </label>
                          <select
                            id="campus-size"
                            value={form.campusSize}
                            onChange={setField('campusSize')}
                            className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 transition-all cursor-pointer"
                          >
                            <option value="">Select size range</option>
                            {CAMPUS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 3: Official Verification Email with OTP ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-400">
                          <Mail size={16} />
                        </div>
                        <div>
                          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-lg font-bold text-slate-900 dark:text-white">
                            3. Official Campus Email & OTP Verification
                          </h2>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Official Email + Send OTP action */}
                        <div className="sm:col-span-2">
                          <label htmlFor="official-email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Official Institutional Email <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              <input
                                id="official-email"
                                type="email"
                                placeholder="r.sharma@somaiya.edu"
                                value={form.officialEmail}
                                onChange={setField('officialEmail')}
                                className={`w-full bg-slate-50 dark:bg-gray-900 border ${
                                  errors.officialEmail
                                    ? 'border-rose-300 dark:border-rose-700'
                                    : isEmailVerified
                                      ? 'border-emerald-500 dark:border-emerald-500'
                                      : 'border-slate-200 dark:border-gray-800'
                                } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                              />
                            </div>

                            {/* Send / Resend / Verified Button beside email */}
                            {!isEmailVerified ? (
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={otpLoading || !form.officialEmail.trim()}
                                className="px-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-xs flex-shrink-0 flex items-center gap-1.5"
                              >
                                {otpLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending…
                                  </>
                                ) : otpSent ? (
                                  <>
                                    <RefreshCw size={14} />
                                    Resend OTP
                                  </>
                                ) : (
                                  <>
                                    <KeyRound size={14} />
                                    Send OTP
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex items-center gap-1.5 flex-shrink-0">
                                <BadgeCheck size={18} />
                                Verified
                              </div>
                            )}
                          </div>

                          {/* Email validation & status indicators */}
                          {errors.officialEmail && (
                            <p className="text-rose-500 text-xs mt-1.5">{errors.officialEmail}</p>
                          )}

                          {isEmailVerified && (
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1.5 font-medium flex items-center gap-1">
                              <BadgeCheck size={14} />
                              Official email ({verifiedEmail}) successfully verified with OTP.
                            </p>
                          )}

                          {!isEmailVerified && otpSent && (
                            <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-1.5 font-medium flex items-center gap-1">
                              <Mail size={13} />
                              Verification OTP code sent to <strong>{form.officialEmail}</strong>. 
                            </p>
                          )}
                        </div>

                        {/* Confirm Email */}
                        <div>
                          <label htmlFor="confirm-email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                            Confirm Official Email <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                              id="confirm-email"
                              type="email"
                              placeholder="Re-enter official email"
                              value={form.confirmEmail}
                              onChange={setField('confirmEmail')}
                              className={`w-full bg-slate-50 dark:bg-gray-900 border ${errors.confirmEmail ? 'border-rose-300 dark:border-rose-700' : 'border-slate-200 dark:border-gray-800'} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all`}
                            />
                          </div>
                          {errors.confirmEmail && <p className="text-rose-500 text-xs mt-1">{errors.confirmEmail}</p>}
                        </div>
                      </div>

                      {/* ── OTP Verification Input Block (Shown when OTP sent and not verified) ── */}
                      <AnimatePresence>
                        {otpSent && !isEmailVerified && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-5 mt-4"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                              <p className="text-slate-900 dark:text-white text-sm font-semibold">
                                Enter 6-Digit Email Verification Code
                              </p>
                            </div>

                            {otpError && (
                              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2 mb-3 text-rose-600 dark:text-rose-400 text-xs">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                {otpError}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                              <input
                                id="onboarding-otp"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                value={otp}
                                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
                                className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:w-48"
                              />

                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={otpLoading || otp.length < 6}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-1.5"
                              >
                                {otpLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={16} />
                                    Verify Code
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={resendCooldown > 0}
                                className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline disabled:opacity-50 disabled:no-underline px-2 text-center"
                              >
                                {resendCooldown > 0 ? (
                                  `Resend code in ${resendCooldown}s`
                                ) : (
                                  'Resend code'
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── SECTION 4: Proof Document Upload (Cloudinary UI Mock) ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-800">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <FileCheck size={16} />
                        </div>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-lg font-bold text-slate-900 dark:text-white">
                          4. Authorization Proof & Document Upload
                        </h2>
                      </div>

                      <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                        Upload an official document proving institution affiliation (e.g. Faculty ID Card, Official Authorization Letter, AICTE/UGC Registration Document).
                      </p>

                      {/* Drag & Drop Zone */}
                      {!proofFile ? (
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                            dragActive
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : errors.proofFile
                                ? 'border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/20'
                                : 'border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-900/60 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                          onClick={() => document.getElementById('proof-upload-input').click()}
                        >
                          <input
                            id="proof-upload-input"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={handleFileChange}
                          />

                          <div className="w-12 h-12 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-indigo-600 dark:text-indigo-400">
                            <UploadCloud size={24} />
                          </div>

                          <p className="text-slate-800 dark:text-gray-200 text-sm font-semibold mb-1">
                            Click to upload or drag & drop proof document
                          </p>
                          <p className="text-slate-400 dark:text-gray-500 text-xs mb-3">
                            Supported formats: PDF, PNG, JPG, WEBP (Max 5MB)
                          </p>

                          <span className="inline-block px-3 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-600 dark:text-gray-300 text-xs font-medium shadow-xs">
                            Select Document File
                          </span>
                        </div>
                      ) : (
                        /* Selected File Preview */
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-2xl p-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                              <FileCheck size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">
                                {proofFile.name}
                              </p>
                              <p className="text-slate-400 dark:text-gray-500 text-xs">
                                {(proofFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for secure upload
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors"
                            aria-label="Remove document"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                      {errors.proofFile && <p className="text-rose-500 text-xs mt-1">{errors.proofFile}</p>}
                    </div>

                    {/* ── SECTION 5: Declaration & Submission ── */}
                    <div className="pt-4 border-t border-slate-100 dark:border-gray-800 space-y-6">
                      <div>
                        <div className="flex items-start gap-3">
                          <input
                            id="terms-agreed"
                            type="checkbox"
                            checked={form.agreed}
                            onChange={e => {
                              setForm(p => ({ ...p, agreed: e.target.checked }))
                              setErrors(p => ({ ...p, agreed: '' }))
                            }}
                            className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-gray-700 accent-indigo-600 cursor-pointer flex-shrink-0"
                          />
                          <label htmlFor="terms-agreed" className="text-slate-600 dark:text-gray-400 text-xs leading-relaxed cursor-pointer select-none">
                            I declare that I am an authorized representative of this institution and that the details and document provided are authentic for SWISH campus verification.
                          </label>
                        </div>
                        {errors.agreed && <p className="text-rose-500 text-xs mt-1 ml-7">{errors.agreed}</p>}
                      </div>

                      {/* Helper notice if email is unverified */}
                      {!isEmailVerified && (
                        <div className="flex items-center justify-center gap-1.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-medium">
                          <AlertCircle size={14} className="flex-shrink-0" />
                          Official email verification with OTP is required to unlock submission.
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting || !isEmailVerified}
                        className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base shadow-sm flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Submitting Onboarding Request…
                          </>
                        ) : (
                          <>
                            Submit College Onboarding Request
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  )
}
