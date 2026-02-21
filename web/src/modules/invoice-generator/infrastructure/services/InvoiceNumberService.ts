/**
 * Generates invoice numbers from format strings.
 * Tokens: {YYYY}, {YY}, {MM}, {PREFIX}, {NNN} (variable N width)
 *
 * Examples:
 *   generate('INV-{YYYY}-{NNN}', 1)         → 'INV-2026-001'
 *   generate('{PREFIX}-{NNN}', 42, 'ACME')   → 'ACME-042'
 *   generate('INV-{YY}{MM}-{NNNN}', 7)       → 'INV-2602-0007'
 */
export class InvoiceNumberService {
  static generate(format: string, sequence: number, prefix?: string | null): string {
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
