import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth';
import { initials } from '@/lib/format';
import './UserMenu.css';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="avatar" aria-label="Menú de usuario">
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[260px]">
        <DropdownMenuLabel className="user-menu__who">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          {user.isAdmin && <Badge variant="accent">Administrador</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0 mb-1.5 bg-line" />
        <DropdownMenuItem asChild>
          <Link to="/me">Mis entradas</Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">Panel de administración</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            signOut();
            navigate('/');
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
