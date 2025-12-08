// Zustand Theme Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeConfig, defaultTheme, themePresets, themeEngine } from '@/lib/theme/theme-engine';

interface ThemeStore {
  config: ThemeConfig;
  setConfig: (updates: Partial<ThemeConfig>) => void;
  applyPreset: (preset: string) => void;
  generateFromPrompt: (prompt: string) => void;
  reset: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      config: defaultTheme,
      
      setConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates }
        }));
        themeEngine.setConfig(updates);
      },
      
      applyPreset: (preset) => {
        const presetConfig = themePresets[preset];
        if (presetConfig) {
          set((state) => ({
            config: { ...state.config, ...presetConfig, preset }
          }));
          themeEngine.applyPreset(preset);
        }
      },
      
      generateFromPrompt: (prompt) => {
        const generated = themeEngine.generateFromPrompt(prompt);
        set((state) => ({
          config: { ...state.config, ...generated, preset: 'custom' }
        }));
        themeEngine.setConfig(generated);
      },
      
      reset: () => {
        set({ config: defaultTheme });
        themeEngine.reset();
      },
    }),
    {
      name: 'nexus-theme-storage',
    }
  )
);


