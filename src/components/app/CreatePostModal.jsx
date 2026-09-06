import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ImagePlus, Trash2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'

export default function CreatePostModal({ onClose }) {
  const { currentUser, createPost } = useSwish()
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [dragging, setDragging] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const fileRef = useRef(null)

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

  const handlePublish = async (e) => {
    e.preventDefault()
    if (!image && !caption.trim()) return

    setPublishing(true)
    setPublishError('')

    // NOTE: post image upload is now fully implemented on the backend.
    const result = await createPost({ caption: caption.trim(), imageFile, tags: [] })

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-label="Create post"
      >
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg">
              Create Post
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-300 transition-all"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            {/* Image drop zone */}
            {!image ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center">
                  <ImagePlus size={22} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-slate-700 dark:text-gray-300 font-semibold text-sm">Upload a photo</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Drag & drop or click to browse</p>
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
              <div className="relative h-56 rounded-2xl overflow-hidden group">
                <img src={image} alt="Post preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <button
                    onClick={() => { setImage(null); setImageFile(null); }}
                    className="opacity-0 group-hover:opacity-100 bg-white text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Caption */}
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: currentUser?.avatarColor || '#6366f1', fontSize: '10px' }}
                >
                  {currentUser?.initials || 'U'}
                </div>
                <span className="text-slate-700 dark:text-gray-300 text-sm font-semibold">{currentUser?.name || 'You'}</span>
              </div>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="What's happening on campus?"
                rows={3}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 resize-none transition-all"
                aria-label="Post caption"
              />
              <p className={`text-xs text-right mt-1 transition-colors ${
                caption.length > 280 ? 'text-rose-500 font-semibold' : 'text-slate-400 dark:text-gray-500'
              }`}>
                {caption.length}/300
              </p>
            </div>

            {publishError && (
              <p className="text-rose-500 text-xs mt-2">{publishError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={(!image && !caption.trim()) || publishing || published || caption.length > 300}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : published ? (
                  '✓ Published!'
                ) : (
                  'Publish'
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
