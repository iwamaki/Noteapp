/**
 * @file fileSystemPaths.ts
 * @summary File system path constants
 * @description
 * Centralizes all path and filename constants for the file storage system.
 */

import { Paths, Directory } from 'expo-file-system';

// =============================================================================
// Directory Paths
// =============================================================================

/**
 * Base directory for the app: noteapp/
 */
export const BASE_DIR = new Directory(Paths.document, 'noteapp');

/**
 * Content directory where all files are stored: noteapp/content/
 */
export const CONTENT_DIR = new Directory(BASE_DIR, 'content');

// =============================================================================
// File Names
// =============================================================================

/**
 * Metadata filename: meta.json
 */
export const FILE_METADATA_FILENAME = 'meta.json';

/**
 * Content filename: content.md
 */
export const FILE_CONTENT_FILENAME = 'content.md';
