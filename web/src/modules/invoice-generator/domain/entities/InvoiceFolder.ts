import type { InvoiceFolderType } from '../types';

export class InvoiceFolder {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly invoiceNumberPrefix: string | null;
  readonly invoiceNumberFormat: string;
  readonly nextSequenceNumber: number;
  readonly invoicesCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: InvoiceFolderType) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.invoiceNumberPrefix = data.invoiceNumberPrefix;
    this.invoiceNumberFormat = data.invoiceNumberFormat;
    this.nextSequenceNumber = data.nextSequenceNumber;
    this.invoicesCount = data.invoicesCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Generate the next invoice number based on the folder's format.
   * Tokens: {YYYY}, {YY}, {MM}, {PREFIX}, {NNN} (variable N width)
   */
  generateNextInvoiceNumber(): string {
    return InvoiceFolder.generateInvoiceNumber(
      this.invoiceNumberFormat,
      this.nextSequenceNumber,
      this.invoiceNumberPrefix
    );
  }

  /**
   * Static helper to generate an invoice number from format, sequence, and optional prefix.
   * Example: generate('INV-{YYYY}-{NNN}', 1) → 'INV-2026-001'
   * Example: generate('{PREFIX}-{NNN}', 42, 'ACME') → 'ACME-042'
   */
  static generateInvoiceNumber(
    format: string,
    sequence: number,
    prefix?: string | null
  ): string {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const yy = yyyy.slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');

    let result = format;
    result = result.replace(/\{YYYY}/g, yyyy);
    result = result.replace(/\{YY}/g, yy);
    result = result.replace(/\{MM}/g, mm);
    result = result.replace(/\{PREFIX}/g, prefix ?? '');

    // Replace {NNN...} with zero-padded sequence (width = number of N's)
    result = result.replace(/\{(N+)}/g, (_match, ns: string) => {
      return sequence.toString().padStart(ns.length, '0');
    });

    return result;
  }
}
