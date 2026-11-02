import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Poster } from '@/components/common/Poster';
import { useAuth } from '../../hooks/useAuth';
import './LoginPage.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const DEMO = [
  { name: 'Ana García', email: 'ana@bookslot.local', isAdmin: false, label: 'Ana · cliente' },
  { name: 'Admin BookSlot', email: 'admin@bookslot.local', isAdmin: true, label: 'Admin · gestión' },
];

const COLLAGE = ['Órbita Cero', 'El Faro del Norte', 'La Última Sesión'];

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const enter = (user: { name: string; email: string; isAdmin: boolean }) => {
    signIn(user);
    navigate(next.startsWith('/') ? next : '/', { replace: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    enter({ name: name.trim(), email: email.trim().toLowerCase(), isAdmin });
  };

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
        <form className="card card--pad login__form" onSubmit={submit}>
          <span className="eyebrow">Bienvenido</span>
          <h2 className="display login__title">Entra en BookSlot</h2>
          <p className="muted">Reserva, gestiona tus entradas y recibe recordatorios.</p>
          {params.has('next') && <div className="alert alert--info">Inicia sesión para elegir butacas y reservar.</div>}

          <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
            <div className="field">
              <Label htmlFor="login-name">Nombre</Label>
              <Input
                id="login-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ana García"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                autoComplete="email"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="login-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
              <Label htmlFor="login-admin" className="cursor-pointer text-[15px] font-normal tracking-normal text-foreground">
                Acceder como administrador
              </Label>
            </div>
          </div>

          <Button size="lg" className="w-full" type="submit">
            Entrar
          </Button>

          <div className="login__demo">
            <span className="muted">o prueba con</span>
            <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
              {DEMO.map((d) => (
                <Button key={d.email} type="button" variant="outline" size="sm" onClick={() => enter(d)}>
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="login__dev">
            <Badge variant="warn">Desarrollo</Badge> Autenticación simulada. En producción, Amazon Cognito.
          </p>
        </form>
      </div>
    </div>
  );
}
