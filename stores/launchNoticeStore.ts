import { create } from 'zustand';
import type { AgentRentalReceipt, AgentRentalRefund } from '@/api/types';

export interface LaunchNotice {
  kind: 'success' | 'error';
  agentId: string;
  brand: string;
  url?: string;
  message?: string;
  rental?: AgentRentalReceipt;
  refund?: AgentRentalRefund;
}

interface LaunchNoticeState {
  notice: LaunchNotice | null;
  retry: (() => void) | null;
  show: (notice: LaunchNotice, retry?: () => void) => void;
  close: () => void;
}

/** App-wide modal telling the buyer what a Launch did (charge, plan period, next step, refund). */
export const useLaunchNotice = create<LaunchNoticeState>((set) => ({
  notice: null,
  retry: null,
  show: (notice, retry) => set({ notice, retry: retry || null }),
  close: () => set({ notice: null, retry: null }),
}));
