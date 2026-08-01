import { View, Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFriends } from '@/modules/grocery/presentation/hooks';

interface GroceryHeaderProps {
  onBack: () => void;
  onStartShopping: () => void;
  showShoppingButton: boolean;
  shoppingButtonDisabled: boolean;
}

export function GroceryHeader({
  onBack,
  onStartShopping,
  showShoppingButton,
  shoppingButtonDisabled,
}: GroceryHeaderProps) {
  const { incomingRequests } = useFriends();
  return (
    <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <View className="flex flex-row items-center gap-3">
        <Pressable onPress={onBack} className="p-2 -ml-1">
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>
        <View className="flex-1 flex-row items-center gap-2">
          <Feather name="shopping-bag" size={18} color="#6366f1" />
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Grocery</Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/friends')} className="p-2">
          <Feather name="users" size={20} color="#6b7280" />
          {incomingRequests.length > 0 && (
            <View className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-red-500 items-center justify-center">
              <Text className="text-[10px] font-bold text-white">{incomingRequests.length}</Text>
            </View>
          )}
        </Pressable>
        {showShoppingButton && (
          <Pressable
            onPress={onStartShopping}
            disabled={shoppingButtonDisabled}
            className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl ${
              shoppingButtonDisabled
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-indigo-500 active:bg-indigo-600'
            }`}
          >
            <Feather name="shopping-cart" size={15} color={shoppingButtonDisabled ? '#9ca3af' : '#ffffff'} />
            <Text className={`text-sm font-semibold ${shoppingButtonDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}>
              Shop
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
