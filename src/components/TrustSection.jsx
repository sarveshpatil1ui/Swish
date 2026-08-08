import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ShieldCheck, GraduationCap, Shield } from 'lucide-react'

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Verified Community',
    description: 'Only verified campus email holders can join — no outsiders, no anonymous accounts.',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    hover: 'hover:border-indigo-200 dark:hover:border-indigo-800',
  },
  {
    icon: GraduationCap,
    title: 'Campus Connections',
    description: 'Connect with students, faculty, clubs, and your entire academic community.',
    iconBg: 'bg-violet-50 dark:bg-violet-950/60',
    iconColor: 'text-violet-600 dark:text-violet-400',
    hover: 'hover:border-violet-200 dark:hover:border-violet-800',
  },
  {
    icon: Shield,
    title: 'Safe & Moderated',
    description: 'Built-in reporting and admin moderation keeps the environment respectful.',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:border-emerald-200 dark:hover:border-emerald-800',
  },
]

export default function TrustSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="trust" className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Why Swish?</p>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Built for your campus,{' '}
            <span className="text-indigo-600">not the entire internet.</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className={`bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 ${p.hover} rounded-2xl p-7 transition-all duration-200 cursor-default`}
              >
                <div className={`w-11 h-11 ${p.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon size={21} className={p.iconColor} />
                </div>
                <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-2">{p.title}</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{p.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
