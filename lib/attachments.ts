import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, API_CONFIG } from '@/api/client';
import { ApiError } from '@/lib/errors';
import type { FileAttachment } from '@/api/types';

export const ATTACH_MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = /\.(png|jpe?g|webp|gif|pdf|zip|7z|docx?|xlsx?|pptx?|txt|csv|md|json|mp4|mp3)$/i;
const DOC_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-7z-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'video/mp4',
  'audio/mpeg',
  'image/*',
];

const API_ORIGIN = API_CONFIG.BASE_URL.replace(/\/v1$/, '');
export const absUrl = (u: string) => (u && u.startsWith('/') ? `${API_ORIGIN}${u}` : u);

export function fileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

type Picked = { uri: string; name: string; mimeType: string; size?: number | null; file?: File };

async function pick(kind: 'image' | 'file'): Promise<Picked[]> {
  if (kind === 'image') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new ApiError(403, 'PHOTOS', 'PHOTOS');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: true, selectionLimit: 6 });
    if (r.canceled) return [];
    return r.assets.map((a) => ({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', size: a.fileSize, file: (a as { file?: File }).file }));
  }
  const r = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, multiple: true, copyToCacheDirectory: true });
  if (r.canceled) return [];
  return r.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream', size: a.size, file: a.file }));
}

/** Pick images or documents and upload them into the scope's private storage. */
export async function pickAndUpload(kind: 'image' | 'file', scope: 'chat' | 'hire', scopeId: string): Promise<FileAttachment[]> {
  const items = await pick(kind);
  const out: FileAttachment[] = [];
  for (const it of items.slice(0, 10)) {
    if ((it.size || 0) > ATTACH_MAX_BYTES) throw new ApiError(413, 'FILE_TOO_LARGE', it.name);
    if (!ALLOWED.test(it.name)) throw new ApiError(415, 'FILE_TYPE_NOT_ALLOWED', it.name);
    const form = new FormData();
    form.append('scope', scope);
    form.append('scopeId', scopeId);
    if (Platform.OS === 'web') {
      const blob: Blob = it.file ?? (await fetch(it.uri).then((r) => r.blob()));
      form.append('file', blob, it.name);
    } else {
      form.append('file', { uri: it.uri, name: it.name, type: it.mimeType } as unknown as Blob);
    }
    out.push(await apiClient.uploadForm<FileAttachment>('/attachments', form));
  }
  return out;
}
