// Public API for invoice-generator module

// Pages
export { InvoiceGeneratorPage } from './presentation/pages';

// Components (if needed externally)
export { InvoiceGenerator } from './presentation/components';

// Types
export type {
  InvoiceData,
  LineItem,
  CurrencyCode,
  CurrencyConfig,
  InvoiceFolderType,
  InvoiceType,
  InvoiceSavedOptionType,
  SavedOptionType,
  CreateInvoiceFolderDto,
  UpdateInvoiceFolderDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  CreateSavedOptionDto,
  UpdateSavedOptionDto,
  InvoiceFilters,
  InvoiceNumberConfig,
} from './domain/types';

// Entities
export { Invoice, InvoiceFolder, InvoiceSavedOption } from './domain/entities';
