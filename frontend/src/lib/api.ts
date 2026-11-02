import { config } from './config';
import type { AuditEntry, Booking, BookingFilters, Hold, Movie, Page, Payment, Room, RoomRow, Show, ShowAvailability } from '@/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  get seats(): string[] {
    return ((this.details as { seats?: string[] } | undefined)?.seats ?? []) as string[];
  }
}

let authHeaders: () => Record<string, string> = () => ({});

export function setAuthHeaders(provider: () => Record<string, string>) {
  authHeaders = provider;
}

async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...authHeaders(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se puede conectar con el servidor');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? `Error ${res.status}`, err.details);
  }
  return data as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

export const api = {
  movies: () => request<{ items: Movie[] }>('GET', '/movies').then((r) => r.items),
  movie: (movieId: string) => request<Movie>('GET', `/movies/${movieId}`),
  movieShows: (movieId: string, from?: string, to?: string) =>
    request<{ items: Show[] }>('GET', `/movies/${movieId}/shows${qs({ from, to })}`).then((r) => r.items),
  show: (showId: string) => request<ShowAvailability>('GET', `/shows/${showId}`),

  createHold: (showId: string, seats: string[], idempotencyKey: string) =>
    request<Hold>('POST', `/shows/${showId}/holds`, { seats }, { 'idempotency-key': idempotencyKey }),
  hold: (holdId: string) => request<Hold>('GET', `/holds/${holdId}`),
  releaseHold: (holdId: string) => request<Hold>('DELETE', `/holds/${holdId}`),
  startPayment: (holdId: string) => request<Payment>('POST', `/holds/${holdId}/payment`),
  confirmHold: (holdId: string) => request<Booking>('POST', `/holds/${holdId}/confirm`),

  myBookings: (filters: BookingFilters) => request<Page<Booking>>('GET', `/me/bookings${qs(filters)}`),
  myBooking: (bookingId: string) => request<Booking>('GET', `/me/bookings/${bookingId}`),
  cancelBooking: (bookingId: string) => request<Booking>('DELETE', `/me/bookings/${bookingId}`),

  admin: {
    createMovie: (movie: Omit<Movie, 'movieId'>) => request<Movie>('POST', '/admin/movies', movie),
    rooms: () => request<{ items: Room[] }>('GET', '/admin/rooms').then((r) => r.items),
    createRoom: (room: { name: string; rows: RoomRow[] }) => request<Room>('POST', '/admin/rooms', room),
    shows: (from?: string, to?: string) => request<{ items: Show[] }>('GET', `/admin/shows${qs({ from, to })}`).then((r) => r.items),
    createShow: (show: { movieId: string; roomId: string; startsAt: string; priceCents: number }) =>
      request<Show>('POST', '/admin/shows', show),
    showBookings: (showId: string) => request<{ items: Booking[] }>('GET', `/admin/shows/${showId}/bookings`).then((r) => r.items),
    block: (showId: string, reason: string) =>
      request<{ show: Show; cancelledBookings: number; failedBookings: string[] }>('POST', `/admin/shows/${showId}/block`, { reason }),
    unblock: (showId: string) => request<Show>('POST', `/admin/shows/${showId}/unblock`),
    bookingAudit: (bookingId: string) => request<{ items: AuditEntry[] }>('GET', `/admin/bookings/${bookingId}/audit`).then((r) => r.items),
    cancelBooking: (bookingId: string, reason: string) => request<Booking>('DELETE', `/admin/bookings/${bookingId}`, { reason }),
  },
};
