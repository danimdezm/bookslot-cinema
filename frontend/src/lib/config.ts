const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const config = {
  apiUrl,
  wsUrl: import.meta.env.VITE_WS_URL ?? `${apiUrl.replace(/^http/, 'ws')}/ws`,
  cancelFreeHours: Number(import.meta.env.VITE_CANCEL_FREE_HOURS ?? 2),
};
