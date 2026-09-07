import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface InvitationBannerProps {
  listName: string;
  inviterEmail: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const InvitationBanner = ({
  listName,
  inviterEmail,
  onAccept,
  onDecline,
}: InvitationBannerProps) => {
  return (
    <View className="mx-3 mt-2 p-4 bg-sticky dark:bg-sticky-dark border border-rule dark:border-rule-dark rounded-xl">
      <View className="flex flex-row items-start gap-2">
        <Feather name="mail" size={18} color="#0088b0" />
        <View className="flex-1">
          <Text className="text-sm font-medium text-ink dark:text-ink-dark mb-1">
            Invitation to {listName}
          </Text>
          <Text className="text-xs text-ink-soft dark:text-ink-softdark mb-3">
            {inviterEmail} invited you to collaborate
          </Text>
          <View className="flex flex-row gap-2">
            <Pressable
              onPress={onAccept}
              className="flex-1 bg-accent dark:bg-accent-dark rounded-lg py-2 items-center"
            >
              <Text className="text-white text-sm font-medium">Accept</Text>
            </Pressable>
            <Pressable
              onPress={onDecline}
              className="flex-1 bg-surface dark:bg-surface-dark rounded-lg py-2 items-center"
            >
              <Text className="text-ink dark:text-ink-dark text-sm font-medium">Decline</Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={onDecline} className="p-1">
          <Feather name="x" size={16} color="#7d7979" />
        </Pressable>
      </View>
    </View>
  );
};
