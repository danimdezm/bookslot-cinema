export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  title: string;
  body?: string;
  tone?: ToastTone;
}

export type Notify = (toast: ToastMessage) => void;

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload(): void;
  setData(update: T | ((prev: T | undefined) => T)): void;
}
