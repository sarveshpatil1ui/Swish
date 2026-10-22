import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Play, Pause, Music2, Sparkles, Volume2 } from 'lucide-react'
import { STORY_MUSIC_TRACKS } from '../../data/storyMusic'
import { resolveAudioUrl, playSharedAudio, stopSharedAudio } from '../../utils/audioResolver'

export default function MusicPickerModal({ isOpen, onClose, onSelectTrack, selectedTrackId }) {
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('All') // 'All' | 'Hindi' | 'Marathi'
  const [categoryFilter, setCategoryFilter] = useState('All') // 'All' | 'Winning' | 'Party' | 'Celebration' | 'Attitude' | 'Vibe'
  const [playingTrackId, setPlayingTrackId] = useState(null)

  const audioRef = useRef(null)

  // Stop audio on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingTrackId(null)
    }
  }, [isOpen])

  const togglePreview = (track, e) => {
    e.stopPropagation()
    if (playingTrackId === track.id) {
      audioRef.current?.pause()
      setPlayingTrackId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const url = resolveAudioUrl(track)
      const audio = new Audio(url)
      audio.volume = 0.85
      playSharedAudio(audio)
      audio.play().catch(err => console.warn('Preview play error:', err))
      audio.onended = () => setPlayingTrackId(null)
      audio.onerror = () => setPlayingTrackId(null)
      audioRef.current = audio
      setPlayingTrackId(track.id)
    }
  }

  const handleSelect = (track) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingTrackId(null)
    onSelectTrack({
      ...track,
      audioUrl: resolveAudioUrl(track),
    })
    onClose()
  }

  const filteredTracks = STORY_MUSIC_TRACKS.filter(track => {
    const matchesSearch =
      track.title.toLowerCase().includes(search.toLowerCase()) ||
      track.artist.toLowerCase().includes(search.toLowerCase()) ||
      track.vibe.toLowerCase().includes(search.toLowerCase()) ||
      (track.category && track.category.toLowerCase().includes(search.toLowerCase()))

    const matchesLanguage =
      languageFilter === 'All' || track.language === languageFilter

    const matchesCategory =
      categoryFilter === 'All' || (track.category && track.category.toLowerCase() === categoryFilter.toLowerCase())

    return matchesSearch && matchesLanguage && matchesCategory
  })

  const hindiCount = STORY_MUSIC_TRACKS.filter(t => t.language === 'Hindi').length
  const marathiCount = STORY_MUSIC_TRACKS.filter(t => t.language === 'Marathi').length

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-200 dark:border-gray-800 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                  <Music2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    Campus Soundtrack
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">
                    50 Top College Anthems & Trending Reels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 dark:border-gray-800 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks, artists, winning themes..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-gray-800/80 text-slate-800 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                />
              </div>
            </div>

            {/* Language & Category Filters */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-gray-800 flex flex-col gap-2 shrink-0 bg-slate-50/50 dark:bg-gray-900/50">
              {/* Language Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                <button
                  type="button"
                  onClick={() => setLanguageFilter('All')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    languageFilter === 'All'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700'
                  }`}
                >
                  All (50)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguageFilter('Hindi')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    languageFilter === 'Hindi'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 hover:border-orange-300'
                  }`}
                >
                  🇮🇳 Hindi ({hindiCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLanguageFilter('Marathi')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    languageFilter === 'Marathi'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs'
                      : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 hover:border-pink-300'
                  }`}
                >
                  🚩 Marathi ({marathiCount})
                </button>
              </div>

              {/* Vibe / Mood Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                {['All', 'Winning', 'Party', 'Celebration', 'Attitude', 'Vibe'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-300 dark:border-pink-800'
                        : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Track List */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-gray-800/60">
              {filteredTracks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No matching tracks found for "{search}"
                </div>
              ) : (
                filteredTracks.map((track, idx) => {
                  const isPlaying = playingTrackId === track.id
                  const isSelected = selectedTrackId === track.id

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelect(track)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-pink-50/80 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/40'
                          : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Play/Pause Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => togglePreview(track, e)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 cursor-pointer shadow-xs ${
                            isPlaying
                              ? 'bg-pink-600 text-white animate-pulse'
                              : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-pink-500 hover:text-white'
                          }`}
                          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-slate-300 dark:text-gray-600">
                              #{idx + 1}
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {track.title}
                            </p>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 ${
                              track.language === 'Hindi'
                                ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                                : 'bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400'
                            }`}>
                              {track.language}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                            {track.artist}
                          </p>

                          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium truncate mt-0.5">
                            {track.vibe}
                          </p>
                        </div>
                      </div>

                      {/* Select Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(track)
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900'
                        }`}
                      >
                        {isSelected ? '✓ Chosen' : 'Select'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
