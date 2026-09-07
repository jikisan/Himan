import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { SectionHeading } from '../notebook';
import { notebook } from '../../theme/notebook';

interface GroceryListDetailHeaderProps {
  listName: string;
  memberCount: number;
  itemCount?: number;
  onShare: () => void;
}

export function GroceryListDetailHeader({
  listName,
  memberCount,
  itemCount,
  onShare,
}: GroceryListDetailHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const subParts: string[] = [];
  if (itemCount != null) subParts.push(`${itemCount} item${itemCount === 1 ? '' : 's'}`);
  if (memberCount > 1) subParts.push(`${memberCount} members`);

  return (
    <View className="px-5 pt-2 pb-4 border-b border-rule dark:border-rule-dark">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 active:opacity-60 -ml-1"
        >
          <Feather name="chevron-left" size={22} color={c.accentText} />
          <Text className="text-[15px] font-serif text-accent-text dark:text-accent-textdark">Lists</Text>
        </Pressable>
        <Pressable onPress={onShare} hitSlop={8} className="p-1 active:opacity-60">
          <Feather name="share" size={20} color={c.accentText} />
        </Pressable>
      </View>
      <SectionHeading size="xl" className="mt-2">{listName}</SectionHeading>
      {subParts.length > 0 ? (
        <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark mt-0.5">
          {subParts.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}
