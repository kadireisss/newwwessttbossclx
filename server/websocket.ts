import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { pool } from './db';

// ============================================
// WEBSOCKET MANAGER - Canlı Akış Sistemi
// ============================================

interface LiveClient {
  ws: WebSocket;
  authenticated: boolean;
  lastPing: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, LiveClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  // Singleton pattern
  private static instance: WebSocketManager;
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/live',
      // Performans ayarları
      perMessageDeflate: false,
      maxPayload: 64 * 1024, // 64KB max
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      void this.handleConnection(ws, req);
    });

    // Heartbeat - bağlantı kontrolü
    this.pingInterval = setInterval(() => this.heartbeat(), 30000);

    console.log('[WS] WebSocket server initialized on /ws/live');
  }

  private extractSessionId(cookieHeader: string): string | null {
    const match = cookieHeader.match(/(?:^|;\s*)__sid=([^;]+)/);
    if (!match) return null;

    let raw = "";
    try {
      raw = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
    if (!raw) return null;

    // express-session signed cookie format: s:<sessionId>.<signature>
    if (raw.startsWith("s:")) {
      const unsignedPart = raw.slice(2);
      const dotIdx = unsignedPart.lastIndexOf(".");
      if (dotIdx > 0) return unsignedPart.slice(0, dotIdx);
      return null;
    }

    return raw;
  }

  private async hasValidSession(cookieHeader: string): Promise<boolean> {
    const sid = this.extractSessionId(cookieHeader);
    if (!sid) return false;

    try {
      const result = await pool.query(
        "SELECT 1 FROM user_sessions WHERE sid = $1 AND expire > NOW() LIMIT 1",
        [sid],
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error: any) {
      console.error("[WS] Session check failed:", error?.message || error);
      return false;
    }
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    const cookieHeader = typeof req.headers.cookie === "string" ? req.headers.cookie : "";
    const hasSession = await this.hasValidSession(cookieHeader);

    const client: LiveClient = {
      ws,
      authenticated: hasSession, // Session varsa authenticated
      lastPing: Date.now()
    };

    this.clients.set(ws, client);
    console.log(`[WS] Client connected (auth: ${hasSession}) - Total: ${this.clients.size}`);

    // Hoşgeldin mesajı
    this.send(ws, {
      type: 'connected',
      data: { 
        message: 'Canlı akış bağlantısı kuruldu',
        timestamp: new Date().toISOString(),
        clientCount: this.clients.size
      }
    });

    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', (err) => console.error('[WS] Error:', err.message));
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) client.lastPing = Date.now();
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    try {
      const msg = JSON.parse(data.toString());
      
      switch (msg.type) {
        case 'ping':
          this.send(ws, { type: 'pong', data: { timestamp: Date.now() } });
          break;
        case 'subscribe':
          // İleride channel-based subscription eklenebilir
          break;
      }
    } catch {
      // Invalid JSON - ignore
    }
  }

  private handleClose(ws: WebSocket) {
    this.clients.delete(ws);
    console.log(`[WS] Client disconnected - Total: ${this.clients.size}`);
  }

  private heartbeat() {
    const now = Date.now();
    const timeout = 60000; // 60s timeout

    this.clients.forEach((client, ws) => {
      if (now - client.lastPing > timeout) {
        console.log('[WS] Client timed out, terminating');
        ws.terminate();
        this.clients.delete(ws);
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }

  private send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // ============================================
  // PUBLIC BROADCAST METHODS
  // ============================================

  // Yeni log geldiğinde herkese broadcast
  broadcastLog(log: any) {
    const message = {
      type: 'new_log',
      data: log,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  // Stats güncellemesi
  broadcastStats(stats: any) {
    const message = {
      type: 'stats_update',
      data: stats,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  // Domain click güncellemesi  
  broadcastDomainClick(domainId: number, isBot: boolean) {
    const message = {
      type: 'domain_click',
      data: { domainId, isBot },
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);
  }

  // Genel broadcast
  private broadcast(message: any) {
    const payload = JSON.stringify(message);

    this.clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN && client.authenticated) {
        ws.send(payload);
      }
    });
  }

  // Stats
  getStats() {
    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length
    };
  }

  // Cleanup
  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.clients.forEach((_, ws) => ws.terminate());
    this.wss?.close();
  }
}

// Singleton export
export const wsManager = WebSocketManager.getInstance();
