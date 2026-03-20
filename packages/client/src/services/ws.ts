import type { ServerMessage, ClientMessage } from '@rocket-lh/shared'

type MessageHandler = (msg: ServerMessage) => void

export class WsClient {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string
  private intentionalClose = false

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    // Don't reconnect if already open or connecting
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return

    this.intentionalClose = false
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[WS] Connected to', this.url)
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data)
        this.handlers.forEach((h) => h(msg))
      } catch {
        console.warn('[WS] Failed to parse message:', event.data)
      }
    }

    this.ws.onclose = () => {
      // Only auto-reconnect if not intentionally closed
      if (!this.intentionalClose) {
        console.log('[WS] Disconnected, reconnecting in 2s...')
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // Don't close on error — let onclose handle it
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending:', msg.action, msg.data)
      this.ws.send(JSON.stringify(msg))
    } else {
      console.warn('[WS] Cannot send, readyState:', this.ws?.readyState)
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 2000)
  }
}

// WebSocket endpoint — connect via same host (gateway proxies /rocketLH/ws → port 4002)
const wsProtocol = typeof location !== 'undefined' && location.protocol === 'https:' ? 'wss:' : 'ws:'
const wsHost = typeof location !== 'undefined' ? location.host : 'localhost:3001'
export const wsClient = new WsClient(`${wsProtocol}//${wsHost}/rocketLH/ws`)
