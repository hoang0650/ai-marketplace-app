import { apiClient } from '@/api/client';

export type DeletionBlocker = { code: string; count: number; message: string };
export type DeletionPreview = {
  deleted: string[];
  retained: string[];
  canDelete: boolean;
  blockers: DeletionBlocker[];
  requiresPassword: boolean;
  publicRequestSlaDays: number;
  webUrl: string;
  policyUrl: string;
};

/** Self-service account deletion (App Store 5.1.1(v), Google Play account deletion). */
export const accountApi = {
  deletionPreview: () => apiClient.get<DeletionPreview>('/account/deletion'),
  deleteAccount: (body: { confirm: string; password?: string; reason?: string }) =>
    apiClient.post<{ ok: boolean; deletedAt: string; retentionUntil: string }>('/account/deletion', { ...body, source: 'app' }),
};
