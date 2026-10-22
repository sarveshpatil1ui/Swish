// scripts/generate-event-tracks.js
import fs from 'fs'
import path from 'path'

function createWavBuffer(sampleRate, durationSeconds, generateSample) {
  const numChannels = 2
  const bitsPerSample = 16
  const numSamples = Math.floor(sampleRate * durationSeconds)
  const dataSize = numSamples * numChannels * (bitsPerSample / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM format
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const [left, right] = generateSample(t, i)
    const clamp = (v) => Math.max(-0.95, Math.min(0.95, v))
    buffer.writeInt16LE(Math.floor(clamp(left) * 32767), offset)
    buffer.writeInt16LE(Math.floor(clamp(right) * 32767), offset + 2)
    offset += 4
  }
  return buffer
}

const dir = path.join(process.cwd(), 'public', 'audio')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const SAMPLE_RATE = 44100
const DURATION = 12 // 12-second seamless loops

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANTHEM-WINNING: Grand entry, victory fanfare, driving pulse
// ─────────────────────────────────────────────────────────────────────────────
const anthemWinning = createWavBuffer(SAMPLE_RATE, DURATION, (t) => {
  const bpm = 128
  const beatTime = 60 / bpm
  const beat = (t / beatTime) % 1
  const beatIndex = Math.floor(t / beatTime) % 4
  const barIndex = Math.floor(t / (beatTime * 4))

  // Epic deep kick drum on 1, 2, 3, 4
  const kickEnv = Math.max(0, 1 - beat * 4.5)
  const kickPitch = 55 + 110 * kickEnv * kickEnv
  const kick = Math.sin(2 * Math.PI * kickPitch * beat) * kickEnv

  // Crisp snare with snap on beats 2 & 4
  const isSnare = (beatIndex === 1 || beatIndex === 3)
  const snareEnv = isSnare ? Math.max(0, 1 - beat * 3.5) : 0
  const snare = ((Math.random() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 180 * beat) * 0.3) * snareEnv

  // Hi-hat groove on off-beats
  const offBeat = ((t / beatTime) + 0.5) % 1
  const hatEnv = Math.max(0, 1 - offBeat * 8)
  const hat = (Math.random() * 2 - 1) * hatEnv * 0.18

  // Heroic Chord progression: D - A - Bm - G
  const chordMap = [
    [293.66, 369.99, 440.00], // D major
    [220.00, 277.18, 329.63], // A major
    [246.94, 293.66, 369.99], // B minor
    [196.00, 246.94, 293.66], // G major
  ]
  const chord = chordMap[barIndex % 4]
  let synthBrass = 0
  chord.forEach((freq, idx) => {
    // Sawtooth-like rich harmonics
    synthBrass += Math.sin(2 * Math.PI * freq * t) * 0.12
    synthBrass += Math.sin(2 * Math.PI * freq * 2 * t) * 0.06
    synthBrass += Math.sin(2 * Math.PI * freq * 3 * t) * 0.03
  })

  // Victory Fanfare Lead melody
  const leadNotes = [587.33, 659.25, 739.99, 880.00, 739.99, 880.00, 987.77, 880.00]
  const noteIdx = Math.floor(t / (beatTime / 2)) % leadNotes.length
  const leadFreq = leadNotes[noteIdx]
  const noteEnv = Math.max(0.1, 1 - ((t / (beatTime / 2)) % 1) * 1.5)
  const lead = (Math.sin(2 * Math.PI * leadFreq * t) + 0.4 * Math.sin(4 * Math.PI * leadFreq * t)) * noteEnv * 0.22

  const left = kick * 0.6 + snare * 0.4 + hat * 0.2 + synthBrass * 0.45 + lead * 0.4
  const right = kick * 0.6 + snare * 0.4 - hat * 0.2 + synthBrass * 0.45 + lead * 0.38
  return [left * 0.85, right * 0.85]
})
fs.writeFileSync(path.join(dir, 'anthem-winning.wav'), anthemWinning)

