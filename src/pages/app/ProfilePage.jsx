import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Grid3X3, Bookmark, Settings, Loader2, Camera, Heart, MessageCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
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
      <div className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-base-100 dark:bg-base-800 flex-shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <div className="h-5 w-32 bg-base-100 dark:bg-base-800 rounded-lg mx-auto sm:mx-0" />
            <div className="h-3 w-24 bg-base-100 dark:bg-base-800 rounded-lg mx-auto sm:mx-0" />
            <div className="h-3 w-48 bg-base-100 dark:bg-base-800 rounded-lg mx-auto sm:mx-0" />
            <div className="h-9 w-28 bg-base-100 dark:bg-base-800 rounded-xl mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-base-50 dark:bg-base-850 rounded-xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-base-100 dark:bg-base-850 rounded-xl" />)}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const { currentUser, fetchProfile, followUser, unfollowUser, fetchPosts, posts } = useSwish()
  const { on, off } = useSocket()
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
  const [requested, setRequested]         = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [isPostsUpdating, setIsPostsUpdating] = useState(false)

  useEffect(() => {
    if (!targetUserId) return
    let cancelled = false
    if (isOwnProfile && currentUser) {
      setProfileUser(currentUser)
      setFollowed(Boolean(currentUser.isFollowing))
      setRequested(false)
      setFollowerCount(currentUser.followers ?? 0)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setNotFound(false)

    fetchProfile(targetUserId).then(res => {
      if (cancelled) return
      if (res.ok) {
        setProfileUser(res.user)
        setFollowed(Boolean(res.user.isFollowing))
        setRequested(Boolean(res.user.isRequested))
        setFollowerCount(res.user.followers ?? 0)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [targetUserId, fetchProfile, isOwnProfile, currentUser])

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setProfileUser(prev => prev ? { ...prev, ...currentUser } : prev)
    }
  }, [isOwnProfile, currentUser])

  // Real-time sync for follow requests accepted or rejected
  useEffect(() => {
    if (!on || !off || !targetUserId) return

    const handleRequestAccepted = (data) => {
      if (data.byUserId === targetUserId) {
        setFollowed(true)
        setRequested(false)
        setFollowerCount(c => c + 1)
        setProfileUser(prev => prev ? { ...prev, isFollowing: true, isRequested: false, canViewPosts: true } : prev)
        fetchPosts()
      }
    }

    const handleRequestRejected = (data) => {
      if (data.byUserId === targetUserId) {
        setFollowed(false)
        setRequested(false)
        setProfileUser(prev => prev ? { ...prev, isRequested: false } : prev)
      }
    }

    on('follow_request:accepted', handleRequestAccepted)
    on('follow_request:rejected', handleRequestRejected)

    return () => {
      off('follow_request:accepted', handleRequestAccepted)
      off('follow_request:rejected', handleRequestRejected)
    }
  }, [on, off, targetUserId, fetchPosts])

  const handleFollow = async () => {
    if (followLoading || !profileUser) return

    // Case 1: Already following -> Unfollow
    if (followed) {
      setFollowed(false)
      setFollowerCount(c => Math.max(0, c - 1))
      setFollowLoading(true)
      const result = await unfollowUser(profileUser.id)
      setFollowLoading(false)
      if (!result.ok) {
        setFollowed(true)
        setFollowerCount(c => c + 1)
      } else {
        if (typeof result.followerCount === 'number') {
          setFollowerCount(result.followerCount)
        }
        setIsPostsUpdating(true)
        setProfileUser(prev => prev ? {
          ...prev,
          isFollowing: false,
          canViewPosts: !prev.isPrivate && !prev.preferences?.privacy?.private,
        } : prev)
        setIsPostsUpdating(false)
      }
      return
    }

    // Case 2: Already requested -> Cancel follow request
    if (requested) {
      setRequested(false)
      setFollowLoading(true)
      const result = await unfollowUser(profileUser.id)
      setFollowLoading(false)
      if (!result.ok) {
        setRequested(true)
      } else {
        setProfileUser(prev => prev ? { ...prev, isRequested: false } : prev)
      }
      return
    }

    // Case 3: Neither -> Send follow or request
    const isTargetPrivate = Boolean(profileUser.isPrivate || profileUser.preferences?.privacy?.private)
    if (isTargetPrivate) {
      setRequested(true)
      setFollowLoading(true)
      const result = await followUser(profileUser.id)
      setFollowLoading(false)
      if (!result.ok) {
        setRequested(false)
      } else {
        setProfileUser(prev => prev ? { ...prev, isRequested: true } : prev)
      }
    } else {
      setFollowed(true)
      setFollowerCount(c => c + 1)
      setFollowLoading(true)
      const result = await followUser(profileUser.id)
      setFollowLoading(false)
      if (!result.ok) {
        setFollowed(false)
        setFollowerCount(c => Math.max(0, c - 1))
      } else {
        if (typeof result.followerCount === 'number') {
          setFollowerCount(result.followerCount)
        }
        setIsPostsUpdating(true)
        setProfileUser(prev => prev ? {
          ...prev,
          isFollowing: true,
          canViewPosts: true,
        } : prev)
        try {
          await fetchPosts()
        } finally {
          setIsPostsUpdating(false)
        }
      }
    }
  }

  const gridItems = posts.filter(post => post.userId === targetUserId)
  const savedItems = isOwnProfile ? posts.filter(post => post.saved) : []

  if (loading) return <ProfileSkeleton />

  if (notFound || !profileUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Grid3X3 size={40} className="text-base-300 dark:text-base-700 mx-auto mb-4" />
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-lg mb-2">
          User not found
        </h2>
        <p className="text-base-400 dark:text-base-500 text-sm">
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

  const isVerified = Boolean(
    profileUser.verifiedBadge ||
    profileUser.isEmailVerified ||
    ['admin', 'college_admin', 'faculty'].includes(profileUser.role)
  )
  const verifyColor = profileUser.role === 'faculty'
    ? '#15803D'
    : ['admin', 'college_admin'].includes(profileUser.role)
    ? '#D97706'
    : '#5B5FEF'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-5 sm:p-6 mb-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profileUser.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-white dark:ring-base-900 shadow-sm"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ring-4 ring-white dark:ring-base-900 shadow-sm"
                style={{ backgroundColor: profileUser.avatarColor || '#5B5FEF' }}
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
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                  <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-xl leading-tight">
                    {profileUser.name}
                  </h1>
                  {isVerified && (
                    <span
                      className="sw-verified-dot"
                      style={{ backgroundColor: verifyColor }}
                      title={profileUser.role === 'faculty' ? 'Verified Faculty' : ['admin', 'college_admin'].includes(profileUser.role) ? 'Campus Administration' : 'Verified Campus Student'}
                      aria-label="Verified member"
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {profileUser.college && (
                    <span className="sw-campus-pill">
                      {profileUser.college}
                    </span>
                  )}
                </div>
                <p className="text-base-400 dark:text-base-500 text-sm mt-0.5">@{profileUser.username}</p>
                {profileUser.email && (
                  <p className="text-base-400 dark:text-base-500 text-xs mt-0.5">{profileUser.email}</p>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-center">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-300 text-sm font-semibold rounded-xl hover:bg-base-200 dark:hover:bg-base-750 transition-all"
                  >
                    <Settings size={15} />
                    Edit Profile
                  </button>
                ) : (
                  <motion.button
                    onClick={handleFollow}
                    disabled={followLoading}
                    whileTap={{ scale: 0.95 }}
                    className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                      followed
                        ? 'sw-btn-following !text-sm !py-2 !px-5 !rounded-xl'
                        : requested
                        ? 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-300 border border-base-200 dark:border-base-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 !text-sm !py-2 !px-5 !rounded-xl'
                        : 'sw-btn-follow !text-sm !py-2 !px-5 !rounded-xl'
                    }`}
                  >
                    {followLoading && <Loader2 size={14} className="animate-spin" />}
                    {followed ? (
                      'Following'
                    ) : requested ? (
                      <>
                        <Clock size={14} />
                        <span>Requested</span>
                      </>
                    ) : (
                      'Follow'
                    )}
                  </motion.button>
                )}
              </div>
            </div>

            {/* Dept / Year */}
            {(profileUser.dept || profileUser.year) && (
              <p className="text-accent-600 dark:text-accent-400 text-sm font-medium mb-1">
                {[profileUser.dept, profileUser.year].filter(Boolean).join(' · ')}
              </p>
            )}

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-base-700 dark:text-base-300 text-sm leading-relaxed whitespace-pre-line">{profileUser.bio}</p>
            )}

            {/* Join date */}
            {profileUser.createdAt && (
              <p className="text-base-400 dark:text-base-500 text-xs mt-1.5">
                Joined {new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 mt-5 border-t border-base-100 dark:border-[rgba(255,255,255,0.07)] pt-4">
          {[
            { label: 'Posts', value: profileUser.canViewPosts === false ? 0 : gridItems.length, action: null },
            { label: 'Followers', value: followerCount, action: () => setFollowListMode('followers') },
            { label: 'Following', value: profileUser.following, action: () => setFollowListMode('following') },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={stat.action}
              disabled={!stat.action}
              className="text-center py-1 group disabled:cursor-default"
            >
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-lg group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                {formatCount(stat.value)}
              </p>
              <p className="text-base-400 dark:text-base-500 text-xs font-medium">{stat.label}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-base-100 dark:bg-base-850 p-1 rounded-xl mb-5">
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
                  ? 'bg-white dark:bg-base-900 text-base-900 dark:text-white shadow-xs'
                  : 'text-base-500 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200'
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
        isPostsUpdating ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-1 sm:gap-1.5"
            aria-label="Updating posts"
          >
            {[1, 2, 3].map(item => (
              <div key={item} className="aspect-square rounded-xl bg-base-100 dark:bg-base-850 animate-pulse" />
            ))}
          </motion.div>
        ) : profileUser.canViewPosts === false ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-xs"
          >
            <h3 className="text-base-900 dark:text-white font-bold text-lg mb-1">This account is private</h3>
            <p className="text-base-400 dark:text-base-500 text-sm">
              {requested
                ? 'Follow request pending. Wait for the user to approve your request.'
                : 'Follow this user to view their posts.'}
            </p>
          </motion.div>
        ) : gridItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-xs"
          >
            <div className="w-16 h-16 border-2 border-base-200 dark:border-base-750 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={28} className="text-base-300 dark:text-base-600" />
            </div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-lg mb-1">
              {isOwnProfile ? 'Share your first post' : 'No posts yet'}
            </h3>
            <p className="text-base-400 dark:text-base-500 text-sm max-w-xs mx-auto">
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
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-base-100 dark:bg-base-850 border border-base-100/60 dark:border-base-800/80"
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-accent-50/50 to-base-50 dark:from-accent-950/20 dark:to-base-900/40">
                    <p className="text-xs text-accent-800 dark:text-accent-200 line-clamp-3 font-medium text-center">
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
        savedItems.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-8">
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-base-900 dark:text-white font-bold text-lg mb-1">
              Saved posts
            </h3>
            <p className="text-base-400 dark:text-base-500 text-sm">
              {isOwnProfile ? 'Posts you save will appear here.' : 'Saved posts are private.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {savedItems.map(post => (
              <button
                key={post.id}
                type="button"
                onClick={() => setViewingPost(post)}
                className="relative aspect-square rounded-xl overflow-hidden bg-base-100 dark:bg-base-850 border border-base-100/60 dark:border-base-800/80"
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="p-2 text-xs text-accent-800 dark:text-accent-200 line-clamp-3 font-medium">{post.caption || post.emoji}</span>
                )}
              </button>
            ))}
          </div>
        )
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
