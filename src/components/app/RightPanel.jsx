import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, UserPlus, Hash } from 'lucide-react'
import CollegeNoticePanel from './CollegeNoticePanel'
import { resolveImageUrl } from '../../utils/posts'

// No backend API yet for trending topics or suggested users — will be populated once built
const trendingTopics = []
const suggestedUsers = []

export default function RightPanel() {
  const [followed, setFollowed] = useState({})
  const navigate = useNavigate()

  const toggleFollow = (id) => setFollowed(f => ({ ...f, [id]: !f[id] }))

  const handleTagClick = (tag) => {
    // strip the leading # so the search bar matches the raw word too
    navigate(`/home?q=${encodeURIComponent(tag)}`)
  }

  return (
    <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 sticky top-6 h-fit space-y-5 py-6 pr-4">
      {/* College Notices Panel */}
      <CollegeNoticePanel />

      {/* Trending Topics */}
      <div className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-accent-500" />
          <h3 className="text-base-900 dark:text-white font-semibold text-sm">Trending on Campus</h3>
        </div>
        <div className="space-y-1">
          {trendingTopics.length === 0 ? (
            <p className="text-base-400 dark:text-base-500 text-xs text-center py-4">No trending topics right now.</p>
          ) : (
            trendingTopics.slice(0, 6).map((t) => (
              <button
                key={t.tag}
                onClick={() => handleTagClick(t.tag)}
                className="w-full flex items-center justify-between group px-2 py-1.5 -mx-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-900/20 active:bg-accent-100 dark:active:bg-accent-900/40 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-base-400 dark:text-base-600 group-hover:text-accent-400 transition-colors" />
                  <span className="text-accent-600 dark:text-accent-400 text-sm font-medium group-hover:text-accent-700 dark:group-hover:text-accent-300 transition-colors">
                    {t.tag.replace('#', '')}
                  </span>
                </div>
                <span className="text-base-400 dark:text-base-500 text-xs group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">{t.posts} posts</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Suggested People */}
      <div className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus size={15} className="text-accent-500" />
          <h3 className="text-base-900 dark:text-white font-semibold text-sm">People to Follow</h3>
        </div>
        <div className="space-y-3">
          {suggestedUsers.length === 0 ? (
            <p className="text-base-400 dark:text-base-500 text-xs text-center py-4">No suggestions right now.</p>
          ) : (
            suggestedUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Link to={`/profile/${u.id}`}>
                  {resolveImageUrl(u.profilePhoto) ? (
                    <img
                      src={resolveImageUrl(u.profilePhoto)}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: u.avatarColor || '#5B5FEF' }}
                    >
                      {u.initials}
                    </div>
                  )}
                </Link>
                <Link to={`/profile/${u.id}`} className="flex-1 min-w-0 group">
                  <p className="text-base-900 dark:text-white text-sm font-semibold truncate group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                    {u.name}
                  </p>
                  <p className="text-base-400 dark:text-base-500 text-xs truncate">
                    {u.dept} · {u.year}
                  </p>
                </Link>
                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`${followed[u.id] ? 'sw-btn-following' : 'sw-btn-follow'} flex-shrink-0`}
                >
                  {followed[u.id] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-base-400 dark:text-base-600 text-xs px-1">
        © 2026 Swish · Verified Campus Network · Privacy · Terms
      </p>
    </aside>
  )
}
