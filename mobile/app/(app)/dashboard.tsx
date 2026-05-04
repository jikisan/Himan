import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

type QuickLink = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
  route?: string;
};

const quickLinks: QuickLink[] = [
  {
    id: 'notes',
    icon: 'file-text',
    label: 'Notes',
    description: 'Manage your notes',
  },
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
  },
  {
    id: 'grocery',
    icon: 'shopping-cart',
    label: 'Grocery',
    description: 'Collaborative grocery lists',
    route: '/(app)/grocery',
  },
  {
    id: 'invoice',
    icon: 'file',
    label: 'Invoice Generator',
    description: 'Create professional invoices',
  },
];

export default function DashboardScreen() {
  const router = useRouter();

  const renderCard = ({ item }: { item: QuickLink }) => {
    const isActive = !!item.route;

    return (
      <Pressable
        onPress={() => item.route && router.push(item.route as never)}
        disabled={!isActive}
        className="flex-1 m-2"
      >
        <View
          className={`bg-white rounded-2xl border p-5 shadow-sm ${
            isActive ? 'border-gray-200' : 'border-gray-100 opacity-50'
          }`}
        >
          <Feather
            name={item.icon}
            size={28}
            color={isActive ? '#4f46e5' : '#9ca3af'}
          />
          <Text className="mt-3 text-base font-semibold text-gray-900">
            {item.label}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">{item.description}</Text>
          {!isActive && (
            <Text className="mt-2 text-xs font-medium text-gray-400">
              Coming soon
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={quickLinks}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={2}
        contentContainerClassName="px-4 py-6"
        ListHeaderComponent={
          <View className="mb-6 px-2">
            <Text className="text-3xl font-bold text-gray-900">
              Welcome back!
            </Text>
            <Text className="mt-1 text-base text-gray-500">
              Quick access to your tools.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
