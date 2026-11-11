import { ValidationError } from '../../domain/errors';
import { IDEMPOTENCY_KEY_PATTERN } from '../../shared/constants';
import { json, Router } from '../../shared/http/router';
import { ERROR_MESSAGES } from '../../shared/messages/errors';
import { CreateHoldBody } from './holds.schemas';
import * as holds from './holds.service';

export const holdsRouter = new Router()
  .post('/shows/{showId}/holds', 'user', async (ctx) => {
    const idempotencyKey = ctx.header('idempotency-key');
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new ValidationError(ERROR_MESSAGES.idempotencyKeyRequired);
    }
    const { seats } = ctx.body(CreateHoldBody);
    const { hold, replayed } = await holds.createHold({
      showId: ctx.params.showId!,
      seatIds: seats,
      user: { id: ctx.user.id, email: ctx.user.email },
      idempotencyKey,
    });
    return json(replayed ? 200 : 201, hold, replayed ? { 'idempotent-replayed': 'true' } : {});
  })

  .get('/holds/{holdId}', 'user', async ({ params, user }) => json(200, await holds.getHold(params.holdId!, user.id)))

  .delete('/holds/{holdId}', 'user', async ({ params, user }) =>
    json(200, await holds.releaseHold(params.holdId!, { reason: 'RELEASED', userId: user.id, actor: user.id })),
  )

  .post('/holds/{holdId}/payment', 'user', async ({ params, user }) =>
    json(200, await holds.startPayment(params.holdId!, user.id)),
  )

  .post('/holds/{holdId}/confirm', 'user', async ({ params, user }) => {
    const { booking, created } = await holds.payAndConfirm(params.holdId!, user.id);
    return json(created ? 201 : 200, booking);
  });
