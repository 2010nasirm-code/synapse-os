/**
 * Database Utilities
 * Wrapper for Supabase database operations
 */

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (uses existing app config)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const db = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Generic CRUD helpers
export async function query<T>(
  table: string,
  options: {
    select?: string;
    filter?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
  } = {}
): Promise<T[]> {
  if (!db) return [];

  let q = db.from(table).select(options.select || "*");

  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      q = q.eq(key, value);
    });
  }

  if (options.order) {
    q = q.order(options.order.column, { ascending: options.order.ascending ?? true });
  }

  if (options.limit) {
    q = q.limit(options.limit);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as T[]) || [];
}

export async function insert<T>(
  table: string,
  data: Partial<T> | Partial<T>[]
): Promise<T[]> {
  if (!db) return [];

  const { data: result, error } = await db
    .from(table)
    .insert(data as any)
    .select();

  if (error) throw error;
  return (result as T[]) || [];
}

export async function update<T>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  if (!db) return null;

  const { data: result, error } = await db
    .from(table)
    .update(data as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return result as T;
}

export async function remove(table: string, id: string): Promise<boolean> {
  if (!db) return false;

  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw error;
  return true;
}

// Nexus-specific tables
export const NexusTables = {
  MEMORY: "nexus_memory",
  AUTOMATIONS: "nexus_automations",
  LOGS: "nexus_logs",
  QUERIES: "nexus_queries",
} as const;

