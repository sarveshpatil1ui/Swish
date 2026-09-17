import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const steps = [
  {
    number: '01', title: 'Verify',
    description: 'Sign up with your campus email. Your institutional credentials confirm your identity — no outsiders allowed.',
    bg: 'bg-indigo-600', ring: 'ring-indigo-100 dark:ring-indigo-950',
  },
  {
    number: '02', title: 'Connect',
    description: 'Set up your profile and follow classmates, faculty, and campus clubs that matter to you.',
    bg: 'bg-violet-600', ring: 'ring-violet-100 dark:ring-violet-950',
  },
  {
    number: '03', title: 'Share',
    description: 'Post moments, achievements, and updates. Your audience is your campus community.',
    bg: 'bg-indigo-500', ring: 'ring-indigo-100 dark:ring-indigo-950',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="how-it-works" className="py-20 bg-slate-50/70 dark:bg-gray-900/50 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">How it works</p>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Join your campus in <span className="text-indigo-600">three simple steps.</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="hidden md:block absolute top-[46px] left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-slate-200 dark:bg-gray-700" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <div className={`relative w-24 h-24 ${step.bg} ${step.ring} ring-8 rounded-full flex flex-col items-center justify-center shadow-md mb-6 z-10`}>
                  <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase">{step.number}</span>
                  <span className="text-white font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.title}</span>
                </div>
                <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
