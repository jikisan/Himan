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
  rushFee: number | null;
  taxRate: number | null;
  discount: number | null;
  shippingFee: number | null;
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
  item.unitCost !== 0 && item.quantity > 0;

// Generate unique ID for line items
export const generateLineItemId = (): string =>
  `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Toggle this to prefill the form with sample data for testing
const USE_TEST_DATA = false;

const getEmptyInvoiceData = (): InvoiceData => ({
  invoiceNumber: '',
  poNumber: '',
  logo: undefined,
  companyDetails: '',
  billTo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  currency: 'PHP',
  lineItems: [{ id: generateLineItemId(), description: '', unitCost: 0, quantity: 1 }],
  rushFee: null,
  taxRate: null,
  discount: null,
  shippingFee: null,
  notes: '',
  bankDetails: '',
});

const getTestInvoiceData = (): InvoiceData => ({
  invoiceNumber: 'INV-2026-001',
  poNumber: 'PO-78432',
  logo: undefined,
  companyDetails: 'Acme Web Solutions\n123 Business Ave, Suite 400\nMakati City, Metro Manila 1200\nPhone: +63 2 8123 4567\nEmail: billing@acmewebsolutions.ph',
  billTo: 'GlobalTech Industries\nAttn: Juan Dela Cruz\n456 Corporate Blvd, Floor 12\nBonifacio Global City, Taguig 1634\nEmail: juan@globaltech.ph',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  currency: 'PHP',
  lineItems: [
    { id: generateLineItemId(), description: 'Website Design & Development', unitCost: 75000, quantity: 1 },
    { id: generateLineItemId(), description: 'Mobile Responsive Implementation', unitCost: 25000, quantity: 1 },
    { id: generateLineItemId(), description: 'SEO Optimization Package', unitCost: 15000, quantity: 1 },
    { id: generateLineItemId(), description: 'Monthly Hosting & Maintenance', unitCost: 3500, quantity: 3 },
  ],
  rushFee: null,
  taxRate: 12,
  discount: 5000,
  shippingFee: 0,
  notes: 'Payment is due within 15 days.\nPlease include the invoice number in your payment reference.\nLate payments are subject to a 2% monthly interest charge.',
  bankDetails: 'Bank: BDO Unibank\nAccount Name: Acme Web Solutions Inc.\nAccount Number: 1234-5678-9012\nBranch: Makati Main Branch',
});

// Default invoice data
export const getDefaultInvoiceData = USE_TEST_DATA ? getTestInvoiceData : getEmptyInvoiceData;

// --- Database-backed types ---

export type SavedOptionType = 'company_details' | 'bill_to' | 'notes' | 'bank_details';

export type InvoiceFolderType = {
  id: string;
  userId: string;
  name: string;
  invoiceNumberPrefix: string | null;
  invoiceNumberFormat: string;
  nextSequenceNumber: number;
  invoicesCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceType = {
  id: string;
  userId: string;
  folderId: string | null;
  invoiceNumber: string;
  poNumber: string | null;
  companyDetails: string | null;
  billTo: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  lineItems: LineItem[];
  rushFee: number | null;
  taxRate: number | null;
  discount: number | null;
  shippingFee: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  total: number | null;
  notes: string | null;
  bankDetails: string | null;
  storagePath: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceSavedOptionType = {
  id: string;
  userId: string;
  optionType: SavedOptionType;
  label: string;
  value: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

// DTOs

export type CreateInvoiceFolderDto = {
  userId: string;
  name: string;
  invoiceNumberPrefix?: string;
  invoiceNumberFormat?: string;
};

export type UpdateInvoiceFolderDto = {
  name?: string;
  invoiceNumberPrefix?: string | null;
  invoiceNumberFormat?: string;
  nextSequenceNumber?: number;
};

export type CreateInvoiceDto = {
  userId: string;
  folderId?: string | null;
  invoiceNumber: string;
  poNumber?: string | null;
  companyDetails?: string | null;
  billTo?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  lineItems?: LineItem[];
  rushFee?: number | null;
  taxRate?: number | null;
  discount?: number | null;
  shippingFee?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  total?: number | null;
  notes?: string | null;
  bankDetails?: string | null;
  storagePath?: string | null;
  fileSize?: number | null;
};

export type UpdateInvoiceDto = {
  folderId?: string | null;
  invoiceNumber?: string;
  poNumber?: string | null;
  companyDetails?: string | null;
  billTo?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  currency?: string;
  lineItems?: LineItem[];
  rushFee?: number | null;
  taxRate?: number | null;
  discount?: number | null;
  shippingFee?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  total?: number | null;
  notes?: string | null;
  bankDetails?: string | null;
  storagePath?: string | null;
  fileSize?: number | null;
  isFavorite?: boolean;
};

export type CreateSavedOptionDto = {
  userId: string;
  optionType: SavedOptionType;
  label: string;
  value: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type UpdateSavedOptionDto = {
  label?: string;
  value?: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type InvoiceFilters = {
  folderId?: string | null;
  searchQuery?: string;
  isFavorite?: boolean;
};

export type InvoiceNumberConfig = {
  format: string;
  sequence: number;
  prefix?: string | null;
};