// ─────────────────────────────────────────────────────────────────────────────
// 2. CELEBRATION-FEST: Zingaat / Dhol-Tasha / Marathi Fest High-Energy Beat
// ─────────────────────────────────────────────────────────────────────────────
const celebrationFest = createWavBuffer(SAMPLE_RATE, DURATION, (t) => {
  const bpm = 138 // Upbeat energetic festival tempo
  const beatTime = 60 / bpm
  const beat = (t / beatTime) % 1

  // Marathi Dhol rhythm pattern: Dha... Dha-Ge-Na-Tin...
  const dholPhase = (t / (beatTime / 2)) % 1
  const subBeat = Math.floor(t / (beatTime / 4)) % 4

  // Heavy Dhol bass slap (thumping low end)
  const isDholHit = (subBeat === 0 || subBeat === 2 || subBeat === 3)
  const dholEnv = isDholHit ? Math.max(0, 1 - dholPhase * 4) : 0
  const dholBass = Math.sin(2 * Math.PI * (70 + 60 * dholEnv) * t) * dholEnv

  // High-pitched metallic Tasha / Tashan rolls
  const tashaEnv = Math.max(0, 1 - ((t / (beatTime / 4)) % 1) * 5)
  const tasha = ((Math.random() * 2 - 1) * 0.6 + Math.sin(2 * Math.PI * 480 * t) * 0.4) * tashaEnv * 0.3

  // Euphoric Fest Shehnai / Synth hook (pentatonic festival scale: E - F# - G# - B - C#)
  const festNotes = [659.25, 739.99, 830.61, 987.77, 1108.73, 987.77, 830.61, 739.99]
  const noteIdx = Math.floor(t / (beatTime / 2)) % festNotes.length
  const shehnaiFreq = festNotes[noteIdx]
  const shehnaiEnv = Math.max(0.2, 1 - ((t / (beatTime / 2)) % 1) * 1.8)
  const shehnai = (
    Math.sin(2 * Math.PI * shehnaiFreq * t) +
    0.5 * Math.sin(2 * Math.PI * shehnaiFreq * 2 * t) +
    0.25 * Math.sin(2 * Math.PI * shehnaiFreq * 3 * t)
  ) * shehnaiEnv * 0.28

  // Fest clapping / ghungroo accents
  const clapEnv = (Math.floor(t / beatTime) % 2 === 1) ? Math.max(0, 1 - beat * 4) : 0
  const clap = (Math.random() * 2 - 1) * clapEnv * 0.25

  const left = (dholBass * 0.65 + tasha * 0.4 + shehnai * 0.45 + clap * 0.3)
  const right = (dholBass * 0.65 - tasha * 0.4 + shehnai * 0.42 + clap * 0.3)
  return [left * 0.82, right * 0.82]
})
fs.writeFileSync(path.join(dir, 'celebration-fest.wav'), celebrationFest)

// ─────────────────────────────────────────────────────────────────────────────
// 3. ATTITUDE-FLEX: Swagger Trap/Hip-hop 808 Bass & Bouncing Hats
// ─────────────────────────────────────────────────────────────────────────────
const attitudeFlex = createWavBuffer(SAMPLE_RATE, DURATION, (t) => {
  const bpm = 110 // Half-time bounce
  const beatTime = 60 / bpm
  const beat = (t / beatTime) % 1
  const beatIndex = Math.floor(t / beatTime) % 4

  // Deep Sub 808 bass slide
  const bassNotes = [43.65, 43.65, 38.89, 48.99] // F, F, D#, G
  const currentBassFreq = bassNotes[Math.floor(t / (beatTime * 4)) % bassNotes.length]
  const bassEnv = Math.max(0.1, 1 - (beat * 0.7))
  const sub808 = (Math.sin(2 * Math.PI * currentBassFreq * t) + 0.3 * Math.sin(2 * Math.PI * currentBassFreq * 2 * t)) * bassEnv * 0.6

  // Snappy rimshot on 2 & 4
  const isRim = (beatIndex === 1 || beatIndex === 3)
  const rimEnv = isRim ? Math.max(0, 1 - beat * 6) : 0
  const rim = ((Math.random() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 400 * t) * 0.3) * rimEnv * 0.4

  // Rolling Trap Hi-hats with triplets
  const hatStep = (t / (beatTime / 4)) % 1
  const hatEnv = Math.max(0, 1 - hatStep * 8)
  const hat = (Math.random() * 2 - 1) * hatEnv * 0.2

  // Pluck Synth melody (Dark, attitude vibe)
  const pluckNotes = [349.23, 392.00, 440.00, 523.25, 440.00, 392.00]
  const pIdx = Math.floor(t / (beatTime / 2)) % pluckNotes.length
  const pFreq = pluckNotes[pIdx]
  const pEnv = Math.max(0, 1 - ((t / (beatTime / 2)) % 1) * 3)
  const pluck = (Math.sin(2 * Math.PI * pFreq * t) + 0.4 * Math.sin(4 * Math.PI * pFreq * t)) * pEnv * 0.26

  const left = sub808 + rim * 0.5 + hat * 0.25 + pluck * 0.45
  const right = sub808 + rim * 0.5 - hat * 0.25 + pluck * 0.45
  return [left * 0.85, right * 0.85]
})
fs.writeFileSync(path.join(dir, 'attitude-flex.wav'), attitudeFlex)

