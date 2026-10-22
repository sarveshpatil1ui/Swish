import { useState, useEffect } from 'react'
import { Search, Eye, EyeOff, AlertTriangle, MessageSquare, Filter, Loader2, X } from 'lucide-react'
import { apiGetModerationPosts, apiGetModerationComments, apiHidePost, apiRestorePost, apiHideComment, apiRestoreComment } from '../../utils/auth'

export default function ModerationManagement() {
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showHideModal, setShowHideModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [hideReason, setHideReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'posts') {
        const res = await apiGetModerationPosts()
        if (res.ok) setPosts(res.posts)
      } else {
        const res = await apiGetModerationComments()
        if (res.ok) setComments(res.comments)
      }
    } catch (err) {
      console.error('[ModerationManagement] Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleHidePost = (post) => {
    setSelectedItem({ type: 'post', data: post })
    setShowHideModal(true)
    setHideReason('')
  }

  const handleHideComment = (comment) => {
    setSelectedItem({ type: 'comment', data: comment })
    setShowHideModal(true)
    setHideReason('')
  }

  const confirmHide = async () => {
    if (!selectedItem) return
    setActionLoading(true)
    try {
      if (selectedItem.type === 'post') {
        const res = await apiHidePost(selectedItem.data.id, hideReason)
        if (res.ok) {
          setPosts(prev => prev.map(p => p.id === selectedItem.data.id ? res.post : p))
        }
      } else {
        const res = await apiHideComment(selectedItem.data.id, hideReason)
        if (res.ok) {
          setComments(prev => prev.map(c => c.id === selectedItem.data.id ? res.comment : c))
        }
      }
      setShowHideModal(false)
      setSelectedItem(null)
      setHideReason('')
    } catch (err) {
      console.error('[ModerationManagement] Error hiding:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestorePost = async (id) => {
    try {
      const res = await apiRestorePost(id)
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === id ? res.post : p))
      }
    } catch (err) {
      console.error('[ModerationManagement] Error restoring post:', err)
    }
  }

  const handleRestoreComment = async (id) => {
    try {
      const res = await apiRestoreComment(id)
      if (res.ok) {
        setComments(prev => prev.map(c => c.id === id ? res.comment : c))
      }
    } catch (err) {
      console.error('[ModerationManagement] Error restoring comment:', err)
    }
  }

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'hidden' && p.hidden) ||
                          (filterStatus === 'visible' && !p.hidden)
    return matchesSearch && matchesFilter
  })

  const filteredComments = comments.filter(c => {
    const matchesSearch = c.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
                          (filterStatus === 'hidden' && c.hidden) ||
                          (filterStatus === 'visible' && !c.hidden)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Moderation</h1>
        <p className="text-slate-500 dark:text-gray-500 mt-1">Manage posts and comments reported or flagged for review</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          Posts ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          Comments ({comments.length})
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab} by content or author...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all appearance-none"
          >
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {activeTab === 'posts' ? (
          filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-gray-500 text-sm">No posts found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPosts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onHide={handleHidePost}
                  onRestore={handleRestorePost}
                />
              ))}
            </div>
          )
        ) : (
          filteredComments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-gray-500 text-sm">No comments found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onHide={handleHideComment}
                  onRestore={handleRestoreComment}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Hide Modal */}
      {showHideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowHideModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Hide {selectedItem?.type}
            </h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
              Please provide a reason for hiding this content:
            </p>
            <textarea
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              rows={3}
              placeholder="Reason for hiding..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowHideModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmHide}
                disabled={actionLoading || !hideReason.trim()}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Hide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PostItem({ post, onHide, onRestore }) {
  return (
    <div className={`p-6 transition-colors ${post.hidden ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              {post.user?.initials || '?'}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-sm">{post.user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-gray-500">@{post.user?.username}</p>
            </div>
            {post.hidden && (
              <span className="ml-2 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-1 rounded-full">
                Hidden
              </span>
            )}
          </div>
          <p className="text-slate-700 dark:text-gray-300 text-sm mb-2 line-clamp-3">{post.caption}</p>
          {post.hidden && post.hiddenReason && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Reason: {post.hiddenReason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {post.hidden ? (
            <button
              onClick={() => onRestore(post.id)}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
              title="Restore"
            >
              <Eye size={16} className="text-emerald-600 dark:text-emerald-400" />
            </button>
          ) : (
            <button
              onClick={() => onHide(post)}
              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
              title="Hide"
            >
              <EyeOff size={16} className="text-rose-600 dark:text-rose-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentItem({ comment, onHide, onRestore }) {
  return (
    <div className={`p-6 transition-colors ${comment.hidden ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              {comment.user?.initials || '?'}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-sm">{comment.user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-gray-500">@{comment.user?.username}</p>
            </div>
            {comment.hidden && (
              <span className="ml-2 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-1 rounded-full">
                Hidden
              </span>
            )}
          </div>
          <p className="text-slate-700 dark:text-gray-300 text-sm mb-2 line-clamp-3">{comment.text}</p>
          {comment.post?.caption && (
            <p className="text-xs text-slate-500 dark:text-gray-500 italic">
              On: {comment.post.caption.slice(0, 50)}...
            </p>
          )}
          {comment.hidden && comment.hiddenReason && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Reason: {comment.hiddenReason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {comment.hidden ? (
            <button
              onClick={() => onRestore(comment.id)}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
              title="Restore"
            >
              <Eye size={16} className="text-emerald-600 dark:text-emerald-400" />
            </button>
          ) : (
            <button
              onClick={() => onHide(comment)}
              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
              title="Hide"
            >
              <EyeOff size={16} className="text-rose-600 dark:text-rose-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
