import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { governmentGroupNameSchema, isGovernmentGroupNameTaken } from '@himan/shared/government';
import type { GovernmentGroup } from '@himan/shared/government';

const inputClass = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white';
const buttonClass = 'min-h-12 items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 active:opacity-60';

export function GovernmentGroupManager({ visible, groups, counts, busy, onClose, onAdd, onRename, onDelete }: {
  visible: boolean; groups: GovernmentGroup[]; counts: Record<string, number>; busy: boolean; onClose: () => void;
  onAdd: (name: string) => Promise<void>; onRename: (id: string, name: string) => Promise<void>; onDelete: (group: GovernmentGroup) => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const submit = async (value: string, exceptId: string | undefined, action: (name: string) => Promise<void>, done: () => void) => {
    const parsed = governmentGroupNameSchema.safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (isGovernmentGroupNameTaken(groups, parsed.data, exceptId)) { setError('You already have a group with that name'); return; }
    setError('');
    try { await action(parsed.data); done(); }
    catch { setError('Could not save the group. Retry when connected.'); }
  };
  const close = () => { setEditing(null); setError(''); onClose(); };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) close(); }}>
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">Manage groups</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={close} className="min-h-12 justify-center px-3 active:opacity-60"><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Done</Text></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Personal and Business are always here. Add your own groups to sort your records.</Text>
          {groups.map((group) => <Animated.View key={group.id} entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} layout={LinearTransition}
            className="gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            {editing?.id === group.id ? <>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">New name for {group.name}</Text>
              <TextInput accessibilityLabel={`New name for ${group.name}`} autoFocus className={inputClass} value={editing.name} maxLength={40}
                onChangeText={(value) => setEditing({ id: group.id, name: value })} />
              <View className="flex-row flex-wrap gap-2">
                <Pressable accessibilityRole="button" disabled={busy} className={`${buttonClass} bg-indigo-600 border-indigo-600`}
                  onPress={() => void submit(editing.name, group.id, (value) => onRename(group.id, value), () => setEditing(null))}><Text className="font-semibold text-white">Save name</Text></Pressable>
                <Pressable accessibilityRole="button" className={buttonClass} onPress={() => { setEditing(null); setError(''); }}><Text className="font-semibold text-gray-900 dark:text-white">Cancel</Text></Pressable>
              </View>
            </> : <>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">{group.name}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">{counts[group.id] ?? 0} {(counts[group.id] ?? 0) === 1 ? 'record' : 'records'}{group.kind !== 'custom' ? ' · Always available' : ''}</Text>
              </View>
              {group.kind === 'custom' && <View className="flex-row flex-wrap gap-2">
                <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${group.name}`} disabled={busy} className={buttonClass} onPress={() => { setError(''); setEditing({ id: group.id, name: group.name }); }}><Text className="font-semibold text-gray-900 dark:text-white">Rename</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${group.name}`} disabled={busy} className={buttonClass} onPress={() => onDelete(group)}><Text className="font-semibold text-red-600 dark:text-red-400">Delete</Text></Pressable>
              </View>}
            </>}
          </Animated.View>)}
          <View className="gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">New group name</Text>
            <TextInput accessibilityLabel="New group name" className={inputClass} value={name} onChangeText={setName} maxLength={40} placeholder="e.g. Family" placeholderTextColor="#9ca3af" />
            <Pressable accessibilityRole="button" disabled={busy} className={`items-center rounded-xl bg-indigo-600 px-4 py-4 ${busy ? 'opacity-50' : ''}`}
              onPress={() => void submit(name, undefined, onAdd, () => setName(''))}><Text className="font-semibold text-white">{busy ? 'Saving…' : 'Add group'}</Text></Pressable>
            {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
