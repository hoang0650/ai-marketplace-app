import { apiClient, API_CONFIG } from './client';
import { tokenStorage } from '@/lib/secureStorage';

/** Same endpoints as the web AI Studio (/v1/studio/*, /v1/training-jobs). Jobs run on the shared RTX 5090. */
export type StudioKind = 'fast' | 'talking' | 'tts' | 'film';
export type QuotaRow = { used: number; free: number; price: number };
export type StudioPromo = { active: boolean; until: string | null; label: string };
export type StudioQuota = { enabled: boolean; fast: QuotaRow; talking: QuotaRow; tts: QuotaRow; film: QuotaRow; available: number; promo: StudioPromo };
export type StudioVoice = { label: string; id: string };
export type StudioSubmit = { id: string; status: string; free: boolean; charged: number; remainingFree: number; position?: number | null };
export type StudioJob = {
  id: string; kind: StudioKind; status: 'queued' | 'running' | 'succeeded' | 'failed'; position: number | null;
  progress: { steps_done?: number; steps_total?: number; scene?: number; scenes?: number } | null;
  timings: Record<string, number> | null; error: string; free: boolean; charged: number;
  videoUrl: string | null; audioUrl: string | null; imageUrl: string | null;
};
export type FilmScene = { prompt: string; narration: string };

export const studioApi = {
  quota: () => apiClient.get<StudioQuota>('/studio/quota'),
  voices: () => apiClient.get<Record<string, StudioVoice[]>>('/studio/voices'),
  tts: (b: { text: string; lang: string; voice?: string; voiceBase64?: string }) => apiClient.post<StudioSubmit>('/studio/tts', b, 90000),
  fast: (b: { prompt: string; imageBase64?: string }) => apiClient.post<StudioSubmit>('/studio/video/fast', b, 90000),
  talking: (b: { text: string; lang: string; imageBase64: string; voiceBase64?: string }) => apiClient.post<StudioSubmit>('/studio/video/talking', b, 90000),
  film: (b: { title: string; lang: string; voice?: string; scenes: FilmScene[] }) => apiClient.post<StudioSubmit>('/studio/film', b, 90000),
  job: (id: string) => apiClient.get<StudioJob>(`/studio/jobs/${encodeURIComponent(id)}`),
};

export type SharedGpu = { id: string; name: string; memoryGb: number; pricePerHour: number; listPricePerHour: number; promo: StudioPromo; maxMinutes: number };
export type TrainingGpuOptions = { shared: SharedGpu | null; offers: { id: string; name: string; memoryGb: number; pricePerHour: number }[]; promo: StudioPromo; limits: { maxMinutes: number } };
export type TrainingDatasetLite = { id: string; name: string; source: 'raw' | 'video' | 'audio'; fileCount: number };
export type TrainingJobLite = { jobId: string; shared?: boolean; freePromo?: boolean; status: string; stage: string; progress: number; datasetName: string; task: string; gpuType: string };

export const sharedTrainingApi = {
  options: () => apiClient.get<TrainingGpuOptions>('/training-jobs/gpu-options'),
  datasets: () => apiClient.get<{ datasets: TrainingDatasetLite[] }>('/training-datasets'),
  jobs: () => apiClient.get<TrainingJobLite[]>('/training-jobs'),
  create: (b: { source: string; task: string; datasetId: string; offerId: string; autoStop: boolean }) => apiClient.post<TrainingJobLite>('/training-jobs', b, 60000),
};

/** Media URLs need the bearer token; native players take headers, the web build needs a blob URL. */
export async function mediaSource(path: string): Promise<{ uri: string; headers?: Record<string, string> }> {
  const token = (await tokenStorage.getAccessToken()) || '';
  const uri = `${API_CONFIG.BASE_URL}${path.replace(/^\/v1/, '')}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (typeof document !== 'undefined') {
    const r = await fetch(uri, { headers });
    if (!r.ok) throw new Error(String(r.status));
    return { uri: URL.createObjectURL(await r.blob()) };
  }
  return { uri, headers };
}

/** Reads a picked file (image/audio) as raw base64 (no data: prefix). */
export async function fileToBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result).replace(/^data:[^,]*,/, ''));
    fr.readAsDataURL(blob);
  });
}
