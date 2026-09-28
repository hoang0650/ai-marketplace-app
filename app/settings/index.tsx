import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { useT, useTheme } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { previewSound, previewVoice } from '@/services/sound';
import type { ThemeMode } from '@/theme/tokens';

type Colors = ReturnType<typeof useTheme>['colors'];

function Option({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: Colors }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 14, minHeight: 48, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.text }}>{label}</Text>
      {active ? <Text style={{ color: colors.tint, fontWeight: '800' }}>●</Text> : null}
    </Pressable>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
  colors,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: Colors;
}) {
  return (
    <View style={{ paddingVertical: 12, minHeight: 56, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text }}>{label}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.tint }} />
    </View>
  );
}

function PreviewButton({
  label,
  enabled,
  onPress,
  colors,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={{
        flex: 1,
        minHeight: 48,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.tint,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? 1 : 0.4,
      }}
    >
      <Text style={{ color: colors.tint, fontWeight: '700', textAlign: 'center' }}>▶ {label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('settings.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.appearance')}</Text>
      {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
        <Option key={m} colors={colors} label={t(`settings.theme.${m}`)} active={themeMode === m} onPress={() => setThemeMode(m)} />
      ))}
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.language')}</Text>
      <Option colors={colors} label="Tiếng Việt" active={language === 'vi'} onPress={() => setLanguage('vi')} />
      <Option colors={colors} label="English" active={language === 'en'} onPress={() => setLanguage('en')} />
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.currency')}</Text>
      <Option colors={colors} label="USD" active={currency === 'USD'} onPress={() => setCurrency('USD')} />
      <Option colors={colors} label="VND" active={currency === 'VND'} onPress={() => setCurrency('VND')} />
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.sound')}</Text>
      <Toggle
        colors={colors}
        label={t('settings.soundEffects')}
        hint={t('settings.soundEffectsHint')}
        value={soundEnabled}
        onChange={(v) => void setSoundEnabled(v)}
      />
      <Toggle
        colors={colors}
        label={t('settings.voice')}
        hint={t('settings.voiceHint')}
        value={voiceEnabled}
        onChange={(v) => void setVoiceEnabled(v)}
      />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <PreviewButton colors={colors} label={t('settings.soundTestChime')} enabled={soundEnabled} onPress={() => previewSound()} />
        <PreviewButton colors={colors} label={t('settings.soundTestVoice')} enabled={voiceEnabled} onPress={() => previewVoice()} />
      </View>
    </Screen>
  );
}
