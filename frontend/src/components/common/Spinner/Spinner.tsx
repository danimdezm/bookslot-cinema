import './Spinner.css';

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__reel" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner />
    </div>
  );
}

export function InlineSpinner() {
  return <span className="spinner__reel" aria-hidden />;
}
