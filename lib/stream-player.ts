import { API_CONFIG } from '@/api/client';
import type { GameSessionInfo } from '@/api/types';

/** Always hit the public API host so the JWT cookie/query matches the WebView origin. */
export function gamePlayerUrl(session: GameSessionInfo, accessToken: string): string {
  const id = encodeURIComponent(session.sessionId);
  const token = encodeURIComponent(accessToken);
  return `${API_CONFIG.BASE_URL}/game-sessions/${id}/player?access_token=${token}`;
}
