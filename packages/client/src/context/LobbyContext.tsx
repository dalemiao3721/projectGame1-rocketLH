import { createContext, useContext, useMemo, type ReactNode } from 'react'

export interface LobbyParams {
  lobbyToken: string | null
  lobbySessionId: string | null
  isLobbyMode: boolean
}

const LobbyContext = createContext<LobbyParams>({
  lobbyToken: null,
  lobbySessionId: null,
  isLobbyMode: false,
})

/**
 * Reads lobby params from URL query string.
 * ?token=xxx&sessionId=yyy => lobby mode (embedded in game-lobby)
 * No token => standalone mode (local balance)
 */
function parseLobbyParams(): LobbyParams {
  const params = new URLSearchParams(window.location.search)
  const lobbyToken = params.get('token')
  const lobbySessionId = params.get('sessionId')
  const isLobbyMode = Boolean(lobbyToken && lobbySessionId)
  return { lobbyToken, lobbySessionId, isLobbyMode }
}

export function LobbyProvider({ children }: { children: ReactNode }) {
  const lobby = useMemo(parseLobbyParams, [])

  return (
    <LobbyContext.Provider value={lobby}>
      {children}
    </LobbyContext.Provider>
  )
}

export function useLobby(): LobbyParams {
  return useContext(LobbyContext)
}
