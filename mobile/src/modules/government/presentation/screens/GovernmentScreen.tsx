import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { ALL_GOVERNMENT_GROUPS, GOVERNMENT_TYPES, GOVERNMENT_FILE_TYPES, countGovernmentRecordsByGroup, filterGovernmentRecords,
  filterGovernmentRecordsByGroup, governmentRecordSchema, maskGovernmentNumber, personalGovernmentGroup, sortGovernmentGroups,
  validateGovernmentFile } from '@himan/shared/government';
import type { GovernmentRecord, GovernmentRecordInput, GovernmentDocument, GovernmentGroup } from '@himan/shared/government';
import { useGovernment } from '../hooks/useGovernment';
import { GovernmentAgencyMark } from '../components/GovernmentAgencyMark';
import { GovernmentDocumentPreview } from '../components/GovernmentDocumentPreview';
import { GovernmentGroupBar } from '../components/GovernmentGroupBar';
import { GovernmentGroupManager } from '../components/GovernmentGroupManager';

const inputClass = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white';
const textClass = 'text-gray-900 dark:text-white';
const mutedClass = 'text-gray-500 dark:text-gray-400';

function RecordForm({ record, groups, defaultGroupId, busy, onSave }: { record?: GovernmentRecord; groups: GovernmentGroup[]; defaultGroupId: string; busy: boolean; onSave: (input: GovernmentRecordInput) => Promise<void> }) {
  const [form, setForm] = useState<GovernmentRecordInput>(() => record ? {
    agency: record.agency, label: record.label, registeredName: record.registeredName, number: record.number,
    issueDate: record.issueDate, expiryDate: record.expiryDate, notes: record.notes, groupId: record.groupId,
  } : { agency: 'PhilHealth', label: '', registeredName: '', number: '', issueDate: null, expiryDate: null, notes: '', groupId: defaultGroupId });
  const [custom, setCustom] = useState(!!record && !GOVERNMENT_TYPES.some((type) => type === record.agency));
  const [error, setError] = useState('');
  const set = (field: keyof GovernmentRecordInput, value: string | null) => setForm((previous) => ({ ...previous, [field]: value }));
  const fields: { key: keyof GovernmentRecordInput; label: string; max: number; placeholder?: string }[] = [
    ...(custom ? [{ key: 'agency' as const, label: 'Custom type name', max: 80, placeholder: 'e.g. PRC license' }] : []),
    { key: 'registeredName', label: 'Registered name', max: 160 },
    { key: 'number', label: 'ID / member number (optional)', max: 100 },
  ];
  return <KeyboardAvoidingView behavior="padding" className="flex-1">
    <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row gap-2">
          {[...GOVERNMENT_TYPES, 'Custom type'].map((type) => {
            const active = type === 'Custom type' ? custom : !custom && form.agency === type;
            return <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected: active, disabled: busy }} disabled={busy}
              onPress={() => { setCustom(type === 'Custom type'); set('agency', type === 'Custom type' ? '' : type); }}
              className={`min-h-12 justify-center rounded-xl px-4 py-3 active:opacity-70 ${active ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Text className={active ? 'text-white' : textClass}>{type}</Text>
            </Pressable>;
          })}
        </View></ScrollView>
      </View>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row gap-2">
          {groups.map((group) => {
            const active = form.groupId === group.id;
            return <Pressable key={group.id} accessibilityRole="button" accessibilityState={{ selected: active, disabled: busy }} disabled={busy}
              onPress={() => set('groupId', group.id)}
              className={`min-h-12 justify-center rounded-xl px-4 py-3 active:opacity-70 ${active ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Text className={active ? 'text-white' : textClass}>{group.name}</Text>
            </Pressable>;
          })}
        </View></ScrollView>
      </View>
      {fields.map(({ key, label, max, placeholder }) => <View key={key}>
        <Text className={`mb-2 text-sm font-semibold ${textClass}`}>{label}</Text>
        <TextInput accessibilityLabel={label} editable={!busy} className={inputClass}
          value={form[key] ?? ''} onChangeText={(value) => set(key, value)}
          placeholder={placeholder} placeholderTextColor="#9ca3af" maxLength={max}
          autoCorrect={false} autoComplete="off" />
      </View>)}
      {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} className={`items-center rounded-xl bg-indigo-600 px-4 py-4 ${busy ? 'opacity-50' : ''}`}
        onPress={async () => {
          const result = governmentRecordSchema.safeParse({ ...form, label: form.label.trim() || form.agency });
          if (!result.success) { setError(result.error.issues[0].message); return; }
          setError('');
          try { await onSave(result.data); }
          catch { setError('Could not save. Your changes are still here; retry when connected.'); }
        }}><Text className="font-semibold text-white">{busy ? 'Saving…' : 'Save record'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export default function GovernmentScreen() {
  const government = useGovernment();
  return <GovernmentContent key={government.userId ?? 'signed-out'} {...government} />;
}

function GovernmentContent({ records, groups: unsortedGroups, loading, error, online, busy, run, refetch, documentUrl, userId }: ReturnType<typeof useGovernment>) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e5e7eb' : '#111827';
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(ALL_GOVERNMENT_GROUPS);
  const [managerOpen, setManagerOpen] = useState(false);
  const groups = sortGovernmentGroups(unsortedGroups);
  const counts = countGovernmentRecordsByGroup(records);
  const shownGroup = activeGroup === ALL_GOVERNMENT_GROUPS || groups.some((group) => group.id === activeGroup) ? activeGroup : ALL_GOVERNMENT_GROUPS;
  const groupName = (id: string) => groups.find((group) => group.id === id)?.name;
  const [dialog, setDialog] = useState<{ userId: string | undefined; id: string | null; editing: boolean } | null>(null);
  const activeDialog = dialog?.userId === userId ? dialog : null;
  const [revealed, setRevealed] = useState(false);
  const [revealedPreviewId, setRevealedPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const selected = records.find((record) => record.id === activeDialog?.id);
  const disabled = busy || uploading;
  const open = (id: string | null, editing = false) => {
    setRevealed(false); setRevealedPreviewId(null);
    setShowDocuments(!!records.find((record) => record.id === id)?.documents.length);
    setDialog({ userId, id, editing });
  };
  const copyNumber = async (number: string) => {
    try { await Clipboard.setStringAsync(number); Alert.alert('Number copied'); }
    catch { Alert.alert('Could not copy number'); }
  };
  useFocusEffect(useCallback(() => {
    setRevealed(false); setRevealedPreviewId(null);
    return () => { setRevealed(false); setRevealedPreviewId(null); };
  }, []));

  const remove = (id: string, document: boolean, name: string) => Alert.alert(`Delete ${name}?`,
    document ? 'Permanently delete this document? This cannot be undone.' : 'Permanently delete this record and all its documents? This cannot be undone.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await run({ type: document ? 'removeDocument' : 'remove', id });
        if (!document) setDialog(null);
      } catch { Alert.alert('Deletion incomplete', 'Retry when connected to finish removing this record or document.'); }
    } }]);

  const upload = async (recordId: string) => {
    setUploading(true);
    let temporaryFiles: File[] = [];
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: [...GOVERNMENT_FILE_TYPES], multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      temporaryFiles = result.assets.map((asset) => new File(asset.uri));
      for (const [index, asset] of result.assets.entries()) validateGovernmentFile(asset.name, asset.mimeType, temporaryFiles[index].size);
      for (const [index, asset] of result.assets.entries()) {
        await run({ type: 'upload', id: recordId, file: { name: asset.name, mimeType: asset.mimeType, bytes: await temporaryFiles[index].arrayBuffer() } });
      }
    } catch (failure) {
      Alert.alert('Could not attach document', failure instanceof Error ? failure.message : 'Retry when connected. Check the record for any files already uploaded.');
    } finally {
      for (const file of temporaryFiles) {
        if (file.uri.startsWith(Paths.cache.uri) && file.exists) {
          try { file.delete(); }
          catch { Alert.alert('Temporary file cleanup failed', 'Clear the app cache to remove the temporary upload copy.'); }
        }
      }
      setUploading(false);
    }
  };

  const openDocument = async (document: GovernmentDocument, download = false) => {
    try { await Linking.openURL(await documentUrl(document.id, download)); }
    catch { Alert.alert('Could not open document', 'Retry when connected.'); }
  };

  const renderRecord = ({ item: record }: { item: GovernmentRecord }) => <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} layout={LinearTransition}
    className="mb-3 gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${record.label} details`} onPress={() => open(record.id)} className="min-h-12 flex-row items-center gap-3 active:opacity-70">
      <GovernmentAgencyMark agency={record.agency} />
      <View className="flex-1">
        <Text className={`text-base font-semibold ${textClass}`}>{record.agency}</Text>
        {shownGroup === ALL_GOVERNMENT_GROUPS && groupName(record.groupId) && <Text className={`text-xs font-medium ${mutedClass}`}>{groupName(record.groupId)}</Text>}
        {record.label !== record.agency && <Text className={`text-sm ${mutedClass}`}>{record.label}</Text>}
      </View>
    </Pressable>
    {record.deleting && <Text className="text-sm text-red-500">Deletion incomplete</Text>}
    {record.documents.filter((document) => document.ready).slice(0, 1).map((document) => userId &&
      <GovernmentDocumentPreview key={document.id} document={document} userId={userId} iconColor={iconColor} documentUrl={documentUrl} openLabel="View documents" onOpen={() => open(record.id)} />)}
    <View className="min-h-12 flex-row items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-2">
      <Text className={`flex-1 font-mono text-base font-medium ${textClass}`}>{revealedPreviewId === record.id ? record.number : maskGovernmentNumber(record.number)}</Text>
      {record.number && <Pressable accessibilityRole="button" accessibilityLabel={`${revealedPreviewId === record.id ? 'Hide' : 'Reveal'} ${record.agency} number`}
        accessibilityState={{ selected: revealedPreviewId === record.id }} className="h-12 w-12 items-center justify-center rounded-lg active:bg-gray-200 dark:active:bg-gray-700"
        onPress={() => setRevealedPreviewId(revealedPreviewId === record.id ? null : record.id)}>
        <Feather accessible={false} name={revealedPreviewId === record.id ? 'eye-off' : 'eye'} size={20} color={iconColor} />
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${record.agency} number`} accessibilityState={{ disabled: !record.number }} disabled={!record.number}
        className={`h-12 w-12 items-center justify-center rounded-lg active:bg-gray-200 dark:active:bg-gray-700 ${!record.number ? 'opacity-40' : ''}`}
        onPress={() => void copyNumber(record.number)}>
        <Feather accessible={false} name="copy" size={20} color={iconColor} />
      </Pressable>
    </View>
  </Animated.View>;

  const removeGroup = (group: GovernmentGroup) => {
    const count = counts[group.id] ?? 0;
    Alert.alert(`Delete the ${group.name} group?`, count ? `${count} ${count === 1 ? 'record' : 'records'} will move to Personal. No records are deleted.` : 'This group has no records.',
      [{ text: 'Keep group', style: 'cancel' }, { text: 'Delete group', style: 'destructive', onPress: async () => {
        try { await run({ type: 'removeGroup', id: group.id }); if (shownGroup === group.id) setActiveGroup(ALL_GOVERNMENT_GROUPS); }
        catch { Alert.alert('Could not delete the group', 'Retry when connected.'); }
      } }]);
  };

  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/(app)/dashboard')} className="p-3"><Feather name="arrow-left" size={22} color={iconColor} /></Pressable>
      <Text className={`text-lg font-bold ${textClass}`}>Government</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Add government record" disabled={!online || !userId || disabled} onPress={() => open(null, true)} className="p-3"><Feather name="plus" size={24} color={online ? '#4f46e5' : '#9ca3af'} /></Pressable>
    </View>
    {!online ? <Text className={`p-8 text-center ${mutedClass}`}>Connect to the internet to access your government records.</Text>
      : <FlatList data={filterGovernmentRecords(filterGovernmentRecordsByGroup(records, shownGroup), search)} extraData={revealedPreviewId} renderItem={renderRecord} keyExtractor={(record) => record.id}
        contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={() => void refetch()}
        ListHeaderComponent={<View className="mb-5 gap-4"><Text className={`text-sm ${mutedClass}`}>Your ID numbers in one place. Tap to copy.</Text>
          {!loading && <GovernmentGroupBar groups={groups} counts={counts} total={records.length} active={shownGroup} disabled={disabled} onChange={setActiveGroup} onManage={() => setManagerOpen(true)} />}
          <TextInput accessibilityLabel="Search government records" className={inputClass} value={search} onChangeText={setSearch}
            placeholder="Search records or documents" placeholderTextColor="#9ca3af" autoCorrect={false} />
          {error && <View className="gap-3 rounded-xl border border-red-300 p-4"><Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">Could not load government records.</Text>
            <Pressable accessibilityRole="button" onPress={() => void refetch()} className="py-2"><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Retry</Text></Pressable></View>}
        </View>}
        ListEmptyComponent={loading ? <ActivityIndicator color="#4f46e5" /> : !error ? <View className="items-center gap-3 py-12">
          <Feather name="file-text" size={40} color="#9ca3af" /><Text className={`text-lg font-semibold ${textClass}`}>{search ? 'No matching records' : records.length ? `Nothing in ${groupName(shownGroup) ?? 'this group'} yet` : 'Keep your details together'}</Text>
          <Text className={`text-center ${mutedClass}`}>{search ? 'Try a different search.' : records.length ? 'Add a record here, or move one in by editing its group.' : 'Add PhilHealth, Pag-IBIG, SSS, or another government record.'}</Text>
          {!search && <Pressable accessibilityRole="button" className="mt-2 rounded-xl bg-indigo-600 px-5 py-3" onPress={() => open(null, true)}><Text className="font-semibold text-white">{records.length ? 'Add a record' : 'Add your first record'}</Text></Pressable>}
        </View> : null} />}

    <GovernmentGroupManager visible={managerOpen && online} groups={groups} counts={counts} busy={busy} onClose={() => setManagerOpen(false)}
      onAdd={async (name) => { await run({ type: 'addGroup', name }); }} onRename={async (id, name) => { await run({ type: 'renameGroup', id, name }); }} onDelete={removeGroup} />
    <Modal visible={!!activeDialog && online && !!userId} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!disabled) setDialog(null); }}>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center gap-3 border-b border-gray-200 dark:border-gray-800 p-4">
          {selected && !activeDialog?.editing && <GovernmentAgencyMark agency={selected.agency} />}
          <View className="flex-1 gap-1">
            <Text className={`text-lg font-semibold ${textClass}`}>{activeDialog?.editing ? selected ? 'Edit record' : 'Add record' : selected?.label ?? 'Record unavailable'}</Text>
            {selected && !activeDialog?.editing && <Text className={`text-sm ${mutedClass}`}>{selected.registeredName}{groupName(selected.groupId) ? ` · ${groupName(selected.groupId)}` : ''}</Text>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close record" disabled={disabled} className="h-12 w-12 items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-800" onPress={() => selected && activeDialog?.editing ? open(selected.id) : setDialog(null)}><Feather name={selected && activeDialog?.editing ? 'arrow-left' : 'x'} size={22} color={iconColor} /></Pressable>
        </View>
        {activeDialog?.editing ? <RecordForm key={activeDialog.id ?? 'new'} record={selected} groups={groups} defaultGroupId={(groups.find((group) => group.id === shownGroup) ?? personalGovernmentGroup(groups))?.id ?? ''} busy={disabled} onSave={async (input) => {
          const saved = await run({ type: 'save', id: activeDialog.id, input });
          if (saved) open(saved.id);
        }} /> : selected ? <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {selected.deleting && <Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">Deletion did not finish. Retry deleting this record to remove the remaining documents.</Text>}
          <View className="min-h-12 flex-row items-center gap-2">
            <Text className={`flex-1 font-mono text-base font-medium ${textClass}`}>{revealed ? selected.number : maskGovernmentNumber(selected.number)}</Text>
              {selected.number && <Pressable accessibilityRole="button" accessibilityLabel={revealed ? 'Hide number' : 'Reveal number'} accessibilityState={{ selected: revealed }}
                className="h-12 w-12 items-center justify-center rounded-lg active:bg-gray-200 dark:active:bg-gray-700" onPress={() => setRevealed(!revealed)}>
                <Feather accessible={false} name={revealed ? 'eye-off' : 'eye'} size={20} color={iconColor} />
              </Pressable>}
              <Pressable accessibilityRole="button" accessibilityLabel="Copy number" accessibilityState={{ disabled: !selected.number }} disabled={!selected.number}
                className={`h-12 w-12 items-center justify-center rounded-lg active:bg-gray-200 dark:active:bg-gray-700 ${!selected.number ? 'opacity-40' : ''}`}
                onPress={() => void copyNumber(selected.number)}><Feather accessible={false} name="copy" size={20} color={iconColor} /></Pressable>
          </View>
          <View className="rounded-xl border border-gray-200 dark:border-gray-700">
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDocuments }} accessibilityLabel={`Documents (${selected.documents.length})`}
              className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-60" onPress={() => setShowDocuments(!showDocuments)}>
              <Feather accessible={false} name="file-text" size={20} color={iconColor} /><Text className={`flex-1 font-medium ${textClass}`}>Documents ({selected.documents.length})</Text>
              <Feather accessible={false} name={showDocuments ? 'chevron-up' : 'chevron-down'} size={18} color={iconColor} />
            </Pressable>
            {showDocuments && <View className="gap-3 border-t border-gray-200 dark:border-gray-700 p-4">
            <Text className={`text-xs ${mutedClass}`}>PDF, JPEG, PNG · Up to 10 MB each</Text>
            {!selected.documents.length && <Text className={`text-sm ${mutedClass}`}>Attach a scan or photo if you need one.</Text>}
            {selected.documents.map((document) => <View key={document.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              {document.ready && userId && <View className="mb-3"><GovernmentDocumentPreview document={document} userId={userId} iconColor={iconColor} documentUrl={documentUrl} onOpen={() => void openDocument(document)} /></View>}
              <Text className={`font-medium ${textClass}`}>{document.name}</Text><Text className={`mt-1 text-xs ${mutedClass}`}>{document.ready ? document.size < 1048576 ? `${Math.ceil(document.size / 1024)} KB` : `${(document.size / 1048576).toFixed(1)} MB` : 'Upload incomplete — remove and retry'}</Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {(['View', 'Download'] as const).map((label) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label} ${document.name}`} disabled={disabled || !document.ready || selected.deleting}
                  className={`min-h-12 justify-center rounded-lg px-3 py-3 active:opacity-60 ${!document.ready || selected.deleting ? 'opacity-40' : ''}`} onPress={() => void openDocument(document, label === 'Download')}><Text className="font-semibold text-indigo-600 dark:text-indigo-400">{label}</Text></Pressable>)}
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${document.name}`} disabled={disabled} className="min-h-12 justify-center px-3 py-3 active:opacity-60" onPress={() => remove(document.id, true, document.name)}><Text className="font-semibold text-red-600 dark:text-red-400">Remove</Text></Pressable>
              </View>
            </View>)}
            <Pressable accessibilityRole="button" disabled={disabled || selected.deleting} className={`min-h-12 items-center justify-center rounded-xl border border-indigo-300 px-4 py-3 active:opacity-60 ${disabled || selected.deleting ? 'opacity-40' : ''}`}
              onPress={() => void upload(selected.id)}><Text className="font-semibold text-indigo-600 dark:text-indigo-400">{uploading ? 'Uploading…' : 'Attach existing files'}</Text></Pressable>
            </View>}
          </View>
        </ScrollView>
          <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <Pressable accessibilityRole="button" disabled={disabled} onPress={() => remove(selected.id, false, selected.label)} className="min-h-12 justify-center rounded-xl px-3 py-3 active:opacity-60"><Text className="font-semibold text-red-600 dark:text-red-400">{busy ? 'Working…' : 'Delete record'}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={disabled || selected.deleting} onPress={() => open(selected.id, true)} className={`min-h-12 items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 active:opacity-60 ${selected.deleting || disabled ? 'opacity-40' : ''}`}><Text className={`font-semibold ${textClass}`}>Edit details</Text></Pressable>
          </View>
        </> : <Text className={`p-6 ${mutedClass}`}>Refresh the list to reload this record.</Text>}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
