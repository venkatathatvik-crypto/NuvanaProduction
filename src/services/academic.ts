/**
 * Academic Services - Main Entry Point
 * 
 * This file re-exports all academic services from the modular service files.
 * All existing imports from "@/services/academic" will continue to work.
 * 
 * The services have been organized into:
 * - types.ts: Shared types and utilities
 * - classService.ts: Class, grade, subject operations
 * - fileService.ts: File upload/download
 * - announcementService.ts: Announcements
 * - studentDataService.ts: Student profile data
 * - attendanceService.ts: Attendance tracking
 * - academicLegacy.ts: Test, grading, voice notes, analytics (to be migrated)
 */

export * from "./index";

