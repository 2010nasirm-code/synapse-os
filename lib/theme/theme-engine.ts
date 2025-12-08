// Advanced Theme Engine with Live Customization
export interface ThemeConfig {
  // Base colors
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  
  // Effects
  blur: number;           // 0-20px
  cornerRadius: number;   // 0-24px
  spacing: number;        // multiplier 0.5-2
  
  // Special effects
  glassEnabled: boolean;
  neonEnabled: boolean;
  gradientEnabled: boolean;
  
  // Neon settings
  neonColor: string;
  neonIntensity: number;  // 0-100
  
  // Gradient settings
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  
  // Animation
  animationSpeed: number; // 0.5-2
  
  // Mode
  mode: 'light' | 'dark' | 'system';
  preset: string;
}

export const defaultTheme: ThemeConfig = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#0a0a0f',
  foreground: '#fafafa',
  muted: '#27272a',
  border: '#3f3f46',
  blur: 12,
  cornerRadius: 12,
  spacing: 1,
  glassEnabled: true,
  neonEnabled: false,
  gradientEnabled: true,
  neonColor: '#00ffff',
  neonIntensity: 50,
  gradientStart: '#6366f1',
  gradientEnd: '#8b5cf6',
  gradientAngle: 135,
  animationSpeed: 1,
  mode: 'dark',
  preset: 'nexus',
};

export const themePresets: Record<string, Partial<ThemeConfig>> = {
  nexus: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    neonEnabled: true,
    neonColor: '#00ffff',
    glassEnabled: true,
  },
  cyberpunk: {
    primary: '#ff00ff',
    secondary: '#00ffff',
    accent: '#ffff00',
    neonEnabled: true,
    neonColor: '#ff00ff',
    neonIntensity: 80,
    background: '#0d0d0d',
  },
  forest: {
    primary: '#22c55e',
    secondary: '#16a34a',
    accent: '#84cc16',
    background: '#0f1f0f',
    neonEnabled: false,
    glassEnabled: true,
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    accent: '#14b8a6',
    background: '#0c1929',
    gradientEnabled: true,
    gradientStart: '#0ea5e9',
    gradientEnd: '#14b8a6',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#ef4444',
    accent: '#eab308',
    background: '#1a0f0f',
    gradientEnabled: true,
    gradientStart: '#f97316',
    gradientEnd: '#ef4444',
  },
  minimal: {
    primary: '#71717a',
    secondary: '#a1a1aa',
    accent: '#fafafa',
    background: '#09090b',
    neonEnabled: false,
    glassEnabled: false,
    gradientEnabled: false,
    blur: 0,
  },
  aurora: {
    primary: '#a855f7',
    secondary: '#ec4899',
    accent: '#06b6d4',
    neonEnabled: true,
    neonColor: '#a855f7',
    gradientEnabled: true,
    gradientStart: '#a855f7',
    gradientEnd: '#06b6d4',
  },
};

