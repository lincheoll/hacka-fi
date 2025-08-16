'use client';

import { create } from 'zustand';
import type { Hackathon } from '@/types/global';

interface HackathonState {
  hackathons: Hackathon[];
  selectedHackathon: Hackathon | null;
  isLoading: boolean;
  error: string | null;
  setHackathons: (hackathons: Hackathon[]) => void;
  setSelectedHackathon: (hackathon: Hackathon | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addHackathon: (hackathon: Hackathon) => void;
  updateHackathon: (id: string, updates: Partial<Hackathon>) => void;
  removeHackathon: (id: string) => void;
}

export const useHackathonStore = create<HackathonState>((set, get) => ({
  hackathons: [],
  selectedHackathon: null,
  isLoading: false,
  error: null,

  setHackathons: (hackathons: Hackathon[]) => {
    set({ hackathons });
  },

  setSelectedHackathon: (hackathon: Hackathon | null) => {
    set({ selectedHackathon: hackathon });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  addHackathon: (hackathon: Hackathon) => {
    const { hackathons } = get();
    set({ hackathons: [hackathon, ...hackathons] });
  },

  updateHackathon: (id: string, updates: Partial<Hackathon>) => {
    const { hackathons } = get();
    const updatedHackathons = hackathons.map((h) =>
      h.id === id ? { ...h, ...updates } : h
    );
    set({ hackathons: updatedHackathons });
  },

  removeHackathon: (id: string) => {
    const { hackathons } = get();
    set({ hackathons: hackathons.filter((h) => h.id !== id) });
  },
}));