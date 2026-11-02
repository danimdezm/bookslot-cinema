import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth';
import { AppRouter } from './router';

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster />
    </AuthProvider>
  );
}
