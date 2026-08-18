import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ImagePlus, Trash2, Clock } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'

export default function CreateStoryModal({ onClose, onPublish, initialStory }) {
  const { currentUser } = useSwish()
  const [image, setImage] = useState(initialStory?.imageUrl || null)
  const [dragging, setDragging] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const fileRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImage(url)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handlePublish = (e) => {
    e.preventDefault()
    if (!image) return
    
    setPublishing(true)
    
    // Simulate network delay
    setTimeout(() => {
      if (onPublish) {
        const newStory = {
          ...initialStory, // Preserve any other existing fields if editing
          id:              initialStory?.id         || `story-new-${Date.now()}`,
          userId:          currentUser?.id          || 'user-1',
          label:           currentUser?.name?.split(' ')[0] || 'You',
          initials:        currentUser?.initials    || 'U',
          avatarColor:     currentUser?.avatarColor || '#6366f1',
          imageUrl:        image,
          hasNew:          true,
          time:            initialStory ? initialStory.time : 'Just now',
        }
        onPublish(newStory)
      }
      setPublishing(false)
      setPublished(true)
      setTimeout(onClose, 800)
    }, 600)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 dark:bg-black/80 z-50 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        aria-modal="true"
        role="dialog"
        aria-label="Create story"
      >
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg leading-tight">
                {initialStory ? 'Edit Story' : 'Add to Story'}
              </h2>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                <Clock size={12} /> Disappears in 24 hours
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700 transition-all"
              aria-label="Close"
            >
              <X size={16} className="stroke-[2.5]" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {/* Image drop zone - Vertical aspect ratio for stories */}
            {!image ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center shadow-sm">
                  <ImagePlus size={24} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-center px-6">
                  <p className="text-slate-700 dark:text-gray-300 font-bold text-base mb-1">Select a photo</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">Stories look best with vertical, full-screen photos.</p>
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
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden group shadow-inner">
                <img src={image} alt="Story preview" className="w-full h-full object-cover bg-slate-100 dark:bg-gray-950" />
                
                {/* Overlay gradients for better aesthetics */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                
                {/* User preview header */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold border border-white/20 shadow-sm"
                    style={{ backgroundColor: currentUser?.avatarColor || '#6366f1', fontSize: '10px' }}
                  >
                    {currentUser?.initials || 'U'}
                  </div>
                  <span className="text-white text-sm font-semibold text-shadow-sm">{currentUser?.name?.split(' ')[0] || 'You'}</span>
                  <span className="text-white/70 text-xs ml-1 text-shadow-sm">Just now</span>
                </div>

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <button
                    onClick={() => setImage(null)}
                    className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm text-rose-600 rounded-full px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all shadow-xl hover:bg-white hover:scale-105"
                  >
                    <Trash2 size={14} className="stroke-[2.5]" />
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2 shrink-0">
              <button
                onClick={handlePublish}
                disabled={!image || publishing || published}
                className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : published ? (
                  initialStory ? '✓ Story Updated!' : '✓ Added to Story!'
                ) : (
                  initialStory ? 'Update Story' : 'Share to Story'
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm font-semibold text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
