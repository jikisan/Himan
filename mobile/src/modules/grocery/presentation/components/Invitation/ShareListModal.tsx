import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryInvitationType } from '@himan/shared/grocery';
import { FriendPicker } from './FriendPicker';

interface ShareListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  members: Array<{
    id: string;
    userId: string;
    email: string;
    displayName: string;
    role: string;
    joinedAt: Date;
  }>;
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
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center items-center px-6"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-paper dark:bg-paper-dark rounded-2xl p-6 w-full max-h-[80%]">
          <View className="flex-row items-center justify-between mb-4 border-b-2 border-ink dark:border-ink-dark pb-2">
            <Text className="text-2xl font-serifsemi text-ink dark:text-ink-dark flex-1 pr-3" numberOfLines={1}>
              Share "{listName}"
            </Text>
            <Pressable
              onPress={() => onOpenChange(false)}
              hitSlop={10}
              className="w-8 h-8 rounded-full items-center justify-center bg-surface dark:bg-surface-dark active:opacity-60"
            >
              <Feather name="x" size={18} color="#7d7979" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">

            {isOwner && (
              <FriendPicker
                excludeUserIds={members.map((m) => m.userId)}
                onPick={(friendEmail) => onInvite(friendEmail)}
                disabled={isInviting}
              />
            )}

            {isOwner && (
              <View className="flex flex-row gap-2 mb-4">
                <TextInput
                  placeholder="Enter email address..."
                  placeholderTextColor="#9b9797"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleInvite}
                  className="flex-1 border border-rule dark:border-rule-dark rounded-sm p-3 font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
                />
                <Pressable
                  onPress={handleInvite}
                  disabled={isInviting || !email.trim()}
                  className={`flex flex-row items-center gap-1 px-4 rounded-lg ${
                    isInviting || !email.trim() ? 'bg-surface dark:bg-surface-dark' : 'bg-accent dark:bg-accent-dark'
                  }`}
                >
                  <Feather name="user-plus" size={16} color="#ffffff" />
                  <Text className="text-white font-serifsemi">Invite</Text>
                </Pressable>
              </View>
            )}

            <View className="space-y-4">
              {/* Members */}
              <View>
                <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark mb-2">Members</Text>
                <View className="space-y-2">
                  {members.map((member) => (
                    <View
                      key={member.id}
                      className="flex flex-row items-center justify-between py-1.5"
                    >
                      <View className="flex flex-row items-center gap-2">
                        <View className="h-7 w-7 rounded-full bg-sticky dark:bg-sticky-dark flex items-center justify-center">
                          <Text className="text-xs font-serifsemi text-accent-text dark:text-accent-textdark">
                            {member.userId === currentUserId ? 'You' : member.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-[15px] font-serif text-ink dark:text-ink-dark">
                            {member.userId === currentUserId ? 'You' : member.displayName}
                          </Text>
                          <Text className="text-[13px] font-serif text-ink-soft dark:text-ink-softdark capitalize">
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
                          <Text className="text-[13px] font-serif text-margin">Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Pending invitations */}
              {pendingInvitations.length > 0 && (
                <View>
                  <Text className="text-[14px] font-serifsemi text-ink dark:text-ink-dark mb-2">
                    Pending invitations
                  </Text>
                  <View className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <View
                        key={invitation.id}
                        className="flex flex-row items-center justify-between py-1.5"
                      >
                        <View className="flex flex-row items-center gap-2">
                          <Feather name="mail" size={16} color="#7d7979" />
                          <Text className="text-[15px] font-serif text-ink dark:text-ink-dark">
                            {invitation.invitedEmail}
                          </Text>
                          <Text className="text-[13px] font-serif text-ink-soft dark:text-ink-softdark">Pending</Text>
                        </View>
                        {isOwner && (
                          <Pressable
                            onPress={() => onCancelInvitation(invitation.id)}
                            className="p-1"
                          >
                            <Feather name="x" size={14} color="#7d7979" />
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
