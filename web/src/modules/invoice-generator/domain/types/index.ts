export type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface LineItem {
  id: string;
  description: string;
  unitCost: number;
  quantity: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  poNumber?: string;
  logo?: string; // base64 data URL
  companyDetails: string;
  billTo: string;
  invoiceDate: string;
  dueDate: string;
  currency: CurrencyCode;
  lineItems: LineItem[];
  taxRate: number;
  discount: number;
  shippingFee: number;
  notes?: string;
  bankDetails?: string;
}

export interface CurrencyConfig {
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  PHP: { symbol: '₱', locale: 'en-PH', decimals: 2 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
  JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0 },
};

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'PHP', label: '₱ PHP - Philippine Peso' },
  { value: 'USD', label: '$ USD - US Dollar' },
  { value: 'EUR', label: '€ EUR - Euro' },
  { value: 'GBP', label: '£ GBP - British Pound' },
  { value: 'JPY', label: '¥ JPY - Japanese Yen' },
];

// Validation helper
export const isValidLineItem = (item: LineItem): boolean =>
  item.description.trim() !== '' && item.unitCost > 0 && item.quantity > 0;

// Generate unique ID for line items
export const generateLineItemId = (): string =>
  `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default invoice data
export const getDefaultInvoiceData = (): InvoiceData => ({
  invoiceNumber: '',
  poNumber: '',
  logo: undefined,
  companyDetails: '',
  billTo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  currency: 'PHP',
  lineItems: [{ id: generateLineItemId(), description: '', unitCost: 0, quantity: 1 }],
  taxRate: 0,
  discount: 0,
  shippingFee: 0,
  notes: 'Payment is due within 15 days',
  bankDetails: '',
});
