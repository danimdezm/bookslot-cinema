import { Spinner } from '@/components/common/Spinner';
import { useAsync } from '@/hooks';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { STATUS_LABEL } from '../../utils/labels';
import './AuditTimeline.css';

export function AuditTimeline({ bookingId }: { bookingId: string }) {
  const { data, loading, error } = useAsync(() => api.admin.bookingAudit(bookingId), [bookingId]);
  if (loading) return <Spinner />;
  if (error) return <p className="muted">{error.message}</p>;
  if (!data?.length) return <p className="muted">Sin eventos de auditoría todavía.</p>;
  return (
    <ol className="timeline">
      {data.map((e, i) => (
        <li key={i}>
          <span className="timeline__dot" />
          <div>
            <strong>
              {e.entity === 'HOLD' ? 'Retención' : 'Reserva'}: {e.from ? `${STATUS_LABEL[e.from] ?? e.from} → ` : ''}
              {STATUS_LABEL[e.to] ?? e.to}
            </strong>
            <span className="muted">
              {dateTime(e.at)} · {e.actor ?? 'sistema'}
              {e.reason ? ` · ${e.reason}` : ''}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
