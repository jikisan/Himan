import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError } from '@core/presentation/components';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SessionMemberType, SessionPresence } from '../../domain';

interface AddShopperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: SessionMemberType[];
  participants: SessionPresence[];
  currentUserId: string;
  startedBy: string;
  onAddShopper: (email: string) => Promise<unknown>;
  onRemoveShopper: (userId: string) => Promise<unknown>;
  isAdding: boolean;
}

export const AddShopperDialog = ({
  open,
  onOpenChange,
  members,
  participants,
  currentUserId,
  startedBy,
  onAddShopper,
  onRemoveShopper,
  isAdding,
}: AddShopperDialogProps) => {
  const [email, setEmail] = useState('');
  const fe = useFieldErrors();

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const trimmed = email.trim();
    if (!trimmed) { fe.fail('shopper-email', 'Enter an email address'); return; }
    try {
      await onAddShopper(trimmed);
      setEmail('');
    } catch (err) {
      fe.fail('shopper-email', err instanceof Error && err.message === 'User not found' ? 'User not found with that email' : 'Failed to add shopper');
    }
  };

  const isStarter = currentUserId === startedBy;
  const onlineUserIds = new Set(participants.map((p) => p.userId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Shoppers</DialogTitle>
          <DialogDescription className="sr-only">Manage shoppers for this session</DialogDescription>
        </DialogHeader>

        {/* Current members */}
        <div className="space-y-2">
          {members.map((member) => {
            const isOnline = onlineUserIds.has(member.userId);
            const displayName =
              participants.find((p) => p.userId === member.userId)?.displayName ??
              member.email ??
              'Unknown';
            const isMe = member.userId === currentUserId;
            const isMemberStarter = member.userId === startedBy;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                      isOnline ? 'bg-green-500' : 'bg-muted-foreground/30'
                    }`}
                  />
                  <span className="text-sm truncate">
                    {displayName}
                    {isMe && ' (you)'}
                  </span>
                  {isMemberStarter && (
                    <span className="text-xs text-muted-foreground">Host</span>
                  )}
                </div>
                {isStarter && !isMemberStarter && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={() => onRemoveShopper(member.userId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new shopper */}
        {isStarter && (
          <form noValidate onSubmit={handleAdd} className="space-y-2 pt-2 border-t">
            <Label htmlFor="shopper-email" required>Shopper email</Label>
            <div className="flex gap-2">
            <Input
              id="shopper-email"
              type="email"
              required
              {...fe.invalid('shopper-email')}
              placeholder="Email address"
              value={email}
              onChange={(e) => { setEmail(e.target.value); fe.clear('shopper-email'); }}
              className="h-9 text-sm"
              readOnly={isAdding}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3"
              aria-label="Add shopper"
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
            </div>
            <FieldError id="shopper-email" message={fe.errors['shopper-email']} />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
