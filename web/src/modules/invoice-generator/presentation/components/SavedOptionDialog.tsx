import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
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
  const fe = useFieldErrors();

  const check = (label: string, value: string, prefix: string) => {
    const invalid: [string, string][] = [];
    if (!label.trim()) invalid.push([`${prefix}-label`, 'Enter a label']);
    if (!value.trim()) invalid.push([`${prefix}-value`, 'Enter the content']);
    fe.failMany(invalid);
    return !invalid.length;
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!check(newLabel, newValue, 'saved-option')) return;
    setIsSaving(true);
    try {
      await onSave(newLabel.trim(), newValue.trim());
      setNewLabel('');
      setNewValue('');
    } catch {
      fe.setFormError('Failed to save option');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (opt: InvoiceSavedOptionType) => {
    fe.clear();
    setEditingId(opt.id);
    setEditLabel(opt.label);
    setEditValue(opt.value);
  };

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!editingId || !check(editLabel, editValue, 'saved-option-edit')) return;
    setIsSaving(true);
    try {
      await onUpdate(editingId, editLabel.trim(), editValue.trim());
      setEditingId(null);
    } catch {
      fe.setFormError('Failed to save option');
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

        <FormErrorBanner message={fe.formError} />

        {/* Existing options */}
        <div className="space-y-3">
          {options.map((opt) => (
            <div key={opt.id} className="border border-border rounded-md p-3">
              {editingId === opt.id ? (
                <form noValidate onSubmit={handleSaveEdit} className="space-y-2">
                  <Input
                    id="saved-option-edit-label"
                    aria-label="Label"
                    required
                    {...fe.invalid('saved-option-edit-label')}
                    value={editLabel}
                    onChange={(e) => { setEditLabel(e.target.value); fe.clear('saved-option-edit-label'); }}
                    placeholder="Label"
                    maxLength={100}
                  />
                  <FieldError id="saved-option-edit-label" message={fe.errors['saved-option-edit-label']} />
                  <Textarea
                    id="saved-option-edit-value"
                    aria-label="Content"
                    required
                    {...fe.invalid('saved-option-edit-value')}
                    value={editValue}
                    onChange={(e) => { setEditValue(e.target.value); fe.clear('saved-option-edit-value'); }}
                    placeholder="Content"
                    className="min-h-[60px]"
                    maxLength={2000}
                  />
                  <FieldError id="saved-option-edit-value" message={fe.errors['saved-option-edit-value']} />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); fe.clear(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSaving}>
                      Save
                    </Button>
                  </div>
                </form>
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
        <form noValidate onSubmit={handleAdd} className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium">Add New</p>
          <Label htmlFor="saved-option-label" required>Label</Label>
          <Input
            id="saved-option-label"
            required
            {...fe.invalid('saved-option-label')}
            value={newLabel}
            onChange={(e) => { setNewLabel(e.target.value); fe.clear('saved-option-label'); }}
            placeholder="Label (e.g. My Company)"
            maxLength={100}
          />
          <FieldError id="saved-option-label" message={fe.errors['saved-option-label']} />
          <Label htmlFor="saved-option-value" required>Content</Label>
          <Textarea
            id="saved-option-value"
            required
            {...fe.invalid('saved-option-value')}
            value={newValue}
            onChange={(e) => { setNewValue(e.target.value); fe.clear('saved-option-value'); }}
            placeholder="Content"
            className="min-h-[60px]"
            maxLength={2000}
          />
          <FieldError id="saved-option-value" message={fe.errors['saved-option-value']} />
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
