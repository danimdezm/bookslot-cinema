import { Outlet } from 'react-router-dom';
import { Footer } from '../Footer';
import { Header } from '../Header';
import { ScrollToTop } from './ScrollToTop';
import './AppLayout.css';

export function AppLayout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
