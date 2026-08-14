import { View, Text, Pressable } from 'react-native';

interface GroceryListTabSwitcherProps {
  activeTab: 'to-get' | 'checked';
  uncheckedCount: number;
  checkedCount: number;
  onTabChange: (tab: 'to-get' | 'checked') => void;
}

export function GroceryListTabSwitcher({
  activeTab,
  uncheckedCount,
  checkedCount,
  onTabChange,
}: GroceryListTabSwitcherProps) {
  return (
    <View className="flex flex-row border-b border-rule dark:border-rule-dark">
      <Pressable
        onPress={() => onTabChange('to-get')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'to-get' ? 'border-accent dark:border-accent-dark' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'to-get'
              ? 'text-ink dark:text-ink-dark'
              : 'text-ink-soft dark:text-ink-softdark'
          }`}
        >
          To Get
        </Text>
        {uncheckedCount > 0 && (
          <View className="bg-sticky dark:bg-sticky-dark rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-accent-text dark:text-accent-textdark font-medium">{uncheckedCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => onTabChange('checked')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'checked' ? 'border-accent dark:border-accent-dark' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'checked'
              ? 'text-ink dark:text-ink-dark'
              : 'text-ink-soft dark:text-ink-softdark'
          }`}
        >
          Checked
        </Text>
        {checkedCount > 0 && (
          <View className="bg-surface dark:bg-surface-dark rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-ink-soft dark:text-ink-softdark font-medium">
              {checkedCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
