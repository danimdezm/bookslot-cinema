import { json, Router } from '../../shared/http/router';
import { BookingsQuery } from './bookings.schemas';
import * as bookings from './bookings.service';

export const bookingsRouter = new Router()
  .get('/me/bookings', 'user', async ({ query, user }) =>
    json(200, await bookings.listUserBookings(user.id, BookingsQuery.parse(query))),
  )

  .get('/me/bookings/{bookingId}', 'user', async ({ params, user }) =>
    json(200, await bookings.getBooking(params.bookingId!, user.id)),
  )

  .delete('/me/bookings/{bookingId}', 'user', async ({ params, user }) =>
    json(
      200,
      await bookings.cancelBooking(params.bookingId!, { actorId: user.id, isAdmin: false, reason: 'USER_REQUEST' }),
    ),
  );
