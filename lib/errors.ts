export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly userMessage: string;

  constructor(status: number, code: string, userMessage: string) {
    super(userMessage);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
  }
}

const GENERIC = {
  vi: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  en: 'Something went wrong. Please try again.',
};

const NETWORK = {
  vi: 'Mất kết nối mạng. Kiểm tra Internet rồi thử lại.',
  en: 'You are offline. Check your connection and try again.',
};

function looksInternal(raw: string) {
  return /AxiosError|MongoError|ECONNREFUSED|stack|at Object\.|TypeError|Prisma/i.test(raw);
}

export function toUserMessage(raw: string, lang: 'vi' | 'en' = 'vi'): string {
  const text = String(raw || '').trim();
  if (!text || looksInternal(text) || /^\d{3}$/.test(text)) return GENERIC[lang];
  if (text === 'NETWORK_ERROR' || text === 'Request timeout') return NETWORK[lang];
  if (text === 'UNAUTHORIZED') return lang === 'vi' ? 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.' : 'Session expired. Please sign in again.';
  return text.slice(0, 280);
}

export function getErrorMessage(error: unknown, lang: 'vi' | 'en' = 'vi'): string {
  if (error instanceof ApiError) return error.userMessage;
  if (error instanceof Error) return toUserMessage(error.message, lang);
  return GENERIC[lang];
}
