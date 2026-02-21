import { useCallback } from 'react';
import { InvoiceNumberService } from '../../infrastructure/services';
import type { InvoiceFolder } from '../../domain/entities/InvoiceFolder';

export const useInvoiceNumber = () => {
  const getNextInvoiceNumber = useCallback((folder: InvoiceFolder): string => {
    return InvoiceNumberService.generate(
      folder.invoiceNumberFormat,
      folder.nextSequenceNumber,
      folder.invoiceNumberPrefix
    );
  }, []);

  return { getNextInvoiceNumber };
};
