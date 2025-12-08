/**
 * ============================================================================
 * NEXUS PRIME - TEMPLATE SYSTEM
 * ============================================================================
 * 
 * Pre-built templates for common use cases.
 * 
 * @module nexus/prime/ux/templates
 * @version 1.0.0
 */

import { Template, TemplateCategory } from './types';

// ============================================================================
// STARTER TEMPLATES
// ============================================================================

export const TEMPLATES: Template[] = [
  // --------------------------------
  // HABITS
  // --------------------------------
  {
    id: 'habit-daily',
    name: 'Daily Habits',
    description: 'Track your daily habits like exercise, reading, or meditation',
    category: 'habits',
    icon: '✨',
    color: '#10b981',
    forBeginners: true,
    popularity: 95,
    fields: [
      { name: 'name', type: 'text', label: 'Habit Name', placeholder: 'e.g., Morning exercise', required: true },
      { name: 'completed', type: 'boolean', label: 'Completed Today', defaultValue: false },
      { name: 'streak', type: 'number', label: 'Current Streak', defaultValue: 0 },
      { name: 'notes', type: 'text', label: 'Notes', placeholder: 'How did it go?' },
    ],
    defaultValues: {
      category: 'habits',
      priority: 'medium',
    },
  },
  {
    id: 'habit-weekly',
    name: 'Weekly Goals',
    description: 'Set and track goals for the week',
    category: 'habits',
    icon: '🎯',
    color: '#6366f1',
    forBeginners: true,
    popularity: 88,
    fields: [
      { name: 'goal', type: 'text', label: 'Goal', placeholder: 'What do you want to achieve?', required: true },
      { name: 'progress', type: 'number', label: 'Progress %', defaultValue: 0 },
      { name: 'deadline', type: 'date', label: 'Due Date' },
    ],
  },

  // --------------------------------
  // FITNESS
  // --------------------------------
  {
    id: 'fitness-workout',
    name: 'Workout Log',
    description: 'Track your workouts, sets, and reps',
    category: 'fitness',
    icon: '💪',
    color: '#ef4444',
    forBeginners: true,
    popularity: 90,
    fields: [
      { name: 'exercise', type: 'text', label: 'Exercise', placeholder: 'e.g., Push-ups', required: true },
      { name: 'sets', type: 'number', label: 'Sets', defaultValue: 3 },
      { name: 'reps', type: 'number', label: 'Reps', defaultValue: 10 },
      { name: 'weight', type: 'number', label: 'Weight (lbs)' },
      { name: 'notes', type: 'text', label: 'Notes' },
    ],
  },
  {
    id: 'fitness-steps',
    name: 'Step Counter',
    description: 'Track your daily steps and walking goals',
    category: 'fitness',
    icon: '🚶',
    color: '#f59e0b',
    forBeginners: true,
    popularity: 85,
    fields: [
      { name: 'steps', type: 'number', label: 'Steps', required: true },
      { name: 'goal', type: 'number', label: 'Daily Goal', defaultValue: 10000 },
      { name: 'distance', type: 'number', label: 'Distance (miles)' },
    ],
  },

  // --------------------------------
  // SCHOOL
  // --------------------------------
  {
    id: 'school-homework',
    name: 'Homework Tracker',
    description: 'Keep track of assignments and due dates',
    category: 'school',
    icon: '📚',
    color: '#8b5cf6',
    forBeginners: true,
    popularity: 92,
    fields: [
      { name: 'subject', type: 'text', label: 'Subject', placeholder: 'e.g., Math', required: true },
      { name: 'assignment', type: 'text', label: 'Assignment', required: true },
      { name: 'dueDate', type: 'date', label: 'Due Date', required: true },
      { name: 'status', type: 'select', label: 'Status', options: ['Not Started', 'In Progress', 'Done'], defaultValue: 'Not Started' },
      { name: 'priority', type: 'select', label: 'Priority', options: ['Low', 'Medium', 'High'], defaultValue: 'Medium' },
    ],
  },
  {
    id: 'school-grades',
    name: 'Grade Tracker',
    description: 'Track your grades and GPA',
    category: 'school',
    icon: '📝',
    color: '#06b6d4',
    forBeginners: true,
    popularity: 78,
    fields: [
      { name: 'subject', type: 'text', label: 'Subject', required: true },
      { name: 'assignment', type: 'text', label: 'Assignment', required: true },
      { name: 'grade', type: 'number', label: 'Grade %' },
      { name: 'weight', type: 'number', label: 'Weight %', defaultValue: 100 },
    ],
  },

  // --------------------------------
  // MOOD
  // --------------------------------
  {
    id: 'mood-daily',
    name: 'Mood Journal',
    description: 'Track how you feel each day',
    category: 'mood',
    icon: '😊',
    color: '#ec4899',
    forBeginners: true,
    popularity: 87,
    fields: [
      { name: 'mood', type: 'rating', label: 'How are you feeling?', required: true },
      { name: 'energy', type: 'rating', label: 'Energy Level' },
      { name: 'notes', type: 'text', label: 'What happened today?', placeholder: 'Write about your day...' },
      { name: 'gratitude', type: 'text', label: 'What are you grateful for?' },
    ],
  },

  // --------------------------------
  // SLEEP
  // --------------------------------
  {
    id: 'sleep-tracker',
    name: 'Sleep Log',
    description: 'Track your sleep patterns and quality',
    category: 'sleep',
    icon: '😴',
    color: '#3b82f6',
    forBeginners: true,
    popularity: 83,
    fields: [
      { name: 'bedtime', type: 'text', label: 'Bedtime', placeholder: '10:30 PM', required: true },
      { name: 'wakeTime', type: 'text', label: 'Wake Time', placeholder: '7:00 AM', required: true },
      { name: 'quality', type: 'rating', label: 'Sleep Quality' },
      { name: 'notes', type: 'text', label: 'Notes', placeholder: 'How did you sleep?' },
    ],
  },

  // --------------------------------
  // GOALS
  // --------------------------------
  {
    id: 'goals-simple',
    name: 'Simple Goals',
    description: 'Set and track your personal goals',
    category: 'goals',
    icon: '🌟',
    color: '#eab308',
    forBeginners: true,
    popularity: 91,
    fields: [
      { name: 'goal', type: 'text', label: 'Goal', placeholder: 'What do you want to achieve?', required: true },
      { name: 'why', type: 'text', label: 'Why is this important?', placeholder: 'Your motivation...' },
      { name: 'deadline', type: 'date', label: 'Target Date' },
      { name: 'progress', type: 'number', label: 'Progress %', defaultValue: 0 },
      { name: 'status', type: 'select', label: 'Status', options: ['Planning', 'In Progress', 'Achieved'], defaultValue: 'Planning' },
    ],
  },

  // --------------------------------
  // FINANCE
  // --------------------------------
  {
    id: 'finance-expenses',
    name: 'Expense Tracker',
    description: 'Track your daily spending',
    category: 'finance',
    icon: '💰',
    color: '#22c55e',
    forBeginners: true,
    popularity: 86,
    fields: [
      { name: 'description', type: 'text', label: 'What did you buy?', required: true },
      { name: 'amount', type: 'number', label: 'Amount ($)', required: true },
      { name: 'category', type: 'select', label: 'Category', options: ['Food', 'Entertainment', 'Transport', 'Shopping', 'Other'], defaultValue: 'Other' },
      { name: 'date', type: 'date', label: 'Date' },
    ],
  },
  {
    id: 'finance-savings',
    name: 'Savings Goal',
    description: 'Track progress towards a savings goal',
    category: 'finance',
    icon: '🎁',
    color: '#14b8a6',
    forBeginners: true,
    popularity: 80,
    fields: [
      { name: 'goal', type: 'text', label: 'What are you saving for?', placeholder: 'e.g., New phone', required: true },
      { name: 'target', type: 'number', label: 'Target Amount ($)', required: true },
      { name: 'saved', type: 'number', label: 'Amount Saved ($)', defaultValue: 0 },
    ],
  },
];

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter(t => t.category === category);
}

