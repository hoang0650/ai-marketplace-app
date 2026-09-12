import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { playgroundApi, walletApi } from '@/api';
import type { PlaygroundRunResult, Product } from '@/api/types';
import {
  buildRunpodInput,
  defaultValues,
  fallbackSchema,
  mergeSchema,
  quoteRunpod,
  schemaFields,
  schemaSlug,
  seedSamplePrompt,
  type RunpodModelSchema,
} from '@/lib/runpod-schema';
import { playgroundRunUrl } from '@/lib/runpod-urls';
import { isVoiceCategory } from '@/constants/categories';

export type InputMode = 'messages' | 'prompt';
export type ResultView = 'preview' | 'json';
export type RunStatus = 'idle' | 'running' | 'done' | 'error';
export type ApiClientKind = 'curl' | 'python' | 'javascript';
export type ApiAction = 'run' | 'runsync' | 'status';

export type SessionLog = {
  id: string;
  at: string;
  status: string;
  input: Record<string, unknown>;
  response?: unknown;
};

function previewFromRun(product: Product, schema: RunpodModelSchema | null, res: PlaygroundRunResult) {
  const output = (res.output || {}) as Record<string, unknown>;
  const reported = String(output.kind || '');
  let kind: 'image' | 'video' | 'audio' | 'text' =
    reported === 'image' || reported === 'video' || reported === 'audio' || reported === 'text'
      ? reported
      : output.video_url
        ? 'video'
        : output.audio_url
          ? 'audio'
          : output.image_url || (output.images as string[] | undefined)?.[0]
            ? 'image'
            : schema?.kind === 'video'
              ? 'video'
              : schema?.kind === 'image'
                ? 'image'
                : schema?.kind === 'audio' || isVoiceCategory(product.category)
                  ? 'audio'
                  : 'text';
  const choices = output.choices as Array<{ tokens?: string[]; message?: { content?: string } }> | undefined;
  const tokenText = choices?.[0]?.tokens?.join('') || choices?.[0]?.message?.content || '';
  const text = String(output.text || tokenText || output.ai_response_text || '').trim();
  const uri = String(
    output.video_url || output.audio_url || output.image_url || (output.images as string[] | undefined)?.[0] || '',
  ).trim();
  return { kind, text, uri, cost: Number(res.cost || output.cost || 0), raw: res };
}

