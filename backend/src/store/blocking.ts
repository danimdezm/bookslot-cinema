import type { User } from '../domain/types';
import { log } from '../lib/logger';
import { cancelBooking, listShowBookings } from './bookings';
import { setShowStatus } from './catalog';

export async function blockShow(showId: string, actor: User, reason: string) {
  const show = await setShowStatus(showId, 'BLOCKED', actor.id, reason);
  const bookings = await listShowBookings(showId, 'CONFIRMED');
  const results = await Promise.allSettled(
    bookings.map((b) =>
      cancelBooking(b.bookingId, { actorId: actor.id, isAdmin: true, force: true, reason: `SHOW_BLOCKED: ${reason}` }),
    ),
  );
  const failed = results.flatMap((r, i) => (r.status === 'rejected' ? [bookings[i]!.bookingId] : []));
  if (failed.length) log.error('Reservas no canceladas al bloquear la sesión', undefined, { showId, failed });
  return { show, cancelledBookings: bookings.length - failed.length, failedBookings: failed };
}

export const unblockShow = (showId: string, actor: User) => setShowStatus(showId, 'OPEN', actor.id);
