import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/toast.store';

// Rango por defecto compartido con los listados: mes en curso (días de Managua)
export { defaultRange } from '@/lib/utils';

// Los Excel viajan con el JWT del interceptor; se descargan como blob
export async function downloadExcel(
  url: string,
  filename: string,
  params?: Record<string, string>,
) {
  try {
    const res = await api.get(url, {
      params,
      responseType: 'blob',
      skipGlobalErrorToast: true,
    });
    const blobUrl = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    toast(getErrorMessage(error, 'No se pudo generar el reporte'), 'danger');
  }
}
