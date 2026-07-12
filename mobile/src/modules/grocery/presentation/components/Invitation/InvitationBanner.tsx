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
    <View className="mx-3 mt-2 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
      <View className="flex flex-row items-start gap-2">
        <Feather name="mail" size={18} color="#6366f1" />
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Invitation to {listName}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {inviterEmail} invited you to collaborate
          </Text>
          <View className="flex flex-row gap-2">
            <Pressable
              onPress={onAccept}
              className="flex-1 bg-indigo-500 rounded-lg py-2 items-center"
            >
              <Text className="text-white text-sm font-medium">Accept</Text>
            </Pressable>
            <Pressable
              onPress={onDecline}
              className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-2 items-center"
            >
              <Text className="text-gray-900 dark:text-white text-sm font-medium">Decline</Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={onDecline} className="p-1">
          <Feather name="x" size={16} color="#6b7280" />
        </Pressable>
      </View>
    </View>
  );
};
