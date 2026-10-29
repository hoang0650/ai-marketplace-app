import { apiClient } from './client';
export type VoiceSource = 'preset' | 'upload' | 'marketplace';
export type FilmSceneV2 = {
  sid: string; prompt: string; narration: string; duration: number; voice: string; lang?: string;
  voiceSource?: VoiceSource; voiceUploadId?: string; voiceProductId?: string;
  videoModel?: string; imageModel?: string; status?: string; source: 'ai' | 'upload';
  shots: { active: number; versions: { videoKey: string }[] }[];
};
export type FilmUpload = { uid: string; name: string; kind: string; duration: number; size: number; status: string; key: string };
export type FilmProjectV2 = { id: string; title: string; lang: string; scenes: FilmSceneV2[]; subtitles: 'off' | 'soft' | 'burn'; uploads: FilmUpload[]; media: Record<string, string>; renders: { status: string; key: string }[] };
export type FilmModelV2 = { id: string; name: string; kind: 'video' | 'image'; available: boolean; reason: string; marketplacePricing?: { usageRate: number; usageUnit: string; currency: string } };
export type SellerVoice = { id: string; name: string; slug: string; seller: string; available: boolean; languages: string[] };
export type FilmConfigV2 = { available: boolean; modelCatalog: FilmModelV2[]; languages: { code: string; name: string }[]; voices: Record<string, { id: string; name: string }[]> };
export type FilmEstimateV2 = { available: number; total: number; items: { sid: string; price: number }[]; render: { price: number; ttsChars: number } };
const base = '/studio/film';
export const filmV2Api = {
  config: () => apiClient.get<FilmConfigV2>(base + '/config'),
  voices: () => apiClient.get<{ items: SellerVoice[] }>(base + '/voices'),
  list: () => apiClient.get<{ items: { id: string; title: string }[] }>(base + '/projects'),
  one: (id: string) => apiClient.get<FilmProjectV2>(`${base}/projects/${id}`),
  create: () => apiClient.post<FilmProjectV2>(base + '/projects', { title: 'Phim AI', lang: 'vi', scenes: [{ prompt: '', narration: '', duration: 15 }] }),
  save: (p: FilmProjectV2) => apiClient.patch<FilmProjectV2>(`${base}/projects/${p.id}`, { title: p.title, lang: p.lang, subtitles: p.subtitles, scenes: p.scenes }),
  estimate: (id: string, sceneIds: string[]) => apiClient.post<FilmEstimateV2>(`${base}/projects/${id}/estimate`, { sceneIds }, 120000),
  generate: (id: string, sid: string, expectedPrice: number) => apiClient.post<{ project: FilmProjectV2 }>(`${base}/projects/${id}/scenes/${sid}/generate`, { expectedPrice }, 120000),
  render: (id: string, expectedPrice: number) => apiClient.post<{ project: FilmProjectV2 }>(`${base}/projects/${id}/render`, { expectedPrice }, 120000),
  upload: (id: string, body: { name: string; size: number; contentType: string; kind: string }) => apiClient.post<{ upload: FilmUpload; putUrl: string; headers: Record<string, string> }>(`${base}/projects/${id}/uploads`, body),
  confirmUpload: (id: string, uid: string) => apiClient.post<{ upload: FilmUpload }>(`${base}/projects/${id}/uploads/${uid}/confirm`, {}, 150000),
};
