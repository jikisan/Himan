import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface SessionHeaderProps {
  storeName: string;
  progress: number;
  onOpenShoppers: () => void;
  onOpenEndShopping: () => void;
}

export const SessionHeader = ({
  storeName,
    progress,
  onOpenShoppers,
  onOpenEndShopping,
}: SessionHeaderProps) => {
  const router = useRouter();

  return (
    <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <View className="flex flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>


        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Shopping at {storeName}</Text>
        </View>

        <View className="flex flex-row items-center gap-1.5">
          <Pressable onPress={onOpenShoppers} className="p-2">
            <Feather name="user-plus" size={20} color="#6b7280" />
          </Pressable>

          <Pressable onPress={onOpenEndShopping} className="p-2">
            <View className="w-[18px] h-[18px] bg-red-500 rounded-sm" />
          </Pressable>
        </View>


      </View>



    </View>
  );
};
