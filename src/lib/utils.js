import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilidad estándar de shadcn/ui para combinar clases condicionales con Tailwind
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formateador de fechas y horas
 */
export function formatTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}
