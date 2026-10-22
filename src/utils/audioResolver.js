// src/utils/audioResolver.js
// ─────────────────────────────────────────────────────────────────────────────
// Resolves music objects/tracks to their original, real studio audio previews
// (Apple iTunes 30s master recordings with vocals & artists).
// ─────────────────────────────────────────────────────────────────────────────

import { STORY_MUSIC_TRACKS } from '../data/storyMusic'

let currentActiveAudio = null

/**
 * Resolves a music object or URL to the real studio track audio URL.
 */
export function resolveAudioUrl(music) {
  if (!music) return null

  // If a string URL was passed directly
  if (typeof music === 'string') {
    if (music.includes('itunes.apple.com') || (music.startsWith('http') && !music.includes('mixkit.co'))) {
      return music
    }
    // Try to find in STORY_MUSIC_TRACKS by id or title
    const found = STORY_MUSIC_TRACKS.find(t => t.id === music || t.title.toLowerCase() === music.toLowerCase())
    if (found?.audioUrl) return found.audioUrl
    return music
  }

  // If already an official iTunes preview URL, return it directly!
  if (music.audioUrl && music.audioUrl.includes('itunes.apple.com')) {
    return music.audioUrl
  }

  // Lookup in catalog by ID or by Track Title to get the real iTunes preview
  const catalogTrack = STORY_MUSIC_TRACKS.find(t =>
    (music.id && t.id === music.id) ||
    (music.title && t.title.toLowerCase() === music.title.toLowerCase())
  )

  if (catalogTrack?.audioUrl) {
    return catalogTrack.audioUrl
  }

  // If it's another valid http URL that is not mixkit
  if (music.audioUrl && music.audioUrl.startsWith('http') && !music.audioUrl.includes('mixkit.co')) {
    return music.audioUrl
  }

  if (music.audioUrl && music.audioUrl.startsWith('/audio/')) {
    return music.audioUrl
  }

  return '/audio/anthem-winning.wav'
}

/**
 * Helper to play an audio track, stopping any previous active audio instance.
 */
export function playSharedAudio(audioElement) {
  if (currentActiveAudio && currentActiveAudio !== audioElement) {
    try {
      currentActiveAudio.pause()
    } catch {}
  }
  currentActiveAudio = audioElement
}

export function stopSharedAudio() {
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause()
    } catch {}
    currentActiveAudio = null
  }
}
