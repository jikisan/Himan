import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
} from '@/components/ui';
import type { DashboardAppId } from '../../domain/entities';
import type { DashboardApp } from './appCatalog';
import { AppIcon } from './AppIcon';

interface CustomizeDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apps: DashboardApp[];
  hidden: DashboardAppId[];
  saving: boolean;
  onSave: (hidden: DashboardAppId[]) => void;
}

/** Edits a draft of the hidden apps; nothing is saved until Save. */
const CustomizeForm = ({ apps, hidden, saving, onSave, onCancel }: Omit<CustomizeDashboardDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) => {
  const [draft, setDraft] = useState<DashboardAppId[]>(hidden);
  const shown = (id: DashboardAppId) => !draft.includes(id);
  const toggle = (id: DashboardAppId, show: boolean) =>
    setDraft((current) => (show ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <>
      <ul className="-mx-2 max-h-[60dvh] divide-y divide-border overflow-y-auto">
        {apps.map((app) => (
          <li key={app.id} className="flex items-center gap-3 px-2 py-2.5">
            <AppIcon icon={app.icon} color={app.color} />
            <span id={`dashboard-app-${app.id}`} className="flex-1 text-sm font-medium text-foreground">{app.label}</span>
            <Switch
              aria-labelledby={`dashboard-app-${app.id}`}
              checked={shown(app.id)}
              onCheckedChange={(show) => toggle(app.id, show)}
            />
          </li>
        ))}
      </ul>
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={() => setDraft([])} disabled={draft.length === 0}>
          Show all
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(draft)} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </DialogFooter>
    </>
  );
};

export const CustomizeDashboardDialog = ({ open, onOpenChange, ...form }: CustomizeDashboardDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Customize dashboard</DialogTitle>
        <DialogDescription>Choose which apps appear on your dashboard. Hidden apps stay in the sidebar.</DialogDescription>
      </DialogHeader>
      {/* Remounting on open resets the draft to what is saved. */}
      {open && <CustomizeForm {...form} onCancel={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
);
