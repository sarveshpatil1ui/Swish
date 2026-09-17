import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Lock, Shield, UserCheck, ImageOff, Flag, Settings } from 'lucide-react'

const points = [
  { icon: UserCheck, title: 'Verified Campus Access', description: 'Only users with valid campus credentials can create an account.' },
  { icon: Lock, title: 'Secure Authentication', description: 'JWT-based auth with role-based access control for all users.' },
  { icon: Shield, title: 'Role-Based Permissions', description: 'Students, faculty, and admins each have distinct access levels.' },
  { icon: ImageOff, title: 'Protected Image Uploads', description: 'Images are processed securely and never publicly indexed.' },
  { icon: Flag, title: 'Content Reporting', description: 'Report inappropriate content directly from any post.' },
  { icon: Settings, title: 'Admin Moderation', description: 'Trained campus admins review reports and manage user safety.' },
]

export default function SecuritySection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="security" className="py-24 bg-slate-50/70 dark:bg-gray-900/50 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Rings */}
              <div className="w-60 h-60 sm:w-64 sm:h-64 rounded-full border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center">
                <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center">
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-md"
                    style={{ boxShadow: '0 0 30px rgba(99,102,241,0.12)' }}
                  >
                    <Lock size={36} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Orbit dots */}
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <div
                  key={i}
                  className="absolute w-2.5 h-2.5 rounded-full bg-indigo-400 dark:bg-indigo-600"
                  style={{ top: '50%', left: '50%', transform: `rotate(${deg}deg) translateX(120px) translateY(-50%)` }}
                />
              ))}

              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 }}
                className="absolute -right-6 top-6 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 shadow-sm"
              >
                <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">🔒 End-to-end verified</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.7 }}
                className="absolute -left-6 bottom-6 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 shadow-sm"
              >
                <p className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">✅ Campus-only access</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Points */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="mb-9"
            >
              <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Privacy & Security</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
                Your campus. <span className="text-indigo-600">Your privacy.</span>
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-base leading-relaxed">
                Swish is designed with privacy and campus safety as core principles — not afterthoughts.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-3">
              {points.map((p, i) => {
                const Icon = p.icon
                return (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.07 }}
                    className="flex gap-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl p-4 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-slate-800 dark:text-gray-200 text-xs font-semibold mb-0.5">{p.title}</p>
                      <p className="text-slate-400 dark:text-gray-500 text-xs leading-relaxed">{p.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
