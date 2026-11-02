import { Link } from 'react-router-dom';
import { ShowBadge } from '@/components/common/StatusBadge';
import { Occupancy } from '@/components/common/Occupancy';
import { capitalize, dateLong, time } from '@/lib/format';
import type { Show } from '@/types';
import './ShowsTable.css';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ShowsTableProps {
  shows: Show[];
  onBookings(show: Show): void;
  onToggleBlock(show: Show): void;
}

export function ShowsTable({ shows, onBookings, onToggleBlock }: ShowsTableProps) {
  return (
    <div className="card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sesión</TableHead>
            <TableHead>Película</TableHead>
            <TableHead>Sala</TableHead>
            <TableHead>Ocupación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead aria-label="Acciones" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shows.map((s) => (
            <TableRow key={s.showId} className={new Date(s.startsAt) < new Date() ? 'opacity-50' : ''}>
              <TableCell>
                <strong className="tabular">{time(s.startsAt)}</strong>
                <span className="muted cell-sub">{capitalize(dateLong(s.startsAt))}</span>
              </TableCell>
              <TableCell>
                <Link to={`/shows/${s.showId}`} className="cell-link">
                  {s.movieTitle}
                </Link>
              </TableCell>
              <TableCell className="text-text-2">{s.roomName}</TableCell>
              <TableCell>
                <Occupancy available={s.available} capacity={s.capacity} />
              </TableCell>
              <TableCell>
                <ShowBadge status={s.status} available={s.available} capacity={s.capacity} />
              </TableCell>
              <TableCell>
                <div className="row" style={{ '--gap': '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' } as React.CSSProperties}>
                  <Button variant="outline" size="sm" onClick={() => onBookings(s)}>
                    Reservas
                  </Button>
                  <Button variant={s.status === 'BLOCKED' ? 'ghost' : 'destructive'} size="sm" onClick={() => onToggleBlock(s)}>
                    {s.status === 'BLOCKED' ? 'Reabrir' : 'Bloquear'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
