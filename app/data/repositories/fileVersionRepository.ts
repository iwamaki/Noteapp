/**
 * @file fileVersionRepository.ts
 * @summary Version management repository
 * @description
 * Handles all version history operations including saving, retrieving,
 * and restoring previous versions of files.
 */

import { v4 as uuidv4 } from 'uuid';
import { Directory } from 'expo-file-system';
import type {
  FileFlat,
  FileVersionFlat,
  VersionMetadataFlat,
} from '../core/typesFlat';
import { FileSystemV2Error } from '../core/errors';
import {
  CONTENT_DIR,
  VERSIONS_DIR_NAME,
} from './storage/fileSystemPaths';
import {
  readFileMetadata,
  readFileContent,
  writeFileMetadata,
  writeFileContent,
  readVersionMetadata,
  readVersionContent,
  writeVersionMetadata,
  writeVersionContent,
} from './storage/fileSystemStorage';
import { metadataToFile } from './storage/fileMetadataMapper';

// =============================================================================
// Version History Operations
// =============================================================================

/**
 * Saves a version of the file to history
 *
 * @param fileId - File ID
 * @param content - Content to save
 * @param version - Version number
 */
export const saveVersion = async (
  fileId: string,
  content: string,
  version: number
): Promise<void> => {
  try {
    const versionId = uuidv4();
    const fileDir = new Directory(CONTENT_DIR, fileId);
    const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);

    // Create versions directory if it doesn't exist
    if (!(await versionsDir.exists)) {
      await versionsDir.create();
    }

    // Create version directory
    const versionDir = new Directory(versionsDir, versionId);
    if (!(await versionDir.exists)) {
      await versionDir.create();
    }

    // Create version metadata
    const versionMetadata: VersionMetadataFlat = {
      id: versionId,
      fileId,
      version,
      createdAt: new Date().toISOString(),
    };

    // Write metadata and content
    await writeVersionMetadata(versionDir, versionMetadata);
    await writeVersionContent(versionDir, content);
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to save version for file: ${fileId}`,
      'SAVE_VERSION_ERROR',
      e
    );
  }
};

/**
 * Retrieves all versions of a file
 *
 * @param fileId - File ID
 * @returns Array of file versions
 *
 * @example
 * const versions = await getVersions('file-uuid-123');
 */
export const getVersions = async (fileId: string): Promise<FileVersionFlat[]> => {
  try {
    const fileDir = new Directory(CONTENT_DIR, fileId);

    // Return empty array if file doesn't exist
    if (!(await fileDir.exists)) {
      return [];
    }

    const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);

    // Return empty array if versions directory doesn't exist
    if (!(await versionsDir.exists)) {
      return [];
    }

    // Get all items in versions directory
    const items = await versionsDir.list();

    // Filter directories and map to FileVersionFlat
    const versionPromises = items
      .filter((item) => item instanceof Directory)
      .map(async (item) => {
        const versionDir = item as Directory;

        // Read metadata
        const metadata = await readVersionMetadata(versionDir);
        if (!metadata) {
          return null;
        }

        // Read content
        const content = await readVersionContent(versionDir);
        if (content === null) {
          return null;
        }

        const version: FileVersionFlat = {
          id: metadata.id,
          fileId: metadata.fileId,
          content,
          version: metadata.version,
          createdAt: new Date(metadata.createdAt),
        };

        return version;
      });

    // Execute in parallel and get results
    const results = await Promise.all(versionPromises);

    // Filter out nulls and return
    return results.filter((version): version is FileVersionFlat => version !== null);
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to get versions for file: ${fileId}`,
      'GET_VERSIONS_ERROR',
      e
    );
  }
};

/**
 * Restores a file to a previous version
 *
 * @param fileId - File ID
 * @param versionId - Version ID to restore
 * @returns Restored file
 *
 * @example
 * await restoreVersion('file-uuid-123', 'version-uuid-456');
 */
export const restoreVersion = async (
  fileId: string,
  versionId: string
): Promise<FileFlat> => {
  try {
    // Read current file (low-level operations to avoid circular dependency)
    const fileDir = new Directory(CONTENT_DIR, fileId);
    if (!(await fileDir.exists)) {
      throw new FileSystemV2Error(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    const currentMetadata = await readFileMetadata(fileDir);
    if (!currentMetadata) {
      throw new FileSystemV2Error(`File metadata not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    const currentContent = await readFileContent(fileDir);
    if (currentContent === null) {
      throw new FileSystemV2Error(`File content not found: ${fileId}`, 'FILE_NOT_FOUND');
    }

    // Read specified version
    const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);
    const versionDir = new Directory(versionsDir, versionId);

    if (!(await versionDir.exists)) {
      throw new FileSystemV2Error(`Version not found: ${versionId}`, 'VERSION_NOT_FOUND');
    }

    const versionContent = await readVersionContent(versionDir);
    if (versionContent === null) {
      throw new FileSystemV2Error(
        `Version content not found: ${versionId}`,
        'VERSION_CONTENT_NOT_FOUND'
      );
    }

    // Save current file as version history (before restoration)
    await saveVersion(fileId, currentContent, currentMetadata.version);

    // Update file with restored content
    const updatedMetadata = {
      ...currentMetadata,
      version: currentMetadata.version + 1,
      updatedAt: new Date().toISOString(),
    };

    await writeFileMetadata(fileDir, updatedMetadata);
    await writeFileContent(fileDir, versionContent);

    // Wait for expo-file-system to release file handles
    // This prevents ERR_UNABLE_TO_DELETE when deleting immediately after restore
    await new Promise(resolve => setTimeout(resolve, 150));

    // Return restored file
    return metadataToFile(updatedMetadata, versionContent);
  } catch (e) {
    if (e instanceof FileSystemV2Error) {
      throw e;
    }
    throw new FileSystemV2Error(
      `Failed to restore version: ${versionId}`,
      'RESTORE_VERSION_ERROR',
      e
    );
  }
};
