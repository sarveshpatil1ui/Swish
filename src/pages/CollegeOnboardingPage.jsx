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
import TurnstileWidget from '../components/common/TurnstileWidget'
import { useSwish } from '../context/SwishContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
  const { platformConfig } = useSwish()
  const isRegistrationPaused = platformConfig?.features?.allowRegistration === false

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
  const [verifiedEmail, setVerifiedEmail] = useState('')
  const [verificationToken, setVerificationToken] = useState('') // server-issued short-lived token
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
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

  // Input Handler — invalidates verification if official email or domain changes
  const setField = (field) => (e) => {
    const val = e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
    setErrors(prev => ({ ...prev, [field]: '' }))

    if (field === 'officialEmail' || field === 'emailDomain') {
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
      setErrors(prev => ({
        ...prev,
        proofFile: 'Unsupported file format. Please upload a PDF, PNG, JPG, or WEBP document.',
      }))
      return
    }
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        proofFile: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 5MB.`,
      }))
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
    const rawDomain = form.emailDomain.trim().toLowerCase().replace(/^@/, '')

    if (!rawDomain) {
      const domainErr = 'Please enter your official college email domain in Section 1 (e.g. somaiya.edu) first.'
      setErrors(prev => ({ ...prev, emailDomain: domainErr }))
      setOtpError(domainErr)
      return
    }

    if (!emailVal) {
      const emailErr = 'Please enter your official institutional email address.'
      setErrors(prev => ({ ...prev, officialEmail: emailErr }))
      setOtpError(emailErr)
      return
    }
    if (!emailVal.includes('@') || !emailVal.includes('.')) {
      const emailErr = `Please enter a valid official email address (e.g. user@${rawDomain}).`
      setErrors(prev => ({ ...prev, officialEmail: emailErr }))
      setOtpError(emailErr)
      return
    }

    const emailDomainPart = emailVal.split('@')[1] || ''
    if (emailDomainPart !== rawDomain) {
      const mismatchMsg = `Official email domain (@${emailDomainPart || 'unknown'}) must match the college domain entered above (@${rawDomain}). Please use an official email ending with @${rawDomain}.`
      setErrors(prev => ({ ...prev, officialEmail: mismatchMsg }))
      setOtpError(mismatchMsg)
      return
    }

    if (form.confirmEmail && form.confirmEmail.trim().toLowerCase() !== emailVal) {
      const matchErr = 'Confirmation email does not match the official email entered above.'
      setErrors(prev => ({ ...prev, confirmEmail: matchErr }))
      setOtpError(matchErr)
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialEmail: emailVal,
          emailDomain: rawDomain,
          collegeName: form.collegeName.trim() || undefined,
          collegeCode: form.collegeCode.trim() || undefined,
          adminName: form.adminName.trim() || undefined,
          hp_field: form.hp_field || undefined,
          turnstileToken: turnstileToken || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        const errorMsg = data.error || 'Failed to send verification code. Please check your details and try again.'
        setOtpError(errorMsg)
        setErrors(prev => ({ ...prev, officialEmail: errorMsg }))
        return
      }
      setOtpSent(true)
      startResendCooldown(60)
    } catch {
      const netErr = 'Could not reach the Swish server. Please check your internet connection and try again.'
      setOtpError(netErr)
      setErrors(prev => ({ ...prev, officialEmail: netErr }))
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
      setOtpError('Please enter the complete 6-digit numeric verification code.')
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officialEmail: form.officialEmail.trim().toLowerCase(),
          otp: trimmedOtp,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setOtpError(data.error || 'Verification failed. Please check the code and try again.')
        return
      }
      // Store the server-issued short-lived token; never trust emailVerified flag alone
      setIsEmailVerified(true)
      setVerifiedEmail(data.officialEmail)
      setVerificationToken(data.verificationToken)
      setOtpError('')
    } catch {
      setOtpError('Could not connect to the verification server. Please check your connection and try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (isRegistrationPaused) {
      setSubmitError('College onboarding requests are temporarily paused for routine platform maintenance.')
      return
    }
    const errs = {}

    // ── Field validation with precise reasons ──
    if (!form.collegeName.trim()) {
      errs.collegeName = 'Full college / university name is required.'
    }

    if (!form.collegeCode.trim()) {
      errs.collegeCode = 'College short code / abbreviation is required (e.g. KJSCE, IITB).'
    }

    const cleanDomain = form.emailDomain.trim().toLowerCase().replace(/^@/, '')
    if (!cleanDomain) {
      errs.emailDomain = 'Institutional email domain is required (e.g. somaiya.edu).'
    } else if (cleanDomain.includes('@') || cleanDomain.includes(' ')) {
      errs.emailDomain = 'Enter valid domain only without "@" or spaces (e.g. somaiya.edu).'
    }

    if (!form.location.trim()) {
      errs.location = 'Campus location (City, State) is required.'
    }

    if (!form.campusType) {
      errs.campusType = 'Please select your institution type from the list.'
    }

    if (!form.adminName.trim()) {
      errs.adminName = 'Applicant full name is required for verification.'
    }

    if (!form.designation) {
      errs.designation = 'Please select your role / designation at this institution.'
    }

    if (!form.phone.trim()) {
      errs.phone = 'Official contact phone number is required.'
    }

    const cleanEmail = form.officialEmail.trim().toLowerCase()
    if (!cleanEmail) {
      errs.officialEmail = 'Official institutional email address is required.'
    } else if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      errs.officialEmail = 'Please provide a valid official email address.'
    } else {
      const emailDomainPart = cleanEmail.split('@')[1] || ''
      if (cleanDomain && emailDomainPart !== cleanDomain) {
        errs.officialEmail = `Official email domain (@${emailDomainPart}) must match the college domain (@${cleanDomain}).`
      }
    }

    if (!form.confirmEmail.trim()) {
      errs.confirmEmail = 'Please re-enter your official email to confirm.'
    } else if (form.confirmEmail.trim().toLowerCase() !== cleanEmail) {
      errs.confirmEmail = 'Confirmation email does not match the official email entered above.'
    }

    // ── Mandatory OTP verification ───────────────────────────────────────────
    if (
      !isEmailVerified ||
      !verificationToken ||
      cleanEmail !== verifiedEmail
    ) {
      errs.officialEmail =
        'You must verify your official email with OTP before submitting.'
      setSubmitError(
        'Email verification incomplete. Please enter the OTP code sent to your official email.'
      )
      setErrors(errs)
      return
    }

    // ── Proof document validation ────────────────────────────────────────────
    if (!proofFile) {
      errs.proofFile =
        'Please upload an authorization proof or institutional ID document.'
    }

    if (!form.agreed) {
      errs.agreed =
        'Please check the declaration box to certify your authorization to onboard this campus.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setSubmitError('Please correct the highlighted fields above before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Determine Cloudinary resource type
      const resourceType =
        proofFile.type === 'application/pdf'
          ? 'raw'
          : 'image'

      // 2. Request secure upload signature from backend
      const signatureRes = await fetch(
        `${API_BASE}/api/onboarding/proof-upload-signature`,
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
          'Could not prepare secure document upload. Please try again.'
        )
      }

      const upload = signatureData.upload

      // 3. Upload proof directly to Cloudinary
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

      if (!cloudinaryRes.ok || !cloudinaryData.public_id) {
        throw new Error(
          cloudinaryData.error?.message ||
          'Proof document upload failed. Please verify the file and try again.'
        )
      }

      // 4. Submit onboarding request to backend
      const submitRes = await fetch(
        `${API_BASE}/api/onboarding/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collegeName: form.collegeName.trim(),
            collegeCode: form.collegeCode.trim(),
            emailDomain: cleanDomain,
            location: form.location.trim(),
            campusType: form.campusType,
            campusSize: form.campusSize,
            adminName: form.adminName.trim(),
            designation: form.designation,
            phone: form.phone.trim(),
            officialEmail: cleanEmail,
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
          'Failed to submit onboarding request. Please review your details and try again.'
        )
      }

      // 5. Show success screen
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
        'Something went wrong while submitting your application. Please check your details and try again.'
      )
    }
  }

  return (
    <div className="min-h-screen bg-base-25 dark:bg-base-950 transition-colors duration-300 text-base-900 dark:text-white flex flex-col justify-between">
      {/* Navigation */}
      <Navbar />

      <main className="pt-24 pb-20 px-4 sm:px-6 flex-1">
        <div className="max-w-4xl mx-auto">

          {/* Breadcrumb / Back link */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-base-500 dark:text-base-400 hover:text-accent-500 dark:hover:text-accent-400 text-sm font-medium transition-colors group"
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
                className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-8 sm:p-12 text-center shadow-xs"
              >
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                  <Shield size={38} />
                </div>

                <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-full px-4 py-1.5 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Status: PENDING REVIEW
                </div>

                <h1
                  style={{ fontFamily: 'var(--font-heading)' }}
                  className="text-3xl sm:text-4xl font-extrabold text-base-900 dark:text-white mb-4 tracking-tight"
                >
                  Application Submitted!
                </h1>

                <p className="text-base-600 dark:text-base-300 text-base max-w-xl mx-auto leading-relaxed mb-8">
                  Thank you for requesting to onboard <strong className="text-base-900 dark:text-white">{form.collegeName}</strong> to SWISH. Our verification team is reviewing your details and official proof document.
                </p>

                {/* Summary Card */}
                <div className="bg-base-50 dark:bg-base-800/60 border border-base-100 dark:border-base-800 rounded-xl p-6 max-w-lg mx-auto text-left mb-8 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-base-200 dark:border-base-700">
                    <span className="text-base-500 dark:text-base-400">College Name:</span>
                    <span className="font-semibold text-base-900 dark:text-white">{form.collegeName} ({form.collegeCode})</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-base-200 dark:border-base-700">
                    <span className="text-base-500 dark:text-base-400">Email Domain:</span>
                    <span className="font-mono text-accent-500 font-semibold">{form.emailDomain}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-base-200 dark:border-base-700">
                    <span className="text-base-500 dark:text-base-400">Applicant:</span>
                    <span className="font-semibold text-base-900 dark:text-white">{form.adminName} ({form.designation})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base-500 dark:text-base-400">Verified Email:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <BadgeCheck size={15} />
                      {form.officialEmail}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-accent-50 dark:bg-accent-950/40 border border-accent-100 dark:border-accent-900 rounded-xl max-w-lg mx-auto text-left flex items-start gap-3 mb-8">
                  <Mail size={18} className="text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-accent-900 dark:text-accent-200 leading-relaxed">
                    Your application has been successfully submitted and is now pending verification. Our SWISH team will review your details and verification document, and you will be informed of the decision within <strong>4–5 working days</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-semibold rounded-xl transition-colors shadow-xs text-sm"
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
                    className="px-6 py-3 border border-base-200 dark:border-base-700 text-base-700 dark:text-base-300 font-semibold rounded-xl hover:bg-base-100 dark:hover:bg-base-800 transition-colors text-sm"
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
                <div className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-900 text-white rounded-2xl p-8 sm:p-10 mb-8 relative overflow-hidden shadow-xs">
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1 text-xs font-semibold text-accent-100 mb-4">
                      <Building2 size={13} />
                      Official Campus Onboarding
                    </div>

                    <h1
                      style={{ fontFamily: 'var(--font-heading)' }}
                      className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
                    >
                      Bring SWISH to Your Campus
                    </h1>

                    <p className="text-white/80 text-base leading-relaxed">
                      Register your college or university to establish a private, verified network for your campus community. Submit your details below to begin verification.
                    </p>
                  </div>
                </div>

                {/* Form Container */}
                <div className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-2xl p-6 sm:p-10 shadow-xs">

                  {/* Banner notice */}
                  <div className="flex items-start gap-3 bg-accent-50 dark:bg-accent-950/40 border border-accent-100 dark:border-accent-900 rounded-xl p-4 mb-8">
                    <Shield size={18} className="text-accent-500 dark:text-accent-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-accent-950 dark:text-accent-200 text-sm font-semibold">Strict Campus Verification</p>
                      <p className="text-base-600 dark:text-base-400 text-xs mt-0.5 leading-relaxed">
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

                  {isRegistrationPaused && (
                    <div className="p-4 mb-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                      <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">College Registrations Temporarily Paused</p>
                        <p className="text-xs mt-0.5">Institution onboarding requests are temporarily paused for scheduled maintenance. Please check back shortly.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-10" noValidate>

                    {/* ── SECTION 1: College Details ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-base-100 dark:border-base-800">
                        <div className="w-8 h-8 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center text-accent-500 dark:text-accent-400">
                          <Building2 size={16} />
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-base-900 dark:text-white">
                          1. Institutional Information
                        </h2>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* College Full Name */}
                        <div className="sm:col-span-2">
                          <label htmlFor="college-name" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Full College / University Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="college-name"
                            type="text"
                            placeholder="e.g. K. J. Somaiya College of Engineering"
                            value={form.collegeName}
                            onChange={setField('collegeName')}
                            className={`w-full bg-base-50 dark:bg-base-800 border ${errors.collegeName ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                          />
                          {errors.collegeName && <p className="text-rose-500 text-xs mt-1">{errors.collegeName}</p>}
                        </div>

                        {/* Short Abbreviation */}
                        <div>
                          <label htmlFor="college-code" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            College Code / Short Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            id="college-code"
                            type="text"
                            placeholder="e.g. KJSCE"
                            value={form.collegeCode}
                            onChange={setField('collegeCode')}
                            className={`w-full bg-base-50 dark:bg-base-800 border ${errors.collegeCode ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                          />
                          {errors.collegeCode && <p className="text-rose-500 text-xs mt-1">{errors.collegeCode}</p>}
                        </div>

                        {/* Official Email Domain */}
                        <div>
                          <label htmlFor="email-domain" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Official Email Domain <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                            <input
                              id="email-domain"
                              type="text"
                              placeholder="e.g. somaiya.edu"
                              value={form.emailDomain}
                              onChange={setField('emailDomain')}
                              className={`w-full bg-base-50 dark:bg-base-800 border ${errors.emailDomain ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                            />
                          </div>
                          {errors.emailDomain ? (
                            <p className="text-rose-500 text-xs mt-1">{errors.emailDomain}</p>
                          ) : (
                            <p className="text-base-400 dark:text-base-500 text-[11px] mt-1">Domain after the @ in campus emails (e.g. Stanford.edu)</p>
                          )}
                        </div>

                        {/* Location */}
                        <div>
                          <label htmlFor="location" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            City & State <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                            <input
                              id="location"
                              type="text"
                              placeholder="e.g. Mumbai, Maharashtra"
                              value={form.location}
                              onChange={setField('location')}
                              className={`w-full bg-base-50 dark:bg-base-800 border ${errors.location ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                            />
                          </div>
                          {errors.location && <p className="text-rose-500 text-xs mt-1">{errors.location}</p>}
                        </div>

                        {/* Campus Type */}
                        <div>
                          <label htmlFor="campus-type" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Institution Type <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="campus-type"
                            value={form.campusType}
                            onChange={setField('campusType')}
                            className={`w-full bg-base-50 dark:bg-base-800 border ${errors.campusType ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all cursor-pointer`}
                          >
                            <option value="">Select type</option>
                            {CAMPUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {errors.campusType && <p className="text-rose-500 text-xs mt-1">{errors.campusType}</p>}
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 2: Requester / College Admin Details ── */}
                    {/* ── SECTION 2: Requester / College Admin Details ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-base-100 dark:border-base-800">
                        <div className="w-8 h-8 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center text-accent-500 dark:text-accent-400">
                          <User size={16} />
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-base-900 dark:text-white">
                          2. Requester & Contact Details
                        </h2>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Admin Name */}
                        <div>
                          <label htmlFor="admin-name" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Applicant / Contact Name <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                            <input
                              id="admin-name"
                              type="text"
                              placeholder="Prof. Rajesh Sharma"
                              value={form.adminName}
                              onChange={setField('adminName')}
                              className={`w-full bg-base-50 dark:bg-base-800 border ${errors.adminName ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                            />
                          </div>
                          {errors.adminName && <p className="text-rose-500 text-xs mt-1">{errors.adminName}</p>}
                        </div>

                        {/* Designation */}
                        <div>
                          <label htmlFor="designation" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Your Designation / Role <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="designation"
                            value={form.designation}
                            onChange={setField('designation')}
                            className={`w-full bg-base-50 dark:bg-base-800 border ${errors.designation ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all cursor-pointer`}
                          >
                            <option value="">Select designation</option>
                            {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          {errors.designation && <p className="text-rose-500 text-xs mt-1">{errors.designation}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Contact Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                            <input
                              id="phone"
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={form.phone}
                              onChange={setField('phone')}
                              className={`w-full bg-base-50 dark:bg-base-800 border ${errors.phone ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                            />
                          </div>
                          {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        {/* Campus Size */}
                        <div>
                          <label htmlFor="campus-size" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Approximate Student Body Size
                          </label>
                          <select
                            id="campus-size"
                            value={form.campusSize}
                            onChange={setField('campusSize')}
                            className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 transition-all cursor-pointer"
                          >
                            <option value="">Select size range</option>
                            {CAMPUS_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* ── SECTION 3: Official Verification Email with OTP ── */}
                    <div className="space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-base-100 dark:border-base-800">
                        <div className="w-8 h-8 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center text-accent-500 dark:text-accent-400">
                          <Mail size={16} />
                        </div>
                        <div>
                          <h2 style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-base-900 dark:text-white">
                            3. Official Campus Email & OTP Verification
                          </h2>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Honeypot field for bot protection */}
                        <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                          <label htmlFor="onboarding-hp-field">Leave this empty</label>
                          <input
                            id="onboarding-hp-field"
                            type="text"
                            name="hp_field"
                            value={form.hp_field || ''}
                            onChange={setField('hp_field')}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>

                        {/* Official Email + Send OTP action */}
                        <div className="sm:col-span-2">
                          <label htmlFor="official-email" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Official Institutional Email <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                              <input
                                id="official-email"
                                type="email"
                                placeholder="r.sharma@somaiya.edu"
                                value={form.officialEmail}
                                onChange={setField('officialEmail')}
                                className={`w-full bg-base-50 dark:bg-base-800 border ${errors.officialEmail
                                    ? 'border-rose-300 dark:border-rose-700'
                                    : isEmailVerified
                                      ? 'border-emerald-500 dark:border-emerald-500'
                                      : 'border-base-200 dark:border-base-700'
                                  } text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
                              />
                            </div>

                            {/* Send / Resend / Verified Button beside email */}
                            {!isEmailVerified ? (
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={otpLoading || !form.officialEmail.trim()}
                                className="px-5 py-3 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-xs flex-shrink-0 flex items-center gap-1.5"
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

                          {!isEmailVerified && (
                            <TurnstileWidget onVerify={setTurnstileToken} />
                          )}

                          {/* Email validation & status indicators */}
                          {!isEmailVerified && !errors.officialEmail && !otpSent && form.emailDomain.trim() && (
                            <p className="text-base-400 dark:text-base-500 text-[11px] mt-1.5 flex items-center gap-1">
                              <span>Official address must end with</span>
                              <strong className="text-accent-500">@{form.emailDomain.trim().toLowerCase().replace(/^@/, '')}</strong>
                            </p>
                          )}
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
                            <p className="text-accent-600 dark:text-accent-400 text-xs mt-1.5 font-medium flex items-center gap-1">
                              <Mail size={13} />
                              Verification OTP code sent to <strong>{form.officialEmail}</strong>.
                            </p>
                          )}
                        </div>

                        {/* Confirm Email */}
                        <div>
                          <label htmlFor="confirm-email" className="block text-sm font-medium text-base-700 dark:text-base-300 mb-1.5">
                            Confirm Official Email <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400 pointer-events-none" />
                            <input
                              id="confirm-email"
                              type="email"
                              placeholder="Re-enter official email"
                              value={form.confirmEmail}
                              onChange={setField('confirmEmail')}
                              className={`w-full bg-base-50 dark:bg-base-800 border ${errors.confirmEmail ? 'border-rose-300 dark:border-rose-700' : 'border-base-200 dark:border-base-700'} text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-hidden focus:bg-white dark:focus:bg-base-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all`}
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
                            className="bg-accent-50/70 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-800/80 rounded-xl p-5 mt-4"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <ShieldCheck size={18} className="text-accent-500 dark:text-accent-400" />
                              <p className="text-base-900 dark:text-white text-sm font-semibold">
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
                                className="bg-white dark:bg-base-900 border border-accent-200 dark:border-accent-800 text-base-900 dark:text-white rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-[0.3em] focus:outline-hidden focus:ring-2 focus:ring-accent-500 sm:w-48"
                              />

                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={otpLoading || otp.length < 6}
                                className="px-6 py-2.5 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-1.5"
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
                                className="text-accent-500 dark:text-accent-400 text-xs font-semibold hover:underline disabled:opacity-50 disabled:no-underline px-2 text-center"
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
                      <div className="flex items-center gap-2.5 pb-3 border-b border-base-100 dark:border-base-800">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <FileCheck size={16} />
                        </div>
                        <h2 style={{ fontFamily: 'var(--font-heading)' }} className="text-lg font-bold text-base-900 dark:text-white">
                          4. Authorization Proof & Document Upload
                        </h2>
                      </div>

                      <p className="text-base-500 dark:text-base-400 text-xs leading-relaxed">
                        Upload an official document proving institution affiliation (e.g. Faculty ID Card, Official Authorization Letter, AICTE/UGC Registration Document).
                      </p>

                      {/* Drag & Drop Zone */}
                      {!proofFile ? (
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragActive
                              ? 'border-accent-500 bg-accent-50/50 dark:bg-accent-950/30'
                              : errors.proofFile
                                ? 'border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/20'
                                : 'border-base-200 dark:border-base-700 bg-base-50/60 dark:bg-base-900/60 hover:border-accent-400 dark:hover:border-accent-600'
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

                          <div className="w-12 h-12 bg-white dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs text-accent-500">
                            <UploadCloud size={24} />
                          </div>

                          <p className="text-base-800 dark:text-base-200 text-sm font-semibold mb-1">
                            Click to upload or drag & drop proof document
                          </p>
                          <p className="text-base-400 dark:text-base-500 text-xs mb-3">
                            Supported formats: PDF, PNG, JPG, WEBP (Max 5MB)
                          </p>

                          <span className="inline-block px-3 py-1 bg-white dark:bg-base-800 border border-base-200 dark:border-base-700 rounded-lg text-base-600 dark:text-base-300 text-xs font-medium shadow-xs">
                            Select Document File
                          </span>
                        </div>
                      ) : (
                        /* Selected File Preview */
                        <div className="flex items-center justify-between bg-base-50 dark:bg-base-800/80 border border-base-200 dark:border-base-700 rounded-xl p-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center text-white flex-shrink-0">
                              <FileCheck size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-base-900 dark:text-white text-sm font-semibold truncate">
                                {proofFile.name}
                              </p>
                              <p className="text-base-400 dark:text-base-500 text-xs">
                                {(proofFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for secure upload
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-2 text-base-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-white dark:hover:bg-base-700 transition-colors"
                            aria-label="Remove document"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                      {errors.proofFile && <p className="text-rose-500 text-xs mt-1">{errors.proofFile}</p>}
                    </div>

                    {/* ── SECTION 5: Declaration & Submission ── */}
                    <div className="pt-4 border-t border-base-100 dark:border-base-800 space-y-6">
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
                            className="w-4 h-4 mt-0.5 rounded border-base-300 dark:border-base-700 accent-accent-500 cursor-pointer flex-shrink-0"
                          />
                          <label htmlFor="terms-agreed" className="text-base-600 dark:text-base-400 text-xs leading-relaxed cursor-pointer select-none">
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
                        disabled={isSubmitting || !isEmailVerified || isRegistrationPaused}
                        className="w-full py-4 bg-accent-500 text-white font-semibold rounded-xl hover:bg-accent-600 active:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base shadow-xs flex items-center justify-center gap-2"
                      >
                        {isRegistrationPaused ? (
                          'Onboarding Requests Temporarily Paused'
                        ) : isSubmitting ? (
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
