import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  BookOpen, Building2, MessageSquare,
  Users, Radio, ShieldCheck,
} from 'lucide-react'

const capabilities = [
  {
    icon: BookOpen,
    title: 'Department & Batch Feeds',
    description: 'Filter discussions by academic branch (Computer Science, Mechanical, Management, etc.) or browse campus-wide updates across all semesters.',
    badge: 'Department-Scoped',
  },
  {
    icon: Building2,
    title: 'Official College Notices',
    description: 'Critical announcements, exam schedules, and departmental advisories published directly by authorized college administrators and academic deans.',
    badge: 'Administrative Broadcast',
  },
  {
    icon: MessageSquare,
    title: 'Direct Peer Messaging',
    description: 'Real-time 1-on-1 messaging with verified classmates powered by instant socket communication. Collaborate on coursework without exchanging phone numbers.',
    badge: 'Real-Time Socket',
  },
  {
    icon: Users,
    title: 'Clubs & Student Societies',
    description: 'Technical chapters, student council bodies, and cultural clubs have dedicated spaces to announce events, hackathons, and member recruitments.',
    badge: 'Campus Organizations',
  },
  {
    icon: Radio,
    title: '24-Hour Campus Stories',
    description: 'Share ephemeral moments, lab updates, cultural rehearsals, and sports events with students across your university campus.',
    badge: 'Campus Stories',
  },
  {
    icon: ShieldCheck,
    title: 'Institutional Moderation',
    description: 'Because every user is tied to verified campus credentials, accountability is high. In-app reporting and dedicated college admin portals keep interactions respectful.',
    badge: 'Role-Based Moderation',
  },
]

export default function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="features" className="py-20 sm:py-24 bg-base-25 dark:bg-base-950 transition-colors duration-200" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <p className="font-mono text-xs uppercase tracking-wider text-accent-500 font-semibold mb-2">
            Campus Capabilities
          </p>
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-base-900 dark:text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Built for How Universities Actually Function
          </h2>
          <p className="text-base-500 dark:text-base-400 text-sm sm:text-base mt-3 leading-relaxed">
            Real campus utility—from project collaboration with batchmates to official administrative circulars.
          </p>
        </motion.div>

        {/* 6 Capabilities Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c, i) => {
            const Icon = c.icon
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white dark:bg-base-900 border border-base-200 dark:border-base-800 rounded-2xl p-6 flex flex-col justify-between hover:border-base-300 dark:hover:border-base-700 transition-colors shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 flex items-center justify-center text-accent-500">
                      <Icon size={19} />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-base-500 dark:text-base-400 bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 px-2 py-0.5 rounded">
                      {c.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-base-900 dark:text-white mb-2">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-base-600 dark:text-base-400 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-base-100 dark:border-base-800 text-[11px] font-mono text-base-400">
                  Verified Feature
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
