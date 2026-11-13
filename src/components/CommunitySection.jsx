import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { GraduationCap, Building2, ShieldCheck, Check } from 'lucide-react'

const studentBenefits = [
  'Campus-only audience: Posts and discussions remain strictly within your university perimeter.',
  'Peer collaboration without phone numbers: Connect with classmates across departments safely.',
  'No public web indexing: Your campus profile is never scraped or made searchable on external search engines.',
  'Direct club discovery: Find hackathons, tech chapters, and campus events in one centralized feed.',
]

const adminBenefits = [
  'Authoritative notice delivery: Official circulars and exam schedules pinned directly to the student feed.',
  'High behavioral accountability: Accounts are backed by verified institutional credentials, preventing burner accounts.',
  'Campus-level governance: Dedicated portal to manage student rosters, review flagged content, and oversee safety.',
  'Departmental organization: Structured categorisation for engineering, management, sciences, and arts.',
]

export default function CommunitySection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="community" className="py-20 sm:py-24 bg-base-25 dark:bg-base-950 transition-colors duration-200" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-accent-500 font-semibold mb-2">
            Campus Architecture
          </p>
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-base-900 dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Why Universities Run on Swish
          </h2>
          <p className="text-base-500 dark:text-base-400 text-sm sm:text-base mt-3 leading-relaxed">
            Public social networks are built for engagement and advertising. Swish is designed for authenticated campus life.
          </p>
        </motion.div>

        {/* Dual Pillar: Students vs College Administration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pillar 1: Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-base-200 dark:border-base-800 bg-white dark:bg-base-900 p-7 sm:p-8 flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center text-accent-500">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent-500 font-semibold">
                    For Students & Clubs
                  </span>
                  <h3 className="text-xl font-bold text-base-900 dark:text-white">
                    Authentic Campus Connection
                  </h3>
                </div>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-base-600 dark:text-base-400">
                {studentBenefits.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-accent-50 dark:bg-accent-950/60 text-accent-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-base-100 dark:border-base-800 flex items-center justify-between text-[11px] font-mono text-base-400">
              <span>Verified Student Credentials</span>
              <span className="text-emerald-500">● Zero Ad Tracking</span>
            </div>
          </motion.div>

          {/* Pillar 2: Administration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-base-200 dark:border-base-800 bg-white dark:bg-base-900 p-7 sm:p-8 flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 flex items-center justify-center text-base-700 dark:text-base-300">
                  <Building2 size={20} />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-base-500 dark:text-base-400 font-semibold">
                    For Colleges & Faculty
                  </span>
                  <h3 className="text-xl font-bold text-base-900 dark:text-white">
                    Administrative Trust & Oversight
                  </h3>
                </div>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-base-600 dark:text-base-400">
                {adminBenefits.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-base-100 dark:border-base-800 flex items-center justify-between text-[11px] font-mono text-base-400">
              <span>College Admin Portal</span>
              <span className="text-accent-500 flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>Audited Moderation</span>
              </span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
