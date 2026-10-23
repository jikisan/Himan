import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ALL_GOVERNMENT_GROUPS } from '@himan/shared/government';
import type { GovernmentGroup } from '@himan/shared/government';

export function GovernmentGroupBar({ groups, counts, total, active, onChange, onManage, disabled }: {
  groups: GovernmentGroup[]; counts: Record<string, number>; total: number; active: string;
  onChange: (id: string) => void; onManage: () => void; disabled?: boolean;
}) {
  const tabs = [{ id: ALL_GOVERNMENT_GROUPS, name: 'All', count: total }, ...groups.map((group) => ({ id: group.id, name: group.name, count: counts[group.id] ?? 0 }))];
  return <View className="gap-3">
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View className="flex-row gap-2">
        {tabs.map((tab) => <Pressable key={tab.id} accessibilityRole="button" accessibilityState={{ selected: active === tab.id }} onPress={() => onChange(tab.id)}
          className={`min-h-12 justify-center rounded-full border px-4 active:opacity-70 ${active === tab.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-700'}`}>
          <Animated.Text key={String(active === tab.id)} entering={FadeIn.duration(150)} className={`font-medium ${active === tab.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {tab.name} ({tab.count})
          </Animated.Text>
        </Pressable>)}
      </View>
    </ScrollView>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onManage}
      className={`min-h-12 items-center justify-center self-start rounded-xl border border-gray-300 dark:border-gray-600 px-4 active:opacity-60 ${disabled ? 'opacity-40' : ''}`}>
      <Text className="font-semibold text-gray-900 dark:text-white">Manage groups</Text>
    </Pressable>
  </View>;
}
