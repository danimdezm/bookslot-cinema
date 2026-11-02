import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useScrolled } from '@/hooks';
import { Logo } from '../Logo';
import { UserMenu } from '../UserMenu';
import './Header.css';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const scrolled = useScrolled();

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="container header__inner">
        <Logo />
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>
            Cartelera
          </NavLink>
          <NavLink to="/me">Mis entradas</NavLink>
          {user?.isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="spacer" />
        {user ? (
          <UserMenu />
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
