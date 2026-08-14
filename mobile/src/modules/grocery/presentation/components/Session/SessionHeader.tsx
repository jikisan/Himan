import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface SessionHeaderProps {
  storeName: string;
  progress: number;
  isOwner: boolean;
  onOpenShoppers: () => void;
  onOpenEndShopping: () => void;
}

export const SessionHeader = ({
  storeName,
    progress,
  isOwner,
  onOpenShoppers,
  onOpenEndShopping,
}: SessionHeaderProps) => {
  const router = useRouter();

  return (
    <View className="px-4 py-4 border-b border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark">
      <View className="flex flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={20} color="#7d7979" />
        </Pressable>


        <View className="flex-1">
          <Text className="text-lg font-bold text-ink dark:text-ink-dark">Shopping at {storeName}</Text>
        </View>

        <View className="flex flex-row items-center gap-1.5">
          <Pressable onPress={onOpenShoppers} className="p-2">
            <Feather name="user-plus" size={20} color="#7d7979" />
          </Pressable>

          {isOwner && (
            <Pressable onPress={onOpenEndShopping} className="p-2">
              <View className="w-[18px] h-[18px] bg-margin rounded-sm" />
            </Pressable>
          )}
        </View>


      </View>



    </View>
  );
};