export class ThemeEngine {
  private config: ThemeConfig;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): ThemeConfig {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      const stored = localStorage.getItem('nexus_theme');
      return stored ? { ...defaultTheme, ...JSON.parse(stored) } : defaultTheme;
    } catch {
      return defaultTheme;
    }
  }

  private saveConfig() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nexus_theme', JSON.stringify(this.config));
  }

  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  setConfig(updates: Partial<ThemeConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.applyToDOM();
    this.notifyListeners();
  }

  applyPreset(presetName: string) {
    const preset = themePresets[presetName];
    if (preset) {
      this.setConfig({ ...preset, preset: presetName });
    }
  }

  subscribe(listener: (config: ThemeConfig) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.config));
  }

  applyToDOM() {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    const { config } = this;
    
    // Apply CSS variables
    root.style.setProperty('--theme-primary', config.primary);
    root.style.setProperty('--theme-secondary', config.secondary);
    root.style.setProperty('--theme-accent', config.accent);
    root.style.setProperty('--theme-background', config.background);
    root.style.setProperty('--theme-foreground', config.foreground);
    root.style.setProperty('--theme-muted', config.muted);
    root.style.setProperty('--theme-border', config.border);
    root.style.setProperty('--theme-blur', `${config.blur}px`);
    root.style.setProperty('--theme-radius', `${config.cornerRadius}px`);
    root.style.setProperty('--theme-spacing', `${config.spacing}`);
    root.style.setProperty('--theme-animation-speed', `${config.animationSpeed}`);
    
    // Neon effect
    if (config.neonEnabled) {
      root.style.setProperty('--theme-neon-color', config.neonColor);
      root.style.setProperty('--theme-neon-glow', `0 0 ${config.neonIntensity / 5}px ${config.neonColor}, 0 0 ${config.neonIntensity / 2}px ${config.neonColor}`);
    } else {
      root.style.setProperty('--theme-neon-glow', 'none');
    }
    
    // Gradient
    if (config.gradientEnabled) {
      root.style.setProperty('--theme-gradient', `linear-gradient(${config.gradientAngle}deg, ${config.gradientStart}, ${config.gradientEnd})`);
    } else {
      root.style.setProperty('--theme-gradient', 'none');
    }
    
    // Glass effect
    if (config.glassEnabled) {
      root.style.setProperty('--theme-glass', `rgba(255, 255, 255, 0.05)`);
      root.style.setProperty('--theme-glass-blur', `${config.blur}px`);
    } else {
      root.style.setProperty('--theme-glass', 'transparent');
      root.style.setProperty('--theme-glass-blur', '0px');
    }
    
    // Dark/light mode class
    root.classList.remove('light', 'dark');
    root.classList.add(config.mode === 'system' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
      config.mode
    );
  }

  generateFromPrompt(prompt: string): Partial<ThemeConfig> {
    // AI-style theme generation based on keywords
    const keywords = prompt.toLowerCase();
    
    const generated: Partial<ThemeConfig> = {};
    
    // Color detection
    if (keywords.includes('blue') || keywords.includes('ocean') || keywords.includes('calm')) {
      generated.primary = '#3b82f6';
      generated.secondary = '#0ea5e9';
      generated.accent = '#06b6d4';
    } else if (keywords.includes('red') || keywords.includes('fire') || keywords.includes('energy')) {
      generated.primary = '#ef4444';
      generated.secondary = '#f97316';
      generated.accent = '#eab308';
    } else if (keywords.includes('green') || keywords.includes('nature') || keywords.includes('forest')) {
      generated.primary = '#22c55e';
      generated.secondary = '#10b981';
      generated.accent = '#84cc16';
    } else if (keywords.includes('purple') || keywords.includes('magic') || keywords.includes('mystical')) {
      generated.primary = '#a855f7';
      generated.secondary = '#8b5cf6';
      generated.accent = '#ec4899';
    } else if (keywords.includes('pink') || keywords.includes('love') || keywords.includes('soft')) {
      generated.primary = '#ec4899';
      generated.secondary = '#f472b6';
      generated.accent = '#fb7185';
    }
    
    // Effect detection
    if (keywords.includes('neon') || keywords.includes('glow') || keywords.includes('cyber')) {
      generated.neonEnabled = true;
      generated.neonIntensity = 70;
    }
    
    if (keywords.includes('glass') || keywords.includes('frosted') || keywords.includes('blur')) {
      generated.glassEnabled = true;
      generated.blur = 16;
    }
    
    if (keywords.includes('gradient') || keywords.includes('smooth') || keywords.includes('flow')) {
      generated.gradientEnabled = true;
    }
    
    if (keywords.includes('sharp') || keywords.includes('modern')) {
      generated.cornerRadius = 4;
    } else if (keywords.includes('round') || keywords.includes('soft')) {
      generated.cornerRadius = 20;
    }
    
    if (keywords.includes('minimal') || keywords.includes('clean') || keywords.includes('simple')) {
      generated.neonEnabled = false;
      generated.gradientEnabled = false;
      generated.glassEnabled = false;
    }
    
    if (keywords.includes('fast') || keywords.includes('snappy')) {
      generated.animationSpeed = 0.5;
    } else if (keywords.includes('slow') || keywords.includes('smooth')) {
      generated.animationSpeed = 1.5;
    }
    
    return generated;
  }

  reset() {
    this.config = { ...defaultTheme };
    this.saveConfig();
    this.applyToDOM();
    this.notifyListeners();
  }
}

export const themeEngine = new ThemeEngine();


