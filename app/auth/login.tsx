import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/schemas/auth';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { signInWithGoogle } from '@/services/googleAuth';
import { displayFont } from '@/constants/fonts';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { login, loginLoading, loginWithGoogle, googleLoginLoading } = useAuth();
  const [formError, setFormError] = useState('');
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const busy = loginLoading || googleLoginLoading;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setFormError('');
      await login(values);
      router.replace('/(tabs)');
    } catch (e) {
      setFormError(getErrorMessage(e, language));
    }
  });

  const onGoogle = async () => {
    try {
      setFormError('');
      const g = await signInWithGoogle();
      await loginWithGoogle({
        token: g.token,
        refreshToken: g.refreshToken,
        idToken: g.idToken,
        code: g.code,
        redirectUri: g.redirectUri,
        clientId: g.clientId,
      });
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'CANCELLED') return;
      setFormError(getErrorMessage(e, language));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }}>
      <LinearGradient colors={['#111111', '#2a2520']} style={{ paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: 32 }}>
        <Image source={require('@/assets/images/mark.png')} style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 14 }} />
        <Text style={{ color: '#f2efe8', fontSize: 32, fontFamily: displayFont, fontWeight: '600' }}>AI Markets</Text>
        <Text style={{ color: 'rgba(245,240,232,0.72)', marginTop: 8 }}>{t('auth.tagline')}</Text>
      </LinearGradient>
      <View style={{ padding: 22 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{t('auth.welcome')}</Text>
        <Button title={t('auth.google')} variant="outline" onPress={onGoogle} disabled={busy} />
        <Text style={{ textAlign: 'center', color: colors.textSecondary, marginVertical: 14 }}>{t('common.or')}</Text>
        <Controller control={form.control} name="email" render={({ field, fieldState }) => (
          <Input label={t('auth.email')} autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Controller control={form.control} name="password" render={({ field, fieldState }) => (
          <Input label={t('auth.password')} secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
        )} />
        <Pressable onPress={() => router.push('/auth/forgot-password')} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>{t('auth.forgot')}</Text>
        </Pressable>
        {formError ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{formError}</Text> : null}
        <Button title={t('auth.login')} onPress={onSubmit} loading={busy} />
        <Pressable onPress={() => router.push('/auth/register')} style={{ marginTop: 18 }}>
          <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>{t('auth.noAccount')}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('common.explore')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