/**
 * Get beginner-friendly templates
 */
export function getBeginnerTemplates(): Template[] {
  return TEMPLATES.filter(t => t.forBeginners);
}

/**
 * Get popular templates
 */
export function getPopularTemplates(limit = 5): Template[] {
  return [...TEMPLATES].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}

/**
 * Get recommended templates based on user behavior
 */
export function getRecommendedTemplates(
  existingTrackers: string[],
  limit = 3
): Template[] {
  // If user has no trackers, recommend the most beginner-friendly
  if (existingTrackers.length === 0) {
    return getPopularTemplates(limit).filter(t => t.forBeginners);
  }

  // Find categories user hasn't tried
  const usedCategories = new Set(
    TEMPLATES.filter(t => existingTrackers.includes(t.id)).map(t => t.category)
  );

  const newCategoryTemplates = TEMPLATES.filter(
    t => !usedCategories.has(t.category) && t.forBeginners
  );

  if (newCategoryTemplates.length >= limit) {
    return newCategoryTemplates.slice(0, limit);
  }

  // Fill with popular templates
  const remaining = limit - newCategoryTemplates.length;
  const popular = getPopularTemplates(remaining + 5).filter(
    t => !existingTrackers.includes(t.id)
  );

  return [...newCategoryTemplates, ...popular].slice(0, limit);
}

/**
 * Get all categories
 */
export function getAllCategories(): TemplateCategory[] {
  const categories = new Set(TEMPLATES.map(t => t.category));
  return Array.from(categories) as TemplateCategory[];
}

/**
 * Get category metadata
 */
export const CATEGORY_METADATA: Record<TemplateCategory, { name: string; icon: string; color: string }> = {
  habits: { name: 'Habits', icon: '✨', color: '#10b981' },
  fitness: { name: 'Fitness', icon: '💪', color: '#ef4444' },
  school: { name: 'School', icon: '📚', color: '#8b5cf6' },
  mood: { name: 'Mood', icon: '😊', color: '#ec4899' },
  sleep: { name: 'Sleep', icon: '😴', color: '#3b82f6' },
  goals: { name: 'Goals', icon: '🌟', color: '#eab308' },
  finance: { name: 'Finance', icon: '💰', color: '#22c55e' },
  work: { name: 'Work', icon: '💼', color: '#6366f1' },
  health: { name: 'Health', icon: '❤️', color: '#f43f5e' },
  custom: { name: 'Custom', icon: '⚙️', color: '#64748b' },
};

