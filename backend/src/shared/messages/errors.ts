export const ENTITY_NAMES = {
  movie: 'Película',
  room: 'Sala',
  show: 'Sesión',
  hold: 'Reserva temporal',
  booking: 'Reserva',
} as const;

export const ERROR_MESSAGES = {
  unauthorized: 'Autenticación requerida',
  forbidden: 'No tienes permisos para esta operación',
  notFound: (entity: string) => `${entity} no encontrado`,
  soldOut: 'Lo sentimos, se ha agotado: alguna de las butacas ya no está disponible',
  showBlocked: 'La sesión está bloqueada',
  showStarted: 'La sesión ya ha empezado',
  holdNotConfirmable: 'La reserva temporal ha caducado o ya no es válida',
  busy: 'Hay mucha demanda en este momento, inténtalo de nuevo',

  invalidRequest: 'Petición inválida',
  invalidJson: 'El cuerpo no es JSON válido',
  internal: 'Error interno',

  idempotencyKeyRequired: 'Cabecera Idempotency-Key obligatoria (8-128 caracteres [A-Za-z0-9_-])',
  idempotencyKeyReused: 'La Idempotency-Key ya se usó con otra petición',

  invalidSeatId: (id: string) => `Identificador de butaca inválido: ${id}`,
  noSeatsSelected: 'Selecciona al menos una butaca',
  tooManySeats: (max: number) => `Máximo ${max} butacas por reserva`,
  unknownSeats: 'Butacas inexistentes en esta sala',
  duplicatedRows: 'Filas duplicadas en la sala',

  cancellationWindowClosed: (hours: number) => `Solo se puede cancelar hasta ${hours} h antes de la sesión`,
  cancellationFailed: (bookingId: string) => `No se pudo cancelar la reserva ${bookingId}`,

  invalidNumberEnv: (name: string) => `${name} debe ser numérico`,
  eventsRejected: (count: number) => `EventBridge rechazó ${count} eventos`,
} as const;

export const DEFAULT_BLOCK_REASON = 'Bloqueada por administración';
