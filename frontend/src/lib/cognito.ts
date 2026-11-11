import { config } from './config';

export interface CognitoTokens {
  idToken: string;
  refreshToken: string;
}

interface IdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  'cognito:groups'?: string[];
}

const MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'Email o contraseña incorrectos',
  UserNotFoundException: 'Email o contraseña incorrectos',
  UsernameExistsException: 'Ya existe una cuenta con ese email',
  UserNotConfirmedException: 'Tienes que verificar tu email antes de entrar',
  InvalidPasswordException: 'La contraseña debe tener al menos 10 caracteres, mayúsculas, minúsculas y números',
  CodeMismatchException: 'El código no es correcto',
  ExpiredCodeException: 'El código ha caducado, pide uno nuevo',
  LimitExceededException: 'Demasiados intentos, espera unos minutos',
  TooManyRequestsException: 'Demasiados intentos, espera unos minutos',
};

class CognitoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://cognito-idp.${config.cognito.region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify({ ClientId: config.cognito.clientId, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(data.__type ?? 'Error').split('#').pop()!;
    throw new CognitoError(code, MESSAGES[code] ?? data.message ?? 'No se pudo completar la operación');
  }
  return data as T;
}

interface AuthResult {
  AuthenticationResult: { IdToken: string; RefreshToken?: string };
}

export async function signIn(email: string, password: string): Promise<CognitoTokens> {
  const res = await call<AuthResult>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  return { idToken: res.AuthenticationResult.IdToken, refreshToken: res.AuthenticationResult.RefreshToken! };
}

export async function refresh(refreshToken: string): Promise<CognitoTokens> {
  const res = await call<AuthResult>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  return { idToken: res.AuthenticationResult.IdToken, refreshToken };
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  await call('SignUp', {
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await call('ConfirmSignUp', { Username: email, ConfirmationCode: code });
}

export async function resendCode(email: string): Promise<void> {
  await call('ResendConfirmationCode', { Username: email });
}

export function decodeIdToken(idToken: string): IdTokenClaims {
  const payload = idToken.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(payload)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
  return JSON.parse(json) as IdTokenClaims;
}
