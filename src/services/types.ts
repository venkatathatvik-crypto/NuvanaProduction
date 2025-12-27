// Shared types and utilities for all service modules

// Re-export schema types
export type { NestedClass, FlattenedClass } from "@/schemas/academic";

// Legacy constants - no longer used as we now use backend storage APIs
// Kept for backward compatibility in case any code still references them
export const FILES_BUCKET = "FILES_BUCKET";
export const VOICE_NOTES_BUCKET = "VOICE_NOTES_BUCKET";

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

// Supabase has been removed - all services now use backend APIs
