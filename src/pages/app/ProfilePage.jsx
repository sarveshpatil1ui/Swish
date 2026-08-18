import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Grid3X3, Bookmark, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'


export default function ProfilePage() {
  const { userId } = useParams()
  const { currentUser } = useSwish()
  const [activeTab, setActiveTab] = useState('posts')

  // Determine if this is the logged-in user's own profile
  const isOwnProfile = !userId || userId === 'me' || userId === currentUser?.id

  // Use real user data from context (own profile) or show not-found for others
  const profileUser = isOwnProfile ? currentUser : null

  const [followed, setFollowed] = useState(false)
  const [followerCount, setFollowerCount] = useState(profileUser?.followers ?? 0)

  const handleFollow = () => {
    setFollowed(f => {
      const next = !f
      setFollowerCount(c => next ? c + 1 : c - 1)
      return next
    })
  }

  // No posts API yet — grid is empty
  const gridItems = []

  // If visiting another user's profile with no API, show not-found
  if (!profileUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Grid3X3 size={40} className="text-slate-200 dark:text-gray-700 mx-auto mb-4" />
        <h2
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-slate-900 dark:text-white font-bold text-lg mb-2"
        >
          User not found
        </h2>
        <p className="text-slate-400 dark:text-gray-500 text-sm">
          This profile doesn't exist or isn't available yet.
        </p>
      </div>
    )
  }

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
          { label: 'Posts', value: gridItems.length },
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
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl mt-2">
          <Grid3X3 size={32} className="text-slate-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-slate-900 dark:text-white font-semibold text-sm">No posts yet</p>
          <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
            {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything."}
          </p>
        </div>
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
