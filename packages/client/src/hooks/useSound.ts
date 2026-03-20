import { useEffect, useRef } from 'react'
import type { PanelId } from '@rocket-lh/shared'
import { useGameContext } from '../context/GameContext'
import * as sound from '../services/sound'

/**
 * Hook that plays sound effects in response to game state changes.
 * Must be rendered inside GameProvider.
 */
export function useSoundEffects() {
  const { state } = useGameContext()
  const prevPhase = useRef(state.roundPhase)
  const prevMultiplier = useRef(state.currentMultiplier)
  const prevCountdown = useRef(0)
  const tickCounter = useRef(0)
  const prevPanelStatuses = useRef<Record<string, string>>({})

  // Phase transitions
  useEffect(() => {
    const prev = prevPhase.current
    const next = state.roundPhase

    if (prev !== next) {
      if (next === 'FLYING') {
        sound.roundStart()
      } else if (next === 'CRASHED') {
        sound.crashExplosion()
      }
      prevPhase.current = next
    }
  }, [state.roundPhase])

  // Countdown ticks — only BETTING phase has sound
  useEffect(() => {
    if (state.roundPhase !== 'WAITING' && state.roundPhase !== 'BETTING') return
    const seconds = Math.ceil(state.countdown)
    if (seconds !== prevCountdown.current) {
      sound.countdownTick(seconds, state.roundPhase as 'WAITING' | 'BETTING')
      prevCountdown.current = seconds
    }
  }, [state.countdown, state.roundPhase])

  // Multiplier updates — play tick every ~5th update to avoid spam
  useEffect(() => {
    if (state.roundPhase !== 'FLYING') return
    if (state.currentMultiplier !== prevMultiplier.current) {
      tickCounter.current++
      if (tickCounter.current % 5 === 0) {
        sound.multiplierTick(state.currentMultiplier)
      }
      prevMultiplier.current = state.currentMultiplier
    }
  }, [state.currentMultiplier, state.roundPhase])

  // Panel status changes — bet placed & cashout
  useEffect(() => {
    const panelIds = Object.keys(state.panels) as PanelId[]
    for (const id of panelIds) {
      const prev = prevPanelStatuses.current[id]
      const next = state.panels[id].status
      if (prev !== next) {
        if (next === 'bet_placed' && prev === 'idle') {
          sound.betPlaced()
        }
        if (next === 'cashed_out' && state.panels[id].payout > 0) {
          sound.cashoutSuccess()
        }
      }
    }
    // Update refs
    const statuses: Record<string, string> = {}
    for (const id of panelIds) {
      statuses[id] = state.panels[id].status
    }
    prevPanelStatuses.current = statuses
  }, [state.panels])

  // Reset tick counter on new round
  useEffect(() => {
    if (state.roundPhase === 'WAITING') {
      tickCounter.current = 0
    }
  }, [state.roundPhase])
}
