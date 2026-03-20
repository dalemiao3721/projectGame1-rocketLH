/**
 * RoundManager — Round lifecycle state machine with timing control.
 *
 * State transitions:
 *   WAITING (5s) → BETTING (8s) → FLYING (until crash) → CRASHED → SETTLED (3s) → WAITING...
 *
 * Emits events: 'waiting', 'betting', 'flying', 'multiplier_update',
 *               'auto_cashout', 'crashed', 'settled'
 */

import { EventEmitter } from 'node:events'
import type { RoundPhase } from '@rocket-lh/shared'
import { ROUND_TIMING } from '@rocket-lh/shared'
import { calculateMultiplierAtTime } from './CrashMath.js'

export interface RoundManagerEvents {
  waiting: [countdown: number]
  betting: [sessionId: string, serverSeedHash: string, countdown: number]
  countdown_tick: [countdown: number]
  flying: []
  multiplier_update: [multiplier: number, elapsed: number]
  auto_cashout: [multiplier: number]
  crashed: [crashMultiplier: number]
  settled: []
}

export class RoundManager extends EventEmitter<RoundManagerEvents> {
  private phase: RoundPhase = 'WAITING'
  private multiplier: number = 1.0
  private crashPoint: number = 1.0
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private phaseTimer: ReturnType<typeof setTimeout> | null = null
  private countdownTimer: ReturnType<typeof setInterval> | null = null
  private flyingStartTime: number = 0
  private phaseStartTime: number = 0
  private phaseDuration: number = 0

  getPhase(): RoundPhase {
    return this.phase
  }

  getMultiplier(): number {
    return this.multiplier
  }

  getCountdown(): number {
    if (this.phase !== 'WAITING' && this.phase !== 'BETTING') return 0
    const elapsed = Date.now() - this.phaseStartTime
    return Math.max(0, Math.ceil((this.phaseDuration - elapsed) / 1000))
  }

  getElapsed(): number {
    if (this.phase !== 'FLYING') return 0
    return Date.now() - this.flyingStartTime
  }

  /**
   * Start a new round cycle: WAITING → BETTING → FLYING → CRASHED → SETTLED → loop
   */
  startNewRound(crashPoint: number, sessionId: string, serverSeedHash: string): void {
    this.cleanup()
    this.crashPoint = crashPoint
    this.multiplier = 1.0

    this.enterWaiting(sessionId, serverSeedHash)
  }

  /** Stop all timers and reset */
  stop(): void {
    this.cleanup()
    this.phase = 'WAITING'
    this.multiplier = 1.0
  }

  // --- Phase transitions ---

  private enterWaiting(sessionId: string, serverSeedHash: string): void {
    this.phase = 'WAITING'
    const countdownSec = ROUND_TIMING.WAITING_DURATION / 1000
    this.emit('waiting', countdownSec)
    this.startCountdownTicks(ROUND_TIMING.WAITING_DURATION)

    this.phaseTimer = setTimeout(() => {
      this.stopCountdownTicks()
      this.enterBetting(sessionId, serverSeedHash)
    }, ROUND_TIMING.WAITING_DURATION)
  }

  private enterBetting(sessionId: string, serverSeedHash: string): void {
    this.phase = 'BETTING'
    const countdownSec = ROUND_TIMING.BETTING_DURATION / 1000
    this.emit('betting', sessionId, serverSeedHash, countdownSec)
    this.startCountdownTicks(ROUND_TIMING.BETTING_DURATION)

    this.phaseTimer = setTimeout(() => {
      this.stopCountdownTicks()
      // 1 second "NO MORE BET" pause before flying
      this.emit('countdown_tick', 0)
      this.phaseTimer = setTimeout(() => {
        this.enterFlying()
      }, 1000)
    }, ROUND_TIMING.BETTING_DURATION)
  }

  private startCountdownTicks(durationMs: number): void {
    this.stopCountdownTicks()
    this.phaseStartTime = Date.now()
    this.phaseDuration = durationMs
    this.countdownTimer = setInterval(() => {
      const elapsed = Date.now() - this.phaseStartTime
      const remaining = Math.max(0, Math.ceil((this.phaseDuration - elapsed) / 1000))
      this.emit('countdown_tick', remaining)
    }, 1000)
  }

  private stopCountdownTicks(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
  }

  private enterFlying(): void {
    this.phase = 'FLYING'
    this.multiplier = 1.0
    this.flyingStartTime = Date.now()
    this.emit('flying')

    // Immediate crash check (crashPoint === 1.00)
    if (this.crashPoint <= 1.0) {
      this.crash()
      return
    }

    this.tickTimer = setInterval(() => {
      this.tick()
    }, ROUND_TIMING.TICK_INTERVAL)
  }

  private tick(): void {
    const elapsed = Date.now() - this.flyingStartTime
    this.multiplier = calculateMultiplierAtTime(elapsed)

    // Emit for auto-cashout checking before potential crash
    this.emit('multiplier_update', this.multiplier, elapsed)

    // Check if auto-cashout threshold reached for any bets
    this.emit('auto_cashout', this.multiplier)

    if (this.multiplier >= this.crashPoint) {
      this.multiplier = this.crashPoint
      this.crash()
    }
  }

  private crash(): void {
    this.clearTickTimer()
    this.phase = 'CRASHED'
    this.emit('crashed', this.crashPoint)

    // Auto-transition to SETTLED after display duration
    this.phaseTimer = setTimeout(() => {
      this.enterSettled()
    }, ROUND_TIMING.SETTLED_DURATION)
  }

  private enterSettled(): void {
    this.phase = 'SETTLED'
    this.emit('settled')
  }

  // --- Cleanup ---

  private cleanup(): void {
    this.clearTickTimer()
    this.stopCountdownTicks()
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer)
      this.phaseTimer = null
    }
  }

  private clearTickTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }
}
