import { z } from 'zod';
import { NotFoundError } from '../domain/errors';
import { json, Router } from '../lib/http';
import { blockShow, unblockShow } from '../store/blocking';
import { cancelBooking, getBooking, listAudit, listShowBookings } from '../store/bookings';
import { createMovie, createRoom, createShow, listRooms, listShows } from '../store/catalog';

const DAY = 86_400_000;

const MovieBody = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(600),
  rating: z.string().max(10).optional(),
  description: z.string().max(2000).optional(),
  posterUrl: z.url().optional(),
});

const RoomBody = z.object({
  name: z.string().min(1).max(100),
  rows: z
    .array(z.object({ row: z.string().regex(/^[A-Z]{1,2}$/), seats: z.number().int().min(1).max(999) }))
    .min(1)
    .max(60),
});

const ShowBody = z.object({
  movieId: z.string().min(1),
  roomId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  priceCents: z.number().int().min(0),
});

const BlockBody = z.object({ reason: z.string().min(1).max(500) });
const CancelBody = z.object({ reason: z.string().max(500).optional() });

export const adminRouter = new Router()
  .post('/admin/movies', 'admin', async (ctx) => json(201, await createMovie(ctx.body(MovieBody))))

  .get('/admin/rooms', 'admin', async () => json(200, { items: await listRooms() }))
  .post('/admin/rooms', 'admin', async (ctx) => json(201, await createRoom(ctx.body(RoomBody))))

  .get('/admin/shows', 'admin', async ({ query }) => {
    const from = query.from ?? new Date(Date.now() - DAY).toISOString();
    const to = query.to ?? new Date(Date.now() + 30 * DAY).toISOString();
    return json(200, { items: await listShows(from, to) });
  })
  .post('/admin/shows', 'admin', async (ctx) => json(201, await createShow(ctx.body(ShowBody))))

  .get('/admin/shows/{showId}/bookings', 'admin', async ({ params }) =>
    json(200, { items: await listShowBookings(params.showId!) }),
  )
  .get('/admin/shows/{showId}/audit', 'admin', async ({ params }) =>
    json(200, { items: await listAudit('SHOW', params.showId!) }),
  )
  .post('/admin/shows/{showId}/block', 'admin', async (ctx) =>
    json(200, await blockShow(ctx.params.showId!, ctx.user, ctx.body(BlockBody).reason)),
  )
  .post('/admin/shows/{showId}/unblock', 'admin', async ({ params, user }) =>
    json(200, await unblockShow(params.showId!, user)),
  )

  .get('/admin/bookings/{bookingId}', 'admin', async ({ params }) => {
    const booking = await getBooking(params.bookingId!);
    if (!booking) throw new NotFoundError('Reserva');
    return json(200, booking);
  })
  .get('/admin/bookings/{bookingId}/audit', 'admin', async ({ params }) => {
    const booking = await getBooking(params.bookingId!);
    if (!booking) throw new NotFoundError('Reserva');
    const [bookingAudit, holdAudit] = await Promise.all([
      listAudit('BOOKING', booking.bookingId),
      listAudit('HOLD', booking.holdId),
    ]);
    const items = [...holdAudit, ...bookingAudit].sort((a, b) => a.at.localeCompare(b.at));
    return json(200, { items });
  })
  .delete('/admin/bookings/{bookingId}', 'admin', async (ctx) =>
    json(
      200,
      await cancelBooking(ctx.params.bookingId!, {
        actorId: ctx.user.id,
        isAdmin: true,
        force: true,
        reason: ctx.body(CancelBody).reason ?? 'ADMIN',
      }),
    ),
  );
