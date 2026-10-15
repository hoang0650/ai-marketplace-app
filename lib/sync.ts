import { AppState } from 'react-native';
import { handoffApi, handoffError, type SyncEvent } from '@/api/handoff';

type Listener = (e: SyncEvent) => void;

/**
 * Cross-device sync feed (long-poll /v1/handoff/sync). One loop per app process while signed
 * in and in the foreground; resumes from its cursor so nothing is lost across reconnects.
 * Listeners get a synthetic `reset` event when they should refetch everything.
 */
class SyncFeed {
  private listeners = new Set<Listener>();
  private cursor = '';
  private gen = 0;
  private running = false;
  revoked = false;

  constructor() {
    AppState.addEventListener('change', (s) => {
      if (s === 'active' && this.listeners.size) this.start();
      else if (s !== 'active') this.stop();
    });
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    this.start();
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size) this.stop();
    };
  }

  private emit(e: SyncEvent) {
    for (const l of this.listeners) l(e);
  }

  start() {
    if (this.running || this.revoked) return;
    this.running = true;
    void this.loop(++this.gen);
  }

  stop() {
    this.running = false;
    this.gen++;
  }

  private async loop(gen: number) {
    let backoff = 1000;
    while (this.running && gen === this.gen) {
      try {
        const r = await handoffApi.sync(this.cursor);
        if (gen !== this.gen) return;
        const first = !this.cursor;
        this.cursor = r.cursor;
        backoff = 1000;
        if (r.reset && !first) this.emit({ seq: 0, type: 'reset', data: {}, at: new Date().toISOString(), self: false });
        for (const e of r.events) this.emit(e);
      } catch (e) {
        const err = handoffError(e, '');
        if (err.code === 'DEVICE_REVOKED') {
          this.revoked = true;
          this.emit({ seq: 0, type: 'device.revokedSelf', data: {}, at: new Date().toISOString(), self: true });
          this.running = false;
          return;
        }
        if (err.code === 'UNAUTHORIZED') {
          this.running = false;
          return;
        }
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 30_000);
      }
    }
  }
}

export const syncFeed = new SyncFeed();
