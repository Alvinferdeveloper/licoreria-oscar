import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-display-lg text-muted">404</p>
      <h1 className="text-h1 font-semibold">Página no encontrada</h1>
      <p className="text-body text-muted">
        La ruta que busca no existe o fue movida.
      </p>
      <Button asChild>
        <Link to="/">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
