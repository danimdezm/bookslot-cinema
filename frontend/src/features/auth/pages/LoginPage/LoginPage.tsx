import { useNavigate, useSearchParams } from 'react-router-dom';
import { Poster } from '@/components/common/Poster';
import { config } from '@/lib/config';
import { CognitoAuthForm } from '../../components/CognitoAuthForm';
import { DemoLoginForm } from '../../components/DemoLoginForm';
import './LoginPage.css';

const COLLAGE = ['Órbita Cero', 'El Faro del Norte', 'La Última Sesión'];

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const done = () => navigate(next.startsWith('/') ? next : '/', { replace: true });

  return (
    <div className="login">
      <div className="login__visual" aria-hidden>
        <div className="login__collage">
          {COLLAGE.map((title, i) => (
            <Poster
              key={title}
              movie={{ title, durationMinutes: 100 + i * 12 }}
              size="lg"
              className={`login__poster login__poster--${i}`}
            />
          ))}
        </div>
        <h1 className="display login__claim">
          Tu butaca
          <br />
          te <em>espera.</em>
        </h1>
      </div>

      <div className="login__panel">
        <div className="card card--pad login__card">
          <span className="eyebrow">Bienvenido</span>
          <h2 className="display login__title">Entra en BookSlot</h2>
          <p className="muted">Reserva y gestiona tus entradas.</p>
          {params.has('next') && <div className="alert alert--info">Inicia sesión para elegir butacas y reservar.</div>}
          {config.authMode === 'cognito' ? <CognitoAuthForm onDone={done} /> : <DemoLoginForm onDone={done} />}
        </div>
      </div>
    </div>
  );
}
