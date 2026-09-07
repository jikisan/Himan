import { useState, useEffect } from "react";
import { Trash2, Copy } from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import type { LineItem, CurrencyCode } from "@invoice-generator/domain/types";
import { generateLineItemId } from "@invoice-generator/domain/types";
import { formatCurrency } from "../utils/currency";

interface InvoiceLineItemsProps {
  items: LineItem[];
  currency: CurrencyCode;
  onChange: (items: LineItem[]) => void;
  bulkDialogOpen: boolean;
  onBulkDialogOpenChange: (open: boolean) => void;
}

interface NumericCellProps {
  value: number;
  onChange: (n: number) => void;
  integer?: boolean;
  className?: string;
}

const NumericCell = ({ value, onChange, integer, className }: NumericCellProps) => {
  const [raw, setRaw] = useState<string>(value === 0 ? "" : String(value));

  useEffect(() => {
    const parsed = raw === "" || raw === "-" ? 0 : integer ? parseInt(raw, 10) : parseFloat(raw);
    const normalized = Number.isNaN(parsed) ? 0 : parsed;
    if (normalized !== value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resync display text when external value diverges from parsed input
      setRaw(value === 0 ? "" : String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={raw}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        if (v === "" || v === "-") {
          onChange(0);
          return;
        }
        const parsed = integer ? parseInt(v, 10) : parseFloat(v);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      className={className}
    />
  );
};

function parseLineItems(text: string): { items: LineItem[]; errors: string[] } {
  const lines = text.split("\n");
  const items: LineItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const parts = line.split("|").map((p) => p.trim());
    const description = parts[0] ?? "";
    const unitCostStr = parts[1] ?? "";
    const quantityStr = parts[2] ?? "";

    if (description === "") {
      errors.push(`Line ${i + 1}: Description is empty`);
      continue;
    }

    const unitCost = parseFloat(unitCostStr);
    if (isNaN(unitCost)) {
      errors.push(`Line ${i + 1}: "${unitCostStr}" is not a valid unit cost`);
      continue;
    }

    const quantity = quantityStr === "" ? 1 : parseInt(quantityStr, 10);

    items.push({
      id: generateLineItemId(),
      description,
      unitCost,
      quantity: isNaN(quantity) || quantity < 0 ? 0 : quantity,
    });
  }

  return { items, errors };
}

export const InvoiceLineItems = ({
  items,
  currency,
  onChange,
  bulkDialogOpen,
  onBulkDialogOpenChange,
}: InvoiceLineItemsProps) => {
  const [bulkText, setBulkText] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const aiPrompt = `Generate invoice line items in this exact format, one per line:
Description | Unit Cost | Quantity

Example:                                                                                                                                                                   
Website Design | 75000 | 1
SEO Package | 15000 | 1

[Describe your items here]`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleItemChange = (
    id: string,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    );
    onChange(updated);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      // Keep at least one row, just clear it
      onChange([
        { id: generateLineItemId(), description: "", unitCost: 0, quantity: 1 },
      ]);
    } else {
      onChange(items.filter((item) => item.id !== id));
    }
  };

  const calculateAmount = (item: LineItem): number => {
    return item.unitCost * item.quantity;
  };

  const handleBulkImport = (mode: "replace" | "append") => {
    const { items: parsed, errors } = parseLineItems(bulkText);

    if (errors.length > 0) {
      setBulkErrors(errors);
      return;
    }

    if (parsed.length === 0) {
      setBulkErrors(["No valid items found. Enter at least one item."]);
      return;
    }

    if (mode === "replace") {
      onChange(parsed);
    } else {
      onChange([...items, ...parsed]);
    }

    onBulkDialogOpenChange(false);
    setBulkText("");
    setBulkErrors([]);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-sm">
                Description
              </th>
              <th className="text-right py-2 px-2 font-medium text-sm w-28">
                Unit Cost
              </th>
              <th className="text-right py-2 px-2 font-medium text-sm w-20">
                Qty
              </th>
              <th className="text-right py-2 px-2 font-medium text-sm w-32">
                Amount
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={
                  index % 2 === 0 ? "bg-secondary/30" : "bg-background"
                }
              >
                <td className="py-2 px-2">
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(item.id, "description", e.target.value)
                    }
                    placeholder="Item description"
                    maxLength={200}
                    className="border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2">
                  <NumericCell
                    value={item.unitCost}
                    onChange={(n) => handleItemChange(item.id, "unitCost", n)}
                    className="text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2">
                  <NumericCell
                    value={item.quantity}
                    integer
                    onChange={(n) => handleItemChange(item.id, "quantity", n)}
                    className="text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2 text-right font-mono text-sm">
                  {formatCurrency(calculateAmount(item), currency)}
                </td>
                <td className="py-2 px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={bulkDialogOpen}
        onOpenChange={(open) => {
          onBulkDialogOpenChange(open);
          if (!open) {
            setBulkText("");
            setBulkErrors([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Line Items</DialogTitle>
            <DialogDescription className="sr-only">Enter line items in bulk using the pipe-separated format</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter one item per line using the format:{" "}
              <code className="bg-muted px-1 rounded text-xs">
                Description | Unit Cost | Quantity
              </code>
            </p>
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                Generate with AI
              </summary>
              <div className="flex items-end flex-col mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className=" h-7 gap-1 text-xs"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <pre className="bg-muted rounded-md p-3 pr-16 font-mono text-xs whitespace-pre-wrap">
                  {aiPrompt}
                </pre>
              </div>
            </details>
            <Textarea
              value={bulkText}
              onChange={(e) => {
                setBulkText(e.target.value);
                setBulkErrors([]);
              }}
              placeholder={
                "Website Design | 75000 | 1\nSEO Package | 15000 | 1\nMonthly Hosting | 3500 | 3"
              }
              rows={8}
              className="font-mono text-sm"
            />
            {bulkErrors.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                {bulkErrors.map((error, i) => (
                  <p key={i} className="text-sm text-destructive">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleBulkImport("append")}
            >
              Add to Existing
            </Button>
            <Button type="button" onClick={() => handleBulkImport("replace")}>
              Replace All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
