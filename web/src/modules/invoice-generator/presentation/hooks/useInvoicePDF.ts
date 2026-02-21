import { useCallback, useState } from 'react';
import generatePDF from 'react-to-pdf';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { InvoicePDFService } from '../../infrastructure/services';
import { getPDFBuildOptions, getPDFOptions } from '../utils/pdf';
import { Logger } from '@core/infrastructure/services';

type GenerateAndSaveResult = {
  storagePath: string;
  fileSize: number;
} | null;

export const useInvoicePDF = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Generate PDF and save locally only (no upload).
   * Always succeeds as long as the DOM ref is valid.
   */
  const generateLocal = useCallback(
    async (targetRef: React.RefObject<HTMLDivElement | null>, invoiceNumber?: string) => {
      setIsGenerating(true);
      setUploadError(null);
      try {
        await generatePDF(targetRef, getPDFOptions(invoiceNumber));
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Generate PDF, save locally, then attempt upload to Supabase.
   * PDF generation + local download always happens first.
   * Upload failure does NOT block the local download.
   *
   * Returns upload result on success, null on upload failure (PDF still downloaded).
   */
  const generateAndSave = useCallback(
    async (
      targetRef: React.RefObject<HTMLDivElement | null>,
      invoiceId: string,
      invoiceNumber?: string
    ): Promise<GenerateAndSaveResult> => {
      const userId = user?.id;
      if (!userId) {
        Logger.error('User not authenticated for PDF upload');
        return null;
      }

      setIsGenerating(true);
      setUploadError(null);

      try {
        // Step 1: Build the PDF in memory → jsPDF instance
        const pdfInstance = await generatePDF(targetRef, getPDFBuildOptions());

        // Step 2: Always save locally first (this never fails if step 1 succeeded)
        const filename = invoiceNumber ? `Invoice-${invoiceNumber}.pdf` : 'invoice.pdf';
        pdfInstance.save(filename);

        // Step 3: Attempt upload (wrapped in try/catch — failure is non-fatal)
        try {
          const blob = pdfInstance.output('blob');
          const result = await InvoicePDFService.upload(userId, invoiceId, blob);
          return { storagePath: result.path, fileSize: result.fileSize };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to upload PDF to storage';
          setUploadError(message);
          Logger.error('PDF upload failed (local download succeeded)', err);
          return null;
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [user?.id]
  );

  return {
    generateLocal,
    generateAndSave,
    isGenerating,
    uploadError,
  };
};
