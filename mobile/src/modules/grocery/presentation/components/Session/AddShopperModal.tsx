import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionMemberType, SessionPresence } from '@himan/shared/grocery';
import { FriendPicker } from '../Invitation/FriendPicker';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';

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
      <KeyboardSafe>
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center px-6"
          onPress={() => onOpenChange(false)}
        >
          <Pressable className="bg-paper dark:bg-paper-dark rounded-2xl p-6 w-full max-h-[80%]">
            <Text className="text-lg font-semibold text-ink dark:text-ink-dark mb-1">
              Shoppers
            </Text>
            <Text className="text-sm text-ink-soft dark:text-ink-softdark mb-4">
              Manage who's shopping in this session
            </Text>

            {members.length > 0 && (
              <View className="mb-5">
                <Text className="text-xs font-semibold text-ink-soft dark:text-ink-softdark uppercase tracking-wide mb-2">
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
                        className="flex-row items-center py-2.5 border-b border-rule dark:border-rule-dark last:border-b-0"
                      >
                        <View className="relative mr-3">
                          <View className="w-8 h-8 rounded-full bg-sticky dark:bg-sticky-dark items-center justify-center">
                            <Feather name="user" size={14} color={isOwner ? '#0088b0' : '#9b9797'} />
                          </View>
                          <View
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-paper dark:border-paper-dark ${
                              isOnline ? 'bg-accent dark:bg-accent-dark' : 'bg-surface dark:bg-surface-dark'
                            }`}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-sm font-medium text-ink dark:text-ink-dark" numberOfLines={1}>
                            {displayName ?? 'Member'}
                          </Text>
                          <Text className="text-xs text-ink-faint dark:text-ink-faintdark">
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
                  <Text className="text-xs font-semibold text-ink-soft dark:text-ink-softdark uppercase tracking-wide mb-2">
                    Add Shopper
                  </Text>
                  <TextInput
                    placeholder="Enter shopper's email..."
                    placeholderTextColor="#9b9797"
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={handleAdd}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-rule dark:border-rule-dark rounded-lg p-3 text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
                  />
                </View>

                <Pressable
                  onPress={handleAdd}
                  disabled={isAdding || !email.trim()}
                  className={`flex flex-row items-center justify-center gap-2 py-3 rounded-lg ${
                    isAdding || !email.trim() ? 'bg-surface dark:bg-surface-dark' : 'bg-accent dark:bg-accent-dark'
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
      </KeyboardSafe>
    </Modal>
  );
};
