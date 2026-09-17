// src/utils/posts.js
// ─────────────────────────────────────────────────────────────────────────────
// Normalizes a raw backend Post (populated `user`, `likeCount`, `liked`,
// `commentCount`) into the flat shape PostCard/CommentDrawer already expect
// (userId, userName, likes-as-count, etc.) — keeps the existing UI components
// working with minimal changes.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/** Lightweight relative-time formatter (e.g. "2h ago", "Just now"). */
export function formatRelativeTime(isoDate) {
  const date = new Date(isoDate)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

/** Deterministic-ish fallback gradient for posts without an image. */
const FALLBACK_GRADIENT = { emoji: '📸', label: 'Post', gradientFrom: '#eef2ff', gradientTo: '#ede9fe' }

/** Resolve image URL — prepend API base for server-stored uploads */
function resolveImageUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`
  return url
}

export function normalizePost(raw) {
  return {
    id: raw.id,
    userId: raw.user?.id,
    userName: raw.user?.name ?? 'Unknown',
    userInitials: raw.user?.initials ?? '?',
    userAvatarColor: raw.user?.avatarColor ?? '#6366f1',
    userDept: [raw.user?.dept, raw.user?.year].filter(Boolean).join(' · '),
    createdAt: formatRelativeTime(raw.createdAt),
    rawCreatedAt: raw.createdAt,
    imageUrl: resolveImageUrl(raw.imageUrl),
    ...FALLBACK_GRADIENT,
    caption: raw.caption ?? '',
    tags: raw.tags ?? [],
    likes: raw.likeCount ?? 0,
    liked: Boolean(raw.liked),
    commentCount: raw.commentCount ?? 0,
    saved: false,
  }
}
