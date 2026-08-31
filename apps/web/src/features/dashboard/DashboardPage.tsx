import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Banknote, CalendarDays } from 'lucide-react';
import { BRAND_NAME } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

// Paleta cualitativa de gráficos (orden fijo para consistencia)
const CHART_COLORS = ['#A6632B', '#1F3D33', '#B23A34', '#3B6E91', '#C08A1E', '#6B4E71'];

interface DashboardData {
  kpis: {
    salesToday: string;
    salesTodayCount: number;
    monthTotal: string;
    lowStockCount: number;
  };
  salesByDay: { date: string; total: number; count: number }[];
  topProducts: { name: string; quantity: number }[];
  inventoryByCategory: { name: string; value: number }[];
}

export function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(7);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', days],
    queryFn: () =>
      api
        .get<{ data: DashboardData }>('/dashboard/summary', { params: { days } })
        .then((r) => r.data.data)
        // Los Decimal llegan como string; Recharts necesita números
        .then((d) => ({
          ...d,
          salesByDay: d.salesByDay.map((s) => ({ ...s, total: Number(s.total) })),
          inventoryByCategory: d.inventoryByCategory.map((c) => ({
            ...c,
            value: Number(c.value),
          })),
        })),
  });

  const data = summaryQuery.data;

  const kpis = data
    ? [
        {
          label: 'Ventas de hoy',
          value: formatCurrency(data.kpis.salesToday),
          hint: `${data.kpis.salesTodayCount} factura(s)`,
          icon: Banknote,
        },
        {
          label: 'Facturado del mes',
          value: formatCurrency(data.kpis.monthTotal),
          hint: 'Mes en curso',
          icon: CalendarDays,
        },
        {
          label: 'Productos bajo mínimo',
          value: String(data.kpis.lowStockCount),
          hint: 'Alertas de stock',
          icon: AlertTriangle,
          warn: data.kpis.lowStockCount > 0,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display-lg font-medium text-ink">
          {BRAND_NAME}
        </h1>
        <div className="pour-line mt-3" aria-hidden />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map(({ label, value, hint, icon: Icon, warn }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <span
                className={cn(
                  'rounded-md bg-brand-copper/10 p-2.5 text-brand-copper',
                  warn && 'bg-status-warning/10 text-status-warning',
                )}
              >
                <Icon size={24} strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-small text-muted">{label}</p>
                <p className="font-mono text-h2 font-semibold">{value}</p>
                <p className="text-small text-muted">{hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ventas por período */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-semibold">Ventas por día</h2>
            <div className="flex gap-2" role="group" aria-label="Período">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    'rounded-sm border px-3 py-1 text-small transition-colors duration-150',
                    days === d
                      ? 'border-brand-copper bg-brand-copper text-white'
                      : 'border-border hover:bg-surface-sunken',
                  )}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.salesByDay ?? []}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  labelFormatter={(d: string) => `Fecha: ${d}`}
                />
                <Bar dataKey="total" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top 5 productos */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <h2 className="text-h2 font-semibold">
              Top 5 productos ({days} días)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topProducts ?? []}
                  layout="vertical"
                  margin={{ left: 8, right: 32 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value: number) => [value, 'Unidades']} />
                  <Bar dataKey="quantity" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="quantity" position="right" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Valor de inventario por categoría */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <h2 className="text-h2 font-semibold">
              Valor de inventario por categoría
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.inventoryByCategory ?? []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    label={({ name }) => name}
                    fontSize={12}
                  >
                    {(data?.inventoryByCategory ?? []).map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
