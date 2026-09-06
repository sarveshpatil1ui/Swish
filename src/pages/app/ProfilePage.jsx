import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Grid3X3, Bookmark, Settings, Loader2, Camera, Heart, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import EditProfileModal from '../../components/app/EditProfileModal'
import FollowListModal from '../../components/app/FollowListModal'
import PostViewerModal from '../../components/app/PostViewerModal'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n ?? 0)
}

// ── Skeleton loader ──────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <div className="h-5 w-32 bg-slate-200 dark:bg-gray-700 rounded-lg mx-auto sm:mx-0" />
            <div className="h-3 w-24 bg-slate-200 dark:bg-gray-700 rounded-lg mx-auto sm:mx-0" />
            <div className="h-3 w-48 bg-slate-200 dark:bg-gray-700 rounded-lg mx-auto sm:mx-0" />
            <div className="h-9 w-28 bg-slate-200 dark:bg-gray-700 rounded-xl mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-slate-200 dark:bg-gray-800 rounded-xl" />)}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { currentUser, fetchProfile, followUser, unfollowUser, posts } = useSwish()
  const [activeTab, setActiveTab] = useState('posts')
  const [showEditModal, setShowEditModal] = useState(false)
  const [followListMode, setFollowListMode] = useState(null) // 'followers' | 'following' | null
  const [viewingPost, setViewingPost] = useState(null)

  const isOwnProfile = !userId || userId === 'me' || userId === currentUser?.id
  const targetUserId = isOwnProfile ? currentUser?.id : userId

  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [notFound, setNotFound]       = useState(false)

  const [followed, setFollowed]           = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!targetUserId) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    fetchProfile(targetUserId).then(res => {
      if (cancelled) return
      if (res.ok) {
        setProfileUser(res.user)
        setFollowed(Boolean(res.user.isFollowing))
        setFollowerCount(res.user.followers ?? 0)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [targetUserId, fetchProfile])

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setProfileUser(prev => prev ? { ...prev, ...currentUser } : prev)
    }
  }, [isOwnProfile, currentUser])

  const handleFollow = async () => {
    if (followLoading || !profileUser) return
    // Optimistic
    const wasFollowed = followed
    setFollowed(!wasFollowed)
    setFollowerCount(c => wasFollowed ? Math.max(0, c - 1) : c + 1)
    setFollowLoading(true)

    const result = wasFollowed
      ? await unfollowUser(profileUser.id)
      : await followUser(profileUser.id)
    setFollowLoading(false)

    if (!result.ok) {
      // Rollback
      setFollowed(wasFollowed)
      setFollowerCount(c => wasFollowed ? c + 1 : Math.max(0, c - 1))
    } else if (typeof result.followerCount === 'number') {
      setFollowerCount(result.followerCount)
    }
  }

  const gridItems = posts.filter(post => post.userId === targetUserId)

  if (loading) return <ProfileSkeleton />

  if (notFound || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Grid3X3 size={40} className="text-slate-200 dark:text-gray-700 mx-auto mb-4" />
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg mb-2">
          User not found
        </h2>
        <p className="text-slate-400 dark:text-gray-500 text-sm">
          This profile doesn't exist or isn't available.
        </p>
      </div>
    )
  }

  const avatarSrc = profileUser.profilePhoto
    ? (profileUser.profilePhoto.startsWith('blob:') ? profileUser.profilePhoto
       : profileUser.profilePhoto.startsWith('/uploads/') ? `${API_BASE}${profileUser.profilePhoto}`
       : profileUser.profilePhoto)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 mb-5"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profileUser.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-white dark:ring-gray-900 shadow-lg"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ring-4 ring-white dark:ring-gray-900 shadow-lg"
                style={{ backgroundColor: profileUser.avatarColor }}
              >
                {profileUser.initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 w-full text-center sm:text-left">
            {/* Top row: name + action */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 mb-2">
              <div>
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-xl leading-tight">
                  {profileUser.name}
                </h1>
                <p className="text-slate-400 dark:text-gray-500 text-sm mt-0.5">@{profileUser.username}</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-center">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <Settings size={15} />
                    Edit Profile
                  </button>
                ) : (
                  <motion.button
                    onClick={handleFollow}
                    disabled={followLoading}
                    whileTap={{ scale: 0.95 }}
                    className={`px-6 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      followed
                        ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    {followed ? 'Following' : 'Follow'}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Dept / Year */}
            {(profileUser.dept || profileUser.year) && (
              <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-1">
                {[profileUser.dept, profileUser.year].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">{profileUser.bio}</p>
            )}

            {/* Join date */}
            {profileUser.createdAt && (
              <p className="text-slate-300 dark:text-gray-600 text-xs mt-1.5">
                Joined {new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 mt-5 border-t border-slate-100 dark:border-gray-800 pt-4">
          {[
            { label: 'Posts', value: gridItems.length, action: null },
            { label: 'Followers', value: followerCount, action: () => setFollowListMode('followers') },
            { label: 'Following', value: profileUser.following, action: () => setFollowListMode('following') },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={stat.action}
              disabled={!stat.action}
              className="text-center py-1 group disabled:cursor-default"
            >
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {formatCount(stat.value)}
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-xs font-medium">{stat.label}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
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
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
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

      {/* ── Post Grid ──────────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        gridItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl"
          >
            <div className="w-16 h-16 border-2 border-slate-200 dark:border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={28} className="text-slate-300 dark:text-gray-600" />
            </div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg mb-1">
              {isOwnProfile ? 'Share your first post' : 'No posts yet'}
            </h3>
            <p className="text-slate-400 dark:text-gray-500 text-sm max-w-xs mx-auto">
              {isOwnProfile
                ? "When you share photos, they'll appear on your profile."
                : "This user hasn't posted anything yet."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            {gridItems.map(post => (
              <motion.div
                key={post.id}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15 }}
                onClick={() => setViewingPost(post)}
                className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden cursor-pointer group bg-slate-100 dark:bg-gray-800"
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                    <p className="text-xs text-indigo-800 dark:text-indigo-200 line-clamp-3 font-medium text-center">
                      {post.caption || post.emoji}
                    </p>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white">
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <Heart size={16} className="fill-white" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    <MessageCircle size={16} className="fill-white" /> {post.commentCount}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {activeTab === 'saved' && (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
          <div className="w-16 h-16 border-2 border-slate-200 dark:border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bookmark size={28} className="text-slate-300 dark:text-gray-600" />
          </div>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg mb-1">
            Save
          </h3>
          <p className="text-slate-400 dark:text-gray-500 text-sm">
            {isOwnProfile ? 'Posts you save will appear here.' : 'Saved posts are private.'}
          </p>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal onClose={() => setShowEditModal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {followListMode && (
          <FollowListModal
            userId={targetUserId}
            mode={followListMode}
            onClose={() => setFollowListMode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPost && (
          <PostViewerModal
            post={viewingPost}
            onClose={() => setViewingPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
