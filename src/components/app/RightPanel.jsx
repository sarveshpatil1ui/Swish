import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, UserPlus, Hash } from 'lucide-react'

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

      {/* Trending Topics */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-indigo-500" />
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Trending on Campus</h3>
        </div>
        <div className="space-y-3">
          {trendingTopics.length === 0 ? (
            <p className="text-slate-400 dark:text-gray-500 text-xs text-center py-4">No trending topics right now.</p>
          ) : (
            trendingTopics.slice(0, 6).map((t) => (
              <button
                key={t.tag}
                onClick={() => handleTagClick(t.tag)}
                className="w-full flex items-center justify-between group px-2 py-1.5 -mx-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:bg-indigo-100 dark:active:bg-indigo-950/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-slate-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    {t.tag.replace('#', '')}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-gray-600 text-xs group-hover:text-indigo-400 dark:group-hover:text-indigo-500 transition-colors">{t.posts} posts</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Suggested People */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={15} className="text-indigo-500" />
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">People to Follow</h3>
        </div>
        <div className="space-y-4">
          {suggestedUsers.length === 0 ? (
            <p className="text-slate-400 dark:text-gray-500 text-xs text-center py-4">No suggestions right now.</p>
          ) : (
            suggestedUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Link to={`/profile/${u.id}`}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.initials}
                  </div>
                </Link>
                <Link to={`/profile/${u.id}`} className="flex-1 min-w-0 group">
                  <p className="text-slate-900 dark:text-white text-sm font-semibold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {u.name}
                  </p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs truncate">
                    {u.dept} · {u.year}
                  </p>
                </Link>
                <button
                  onClick={() => toggleFollow(u.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                    followed[u.id]
                      ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {followed[u.id] ? 'Following' : 'Follow'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-slate-300 dark:text-gray-700 text-xs px-1">
        © 2026 Swish · Campus Community · Privacy · Terms
      </p>
    </aside>
  )
}
