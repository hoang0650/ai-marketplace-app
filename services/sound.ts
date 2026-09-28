import { AppState, Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/stores/settingsStore';

type SpeechModule = typeof import('expo-speech');
type AudioModule = typeof import('expo-audio');

/** Lazy: builds made before these native modules were added must not crash on import. */
function loadModule<T>(load: () => T): () => T | null {
  let cached: T | null | undefined;
  return () => {
    if (cached === undefined) {
      try {
        cached = load();
      } catch {
        cached = null;
      }
    }
    return cached;
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const getAudio = loadModule<AudioModule>(() => require('expo-audio'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getSpeech = loadModule<SpeechModule>(() => require('expo-speech'));

export type SoundEvent = 'notification' | 'paymentSuccess' | 'orderSuccess' | 'aiReady';

const SOURCES: Record<SoundEvent, number> = {
  notification: require('@/assets/sounds/notification.mp3'),
  paymentSuccess: require('@/assets/sounds/payment-success.mp3'),
  orderSuccess: require('@/assets/sounds/order-success.mp3'),
  aiReady: require('@/assets/sounds/ai-ready.mp3'),
};

/** Clip lengths, so the spoken line starts after the chime. */
const CLIP_MS: Record<SoundEvent, number> = {
  notification: 320,
  paymentSuccess: 1000,
  orderSuccess: 1150,
  aiReady: 1920,
};

const PHRASES: Record<'vi' | 'en', Record<SoundEvent, string>> = {
  vi: {
    notification: 'Bạn có thông báo mới',
    paymentSuccess: 'Thanh toán thành công',
    orderSuccess: 'Tạo đơn hàng thành công',
    aiReady: 'Nội dung AI đã tạo xong',
  },
  en: {
    notification: 'You have a new notification',
    paymentSuccess: 'Payment successful',
    orderSuccess: 'Order created successfully',
    aiReady: 'Your AI content is ready',
  },
};

/** The same event within this window plays once (e.g. several notifications in one poll). */
const THROTTLE_MS = 1500;

const players = new Map<SoundEvent, AudioPlayer>();
const lastPlayedAt = new Map<SoundEvent, number>();
const voiceByLang = new Map<string, string | null>();
let speakTimer: ReturnType<typeof setTimeout> | null = null;

function getPlayer(event: SoundEvent): AudioPlayer | null {
  let player = players.get(event);
  if (!player) {
    const audio = getAudio();
    if (!audio) return null;
    player = audio.createAudioPlayer(SOURCES[event]);
    player.volume = 0.9;
    players.set(event, player);
  }
  return player;
}

/** Load the clips ahead of time so the first chime is not delayed. */
export function preloadSounds(): void {
  if (Platform.OS === 'web') return;
  (Object.keys(SOURCES) as SoundEvent[]).forEach((event) => {
    try {
      getPlayer(event);
    } catch {
      /* audio unavailable */
    }
  });
}

async function pickVoice(Speech: SpeechModule, lang: 'vi' | 'en'): Promise<string | undefined> {
  if (voiceByLang.has(lang)) return voiceByLang.get(lang) ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const matches = voices.filter((v) => v.language?.toLowerCase().startsWith(lang));
    const best = matches.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? matches[0];
    voiceByLang.set(lang, best?.identifier ?? null);
    return best?.identifier;
  } catch {
    voiceByLang.set(lang, null);
    return undefined;
  }
}

function speak(text: string, lang: 'vi' | 'en', delayMs: number) {
  const Speech = getSpeech();
  if (!Speech) return;
  if (speakTimer) clearTimeout(speakTimer);
  speakTimer = setTimeout(() => {
    speakTimer = null;
    void (async () => {
      try {
        const voice = await pickVoice(Speech, lang);
        await Speech.stop();
        Speech.speak(text, {
          language: lang === 'vi' ? 'vi-VN' : 'en-US',
          voice,
          rate: 0.95,
          pitch: 1.0,
        });
      } catch {
        /* TTS unavailable */
      }
    })();
  }, delayMs);
}

export type PlaySoundOptions = {
  /** Custom spoken line, or `false` to skip the voice for this call. */
  say?: string | false;
};

/**
 * Play the UI sound for an event, then read a short announcement when the
 * user enabled voice in Settings. Safe to call from anywhere (no hooks).
 */
export function playSound(event: SoundEvent, options: PlaySoundOptions = {}): void {
  if (AppState.currentState !== 'active') return;
  const now = Date.now();
  if (now - (lastPlayedAt.get(event) ?? 0) < THROTTLE_MS) return;
  lastPlayedAt.set(event, now);

  const { soundEnabled, voiceEnabled, language } = useSettingsStore.getState();

  if (soundEnabled) playChime(event);

  if (voiceEnabled && options.say !== false) {
    const text = options.say || PHRASES[language][event];
    speak(text, language, soundEnabled ? CLIP_MS[event] : 0);
  }
}

function playChime(event: SoundEvent) {
  try {
    const player = getPlayer(event);
    if (player) {
      void player.seekTo(0).catch(() => {});
      player.play();
    }
  } catch {
    /* audio unavailable */
  }
}

/** Settings preview: chime only, no throttle. */
export function previewSound(event: SoundEvent = 'notification'): void {
  playChime(event);
}

/** Settings preview: spoken line only, no throttle. */
export function previewVoice(event: SoundEvent = 'notification'): void {
  const { language } = useSettingsStore.getState();
  speak(PHRASES[language][event], language, 0);
}
