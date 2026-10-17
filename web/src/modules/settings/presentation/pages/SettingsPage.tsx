import { useState } from 'react';
import { Check, Copy, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { ConfirmDialog } from '@/components/ui';
import { SettingsRow, SettingsSection } from '../components/SettingsSection';
import { PlanUsageSection } from '../components/PlanUsageSection';
import { ThemeControl } from '../components/ThemeControl';

const CopyIdButton = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('User ID copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Couldn’t copy. Select the ID and copy it instead.');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy user ID"
      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

export const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>

      <div className="space-y-8">
        <SettingsSection title="Account">
          <SettingsRow label="Email">
            <span className="truncate text-muted-foreground">{user?.email ?? '—'}</span>
          </SettingsRow>
          {user?.id && (
            <SettingsRow label="User ID">
              <span className="truncate font-mono text-xs text-muted-foreground" title={user.id}>
                {user.id}
              </span>
              <CopyIdButton id={user.id} />
            </SettingsRow>
          )}
          {user?.created_at && (
            <SettingsRow label="Member since">
              <span className="text-muted-foreground">{format(new Date(user.created_at), 'MMMM yyyy')}</span>
            </SettingsRow>
          )}
        </SettingsSection>

        <PlanUsageSection />

        <SettingsSection title="Appearance" footer="System follows your device’s light or dark setting.">
          <SettingsRow label="Theme" className="flex-wrap">
            <ThemeControl />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection>
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 focus-visible:bg-destructive/5 focus-visible:outline-none"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        description="You’ll need to sign in again to see your notes, passwords, and files on this device."
        confirmText="Sign out"
        variant="destructive"
        onConfirm={() => void signOut()}
      />
    </div>
  );
};
