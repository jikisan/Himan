import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import { validateRentalFile } from '@himan/shared/rentals';
import type { RentalBill } from '@himan/shared/rentals';

export type StatementBill = Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>>;
export type FileInput = { name: string; mimeType: string; bytes: ArrayBuffer };
type Source = 'photos' | 'camera' | 'files';

/** Asks where the file comes from. Photos and camera first: IDs and payment screenshots usually live there. */
function chooseSource(): Promise<Source | null> {
  const options: [Source, string][] = [['photos', 'Choose from Photos'], ['camera', 'Take a photo'], ['files', 'Choose a file']];
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...options.map(([, label]) => label), 'Cancel'], cancelButtonIndex: options.length },
        (i) => resolve(i < options.length ? options[i][0] : null));
    } else {
      Alert.alert('Add a file', undefined, [...options.map(([source, label]) => ({ text: label, onPress: () => resolve(source) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) }], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

/** Read each picked file, checked with the same rule as web (type and size). Copies in the app cache are removed afterwards. */
async function read(assets: { uri: string; name: string; mimeType: string }[]): Promise<FileInput[]> {
  const files = assets.map((a) => new File(a.uri));
  try {
    assets.forEach((a, i) => validateRentalFile(a.name, a.mimeType, files[i].size));
    return await Promise.all(assets.map(async (a, i) => ({ name: a.name, mimeType: a.mimeType, bytes: await files[i].arrayBuffer() })));
  } finally {
    for (const f of files) if (f.uri.startsWith(Paths.cache.uri) && f.exists) { try { f.delete(); } catch { /* the OS clears its cache */ } }
  }
}

/** Lets the user add photos or PDFs from Photos, the camera or Files. Empty when cancelled. PDFs only come from Files. */
export async function pickFiles(types: string[] = ['image/jpeg', 'image/png'], multiple = true): Promise<FileInput[]> {
  const source = await chooseSource();
  if (!source) return [];
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({ type: types, multiple, copyToCacheDirectory: true });
    return result.canceled ? [] : read(result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? '' })));
  }
  const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(source === 'camera' ? 'Camera is off for Himan' : 'Photos are off for Himan',
      'Turn it on in Settings to add a picture, or choose a file instead.', [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }]);
    return [];
  }
  // A quality below 1 makes iOS hand back JPEG (not HEIC), which the upload accepts.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: multiple && source === 'photos' };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  return read(result.assets.map((a, i) => {
    const mimeType = a.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const base = (a.fileName ?? `photo-${Date.now()}-${i + 1}`).replace(/\.[^.]+$/, '');
    return { uri: a.uri, name: `${base}.${mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType };
  }));
}

/** Opens a short-lived signed link (ID photo, proof) in the system viewer. */
export async function openSigned(url: Promise<string>) {
  await Linking.openURL(await url);
}
