import type { InvoiceType, CurrencyCode } from '../types';
import { CURRENCY_CONFIGS } from '../types';

export class Invoice {
  readonly id: string;
  readonly userId: string;
  readonly folderId: string | null;
  readonly invoiceNumber: string;
  readonly poNumber: string | null;
  readonly companyDetails: string | null;
  readonly billTo: string | null;
  readonly invoiceDate: string | null;
  readonly dueDate: string | null;
  readonly currency: string;
  readonly lineItems: InvoiceType['lineItems'];
  readonly taxRate: number | null;
  readonly discount: number | null;
  readonly shippingFee: number | null;
  readonly subtotal: number | null;
  readonly taxAmount: number | null;
  readonly total: number | null;
  readonly notes: string | null;
  readonly bankDetails: string | null;
  readonly storagePath: string | null;
  readonly fileSize: number | null;
  readonly isFavorite: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: InvoiceType) {
    this.id = data.id;
    this.userId = data.userId;
    this.folderId = data.folderId;
    this.invoiceNumber = data.invoiceNumber;
    this.poNumber = data.poNumber;
    this.companyDetails = data.companyDetails;
    this.billTo = data.billTo;
    this.invoiceDate = data.invoiceDate;
    this.dueDate = data.dueDate;
    this.currency = data.currency;
    this.lineItems = data.lineItems;
    this.taxRate = data.taxRate;
    this.discount = data.discount;
    this.shippingFee = data.shippingFee;
    this.subtotal = data.subtotal;
    this.taxAmount = data.taxAmount;
    this.total = data.total;
    this.notes = data.notes;
    this.bankDetails = data.bankDetails;
    this.storagePath = data.storagePath;
    this.fileSize = data.fileSize;
    this.isFavorite = data.isFavorite;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get formattedTotal(): string {
    if (this.total === null) return '';
    const currencyCode = this.currency as CurrencyCode;
    const config = CURRENCY_CONFIGS[currencyCode];
    if (!config) return this.total.toFixed(2);
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(this.total);
  }

  get hasStoredPDF(): boolean {
    return this.storagePath !== null;
  }
}
