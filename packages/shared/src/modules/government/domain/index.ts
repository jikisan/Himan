import { z } from 'zod';

export const GOVERNMENT_TYPES = [
  'PhilHealth', 'Pag-IBIG', 'SSS', 'TIN', 'National ID', 'Passport', "Driver’s license",
] as const;
export const GOVERNMENT_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const GOVERNMENT_FILE_LIMIT = 10 * 1024 * 1024;

export const governmentRecordSchema = z.object({
  agency: z.string().trim().min(1, 'Choose a type').max(80),
  label: z.string().trim().min(1, 'Enter a record label').max(120),
  registeredName: z.string().trim().min(1, 'Enter the registered name').max(160),
  number: z.string().trim().max(100),
  issueDate: z.iso.date().nullable(),
  expiryDate: z.iso.date().nullable(),
  notes: z.string().trim().max(10000),
  // Omitted groupId lands in Personal (database default).
  groupId: z.string().min(1).optional(),
}).refine((value) => !value.issueDate || !value.expiryDate || value.issueDate <= value.expiryDate, {
  message: 'Expiry date must be on or after issue date', path: ['expiryDate'],
});

export const GOVERNMENT_GROUP_NAME_MAX = 40;
export const governmentGroupNameSchema = z.string().trim()
  .min(1, 'Enter a group name').max(GOVERNMENT_GROUP_NAME_MAX, `Use ${GOVERNMENT_GROUP_NAME_MAX} characters or fewer`);

export type GovernmentGroupKind = 'personal' | 'business' | 'custom';
export interface GovernmentGroup {
  id: string;
  userId: string;
  name: string;
  kind: GovernmentGroupKind;
  createdAt: string;
}

export type GovernmentRecordInput = z.infer<typeof governmentRecordSchema>;
export interface GovernmentDocument {
  id: string;
  recordId: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  ready: boolean;
}
export interface GovernmentRecord extends GovernmentRecordInput {
  id: string;
  groupId: string;
  userId: string;
  deleting: boolean;
  createdAt: string;
  updatedAt: string;
  documents: GovernmentDocument[];
}

export function maskGovernmentNumber(number: string): string {
  if (!number) return 'No number saved';
  // Short identifiers must never be revealed in full by masking.
  return number.length <= 4 ? '••••' : `•••• ${number.slice(-4)}`;
}

export function governmentFileType(name: string, mimeType?: string | null): string {
  const type = mimeType || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[
    name.split('.').pop()?.toLowerCase() ?? ''
  ]);
  if (!GOVERNMENT_FILE_TYPES.some((allowed) => allowed === type)) {
    throw new Error('Choose a PDF, JPEG, or PNG file');
  }
  return type!;
}

export function validateGovernmentFile(name: string, mimeType: string | null | undefined, size: number): string {
  if (!name.trim() || name.length > 255) throw new Error('File name must be 1–255 characters');
  if (!Number.isInteger(size) || size <= 0 || size > GOVERNMENT_FILE_LIMIT) {
    throw new Error('Choose a non-empty file up to 10 MB');
  }
  return governmentFileType(name, mimeType);
}

export function filterGovernmentRecords(records: GovernmentRecord[], search: string): GovernmentRecord[] {
  const needle = search.trim().toLocaleLowerCase();
  return records.filter((record) => [record.agency, record.label, record.registeredName, record.number,
    ...record.documents.map((document) => document.name)].some((text) => text.toLocaleLowerCase().includes(needle)));
}

export const ALL_GOVERNMENT_GROUPS = 'all';

/** Personal first, Business second, then custom groups oldest first. */
export function sortGovernmentGroups(groups: GovernmentGroup[]): GovernmentGroup[] {
  const rank = { personal: 0, business: 1, custom: 2 } as const;
  return [...groups].sort((a, b) => rank[a.kind] - rank[b.kind] || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function personalGovernmentGroup(groups: GovernmentGroup[]): GovernmentGroup | undefined {
  return groups.find((group) => group.kind === 'personal');
}

export function isGovernmentGroupNameTaken(groups: GovernmentGroup[], name: string, exceptId?: string): boolean {
  const needle = name.trim().toLocaleLowerCase();
  return groups.some((group) => group.id !== exceptId && group.name.trim().toLocaleLowerCase() === needle);
}

export function filterGovernmentRecordsByGroup(records: GovernmentRecord[], groupId: string): GovernmentRecord[] {
  return groupId === ALL_GOVERNMENT_GROUPS ? records : records.filter((record) => record.groupId === groupId);
}

export function countGovernmentRecordsByGroup(records: GovernmentRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) counts[record.groupId] = (counts[record.groupId] ?? 0) + 1;
  return counts;
}