export function usePlayground(product: Product, isAuthenticated = false) {
  const slug = schemaSlug(product);
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [modelVariant, setModelVariant] = useState(product.slug);
  const [inputMode, setInputMode] = useState<InputMode>('messages');
  const [systemPrompt, setSystemPrompt] = useState(`You are ${product.name}.`);
  const [resultView, setResultView] = useState<ResultView>('preview');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [preview, setPreview] = useState<ReturnType<typeof previewFromRun> | null>(null);
  const [errorText, setErrorText] = useState('');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [apiClient, setApiClient] = useState<ApiClientKind>('curl');
  const [apiAction, setApiAction] = useState<ApiAction>('runsync');
  const [apiMethod, setApiMethod] = useState<'POST' | 'GET'>('POST');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const schemaQuery = useQuery({
    queryKey: ['playground-schema', slug],
    queryFn: async () => {
      try {
        return mergeSchema(await playgroundApi.schema(slug), product.category, slug);
      } catch {
        return mergeSchema(null, product.category, slug);
      }
    },
  });

  const schema = schemaQuery.data || mergeSchema(null, product.category, slug);
  const fields = useMemo(() => schemaFields(schema), [schema]);
  const primaryFields = fields.filter((f) => !f.advanced);
  const advancedFields = fields.filter((f) => f.advanced);
  const chatStyle = !!schema.chatStyle;

  const modelOptions = useMemo(() => {
    const variants = schema.params?.model?.enum;
    if (variants?.length) return variants.map((v) => ({ value: String(v), label: String(v) }));
    if (schema.openaiModel) {
      return [
        { value: schema.endpointId || product.slug, label: schema.endpointId || product.slug },
        { value: String(schema.openaiModel), label: String(schema.openaiModel) },
      ].filter((opt, i, arr) => arr.findIndex((x) => x.value === opt.value) === i);
    }
    return [{ value: product.slug, label: product.slug }];
  }, [schema, product.slug]);

  useEffect(() => {
    const next = defaultValues(schema);
    const sample = seedSamplePrompt(product.category);
    if (next.prompt === undefined || next.prompt === '') next.prompt = sample;
    else if (!String(next.prompt || '').trim()) next.prompt = sample;
    if (('image' in next || 'images' in next) && product.coverUrl) {
      if ('image' in next && !next.image) next.image = product.coverUrl;
      if ('images' in next && (!Array.isArray(next.images) || !next.images.length)) next.images = [product.coverUrl];
    }
    setParamValues(next);
    setModelVariant(String(schema.params?.model?.default || modelOptions[0]?.value || product.slug));
    setSystemPrompt(`You are ${product.name}.`);
    setInputMode('messages');
    setRunStatus('idle');
    setPreview(null);
    setErrorText('');
    setResultView('preview');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed when catalog schema arrives
  }, [product.id, schemaQuery.dataUpdatedAt, schema.slug, schema.chatStyle]);

  const prompt = String(paramValues.prompt ?? '');
  const setPrompt = (value: string) => setParamValues((prev) => ({ ...prev, prompt: value }));
  const setValue = (key: string, value: unknown) => setParamValues((prev) => ({ ...prev, [key]: value }));

  const runpodInput = useCallback(() => {
    if (isVoiceCategory(product.category) && !schema.params) {
      return { prompt, audio_url: product.contentMeta?.voiceSampleUrl, format: 'mp3' };
    }
    const extra: Record<string, unknown> = {};
    if (schema.params?.model) extra.model = modelVariant;
    if (chatStyle) {
      if (inputMode === 'messages') {
        extra.messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ];
      } else {
        extra.prompt = prompt;
      }
    }
    return buildRunpodInput(schema, paramValues, extra);
  }, [product, schema, paramValues, modelVariant, chatStyle, inputMode, systemPrompt, prompt]);

  const quote = quoteRunpod(schema, runpodInput());
  const priceHint = (() => {
    if (quote?.cost != null) {
      return quote.quantity > 1
        ? `${quote.rateLabel} · est. $${quote.cost.toFixed(4)} for ${quote.quantity}s`
        : `Est. $${quote.cost.toFixed(4)} per run`;
    }
    const pr = product.pricing;
    if (pr?.model === 'usage') {
      return `Runs are billed at ${pr.usageRate ?? pr.price ?? 0} ${pr.currency || 'USD'} per ${pr.usageUnit || pr.unit || '1M tokens'}.`;
    }
    if (pr?.model === 'subscription') return `Included with ${pr.price} ${pr.currency}/${pr.interval} subscription.`;
    if (pr?.model === 'free') return 'Free sandbox — no charge for demo runs.';
    return pr?.price ? `One-time purchase ${pr.price} ${pr.currency}.` : '';
  })();

  const canRun = (() => {
    if (chatStyle || !primaryFields.length) return !!prompt.trim();
    return primaryFields.filter((f) => f.required).every((f) => {
      const v = paramValues[f.key];
      if (v === undefined || v === null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
  })();

  const wallet = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: walletApi.summary,
    enabled: isAuthenticated,
  });

  const run = useMutation({
    mutationFn: () =>
      playgroundApi.run({
        productSlug: product.slug,
        productId: product.id,
        input: runpodInput(),
        model: modelVariant,
        endpointId: schema.endpointId,
        action: apiAction === 'run' ? 'run' : 'runsync',
      }),
    onMutate: () => {
      setRunStatus('running');
      setErrorText('');
    },
    onSuccess: (res) => {
      setRunStatus('done');
      setPreview(previewFromRun(product, schema, res));
      setLogs((prev) => [
        {
          id: `${Date.now()}`,
          at: new Date().toISOString(),
          status: String(res.status || 'COMPLETED'),
          input: runpodInput(),
          response: res,
        },
        ...prev,
      ].slice(0, 20));
      void wallet.refetch();
    },
    onError: (err) => {
      setRunStatus('error');
      setErrorText(err instanceof Error ? err.message : String(err));
      setLogs((prev) => [
        { id: `${Date.now()}`, at: new Date().toISOString(), status: 'FAILED', input: runpodInput() },
        ...prev,
      ].slice(0, 20));
    },
  });

  const reset = () => {
    const next = defaultValues(schema);
    next.prompt = seedSamplePrompt(product.category);
    setParamValues(next);
    setSystemPrompt(`You are ${product.name}.`);
    setInputMode('messages');
    setRunStatus('idle');
    setPreview(null);
    setErrorText('');
    setResultView('preview');
    run.reset();
  };

  const apiSnippet = useCallback(() => {
    const url = playgroundRunUrl();
    const wrapped = {
      productSlug: product.slug,
      input: runpodInput(),
      action: apiAction === 'run' ? 'run' : 'runsync',
    };
    if (apiClient === 'python') {
      return [
        'import requests',
        '',
        `url = "${url}"`,
        'headers = {',
        '  "Content-Type": "application/json",',
        '  "Authorization": f"Bearer {MARKETPLACE_JWT}",',
        '}',
        `payload = ${JSON.stringify(wrapped, null, 2)}`,
        '',
        'response = requests.post(url, headers=headers, json=payload)',
        'print(response.json())',
      ].join('\n');
    }
    if (apiClient === 'javascript') {
      return [
        `const res = await fetch("${url}", {`,
        '  method: "POST",',
        '  headers: {',
        '    "Content-Type": "application/json",',
        '    Authorization: `Bearer ${MARKETPLACE_JWT}`,',
        '  },',
        `  body: JSON.stringify(${JSON.stringify(wrapped, null, 2)}),`,
        '});',
        'const data = await res.json();',
        'console.log(data);',
      ].join('\n');
    }
    const body = JSON.stringify(wrapped);
    return [
      `curl -X POST "${url}" \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Authorization: Bearer $MARKETPLACE_JWT' \\`,
      `  -d '${body.replace(/'/g, "'\\''")}'`,
    ].join('\n');
  }, [apiAction, apiClient, product.slug, runpodInput]);

  return {
    schema,
    schemaLoading: schemaQuery.isLoading,
    paramValues,
    setValue,
    prompt,
    setPrompt,
    modelVariant,
    setModelVariant,
    modelOptions,
    inputMode,
    setInputMode,
    systemPrompt,
    setSystemPrompt,
    chatStyle,
    primaryFields,
    advancedFields,
    settingsOpen,
    setSettingsOpen,
    logsOpen,
    setLogsOpen,
    logs,
    resultView,
    setResultView,
    runStatus,
    preview,
    errorText,
    priceHint,
    canRun,
    wallet,
    run,
    reset,
    apiClient,
    setApiClient,
    apiAction,
    setApiAction,
    apiMethod,
    setApiMethod,
    apiSnippet,
  };
}

export type PlaygroundState = ReturnType<typeof usePlayground>;
