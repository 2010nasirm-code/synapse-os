/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - ZOD SCHEMAS
 * ============================================================================
 * 
 * Zod validation schemas for type-safe parsing.
 * 
 * @module nexus/assistant-v3/utils/zodSchemas
 * @version 3.0.0
 */

import { z } from 'zod';

// ============================================================================
// PERSONA SCHEMAS
// ============================================================================

export const PersonaTypeSchema = z.enum(['friendly', 'teacher', 'expert', 'concise']);

export const SkillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const RequestOptionsSchema = z.object({
  stream: z.boolean().optional(),
  maxTokens: z.number().positive().max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  includeProvenance: z.boolean().optional(),
  enableWebSearch: z.boolean().optional(),
  skillLevel: SkillLevelSchema.optional(),
}).strict();

export const UIContextSchema = z.object({
  currentPage: z.string().optional(),
  selectedItems: z.array(z.string()).optional(),
  activeTracker: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  device: z.enum(['mobile', 'tablet', 'desktop']).optional(),
}).strict();

export const AssistantRequestSchema = z.object({
  query: z.string().min(1).max(10000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  persona: PersonaTypeSchema.optional(),
  uiContext: UIContextSchema.optional(),
  options: RequestOptionsSchema.optional(),
});

export type AssistantRequestInput = z.infer<typeof AssistantRequestSchema>;

// ============================================================================
// ACTION SCHEMAS
// ============================================================================

export const ActionTypeSchema = z.enum([
  'create_tracker',
  'update_tracker',
  'delete_tracker',
  'create_automation',
  'update_automation',
  'create_item',
  'update_item',
  'delete_item',
  'create_suggestion',
  'navigate',
  'show_insight',
  'patch_code',
  'create_note',
  'set_reminder',
]);

export const ActionDraftSchema = z.object({
  id: z.string(),
  type: ActionTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  requiresConfirmation: z.boolean(),
  previewText: z.string().optional(),
  explanation: z.string().optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
  expiresAt: z.number().optional(),
});

export type ActionDraftInput = z.infer<typeof ActionDraftSchema>;

// ============================================================================
// MEMORY SCHEMAS
// ============================================================================

export const MemoryTypeSchema = z.enum([
  'conversation',
  'fact',
  'preference',
  'insight',
  'context',
  'summary',
]);

export const MemoryItemSchema = z.object({
  id: z.string().optional(),
  type: MemoryTypeSchema,
  text: z.string().min(1).max(5000),
  embeddingRef: z.string().optional(),
  owner: z.string().optional(),
  consent: z.boolean().optional(),
  ttl: z.number().positive().optional(),
  createdAt: z.number().optional(),
  lastAccessedAt: z.number().optional(),
  importance: z.number().min(0).max(1).optional(),
  relatedNodes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type MemoryItemInput = z.infer<typeof MemoryItemSchema>;

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const AgentRunRequestSchema = z.object({
  agentId: z.string(),
  query: z.string().min(1).max(10000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type AgentRunRequestInput = z.infer<typeof AgentRunRequestSchema>;

// ============================================================================
// APPLY ACTION SCHEMAS
// ============================================================================

export const ApplyActionRequestSchema = z.object({
  token: z.string(),
  userId: z.string(),
  confirm: z.boolean(),
});

export type ApplyActionRequestInput = z.infer<typeof ApplyActionRequestSchema>;

// ============================================================================
// CONSENT SCHEMAS
// ============================================================================

export const ConsentStatusSchema = z.object({
  userId: z.string(),
  memoryConsent: z.boolean(),
  analyticsConsent: z.boolean(),
  personalizationConsent: z.boolean(),
  updatedAt: z.number(),
});

export type ConsentStatusInput = z.infer<typeof ConsentStatusSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Safe parse with error formatting
 */
export function safeParse<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.issues.map(
    e => `${e.path.join('.')}: ${e.message}`
  ).join('; ');

  return { success: false, error: errorMessages };
}

export default {
  PersonaTypeSchema,
  SkillLevelSchema,
  RequestOptionsSchema,
  UIContextSchema,
  AssistantRequestSchema,
  ActionTypeSchema,
  ActionDraftSchema,
  MemoryTypeSchema,
  MemoryItemSchema,
  AgentRunRequestSchema,
  ApplyActionRequestSchema,
  ConsentStatusSchema,
  safeParse,
};

