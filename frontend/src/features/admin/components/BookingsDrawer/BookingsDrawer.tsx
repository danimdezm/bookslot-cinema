import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';
import { BookingBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAsync, useToast } from '@/hooks';
import { api } from '@/lib/api';
import { capitalize, dateLong, money, time } from '@/lib/format';
import type { Booking, Show } from '@/types';
import { AuditTimeline } from '../AuditTimeline';
import './BookingsDrawer.css';

interface BookingsDrawerProps {
  show: Show;
  onClose(): void;
  onChanged(): void;
}

export function BookingsDrawer({ show, onClose, onChanged }: BookingsDrawerProps) {
  const notify = useToast();
  const { data, loading, error, reload } = useAsync(() => api.admin.showBookings(show.showId), [show.showId]);
  const [open, setOpen] = useState<string>();

  const cancel = async (b: Booking) => {
    try {
      await api.admin.cancelBooking(b.bookingId, 'Cancelada por administración');
      notify({ tone: 'success', title: 'Reserva cancelada y reembolsada' });
      reload();
      onChanged();
    } catch (err) {
      notify({ tone: 'error', title: 'No se pudo cancelar', body: (err as Error).message });
    }
  };

  const sorted = [...(data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <span className="eyebrow">Reservas</span>
          <SheetTitle>{show.movieTitle}</SheetTitle>
          <SheetDescription>
            {capitalize(dateLong(show.startsAt))} · {time(show.startsAt)} · {show.roomName}
          </SheetDescription>
        </SheetHeader>
        <div className="drawer__body">
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : sorted.length === 0 ? (
            <EmptyState title="Sin reservas" body="Todavía nadie ha reservado en esta sesión." />
          ) : (
            sorted.map((b) => (
              <div key={b.bookingId} className={`drawer-booking ${open === b.bookingId ? 'is-open' : ''}`}>
                <button
                  className="drawer-booking__head"
                  aria-expanded={open === b.bookingId}
                  onClick={() => setOpen(open === b.bookingId ? undefined : b.bookingId)}
                >
                  <div>
                    <strong>{b.userEmail}</strong>
                    <span className="muted">
                      {b.seats.join(', ')} · {money(b.amountCents, b.currency)}
                    </span>
                  </div>
                  <BookingBadge status={b.status} refund={b.refundStatus} />
                </button>
                {open === b.bookingId && (
                  <div className="drawer-booking__body">
                    <AuditTimeline bookingId={b.bookingId} />
                    {b.status === 'CONFIRMED' && (
                      <Button variant="destructive" size="sm" onClick={() => cancel(b)}>
                        Cancelar y reembolsar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
