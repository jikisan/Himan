import { useState } from 'react';
import { Pressable, ScrollView, Text, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { TIER_NAMES } from '@himan/shared/subscriptions';
import { useTheme, type ThemeMode } from '../../contexts/ThemeProvider';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { usePlan } from '@/modules/subscriptions/presentation/hooks/usePlan';

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

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${+(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const Section = ({ title, footer, children }: { title?: string; footer?: string; children: React.ReactNode }) => (
  <View className="mt-6">
    {title && (
      <Text className="px-2 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </Text>
    )}
    <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {children}
    </View>
    {footer && <Text className="px-2 mt-2 text-xs text-gray-500 dark:text-gray-400">{footer}</Text>}
  </View>
);

const Row = ({ label, children, last }: { label: string; children?: React.ReactNode; last?: boolean }) => (
  <View
    className={`min-h-[52px] px-4 py-3 flex-row items-center justify-between gap-4 ${
      last ? '' : 'border-b border-gray-100 dark:border-gray-700'
    }`}
  >
    <Text className="text-base text-gray-900 dark:text-white">{label}</Text>
    <View className="flex-1 flex-row items-center justify-end gap-2">{children}</View>
  </View>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <Text numberOfLines={1} className="flex-shrink text-sm text-gray-500 dark:text-gray-400">
    {children}
  </Text>
);

type UsageProps = { label: string; current: number; limit: number | null; format?: (n: number) => string; last?: boolean };

const UsageRow = ({ label, current, limit, format = (n) => n.toLocaleString(), last }: UsageProps) => {
  const percent = limit ? Math.min((current / limit) * 100, 100) : 0;
  const full = limit !== null && current >= limit;
  const near = limit !== null && percent >= 80;
  return (
    <View className={`px-4 py-3 ${last ? '' : 'border-b border-gray-100 dark:border-gray-700'}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-gray-900 dark:text-white">{label}</Text>
        <Text className={`text-sm ${full ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {limit === null ? `${format(current)} · No limit` : `${format(current)} of ${format(limit)}`}
        </Text>
      </View>
      {limit !== null && (
        <View className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <View
            className={`h-full ${full ? 'bg-red-500' : near ? 'bg-yellow-500' : 'bg-indigo-600'}`}
            style={{ width: `${percent}%` }}
          />
        </View>
      )}
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { tier, isAdmin, usageStats, loading } = usePlan();
  const [copied, setCopied] = useState(false);

  const copyUserId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You’ll need to sign in again on this device.', [
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

  const planFooter = isAdmin
    ? 'You’re an admin, so none of these limits apply to you.'
    : tier === 'enterprise'
      ? undefined
      : 'Need more room? Ask your administrator to upgrade your plan.';

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-6 py-4 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          className="p-1"
        >
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10">
        <Section title="Account">
          <Row label="Email">
            <Value>{user?.email ?? '—'}</Value>
          </Row>
          <Row label="User ID" last={!user?.created_at}>
            <Value>{user?.id}</Value>
            <Pressable
              onPress={copyUserId}
              accessibilityRole="button"
              accessibilityLabel="Copy user ID"
              hitSlop={10}
            >
              <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? '#4f46e5' : '#9ca3af'} />
            </Pressable>
          </Row>
          {user?.created_at && (
            <Row label="Member since" last>
              <Value>
                {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Value>
            </Row>
          )}
        </Section>

        <Section title="Plan & usage" footer={planFooter}>
          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Row label="Plan" last={!usageStats}>
                <Value>{TIER_NAMES[tier] + (isAdmin ? ' · Admin' : '')}</Value>
              </Row>
              {usageStats && (
                <>
                  <UsageRow label="Notes" current={usageStats.notes.current} limit={usageStats.notes.limit} />
                  <UsageRow label="Passwords" current={usageStats.passwords.current} limit={usageStats.passwords.limit} />
                  <UsageRow label="Cards" current={usageStats.cards.current} limit={usageStats.cards.limit} />
                  <UsageRow label="Files" current={usageStats.files.current} limit={usageStats.files.limit} />
                  <UsageRow
                    label="Storage"
                    current={usageStats.storage.current}
                    limit={usageStats.storage.limit}
                    format={formatBytes}
                    last
                  />
                </>
              )}
            </>
          )}
        </Section>

        <Section title="Appearance" footer="System follows your device’s light or dark setting.">
          <View className="p-3 flex-row gap-2" accessibilityRole="radiogroup">
            {themeOptions.map((option) => {
              const isSelected = theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setTheme(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  className={`flex-1 items-center py-3 rounded-xl border ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-600'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <Feather name={option.icon} size={20} color={isSelected ? '#4f46e5' : '#9ca3af'} />
                  <Text
                    className={`mt-1.5 text-xs font-medium ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            className="px-4 py-3.5 flex-row items-center gap-3"
          >
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text className="text-base font-medium text-red-500">Sign Out</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
