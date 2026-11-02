import { NavLink, Outlet } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { tabsListVariants } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth';
import './AdminLayout.css';

export function AdminLayout() {
  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <div className="container page">
        <EmptyState
          title="Zona de administración"
          body="Necesitas una cuenta del grupo admin para gestionar la cartelera."
          action={{ to: '/login?next=/admin', label: 'Entrar como administrador' }}
        />
      </div>
    );
  }
  return (
    <div className="container page admin">
      <div className="page-head">
        <div>
          <span className="eyebrow">Panel de administración</span>
          <h1 className="display">
            Gestión de <em>sala</em>
          </h1>
        </div>
        <nav className={tabsListVariants()} aria-label="Administración">
          <NavLink to="/admin" end className="seg-link">
            Sesiones
          </NavLink>
          <NavLink to="/admin/new" className="seg-link">
            Nueva sesión
          </NavLink>
          <NavLink to="/admin/catalog" className="seg-link">
            Catálogo
          </NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
