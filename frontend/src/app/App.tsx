import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth';
import { AppRouter } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  );
}
