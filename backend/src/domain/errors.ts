import { ERROR_MESSAGES } from '../shared/messages/errors';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'UNAUTHORIZED', ERROR_MESSAGES.unauthorized);
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'FORBIDDEN', ERROR_MESSAGES.forbidden);
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(404, 'NOT_FOUND', ERROR_MESSAGES.notFound(what));
  }
}

export class SoldOutError extends AppError {
  constructor(readonly seats: string[]) {
    super(409, 'SOLD_OUT', ERROR_MESSAGES.soldOut, { seats });
  }
}

export class ShowNotBookableError extends AppError {
  constructor(reason: 'BLOCKED' | 'STARTED') {
    super(
      409,
      'SHOW_NOT_BOOKABLE',
      reason === 'BLOCKED' ? ERROR_MESSAGES.showBlocked : ERROR_MESSAGES.showStarted,
      { reason },
    );
  }
}

export class HoldNotConfirmableError extends AppError {
  constructor(readonly reason: string) {
    super(409, 'HOLD_NOT_CONFIRMABLE', ERROR_MESSAGES.holdNotConfirmable, { reason });
  }
}

export class PolicyError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(422, code, message, details);
  }
}

export class BusyError extends AppError {
  constructor() {
    super(503, 'BUSY', ERROR_MESSAGES.busy);
  }
}
