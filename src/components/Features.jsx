import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Camera, Heart, Users, Search, Bell, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: Camera, title: 'Share Campus Moments',
    description: 'Post photos, achievements, event highlights and updates with your campus community.',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60', iconColor: 'text-indigo-600 dark:text-indigo-400',
    wide: true, tags: ['Photos', 'Achievements', 'Events', 'Updates'],
  },
  {
    icon: Heart, title: 'Engage',
    description: 'Like and comment on posts from across your campus.',
    iconBg: 'bg-rose-50 dark:bg-rose-950/40', iconColor: 'text-rose-500 dark:text-rose-400',
    wide: false,
  },
  {
    icon: Users, title: 'Follow People',
    description: 'Follow classmates, faculty, and campus profiles.',
    iconBg: 'bg-violet-50 dark:bg-violet-950/60', iconColor: 'text-violet-600 dark:text-violet-400',
    wide: false,
  },
  {
    icon: Search, title: 'Explore',
    description: 'Discover trending posts, events, and people on your campus.',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40', iconColor: 'text-sky-600 dark:text-sky-400',
    wide: false,
  },
  {
    icon: Bell, title: 'Stay Updated',
    description: 'Get notified instantly for likes, comments, and new followers.',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600 dark:text-amber-400',
    wide: false,
  },
  {
    icon: ShieldCheck, title: 'Built-in Moderation',
    description: 'Report content and trust that admins keep the space appropriate.',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
    wide: false,
  },
]

export default function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="features" className="py-20 bg-slate-50/70 dark:bg-gray-900/50 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Features</p>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            Everything your campus <span className="text-indigo-600">community needs.</span>
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-base max-w-xl mx-auto">
            From sharing moments to discovering events — all the social tools your campus needs, nothing it doesn't.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                className={`bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 rounded-2xl p-6 transition-all duration-200 cursor-default ${f.wide ? 'sm:col-span-2 lg:col-span-2' : ''}`}
              >
                <div className={`w-10 h-10 ${f.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={19} className={f.iconColor} />
                </div>
                <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1.5">{f.title}</h3>
                <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">{f.description}</p>
                {f.tags && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {f.tags.map(tag => (
                      <span key={tag} className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
