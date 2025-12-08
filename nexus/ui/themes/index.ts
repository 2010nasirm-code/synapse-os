// ============================================================================
// NEXUS UI - Theme System
// ============================================================================

export interface NexusTheme {
  name: string;
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  effects: {
    blur: number;
    radius: number;
    shadow: string;
    glow: boolean;
    glassmorphism: boolean;
    neon: boolean;
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    baseFontSize: number;
    lineHeight: number;
  };
  spacing: {
    unit: number;
    containerPadding: number;
  };
  animation: {
    duration: number;
    easing: string;
  };
}

export const defaultDarkTheme: NexusTheme = {
  name: 'Nexus Dark',
  mode: 'dark',
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#22d3ee',
    background: '#0a0a0f',
    surface: '#141419',
    text: '#fafafa',
    textMuted: '#71717a',
    border: '#27272a',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  effects: {
    blur: 12,
    radius: 12,
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    glow: true,
    glassmorphism: true,
    neon: false,
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace',
    baseFontSize: 14,
    lineHeight: 1.5,
  },
  spacing: {
    unit: 4,
    containerPadding: 24,
  },
  animation: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const defaultLightTheme: NexusTheme = {
  ...defaultDarkTheme,
  name: 'Nexus Light',
  mode: 'light',
  colors: {
    primary: '#4f46e5',
    secondary: '#7c3aed',
    accent: '#0891b2',
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#18181b',
    textMuted: '#71717a',
    border: '#e4e4e7',
    error: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    info: '#2563eb',
  },
};

export const neonTheme: NexusTheme = {
  ...defaultDarkTheme,
  name: 'Neon',
  colors: {
    ...defaultDarkTheme.colors,
    primary: '#00ff88',
    secondary: '#ff00ff',
    accent: '#00ffff',
    background: '#000000',
    surface: '#0d0d0d',
  },
  effects: {
    ...defaultDarkTheme.effects,
    glow: true,
    neon: true,
  },
};

export const themes: Record<string, NexusTheme> = {
  'nexus-dark': defaultDarkTheme,
  'nexus-light': defaultLightTheme,
  neon: neonTheme,
};

export function applyTheme(theme: NexusTheme): void {
  const root = document.documentElement;

  // Apply colors
  root.style.setProperty('--nexus-primary', theme.colors.primary);
  root.style.setProperty('--nexus-secondary', theme.colors.secondary);
  root.style.setProperty('--nexus-accent', theme.colors.accent);
  root.style.setProperty('--nexus-background', theme.colors.background);
  root.style.setProperty('--nexus-surface', theme.colors.surface);
  root.style.setProperty('--nexus-text', theme.colors.text);
  root.style.setProperty('--nexus-text-muted', theme.colors.textMuted);
  root.style.setProperty('--nexus-border', theme.colors.border);

  // Apply effects
  root.style.setProperty('--nexus-blur', `${theme.effects.blur}px`);
  root.style.setProperty('--nexus-radius', `${theme.effects.radius}px`);
  root.style.setProperty('--nexus-shadow', theme.effects.shadow);

  // Apply spacing
  root.style.setProperty('--nexus-spacing-unit', `${theme.spacing.unit}px`);

  // Apply animation
  root.style.setProperty('--nexus-animation-duration', `${theme.animation.duration}ms`);
  root.style.setProperty('--nexus-animation-easing', theme.animation.easing);

  // Toggle mode class
  root.classList.remove('light', 'dark');
  root.classList.add(theme.mode);
}

export function getTheme(name: string): NexusTheme {
  return themes[name] || defaultDarkTheme;
}


