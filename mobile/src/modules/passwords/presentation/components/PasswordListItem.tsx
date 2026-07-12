import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Password } from '@himan/shared/passwords';
import type { PasswordType } from '@himan/shared/passwords';

interface PasswordListItemProps {
  password: PasswordType;
  onPress: (password: PasswordType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopied?: (label: string) => void;
}

export const PasswordListItem = ({
  password,
  onPress,
  onToggleFavorite,
  onCopied,
}: PasswordListItemProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const entity = new Password(password);
  const displayUrl = entity.getDisplayUrl();

  const handleCopyUsername = async () => {
    if (!password.username) return;
    await Clipboard.setStringAsync(password.username);
    onCopied?.('Username copied');
  };

  const handleCopyPassword = async () => {
    await Clipboard.setStringAsync(password.password);
    onCopied?.('Password copied');
  };

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <Pressable
        onPress={() => onPress(password)}
        className="flex-row items-center px-4 pt-4 pb-3 gap-3 active:opacity-75"
      >
        <View className="w-11 h-11 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
          <Feather name="key" size={20} color="#6366f1" />
        </View>

        <View className="flex-1 min-w-0 gap-0.5">
          <Text
            className="text-sm font-semibold text-gray-900 dark:text-white"
            numberOfLines={1}
          >
            {password.title}
          </Text>
          {displayUrl ? (
            <Text className="text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
              {displayUrl}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => onToggleFavorite(password.id, !password.isFavorite)}
          className="w-11 h-11 items-center justify-center shrink-0"
        >
          <Feather
            name="star"
            size={20}
            color={password.isFavorite ? '#f59e0b' : '#d1d5db'}
          />
        </Pressable>
      </Pressable>

      {/* Username row */}
      {password.username && (
        <View className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 gap-1">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Username
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>
              {password.username}
            </Text>
            <Pressable onPress={handleCopyUsername} hitSlop={8} className="ml-2">
              <Feather name="copy" size={16} color="#9ca3af" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Password row */}
      <View className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 gap-1">
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Password
        </Text>
        <View className="flex-row items-center justify-between">
          <Text
            className="text-sm text-gray-900 dark:text-white flex-1"
            selectable={showPassword}
          >
            {showPassword ? password.password : '••••••••••••'}
          </Text>
          <View className="flex-row items-center gap-2 ml-2">
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
            </Pressable>
            <Pressable onPress={handleCopyPassword} hitSlop={8}>
              <Feather name="copy" size={16} color="#9ca3af" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};
