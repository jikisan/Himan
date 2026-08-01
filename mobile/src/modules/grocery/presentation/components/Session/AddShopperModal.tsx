import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionMemberType, SessionPresence } from '@himan/shared/grocery';
import { FriendPicker } from '../Invitation/FriendPicker';

interface AddShopperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddShopper: (email: string) => Promise<unknown>;
  isAdding: boolean;
  members: SessionMemberType[];
  participants: SessionPresence[];
  startedBy: string;
  currentUserId: string;
}

export const AddShopperModal = ({
  open,
  onOpenChange,
  onAddShopper,
  isAdding,
  members,
  participants,
  startedBy,
  currentUserId,
}: AddShopperModalProps) => {
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await onAddShopper(trimmed);
      setEmail('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const presenceMap = new Map(participants.map((p) => [p.userId, p]));
  const isOwner = currentUserId === startedBy;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center items-center px-6"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-h-[80%]">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Shoppers
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Manage who's shopping in this session
          </Text>

          {members.length > 0 && (
            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Members
              </Text>
              <ScrollView className="max-h-48">
                {members.map((member) => {
                  const presence = presenceMap.get(member.userId);
                  const isOnline = !!presence;
                  const displayName = presence?.displayName ?? null;
                  const isOwner = member.userId === startedBy;

                  return (
                    <View
                      key={member.id}
                      className="flex-row items-center py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <View className="relative mr-3">
                        <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center">
                          <Feather name="user" size={14} color={isOwner ? '#6366f1' : '#9ca3af'} />
                        </View>
                        <View
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
                            isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900 dark:text-white" numberOfLines={1}>
                          {displayName ?? 'Member'}
                        </Text>
                        <Text className="text-xs text-gray-400 dark:text-gray-500">
                          {isOnline ? 'Online' : 'Offline'} · {isOwner ? 'Owner' : 'Shopper'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {isOwner && (
            <FriendPicker
              excludeUserIds={members.map((m) => m.userId)}
              onPick={async (friendEmail) => {
                await onAddShopper(friendEmail);
                onOpenChange(false);
              }}
              disabled={isAdding}
            />
          )}

          {isOwner && (
            <View className="space-y-4 gap-4">
              <View>
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Add Shopper
                </Text>
                <TextInput
                  placeholder="Enter shopper's email..."
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleAdd}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                />
              </View>

              <Pressable
                onPress={handleAdd}
                disabled={isAdding || !email.trim()}
                className={`flex flex-row items-center justify-center gap-2 py-3 rounded-lg ${
                  isAdding || !email.trim() ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-500'
                }`}
              >
                <Feather name="user-plus" size={18} color="#ffffff" />
                <Text className="text-white font-medium">
                  {isAdding ? 'Adding...' : 'Add User'}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
