import { ADMIN_SHOWS_FUTURE_DAYS, ADMIN_SHOWS_PAST_DAYS, DAY_MS } from '../../shared/constants';
import { json, Router } from '../../shared/http/router';
import { listAudit } from '../audit/audit.repository';
import * as bookings from '../bookings/bookings.service';
import * as catalog from '../catalog/catalog.service';
import { BlockBody, CancelBody, MovieBody, RoomBody, ShowBody } from './admin.schemas';
import * as admin from './admin.service';

export const adminRouter = new Router()
  .post('/admin/movies', 'admin', async (ctx) => json(201, await catalog.createMovie(ctx.body(MovieBody))))

  .get('/admin/rooms', 'admin', async () => json(200, { items: await catalog.listRooms() }))
  .post('/admin/rooms', 'admin', async (ctx) => json(201, await catalog.createRoom(ctx.body(RoomBody))))

  .get('/admin/shows', 'admin', async ({ query }) => {
    const from = query.from ?? new Date(Date.now() - ADMIN_SHOWS_PAST_DAYS * DAY_MS).toISOString();
    const to = query.to ?? new Date(Date.now() + ADMIN_SHOWS_FUTURE_DAYS * DAY_MS).toISOString();
    return json(200, { items: await catalog.listShows(from, to) });
  })
  .post('/admin/shows', 'admin', async (ctx) => json(201, await catalog.createShow(ctx.body(ShowBody))))

  .get('/admin/shows/{showId}/bookings', 'admin', async ({ params }) =>
    json(200, { items: await bookings.listShowBookings(params.showId!) }),
  )
  .get('/admin/shows/{showId}/audit', 'admin', async ({ params }) =>
    json(200, { items: await listAudit('SHOW', params.showId!) }),
  )
  .post('/admin/shows/{showId}/block', 'admin', async (ctx) =>
    json(200, await admin.blockShow(ctx.params.showId!, ctx.user, ctx.body(BlockBody).reason)),
  )
  .post('/admin/shows/{showId}/unblock', 'admin', async ({ params, user }) =>
    json(200, await admin.unblockShow(params.showId!, user)),
  )

  .get('/admin/bookings/{bookingId}', 'admin', async ({ params }) =>
    json(200, await bookings.getBooking(params.bookingId!)),
  )
  .get('/admin/bookings/{bookingId}/audit', 'admin', async ({ params }) =>
    json(200, { items: await admin.getBookingAudit(params.bookingId!) }),
  )
  .delete('/admin/bookings/{bookingId}', 'admin', async (ctx) =>
    json(
      200,
      await bookings.cancelBooking(ctx.params.bookingId!, {
        actorId: ctx.user.id,
        isAdmin: true,
        force: true,
        reason: ctx.body(CancelBody).reason ?? 'ADMIN',
      }),
    ),
  );
