import { create } from 'zustand';

import { huntApi } from '@/services/hunt-api';
import type { Identity } from '@/types/api';

interface AuthState {
  identity: Identity | null;
  loading: boolean;
  initialized: boolean;
  restore(): Promise<void>;
  login(input: {
    identifier: string;
    password: string;
    qrToken?: string;
    force?: boolean;
  }): Promise<Identity>;
  logout(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  identity: null,
  loading: false,
  initialized: false,
  async restore() {
    set({ loading: true });
    try {
      set({ identity: await huntApi.me(), initialized: true });
    } catch {
      set({ identity: null, initialized: true });
    } finally {
      set({ loading: false });
    }
  },
  async login(input) {
    set({ loading: true });
    try {
      const identity = await huntApi.login(input);
      set({ identity, initialized: true });
      return identity;
    } finally {
      set({ loading: false });
    }
  },
  async logout() {
    try {
      await huntApi.logout();
    } finally {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('crack_the_code_') || k.startsWith('sliding_puzzle_') || k.startsWith('game_save_'))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore storage errors
      }
      set({ identity: null, initialized: true });
    }
  },
}));
