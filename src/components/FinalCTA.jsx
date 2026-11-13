import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, GraduationCap, Building2 } from 'lucide-react'

export default function FinalCTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="cta" className="py-20 sm:py-24 bg-white dark:bg-base-900 border-t border-base-200 dark:border-base-800 transition-colors duration-200" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-12 sm:mb-16"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-accent-500 font-semibold mb-2">
            Campus Access
          </p>
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-base-900 dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Deploy Swish for Your University
          </h2>
          <p className="text-base-500 dark:text-base-400 text-sm sm:text-base mt-3 leading-relaxed">
            Students can authenticate immediately using their institutional email. College administrations can onboard their campus domain in minutes.
          </p>
        </motion.div>

        {/* Dual Pathway Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* Card 1: Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-base-200 dark:border-base-800 bg-base-25 dark:bg-base-950 p-6 sm:p-7 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950/60 border border-accent-100 dark:border-accent-900 flex items-center justify-center text-accent-500 mb-4">
                <GraduationCap size={20} />
              </div>
              <h3 className="text-lg font-bold text-base-900 dark:text-white mb-1.5">
                Students & Faculty
              </h3>
              <p className="text-xs sm:text-sm text-base-600 dark:text-base-400 leading-relaxed mb-6">
                If your university is already registered on Swish, sign in directly with your official college email or create your campus profile.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-base-200/60 dark:border-base-800/60">
              <Link
                to="/login"
                id="final-login-link"
                className="w-full py-2.5 px-4 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium rounded-xl text-xs sm:text-sm transition-colors shadow-xs inline-flex items-center justify-center gap-2"
              >
                <span>Sign In with Campus Account</span>
                <ArrowRight size={14} />
              </Link>
              <div className="text-center">
                <Link
                  to="/join"
                  className="text-xs text-base-500 hover:text-accent-500 transition-colors"
                >
                  New to your campus? <span className="font-semibold underline">Create account →</span>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Administration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-base-200 dark:border-base-800 bg-base-25 dark:bg-base-950 p-6 sm:p-7 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 flex items-center justify-center text-base-700 dark:text-base-300 mb-4">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-base-900 dark:text-white mb-1.5">
                College Administration
              </h3>
              <p className="text-xs sm:text-sm text-base-600 dark:text-base-400 leading-relaxed mb-6">
                Student council leaders or university administrators can register their institutional email domain to establish a dedicated, private Swish instance.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-base-200/60 dark:border-base-800/60">
              <Link
                to="/college-onboarding"
                id="final-join-cta"
                className="w-full py-2.5 px-4 bg-white dark:bg-base-900 hover:bg-base-50 dark:hover:bg-base-800 text-base-900 dark:text-white border border-base-200 dark:border-base-800 font-medium rounded-xl text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Register Your College Domain</span>
                <ArrowRight size={14} />
              </Link>
              <p className="text-center text-[11px] font-mono text-base-400">
                Institutional Domain Verification Required
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
