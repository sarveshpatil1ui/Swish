import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import PostCard from '../../components/app/PostCard'
import RightPanel from '../../components/app/RightPanel'
import { apiFetch } from '../../utils/auth'
import { normalizePost } from '../../utils/posts'

export default function PostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { posts } = useSwish()

  const [post, setPost] = useState(() => {
    return posts.find(p => (p.id === postId || p._id === postId)) || null
  })
  const [loading, setLoading] = useState(!post)
  const [error, setError] = useState(null)

  useEffect(() => {
    const existing = posts.find(p => (p.id === postId || p._id === postId))
    if (existing) {
      setPost(existing)
      setLoading(false)
      return
    }

    let isMounted = true
    async function loadPost() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch(`/api/posts/${postId}`)
        if (!isMounted) return

        if (data.ok && data.post) {
          setPost(normalizePost(data.post))
        } else {
          setError(data.error || 'Post not found')
        }
      } catch {
        if (isMounted) setError('Failed to load post')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPost()
    return () => { isMounted = false }
  }, [postId, posts])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
      {/* Main post column */}
      <div className="flex-1 max-w-xl mx-auto space-y-4">
        {/* Navigation header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1)
              } else {
                navigate('/home')
              }
            }}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-slate-400 text-sm">Loading post...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={22} className="text-rose-500" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">
              {error === 'This account is private.' ? 'This Account is Private' : 'Post Unavailable'}
            </h3>
            <p className="text-slate-400 dark:text-gray-500 text-sm mb-5">
              {error === 'This account is private.'
                ? 'Follow this account to see their photos and posts.'
                : error}
            </p>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Go to Home Feed
            </button>
          </div>
        ) : post ? (
          <PostCard post={post} />
        ) : null}
      </div>

      {/* Right panel on large screens */}
      <RightPanel />
    </div>
  )
}
