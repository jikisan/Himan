import { View, TextInput, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <View className="flex-row items-center gap-2 mt-3 rounded-2xl px-3 py-2 border border-rule dark:border-rule-dark">
      <Feather name="search" size={18} color={c.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search name, brand, barcode…"
        placeholderTextColor={c.inkSoft}
        className="flex-1 text-ink dark:text-ink-dark font-serif"
        autoCapitalize="none"
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Feather name="x" size={18} color={c.inkSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}
