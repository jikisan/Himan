import { View, Text, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { StoreType } from '@himan/shared/grocery';
import { PressableScale } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface ProductStorePickerProps {
  visible: boolean;
  unattachedStores: StoreType[];
  onShow: () => void;
  onAddStore: (storeId: string) => Promise<void>;
}

export function ProductStorePicker({
  visible,
  unattachedStores,
  onShow,
  onAddStore,
}: ProductStorePickerProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  if (!visible) {
    return (
      <PressableScale
        onPress={onShow}
        className="flex-row items-center gap-1.5 self-start mt-2.5 px-3.5 py-2 rounded-full"
        style={{ backgroundColor: c.sticky }}
      >
        <Feather name="plus-circle" size={14} color={c.accentText} />
        <Text className="text-[13px] font-serifsemi" style={{ color: c.accentText }}>
          Add store
        </Text>
      </PressableScale>
    );
  }

  if (unattachedStores.length === 0) {
    return (
      <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif mt-2.5">
        All stores already attached.
      </Text>
    );
  }

  const handlePress = async (storeId: string) => {
    try {
      await onAddStore(storeId);
    } catch (err) {
      Alert.alert('Could not add store', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2 mt-2.5">
      {unattachedStores.map((s) => (
        <PressableScale
          key={s.id}
          onPress={() => handlePress(s.id)}
          className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface dark:bg-surface-dark"
        >
          <Feather name="plus" size={13} color={c.accent} />
          <Text className="text-[13px] text-ink dark:text-ink-dark font-serif">{s.name}</Text>
        </PressableScale>
      ))}
    </View>
  );
}
