import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';
import { useSessionUser } from '@/features/auth';
import { useToast } from '@/hooks';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/format';
import type { Booking } from '@/types';
import { BookingRow } from '../../components/BookingRow';
import { CancelBookingModal } from '../../components/CancelBookingModal';
import { useMyBookings, type BookingsTab } from '../../hooks/useMyBookings';
import './MyBookingsPage.css';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS: { id: BookingsTab; label: string }[] = [
  { id: 'upcoming', label: 'Próximas' },
  { id: 'past', label: 'Pasadas' },
  { id: 'cancelled', label: 'Canceladas' },
];

export function MyBookingsPage() {
  const user = useSessionUser();
  const notify = useToast();
  const [tab, setTab] = useState<BookingsTab>('upcoming');
  const { items, loading, error, hasMore, reload, loadMore, remove } = useMyBookings(tab);
  const [cancelling, setCancelling] = useState<Booking>();
  const [busy, setBusy] = useState(false);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const updated = await api.cancelBooking(cancelling.bookingId);
      remove(updated.bookingId);
      notify({
        tone: 'success',
        title: 'Reserva cancelada',
        body: updated.refundStatus === 'REFUNDED' ? `Te hemos devuelto ${money(updated.amountCents, updated.currency)}.` : undefined,
      });
      setCancelling(undefined);
    } catch (err) {
      notify({
        tone: 'error',
        title: err instanceof ApiError && err.code === 'CANCELLATION_WINDOW_CLOSED' ? 'Ya no se puede cancelar' : 'No se pudo cancelar',
        body: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Hola, {user.name.split(' ')[0]}</span>
          <h1 className="display">
            Mis <em>entradas</em>
          </h1>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as BookingsTab)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !loading && items.length === 0 ? (
        <EmptyState
          title={tab === 'upcoming' ? 'Ninguna sesión a la vista' : 'Nada por aquí'}
          body={tab === 'upcoming' ? 'Cuando reserves, tus entradas aparecerán aquí.' : undefined}
          action={tab === 'upcoming' ? { to: '/', label: 'Ver cartelera' } : undefined}
        />
      ) : (
        <div className="booking-list">
          {items.map((b) => (
            <BookingRow key={b.bookingId} booking={b} onCancel={setCancelling} />
          ))}
          {loading && (
            <div className="page-loader" style={{ minHeight: 120 }}>
              <Spinner />
            </div>
          )}
          {!loading && hasMore && (
            <Button variant="outline" className="justify-self-center" onClick={loadMore}>
              Cargar más
            </Button>
          )}
        </div>
      )}

      {cancelling && (
        <CancelBookingModal booking={cancelling} busy={busy} onConfirm={confirmCancel} onClose={() => setCancelling(undefined)} />
      )}
    </div>
  );
}
