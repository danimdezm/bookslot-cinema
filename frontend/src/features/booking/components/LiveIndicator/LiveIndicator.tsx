import './LiveIndicator.css';

export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span className={`live ${connected ? 'live--on' : ''}`}>
      <i aria-hidden />
      {connected ? 'Disponibilidad en directo' : 'Conectando…'}
    </span>
  );
}
