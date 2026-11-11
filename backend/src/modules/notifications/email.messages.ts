export const EMAIL_MESSAGES = {
  brand: 'BookSlot Cinema',

  bookingConfirmedSubject: (movie: string) => `Reserva confirmada: ${movie}`,
  bookingCancelledSubject: (movie: string) => `Reserva cancelada: ${movie}`,
  reminderSubject: (movie: string, when: string) => `Recordatorio: ${movie} ${when}`,
  paymentRefundedSubject: 'No hemos podido completar tu reserva',

  cancelledByCinema: 'La sesión ha sido cancelada por el cine. Sentimos las molestias.',
  cancelledByUser: 'Tu reserva se ha cancelado.',
  refundFailed: 'Reembolso: en revisión',
  refundDone: 'Reembolso: tramitado',
  seatsLost: 'Las butacas dejaron de estar disponibles antes de confirmar el pago.',
  refunded: (amount: string) => `Te hemos devuelto ${amount}.`,

  movie: (title: string) => `Película: ${title}`,
  show: (when: string, room: string) => `Sesión: ${when} · ${room}`,
  seats: (seats: string[]) => `Butacas: ${seats.join(', ')}`,
  amount: (amount: string) => `Importe: ${amount}`,
  reference: (bookingId: string) => `Referencia: ${bookingId}`,
} as const;
