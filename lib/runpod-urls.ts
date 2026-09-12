import { API_CONFIG } from '@/api/client';
import type { Product } from '@/api/types';

const trimSlash = (url: string) => url.replace(/\/$/, '');

export function publicGatewayUrls(modelId: string) {
  const id = encodeURIComponent(String(modelId || 'model').replace(/^runpod-/, '') || 'model');
  const v1 = trimSlash(API_CONFIG.BASE_URL);
  const host = v1.replace(/\/v1$/i, '');
  return {
    publicEndpoint: `${v1}/models/${id}/runsync`,
    serverlessEndpoint: `${host}/v2/${id}/run`,
    tokenizeEndpoint: `${v1}/models/${id}/tokenize`,
    gatewayUrl: 'https://ai.aimarkets.vn/v1',
  };
}

export function playgroundRunUrl() {
  return `${trimSlash(API_CONFIG.BASE_URL)}/playground/run`;
}

export function displayRuntime(p: Product) {
  const r = (p.runtime || {}) as Record<string, unknown>;
  const g = publicGatewayUrls(p.slug);
  const skills = Array.isArray(r.skills) ? r.skills.map(String) : [];
  return {
    publicEndpoint: String(r.publicEndpoint || g.publicEndpoint),
    serverlessEndpoint: String(r.serverlessEndpoint || g.serverlessEndpoint),
    tokenizeEndpoint: String(r.tokenizeEndpoint || g.tokenizeEndpoint),
    gatewayUrl: String(r.gatewayUrl || g.gatewayUrl),
    skills,
  };
}
