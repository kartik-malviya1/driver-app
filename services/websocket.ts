import { WS_BASE_URL } from '../constants/config';

type MessageHandler = (data: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private driverId: number | null = null;
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isIntentionallyClosed = false;

  /**
   * Connect to WebSocket and register as a driver.
   */
  connect(driverId: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.driverId = driverId;
    this.isIntentionallyClosed = false;
    this.reconnectAttempts = 0;

    this._connect();
  }

  private _connect() {
    try {
      console.log(`[WS] Connecting to ${WS_BASE_URL}...`);
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;

        // Register as driver
        if (this.driverId) {
          this._send({
            type: 'REGISTER',
            role: 'driver',
            id: this.driverId,
          });
        }

        // Start ping keep-alive
        this._startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          console.log('[WS] Received:', data.type || data.event);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Connection closed');
        this._stopPing();

        if (!this.isIntentionallyClosed) {
          this._reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      this._reconnect();
    }
  }

  /**
   * Disconnect WebSocket intentionally.
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this._stopPing();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('[WS] Disconnected intentionally');
  }

  /**
   * Send location update via WebSocket.
   */
  sendLocationUpdate(driverId: number, lat: number, lng: number) {
    this._send({
      type: 'LOCATION_UPDATE',
      role: 'driver',
      id: driverId,
      lat,
      lng,
    });
  }

  /**
   * Register a message handler.
   * Returns a cleanup function to unregister.
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Check if currently connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Private Methods ───

  private _send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send — not connected');
    }
  }

  private _reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this._connect();
    }, delay);
  }

  private _startPing() {
    this._stopPing();
    this.pingInterval = setInterval(() => {
      this._send({ type: 'PING' });
    }, 30000);
  }

  private _stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
