export const LOG_MESSAGES = {
  unhandledError: 'Error no controlado',

  holdRetry: 'createHold reintento',
  holdExpiryNotScheduled: 'No se pudo programar la expiración (queda la expiración perezosa)',
  holdExpiryNotCancelled: 'No se pudo borrar el schedule de expiración',
  schedulesAfterConfirmFailed: 'Fallo gestionando schedules tras confirmar',
  paymentRefunded: 'Pago reembolsado: hold no confirmable',

  refundFailed: 'Fallo en el reembolso',
  unexpectedSeatState: 'Butacas de la reserva en estado inesperado',
  reminderNotCancelled: 'No se pudo borrar el recordatorio',
  bookingsNotCancelledOnBlock: 'Reservas no canceladas al bloquear la sesión',

  bookingNotFoundForNotification: 'Reserva no encontrada para notificar',
  notificationFailed: 'Fallo procesando notificación',

  broadcastFailed: 'Fallo en broadcast',
  websocketSendFailed: 'Fallo enviando por WebSocket',
  schedulerNotConfigured: 'Scheduler sin configurar, se omite',
  eventWithoutBus: 'evento (sin bus)',
} as const;
