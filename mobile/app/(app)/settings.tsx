import { Pressable, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme, type ThemeMode } from '../../contexts/ThemeProvider';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';

type ThemeOption = {
  value: ThemeMode;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-6 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Settings
        </Text>
      </View>

      <View className="px-6 mt-2">
        <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <View className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              Appearance
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Customize how Himan looks on your device
            </Text>
          </View>

          <View className="px-5 py-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme
            </Text>
            <View className="flex-row gap-3">
              {themeOptions.map((option) => {
                const isSelected = theme === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setTheme(option.value)}
                    className={`flex-1 items-center py-3 rounded-xl border ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-600'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                    }`}
                  >
                    <Feather
                      name={option.icon}
                      size={20}
                      color={isSelected ? '#4f46e5' : '#9ca3af'}
                    />
                    <Text
                      className={`mt-1.5 text-xs font-medium ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 mt-4">
        <Pressable
          onPress={handleSignOut}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex-row items-center gap-3"
        >
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text className="text-base font-medium text-red-500">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
