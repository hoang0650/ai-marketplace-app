import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { getErrorMessage } from '@/lib/errors';
import { AnalyticsService } from '@/lib/analytics';
import { displayFont } from '@/constants/fonts';

function param(v?: string | string[]) {
  return String(Array.isArray(v) ? v[0] : v || '').trim();
}

export default function CreateReviewScreen() {
  const { productId: rawId, name: rawName } = useLocalSearchParams<{ productId?: string; name?: string }>();
  const productId = param(rawId);
  const productName = param(rawName);
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const create = useMutation({
    mutationFn: () =>
      reviewsApi.create({
        productId,
        rating,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      AnalyticsService.track('review_created', { productId, rating });
      void qc.invalidateQueries({ queryKey: ['reviews', productId] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  const submit = () => {
    if (!productId) {
      Alert.alert('AI Markets', t('review.needProduct'));
      return;
    }
    if (!body.trim()) {
      Alert.alert('AI Markets', t('review.needBody'));
      return;
    }
    create.mutate();
  };

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('review.title') }} />
        <LoginPrompt />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: t('review.title') }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        >
          {productName ? (
            <Text style={[styles.product, { color: colors.textSecondary }]} numberOfLines={2}>
              {productName}
            </Text>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('review.ratingLabel')}</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = n <= rating;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setRating(n)}
                    accessibilityRole="button"
                    accessibilityLabel={t('review.starN', { n })}
                    accessibilityState={{ selected: on }}
                    hitSlop={6}
                    style={styles.starHit}
                  >
                    <Text style={[styles.star, { color: on ? colors.tint : colors.border }]}>{on ? '★' : '☆'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.caption, { color: colors.text }]}>
              {rating}/5 · {t(`review.rating.${rating}`)}
            </Text>
          </View>

          <Input
            label={t('review.fieldTitle')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('review.fieldTitlePh')}
            maxLength={80}
            returnKeyType="next"
          />
          <Input
            label={t('review.fieldBody')}
            value={body}
            onChangeText={setBody}
            placeholder={t('review.fieldBodyPh')}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={styles.body}
          />

          <Button
            title={t('review.submit')}
            loading={create.isPending}
            disabled={!productId || !body.trim()}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  product: {
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  starHit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 32,
    lineHeight: 36,
  },
  caption: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    minHeight: 132,
    paddingTop: 12,
  },
});
