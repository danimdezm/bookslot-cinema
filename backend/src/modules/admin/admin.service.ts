import type { User } from '../../domain/types';
import { log } from '../../shared/logger';
import { LOG_MESSAGES } from '../../shared/messages/logs';
import { listAudit } from '../audit/audit.repository';
import { cancelBooking, getBooking, listShowBookings } from '../bookings/bookings.service';
import { setShowStatus } from '../catalog/catalog.service';

export async function blockShow(showId: string, actor: User, reason: string) {
  const show = await setShowStatus(showId, 'BLOCKED', actor.id, reason);
  const bookings = await listShowBookings(showId, 'CONFIRMED');
  const results = await Promise.allSettled(
    bookings.map((b) =>
      cancelBooking(b.bookingId, { actorId: actor.id, isAdmin: true, force: true, reason: `SHOW_BLOCKED: ${reason}` }),
    ),
  );
  const failed = results.flatMap((r, i) => (r.status === 'rejected' ? [bookings[i]!.bookingId] : []));
  if (failed.length) log.error(LOG_MESSAGES.bookingsNotCancelledOnBlock, undefined, { showId, failed });
  return { show, cancelledBookings: bookings.length - failed.length, failedBookings: failed };
}

export const unblockShow = (showId: string, actor: User) => setShowStatus(showId, 'OPEN', actor.id);

export async function getBookingAudit(bookingId: string) {
  const booking = await getBooking(bookingId);
  const [bookingAudit, holdAudit] = await Promise.all([
    listAudit('BOOKING', booking.bookingId),
    listAudit('HOLD', booking.holdId),
  ]);
  return [...holdAudit, ...bookingAudit].sort((a, b) => a.at.localeCompare(b.at));
}
