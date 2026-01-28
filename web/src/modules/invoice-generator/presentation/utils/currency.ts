import type { CurrencyCode } from '@invoice-generator/domain/types';
import { CURRENCY_CONFIGS } from '@invoice-generator/domain/types';

/**
 * Format a number as currency using Intl.NumberFormat
 */
export const formatCurrency = (amount: number, currencyCode: CurrencyCode): string => {
  const config = CURRENCY_CONFIGS[currencyCode];

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currencyCode: CurrencyCode): string => {
  return CURRENCY_CONFIGS[currencyCode].symbol;
};

/**
 * Parse a currency string back to a number
 */
export const parseCurrencyInput = (value: string): number => {
  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
