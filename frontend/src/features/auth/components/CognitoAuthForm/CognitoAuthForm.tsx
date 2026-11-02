import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InlineSpinner } from '@/components/common/Spinner';
import { confirmSignUp, resendCode, signUp } from '@/lib/cognito';
import { useAuth } from '../../hooks/useAuth';
import './CognitoAuthForm.css';

type Step = 'signin' | 'signup' | 'confirm';

export function CognitoAuthForm({ onDone }: { onDone: () => void }) {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (next: Step) => {
    setStep(next);
    setError(null);
    setInfo(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'UserNotConfirmedException') {
        await resendCode(email).catch(() => undefined);
        go('confirm');
        setInfo('Te hemos enviado un código nuevo a tu email.');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (step === 'signin') {
      void run(async () => {
        await signIn(mail, password);
        onDone();
      });
    } else if (step === 'signup') {
      void run(async () => {
        await signUp(name.trim(), mail, password);
        go('confirm');
        setInfo(`Te hemos enviado un código a ${mail}.`);
      });
    } else {
      void run(async () => {
        await confirmSignUp(mail, code.trim());
        await signIn(mail, password);
        onDone();
      });
    }
  };

  return (
    <form className="cognito-auth" onSubmit={submit}>
      {error && <div className="alert">{error}</div>}
      {info && <div className="alert alert--info">{info}</div>}

      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        {step === 'signup' && (
          <div className="field">
            <Label htmlFor="auth-name">Nombre</Label>
            <Input id="auth-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}
        {step !== 'confirm' && (
          <>
            <div className="field">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <Label htmlFor="auth-password">Contraseña</Label>
              <Input
                id="auth-password"
                type="password"
                required
                minLength={step === 'signup' ? 10 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
              />
              {step === 'signup' && (
                <span className="cognito-auth__hint">Mínimo 10 caracteres, con mayúsculas, minúsculas y números.</span>
              )}
            </div>
          </>
        )}
        {step === 'confirm' && (
          <div className="field">
            <Label htmlFor="auth-code">Código de verificación</Label>
            <Input
              id="auth-code"
              required
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoComplete="one-time-code"
            />
          </div>
        )}
      </div>

      <Button size="lg" className="w-full" type="submit" disabled={busy}>
        {busy && <InlineSpinner />}
        {step === 'signin' ? 'Entrar' : step === 'signup' ? 'Crear cuenta' : 'Verificar y entrar'}
      </Button>

      <div className="cognito-auth__switch">
        {step === 'signin' && (
          <>
            ¿No tienes cuenta?{' '}
            <Button type="button" variant="link" size="sm" onClick={() => go('signup')}>
              Crear cuenta
            </Button>
          </>
        )}
        {step === 'signup' && (
          <>
            ¿Ya tienes cuenta?{' '}
            <Button type="button" variant="link" size="sm" onClick={() => go('signin')}>
              Entrar
            </Button>
          </>
        )}
        {step === 'confirm' && (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={busy}
            onClick={() => void run(async () => {
              await resendCode(email.trim().toLowerCase());
              setInfo('Código reenviado.');
            })}
          >
            Reenviar código
          </Button>
        )}
      </div>
    </form>
  );
}
