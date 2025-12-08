/**
 * ============================================================================
 * NEXUS PRIME - HELP SYSTEM
 * ============================================================================
 * 
 * Context-aware help, explanations, and "Do It For Me" functionality.
 * 
 * @module nexus/prime/ux/help-system
 * @version 1.0.0
 */

import { ExplainThis, ContextualHelp } from './types';

// ============================================================================
// FEATURE EXPLANATIONS
// ============================================================================

export const FEATURE_EXPLANATIONS: Record<string, ExplainThis> = {
  // Dashboard
  'dashboard': {
    id: 'dashboard',
    feature: 'Dashboard',
    simpleExplanation: 'Your home screen that shows everything at a glance.',
    example: 'Think of it like your phone\'s home screen - quick access to what matters.',
    canDoForMe: false,
  },

  // Trackers
  'tracker': {
    id: 'tracker',
    feature: 'Tracker',
    simpleExplanation: 'A tracker helps you keep track of things you do regularly.',
    example: 'Like a habit tracker for exercise, or a homework list for school.',
    canDoForMe: true,
    doForMeAction: 'createTracker',
  },
  'add-item': {
    id: 'add-item',
    feature: 'Add Item',
    simpleExplanation: 'Add something new to your tracker.',
    example: 'Adding a new homework assignment or a workout you did.',
    canDoForMe: true,
    doForMeAction: 'addItem',
  },

  // Automations
  'automation': {
    id: 'automation',
    feature: 'Automation',
    simpleExplanation: 'Automations do things automatically so you don\'t have to.',
    example: 'Like automatically marking homework "urgent" if it\'s due tomorrow.',
    canDoForMe: true,
    doForMeAction: 'createAutomation',
  },
  'trigger': {
    id: 'trigger',
    feature: 'Trigger',
    simpleExplanation: 'A trigger is what starts an automation.',
    example: 'When you add a new item, that could be a trigger.',
    canDoForMe: false,
  },

  // Suggestions
  'smart-suggestions': {
    id: 'smart-suggestions',
    feature: 'Smart Suggestions',
    simpleExplanation: 'The AI looks at your data and gives you helpful tips.',
    example: 'It might notice you exercise more on weekends and suggest a routine.',
    canDoForMe: true,
    doForMeAction: 'generateSuggestions',
  },

  // Analytics
  'analytics': {
    id: 'analytics',
    feature: 'Analytics',
    simpleExplanation: 'Charts and stats that show you patterns in your data.',
    example: 'See how your mood changes over time or track your study hours.',
    canDoForMe: false,
  },

  // Settings
  'theme': {
    id: 'theme',
    feature: 'Theme',
    simpleExplanation: 'Change how the app looks - light mode, dark mode, or custom colors.',
    example: 'Make it dark so it\'s easier on your eyes at night.',
    canDoForMe: true,
    doForMeAction: 'setTheme',
  },

  // Agents
  'agents': {
    id: 'agents',
    feature: 'AI Agents',
    simpleExplanation: 'AI helpers that can do specific tasks for you.',
    example: 'One agent helps with insights, another helps build automations.',
    canDoForMe: false,
  },

  // Knowledge
  'knowledge': {
    id: 'knowledge',
    feature: 'Knowledge Base',
    simpleExplanation: 'A place to store notes, facts, and information.',
    example: 'Save study notes or important things you want to remember.',
    canDoForMe: true,
    doForMeAction: 'createNote',
  },

  // Nexus
  'nexus': {
    id: 'nexus',
    feature: 'Nexus',
    simpleExplanation: 'The AI brain that powers everything in the app.',
    example: 'Ask it questions in plain English and it figures out how to help.',
    canDoForMe: false,
  },

  // Mode
  'simple-mode': {
    id: 'simple-mode',
    feature: 'Simple Mode',
    simpleExplanation: 'A cleaner view with only the essential features.',
    example: 'Perfect if you\'re new or just want less clutter.',
    canDoForMe: true,
    doForMeAction: 'setSimpleMode',
  },
  'pro-mode': {
    id: 'pro-mode',
    feature: 'Pro Mode',
    simpleExplanation: 'Unlocks all advanced features and tools.',
    example: 'Full access to automations, agents, and AI features.',
    canDoForMe: true,
    doForMeAction: 'setProMode',
  },
};

// ============================================================================
// CONTEXTUAL HELP
// ============================================================================

