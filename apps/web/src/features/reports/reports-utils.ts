import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from '@licoreria/shared-types';
import { api } from '@/lib/api';

// Rango por defecto de los reportes: mes en curso (días de Managua)
export function defaultRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return {
    startDate: formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-01'),
    endDate: formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd'),
  };
}

// Los Excel viajan con el JWT del interceptor; se descargan como blob
export async function downloadExcel(
  url: string,
  filename: string,
  params?: Record<string, string>,
) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
