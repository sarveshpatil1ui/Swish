import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ImagePlus, Trash2, Clock, Music2, Sparkles, Check, MapPin
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { resolveImageUrl } from '../../utils/posts'
import { STORY_FILTERS, CAMPUS_STICKERS } from '../../data/storyMusic'
import MusicPickerModal from './MusicPickerModal'

export default function CreateStoryModal({ onClose, onPublish, initialStory }) {
  const { currentUser } = useSwish()
  const [image, setImage] = useState(initialStory?.imageUrl || null)
  const [imageFile, setImageFile] = useState(null)
  const [caption, setCaption] = useState(initialStory?.caption || '')
  const [selectedMusic, setSelectedMusic] = useState(initialStory?.music || null)
  const [selectedFilter, setSelectedFilter] = useState(initialStory?.filter || 'normal')
  const [selectedSticker, setSelectedSticker] = useState(initialStory?.sticker || null)

  const [dragging, setDragging] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishError, setPublishError] = useState('')

  // Modals for Music & Sticker Pickers
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const fileRef = useRef(null)

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
    if (!image && !imageFile) return

    setPublishing(true)
    setPublishError('')

    try {
      const res = await onPublish?.({
        imageFile,
        caption,
        music: selectedMusic,
        filter: selectedFilter,
        sticker: selectedSticker,
      })
      setPublishing(false)
      if (!res?.ok) {
        setPublishError(res?.error || 'Failed to publish story.')
        return
      }
      setPublished(true)
      setTimeout(onClose, 800)
    } catch (err) {
      console.error('Publish story error:', err)
      setPublishing(false)
      setPublishError('Failed to publish story. Please try again.')
    }
  }

  const currentFilterCss = STORY_FILTERS.find(f => f.id === selectedFilter)?.css || ''

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 z-50 backdrop-blur-md cursor-pointer"
      />

      {/* Main Creation Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-none"
        aria-modal="true"
        role="dialog"
      >
        <div className="pointer-events-auto relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-slate-200 dark:border-gray-800">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 shrink-0">
            <div>
              <h2 className="text-slate-900 dark:text-white font-bold text-base leading-tight">
                {initialStory ? 'Edit Story' : 'New Story'}
              </h2>
              <p className="text-slate-400 dark:text-gray-500 text-[11px] mt-0.5 flex items-center gap-1">
                <Clock size={11} /> Disappears in 24 hours
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {/* Image Drop Zone / Preview */}
            {!image ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative aspect-[9/13] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all ${
                  dragging
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center shadow-sm">
                  <ImagePlus size={24} className="text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-slate-700 dark:text-gray-300 font-bold text-sm mb-1">Select a photo</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">Tap to browse or drop an image here</p>
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
              <div className="relative aspect-[9/13] rounded-2xl overflow-hidden group shadow-lg">
                <img
                  src={image}
                  alt="Story preview"
                  style={{ filter: currentFilterCss }}
                  className="w-full h-full object-cover bg-slate-950 transition-all duration-200"
                />

                {/* Overlays */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

                {/* User info header preview */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden border border-white/30"
                    style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
                  >
                    {resolveImageUrl(currentUser?.profilePhoto) ? (
                      <img src={resolveImageUrl(currentUser.profilePhoto)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.initials || 'U'
                    )}
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">{currentUser?.name?.split(' ')[0] || 'You'}</span>
                </div>

                {/* Attached Music Sticker Badge */}
                {selectedMusic && (
                  <div className="absolute top-12 left-3.5 z-10 animate-fade-in">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 shadow-md">
                      <Music2 size={12} className="text-pink-400 animate-pulse" />
                      <span className="truncate max-w-[170px]">{selectedMusic.title} • {selectedMusic.artist}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMusic(null)
                        }}
                        className="ml-1 hover:text-rose-400 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached Sticker Badge */}
                {selectedSticker && (
                  <div className="absolute top-22 left-3.5 z-10 animate-fade-in">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-slate-800 dark:text-white text-xs font-bold shadow-lg border border-white/30">
                      <span>{selectedSticker.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSticker(null)
                        }}
                        className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Caption preview inside story */}
                {caption && (
                  <div className="absolute bottom-5 left-3 right-3 text-center pointer-events-none">
                    <p className="inline-block bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3.5 py-1.5 rounded-xl max-w-full truncate border border-white/10 shadow-md">
                      {caption}
                    </p>
                  </div>
                )}

                {/* Hover Quick Actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="opacity-0 group-hover:opacity-100 bg-white/90 text-indigo-600 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xl hover:scale-105 cursor-pointer"
                  >
                    <ImagePlus size={13} /> Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null)
                      setImageFile(null)
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-white/90 text-rose-600 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xl hover:scale-105 cursor-pointer"
                  >
                    <Trash2 size={13} /> Discard
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                  aria-label="Change photo"
                />
              </div>
            )}

            {/* Creative Tools Toolbar (Music & Stickers) */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(true)}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedMusic
                      ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900/50'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-pink-300'
                  }`}
                >
                  <Music2 size={14} className={selectedMusic ? 'text-pink-500 shrink-0' : 'text-slate-400 shrink-0'} />
                  <span className="truncate">{selectedMusic ? selectedMusic.title : 'Add Music (50 tracks)'}</span>
                </button>
                {selectedMusic && (
                  <button
                    type="button"
                    onClick={() => setSelectedMusic(null)}
                    className="p-2 rounded-xl border border-pink-200 dark:border-pink-900/50 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/40 cursor-pointer shrink-0"
                    title="Remove song"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowStickerPicker(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedSticker
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                    : 'bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-amber-300'
                }`}
              >
                <Sparkles size={14} className={selectedSticker ? 'text-amber-500' : 'text-slate-400'} />
                <span className="truncate">{selectedSticker ? selectedSticker.label : 'Stickers'}</span>
              </button>
            </div>

            {/* Filter Pills Selector */}
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5">
                Filters
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {STORY_FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedFilter === f.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Input */}
            <div className="mt-3">
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write a caption..."
                maxLength={120}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-800 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {publishError && (
              <p className="text-rose-500 text-xs mt-2 text-center font-medium">{publishError}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!image || publishing || published}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : published ? (
                  initialStory ? '✓ Updated!' : '✓ Added to Story!'
                ) : (
                  initialStory ? 'Update Story' : 'Share to Story'
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Music Selection Modal (50 Tracks) ── */}
      <MusicPickerModal
        isOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onSelectTrack={setSelectedMusic}
        selectedTrackId={selectedMusic?.id}
      />

      {/* ── Campus Stickers Modal ── */}
      <AnimatePresence>
        {showStickerPicker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStickerPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-200 dark:border-gray-800 max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Campus Stickers</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStickerPicker(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 grid grid-cols-1 gap-2 overflow-y-auto">
                {CAMPUS_STICKERS.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedSticker(st)
                      setShowStickerPicker(false)
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 bg-slate-50 dark:bg-gray-800/50 text-left transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-gray-200">
                      {st.label}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize">{st.type}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
