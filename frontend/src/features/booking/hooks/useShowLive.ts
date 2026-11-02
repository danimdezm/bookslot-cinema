import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import type { LiveMessage } from '@/types';

export function useShowLive(showId: string | undefined, onMessage: (msg: LiveMessage) => void, onReconnect?: () => void) {
  const [connected, setConnected] = useState(false);
  const handlers = useRef({ onMessage, onReconnect });
  handlers.current = { onMessage, onReconnect };

  useEffect(() => {
    if (!showId) return;
    let ws: WebSocket | undefined;
    let attempt = 0;
    let closed = false;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(`${config.wsUrl}?showId=${encodeURIComponent(showId)}`);
      ws.onopen = () => {
        setConnected(true);
        if (attempt > 0) handlers.current.onReconnect?.();
        attempt = 0;
      };
      ws.onmessage = (e) => {
        try {
          handlers.current.onMessage(JSON.parse(e.data as string) as LiveMessage);
        } catch {
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        attempt += 1;
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempt, 15_000));
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [showId]);

  return { connected };
}
