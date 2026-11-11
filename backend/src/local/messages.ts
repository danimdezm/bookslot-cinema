import type { Show } from '../domain/types';

export const LOCAL_MESSAGES = {
  tableCreated: 'Tabla creada',
  noStream: (table: string) => `La tabla ${table} no tiene stream`,
  streamPollerFailed: 'Stream poller',
  notificationFailed: 'Notificación local fallida',
  taskTooFar: 'Tarea demasiado lejana para el scheduler local, se omite',
  taskFailed: 'Tarea programada fallida',

  request: (method: string, path: string, status: number | undefined, ms: number) =>
    `${method} ${path} → ${status} (${ms} ms)`,

  banner: (port: number) => `\nBookSlot API local → http://localhost:${port}  (WebSocket ws://localhost:${port}/ws?showId=...)`,
  tableInfo: (table: string, endpoint: string | undefined, mailer: string) =>
    `Tabla ${table} @ ${endpoint} · mailer: ${mailer}`,
  authHelp: 'Auth local: cabeceras X-User-Id, X-User-Email, X-User-Groups (admin)\n',
  route: (method: string, path: string, access: string) => `  ${method.padEnd(6)} ${path.padEnd(38)} ${access}`,

  seedSummary: (table: string, movies: number, rooms: number, shows: number) =>
    `Tabla ${table}: ${movies} películas, ${rooms} salas, ${shows} sesiones\n`,
  seedShow: (s: Show) => `  ${s.showId}  ${s.startsAt}  ${s.movieTitle} · ${s.roomName}`,
  seedTry: (showId: string | undefined) => `\nPrueba:  curl -s http://localhost:3000/shows/${showId} | head -c 400`,
} as const;
