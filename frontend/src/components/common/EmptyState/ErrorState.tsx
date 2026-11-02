import './EmptyState.css';
import { Button } from '@/components/ui/button';

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="empty empty--error">
      <h3>Algo no ha ido bien</h3>
      <p>{error.message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
