// Shared types and utilities for all service modules
import { supabase } from "@/lib/mockBackend";

// Re-export schema types
export type { NestedClass, FlattenedClass } from "@/schemas/academic";

// Environment bucket constants
export const FILES_BUCKET =
  import.meta.env?.VITE_SUPABASE_FILES_BUCKET?.toString() || "FILES_BUCKET";
export const VOICE_NOTES_BUCKET =
  import.meta.env?.VITE_SUPABASE_VOICE_NOTES_BUCKET?.toString() ||
  "FILES_BUCKET";

// Common interfaces
export interface NamedEntity {
  name: string;
}

export interface NamedClass {
  id: string;
  name: string;
}

export interface GradeSubjectOption {
  id: string;
  name: string;
}

export interface FileCategoryOption {
  id: number;
  name: string;
}

// Helper function to resolve name from entity
export const resolveName = (
  entity: NamedEntity | NamedEntity[] | null | undefined
): string | undefined => {
  if (!entity) return undefined;
  if (Array.isArray(entity)) {
    return entity.length > 0 ? entity[0]?.name : undefined;
  }
  return entity.name;
};

// Export supabase instance for use in services
export { supabase };
