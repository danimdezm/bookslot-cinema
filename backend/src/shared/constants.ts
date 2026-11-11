export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const MAX_TRANSACTION_ATTEMPTS = 8;

export const IDEMPOTENCY_TTL_SECONDS = 24 * 3600;
export const HOLD_TTL_SECONDS = 7 * 24 * 3600;
export const CONNECTION_TTL_SECONDS = 2 * 3600;

export const SEAT_ID_PATTERN = /^([A-Z]{1,2})(\d{2,3})$/;
export const SHOW_ID_PATTERN = /^[\w-]{1,64}$/;
export const IDEMPOTENCY_KEY_PATTERN = /^[\w-]{8,128}$/;

export const DEFAULT_PAGE_SIZE = 20;
export const PUBLIC_SHOWS_WINDOW_DAYS = 7;
export const ADMIN_SHOWS_PAST_DAYS = 1;
export const ADMIN_SHOWS_FUTURE_DAYS = 30;

export const EVENT_SOURCE = 'bookslot';
