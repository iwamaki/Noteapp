/**
 * @file fileSystemStorage.ts
 * @summary Low-level file I/O operations
 * @description
 * Handles all direct file system operations including reading, writing,
 * and deleting metadata and content files.
 */

import { Directory, File as FSFile } from 'expo-file-system';
import type { FileMetadataFlat, VersionMetadataFlat } from '../../core/typesFlat';
import { FileSystemV2Error } from '../../core/errors';
import {
  BASE_DIR,
  CONTENT_DIR,
  FILE_METADATA_FILENAME,
  FILE_CONTENT_FILENAME,
  VERSION_METADATA_FILENAME,
  VERSION_CONTENT_FILENAME,
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
// Version Metadata Operations
// =============================================================================

/**
 * Reads version metadata from disk
 *
 * @param versionDir - Version directory
 * @returns Version metadata or null if not found
 */
export const readVersionMetadata = async (
  versionDir: Directory
): Promise<VersionMetadataFlat | null> => {
  try {
    const metadataFile = new FSFile(versionDir, VERSION_METADATA_FILENAME);
    if (!(await metadataFile.exists)) {
      return null;
    }
    const text = await metadataFile.text();
    return JSON.parse(text) as VersionMetadataFlat;
  } catch (e) {
    console.error('Failed to read version metadata:', e);
    return null;
  }
};

/**
 * Writes version metadata to disk
 *
 * @param versionDir - Version directory
 * @param metadata - Version metadata to write
 */
export const writeVersionMetadata = async (
  versionDir: Directory,
  metadata: VersionMetadataFlat
): Promise<void> => {
  try {
    const metadataFile = new FSFile(versionDir, VERSION_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write version metadata',
      'WRITE_VERSION_METADATA_ERROR',
      e
    );
  }
};

// =============================================================================
// Version Content Operations
// =============================================================================

/**
 * Reads version content from disk
 *
 * @param versionDir - Version directory
 * @returns Version content or null if not found
 */
export const readVersionContent = async (versionDir: Directory): Promise<string | null> => {
  try {
    const contentFile = new FSFile(versionDir, VERSION_CONTENT_FILENAME);
    if (!(await contentFile.exists)) {
      return null;
    }
    return await contentFile.text();
  } catch (e) {
    console.error('Failed to read version content:', e);
    return null;
  }
};

/**
 * Writes version content to disk
 *
 * @param versionDir - Version directory
 * @param content - Version content to write
 */
export const writeVersionContent = async (
  versionDir: Directory,
  content: string
): Promise<void> => {
  try {
    const contentFile = new FSFile(versionDir, VERSION_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write version content',
      'WRITE_VERSION_CONTENT_ERROR',
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
