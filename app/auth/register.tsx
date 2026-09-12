import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/schemas/auth';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { displayFont } from '@/constants/fonts';
import { legalApi } from '@/api';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { register, registerLoading } = useAuth();
  const [formError, setFormError] = useState('');
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', agreeTerms: false, agreePrivacy: false },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setFormError('');
      const res = await register({ name: values.name, email: values.email, password: values.password });
      try {
        await legalApi.accept('terms');
        await legalApi.accept('privacy');
      } catch {
        /* backend remains source of truth if accept fails */
      }
      if (res) router.replace('/(tabs)');
    } catch (e) {
      setFormError(getErrorMessage(e, language));
    }
  });

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }}>
      <LinearGradient colors={['#111111', '#2a2520']} style={{ paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: 32 }}>
        <Image source={require('@/assets/images/mark.png')} style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 14 }} />
        <Text style={{ color: '#f2efe8', fontSize: 32, fontFamily: displayFont, fontWeight: '600' }}>AI Markets</Text>
      </LinearGradient>
      <View style={{ padding: 22 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>{t('auth.create')}</Text>
        <Controller control={form.control} name="name" render={({ field, fieldState }) => <Input label={t('auth.fullName')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={form.control} name="email" render={({ field, fieldState }) => <Input label={t('auth.email')} autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={form.control} name="password" render={({ field, fieldState }) => <Input label={t('auth.password')} secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={form.control} name="confirmPassword" render={({ field, fieldState }) => <Input label={t('auth.confirmPassword')} secureTextEntry value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller
          control={form.control}
          name="agreeTerms"
          render={({ field, fieldState }) => (
            <Pressable onPress={() => field.onChange(!field.value)} style={{ marginBottom: 8, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.text }}>{field.value ? '☑' : '☐'} {t('auth.agreeTerms')}</Text>
              <Text style={{ color: colors.tint }} onPress={() => router.push(href('/legal/terms'))}>Terms</Text>
              {fieldState.error ? <Text style={{ color: colors.danger }}>{fieldState.error.message}</Text> : null}
            </Pressable>
          )}
        />
        <Controller
          control={form.control}
          name="agreePrivacy"
          render={({ field }) => (
            <Pressable onPress={() => field.onChange(!field.value)} style={{ marginBottom: 16, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.text }}>{field.value ? '☑' : '☐'} {t('auth.agreePrivacy')}</Text>
              <Text style={{ color: colors.tint }} onPress={() => router.push(href('/legal/privacy'))}>Privacy · Consumer Protection</Text>
            </Pressable>
          )}
        />
        {formError ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{formError}</Text> : null}
        <Button title={t('auth.register')} onPress={onSubmit} loading={registerLoading} />
        <Pressable onPress={() => router.back()} style={{ marginTop: 18 }}>
          <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>{t('auth.hasAccount')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
