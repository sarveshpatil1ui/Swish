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
            className="relative w-full max-w-md bg-white dark:bg-base-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-base-100 dark:border-[rgba(255,255,255,0.07)] max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-accent-500 flex items-center justify-center text-white shadow-xs">
                  <Music2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-base-900 dark:text-white leading-tight">
                    Campus Soundtrack
                  </h3>
                  <p className="text-[11px] text-base-400 dark:text-base-500">
                    50 Top College Anthems & Trending Reels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-base-100 dark:hover:bg-base-800 text-base-400 hover:text-base-600 dark:hover:text-base-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-base-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks, artists, winning themes..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-base-100 dark:bg-base-800 text-base-800 dark:text-base-100 placeholder-base-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
                />
              </div>
            </div>

            {/* Language & Category Filters */}
            <div className="px-4 py-2.5 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] flex flex-col gap-2 shrink-0 bg-base-50/50 dark:bg-base-900/50">
              {/* Language Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                <button
                  type="button"
                  onClick={() => setLanguageFilter('All')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    languageFilter === 'All'
                      ? 'bg-base-900 dark:bg-white text-white dark:text-base-900 shadow-xs'
                      : 'bg-white dark:bg-base-800 text-base-600 dark:text-base-400 border border-base-200 dark:border-base-700'
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
                      : 'bg-white dark:bg-base-800 text-base-600 dark:text-base-400 border border-base-200 dark:border-base-700 hover:border-orange-300'
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
                      : 'bg-white dark:bg-base-800 text-base-600 dark:text-base-400 border border-base-200 dark:border-base-700 hover:border-pink-300'
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
                        ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-300 dark:border-accent-800'
                        : 'text-base-500 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Track List */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-base-100 dark:divide-[rgba(255,255,255,0.07)]">
              {filteredTracks.length === 0 ? (
                <div className="py-12 text-center text-base-400 text-xs">
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
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-accent-50/80 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-900/40'
                          : 'hover:bg-base-50 dark:hover:bg-base-850/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Play/Pause Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => togglePreview(track, e)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 cursor-pointer shadow-xs ${
                            isPlaying
                              ? 'bg-accent-500 text-white animate-pulse'
                              : 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-200 hover:bg-accent-500 hover:text-white'
                          }`}
                          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-bold text-base-300 dark:text-base-600">
                              #{idx + 1}
                            </span>
                            <p className="text-xs font-bold text-base-900 dark:text-white truncate">
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

                          <p className="text-[11px] text-base-500 dark:text-base-400 truncate mt-0.5">
                            {track.artist}
                          </p>

                          <p className="text-[10px] text-accent-500 dark:text-accent-400 font-medium truncate mt-0.5">
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
                            : 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-200 hover:bg-base-900 hover:text-white dark:hover:bg-white dark:hover:text-base-900'
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
