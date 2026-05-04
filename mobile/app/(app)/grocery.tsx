import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function GroceryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 py-4">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2"
        >
          <Feather name="arrow-left" size={20} color="#4b5563" />
          <Text className="text-base text-gray-600">Back</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Feather name="shopping-cart" size={48} color="#d1d5db" />
        <Text className="mt-4 text-2xl font-bold text-gray-900">Grocery</Text>
        <Text className="mt-2 text-base text-gray-500">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
