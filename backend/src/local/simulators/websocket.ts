import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Realtime } from '../../providers/realtime';

const subscribers = new Map<string, Set<WebSocket>>();

export const localRealtime: Realtime = {
  async broadcast(showId, message) {
    const data = JSON.stringify(message);
    for (const ws of subscribers.get(showId) ?? []) if (ws.readyState === ws.OPEN) ws.send(data);
  },
};

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    const showId = new URL(req.url ?? '', 'http://localhost').searchParams.get('showId');
    if (!showId) return ws.close(1008, 'showId requerido');
    const set = subscribers.get(showId) ?? new Set();
    set.add(ws);
    subscribers.set(showId, set);
    ws.on('close', () => set.delete(ws));
  });
}
