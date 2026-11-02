import type { BookingStatus, RefundStatus } from '@/types';
import { Badge } from '@/components/ui/badge';

export function BookingBadge({ status, refund }: { status: BookingStatus; refund?: RefundStatus }) {
  if (status === 'CONFIRMED') return <Badge variant="ok">Confirmada</Badge>;
  if (refund === 'REFUNDED') return <Badge variant="muted">Cancelada · reembolsada</Badge>;
  if (refund === 'FAILED') return <Badge variant="danger">Cancelada · reembolso pendiente</Badge>;
  return <Badge variant="muted">Cancelada</Badge>;
}
