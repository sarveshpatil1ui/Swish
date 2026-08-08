import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, Heart, MessageCircle, Trophy } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

function MockFeedCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">RS</div>
          <div>
            <p className="text-slate-900 dark:text-white text-xs font-semibold leading-tight">Rahul Sharma</p>
            <p className="text-slate-400 dark:text-gray-500 text-[11px]">IT · 3rd Year</p>
          </div>
        </div>
        <button className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
          Follow
        </button>
      </div>

      <div className="relative h-36 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 flex flex-col items-center justify-center gap-2 border-b border-slate-100 dark:border-gray-800">
        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
          <Trophy size={18} className="text-white" />
        </div>
        <span className="text-slate-600 dark:text-gray-300 text-xs font-semibold">Campus Hackathon 2026</span>
        <div className="absolute top-2.5 right-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
          🏆 1st Place
        </div>
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          <span className="bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">#Hackathon</span>
          <span className="bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">#Build</span>
        </div>
      </div>

      <div className="px-4 py-2.5">
        <p className="text-slate-700 dark:text-gray-300 text-xs leading-relaxed">From idea to first place 🏆 What a day! Grateful for the team 🔥</p>
      </div>

      <div className="flex items-center gap-4 px-4 pb-3">
        <button className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors group">
          <Heart size={14} className="group-hover:fill-rose-500 transition-all" />
          <span className="text-[11px] font-medium">128</span>
        </button>
        <button className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-500 transition-colors">
          <MessageCircle size={14} />
          <span className="text-[11px] font-medium">24</span>
        </button>
      </div>
    </div>
  )
}

function MockProfileCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">PS</div>
        <div>
          <p className="text-slate-900 dark:text-white text-sm font-semibold">Priya Singhal</p>
          <p className="text-slate-400 dark:text-gray-500 text-[11px]">Computer Science · 2nd Year</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-gray-800 bg-slate-50 dark:bg-gray-800/60 rounded-xl p-3 mb-3">
        {[['47', 'Posts'], ['312', 'Followers'], ['98', 'Following']].map(([val, label]) => (
          <div key={label} className="text-center px-1">
            <p className="text-slate-900 dark:text-white font-bold text-sm">{val}</p>
            <p className="text-slate-400 dark:text-gray-500 text-[10px]">{label}</p>
          </div>
        ))}
      </div>
      <button className="w-full py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
        Follow
      </button>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="home" className="relative pt-28 pb-20 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-300">
      <div
        className="absolute top-0 inset-x-0 h-72 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.08) 0%, transparent 100%)' }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Copy */}
          <div className="order-2 lg:order-1">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-full px-3.5 py-1.5 mb-5"
            >
              <Lock size={11} className="text-indigo-500 dark:text-indigo-400" />
              <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold tracking-wide uppercase">
                Verified campus users only
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-extrabold text-4xl sm:text-5xl lg:text-[52px] leading-[1.1] tracking-tight text-slate-900 dark:text-white mb-5"
            >
              Your Campus.{' '}
              <br className="hidden sm:block" />
              Your Community.{' '}
              <br className="hidden sm:block" />
              <span className="text-indigo-600">Your Swish.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="text-slate-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed max-w-lg mb-8"
            >
              A private social space built exclusively for your campus. Share moments, celebrate achievements, connect with classmates, and discover what's happening around you.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/join"
                id="hero-join-cta"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm"
              >
                Join Your Campus
                <ArrowRight size={16} />
              </Link>
              <button
                id="hero-explore-cta"
                onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3 text-slate-700 dark:text-gray-300 font-semibold border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all text-sm"
              >
                Explore Swish
              </button>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="flex items-center gap-3 mt-7"
            >
              <div className="flex -space-x-2">
                {[['AS','#6366f1'],['KM','#8b5cf6'],['RJ','#0ea5e9'],['PP','#f59e0b']].map(([init, color], i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-950 flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: color }}>
                    {init}
                  </div>
                ))}
              </div>
              <p className="text-slate-400 dark:text-gray-500 text-sm">
                <span className="text-slate-800 dark:text-gray-200 font-semibold">2,400+</span> campus members already joined
              </p>
            </motion.div>
          </div>

          {/* Right: Mockup */}
          <div className="order-1 lg:order-2 relative flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm"
            >
              <div
                className="absolute -inset-6 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.07) 0%, transparent 70%)' }}
              />
              <div className="relative space-y-3">
                <MockProfileCard />
                <MockFeedCard />
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
                className="absolute -right-4 lg:-right-10 top-[18%] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2"
              >
                <span className="text-sm">❤️</span>
                <p className="text-slate-700 dark:text-gray-300 text-xs font-medium whitespace-nowrap">Priya liked your post</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="absolute -left-4 lg:-left-10 bottom-[22%] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2"
              >
                <span className="text-sm">👤</span>
                <p className="text-slate-700 dark:text-gray-300 text-xs font-medium whitespace-nowrap">Aarav started following you</p>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-slate-100 dark:bg-gray-800" />
    </section>
  )
}
