import { apiClient } from './client';
export type TrainingVolume = { id: string; name: string; sizeGb: number; dataCenterId: string; status: string; attachedRentalId: string | null; pricePerMonth: number };
export type TrainingVolumeLimits = { sizeMin: number; sizeMax: number; sizeDefault: number; pricePerGbMonth: number };
export type TrainingWorkspaceOffer = { id: string; name: string; pricePerHour: number; clouds?: { type: string; networkVolumePricePerHour: number; dataCenters: { id: string; availability: string }[] }[] };
export const trainingWorkspaceApi = {
  volumes: () => apiClient.get<{ volumes: TrainingVolume[]; limits: TrainingVolumeLimits }>('/gpu/volumes'),
  offers: () => apiClient.get<{ offers: TrainingWorkspaceOffer[]; dataCenters: { id: string; location: string }[] }>('/gpu/offers'),
  createVolume: (b: { name: string; dataCenterId: string; sizeGb: number }) => apiClient.post<{ volume: TrainingVolume }>('/gpu/volumes', b, 120000),
};
