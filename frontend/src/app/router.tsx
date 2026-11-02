import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminCatalogPage } from '@/features/admin/pages/AdminCatalogPage';
import { AdminNewShowPage } from '@/features/admin/pages/AdminNewShowPage';
import { AdminShowsPage } from '@/features/admin/pages/AdminShowsPage';
import { RequireAuth } from '@/features/auth';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { CheckoutPage } from '@/features/booking/pages/CheckoutPage';
import { ShowPage } from '@/features/booking/pages/ShowPage';
import { BookingPage } from '@/features/bookings/pages/BookingPage';
import { MyBookingsPage } from '@/features/bookings/pages/MyBookingsPage';
import { HomePage } from '@/features/catalog/pages/HomePage';
import { MoviePage } from '@/features/catalog/pages/MoviePage';

function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Esta sala está vacía" body="La página que buscas no existe." action={{ to: '/', label: 'Ir a la cartelera' }} />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="movies/:movieId" element={<MoviePage />} />
          <Route element={<RequireAuth />}>
            <Route path="shows/:showId" element={<ShowPage />} />
            <Route path="checkout/:holdId" element={<CheckoutPage />} />
            <Route path="bookings/:bookingId" element={<BookingPage />} />
            <Route path="me" element={<MyBookingsPage />} />
          </Route>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminShowsPage />} />
            <Route path="new" element={<AdminNewShowPage />} />
            <Route path="catalog" element={<AdminCatalogPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
