import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Linking } from 'react-native';
import { validateRentalFile } from '@himan/shared/rentals';
import type { RentalBill } from '@himan/shared/rentals';

export type StatementBill = Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>>;
export type FileInput = { name: string; mimeType: string; bytes: ArrayBuffer };

/** Lets the user pick photos or PDFs, checks each one (type and size, same rule as web) and reads it. Empty when cancelled. */
export async function pickFiles(types: string[] = ['image/jpeg', 'image/png'], multiple = true): Promise<FileInput[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, multiple, copyToCacheDirectory: true });
  if (result.canceled) return [];
  const files = result.assets.map((a) => new File(a.uri));
  try {
    result.assets.forEach((a, i) => validateRentalFile(a.name, a.mimeType ?? '', files[i].size));
    return await Promise.all(result.assets.map(async (a, i) => ({ name: a.name, mimeType: a.mimeType ?? '', bytes: await files[i].arrayBuffer() })));
  } finally {
    for (const f of files) if (f.uri.startsWith(Paths.cache.uri) && f.exists) { try { f.delete(); } catch { /* the OS clears its cache */ } }
  }
}

/** Opens a short-lived signed link (ID photo, proof) in the system viewer. */
export async function openSigned(url: Promise<string>) {
  await Linking.openURL(await url);
}
