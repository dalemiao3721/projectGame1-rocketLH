import { useWebSocket } from './hooks/useWebSocket'

/**
 * Invisible component that connects to the WebSocket server
 * and dispatches messages to the GameContext reducer.
 * Must be rendered inside GameProvider.
 */
export function GameConnector() {
  useWebSocket()
  return null
}
