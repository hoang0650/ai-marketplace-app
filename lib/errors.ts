import type { Lang } from '@/i18n/messages';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly userMessage: string;
  /** Parsed JSON error body (e.g. `stopReason`, `supportedDevices`). */
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, userMessage: string, details?: Record<string, unknown>) {
    super(userMessage);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

const GENERIC: Record<Lang, string> = {
  vi: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  en: 'Something went wrong. Please try again.',
  zh: '出错了，请重试。',
};

const NETWORK: Record<Lang, string> = {
  vi: 'Mất kết nối mạng. Kiểm tra Internet rồi thử lại.',
  en: 'You are offline. Check your connection and try again.',
  zh: '网络已断开，请检查网络连接后重试。',
};

const SESSION_EXPIRED: Record<Lang, string> = {
  vi: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',
  en: 'Session expired. Please sign in again.',
  zh: '登录已过期，请重新登录。',
};

function looksInternal(raw: string) {
  return /AxiosError|MongoError|ECONNREFUSED|stack|at Object\.|TypeError|Prisma/i.test(raw);
}

export function toUserMessage(raw: string, lang: Lang = 'vi'): string {
  const text = String(raw || '').trim();
  if (!text || looksInternal(text) || /^\d{3}$/.test(text)) return GENERIC[lang];
  if (text === 'NETWORK_ERROR' || text === 'Request timeout') return NETWORK[lang];
  if (text === 'UNAUTHORIZED') return SESSION_EXPIRED[lang];
  return text.slice(0, 280);
}

export function getErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  if (error instanceof ApiError) return error.userMessage;
  if (error instanceof Error) return toUserMessage(error.message, lang);
  return GENERIC[lang];
}
