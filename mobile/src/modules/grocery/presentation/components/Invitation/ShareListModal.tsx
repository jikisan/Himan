import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryInvitationType } from '@himan/shared/grocery';

interface ShareListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  members: Array<{ id: string; userId: string; role: string; joinedAt: Date }>;
  invitations: GroceryInvitationType[];
  currentUserId: string;
  onInvite: (email: string) => Promise<unknown>;
  onCancelInvitation: (invitationId: string) => Promise<unknown>;
  onRemoveMember: (userId: string) => Promise<unknown>;
}

export const ShareListModal = ({
  open,
  onOpenChange,
  listName,
  members,
  invitations,
  currentUserId,
  onInvite,
  onCancelInvitation,
  onRemoveMember,
}: ShareListModalProps) => {
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      await onInvite(trimmed);
      setEmail('');
    } finally {
      setIsInviting(false);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');
  const isOwner = members.some(
    (m) => m.userId === currentUserId && m.role === 'owner'
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-white dark:bg-gray-900 rounded-t-2xl p-6 max-h-[80%]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Share "{listName}"
            </Text>

            {isOwner && (
              <View className="flex flex-row gap-2 mb-4">
                <TextInput
                  placeholder="Enter email address..."
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleInvite}
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                />
                <Pressable
                  onPress={handleInvite}
                  disabled={isInviting || !email.trim()}
                  className={`flex flex-row items-center gap-1 px-4 rounded-lg ${
                    isInviting || !email.trim() ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-500'
                  }`}
                >
                  <Feather name="user-plus" size={16} color="#ffffff" />
                  <Text className="text-white font-medium">Invite</Text>
                </Pressable>
              </View>
            )}

            <View className="space-y-4">
              {/* Members */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Members</Text>
                <View className="space-y-2">
                  {members.map((member) => (
                    <View
                      key={member.id}
                      className="flex flex-row items-center justify-between py-1.5"
                    >
                      <View className="flex flex-row items-center gap-2">
                        <View className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <Text className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            {member.userId === currentUserId ? 'You' : '?'}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-sm text-gray-900 dark:text-white">
                            {member.userId === currentUserId ? 'You' : member.userId.slice(0, 8)}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {member.role}
                          </Text>
                        </View>
                      </View>
                      {isOwner && member.userId !== currentUserId && (
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              'Remove Member',
                              'Are you sure you want to remove this member?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: () => onRemoveMember(member.userId),
                                },
                              ]
                            );
                          }}
                          className="px-3 py-1"
                        >
                          <Text className="text-xs text-red-500">Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Pending invitations */}
              {pendingInvitations.length > 0 && (
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pending invitations
                  </Text>
                  <View className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <View
                        key={invitation.id}
                        className="flex flex-row items-center justify-between py-1.5"
                      >
                        <View className="flex flex-row items-center gap-2">
                          <Feather name="mail" size={16} color="#6b7280" />
                          <Text className="text-sm text-gray-900 dark:text-white">
                            {invitation.invitedEmail}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400">Pending</Text>
                        </View>
                        {isOwner && (
                          <Pressable
                            onPress={() => onCancelInvitation(invitation.id)}
                            className="p-1"
                          >
                            <Feather name="x" size={14} color="#6b7280" />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
