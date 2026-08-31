import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { downloadExcel } from './reports-utils';

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  minStock: number;
  currentCost: string;
  unitPrice: string;
  stockValue: string;
  lowStock: boolean;
  category: { id: string; name: string } | null;
}

interface InventoryReportData {
  products: InventoryRow[];
  summary: { productCount: number; lowStockCount: number; totalValue: string };
}

// Inventario actual: stock, valor total y productos bajo mínimo
export function InventoryReport() {
  const reportQuery = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () =>
      api
        .get<{ data: InventoryReportData }>('/reports/inventory')
        .then((r) => r.data.data),
  });

  const summary = reportQuery.data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        {summary ? (
          <div className="flex flex-wrap gap-6 text-body">
            <span>
              Productos: <strong className="font-mono">{summary.productCount}</strong>
            </span>
            <span>
              Bajo mínimo:{' '}
              <strong
                className={
                  summary.lowStockCount > 0
                    ? 'font-mono text-status-warning'
                    : 'font-mono'
                }
              >
                {summary.lowStockCount}
              </strong>
            </span>
            <span>
              Valor total:{' '}
              <strong className="font-mono text-h2">
                {formatCurrency(summary.totalValue)}
              </strong>
            </span>
          </div>
        ) : (
          <span />
        )}
        <Button
          variant="secondary"
          onClick={() =>
            downloadExcel('/reports/inventory/export', 'inventario-actual.xlsx')
          }
        >
          <FileDown size={16} strokeWidth={1.5} aria-hidden />
          Exportar Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">SKU</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Producto</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Categoría</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Stock</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Mín.</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Costo prom.</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Precio</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Valor</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reportQuery.data?.products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-mono text-muted">{p.sku}</td>
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {p.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {p.currentStock}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                    {p.minStock}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(p.currentCost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(p.unitPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {formatCurrency(p.stockValue)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={p.lowStock ? 'warning' : 'success'}>
                      {p.lowStock ? 'Stock bajo' : 'Normal'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {reportQuery.data?.products.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    No hay productos activos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
