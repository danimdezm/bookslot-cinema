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
    super(401, 'UNAUTHORIZED', 'Autenticación requerida');
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'FORBIDDEN', 'No tienes permisos para esta operación');
  }
}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(404, 'NOT_FOUND', `${what} no encontrado`);
  }
}

export class SoldOutError extends AppError {
  constructor(readonly seats: string[]) {
    super(409, 'SOLD_OUT', 'Lo sentimos, se ha agotado: alguna de las butacas ya no está disponible', { seats });
  }
}

export class ShowNotBookableError extends AppError {
  constructor(reason: 'BLOCKED' | 'STARTED') {
    super(
      409,
      'SHOW_NOT_BOOKABLE',
      reason === 'BLOCKED' ? 'La sesión está bloqueada' : 'La sesión ya ha empezado',
      { reason },
    );
  }
}

export class HoldNotConfirmableError extends AppError {
  constructor(readonly reason: string) {
    super(409, 'HOLD_NOT_CONFIRMABLE', 'La reserva temporal ha caducado o ya no es válida', { reason });
  }
}

export class PolicyError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(422, code, message, details);
  }
}

export class BusyError extends AppError {
  constructor() {
    super(503, 'BUSY', 'Hay mucha demanda en este momento, inténtalo de nuevo');
  }
}
