const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';

export const config = {
  apiUrl,
  wsUrl: import.meta.env.VITE_WS_URL ?? `${apiUrl.replace(/^http/, 'ws')}/ws`,
  cancelFreeHours: Number(import.meta.env.VITE_CANCEL_FREE_HOURS ?? 2),
  authMode: (cognitoClientId ? 'cognito' : 'demo') as 'cognito' | 'demo',
  cognito: {
    region: import.meta.env.VITE_COGNITO_REGION ?? 'eu-west-1',
    clientId: cognitoClientId,
  },
};
