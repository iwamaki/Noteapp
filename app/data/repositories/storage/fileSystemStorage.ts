/**
 * @file fileSystemStorage.ts
 * @summary Low-level file I/O operations
 * @description
 * Handles all direct file system operations including reading, writing,
 * and deleting metadata and content files.
 */

import { Directory, File as FSFile } from 'expo-file-system';
import type { FileMetadataFlat, FileLine } from '../../core/typesFlat';
import { FileSystemV2Error } from '../../core/errors';
import {
  BASE_DIR,
  CONTENT_DIR,
  FILE_METADATA_FILENAME,
  FILE_CONTENT_FILENAME,
} from './fileSystemPaths';

// =============================================================================
// File Metadata Operations
// =============================================================================

/**
 * Reads file metadata from disk
 *
 * @param fileDir - File directory
 * @returns File metadata or null if not found
 */
export const readFileMetadata = async (
  fileDir: Directory
): Promise<FileMetadataFlat | null> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    if (!(await metadataFile.exists)) {
      return null;
    }
    const text = await metadataFile.text();
    return JSON.parse(text) as FileMetadataFlat;
  } catch (e) {
    console.error('Failed to read file metadata:', e);
    return null;
  }
};

/**
 * Writes file metadata to disk
 *
 * @param fileDir - File directory
 * @param metadata - File metadata to write
 */
export const writeFileMetadata = async (
  fileDir: Directory,
  metadata: FileMetadataFlat
): Promise<void> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write file metadata',
      'WRITE_METADATA_ERROR',
      e
    );
  }
};

// =============================================================================
// File Content Operations
// =============================================================================

/**
 * Reads file content from disk
 *
 * @param fileDir - File directory
 * @returns File content or null if not found
 */
export const readFileContent = async (fileDir: Directory): Promise<string | null> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    if (!(await contentFile.exists)) {
      return null;
    }
    return await contentFile.text();
  } catch (e) {
    console.error('Failed to read file content:', e);
    return null;
  }
};

/**
 * Writes file content to disk
 *
 * @param fileDir - File directory
 * @param content - File content to write
 */
export const writeFileContent = async (fileDir: Directory, content: string): Promise<void> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write file content',
      'WRITE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * Reads file content as an array of lines
 *
 * @param fileDir - File directory
 * @returns Array of lines with line numbers (1-based) or null if not found
 *
 * @remarks
 * - Handles multiple newline formats: \r\n (Windows), \n (Unix/Mac), \r (old Mac)
 * - Removes newline characters from each line
 * - Empty lines are preserved as empty strings
 * - Trailing newline does not create an extra empty line
 *
 * @example
 * // File content: "line1\nline2\nline3\n"
 * // Returns: [
 * //   { lineNumber: 1, content: "line1" },
 * //   { lineNumber: 2, content: "line2" },
 * //   { lineNumber: 3, content: "line3" }
 * // ]
 */
export const readFileContentAsLines = async (fileDir: Directory): Promise<FileLine[] | null> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    if (!(await contentFile.exists)) {
      return null;
    }

    const content = await contentFile.text();

    // Handle empty file
    if (content === '') {
      return [];
    }

    // Split by any newline format: \r\n, \n, or \r
    const rawLines = content.split(/\r\n|\r|\n/);

    // Remove trailing empty line if it exists (caused by final newline character)
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }

    // Map to FileLine with 1-based line numbers
    return rawLines.map((line, index) => ({
      lineNumber: index + 1,
      content: line,
    }));
  } catch (e) {
    console.error('Failed to read file content as lines:', e);
    return null;
  }
};

// =============================================================================
// File Directory Operations
// =============================================================================

/**
 * Deletes a file directory and all its contents
 *
 * @param fileDir - File directory to delete
 */
export const deleteFileDirectory = async (fileDir: Directory): Promise<void> => {
  try {
    if (await fileDir.exists) {
      await fileDir.delete();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to delete file directory',
      'DELETE_FILE_DIR_ERROR',
      e
    );
  }
};

// =============================================================================
// File System Initialization
// =============================================================================

/**
 * Initializes the file system by creating necessary directories
 */
export const initializeFileSystemFlat = async (): Promise<void> => {
  try {
    // Create base directory
    if (!(await BASE_DIR.exists)) {
      await BASE_DIR.create();
    }

    // Create content directory
    if (!(await CONTENT_DIR.exists)) {
      await CONTENT_DIR.create();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to initialize file system',
      'INIT_FILE_SYSTEM_ERROR',
      e
    );
  }
};
