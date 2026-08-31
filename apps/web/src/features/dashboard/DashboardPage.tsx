import { BRAND_NAME } from '@licoreria/shared-types';

// Dashboard completo llega en Fase 6 (gráficos + KPIs). Por ahora,
// portada de marca con la Línea de Vertido.
export function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-display-lg font-medium text-ink">
        {BRAND_NAME}
      </h1>
      <div className="pour-line mt-3" aria-hidden />
      <p className="mt-4 text-body text-muted">
        Panel de control — los gráficos y KPIs se implementan en la Fase 6.
      </p>
    </div>
  );
}
