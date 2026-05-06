import { format, parseISO, isValid } from 'date-fns';

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy') : '-';
  } catch {
    return '-';
  }
};

export const formatDateInput = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
  } catch {
    return '';
  }
};

export const formatDateTime = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy, hh:mm a') : '-';
  } catch {
    return '-';
  }
};

export const formatNumber = (n: number, decimals = 2): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(n);

export const toTitleCase = (str: string): string =>
  str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const truncate = (str: string, len: number): string =>
  str.length > len ? str.substring(0, len) + '…' : str;
