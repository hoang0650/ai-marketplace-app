import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CODE_EDITOR_HTML } from './codeEditorHtml';

export interface EditorFile { path: string; content: string }
export interface EditorLabels { saved: string; unsaved: string; ai: string; explorer: string; pick: string }
export interface CodeEditorHandle { send(msg: Record<string, unknown>): void }

interface Props {
  files: EditorFile[];
  path: string;
  version: number;
  generating: boolean;
  labels: EditorLabels;
  onSave(path: string, content: string): void;
  onDirty?(dirty: boolean): void;
  onPreview?(): void;
}

/**
 * VS Code–style CodeMirror 6 editor (same feature set as the aimarkets.vn mobile Code tab):
 * a WebView on iOS/Android, an iframe on Expo web.
 */
export const CodeEditorView = forwardRef<CodeEditorHandle, Props>(function CodeEditorView(props, ref) {
  const web = useRef<WebView>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  const send = useCallback((msg: Record<string, unknown>) => {
    const m = { __aimHost: 1, ...msg };
    if (Platform.OS === 'web') frame.current?.contentWindow?.postMessage(m, '*');
    else web.current?.injectJavaScript(`window.__aim && window.__aim(${JSON.stringify(m)}); true;`);
  }, []);
  useImperativeHandle(ref, () => ({ send }), [send]);

  const init = useCallback(() => {
    const p = latest.current;
    send({ type: 'init', files: p.files, path: p.path, version: p.version, generating: p.generating, labels: p.labels });
  }, [send]);

  const onData = useCallback(
    (d: { type?: string; path?: string; content?: string; dirty?: boolean }) => {
      if (d.type === 'ready') { ready.current = true; init(); }
      else if (d.type === 'save' && d.path) latest.current.onSave(d.path, d.content || '');
      else if (d.type === 'dirty') latest.current.onDirty?.(!!d.dirty);
      else if (d.type === 'preview') latest.current.onPreview?.();
    },
    [init],
  );

  // Push file / state changes after the first init.
  useEffect(() => {
    if (ready.current) send({ type: 'files', files: props.files, version: props.version, generating: props.generating });
  }, [props.files, props.version, props.generating, send]);
  useEffect(() => {
    if (ready.current && props.path) send({ type: 'files', files: latest.current.files, path: props.path });
  }, [props.path, send]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__aimEditor) return;
      onData(e.data);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [onData]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {React.createElement('iframe', {
          ref: (el: HTMLIFrameElement | null) => { frame.current = el; },
          srcDoc: CODE_EDITOR_HTML,
          title: 'Code editor',
          style: { border: 0, width: '100%', height: '100%', background: '#1e1e1e' },
          'data-testid': 'app-code-editor',
        })}
      </View>
    );
  }
  return (
    <WebView
      ref={web}
      style={styles.fill}
      originWhitelist={['*']}
      source={{ html: CODE_EDITOR_HTML, baseUrl: 'https://aimarkets.vn/' }}
      javaScriptEnabled
      domStorageEnabled
      keyboardDisplayRequiresUserAction={false}
      hideKeyboardAccessoryView
      automaticallyAdjustContentInsets={false}
      setSupportMultipleWindows={false}
      onMessage={(e) => {
        try { onData(JSON.parse(e.nativeEvent.data)); } catch { /* not ours */ }
      }}
    />
  );
});

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: '#1e1e1e' } });
