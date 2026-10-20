import { useId, useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError } from '@core/presentation/components';
import { ChevronDown, Save, Settings } from 'lucide-react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui';
import type { InvoiceSavedOptionType } from '../../domain/types';

interface SavedOptionSelectProps {
  options: InvoiceSavedOptionType[];
  currentValue: string;
  onSelect: (value: string) => void;
  /** Rejects when the save fails; the popover then shows the failure under the label. */
  onSaveCurrent: (label: string) => Promise<void> | void;
  onManage: () => void;
}

export const SavedOptionSelect = ({
  options,
  currentValue,
  onSelect,
  onSaveCurrent,
  onManage,
}: SavedOptionSelectProps) => {
  const [open, setOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  // Several pickers share a page, so the label id must be unique.
  const nameId = `${useId()}-saved-option-name`;
  const fe = useFieldErrors();

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!saveLabel.trim()) { fe.fail(nameId, 'Enter a label'); return; }
    if (!currentValue.trim()) return;
    try {
      await onSaveCurrent(saveLabel.trim());
    } catch {
      fe.fail(nameId, 'Failed to save option');
      return;
    }
    setSaveLabel('');
    setShowSaveInput(false);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground gap-1">
          <ChevronDown className="h-3 w-3" />
          Saved
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {options.length > 0 && (
          <div className="max-h-40 overflow-auto space-y-0.5 mb-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.value)}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent truncate"
                title={opt.label}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {options.length === 0 && !showSaveInput && (
          <p className="text-xs text-muted-foreground px-2 py-1.5 mb-2">No saved options yet.</p>
        )}

        {showSaveInput ? (
          <form noValidate onSubmit={handleSave} className="space-y-1">
            <div className="flex gap-1 items-center">
            <input
              id={nameId}
              autoFocus
              required
              aria-label="Label for this entry"
              {...fe.invalid(nameId)}
              value={saveLabel}
              onChange={(e) => { setSaveLabel(e.target.value); fe.clear(nameId); }}
              placeholder="Label for this entry"
              className="flex-1 h-7 px-2 text-xs border border-border rounded bg-background aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25"
              maxLength={100}
            />
            <Button type="submit" size="sm" variant="ghost" className="h-7 px-2" aria-label="Save option" disabled={!currentValue.trim()}>
              <Save className="h-3 w-3" />
            </Button>
            </div>
            <FieldError id={nameId} message={fe.errors[nameId]} />
          </form>
        ) : (
          <div className="flex gap-1 border-t border-border pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => setShowSaveInput(true)}
              disabled={!currentValue.trim()}
            >
              <Save className="h-3 w-3" />
              Save Current
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => { onManage(); setOpen(false); }}
            >
              <Settings className="h-3 w-3" />
              Manage
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
