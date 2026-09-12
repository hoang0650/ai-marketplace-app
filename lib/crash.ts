export const CrashReportingService = {
  capture(error: unknown, context?: string) {
    if (__DEV__) {
      const message = error instanceof Error ? error.message : String(error);
      if (/token|password|secret|key/i.test(message)) return;
      console.warn('[crash]', context || '', message);
    }
  },
};
