import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Password } from '@himan/shared/passwords';
import type { PasswordType, CategoryType } from '@himan/shared/passwords';

interface PasswordDetailSheetProps {
  password: PasswordType | null;
  visible: boolean;
  categories: CategoryType[];
  onClose: () => void;
  onEdit: (password: PasswordType) => void;
  onDelete: (password: PasswordType) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopied?: (label: string) => void;
}

export const PasswordDetailSheet = ({
  password,
  visible,
  categories,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopied,
}: PasswordDetailSheetProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { bottom } = useSafeAreaInsets();

  if (!password) return null;

  const entity = new Password(password);
  const category = categories.find((c) => c.id === password.categoryId);
  const displayUrl = entity.getDisplayUrl();
  const canOpenUrl = entity.isValidUrl();

  const handleCopyUsername = async () => {
    if (!password.username) return;
    await Clipboard.setStringAsync(password.username);
    onCopied?.('Username copied');
  };

  const handleCopyPassword = async () => {
    await Clipboard.setStringAsync(password.password);
    onCopied?.('Password copied');
  };

  const handleCopyUrl = async () => {
    if (!password.url) return;
    await Clipboard.setStringAsync(password.url);
    onCopied?.('URL copied');
  };

  const handleOpenUrl = () => {
    if (canOpenUrl && password.url) {
      Linking.openURL(password.url);
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable className="absolute inset-0" onPress={handleClose} />

        <View className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[88%]">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View className="w-10 h-10 rounded-xl bg-indigo-500/10 items-center justify-center shrink-0">
                <Feather name="key" size={20} color="#6366f1" />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  className="text-lg font-bold text-gray-900 dark:text-white"
                  numberOfLines={1}
                >
                  {password.title}
                </Text>
                {displayUrl ? (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">{displayUrl}</Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row items-center gap-2 ml-2 shrink-0">
              <Pressable
                onPress={() => onToggleFavorite(password.id, !password.isFavorite)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Feather
                  name="star"
                  size={16}
                  color={password.isFavorite ? '#f59e0b' : '#9ca3af'}
                />
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Feather name="x" size={16} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, gap: 16 }}
          >
            {/* Username */}
            {password.username && (
              <DetailRow
                label="Username"
                value={password.username}
                onCopy={handleCopyUsername}
              />
            )}

            {/* Password */}
            <DetailRow
              label="Password"
              value={showPassword ? password.password : '••••••••••••'}
              isSecret
              isShown={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              onCopy={handleCopyPassword}
            />

            {/* URL */}
            {password.url && (
              <View className="gap-1">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  URL
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-sm text-gray-900 dark:text-white flex-1"
                    numberOfLines={1}
                  >
                    {password.url}
                  </Text>
                  <View className="flex-row items-center gap-2 ml-2">
                    <Pressable onPress={handleCopyUrl} hitSlop={8}>
                      <Feather name="copy" size={16} color="#9ca3af" />
                    </Pressable>
                    {canOpenUrl && (
                      <Pressable onPress={handleOpenUrl} hitSlop={8}>
                        <Feather name="external-link" size={16} color="#9ca3af" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Category */}
            {category && <DetailRow label="Category" value={category.name} />}

            {/* Notes */}
            {password.notes && (
              <View className="gap-1">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Notes
                </Text>
                <Text className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {password.notes}
                </Text>
              </View>
            )}

            {/* Timestamps */}
            <View className="pt-2 border-t border-gray-100 dark:border-gray-800 gap-1">
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                Added {password.createdAt.toLocaleDateString()}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                Updated {entity.getRelativeTime()}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View className="px-6 pt-3 flex-row gap-3" style={{ paddingBottom: Math.max(bottom, 24) }}>
            <Pressable
              onPress={() => onDelete(password)}
              className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 active:opacity-80"
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
              <Text className="text-red-500 font-semibold text-sm">Delete</Text>
            </Pressable>
            <Pressable
              onPress={() => onEdit(password)}
              className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-500 active:bg-indigo-600"
            >
              <Feather name="edit-2" size={16} color="#ffffff" />
              <Text className="text-white font-semibold text-sm">Edit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isSecret?: boolean;
  isShown?: boolean;
  onToggleShow?: () => void;
  onCopy?: () => void;
}

const DetailRow = ({
  label,
  value,
  isSecret,
  isShown,
  onToggleShow,
  onCopy,
}: DetailRowProps) => (
  <View className="gap-1">
    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {label}
    </Text>
    <View className="flex-row items-center justify-between">
      <Text
        className="text-sm text-gray-900 dark:text-white flex-1"
        selectable={isShown}
      >
        {value}
      </Text>
      <View className="flex-row items-center gap-2 ml-2">
        {isSecret && (
          <Pressable onPress={onToggleShow} hitSlop={8}>
            <Feather name={isShown ? 'eye-off' : 'eye'} size={16} color="#9ca3af" />
          </Pressable>
        )}
        {onCopy && (
          <Pressable onPress={onCopy} hitSlop={8}>
            <Feather name="copy" size={16} color="#9ca3af" />
          </Pressable>
        )}
      </View>
    </View>
  </View>
);
