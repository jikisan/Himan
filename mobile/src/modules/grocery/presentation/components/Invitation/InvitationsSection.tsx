import { View } from 'react-native';
import { InvitationBanner } from './InvitationBanner';

interface InvitationsSectionProps {
  invitations: any[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function InvitationsSection({
  invitations,
  onAccept,
  onDecline,
}: InvitationsSectionProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <View className="px-3 mt-2 space-y-2">
      {invitations.map((invitation) => (
        <InvitationBanner
          key={invitation.id}
          listName={invitation.listName || 'Unknown List'}
          inviterEmail={invitation.invitedByEmail || invitation.invitedBy || 'Unknown'}
          onAccept={() => onAccept(invitation.id)}
          onDecline={() => onDecline(invitation.id)}
        />
      ))}
    </View>
  );
}
