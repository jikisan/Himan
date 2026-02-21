import { useState, useCallback } from "react";
import { usePDF } from "react-to-pdf";
import { Download, Plus, FileText, Eye, PenLine } from "lucide-react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui";
import { generateLineItemId } from "@invoice-generator/domain/types";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceLineItems } from "./InvoiceLineItems";
import { InvoiceSummary } from "./InvoiceSummary";
import { InvoiceFooter } from "./InvoiceFooter";
import { InvoicePreview } from "./InvoicePreview";
import { CategoryList } from "./CategoryList";
import type { InvoiceData } from "@invoice-generator/domain/types";
import { getDefaultInvoiceData } from "@invoice-generator/domain/types";
import { getPDFOptions } from "../utils/pdf";

export const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(
    getDefaultInvoiceData,
  );
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null | "all" | "favorites"
  >("all");
  const { toPDF, targetRef } = usePDF();

  const handleChange = useCallback((updates: Partial<InvoiceData>) => {
    setInvoiceData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      toPDF(getPDFOptions(invoiceData.invoiceNumber));
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset the invoice? All data will be lost.",
      )
    ) {
      setInvoiceData(getDefaultInvoiceData());
    }
  };

  const handleToggleCategoryCollapse = useCallback(() => {
    setIsCategoryCollapsed((prev) => !prev);
  }, []);

  const handleCreateCategory = useCallback(async (name: string) => {
    // Placeholder - implement category creation logic if needed
    console.log("Create category:", name);
  }, []);

  const handleUpdateCategory = useCallback(async (id: string, name: string) => {
    // Placeholder - implement category update logic if needed
    console.log("Update category:", id, name);
  }, []);

  const handleDeleteCategory = useCallback(async (id: string) => {
    // Placeholder - implement category delete logic if needed
    console.log("Delete category:", id);
  }, []);

  const handleAddLineItem = useCallback(() => {
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: generateLineItemId(), description: '', unitCost: 0, quantity: 1 },
      ],
    }));
  }, []);

  // Mock empty categories for now
  const categories: Array<{ id: string; name: string; count?: number }> = [];

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
          loading={false}
          isCollapsed={isCategoryCollapsed}
          onToggleCollapse={handleToggleCategoryCollapse}
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isGenerating || !invoiceData.invoiceNumber}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>

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
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === "form" ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Invoice Details Section */}
                <Card>
                  <CardHeader>
                    <span className="text-lg font-semibold">
                      Invoice Details
                    </span>
                  </CardHeader>
                  <CardContent>
                    <InvoiceHeader data={invoiceData} onChange={handleChange} />
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
                    <span className="text-lg font-semibold">
                      Additional Information
                    </span>
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
            ) : (
              <div className="flex justify-center py-6">
                <div
                  className="shadow-lg border border-border"
                  style={{
                    width: "210mm",
                    transform: "scale(0.75)",
                    transformOrigin: "top center",
                  }}
                >
                  <InvoicePreview data={invoiceData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Preview for PDF Generation */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <InvoicePreview ref={targetRef} data={invoiceData} />
      </div>
    </>
  );
};
