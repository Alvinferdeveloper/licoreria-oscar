import { useEffect, useState } from 'react';

// Orden fijo de la paleta cualitativa de gráficos
const CHART_TOKENS = [
  '--brand-copper',
  '--brand-cava',
  '--status-danger',
  '--status-info',
  '--status-warning',
  '--chart-plum',
];

function readChartColors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return CHART_TOKENS.map((token) => styles.getPropertyValue(token).trim());
}

// Lee los colores desde las CSS variables y los recalcula al cambiar el tema
export function useChartColors(): string[] {
  const [colors, setColors] = useState<string[]>(() => readChartColors());

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readChartColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}
