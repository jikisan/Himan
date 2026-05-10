import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type QuickLink = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
  route?: string;
};

const quickLinks: QuickLink[] = [
  // {
  //   id: 'notes',
  //   icon: 'file-text',
  //   label: 'Notes',
  //   description: 'Manage your notes',
  // },
  {
    id: 'passwords',
    icon: 'key',
    label: 'Passwords',
    description: 'Manage your passwords',
  },
  {
    id: 'cards',
    icon: 'credit-card',
    label: 'Cards',
    description: 'Manage your credit cards',
    route: '/(app)/cards',
  },
  {
    id: 'grocery',
    icon: 'shopping-cart',
    label: 'Grocery',
    description: 'Collaborative grocery lists',
    route: '/(app)/grocery',
  },
  // {
  //   id: 'invoice',
  //   icon: 'file',
  //   label: 'Invoice Generator',
  //   description: 'Create professional invoices',
  // },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderCard = ({ item }: { item: QuickLink }) => {
    const isActive = !!item.route;

    return (
      <Pressable
        onPress={() => item.route && router.push(item.route as never)}
        disabled={!isActive}
        className="flex-1 m-2"
      >
        <View
          className={`rounded-2xl border p-5 shadow-sm ${
            isDark
              ? isActive
                ? 'bg-gray-800 border-gray-700'
                : 'bg-gray-800 border-gray-700 opacity-50'
              : isActive
              ? 'bg-white border-gray-200'
              : 'bg-white border-gray-100 opacity-50'
          }`}
        >
          <Feather
            name={item.icon}
            size={28}
            color={isActive ? '#4f46e5' : '#9ca3af'}
          />
          <Text className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
            {item.label}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {item.description}
          </Text>
          {!isActive && (
            <Text className="mt-2 text-xs font-medium text-gray-400 dark:text-gray-500">
              Coming soon
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={quickLinks}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        contentContainerClassName="px-4 py-6"
        ListHeaderComponent={
          <View className="mb-6 px-2 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back!
              </Text>
              <Text className="mt-1 text-base text-gray-500 dark:text-gray-400">
                Quick access to your tools.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(app)/settings')}
              className="mt-1 p-1"
            >
              <Feather
                name="settings"
                size={22}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}
