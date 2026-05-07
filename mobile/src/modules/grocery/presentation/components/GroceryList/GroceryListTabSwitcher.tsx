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
    <View className="flex flex-row border-b border-gray-200 dark:border-gray-700">
      <Pressable
        onPress={() => onTabChange('to-get')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'to-get' ? 'border-indigo-500' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'to-get'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          To Get
        </Text>
        {uncheckedCount > 0 && (
          <View className="bg-indigo-500/10 rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-indigo-500 font-medium">{uncheckedCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => onTabChange('checked')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'checked' ? 'border-indigo-500' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'checked'
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Checked
        </Text>
        {checkedCount > 0 && (
          <View className="bg-gray-500/10 rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {checkedCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
