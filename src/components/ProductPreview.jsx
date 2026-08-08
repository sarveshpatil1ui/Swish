import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Home, Compass, SquarePlus, Bell, User, Heart, MessageCircle, TrendingUp, UserPlus } from 'lucide-react'

const sidebarLinks = [
  { icon: Home, label: 'Home', active: true },
  { icon: Compass, label: 'Explore' },
  { icon: SquarePlus, label: 'Create' },
  { icon: Bell, label: 'Notifications', badge: '3' },
  { icon: User, label: 'Profile' },
]

const feedPosts = [
  {
    initials: 'AK', name: 'Ananya Kapoor', dept: 'Design · Final Year', color: '#6366f1',
    tag: '#DesignFest', emoji: '🎨',
    caption: 'Showcased our UI project at DesignFest today! The feedback was incredible 🙌',
    likes: 94, comments: 17, bgLight: 'from-indigo-50 to-violet-50', bgDark: 'dark:from-indigo-950/50 dark:to-violet-950/50',
  },
  {
    initials: 'RV', name: 'Rohan Verma', dept: 'Mechanical · 2nd Year', color: '#0ea5e9',
    tag: '#Robotics', emoji: '🤖',
    caption: 'Robotics club session — built something wild today. More soon!',
    likes: 71, comments: 9, bgLight: 'from-sky-50 to-cyan-50', bgDark: 'dark:from-sky-950/50 dark:to-cyan-950/50',
  },
]

const trending = [
  { tag: '#CampusHackathon', posts: '128 posts' },
  { tag: '#FreshersWeek', posts: '94 posts' },
  { tag: '#TechFest', posts: '76 posts' },
  { tag: '#PlacementSeason', posts: '63 posts' },
]

const suggested = [
  { initials: 'SJ', name: 'Sneha Joshi', role: 'CSE · 3rd Year', color: '#f59e0b' },
  { initials: 'MB', name: 'Mihir Bose', role: 'MBA · 1st Year', color: '#10b981' },
  { initials: 'NK', name: 'Neha Kulkarni', role: 'Arts · 2nd Year', color: '#8b5cf6' },
]

function FeedPost({ post, delay, inView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 overflow-hidden"
    >
      <div className="flex items-center gap-2 p-3 border-b border-slate-50 dark:border-gray-800">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: post.color }}>
          {post.initials}
        </div>
        <div className="min-w-0">
          <p className="text-slate-800 dark:text-gray-200 text-[11px] font-semibold truncate">{post.name}</p>
          <p className="text-slate-400 dark:text-gray-500 text-[10px] truncate">{post.dept}</p>
        </div>
      </div>
      <div className={`h-24 bg-gradient-to-br ${post.bgLight} ${post.bgDark} flex items-center justify-center relative`}>
        <span className="text-3xl">{post.emoji}</span>
        <span className="absolute bottom-1.5 left-1.5 bg-white dark:bg-gray-800 text-slate-400 dark:text-gray-400 text-[9px] px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">
          {post.tag}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-slate-600 dark:text-gray-300 text-[10px] leading-relaxed mb-2 line-clamp-2">{post.caption}</p>
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-slate-400 text-[10px]"><Heart size={9} className="text-rose-400 fill-rose-400" /> {post.likes}</span>
          <span className="flex items-center gap-1 text-slate-400 text-[10px]"><MessageCircle size={9} className="text-indigo-400" /> {post.comments}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function ProductPreview() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="preview" className="py-20 bg-white dark:bg-gray-950 transition-colors duration-300" ref={ref}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Product</p>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-4">
            A social experience designed <span className="text-indigo-600">for campus life.</span>
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-base max-w-xl mx-auto">
            Built with real campus workflows in mind — not a one-size-fits-all social feed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Browser chrome */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-gray-700" />
              </div>
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-md px-3 py-1.5 text-slate-400 dark:text-gray-500 text-xs font-medium border border-slate-200 dark:border-gray-700">
                app.swish.campus
              </div>
            </div>

            <div className="flex h-[460px] sm:h-[500px]">
              {/* Sidebar */}
              <div className="w-14 lg:w-48 border-r border-slate-100 dark:border-gray-800 flex flex-col py-4 bg-white dark:bg-gray-950 flex-shrink-0">
                <div className="px-3 lg:px-4 mb-6 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                    <span className="text-xs font-bold">S</span>
                  </div>
                  <span className="hidden lg:block text-slate-900 dark:text-white font-bold text-sm">Swish</span>
                </div>
                {sidebarLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <div key={link.label} className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 mx-2 rounded-xl mb-0.5 cursor-default ${link.active ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-300'} transition-colors`}>
                      <Icon size={17} className="flex-shrink-0" />
                      <span className="hidden lg:block text-sm font-medium">{link.label}</span>
                      {link.badge && (
                        <span className="hidden lg:flex ml-auto w-5 h-5 bg-indigo-600 rounded-full text-white text-[10px] font-bold items-center justify-center">{link.badge}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-gray-900/40" style={{ scrollbarWidth: 'none' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-800 dark:text-gray-200 font-semibold text-sm">Campus Feed</p>
                  <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-default">Following</span>
                </div>
                {feedPosts.map((post, i) => (
                  <FeedPost key={i} post={post} delay={0.2 + i * 0.1} inView={inView} />
                ))}
              </div>

              {/* Right panel */}
              <div className="hidden xl:flex w-60 flex-col bg-white dark:bg-gray-950 border-l border-slate-100 dark:border-gray-800 p-4 gap-5 overflow-y-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                <div>
                  <p className="text-slate-800 dark:text-gray-200 font-semibold text-xs mb-3 flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-indigo-500" /> Trending on Campus
                  </p>
                  <div className="space-y-2.5">
                    {trending.map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium cursor-default">{t.tag}</span>
                        <span className="text-slate-400 dark:text-gray-500 text-[10px]">{t.posts}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-slate-800 dark:text-gray-200 font-semibold text-xs mb-3 flex items-center gap-1.5">
                    <UserPlus size={12} className="text-indigo-500" /> Suggested People
                  </p>
                  <div className="space-y-3">
                    {suggested.map((u, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: u.color }}>
                          {u.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-700 dark:text-gray-300 text-[11px] font-semibold truncate">{u.name}</p>
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] truncate">{u.role}</p>
                        </div>
                        <button className="text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold flex-shrink-0 transition-colors">Follow</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          {[
            { side: 'left', delay: 0.7, icon: '❤️', text: 'Priya liked your post', sub: '2 minutes ago', pos: '-left-5 top-[25%]' },
            { side: 'right', delay: 0.9, icon: '🔥', text: 'Campus Hackathon trending', sub: '128 posts this week', pos: '-right-5 top-[42%]' },
            { side: 'right', delay: 1.1, icon: '👤', text: 'Aarav started following you', sub: 'Just now', pos: '-right-5 bottom-[18%]' },
          ].map(({ delay, icon, text, sub, pos, side }) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: side === 'left' ? -16 : 16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay }}
              className={`absolute ${pos} bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-lg hidden lg:flex items-center gap-3`}
            >
              <div className="w-8 h-8 bg-slate-50 dark:bg-gray-800 rounded-full flex items-center justify-center">{icon}</div>
              <div>
                <p className="text-slate-800 dark:text-gray-200 text-xs font-semibold">{text}</p>
                <p className="text-slate-400 dark:text-gray-500 text-[10px]">{sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
