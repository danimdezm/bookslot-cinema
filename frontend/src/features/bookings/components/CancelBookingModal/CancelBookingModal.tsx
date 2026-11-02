import { Modal } from '@/components/common/Modal';
import { config } from '@/lib/config';
import { dateTime, money } from '@/lib/format';
import type { Booking } from '@/types';
import { canCancelFree, freeUntil } from '../../utils/cancellation';
import { Button } from '@/components/ui/button';

interface CancelBookingModalProps {
  booking: Booking;
  busy: boolean;
  onConfirm(): void;
  onClose(): void;
}

export function CancelBookingModal({ booking, busy, onConfirm, onClose }: CancelBookingModalProps) {
  const free = canCancelFree(booking);
  return (
    <Modal
      title="Cancelar reserva"
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Mantener
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy || !free}>
            {busy ? 'Cancelando…' : 'Cancelar reserva'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0 }}>
          <strong>{booking.movieTitle}</strong>
          <br />
          <span className="muted">
            {dateTime(booking.startsAt)} · Butacas {booking.seats.join(', ')}
          </span>
        </p>
        {free ? (
          <div className="alert alert--info">
            Cancelación gratuita hasta el {dateTime(freeUntil(booking).toISOString())}. Te devolveremos{' '}
            {money(booking.amountCents, booking.currency)}.
          </div>
        ) : (
          <div className="alert">La cancelación solo es posible hasta {config.cancelFreeHours} h antes del inicio de la sesión.</div>
        )}
      </div>
    </Modal>
  );
}
