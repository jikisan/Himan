import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError } from '@core/presentation/components';
import { UserPlus, X, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GroceryInvitationType } from '../../domain';

interface ShareListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  members: Array<{ id: string; userId: string; role: string; joinedAt: Date }>;
  invitations: GroceryInvitationType[];
  currentUserId: string;
  onInvite: (email: string) => Promise<unknown>;
  onCancelInvitation: (invitationId: string) => Promise<unknown>;
  onRemoveMember: (userId: string) => Promise<unknown>;
}

export const ShareListDialog = ({
  open,
  onOpenChange,
  listName,
  members,
  invitations,
  currentUserId,
  onInvite,
  onCancelInvitation,
  onRemoveMember,
}: ShareListDialogProps) => {
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const fe = useFieldErrors();

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const trimmed = email.trim().toLowerCase();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      fe.fail('share-email', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      await onInvite(trimmed);
      setEmail('');
    } catch {
      fe.fail('share-email', 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');
  const isOwner = members.some(
    (m) => m.userId === currentUserId && m.role === 'owner'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{listName}&quot;</DialogTitle>
          <DialogDescription className="sr-only">Invite members or manage access to this list</DialogDescription>
        </DialogHeader>

        {isOwner && (
          <form noValidate onSubmit={handleInvite} className="space-y-2">
            <Label htmlFor="share-email" required>Email address</Label>
            <div className="flex gap-2">
              <Input
                id="share-email"
                type="email"
                required
                {...fe.invalid('share-email')}
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => { setEmail(e.target.value); fe.clear('share-email'); }}
                className="flex-1"
              />
              <Button type="submit" disabled={isInviting}>
                <UserPlus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            </div>
            <FieldError id="share-email" message={fe.errors['share-email']} />
          </form>
        )}

        <div className="space-y-4 mt-2">
          {/* Members */}
          <div>
            <h4 className="text-sm font-medium mb-2">Members</h4>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {member.userId === currentUserId ? 'You' : '?'}
                    </div>
                    <div>
                      <span className="text-sm">
                        {member.userId === currentUserId ? 'You' : member.userId.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">
                        {member.role}
                      </span>
                    </div>
                  </div>
                  {isOwner && member.userId !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => onRemoveMember(member.userId)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Pending invitations</h4>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{invitation.invitedEmail}</span>
                      <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onCancelInvitation(invitation.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
