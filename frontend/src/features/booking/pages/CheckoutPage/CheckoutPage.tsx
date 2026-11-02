import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/common/EmptyState';
import { InlineSpinner, PageLoader } from '@/components/common/Spinner';
import { useSessionUser } from '@/features/auth';
import { useCountdown, useToast } from '@/hooks';
import { api, ApiError } from '@/lib/api';
import { capitalize, dateLong, money, time } from '@/lib/format';
import { CardPreview } from '../../components/CardPreview';
import { CountdownRing } from '../../components/CountdownRing';
import { ShowInfo } from '../../components/ShowInfo';
import { useHoldCheckout } from '../../hooks/useHoldCheckout';
import './CheckoutPage.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CheckoutPage() {
  const { holdId = '' } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const user = useSessionUser();
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState<string>();

  const { data, error, loading, reload } = useHoldCheckout(holdId);

  const seconds = useCountdown(data?.hold.expiresAt);
  const total = data ? Math.round((new Date(data.hold.expiresAt).getTime() - new Date(data.hold.createdAt).getTime()) / 1000) : 0;

  useEffect(() => {
    if (data?.hold.status === 'CONFIRMED' && data.hold.bookingId) navigate(`/bookings/${data.hold.bookingId}`, { replace: true });
  }, [data, navigate]);

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <div className="container page">
        <ErrorState error={error ?? new Error('Reserva no encontrada')} onRetry={reload} />
      </div>
    );
  }

  const { hold, show, movie } = data;
  const expired = hold.status !== 'ACTIVE' || seconds === 0;

  const pay = async () => {
    setPaying(true);
    setFailure(undefined);
    try {
      const payment = await api.startPayment(holdId);
      if (payment.provider !== 'mock') {
        setFailure('El pago con Stripe se habilitará al desplegar en AWS. En local se usa el proveedor simulado.');
        return;
      }
      const booking = await api.confirmHold(holdId);
      navigate(`/bookings/${booking.bookingId}`, { state: { fresh: true } });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'HOLD_NOT_CONFIRMABLE') {
        setFailure('Tu reserva temporal ha caducado y las butacas se han liberado. Si se llegó a cobrar, te lo hemos devuelto.');
        reload();
      } else {
        notify({ tone: 'error', title: 'No se pudo completar el pago', body: (err as Error).message });
      }
    } finally {
      setPaying(false);
    }
  };

  const release = async () => {
    await api.releaseHold(holdId).catch(() => undefined);
    notify({ title: 'Reserva cancelada', body: 'Hemos liberado tus butacas.' });
    navigate(`/shows/${show.showId}`);
  };

  return (
    <div className="container page checkout">
      <div className="checkout__head">
        <Link to={`/shows/${show.showId}`} className="back-link">
          ← Cambiar butacas
        </Link>
        <h1 className="display">
          Casi <em>listo</em>
        </h1>
      </div>

      <div className="checkout__layout">
        <section className="card card--pad checkout__pay">
          {expired ? (
            <div className="expired">
              <h2 className="display">Se acabó el tiempo</h2>
              <p className="muted">
                Las butacas {hold.seats.join(', ')} han vuelto a estar disponibles para otras personas. Puedes intentarlo de nuevo.
              </p>
              <Button asChild>
                <Link to={`/shows/${show.showId}`}>Volver al mapa de la sala</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <span className="eyebrow">Pago seguro</span>
                  <h2 className="checkout__title">Datos de pago</h2>
                </div>
                <Badge variant="warn">Modo pruebas</Badge>
              </div>

              <CardPreview holder={user.name} />

              <div className="form-grid">
                <div className="field col-span-full">
                  <Label htmlFor="card-number">Número de tarjeta</Label>
                  <Input id="card-number" className="tabular" value="4242 4242 4242 4242" readOnly />
                </div>
                <div className="field">
                  <Label htmlFor="card-exp">Caducidad</Label>
                  <Input id="card-exp" className="tabular" value="12 / 34" readOnly />
                </div>
                <div className="field">
                  <Label htmlFor="card-cvc">CVC</Label>
                  <Input id="card-cvc" className="tabular" value="•••" readOnly />
                </div>
              </div>

              <p className="muted checkout__fine">
                El cobro se simula en el entorno local. En producción, Stripe procesa el pago y la confirmación llega por webhook.
              </p>

              {failure && <div className="alert">{failure}</div>}

              <Button size="lg" className="w-full" onClick={pay} disabled={paying}>
                {paying && <InlineSpinner />}
                {paying ? 'Procesando…' : `Pagar ${money(hold.amountCents, hold.currency)}`}
              </Button>
              <Button variant="ghost" className="w-full" onClick={release} disabled={paying}>
                Cancelar y liberar butacas
              </Button>
            </>
          )}
        </section>

        <aside className="card card--pad checkout__summary">
          {!expired && (
            <div className="checkout__timer">
              <CountdownRing seconds={seconds} total={total} />
              <div>
                <strong>Butacas reservadas para ti</strong>
                <p className="muted">Completa el pago antes de que termine la cuenta atrás.</p>
              </div>
            </div>
          )}
          <ShowInfo movie={movie} title={show.movieTitle}>
            <span className="muted">{capitalize(dateLong(show.startsAt))}</span>
            <span className="muted">
              {time(show.startsAt)} · {show.roomName}
            </span>
          </ShowInfo>
          <dl className="lines">
            <div>
              <dt>Butacas</dt>
              <dd>{hold.seats.join(' · ')}</dd>
            </div>
            <div>
              <dt>{hold.seats.length} × entrada</dt>
              <dd className="tabular">{money(show.priceCents, show.currency)}</dd>
            </div>
            <div>
              <dt>Gastos de gestión</dt>
              <dd className="tabular">{money(0, show.currency)}</dd>
            </div>
            <div className="lines__total">
              <dt>Total</dt>
              <dd className="tabular">{money(hold.amountCents, hold.currency)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
