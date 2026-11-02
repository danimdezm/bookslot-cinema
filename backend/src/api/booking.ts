import { z } from 'zod';
import { AppError, NotFoundError, ValidationError } from '../domain/errors';
import { json, Router } from '../lib/http';
import { services } from '../services';
import { cancelBooking, getBooking, listUserBookings } from '../store/bookings';
import { confirmPaidHold, startPayment } from '../store/checkout';
import { createHold, getHold, releaseHold } from '../store/holds';

const CreateHoldBody = z.object({ seats: z.array(z.string().min(2).max(6)).min(1) });

const BookingsQuery = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

const IDEMPOTENCY_KEY = /^[\w-]{8,128}$/;

export const bookingRouter = new Router()
  .post('/shows/{showId}/holds', 'user', async (ctx) => {
    const idempotencyKey = ctx.header('idempotency-key');
    if (!idempotencyKey || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new ValidationError('Cabecera Idempotency-Key obligatoria (8-128 caracteres [A-Za-z0-9_-])');
    }
    const { seats } = ctx.body(CreateHoldBody);
    const { hold, replayed } = await createHold({
      showId: ctx.params.showId!,
      seatIds: seats,
      user: { id: ctx.user.id, email: ctx.user.email },
      idempotencyKey,
    });
    return json(replayed ? 200 : 201, hold, replayed ? { 'idempotent-replayed': 'true' } : {});
  })

  .get('/holds/{holdId}', 'user', async ({ params, user }) => {
    const hold = await getHold(params.holdId!);
    if (!hold || hold.userId !== user.id) throw new NotFoundError('Reserva temporal');
    return json(200, hold);
  })

  .delete('/holds/{holdId}', 'user', async ({ params, user }) =>
    json(200, await releaseHold(params.holdId!, { reason: 'RELEASED', userId: user.id, actor: user.id })),
  )

  .post('/holds/{holdId}/payment', 'user', async ({ params, user }) =>
    json(200, await startPayment(params.holdId!, user.id)),
  )

  .post('/holds/{holdId}/confirm', 'user', async ({ params, user }) => {
    if (services().payments.name !== 'mock') {
      throw new AppError(400, 'USE_PAYMENT_PROVIDER', 'La confirmación llega por el webhook del proveedor de pagos');
    }
    const hold = await getHold(params.holdId!);
    if (!hold || hold.userId !== user.id) throw new NotFoundError('Reserva temporal');
    if (hold.status === 'CONFIRMED') return json(200, await getBooking(hold.bookingId!));
    const paymentId = hold.paymentId ?? (await startPayment(hold.holdId, user.id)).paymentId;
    return json(201, await confirmPaidHold(hold.holdId, paymentId));
  })

  .get('/me/bookings', 'user', async ({ query, user }) =>
    json(200, await listUserBookings(user.id, BookingsQuery.parse(query))),
  )

  .get('/me/bookings/{bookingId}', 'user', async ({ params, user }) => {
    const booking = await getBooking(params.bookingId!);
    if (!booking || booking.userId !== user.id) throw new NotFoundError('Reserva');
    return json(200, booking);
  })

  .delete('/me/bookings/{bookingId}', 'user', async ({ params, user }) =>
    json(
      200,
      await cancelBooking(params.bookingId!, { actorId: user.id, isAdmin: false, reason: 'USER_REQUEST' }),
    ),
  );
