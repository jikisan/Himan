import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
} from '@/components/ui';
import type { InvoiceSavedOptionType, SavedOptionType } from '../../domain/types';

const TYPE_LABELS: Record<SavedOptionType, string> = {
  company_details: 'Company Details',
  bill_to: 'Bill To',
  notes: 'Notes',
  bank_details: 'Bank Details',
};

interface SavedOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  optionType: SavedOptionType;
  options: InvoiceSavedOptionType[];
  onSave: (label: string, value: string) => Promise<void>;
  onUpdate: (id: string, label: string, value: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const SavedOptionDialog = ({
  open,
  onOpenChange,
  optionType,
  options,
  onSave,
  onUpdate,
  onDelete,
}: SavedOptionDialogProps) => {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newValue.trim()) return;
    setIsSaving(true);
    try {
      await onSave(newLabel.trim(), newValue.trim());
      setNewLabel('');
      setNewValue('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (opt: InvoiceSavedOptionType) => {
    setEditingId(opt.id);
    setEditLabel(opt.label);
    setEditValue(opt.value);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim() || !editValue.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(editingId, editLabel.trim(), editValue.trim());
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this saved option?')) return;
    await onDelete(id);
    if (editingId === id) setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Manage Saved {TYPE_LABELS[optionType]}</DialogTitle>
          <DialogDescription>
            Create, edit, or delete saved {TYPE_LABELS[optionType].toLowerCase()} entries.
          </DialogDescription>
        </DialogHeader>

        {/* Existing options */}
        <div className="space-y-3">
          {options.map((opt) => (
            <div key={opt.id} className="border border-border rounded-md p-3">
              {editingId === opt.id ? (
                <div className="space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label"
                    maxLength={100}
                  />
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Content"
                    className="min-h-[60px]"
                    maxLength={2000}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                      {opt.value}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleStartEdit(opt)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(opt.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {options.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No saved {TYPE_LABELS[optionType].toLowerCase()} yet.
            </p>
          )}
        </div>

        {/* Add new */}
        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-sm font-medium">Add New</Label>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. My Company)"
            maxLength={100}
          />
          <Textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Content"
            className="min-h-[60px]"
            maxLength={2000}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isSaving || !newLabel.trim() || !newValue.trim()}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
