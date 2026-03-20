import type {
  PlaceBetRequest,
  PlaceBetResponse,
  CashoutRequest,
  CashoutResponse,
  HistoryResponse,
  VerifyResponse,
  RoundStateResponse,
  ApiError,
} from '@rocket-lh/shared'

const API_BASE = '/rocketLH/api/game'

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })

    if (!res.ok) {
      const err: ApiError = await res.json()
      throw new Error(err.error?.message ?? `HTTP ${res.status}`)
    }

    return res.json()
  }

  placeBet(data: PlaceBetRequest): Promise<PlaceBetResponse> {
    return this.request('/bet', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  cashout(data: CashoutRequest): Promise<CashoutResponse> {
    return this.request('/cashout', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  getHistory(limit = 10): Promise<HistoryResponse> {
    return this.request(`/history?limit=${limit}`)
  }

  verify(serverSeed: string, clientSeed: string, nonce: number): Promise<VerifyResponse> {
    const params = new URLSearchParams({ serverSeed, clientSeed, nonce: String(nonce) })
    return this.request(`/verify?${params}`)
  }

  getRoundState(): Promise<RoundStateResponse> {
    return this.request('/round-state')
  }

  /** Fetch balance from the lobby wallet API (lobby mode only) */
  async getLobbyBalance(lobbyToken: string): Promise<{ balance: number; currency: string }> {
    const res = await fetch('/api/game/balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${lobbyToken}` },
    })
    if (!res.ok) {
      throw new Error(`Failed to get lobby balance: HTTP ${res.status}`)
    }
    return res.json()
  }
}

export const apiClient = new ApiClient()