export const CONTEXTUAL_HELP: Record<string, ContextualHelp[]> = {
  // Dashboard context
  'dashboard': [
    { id: 'dash-1', context: 'dashboard', tip: 'Click the + button to add a new tracker', action: 'createTracker', priority: 'high' },
    { id: 'dash-2', context: 'dashboard', tip: 'Check Smart Suggestions for helpful tips based on your data', priority: 'medium' },
    { id: 'dash-3', context: 'dashboard', tip: 'Your most important items appear at the top', priority: 'low' },
  ],

  // Tracker context
  'tracker': [
    { id: 'track-1', context: 'tracker', tip: 'Tap an item to mark it complete', priority: 'high' },
    { id: 'track-2', context: 'tracker', tip: 'Swipe left on an item to delete it', priority: 'medium' },
    { id: 'track-3', context: 'tracker', tip: 'Use the filter to see only certain items', priority: 'low' },
  ],

  // Automation context
  'automations': [
    { id: 'auto-1', context: 'automations', tip: 'Start simple: "When I add an item, notify me"', action: 'createAutomation', priority: 'high' },
    { id: 'auto-2', context: 'automations', tip: 'Automations can save you time on repetitive tasks', priority: 'medium' },
    { id: 'auto-3', context: 'automations', tip: 'You can pause an automation without deleting it', priority: 'low' },
  ],

  // Analytics context
  'analytics': [
    { id: 'anal-1', context: 'analytics', tip: 'Add more data to see better insights', priority: 'high' },
    { id: 'anal-2', context: 'analytics', tip: 'Click on a chart to see more details', priority: 'medium' },
    { id: 'anal-3', context: 'analytics', tip: 'Trends show how things change over time', priority: 'low' },
  ],

  // Suggestions context
  'suggestions': [
    { id: 'sug-1', context: 'suggestions', tip: 'Click "Generate" to get new suggestions', action: 'generateSuggestions', priority: 'high' },
    { id: 'sug-2', context: 'suggestions', tip: 'Suggestions are based on your actual data', priority: 'medium' },
    { id: 'sug-3', context: 'suggestions', tip: 'Click a suggestion to see how to apply it', priority: 'low' },
  ],

  // Settings context
  'settings': [
    { id: 'set-1', context: 'settings', tip: 'Try Simple Mode if things feel overwhelming', action: 'setSimpleMode', priority: 'high' },
    { id: 'set-2', context: 'settings', tip: 'Dark mode is easier on your eyes at night', action: 'setTheme', priority: 'medium' },
  ],

  // Empty state
  'empty': [
    { id: 'empty-1', context: 'empty', tip: 'Get started by creating your first tracker!', action: 'createTracker', priority: 'high' },
    { id: 'empty-2', context: 'empty', tip: 'Try a template to set things up quickly', action: 'showTemplates', priority: 'high' },
  ],

  // First time
  'first-time': [
    { id: 'first-1', context: 'first-time', tip: 'Welcome! Let\'s set up your first tracker together', action: 'startOnboarding', priority: 'high' },
  ],
};

// ============================================================================
// HELP FUNCTIONS
// ============================================================================

/**
 * Get explanation for a feature
 */
export function getExplanation(featureId: string): ExplainThis | undefined {
  return FEATURE_EXPLANATIONS[featureId];
}

/**
 * Get contextual help for current page
 */
export function getContextualHelp(context: string): ContextualHelp[] {
  return CONTEXTUAL_HELP[context] || [];
}

/**
 * Get most relevant help tip for context
 */
export function getTopTip(context: string): ContextualHelp | undefined {
  const tips = getContextualHelp(context);
  return tips.find(t => t.priority === 'high') || tips[0];
}

/**
 * Get "Do It For Me" handler
 */
export function getDoForMeHandler(actionId: string): (() => Promise<void>) | undefined {
  const handlers: Record<string, () => Promise<void>> = {
    createTracker: async () => {
      // Will be connected to actual creation logic
      console.log('[DoForMe] Creating tracker...');
    },
    addItem: async () => {
      console.log('[DoForMe] Adding item...');
    },
    createAutomation: async () => {
      console.log('[DoForMe] Creating automation...');
    },
    generateSuggestions: async () => {
      console.log('[DoForMe] Generating suggestions...');
    },
    setTheme: async () => {
      console.log('[DoForMe] Setting theme...');
    },
    setSimpleMode: async () => {
      console.log('[DoForMe] Switching to Simple Mode...');
    },
    setProMode: async () => {
      console.log('[DoForMe] Switching to Pro Mode...');
    },
    createNote: async () => {
      console.log('[DoForMe] Creating note...');
    },
    showTemplates: async () => {
      console.log('[DoForMe] Showing templates...');
    },
    startOnboarding: async () => {
      console.log('[DoForMe] Starting onboarding...');
    },
  };

  return handlers[actionId];
}

// ============================================================================
// FRIENDLY AI RESPONSES
// ============================================================================

export const FRIENDLY_RESPONSES = {
  greeting: [
    "Hey! 👋 How can I help you today?",
    "Hi there! What would you like to do?",
    "Hello! Ready to help whenever you are.",
  ],
  success: [
    "Done! ✨",
    "All set! 🎉",
    "Got it! ✓",
    "Perfect! That's done.",
  ],
  error: [
    "Oops! Something went wrong. Let me try again.",
    "Hmm, that didn't work. Want to try a different way?",
    "My bad! Let me fix that.",
  ],
  encouragement: [
    "You're doing great! 💪",
    "Nice progress! Keep it up!",
    "Awesome work! 🌟",
  ],
  confused: [
    "I'm not sure what you mean. Could you try saying it differently?",
    "Hmm, I didn't quite get that. Can you be more specific?",
    "Sorry, I'm a bit confused. What exactly would you like to do?",
  ],
  waiting: [
    "Working on it...",
    "Just a moment...",
    "Let me figure this out...",
  ],
};

/**
 * Get random friendly response
 */
export function getFriendlyResponse(type: keyof typeof FRIENDLY_RESPONSES): string {
  const responses = FRIENDLY_RESPONSES[type];
  return responses[Math.floor(Math.random() * responses.length)];
}

