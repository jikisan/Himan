import { Mail, Check, X } from 'lucide-react';
import type { GroceryInvitationType } from '../../domain';
import { Button } from '@/components/ui/button';

interface InvitationBannerProps {
  invitations: GroceryInvitationType[];
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
}

export const InvitationBanner = ({
  invitations,
  onAccept,
  onDecline,
}: InvitationBannerProps) => {
  if (invitations.length === 0) return null;

  return (
    <div className="mx-2 mb-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">
          {invitations.length} pending invitation{invitations.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-sm truncate flex-1">
              {invitation.listName ?? 'Grocery List'}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                onClick={() => onAccept(invitation.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={() => onDecline(invitation.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
