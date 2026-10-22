import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { RECEIPT_MAX_TAGS, normalizeTags, receiptSchema, todayISO, validateReceiptPhoto } from '@himan/shared/receipts';
import type { Receipt, ReceiptValue } from '@himan/shared/receipts';
import { DateField } from './DateField';

const inputClass = 'min-h-12 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
const labelClass = 'mb-2 text-sm font-semibold text-gray-900 dark:text-white';
const buttonClass = 'min-h-12 items-center justify-center rounded-xl border border-gray-300 px-4 py-3 active:opacity-60 dark:border-gray-600';

async function takePhoto(source: 'camera' | 'photos'): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(source === 'camera' ? 'Camera is off for Himan' : 'Photos are off for Himan', 'Turn it on in Settings to add a picture.',
      [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }]);
    return null;
  }
  // Quality below 1 makes the picker hand back a smaller JPEG (never HEIC); the long edge is limited by the picker's own size.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0];
}

export interface ReceiptFormProps {
  receipt?: Receipt; existingPhotoUrl?: string; knownTags: string[]; busy: boolean;
  onSave: (value: ReceiptValue, photo?: ArrayBuffer) => Promise<void>;
}

export function ReceiptForm({ receipt, existingPhotoUrl, knownTags, busy, onSave }: ReceiptFormProps) {
  const [merchant, setMerchant] = useState(receipt?.merchant ?? '');
  const [amount, setAmount] = useState(receipt ? String(receipt.amount) : '');
  const [purchasedOn, setPurchasedOn] = useState(receipt?.purchasedOn ?? todayISO());
  const [note, setNote] = useState(receipt?.note ?? '');
  const [tags, setTags] = useState<string[]>(receipt?.tags ?? []);
  const [tagText, setTagText] = useState('');
  const [warrantyEndsOn, setWarranty] = useState(receipt?.warrantyEndsOn ?? '');
  const [expiresOn, setExpiry] = useState(receipt?.expiresOn ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const addTags = (raw: string) => { setTags((p) => normalizeTags([...p, ...normalizeTags(raw)])); setTagText(''); };

  const choose = () => Alert.alert('Photo of the receipt', undefined, [
    { text: 'Take a photo', onPress: async () => { const a = await takePhoto('camera'); if (a) { setPhotoUri(a.uri); setError(''); } } },
    { text: 'Choose from Photos', onPress: async () => { const a = await takePhoto('photos'); if (a) { setPhotoUri(a.uri); setError(''); } } },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const submit = async () => {
    const result = receiptSchema.safeParse({ merchant, amount: amount.trim() === '' ? NaN : Number(amount.replace(/,/g, '')), purchasedOn, note,
      tags: normalizeTags([...tags, ...normalizeTags(tagText)]), warrantyEndsOn: warrantyEndsOn || null, expiresOn: expiresOn || null });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    if (!receipt && !photoUri) { setError('Add a photo of the receipt'); return; }
    setError('');
    let file: File | undefined;
    try {
      let bytes: ArrayBuffer | undefined;
      if (photoUri) { file = new File(photoUri); validateReceiptPhoto(file.size); bytes = await file.arrayBuffer(); }
      await onSave(result.data, bytes);
    } catch (failure) {
      setError(failure instanceof Error && failure.message.includes('5 MB') ? failure.message : 'Could not save. Your changes are still here; retry when connected.');
    } finally {
      if (file && file.uri.startsWith(Paths.cache.uri) && file.exists) { try { file.delete(); } catch { /* the OS clears its cache */ } }
    }
  };

  const shown = photoUri ?? existingPhotoUrl;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View className="items-center gap-3">
        {shown ? <Image accessibilityLabel="Receipt preview" source={{ uri: shown }} resizeMode="contain" style={{ width: '100%', height: 220 }} /> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={choose} className={`${buttonClass} w-full`}>
          <Text className="font-semibold text-gray-900 dark:text-white">{shown ? 'Change photo' : 'Add a photo of the receipt'}</Text></Pressable>
      </View>
      <View><Text className={labelClass}>Store</Text>
        <TextInput accessibilityLabel="Store" editable={!busy} className={inputClass} value={merchant} onChangeText={setMerchant} maxLength={120} /></View>
      <View><Text className={labelClass}>Amount (₱)</Text>
        <TextInput accessibilityLabel="Amount in pesos" editable={!busy} className={inputClass} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View>
      <View><Text className={labelClass}>Date bought</Text><DateField label="Date bought" value={purchasedOn} onChange={setPurchasedOn} /></View>
      <View>
        <Text className={labelClass}>Tags (optional, up to {RECEIPT_MAX_TAGS})</Text>
        {tags.length > 0 && <View className="mb-2 flex-row flex-wrap gap-2">{tags.map((tag) => <Pressable key={tag} accessibilityRole="button" accessibilityLabel={`Remove tag ${tag}`}
          onPress={() => setTags(tags.filter((t) => t !== tag))} className="min-h-12 justify-center rounded-full bg-gray-100 px-4 dark:bg-gray-800">
          <Text className="text-gray-900 dark:text-white">{tag} · Remove</Text></Pressable>)}</View>}
        <View className="flex-row gap-2">
          <TextInput accessibilityLabel="New tag" className={`${inputClass} flex-1`} value={tagText} onChangeText={setTagText} onSubmitEditing={() => addTags(tagText)}
            placeholder="e.g. groceries" placeholderTextColor="#9ca3af" maxLength={60} autoCapitalize="none" />
          <Pressable accessibilityRole="button" disabled={!tagText.trim()} onPress={() => addTags(tagText)} className={`${buttonClass} ${tagText.trim() ? '' : 'opacity-40'}`}>
            <Text className="font-semibold text-gray-900 dark:text-white">Add tag</Text></Pressable>
        </View>
        {knownTags.filter((t) => !tags.includes(t)).slice(0, 8).length > 0 && <View className="mt-2 flex-row flex-wrap gap-2">
          {knownTags.filter((t) => !tags.includes(t)).slice(0, 8).map((tag) => <Pressable key={tag} accessibilityRole="button" onPress={() => addTags(tag)}
            className="min-h-12 justify-center rounded-full border border-gray-300 px-4 dark:border-gray-600"><Text className="text-gray-900 dark:text-white">Add {tag}</Text></Pressable>)}</View>}
      </View>
      <View><Text className={labelClass}>Warranty ends (optional)</Text><DateField optional label="Warranty ends" value={warrantyEndsOn} onChange={setWarranty} /></View>
      <View><Text className={labelClass}>Expires (optional)</Text><DateField optional label="Expires" value={expiresOn} onChange={setExpiry} /></View>
      <View><Text className={labelClass}>Note (optional)</Text>
        <TextInput accessibilityLabel="Note" editable={!busy} className={`${inputClass} min-h-24`} value={note} onChangeText={setNote} multiline maxLength={2000} textAlignVertical="top" /></View>
      {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-4 ${busy ? 'opacity-50' : ''}`}>
        {busy && <ActivityIndicator color="#fff" />}<Text className="font-semibold text-white">{busy ? 'Saving…' : 'Save receipt'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}
