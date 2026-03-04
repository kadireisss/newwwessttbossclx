import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/routes';

// ============================================
// LIVE FEED HOOK - WebSocket + Polling Fallback
// ============================================

interface LiveLog {
  id: number;
  domainId: number;
  domain?: string;
  ipAddress: string;
  userAgent: string | null;
  isBot: boolean;
  botScore: number | null;
  botReasons: string | null;
  destination: string | null;
  createdAt: string;
}

interface UseLiveFeedOptions {
  enabled?: boolean;
  maxLogs?: number;
  onNewLog?: (log: LiveLog) => void;
}

const WS_MAX_RETRIES = 2;
const POLL_INTERVAL = 5000;
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};
const devError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error(...args);
};

export function useLiveFeed(options: UseLiveFeedOptions = {}) {
  const { enabled = true, maxLogs = 50, onNewLog } = options;
  
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<string>(new Date(Date.now() - 30000).toISOString());
  const wsRetriesRef = useRef(0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<'connecting' | 'websocket' | 'polling' | 'disconnected'>('connecting');
  const [clientCount, setClientCount] = useState(0);
  const [liveLogs, setLiveLogs] = useState<LiveLog[]>([]);
  const [liveStats, setLiveStats] = useState({
    liveTotal: 0,
    liveBots: 0,
    liveReal: 0,
  });

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    devLog('[LiveFeed] Starting polling mode');
    setMode('polling');
    setIsConnected(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/live/poll?since=${encodeURIComponent(lastPollTimeRef.current)}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        
        const data = await res.json();
        lastPollTimeRef.current = data.timestamp;
        
        if (data.logs && data.logs.length > 0) {
          setLiveLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLogs = data.logs.filter((l: LiveLog) => !existingIds.has(l.id));
            
            if (newLogs.length > 0) {
              setLiveStats(prev => ({
                liveTotal: prev.liveTotal + newLogs.length,
                liveBots: prev.liveBots + newLogs.filter((l: LiveLog) => l.isBot).length,
                liveReal: prev.liveReal + newLogs.filter((l: LiveLog) => !l.isBot).length,
              }));
              newLogs.forEach((log: LiveLog) => onNewLog?.(log));
              queryClient.invalidateQueries({ 
                queryKey: [api.stats.dashboard.path],
                refetchType: 'none'
              });
            }
            
            return [...newLogs, ...prev].slice(0, maxLogs);
          });
        }
      } catch (e) {
        devError('[LiveFeed] Poll error:', e);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL);
  }, [maxLogs, onNewLog, queryClient]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/live`;
    
    devLog(`[LiveFeed] WS attempt ${wsRetriesRef.current + 1}/${WS_MAX_RETRIES + 1}`);
    setMode('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        wsRetriesRef.current = 0;
        setIsConnected(true);
        setMode('websocket');
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        setIsConnected(false);
        wsRetriesRef.current++;
        
        if (wsRetriesRef.current > WS_MAX_RETRIES) {
          startPolling();
        } else if (enabled) {
          setTimeout(connectWs, 2000);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              setClientCount(message.data?.clientCount || 0);
              break;

            case 'new_log': {
              const log = message.data as LiveLog;
              setLiveLogs(prev => [log, ...prev].slice(0, maxLogs));
              setLiveStats(prev => ({
                liveTotal: prev.liveTotal + 1,
                liveBots: prev.liveBots + (log.isBot ? 1 : 0),
                liveReal: prev.liveReal + (log.isBot ? 0 : 1),
              }));
              onNewLog?.(log);
              queryClient.invalidateQueries({ 
                queryKey: [api.stats.dashboard.path],
                refetchType: 'none'
              });
              break;
            }

            case 'domain_click':
              queryClient.invalidateQueries({ 
                queryKey: ['/api/domains'],
                refetchType: 'none'
              });
              break;
          }
        } catch (e) {
          devError('[LiveFeed] Parse error:', e);
        }
      };
    } catch {
      wsRetriesRef.current++;
      if (wsRetriesRef.current > WS_MAX_RETRIES) {
        startPolling();
      }
    }
  }, [enabled, maxLogs, onNewLog, queryClient, startPolling]);

  const disconnect = useCallback(() => {
    stopPolling();
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
    setMode('disconnected');
  }, [stopPolling]);

  const resetStats = useCallback(() => {
    setLiveStats({ liveTotal: 0, liveBots: 0, liveReal: 0 });
    setLiveLogs([]);
    lastPollTimeRef.current = new Date().toISOString();
  }, []);

  useEffect(() => {
    if (enabled) {
      wsRetriesRef.current = 0;
      connectWs();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'websocket') return;
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [mode]);

  return {
    isConnected,
    mode,
    clientCount,
    liveLogs,
    liveStats,
    connect: connectWs,
    disconnect,
    resetStats,
  };
}

export function useLiveStatus() {
  const [isConnected, setIsConnected] = useState(false);
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
    ws.onopen = () => { setIsConnected(true); ws.close(); };
    ws.onerror = () => setIsConnected(false);
    return () => ws.close();
  }, []);
  return isConnected;
}
