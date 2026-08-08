import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Grid3X3, Bookmark, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { users, posts } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

const gridGradients = [
  ['#eef2ff','#ede9fe','#1e1b4b','#2e1065'],
  ['#fdf4ff','#fce7f3','#2d1b69','#4a1942'],
  ['#e0f2fe','#e0f7fa','#0c4a6e','#164e63'],
  ['#ecfdf5','#d1fae5','#064e3b','#0f3460'],
  ['#fefce8','#fef9c3','#422006','#3f3106'],
  ['#fff1f2','#ffe4e6','#4c0519','#3b0f1e'],
  ['#f0fdf4','#dcfce7','#052e16','#14532d'],
  ['#fef3c7','#fde68a','#451a03','#3c1a00'],
  ['#f5f3ff','#ede9fe','#2e1065','#1e1b4b'],
]
const emojis = ['🏆','🎉','🚀','📚','⚽','🎨','🤖','💡','🎓']

function ProfileGridItem({ item, index }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      whileHover={{ scale: 1.03 }}
      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-slate-100 dark:bg-gray-800"
    >
      {/* Background Image / Fallback */}
      {item.imageUrl && !error ? (
        <>
          <img
            src={item.imageUrl}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {!loaded && <div className="absolute inset-0 bg-slate-200 dark:bg-gray-800 animate-pulse" />}
        </>
      ) : (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${item.gradientFromDark || item.gradientFrom}, ${item.gradientToDark || item.gradientTo})` }}
        >
          <span className="text-4xl">{item.emoji}</span>
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all" />
    </motion.div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('posts')

  const profileUser = userId === 'user-1'
    ? { ...users[0], ...currentUser }
    : users.find(u => u.id === userId) || users[1]

  const isOwnProfile = userId === 'user-1' || userId === currentUser?.id

  const [followed, setFollowed] = useState(false)
  const [followerCount, setFollowerCount] = useState(profileUser.followers)

  const handleFollow = () => {
    setFollowed(f => {
      const next = !f
      setFollowerCount(c => next ? c + 1 : c - 1)
      return next
    })
  }

  // Generate post grid for this user
  const userPostCount = profileUser.posts || 9
  const gridItems = Array.from({ length: userPostCount }, (_, i) => {
    const realPost = posts[i % posts.length]
    return {
      id: `${profileUser.id}-grid-${i}`,
      emoji: emojis[i % emojis.length],
      imageUrl: realPost.imageUrl,
      ...(() => {
        const [f, t, fd, td] = gridGradients[i % gridGradients.length]
        return { gradientFrom: f, gradientTo: t, gradientFromDark: fd, gradientToDark: td }
      })(),
    }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 mb-5"
      >
        {/* Top row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 mb-5 text-center sm:text-left">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md"
            style={{ backgroundColor: profileUser.avatarColor }}
          >
            {profileUser.initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 w-full">
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-xl leading-tight">
                  {profileUser.name}
                </h1>
                <p className="text-slate-400 dark:text-gray-500 text-sm mt-0.5">@{profileUser.username}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                {isOwnProfile ? (
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all">
                    <Settings size={15} />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                      followed
                        ? 'border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-800'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    {followed ? 'Following ✓' : 'Follow'}
                  </button>
                )}
              </div>
            </div>

            {/* Dept + year */}
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mt-2">
              {profileUser.dept} · {profileUser.year}
            </p>

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-slate-600 dark:text-gray-300 text-sm mt-2 leading-relaxed">{profileUser.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-gray-800 bg-slate-50 dark:bg-gray-800/50 rounded-xl py-3">
          {[
            { label: 'Posts', value: userPostCount },
            { label: 'Followers', value: followerCount },
            { label: 'Following', value: profileUser.following },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg">
                {stat.value}
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 p-1 rounded-xl mb-5">
        {[
          { id: 'posts', icon: Grid3X3, label: 'Posts' },
          { id: 'saved', icon: Bookmark, label: 'Saved' },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Post grid */}
      {activeTab === 'posts' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-3 gap-1.5"
        >
          {gridItems.map((item, i) => (
            <ProfileGridItem key={item.id} item={item} index={i} />
          ))}
        </motion.div>
      )}

      {activeTab === 'saved' && (
        <div className="text-center py-16">
          <Bookmark size={32} className="text-slate-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-gray-500 text-sm">
            {isOwnProfile ? 'Posts you save will appear here.' : 'Saved posts are private.'}
          </p>
        </div>
      )}
    </div>
  )
}
