import { View, Text, TextInput, Pressable } from 'react-native';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface StoreFieldProps {
  c: NotebookColors;
  store: string;
  onChangeStore: (value: string) => void;
  recentStores: string[];
}

export function StoreField({ c, store, onChangeStore, recentStores }: StoreFieldProps) {
  return (
    <>
      <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-2 mb-1 font-serif">
        Store
      </Text>
      <TextInput
        value={store}
        onChangeText={onChangeStore}
        placeholder="Where are you shopping?"
        placeholderTextColor={c.inkSoft}
        className="rounded-xl px-3 py-2.5 border border-rule dark:border-rule-dark text-ink dark:text-ink-dark font-serif"
      />
      {recentStores.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-2">
          {recentStores.map((s) => (
            <Pressable
              key={s}
              onPress={() => onChangeStore(s)}
              className="rounded-full px-3 py-1 border border-rule dark:border-rule-dark"
            >
              <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}
