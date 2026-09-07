import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { notebook } from '../../theme/notebook';
import { useSync } from '../../contexts/SyncProvider';

/**
 * Header sync indicator. Shows the outbox state and lets the user tap to
 * force a drain when changes are pending or an error occurred.
 */
export function SyncBadge() {
  const { status, retry } = useSync();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  if (status.kind === 'synced') {
    return (
      <View className="flex-row items-center gap-1.5">
        <Feather name="check-circle" size={14} color={c.accent} />
        <Text className="text-xs text-ink-soft dark:text-ink-softdark">Synced</Text>
      </View>
    );
  }

  if (status.kind === 'syncing') {
    return (
      <View className="flex-row items-center gap-1.5">
        <ActivityIndicator size="small" color={c.accent} />
        <Text className="text-xs text-ink-soft dark:text-ink-softdark">Syncing…</Text>
      </View>
    );
  }

  const isError = status.kind === 'error';
  const label = isError
    ? status.message
    : `${status.kind === 'offline-pending' ? status.count : 0} pending`;

  return (
    <Pressable onPress={retry} className="flex-row items-center gap-1.5 active:opacity-60">
      <Feather
        name={isError ? 'alert-triangle' : 'cloud-off'}
        size={14}
        color={isError ? c.margin : c.inkSoft}
      />
      <Text className="text-xs" style={{ color: isError ? c.margin : c.inkSoft }}>
        {label} · Retry
      </Text>
    </Pressable>
  );
}
