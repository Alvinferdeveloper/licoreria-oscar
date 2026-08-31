import { Component, ReactNode } from 'react';
import { BRAND_NAME } from '@licoreria/shared-types';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Última red de seguridad: un error de render no deja la pantalla en blanco
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Error de render no controlado:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base p-6 text-center">
        <h1 className="font-display text-display-md font-medium">
          {BRAND_NAME}
        </h1>
        <p className="text-body text-muted">
          Ocurrió un error inesperado en la aplicación.
        </p>
        <Button onClick={() => window.location.assign('/')}>
          Volver al inicio
        </Button>
      </div>
    );
  }
}
