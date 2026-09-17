import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'

export default function FinalCTA() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="cta" className="py-24 bg-white dark:bg-gray-950 transition-colors duration-300 relative overflow-hidden" ref={ref}>
      {/* Subtle top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-slate-100 dark:bg-gray-800" />

      {/* Background radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 100%)' }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wide">
              Now accepting campus applications
            </span>
          </div>

          <h2
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="font-extrabold text-4xl sm:text-5xl text-slate-900 dark:text-white leading-tight mb-5"
          >
            Ready to make your campus{' '}
            <span className="text-indigo-600">more connected?</span>
          </h2>

          <p className="text-slate-500 dark:text-gray-400 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Join the social network built exclusively for your campus community. Verified, private, and designed for student life.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/college-onboarding"
              id="final-join-cta"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-base w-full sm:w-auto justify-center"
            >
              Join Swish
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              id="final-login-link"
              className="text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 font-medium text-sm transition-colors underline underline-offset-4"
            >
              Already a member? Log in
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-6 mt-12 flex-wrap"
        >
          {['🔒 Campus-verified only', '🎓 Students & Faculty', '🛡️ Moderated community'].map(text => (
            <span key={text} className="text-slate-400 dark:text-gray-500 text-sm">{text}</span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
