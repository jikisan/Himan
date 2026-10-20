import { useState, useCallback, useRef, useEffect } from "react";
import { Download, Plus, FileText, Eye, PenLine, Upload, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import { generateLineItemId } from "@invoice-generator/domain/types";
import type { InvoiceData, SavedOptionType } from "@invoice-generator/domain/types";
import { getDefaultInvoiceData } from "@invoice-generator/domain/types";
import { useInvoiceFolders } from "../hooks/useInvoiceFolders";
import { useInvoices } from "../hooks/useInvoices";
import { useSavedOptions } from "../hooks/useSavedOptions";
import { useInvoicePDF } from "../hooks/useInvoicePDF";
import { useInvoiceNumber } from "../hooks/useInvoiceNumber";
import { calculateInvoiceTotals } from "./InvoiceSummary";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { InvoiceSummary } from "./InvoiceSummary";
import { InvoiceFooter } from "./InvoiceFooter";
import { InvoicePreview } from "./InvoicePreview";
import { CategoryList } from "./CategoryList";
import { InvoiceList } from "./InvoiceList";
import { SavedOptionDialog } from "./SavedOptionDialog";
import { FolderSettingsDialog } from "./FolderSettingsDialog";
import { useFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from "@core/presentation/components";


const UPLOAD_PREF_KEY = "invoice-upload-to-supabase";

export const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getDefaultInvoiceData);
  const [activeTab, setActiveTab] = useState<"form" | "preview" | "saved">("form");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | "all" | "favorites">("all");
  const [uploadToSupabase, setUploadToSupabase] = useState(() => {
    try { return localStorage.getItem(UPLOAD_PREF_KEY) === "true"; } catch { return false; }
  });
  const [savedOptionDialogType, setSavedOptionDialogType] = useState<SavedOptionType | null>(null);
  const [folderSettingsOpen, setFolderSettingsOpen] = useState(false);
  const [settingsFolder, setSettingsFolder] = useState<string | null>(null);

  const targetRef = useRef<HTMLDivElement>(null);
  const fe = useFieldErrors();

  // Hooks
  const { folders, loading: foldersLoading, createFolder, updateFolder, deleteFolder, incrementSequence } = useInvoiceFolders();
  const invoiceFilters = selectedCategoryId === "all"
    ? undefined
    : selectedCategoryId === "favorites"
      ? { isFavorite: true }
      : selectedCategoryId === null
        ? { folderId: null }
        : { folderId: selectedCategoryId };
  const { invoices, loading: invoicesLoading, createInvoice, updateInvoice, deleteInvoice } = useInvoices(invoiceFilters);
  const { optionsByType, createOption, updateOption, deleteOption } = useSavedOptions();
  const { generateLocal, generateAndSave, isGenerating, uploadError } = useInvoicePDF();
  const { getNextInvoiceNumber } = useInvoiceNumber();

  // Persist upload preference
  useEffect(() => {
    try { localStorage.setItem(UPLOAD_PREF_KEY, String(uploadToSupabase)); } catch { /* noop */ }
  }, [uploadToSupabase]);

  // Auto-fill invoice number when folder changes
  const selectedFolder = typeof selectedCategoryId === "string" && selectedCategoryId !== "all" && selectedCategoryId !== "favorites"
    ? folders.find((f) => f.id === selectedCategoryId) ?? null
    : null;

  const autoInvoiceNumber = selectedFolder ? getNextInvoiceNumber(selectedFolder) : null;

  // Use the auto-generated number if available, otherwise the manually entered one
  const effectiveInvoiceNumber = autoInvoiceNumber ?? invoiceData.invoiceNumber;

  const clearFieldError = fe.clear;
  const handleChange = useCallback((updates: Partial<InvoiceData>) => {
    setInvoiceData((prev) => ({ ...prev, ...updates }));
    if ('invoiceNumber' in updates) clearFieldError('invoiceNumber');
  }, [clearFieldError]);

  const handleGeneratePDF = async () => {
    fe.clear();
    if (!effectiveInvoiceNumber.trim()) {
      setActiveTab("form");
      fe.fail("invoiceNumber", "Please enter an Invoice Number.");
      return;
    }
    if (!uploadToSupabase) {
      // Local-only download
      await generateLocal(targetRef as React.RefObject<HTMLDivElement>, effectiveInvoiceNumber);
      return;
    }

    // Generate + upload flow
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(invoiceData);

    // Create invoice record first to get ID
    const invoice = await createInvoice({
      folderId: selectedFolder?.id ?? null,
      invoiceNumber: effectiveInvoiceNumber,
      poNumber: invoiceData.poNumber || null,
      companyDetails: invoiceData.companyDetails || null,
      billTo: invoiceData.billTo || null,
      invoiceDate: invoiceData.invoiceDate || null,
      dueDate: invoiceData.dueDate || null,
      currency: invoiceData.currency,
      lineItems: invoiceData.lineItems,
      rushFee: invoiceData.rushFee,
      taxRate: invoiceData.taxRate,
      discount: invoiceData.discount,
      shippingFee: invoiceData.shippingFee,
      subtotal,
      taxAmount,
      total,
      notes: invoiceData.notes || null,
      bankDetails: invoiceData.bankDetails || null,
    });

    if (!invoice) {
      fe.setFormError("Failed to save invoice metadata. PDF will still be downloaded locally.");
      // Still generate locally
      await generateLocal(targetRef as React.RefObject<HTMLDivElement>, effectiveInvoiceNumber);
      return;
    }

    // Generate PDF + upload (local download always happens first)
    const uploadResult = await generateAndSave(
      targetRef as React.RefObject<HTMLDivElement>,
      invoice.id,
      effectiveInvoiceNumber
    );

    if (uploadResult) {
      // Update invoice record with storage info
      await updateInvoice(invoice.id, {
        storagePath: uploadResult.storagePath,
        fileSize: uploadResult.fileSize,
      });
      toast.success("Invoice saved and PDF uploaded");
    } else {
      toast.warning("PDF downloaded locally but upload to storage failed. Invoice metadata was saved.");
    }

    // Increment folder sequence
    if (selectedFolder) {
      await incrementSequence(selectedFolder.id);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the invoice? All data will be lost.")) {
      setInvoiceData(getDefaultInvoiceData());
    }
  };

  const handleToggleCategoryCollapse = useCallback(() => {
    setIsCategoryCollapsed((prev) => !prev);
  }, []);

  const handleCreateCategory = useCallback(async (name: string) => {
    await createFolder({ name });
  }, [createFolder]);

  const handleUpdateCategory = useCallback(async (id: string, name: string) => {
    await updateFolder(id, { name });
  }, [updateFolder]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    await deleteFolder(id);
  }, [deleteFolder]);

  const handleAddLineItem = useCallback(() => {
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: generateLineItemId(), description: "", unitCost: 0, quantity: 1 },
      ],
    }));
  }, []);

  // Saved options handlers
  const handleSaveOption = useCallback(async (type: SavedOptionType, label: string, value: string) => {
    const result = await createOption({ optionType: type, label, value });
    // SavedOptionSelect shows the failure under its label field.
    if (!result) throw new Error("Failed to save option");
    toast.success("Option saved");
  }, [createOption]);

  const handleManageSavedOptions = useCallback((type: SavedOptionType) => {
    setSavedOptionDialogType(type);
  }, []);

  // Invoice list handlers
  const handleToggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    await updateInvoice(id, { isFavorite });
  }, [updateInvoice]);

  const handleDeleteInvoice = useCallback(async (id: string) => {
    await deleteInvoice(id);
  }, [deleteInvoice]);

  const handleMoveToFolder = useCallback(async (id: string, folderId: string | null) => {
    await updateInvoice(id, { folderId });
    toast.success("Invoice moved");
  }, [updateInvoice]);

  // Folder settings
  const handleOpenFolderSettings = useCallback((folderId: string) => {
    setSettingsFolder(folderId);
    setFolderSettingsOpen(true);
  }, []);

  const handleSaveFolderSettings = useCallback(async (dto: {
    invoiceNumberPrefix?: string | null;
    invoiceNumberFormat?: string;
    nextSequenceNumber?: number;
  }) => {
    if (!settingsFolder) return;
    const result = await updateFolder(settingsFolder, dto);
    // FolderSettingsDialog shows the failure in its banner.
    if (!result) throw new Error("Failed to save folder settings");
    toast.success("Folder settings saved");
  }, [settingsFolder, updateFolder]);

  // Map folders to categories for CategoryList
  const categories = folders.map((f) => ({
    id: f.id,
    name: f.name,
    count: f.invoicesCount,
  }));

  return (
    <>
      <div className="flex h-full bg-background">
        <CategoryList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          loading={foldersLoading}
          isCollapsed={isCategoryCollapsed}
          onToggleCollapse={handleToggleCategoryCollapse}
          onOpenFolderSettings={handleOpenFolderSettings}
        />

        <div className="flex-1 flex flex-col min-h-0 bg-background">
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold">Invoice Generator</h1>
              <p className="text-muted-foreground">
                Create and download professional invoices as PDF
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Upload toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={uploadToSupabase}
                  onChange={(e) => setUploadToSupabase(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  <Upload className="h-3.5 w-3.5 inline mr-1" />
                  Upload to Supabase
                </span>
              </label>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isGenerating
                  ? "Generating..."
                  : uploadToSupabase
                    ? "Generate & Upload"
                    : "Generate PDF"}
              </Button>
            </div>
          </div>

          {/* Upload error banner */}
          {uploadError && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm border-b border-amber-200 dark:border-amber-900">
              Upload warning: {uploadError}
            </div>
          )}

          {/* Tab Toggle */}
          <div className="px-4 py-2 border-b border-border shrink-0 flex gap-1">
            <Button
              variant={activeTab === "form" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("form")}
              className="gap-1.5"
            >
              <PenLine className="h-4 w-4" />
              Form
            </Button>
            <Button
              variant={activeTab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant={activeTab === "saved" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("saved")}
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              Saved
            </Button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {fe.formError && <div className="max-w-4xl mx-auto mb-6"><FormErrorBanner message={fe.formError} /></div>}
            {activeTab === "form" ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Invoice Details Section */}
                <Card>
                  <CardHeader>
                    <span className="text-lg font-semibold">Invoice Details</span>
                  </CardHeader>
                  <CardContent>
                    <InvoiceHeader
                      data={invoiceData}
                      onChange={handleChange}
                      savedCompanyOptions={optionsByType.company_details}
                      savedBillToOptions={optionsByType.bill_to}
                      onSaveOption={handleSaveOption}
                      onManageSavedOptions={handleManageSavedOptions}
                      autoInvoiceNumber={autoInvoiceNumber}
                      invoiceNumberError={fe.errors.invoiceNumber}
                    />
                  </CardContent>
                </Card>

                {/* Line Items Section */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <span className="text-lg font-semibold">Line Items</span>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={handleAddLineItem} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add Item
                      </Button>
                      <Button type="button" size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Bulk Import
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <InvoiceLineItems
                      items={invoiceData.lineItems}
                      currency={invoiceData.currency}
                      onChange={(lineItems) => handleChange({ lineItems })}
                      bulkDialogOpen={bulkDialogOpen}
                      onBulkDialogOpenChange={setBulkDialogOpen}
                    />
                  </CardContent>
                </Card>

                {/* Summary Section */}
                <Card>
                  <CardHeader>
                    <span className="text-lg font-semibold">Summary</span>
                  </CardHeader>
                  <CardContent>
                    <InvoiceSummary data={invoiceData} onChange={handleChange} />
                  </CardContent>
                </Card>

                {/* Footer Section */}
                <Card>
                  <CardHeader>
                    <span className="text-lg font-semibold">Additional Information</span>
                  </CardHeader>
                  <CardContent>
                    <InvoiceFooter
                      data={invoiceData}
                      onChange={handleChange}
                      savedNotesOptions={optionsByType.notes}
                      savedBankOptions={optionsByType.bank_details}
                      onSaveOption={handleSaveOption}
                      onManageSavedOptions={handleManageSavedOptions}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : activeTab === "preview" ? (
              <div className="flex justify-center py-6">
                <div
                  className="shadow-lg border border-border"
                  style={{
                    width: "210mm",
                    transform: "scale(0.75)",
                    transformOrigin: "top center",
                  }}
                >
                  <InvoicePreview data={{ ...invoiceData, invoiceNumber: effectiveInvoiceNumber }} />
                </div>
              </div>
            ) : (
              <InvoiceList
                invoices={invoices}
                folders={folders}
                loading={invoicesLoading}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteInvoice}
                onMoveToFolder={handleMoveToFolder}
              />
            )}
          </div>
        </div>
      </div>

      {/* Hidden Preview for PDF Generation */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <InvoicePreview ref={targetRef} data={{ ...invoiceData, invoiceNumber: effectiveInvoiceNumber }} />
      </div>

      {/* Saved Option Dialog */}
      {savedOptionDialogType && (
        <SavedOptionDialog
          open={!!savedOptionDialogType}
          onOpenChange={(open) => { if (!open) setSavedOptionDialogType(null); }}
          optionType={savedOptionDialogType}
          options={optionsByType[savedOptionDialogType]}
          onSave={async (label, value) => {
            if (!await createOption({ optionType: savedOptionDialogType, label, value })) throw new Error("Failed to save option");
          }}
          onUpdate={async (id, label, value) => {
            if (!await updateOption(id, { label, value })) throw new Error("Failed to save option");
          }}
          onDelete={async (id) => {
            await deleteOption(id);
          }}
        />
      )}

      {/* Folder Settings Dialog */}
      <FolderSettingsDialog
        open={folderSettingsOpen}
        onOpenChange={setFolderSettingsOpen}
        folder={folders.find((f) => f.id === settingsFolder) ?? null}
        onSave={handleSaveFolderSettings}
      />
    </>
  );
};
