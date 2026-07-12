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
    <div className="mx-2 mb-1 mt-2 p-3 bg-blue-500/8 border border-blue-500/15 rounded-xl">
      <div className="flex items-center gap-2 mb-2.5">
        <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
          {invitations.length} pending invitation{invitations.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center justify-between gap-2">
            <span className="text-sm truncate flex-1 font-medium">
              {invitation.listName ?? 'Grocery List'}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 active:bg-emerald-500/20"
                onClick={() => onAccept(invitation.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 active:bg-destructive/20"
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
