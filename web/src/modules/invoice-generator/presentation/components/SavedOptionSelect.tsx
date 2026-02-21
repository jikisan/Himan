import { useState } from 'react';
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
  onSaveCurrent: (label: string) => void;
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

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  const handleSave = () => {
    if (!saveLabel.trim() || !currentValue.trim()) return;
    onSaveCurrent(saveLabel.trim());
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
          <div className="flex gap-1 items-center">
            <input
              autoFocus
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Label for this entry"
              className="flex-1 h-7 px-2 text-xs border border-border rounded bg-background"
              maxLength={100}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleSave} disabled={!saveLabel.trim() || !currentValue.trim()}>
              <Save className="h-3 w-3" />
            </Button>
          </div>
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
