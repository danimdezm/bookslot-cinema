import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './EmptyState.css';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  body?: ReactNode;
  action?: { to: string; label: string };
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && (
        <Button asChild variant="outline">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
