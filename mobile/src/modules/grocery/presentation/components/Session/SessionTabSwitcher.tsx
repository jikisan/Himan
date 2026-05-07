import { View, Text, Pressable } from 'react-native';
import { TabType } from './types';

interface SessionTabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  toGetCount: number;
  purchasedCount: number;
}

export const SessionTabSwitcher = ({
  activeTab,
  onTabChange,
  toGetCount,
  purchasedCount,
}: SessionTabSwitcherProps) => {
  return (
    <View className="flex flex-row border-b border-gray-200 dark:border-gray-700 mt-2">
      <Pressable
        onPress={() => onTabChange('to-get')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'to-get' ? 'border-indigo-500' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'to-get' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          To Get
        </Text>
        {toGetCount > 0 && (
          <View className="bg-indigo-500/10 rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-indigo-500 font-medium">{toGetCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => onTabChange('purchased')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'purchased' ? 'border-indigo-500' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'purchased' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Purchased
        </Text>
        {purchasedCount > 0 && (
          <View className="bg-gray-500/10 rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-gray-500 dark:text-gray-400 font-medium">{purchasedCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};
