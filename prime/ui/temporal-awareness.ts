// ============================================================================
// NEXUS PRIME - TEMPORAL AWARENESS LAYER
// Time-based UI adaptations and scheduling
// ============================================================================

import { globalEvents } from '../core/events';
import { globalState } from '../core/state';
import { getConfig } from '../core/config';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TemporalConfig {
  morning: TemporalModeConfig;
  afternoon: TemporalModeConfig;
  evening: TemporalModeConfig;
  night: TemporalModeConfig;
}

export interface TemporalModeConfig {
  theme: 'light' | 'dark' | 'auto';
  colorTemperature: number; // 0-100 (warm to cool)
  animationIntensity: number; // 0-1
  notificationLevel: 'all' | 'important' | 'none';
  focusMode: boolean;
  suggestionFrequency: 'high' | 'medium' | 'low';
  uiComplexity: 'simple' | 'normal' | 'advanced';
}

export class TemporalAwarenessEngine {
  private static instance: TemporalAwarenessEngine;
  private currentMode: TimeOfDay = 'afternoon';
  private config: TemporalConfig;
  private checkInterval?: NodeJS.Timeout;
  private sunTimes: { sunrise: number; sunset: number } = { sunrise: 6, sunset: 18 };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.startMonitoring();
  }

  static getInstance(): TemporalAwarenessEngine {
    if (!TemporalAwarenessEngine.instance) {
      TemporalAwarenessEngine.instance = new TemporalAwarenessEngine();
    }
    return TemporalAwarenessEngine.instance;
  }

  // ----------------------------- Default Config -----------------------------
  private getDefaultConfig(): TemporalConfig {
    return {
      morning: {
        theme: 'light',
        colorTemperature: 70, // Warm
        animationIntensity: 0.7,
        notificationLevel: 'important',
        focusMode: false,
        suggestionFrequency: 'medium',
        uiComplexity: 'simple', // Easier to start the day
      },
      afternoon: {
        theme: 'light',
        colorTemperature: 50, // Neutral
        animationIntensity: 1.0,
        notificationLevel: 'all',
        focusMode: false,
        suggestionFrequency: 'high',
        uiComplexity: 'normal',
      },
      evening: {
        theme: 'auto',
        colorTemperature: 30, // Warmer
        animationIntensity: 0.8,
        notificationLevel: 'important',
        focusMode: false,
        suggestionFrequency: 'medium',
        uiComplexity: 'normal',
      },
      night: {
        theme: 'dark',
        colorTemperature: 20, // Very warm
        animationIntensity: 0.5,
        notificationLevel: 'none',
        focusMode: true,
        suggestionFrequency: 'low',
        uiComplexity: 'simple', // Calm down for sleep
      },
    };
  }

  // ----------------------------- Monitoring ---------------------------------
  private startMonitoring(): void {
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkAndUpdateMode();
    }, 60000);

    // Initial check
    this.checkAndUpdateMode();
  }

  private checkAndUpdateMode(): void {
    const config = getConfig().ui;
    if (!config.temporalAwareness) return;

    const newMode = this.detectTimeOfDay();
    
    if (newMode !== this.currentMode) {
      const oldMode = this.currentMode;
      this.currentMode = newMode;
      this.applyTemporalMode(newMode);

      globalEvents.emit('temporal:mode-change', { from: oldMode, to: newMode });
    }
  }

  private detectTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();

    // Use sunrise/sunset for more accurate detection
    if (hour >= this.sunTimes.sunrise && hour < 12) {
      return 'morning';
    } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
    } else if (hour >= 17 && hour < this.sunTimes.sunset + 2) {
      return 'evening';
    } else {
      return 'night';
    }
  }

  // ----------------------------- Mode Application ---------------------------
  private applyTemporalMode(mode: TimeOfDay): void {
    const modeConfig = this.config[mode];
    
    // Apply theme
    if (modeConfig.theme !== 'auto') {
      globalState.setKey('ui', prev => ({ ...prev, theme: modeConfig.theme as 'light' | 'dark' }));
    }

    // Update temporal mode in global state
    globalState.setKey('ui', prev => ({ ...prev, temporalMode: mode }));

    // Apply CSS variables
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Color temperature (affects warm/cool tint)
      root.style.setProperty('--temporal-warmth', `${modeConfig.colorTemperature}%`);
      
      // Animation intensity
      root.style.setProperty('--temporal-animation', String(modeConfig.animationIntensity));
      
      // Set data attribute
      root.setAttribute('data-temporal-mode', mode);
      root.setAttribute('data-ui-complexity', modeConfig.uiComplexity);
    }

    // Emit detailed event
    globalEvents.emit('temporal:config-applied', { mode, config: modeConfig });
  }

  // ----------------------------- Configuration ------------------------------
  setModeConfig(mode: TimeOfDay, config: Partial<TemporalModeConfig>): void {
    this.config[mode] = { ...this.config[mode], ...config };
    
    // Re-apply if current mode
    if (mode === this.currentMode) {
      this.applyTemporalMode(mode);
    }
  }

  setSunTimes(sunrise: number, sunset: number): void {
    this.sunTimes = { sunrise, sunset };
    this.checkAndUpdateMode();
  }

  // ----------------------------- Manual Override ----------------------------
  forceMode(mode: TimeOfDay): void {
    this.currentMode = mode;
    this.applyTemporalMode(mode);
  }

  resetToAuto(): void {
    this.checkAndUpdateMode();
  }

  // ----------------------------- Special Time Detection ---------------------
  isProductiveHours(): boolean {
    const hour = new Date().getHours();
    // Typical productive hours: 9 AM - 6 PM
    return hour >= 9 && hour < 18;
  }

  isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  getDayOfWeek(): DayOfWeek {
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  // ----------------------------- Scheduled Events ---------------------------
  scheduleTemporalEvent(
    time: { hour: number; minute?: number },
    callback: () => void
  ): () => void {
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === time.hour && 
          (time.minute === undefined || now.getMinutes() === time.minute)) {
        callback();
      }
    };

    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }

  // ----------------------------- Getters ------------------------------------
  getCurrentMode(): TimeOfDay {
    return this.currentMode;
  }

  getCurrentConfig(): TemporalModeConfig {
    return { ...this.config[this.currentMode] };
  }

  getFullConfig(): TemporalConfig {
    return { ...this.config };
  }

  // ----------------------------- Cleanup ------------------------------------
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const temporalAwareness = TemporalAwarenessEngine.getInstance();

