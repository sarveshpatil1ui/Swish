import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const types = [
  {
    emoji: '🎓', title: 'Students',
    description: 'Share projects, celebrate wins, and stay connected with batchmates across departments.',
    stat: '2,100+ students', hover: 'hover:border-indigo-200 dark:hover:border-indigo-800',
    statCls: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900',
  },
  {
    emoji: '👨‍🏫', title: 'Faculty',
    description: 'Engage with students beyond the classroom and share academic insights.',
    stat: '180+ faculty', hover: 'hover:border-violet-200 dark:hover:border-violet-800',
    statCls: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-100 dark:border-violet-900',
  },
  {
    emoji: '🏆', title: 'Clubs & Communities',
    description: 'Keep members updated and grow your club with event posts and announcements.',
    stat: '60+ clubs', hover: 'hover:border-amber-200 dark:hover:border-amber-800',
    statCls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900',
  },
  {
    emoji: '🎉', title: 'Campus Events',
    description: 'Discover upcoming fests, hackathons, and social gatherings on campus.',
    stat: 'Events daily', hover: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    statCls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900',
  },
]

export default function CommunitySection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="community" className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Community</p>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-5 leading-tight">
              One community. <span className="text-indigo-600">Every side of campus life.</span>
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-base leading-relaxed mb-7">
              Whether you're sharing a project win, discovering a campus event, celebrating your team, or simply keeping up with friends — Swish brings campus life together.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Private', 'Verified', 'Moderated', 'Campus-only'].map(b => (
                <span key={b} className="text-slate-600 dark:text-gray-400 text-xs font-medium border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/60 px-3.5 py-1.5 rounded-full">
                  {b}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {types.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                className={`bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 ${t.hover} rounded-2xl p-5 transition-all duration-200 cursor-default`}
              >
                <div className="text-2xl mb-3">{t.emoji}</div>
                <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-1.5">{t.title}</h3>
                <p className="text-slate-400 dark:text-gray-500 text-xs leading-relaxed mb-3">{t.description}</p>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${t.statCls}`}>{t.stat}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
