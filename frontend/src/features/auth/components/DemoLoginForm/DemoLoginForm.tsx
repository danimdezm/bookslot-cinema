import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SessionUser } from '@/types';
import { useAuth } from '../../hooks/useAuth';
import './DemoLoginForm.css';

const DEMO = [
  { name: 'Ana García', email: 'ana@bookslot.local', isAdmin: false, label: 'Ana · cliente' },
  { name: 'Admin BookSlot', email: 'admin@bookslot.local', isAdmin: true, label: 'Admin · gestión' },
];

export function DemoLoginForm({ onDone }: { onDone: () => void }) {
  const { signInDemo } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const enter = (user: Omit<SessionUser, 'id'>) => {
    signInDemo(user);
    onDone();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    enter({ name: name.trim(), email: email.trim().toLowerCase(), isAdmin });
  };

  return (
    <form className="demo-login" onSubmit={submit}>
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

      <div className="demo-login__quick">
        <span className="muted">o prueba con</span>
        <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
          {DEMO.map((d) => (
            <Button key={d.email} type="button" variant="outline" size="sm" onClick={() => enter(d)}>
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="demo-login__note">
        <Badge variant="warn">Desarrollo</Badge> Autenticación simulada. En producción, Amazon Cognito.
      </p>
    </form>
  );
}
