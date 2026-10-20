import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatInTimeZone } from 'date-fns-tz';
import { AxiosError } from 'axios';
import { APP_TIMEZONE, CURRENCY_SYMBOL } from '@licoreria/shared-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Toda fecha se presenta en la zona horaria de la app (America/Managua)
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy') {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, fmt);
}

export function formatDateTime(date: string | Date) {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, 'dd/MM/yyyy hh:mm a');
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return `${CURRENCY_SYMBOL}${value.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Rango por defecto de listados y reportes: mes en curso (días de Managua)
export function defaultRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return {
    startDate: formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-01'),
    endDate: formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd'),
  };
}

// Mensaje legible de un error de API. Usa el texto del backend (ya en español)
// cuando existe; para respuestas binarias (blob) cae en el mensaje por defecto.
export function getErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado',
): string {
  if (error instanceof AxiosError) {
    if (!error.response) return 'No se pudo conectar con el servidor';
    const message = (error.response.data as { message?: unknown } | undefined)
      ?.message;
    if (Array.isArray(message) && message.length > 0) return String(message[0]);
    if (typeof message === 'string' && message.trim()) return message;
    return fallback;
  }
  return fallback;
}
