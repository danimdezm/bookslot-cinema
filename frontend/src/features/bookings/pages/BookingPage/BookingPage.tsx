import { Link, useLocation, useParams } from 'react-router-dom';
import { ErrorState } from '@/components/common/EmptyState';
import { PageLoader } from '@/components/common/Spinner';
import { useAsync } from '@/hooks';
import { api } from '@/lib/api';
import { Ticket } from '../../components/Ticket';
import './BookingPage.css';
import { Button } from '@/components/ui/button';

export function BookingPage() {
  const { bookingId = '' } = useParams();
  const fresh = Boolean((useLocation().state as { fresh?: boolean } | null)?.fresh);
  const { data: booking, error, loading, reload } = useAsync(() => api.myBooking(bookingId), [bookingId]);

  if (loading) return <PageLoader />;
  if (error || !booking) {
    return (
      <div className="container page">
        <ErrorState error={error ?? new Error('Reserva no encontrada')} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className={`container page booking-page ${fresh ? 'booking-page--fresh' : ''}`}>
      <div className="booking-page__rays" aria-hidden />
      <div className="booking-page__head">
        <span className="eyebrow">{booking.status === 'CONFIRMED' ? 'Reserva confirmada' : 'Reserva cancelada'}</span>
        <h1 className="display">
          {booking.status === 'CONFIRMED' ? (
            <>
              Disfruta de la <em>película</em>
            </>
          ) : (
            'Reserva cancelada'
          )}
        </h1>
        {booking.status === 'CONFIRMED' && (
          <p className="muted">
            Te hemos enviado la confirmación a <strong className="text-2">{booking.userEmail}</strong>. Muestra este código en la entrada de
            la sala.
          </p>
        )}
      </div>
      <Ticket booking={booking} />
      <div className="row booking-page__actions">
        <Button asChild variant="outline">
          <Link to="/me">Mis entradas</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Volver a la cartelera</Link>
        </Button>
      </div>
    </div>
  );
}
