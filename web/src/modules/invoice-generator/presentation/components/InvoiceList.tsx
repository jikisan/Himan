import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Star,
  StarOff,
  Trash2,
  FolderInput,
} from 'lucide-react';
import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { toast } from 'sonner';
import type { Invoice } from '../../domain/entities/Invoice';
import type { InvoiceFolder } from '../../domain/entities/InvoiceFolder';
import { InvoicePDFService } from '../../infrastructure/services';

interface InvoiceListProps {
  invoices: Invoice[];
  folders: InvoiceFolder[];
  loading: boolean;
  onToggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveToFolder: (id: string, folderId: string | null) => Promise<void>;
}

export const InvoiceList = ({
  invoices,
  folders,
  loading,
  onToggleFavorite,
  onDelete,
  onMoveToFolder,
}: InvoiceListProps) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleViewPDF = async (invoice: Invoice) => {
    if (!invoice.storagePath) return;
    setActionLoading(invoice.id);
    try {
      const url = await InvoicePDFService.getSignedUrl(invoice.storagePath);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to get PDF URL');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.storagePath) return;
    setActionLoading(invoice.id);
    try {
      const blob = await InvoicePDFService.download(invoice.storagePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return;
    setActionLoading(invoice.id);
    try {
      // Delete storage file if exists
      if (invoice.storagePath) {
        try {
          await InvoicePDFService.delete(invoice.storagePath);
        } catch {
          // Non-fatal: storage delete may fail on free tier
        }
      }
      await onDelete(invoice.id);
      toast.success('Invoice deleted');
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading invoices...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No saved invoices yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate a PDF with "Upload to Supabase" enabled to save invoices here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="divide-y divide-border border border-border rounded-lg">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30"
          >
            {/* Favorite toggle */}
            <button
              onClick={() => onToggleFavorite(invoice.id, !invoice.isFavorite)}
              className="shrink-0 text-muted-foreground hover:text-yellow-500"
            >
              {invoice.isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-medium text-sm">
                  {invoice.invoiceNumber}
                </span>
                {invoice.invoiceDate && (
                  <span className="text-xs text-muted-foreground">
                    {invoice.invoiceDate}
                  </span>
                )}
              </div>
              {invoice.billTo && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {invoice.billTo.split('\n')[0]}
                </p>
              )}
            </div>

            {/* Total */}
            <span className="font-mono text-sm font-medium shrink-0">
              {invoice.formattedTotal}
            </span>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
              {invoice.hasStoredPDF && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleViewPDF(invoice)}
                    disabled={actionLoading === invoice.id}
                    title="View PDF"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDownloadPDF(invoice)}
                    disabled={actionLoading === invoice.id}
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {/* Move to folder */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Move to folder">
                    <FolderInput className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onMoveToFolder(invoice.id, null)}>
                    Uncategorized
                  </DropdownMenuItem>
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => onMoveToFolder(invoice.id, folder.id)}
                    >
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => handleDelete(invoice)}
                disabled={actionLoading === invoice.id}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
