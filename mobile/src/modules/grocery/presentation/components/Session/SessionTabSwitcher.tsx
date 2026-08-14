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
    <View className="flex flex-row border-b border-rule dark:border-rule-dark mt-2">
      <Pressable
        onPress={() => onTabChange('to-get')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'to-get' ? 'border-accent dark:border-accent-dark' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'to-get' ? 'text-ink dark:text-ink-dark' : 'text-ink-soft dark:text-ink-softdark'
          }`}
        >
          To Get
        </Text>
        {toGetCount > 0 && (
          <View className="bg-accent dark:bg-accent-dark/10 rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-accent-text dark:text-accent-textdark font-medium">{toGetCount}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => onTabChange('purchased')}
        className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
          activeTab === 'purchased' ? 'border-accent dark:border-accent-dark' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === 'purchased' ? 'text-ink dark:text-ink-dark' : 'text-ink-soft dark:text-ink-softdark'
          }`}
        >
          Purchased
        </Text>
        {purchasedCount > 0 && (
          <View className="bg-surface dark:bg-surface-dark rounded-full px-1.5 py-0.5">
            <Text className="text-xs text-ink-soft dark:text-ink-softdark font-medium">{purchasedCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};
