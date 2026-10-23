import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFriends } from '@/modules/grocery/presentation/hooks';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';

export default function FriendsScreen() {
  const {
    friends, incomingRequests, outgoingRequests,
    sendRequest, accept, decline, cancelRequest, remove,
  } = useFriends();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      await sendRequest(trimmed);
      setEmail('');
    } catch {
      // handled by hook
    } finally {
      setSending(false);
    }
  };

  const confirmRemove = (id: string, label: string) =>
    Alert.alert('Remove Friend', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Pressable onPress={() => router.back()} className="pr-3 py-1">
          <Feather name="chevron-left" size={24} color="#6b7280" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">Friends</Text>
      </View>

      <KeyboardSafe>
      <ScrollView automaticallyAdjustKeyboardInsets className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Add by email */}
        <View className="flex-row gap-2 my-4">
          <TextInput
            placeholder="Add friend by email..."
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleSend}
            keyboardType="email-address"
            autoCapitalize="none"
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !email.trim()}
            className={`flex-row items-center gap-1 px-4 rounded-lg ${
              sending || !email.trim() ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-600'
            }`}
          >
            <Feather name="user-plus" size={16} color="#ffffff" />
            <Text className="text-white font-medium">Add</Text>
          </Pressable>
        </View>

        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requests</Text>
            {incomingRequests.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{r.email}</Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={() => accept(r.id)} className="px-3 py-1.5 bg-indigo-600 rounded-lg">
                    <Text className="text-white text-xs font-medium">Accept</Text>
                  </Pressable>
                  <Pressable onPress={() => decline(r.id)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg">
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium">Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Outgoing requests */}
        {outgoingRequests.length > 0 && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sent</Text>
            {outgoingRequests.map((r) => (
              <View key={r.id} className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{r.email}</Text>
                <Pressable onPress={() => cancelRequest(r.id)} className="px-3 py-1.5">
                  <Text className="text-xs text-gray-500">Cancel</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Friends */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            My Friends ({friends.length})
          </Text>
          {friends.length === 0 ? (
            <Text className="text-sm text-gray-400 py-4">No friends yet. Add one by email above.</Text>
          ) : (
            friends.map((f) => (
              <View key={f.id} className="flex-row items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                    <Feather name="user" size={14} color="#6366f1" />
                  </View>
                  <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{f.email}</Text>
                </View>
                <Pressable onPress={() => confirmRemove(f.id, f.email)} className="px-3 py-1">
                  <Text className="text-xs text-red-500">Remove</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
