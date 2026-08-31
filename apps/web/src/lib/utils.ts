import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatInTimeZone } from 'date-fns-tz';
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
