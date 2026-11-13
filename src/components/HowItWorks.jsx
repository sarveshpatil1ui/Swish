import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Mail, KeyRound, Lock, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    step: '01',
    title: 'Domain Matching',
    subtitle: 'Authorized Institutional Email',
    description: 'Students and faculty sign up using their university-issued email. Public webmail providers (@gmail, @yahoo) cannot access the platform.',
    icon: Mail,
    badge: 'Domain Validated',
  },
  {
    step: '02',
    title: 'Identity Confirmation',
    subtitle: 'Cryptographic 6-Digit OTP',
    description: 'A time-sensitive verification code is dispatched directly to the student inbox, proving active enrollment before account activation.',
    icon: KeyRound,
    badge: 'In-Box Verification',
  },
  {
    step: '03',
    title: 'Campus Isolation',
    subtitle: 'Restricted Community Commons',
    description: 'Authenticated users enter their specific university network. Posts, notices, and directory profiles are never exposed to public internet search engines.',
    icon: Lock,
    badge: 'Closed-Loop Perimeter',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="how-it-works" className="py-20 sm:py-24 bg-white dark:bg-base-900 border-y border-base-200 dark:border-base-800 transition-colors duration-200" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-accent-500 font-semibold mb-2">
            Verification Protocol
          </p>
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-base-900 dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            How Campus Access Is Verified
          </h2>
          <p className="text-base-500 dark:text-base-400 text-sm sm:text-base mt-3 leading-relaxed">
            Swish enforces strict institutional boundaries so your campus conversations stay on campus.
          </p>
        </motion.div>

        {/* 3 Verification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((item, idx) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-base-200 dark:border-base-800 bg-base-25 dark:bg-base-950 p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-xs font-bold text-base-400 dark:text-base-500">
                      STEP {item.step}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/70 border border-accent-100 dark:border-accent-900 px-2 py-0.5 rounded">
                      <CheckCircle2 size={11} />
                      {item.badge}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-base-900 border border-base-200 dark:border-base-800 flex items-center justify-center text-accent-500 mb-4 shadow-2xs">
                    <Icon size={20} />
                  </div>

                  <h3 className="text-lg font-bold text-base-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="font-mono text-[11px] text-base-500 dark:text-base-400 mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-base-600 dark:text-base-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-base-200/60 dark:border-base-800/60 text-[11px] font-mono text-base-400 dark:text-base-500">
                  Strict Institutional Boundary
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