// ─────────────────────────────────────────────────────────────────────────────
// 4. PARTY-REMIX: 128 BPM Club Dance Floor / DJ Beat
// ─────────────────────────────────────────────────────────────────────────────
const partyRemix = createWavBuffer(SAMPLE_RATE, DURATION, (t) => {
  const bpm = 128
  const beatTime = 60 / bpm
  const beat = (t / beatTime) % 1
  const beatIndex = Math.floor(t / beatTime) % 4
  const barIndex = Math.floor(t / (beatTime * 4))

  // 4-on-the-floor punchy kick
  const kickEnv = Math.max(0, 1 - beat * 4.2)
  const kick = Math.sin(2 * Math.PI * (65 + 100 * kickEnv) * t) * kickEnv * 0.7

  // Open Hi-hat on the upbeat
  const upbeat = (beat + 0.5) % 1
  const openHatEnv = Math.max(0, 1 - upbeat * 3.5)
  const openHat = (Math.random() * 2 - 1) * openHatEnv * 0.22

  // Claps on 2 and 4
  const isClap = (beatIndex === 1 || beatIndex === 3)
  const clapEnv = isClap ? Math.max(0, 1 - beat * 4) : 0
  const clap = (Math.random() * 2 - 1) * clapEnv * 0.35

  // Sidechained Eurodance supersaw chords: Am - F - C - G
  const chordProg = [
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
    [261.63, 329.63, 392.00], // C
    [196.00, 246.94, 293.66], // G
  ]
  const chord = chordProg[barIndex % 4]
  // Sidechain pump envelope: quieter on the kick beat, pumping up
  const sidechain = Math.min(1, beat * 2)
  let sawChords = 0
  chord.forEach(f => {
    sawChords += Math.sin(2 * Math.PI * f * t) * 0.1
    sawChords += Math.sin(2 * Math.PI * f * 2 * t) * 0.05
    sawChords += Math.sin(2 * Math.PI * (f + 1.5) * t) * 0.06 // Detuned stereo shimmer
  })
  sawChords *= sidechain * 0.45

  // Arpeggiated high lead synth
  const arpNotes = [440, 523.25, 659.25, 880, 659.25, 523.25]
  const arpIdx = Math.floor(t / (beatTime / 4)) % arpNotes.length
  const arpEnv = Math.max(0, 1 - ((t / (beatTime / 4)) % 1) * 3)
  const arp = Math.sin(2 * Math.PI * arpNotes[arpIdx] * t) * arpEnv * 0.2

  const left = kick * 0.6 + openHat * 0.25 + clap * 0.35 + sawChords + arp * 0.35
  const right = kick * 0.6 - openHat * 0.25 + clap * 0.35 + sawChords + arp * 0.35
  return [left * 0.85, right * 0.85]
})
fs.writeFileSync(path.join(dir, 'party-remix.wav'), partyRemix)

// ─────────────────────────────────────────────────────────────────────────────
// 5. CAMPUS-VIBE: Soulful Acoustic / Melodic Sunset Campus Moments
// ─────────────────────────────────────────────────────────────────────────────
const campusVibe = createWavBuffer(SAMPLE_RATE, DURATION, (t) => {
  const bpm = 100
  const beatTime = 60 / bpm
  const beat = (t / beatTime) % 1
  const barIndex = Math.floor(t / (beatTime * 4))

  // Soft warm kick
  const kickEnv = Math.max(0, 1 - beat * 3)
  const kick = Math.sin(2 * Math.PI * 50 * t) * kickEnv * 0.45

  // Gentle shaker
  const shaker = (Math.random() * 2 - 1) * Math.max(0, 1 - ((t / (beatTime / 2)) % 1) * 6) * 0.12

  // Acoustic guitar-like warm picked arpeggio chords: Cmaj7 - Em7 - Fmaj7 - G
  const acousticChords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [164.81, 246.94, 329.63, 392.00], // Em7
    [174.61, 220.00, 261.63, 349.23], // Fmaj7
    [196.00, 246.94, 293.66, 392.00], // G
  ]
  const chord = acousticChords[barIndex % 4]
  const pickIdx = Math.floor(t / (beatTime / 2)) % chord.length
  const pickFreq = chord[pickIdx]
  const pickEnv = Math.max(0, 1 - ((t / (beatTime / 2)) % 1) * 1.5)
  const guitar = (
    Math.sin(2 * Math.PI * pickFreq * t) +
    0.3 * Math.sin(2 * Math.PI * pickFreq * 2 * t)
  ) * pickEnv * 0.35

  // Smooth Flute / Melodic Hum
  const melody = [523.25, 493.88, 440.00, 392.00, 349.23, 392.00, 440.00, 523.25]
  const mIdx = Math.floor(t / beatTime) % melody.length
  const mFreq = melody[mIdx]
  const mEnv = Math.sin(Math.PI * ((t / beatTime) % 1)) // Gentle swell
  const flute = (Math.sin(2 * Math.PI * mFreq * t) + 0.15 * Math.sin(4 * Math.PI * mFreq * t)) * mEnv * 0.22

  const left = kick * 0.5 + shaker * 0.2 + guitar * 0.5 + flute * 0.35
  const right = kick * 0.5 - shaker * 0.2 + guitar * 0.48 + flute * 0.38
  return [left * 0.85, right * 0.85]
})
fs.writeFileSync(path.join(dir, 'campus-vibe.wav'), campusVibe)

console.log('✅ Generated all 5 college event audio loops successfully in public/audio/!')
