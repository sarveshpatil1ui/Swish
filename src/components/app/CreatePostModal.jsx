import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ImagePlus, Trash2, Smile, Music2, AlertTriangle } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { resolveImageUrl } from '../../utils/posts'
import EmojiPicker from './EmojiPicker'
import MusicPickerModal from './MusicPickerModal'

export default function CreatePostModal({ onClose }) {
  const { currentUser, createPost, platformConfig } = useSwish()
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'main_admin'
  const isPostCreationPaused = platformConfig?.features?.allowPostCreation === false && !isAdmin
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [selectedMusic, setSelectedMusic] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  const [publishError, setPublishError] = useState('')

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImage(url)
    setImageFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (isPostCreationPaused) {
      setPublishError('Post creation is temporarily paused by platform administrators.')
      return
    }
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleSelectEmoji = (emoji) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? caption.length
    const end = textarea?.selectionEnd ?? caption.length
    const nextCaption = `${caption.slice(0, start)}${emoji}${caption.slice(end)}`

    setCaption(nextCaption)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const cursorPosition = start + emoji.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    })
  }

  const handlePublish = async (e) => {
    e.preventDefault()
    if (isPostCreationPaused) {
      setPublishError('Post creation is temporarily paused by platform administrators.')
      return
    }
    if (!image && !caption.trim()) return

    setPublishing(true)
    setPublishError('')

    const result = await createPost({
      caption: caption.trim(),
      imageFile,
      tags: [],
      music: selectedMusic,
    })

    setPublishing(false)
    if (!result.ok) {
      setPublishError(result.error || 'Failed to publish post.')
      return
    }

    setPublished(true)
    setTimeout(onClose, 800)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        aria-modal="true"
        role="dialog"
        aria-label="Create post"
      >
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-base-900 rounded-2xl shadow-2xl overflow-hidden border border-base-100 dark:border-[rgba(255,255,255,0.07)] flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] shrink-0">
            <h2 className="text-base-900 dark:text-white font-bold text-lg">
              Create Post
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-base-100 dark:hover:bg-base-800 text-base-400 hover:text-base-600 dark:hover:text-base-300 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {isPostCreationPaused && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span className="font-semibold">
                  Post & media creation is temporarily paused by platform administrators.
                </span>
              </div>
            )}
            {/* Image drop zone */}
            {!image ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? 'border-accent-400 bg-accent-50 dark:bg-accent-950/40'
                    : 'border-base-200 dark:border-base-750 hover:border-accent-300 dark:hover:border-accent-700 hover:bg-base-50 dark:hover:bg-base-850/50'
                }`}
              >
                <div className="w-12 h-12 bg-accent-50 dark:bg-accent-950/60 rounded-full flex items-center justify-center shadow-xs">
                  <ImagePlus size={22} className="text-accent-500 dark:text-accent-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-base-700 dark:text-base-300 font-semibold text-sm">
                    Drop photo here, or <span className="text-accent-500 dark:text-accent-400">browse</span>
                  </p>
                  <p className="text-base-400 dark:text-base-500 text-xs mt-0.5">JPEG, PNG, WEBP, GIF up to 5MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                  aria-label="Choose image file"
                />
              </div>
            ) : (
              <div className="relative h-56 rounded-2xl overflow-hidden group shadow-md">
                <img src={image} alt="Post preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <button
                    onClick={() => { setImage(null); setImageFile(null); }}
                    className="opacity-0 group-hover:opacity-100 bg-white text-base-800 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Remove photo
                  </button>
                </div>
              </div>
            )}

            {/* Attached Music Card (if selected) */}
            {selectedMusic && (
              <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-accent-500/10 border border-pink-200 dark:border-pink-900/40 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Music2 size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-base-900 dark:text-white truncate">
                      {selectedMusic.title}
                    </p>
                    <p className="text-[10px] text-base-500 dark:text-base-400 truncate">
                      {selectedMusic.artist} • <span className="font-semibold text-pink-600 dark:text-pink-400">{selectedMusic.language}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMusic(null)}
                  className="p-1 rounded-full text-base-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Remove song"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Caption Input */}
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: currentUser?.avatarColor || '#5B5FEF', fontSize: '10px' }}
                >
                  {resolveImageUrl(currentUser?.profilePhoto) ? (
                    <img
                      src={resolveImageUrl(currentUser.profilePhoto)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.initials || 'U'
                  )}
                </div>
                <span className="text-base-700 dark:text-base-300 text-sm font-semibold">{currentUser?.name || 'You'}</span>
              </div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="What's happening on campus? Add hashtags or mention friends..."
                  rows={3}
                  className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-750 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-600 focus:ring-2 focus:ring-accent-500/20 resize-none transition-all"
                  aria-label="Post caption"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(value => !value)}
                  className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showEmojiPicker
                      ? 'text-accent-500 bg-accent-50 dark:text-accent-400 dark:bg-accent-950/50'
                      : 'text-base-400 hover:text-accent-500 hover:bg-accent-50 dark:text-base-500 dark:hover:text-accent-400 dark:hover:bg-accent-950/50'
                  }`}
                  aria-label="Insert emoji"
                  aria-expanded={showEmojiPicker}
                >
                  <Smile size={18} />
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={handleSelectEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
            </div>

            {/* Post Extras Toolbar (Add Music, etc.) */}
            <div className="mt-3 flex items-center justify-between border-t border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] py-2.5">
              <span className="text-xs font-semibold text-base-500 dark:text-base-400">
                Add to your post
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedMusic
                      ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/40'
                      : 'bg-base-50 dark:bg-base-800 text-base-700 dark:text-base-300 border-base-200 dark:border-base-750 hover:border-pink-300'
                  }`}
                >
                  <Music2 size={14} className={selectedMusic ? 'text-pink-500' : 'text-base-400'} />
                  <span>{selectedMusic ? 'Change Song' : 'Add Music (50 tracks)'}</span>
                </button>
              </div>
            </div>

            {publishError && (
              <p className="text-rose-500 text-xs mt-2">{publishError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-base-600 dark:text-base-400 border border-base-200 dark:border-base-750 rounded-xl hover:bg-base-50 dark:hover:bg-base-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={(!image && !caption.trim()) || publishing || published || isPostCreationPaused}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-accent-500 rounded-xl hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : published ? (
                  '✓ Published!'
                ) : (
                  isPostCreationPaused ? (
                    'Posting Paused'
                  ) : (
                    'Post'
                  )
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 50-Song Campus Music Picker Modal */}
      <MusicPickerModal
        isOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelectTrack={setSelectedMusic}
        selectedTrackId={selectedMusic?.id}
      />
    </>
  )
}
