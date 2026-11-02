import type { ShowStatus } from '@/types';
import { Badge } from '@/components/ui/badge';

export function ShowBadge({ status, available, capacity }: { status: ShowStatus; available: number; capacity: number }) {
  if (status === 'BLOCKED') return <Badge variant="danger">Bloqueada</Badge>;
  if (available === 0) return <Badge variant="muted">Agotada</Badge>;
  if (available / capacity < 0.15) return <Badge variant="warn">Últimas plazas</Badge>;
  return <Badge variant="ok">Abierta</Badge>;
}
