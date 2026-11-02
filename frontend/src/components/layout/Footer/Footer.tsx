import { Logo } from '../Logo';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo />
        <p className="muted">Reservas en tiempo real. Sin overbooking, nunca.</p>
        <p className="faint">Proyecto final · AWS serverless</p>
      </div>
    </footer>
  );
}
