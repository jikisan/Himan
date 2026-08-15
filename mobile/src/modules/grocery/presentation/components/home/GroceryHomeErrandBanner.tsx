import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import type { GrocerySessionType } from '@himan/shared/grocery';

interface GroceryHomeErrandBannerProps {
  session: GrocerySessionType;
  c: NotebookColors;
}

export function GroceryHomeErrandBanner({ session, c }: GroceryHomeErrandBannerProps) {
  const router = useRouter();
  const purchasedCount = session.items.filter((i) => i.isPurchased).length;

  return (
    <Pressable
      onPress={() => router.push('/grocery/session')}
      className="rounded-2xl p-4 mb-5 active:opacity-90"
      style={{ backgroundColor: c.sticky }}
    >
      <Text className="text-xs uppercase tracking-wider" style={{ color: c.ink }}>
        Errand in progress
      </Text>
      <Text className="font-hand text-3xl mt-1" style={{ color: c.ink }}>
        {session.name || session.storeName || 'Errand'}
      </Text>
      <View className="flex-row items-center gap-1 mt-1">
        <Text style={{ color: c.ink }}>
          {purchasedCount}/{session.items.length} crossed off
        </Text>
        <Feather name="arrow-right" size={16} color={c.ink} />
      </View>
    </Pressable>
  );
}
