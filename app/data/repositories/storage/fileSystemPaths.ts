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

/**
 * Subdirectory name for version history: versions
 */
export const VERSIONS_DIR_NAME = 'versions';

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

/**
 * Version metadata filename: version_meta.json
 */
export const VERSION_METADATA_FILENAME = 'version_meta.json';

/**
 * Version content filename: version_content.md
 */
export const VERSION_CONTENT_FILENAME = 'version_content.md';
