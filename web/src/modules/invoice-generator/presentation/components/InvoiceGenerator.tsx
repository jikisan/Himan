import { useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Label } from '@/components/ui';
import { InvoiceHeader } from './InvoiceHeader';
import { InvoiceLineItems } from './InvoiceLineItems';
import { InvoiceSummary } from './InvoiceSummary';
import { InvoiceFooter } from './InvoiceFooter';
import { InvoicePreview } from './InvoicePreview';
import type { InvoiceData } from '@invoice-generator/domain/types';
import { getDefaultInvoiceData } from '@invoice-generator/domain/types';
import { generatePDF } from '../utils/pdf';

export const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getDefaultInvoiceData);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((updates: Partial<InvoiceData>) => {
    setInvoiceData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleGeneratePDF = async () => {
    if (!previewRef.current) return;

    setIsGenerating(true);
    try {
      await generatePDF(previewRef.current, invoiceData.invoiceNumber);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the invoice? All data will be lost.')) {
      setInvoiceData(getDefaultInvoiceData());
    }
  };

  return (
    <div className="min-h-full bg-secondary p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Invoice Generator</h1>
            <p className="text-muted-foreground">
              Create and download professional invoices as PDF
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating || !invoiceData.invoiceNumber}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </div>

        {/* Invoice Details Section */}
        <Card>
          <CardHeader>
            <Label className="text-lg font-semibold">Invoice Details</Label>
          </CardHeader>
          <CardContent>
            <InvoiceHeader data={invoiceData} onChange={handleChange} />
          </CardContent>
        </Card>

        {/* Line Items Section */}
        <Card>
          <CardHeader>
            <Label className="text-lg font-semibold">Line Items</Label>
          </CardHeader>
          <CardContent>
            <InvoiceLineItems
              items={invoiceData.lineItems}
              currency={invoiceData.currency}
              onChange={(lineItems) => handleChange({ lineItems })}
            />
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <Label className="text-lg font-semibold">Summary</Label>
          </CardHeader>
          <CardContent>
            <InvoiceSummary data={invoiceData} onChange={handleChange} />
          </CardContent>
        </Card>

        {/* Footer Section */}
        <Card>
          <CardHeader>
            <Label className="text-lg font-semibold">Additional Information</Label>
          </CardHeader>
          <CardContent>
            <InvoiceFooter data={invoiceData} onChange={handleChange} />
          </CardContent>
        </Card>

        {/* Validation Messages */}
        {!invoiceData.invoiceNumber && (
          <p className="text-sm text-amber-600 text-center">
            Please enter an Invoice Number to enable PDF generation.
          </p>
        )}
      </div>

      {/* Hidden Preview for PDF Generation */}
      <InvoicePreview ref={previewRef} data={invoiceData} />
    </div>
  );
};
