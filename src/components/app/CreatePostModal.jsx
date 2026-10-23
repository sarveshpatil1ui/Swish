import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ImagePlus, Trash2, Smile, Music2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { resolveImageUrl } from '../../utils/posts'
import EmojiPicker from './EmojiPicker'
import MusicPickerModal from './MusicPickerModal'

export default function CreatePostModal({ onClose }) {
  const { currentUser, createPost } = useSwish()
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
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-gray-800 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
            <h2 className="text-slate-900 dark:text-white font-bold text-lg">
              Create Post
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {/* Image drop zone */}
            {!image ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center shadow-xs">
                  <ImagePlus size={22} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-slate-700 dark:text-gray-300 font-semibold text-sm">
                    Drop photo here, or <span className="text-indigo-600 dark:text-indigo-400">browse</span>
                  </p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">JPEG, PNG, WEBP, GIF up to 5MB</p>
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
                    className="opacity-0 group-hover:opacity-100 bg-white text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Remove photo
                  </button>
                </div>
              </div>
            )}

            {/* Attached Music Card (if selected) */}
            {selectedMusic && (
              <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-200 dark:border-pink-900/40 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Music2 size={16} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedMusic.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                      {selectedMusic.artist} • <span className="font-semibold text-pink-600 dark:text-pink-400">{selectedMusic.language}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMusic(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
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
                  style={{ backgroundColor: currentUser?.avatarColor || '#6366f1', fontSize: '10px' }}
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
                <span className="text-slate-700 dark:text-gray-300 text-sm font-semibold">{currentUser?.name || 'You'}</span>
              </div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="What's happening on campus? Add hashtags or mention friends..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 resize-none transition-all"
                  aria-label="Post caption"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(value => !value)}
                  className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors cursor-pointer ${
                    showEmojiPicker
                      ? 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50'
                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50'
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
            <div className="mt-3 flex items-center justify-between border-t border-b border-slate-100 dark:border-gray-800/80 py-2.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                Add to your post
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedMusic
                      ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/40'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-pink-300'
                  }`}
                >
                  <Music2 size={14} className={selectedMusic ? 'text-pink-500' : 'text-slate-400'} />
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
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={(!image && !caption.trim()) || publishing || published}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : published ? (
                  '✓ Published!'
                ) : (
                  'Post'
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
