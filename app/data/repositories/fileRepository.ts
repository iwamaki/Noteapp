/**
 * @file fileRepository.ts
 * @summary File CRUD operations repository
 * @description
 * Handles all file creation, reading, updating, and deletion operations.
 * Uses storage layer for low-level I/O and version repository for history management.
 */

import { v4 as uuidv4 } from 'uuid';
import { Directory } from 'expo-file-system';
import type {
  FileFlat,
  CreateFileDataFlat,
  UpdateFileDataFlat,
} from '../core/typesFlat';
import { FileSystemV2Error, RepositoryError } from '../core/errors';
import { CONTENT_DIR } from './storage/fileSystemPaths';
import {
  readFileMetadata,
  readFileContent,
  writeFileMetadata,
  writeFileContent,
  deleteFileDirectory,
  initializeFileSystemFlat,
} from './storage/fileSystemStorage';
import { metadataToFile, fileToMetadata } from './storage/fileMetadataMapper';
import { saveVersion } from './fileVersionRepository';

// Re-export errors for consumers
export { FileSystemV2Error, RepositoryError };

// Re-export initialization function
export { initializeFileSystemFlat };

// =============================================================================
// FileRepository Class
// =============================================================================

/**
 * File repository providing CRUD operations
 */
export class FileRepository {
  // =============================================================================
  // Read Operations
  // =============================================================================

  /**
   * Retrieves all files
   *
   * @returns Array of all files
   *
   * @example
   * const files = await FileRepository.getAll();
   */
  static async getAll(): Promise<FileFlat[]> {
    try {
      // Return empty array if content directory doesn't exist
      if (!(await CONTENT_DIR.exists)) {
        return [];
      }

      // Get all items in content directory
      const items = await CONTENT_DIR.list();

      // Filter directories and map to FileFlat
      const filePromises = items
        .filter((item) => item instanceof Directory)
        .map(async (item) => {
          const fileDir = item as Directory;

          // Read metadata
          const metadata = await readFileMetadata(fileDir);
          if (!metadata) {
            return null;
          }

          // Read content
          const content = await readFileContent(fileDir);
          if (content === null) {
            return null;
          }

          return metadataToFile(metadata, content);
        });

      // Execute in parallel and get results
      const results = await Promise.all(filePromises);

      // Filter out nulls and return
      return results.filter((file): file is FileFlat => file !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to get all files',
        'GET_ALL_FILES_ERROR',
        e
      );
    }
  }

  /**
   * Retrieves a file by ID
   *
   * @param id - File ID
   * @returns File or null if not found
   *
   * @example
   * const file = await FileRepository.getById('file-uuid-123');
   */
  static async getById(id: string): Promise<FileFlat | null> {
    try {
      const fileDir = new Directory(CONTENT_DIR, id);

      // Return null if directory doesn't exist
      if (!(await fileDir.exists)) {
        return null;
      }

      // Read metadata
      const metadata = await readFileMetadata(fileDir);
      if (!metadata) {
        return null;
      }

      // Read content
      const content = await readFileContent(fileDir);
      if (content === null) {
        return null;
      }

      return metadataToFile(metadata, content);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get file by ID: ${id}`,
        'GET_FILE_BY_ID_ERROR',
        e
      );
    }
  }

  /**
   * Retrieves multiple files by IDs
   *
   * @param fileIds - Array of file IDs
   * @returns Array of files
   */
  static async getByIds(fileIds: string[]): Promise<FileFlat[]> {
    try {
      // Execute in parallel
      const results = await Promise.all(
        fileIds.map(async (id) => {
          return await this.getById(id);
        })
      );

      // Filter out nulls
      return results.filter((file): file is FileFlat => file !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to get files by IDs',
        'GET_FILES_BY_IDS_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // Create Operation
  // =============================================================================

  /**
   * Creates a new file
   *
   * @param data - File creation data
   * @returns Created file
   *
   * @example
   * const file = await FileRepository.create({
   *   title: 'My Note',
   *   content: 'Note content...',
   *   tags: ['important'],
   *   categories: ['研究'],
   * });
   */
  static async create(data: CreateFileDataFlat): Promise<FileFlat> {
    try {
      // Initialize file system (just in case)
      await initializeFileSystemFlat();

      const now = new Date();
      const fileId = uuidv4();

      const newFile: FileFlat = {
        id: fileId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        categories: data.categories || [],
        summary: data.summary,
        relatedNoteIds: data.relatedNoteIds,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const metadata = fileToMetadata(newFile);

      // Create file directory
      const fileDir = new Directory(CONTENT_DIR, fileId);
      if (!(await fileDir.exists)) {
        await fileDir.create();
      }

      // Write metadata and content
      await writeFileMetadata(fileDir, metadata);
      await writeFileContent(fileDir, data.content);

      return newFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to create file: ${data.title}`,
        'CREATE_FILE_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // Update Operation
  // =============================================================================

  /**
   * Updates a file
   *
   * @param id - File ID
   * @param data - Update data
   * @param options - Options (skipVersionSave: skip version saving)
   * @returns Updated file
   */
  static async update(
    id: string,
    data: UpdateFileDataFlat,
    options: { skipVersionSave?: boolean } = {}
  ): Promise<FileFlat> {
    try {
      // Get existing file
      const existingFile = await this.getById(id);
      if (!existingFile) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      // Save current version to history if content changed
      // Skip if skipVersionSave option is specified
      if (
        !options.skipVersionSave &&
        data.content !== undefined &&
        data.content !== existingFile.content
      ) {
        await saveVersion(id, existingFile.content, existingFile.version);
      }

      // Create updated file
      const updatedFile: FileFlat = {
        ...existingFile,
        title: data.title ?? existingFile.title,
        content: data.content ?? existingFile.content,
        tags: data.tags ?? existingFile.tags,
        categories: data.categories ?? existingFile.categories,
        summary: data.summary ?? existingFile.summary,
        relatedNoteIds: data.relatedNoteIds ?? existingFile.relatedNoteIds,
        embedding: data.embedding ?? existingFile.embedding,
        version: existingFile.version + 1,
        updatedAt: new Date(),
      };

      const metadata = fileToMetadata(updatedFile);

      // Get file directory
      const fileDir = new Directory(CONTENT_DIR, id);

      // Write metadata
      await writeFileMetadata(fileDir, metadata);

      // Write content if updated
      if (data.content !== undefined) {
        await writeFileContent(fileDir, data.content);
      }

      return updatedFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to update file: ${id}`,
        'UPDATE_FILE_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // Delete Operations
  // =============================================================================

  /**
   * Deletes a file
   *
   * @param id - File ID
   */
  static async delete(id: string): Promise<void> {
    try {
      const fileDir = new Directory(CONTENT_DIR, id);

      // Consider it success if file doesn't exist
      if (!(await fileDir.exists)) {
        return;
      }

      // Delete directory
      await deleteFileDirectory(fileDir);
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to delete file: ${id}`,
        'DELETE_FILE_ERROR',
        e
      );
    }
  }

  /**
   * Deletes multiple files in batch
   *
   * @param fileIds - Array of file IDs
   */
  static async batchDelete(fileIds: string[]): Promise<void> {
    try {
      // Execute deletions in parallel
      await Promise.all(fileIds.map((id) => this.delete(id)));
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to batch delete files',
        'BATCH_DELETE_FILES_ERROR',
        e
      );
    }
  }
}
