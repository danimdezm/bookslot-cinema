import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import '../EmptyState/EmptyState.css';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container page">
        <div className="empty">
          <div className="empty__art" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <h3>Algo salió mal</h3>
          <p>Ha ocurrido un error inesperado. Recarga la página para continuar.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recargar
          </Button>
        </div>
      </div>
    );
  }
}
