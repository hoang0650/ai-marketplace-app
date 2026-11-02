import { create } from 'zustand';

type ToastState = {
  message: string;
  show: (message: string) => void;
  clear: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  show: (message) => {
    if (timer) clearTimeout(timer);
    set({ message });
    timer = setTimeout(() => set({ message: '' }), 4200);
  },
  clear: () => {
    if (timer) clearTimeout(timer);
    set({ message: '' });
  },
}));
