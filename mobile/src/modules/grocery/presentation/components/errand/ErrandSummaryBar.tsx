import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface ErrandSummaryBarProps {
  estimatedTotal: number;
  actualTotal: number;
  onDiscard: () => void;
  onFinish: () => void;
}

export function ErrandSummaryBar({
  estimatedTotal,
  actualTotal,
  onDiscard,
  onFinish,
}: ErrandSummaryBarProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { format: money } = useCurrency();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-0 right-0 bottom-0 px-5 pt-3 border-t border-rule dark:border-rule-dark bg-paper dark:bg-paper-dark"
      style={{ paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <View className="flex-row justify-between">
        <Text className="text-ink-soft dark:text-ink-softdark font-serif">Estimated</Text>
        <Text className="text-ink-soft dark:text-ink-softdark font-serif" style={{ fontVariant: ['tabular-nums'] }}>
          {money(estimatedTotal)}
        </Text>
      </View>
      <View className="flex-row justify-between mt-0.5">
        <Text className="text-ink dark:text-ink-dark font-medium font-serif">Actual so far</Text>
        <Text className="text-ink dark:text-ink-dark font-semibold text-base font-serif" style={{ fontVariant: ['tabular-nums'] }}>
          {money(actualTotal)}
        </Text>
      </View>
      <View className="flex-row gap-3 mt-3">
        <Pressable onPress={onDiscard} className="flex-1 rounded-full py-3 items-center border" style={{ borderColor: c.margin }}>
          <Text style={{ color: c.margin }} className="font-medium">Discard</Text>
        </Pressable>
        <Pressable onPress={onFinish} className="flex-1 rounded-full py-3 items-center" style={{ backgroundColor: c.accent }}>
          <Text className="font-semibold" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
            Finish errand
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
