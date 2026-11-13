import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Building2, BookOpen, MessageSquare, Heart, MessageCircle } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Hero() {
  const scrollTo = (id) => {
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="home" className="relative pt-28 pb-16 sm:pb-24 overflow-hidden bg-base-25 dark:bg-base-950 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* ── Top Copy & CTA Block ── */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
          
          {/* Institutional Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white dark:bg-base-900 border border-base-200 dark:border-base-800 text-base-700 dark:text-base-300 text-xs font-mono uppercase tracking-wider mb-6 shadow-2xs"
          >
            <ShieldCheck size={14} className="text-accent-500" />
            <span>Closed-Loop Campus Network</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-base-900 dark:text-white leading-[1.12] mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            The private social network <br className="hidden sm:inline" />
            <span className="text-accent-500">for your university.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-base sm:text-lg text-base-600 dark:text-base-400 leading-relaxed max-w-2xl mx-auto mb-8"
          >
            Swish connects verified students, faculty, and college administration inside an authenticated campus commons—free from external ads, public search indexing, and anonymous outsiders.
          </motion.p>

          {/* CTA Actions */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/login"
              id="hero-login-cta"
              className="w-full sm:w-auto px-6 py-3 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-xs inline-flex items-center justify-center gap-2"
            >
              <span>Sign In to Campus</span>
              <ArrowRight size={15} />
            </Link>
            
            <Link
              to="/college-onboarding"
              id="hero-join-cta"
              className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-base-900 hover:bg-base-50 dark:hover:bg-base-800 text-base-800 dark:text-base-200 border border-base-200 dark:border-base-800 font-semibold rounded-xl text-sm transition-colors inline-flex items-center justify-center gap-2"
            >
              <span>Register Your College</span>
            </Link>

            <button
              onClick={() => scrollTo('#how-it-works')}
              id="hero-explore-cta"
              className="w-full sm:w-auto px-5 py-3 text-base-600 dark:text-base-400 hover:text-base-900 dark:hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              How It Works
            </button>
          </motion.div>

          {/* Verification requirement microcopy */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="text-[12px] text-base-400 dark:text-base-500 font-mono mt-4"
          >
            Access requires an approved institutional email address (@college.edu, .ac, etc.)
          </motion.p>
        </div>

        {/* ── Realistic Product Interface Wireframe ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="relative max-w-4xl mx-auto rounded-2xl border border-base-200 dark:border-base-800 bg-white dark:bg-base-900 shadow-sm overflow-hidden"
        >
          {/* Top Window Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-base-50 dark:bg-base-850 border-b border-base-200 dark:border-base-800 text-xs text-base-500 dark:text-base-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-base-300 dark:bg-base-700" />
              <span className="font-mono text-[11px] text-base-600 dark:text-base-300 font-medium ml-2">
                swish.campus · verified instance
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Campus Domain Active</span>
            </div>
          </div>

          {/* Application Layout Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-base-100 dark:divide-base-800">
            
            {/* Left Column: Campus Channels & Filters */}
            <div className="hidden md:block md:col-span-4 p-4 bg-base-25/50 dark:bg-base-950/40 text-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-base-400 dark:text-base-500 mb-3 px-2">
                Campus Navigation
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-accent-500" />
                    <span>Campus-Wide Feed</span>
                  </div>
                  <span className="text-[10px] font-mono bg-accent-100 dark:bg-accent-900 px-1.5 py-0.2 rounded">Live</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-base-600 dark:text-base-400 hover:bg-base-100 dark:hover:bg-base-800 transition-colors">
                  <Building2 size={14} />
                  <span>Official College Notices</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-base-600 dark:text-base-400 hover:bg-base-100 dark:hover:bg-base-800 transition-colors">
                  <MessageSquare size={14} />
                  <span>Peer Messaging</span>
                </div>
              </div>

              <div className="font-mono text-[10px] uppercase tracking-wider text-base-400 dark:text-base-500 mt-6 mb-2 px-2">
                Department Filters
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {['Computer Science', 'Mechanical', 'Electrical', 'Management', 'Design'].map(dept => (
                  <span key={dept} className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-base-850 border border-base-200 dark:border-base-800 text-base-600 dark:text-base-400">
                    {dept}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Live Feed Items */}
            <div className="md:col-span-8 p-4 sm:p-5 space-y-4 bg-white dark:bg-base-900">
              
              {/* Card 1: Official College Notice (NoticeManagement.jsx format) */}
              <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                    <Building2 size={11} />
                    Official Notice · Academic Office
                  </span>
                  <span className="text-base-400 text-[11px] font-mono">Posted 2h ago</span>
                </div>
                <p className="font-semibold text-base-900 dark:text-white text-sm">
                  Schedule for Spring End-Semester Laboratory Evaluations
                </p>
                <p className="text-base-600 dark:text-base-300 mt-1 leading-relaxed text-xs">
                  All departments have finalized practical assessment slots. Schedules and lab allocation guidelines are published on departmental notice boards.
                </p>
              </div>

              {/* Card 2: Student Post (PostCard.jsx format) */}
              <div className="rounded-xl border border-base-200 dark:border-base-800 p-3.5 text-xs bg-white dark:bg-base-850">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-accent-500 text-white font-bold flex items-center justify-center text-[10px]">
                      DS
                    </div>
                    <div>
                      <p className="font-bold text-base-900 dark:text-white text-xs leading-none">
                        Devika Sen
                      </p>
                      <p className="text-[10px] text-base-400 dark:text-base-500 mt-0.5 font-mono">
                        3rd Year · B.Tech Mechanical · Robotics Club
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                    <ShieldCheck size={11} />
                    Verified Student
                  </span>
                </div>
                
                <p className="text-base-700 dark:text-base-300 text-xs leading-relaxed mb-3">
                  Telemetry testing complete on the autonomous campus delivery prototype! Huge thanks to the Electronics batch for debugging the motor controller board this morning. 🛠️
                </p>

                <div className="flex items-center gap-4 text-base-500 dark:text-base-400 pt-2 border-t border-base-100 dark:border-base-800 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-medium text-accent-500">
                    <Heart size={13} className="fill-accent-500 text-accent-500" />
                    42 campus upvotes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={13} />
                    8 peer comments
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-base-400">
                    #Engineering #CampusProjects
                  </span>
                </div>
              </div>

            </div>

          </div>
        </motion.div>

      </div>
    </section>
  )
}
