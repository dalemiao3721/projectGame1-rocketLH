/**
 * Web Audio API sound engine for RocketLH.
 * Synthesizes all game sounds procedurally — no external audio files needed.
 *
 * Sounds:
 *   - countdownTick: short click/tick for each countdown second
 *   - betPlaced: confirmation chime (two ascending tones)
 *   - multiplierTick: rising pitch click during flight (pitch scales with multiplier)
 *   - cashoutSuccess: golden coin cascade (descending arpeggio)
 *   - crashExplosion: low rumble + noise burst
 *   - roundStart: ascending sweep signaling flight begin
 */

let ctx: AudioContext | null = null
let _muted = false
let _unlocked = false

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

/**
 * Mobile browsers require user gesture to unlock AudioContext.
 * Call this on first touch/click interaction.
 */
export function unlockAudio(): void {
  if (_unlocked) return
  const ac = getCtx()
  if (ac.state === 'suspended') {
    ac.resume()
  }
  // Play a silent buffer to fully unlock
  const buf = ac.createBuffer(1, 1, ac.sampleRate)
  const src = ac.createBufferSource()
  src.buffer = buf
  src.connect(ac.destination)
  src.start(0)
  _unlocked = true
}

export function isMuted(): boolean {
  return _muted
}

export function setMuted(muted: boolean): void {
  _muted = muted
}

export function toggleMute(): boolean {
  _muted = !_muted
  return _muted
}

// ─── Utility: play a tone ───
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  delay = 0,
) {
  if (_muted) return
  const ac = getCtx()
  const t = ac.currentTime + delay

  const osc = ac.createOscillator()
  const gain = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(frequency, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration)
}

// ─── Utility: play noise burst ───
function playNoise(duration: number, volume = 0.1, delay = 0) {
  if (_muted) return
  const ac = getCtx()
  const t = ac.currentTime + delay

  const bufferSize = ac.sampleRate * duration
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) // decaying noise
  }

  const source = ac.createBufferSource()
  source.buffer = buffer

  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(2000, t)
  filter.frequency.exponentialRampToValueAtTime(200, t + duration)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  source.start(t)
  source.stop(t + duration)
}

// ─── Sound Effects ───

/** Click for betting countdown seconds. Only plays during BETTING phase. */
export function countdownTick(remaining: number, phase: 'WAITING' | 'BETTING') {
  if (phase === 'WAITING') return

  if (remaining <= 0) {
    // Final — sharp crisp bell "噹"
    playTone(3520, 0.5, 'sine', 0.3, 0)       // A7 — sharp main
    playTone(4186, 0.3, 'sine', 0.2, 0)       // C8 — high sparkle
    playTone(2637, 0.6, 'sine', 0.15, 0)      // E7 — body
    playTone(1760, 0.8, 'sine', 0.06, 0.01)   // A6 — undertone
  } else {
    playTone(800, 0.08, 'square', 0.06)
  }
}

/** Two ascending tones — bet confirmation */
export function betPlaced() {
  playTone(520, 0.12, 'sine', 0.12, 0)
  playTone(780, 0.15, 'sine', 0.12, 0.08)
}

/** Rising click during flight — pitch increases with multiplier */
export function multiplierTick(multiplier: number) {
  const freq = 300 + Math.min(multiplier * 80, 1200)
  playTone(freq, 0.04, 'triangle', 0.04)
}

/** No sound on round start — the bell "ding" at countdown end is sufficient */
export function roundStart() {
  // intentionally silent
}

/** Golden coin cascade — cashout success */
export function cashoutSuccess() {
  const notes = [1047, 880, 1175, 988, 1319] // C6, A5, D6, B5, E6
  notes.forEach((freq, i) => {
    playTone(freq, 0.2, 'sine', 0.1, i * 0.07)
  })
}

/** Low rumble + noise burst — crash explosion */
export function crashExplosion() {
  // Sub bass rumble
  playTone(60, 0.6, 'sine', 0.2)
  playTone(45, 0.8, 'triangle', 0.15, 0.05)
  // Noise burst
  playNoise(0.5, 0.15)
  // Impact transient
  playTone(120, 0.15, 'square', 0.1)
}
