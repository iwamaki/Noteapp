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
  FileContentLines,
} from '../core/typesFlat';
import { FileSystemV2Error, RepositoryError } from '../core/errors';
import { CONTENT_DIR } from './storage/fileSystemPaths';
import {
  readFileMetadata,
  readFileContent,
  readFileContentAsLines,
  writeFileMetadata,
  writeFileContent,
  deleteFileDirectory,
  initializeFileSystemFlat,
} from './storage/fileSystemStorage';
import { metadataToFile, fileToMetadata } from './storage/fileMetadataMapper';

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

  /**
   * Retrieves file content as an array of lines
   *
   * @param id - File ID
   * @returns File content as lines or null if not found
   *
   * @example
   * const result = await FileRepository.getContentAsLines('file-uuid-123');
   * if (result) {
   *   result.lines.forEach(line => {
   *     console.log(`${line.lineNumber}: ${line.content}`);
   *   });
   * }
   *
   * @remarks
   * - Line numbers are 1-based for editor compatibility
   * - Newline characters are removed from each line
   * - Empty lines are preserved
   * - This is useful for line-by-line editing, diff display, and AI-assisted partial modifications
   */
  static async getContentAsLines(id: string): Promise<FileContentLines | null> {
    try {
      const fileDir = new Directory(CONTENT_DIR, id);

      // Return null if directory doesn't exist
      if (!(await fileDir.exists)) {
        return null;
      }

      // Read lines
      const lines = await readFileContentAsLines(fileDir);
      if (lines === null) {
        return null;
      }

      return {
        fileId: id,
        totalLines: lines.length,
        lines,
      };
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get file content as lines: ${id}`,
        'GET_FILE_CONTENT_AS_LINES_ERROR',
        e
      );
    }
  }

  /**
   * Retrieves all unique categories from existing files
   *
   * @returns Array of unique category paths, sorted by usage frequency (excluding empty/uncategorized)
   *
   * @example
   * const categories = await FileRepository.getAllCategories();
   * // Returns: ["研究/AI", "研究/論文", "個人/メモ", "仕事"]
   *
   * @remarks
   * - Only reads metadata files (metadata.json), not content files
   * - Excludes empty strings and "未分類"
   * - Returns categories sorted by usage count (most used first)
   * - Efficient for UI dropdown/autocomplete suggestions
   */
  static async getAllCategories(): Promise<string[]> {
    try {
      // Return empty array if content directory doesn't exist
      if (!(await CONTENT_DIR.exists)) {
        return [];
      }

      // Get all items in content directory
      const items = await CONTENT_DIR.list();

      // Category usage counter
      const categoryCount = new Map<string, number>();

      // Read metadata files in parallel
      const metadataPromises = items
        .filter((item) => item instanceof Directory)
        .map(async (item) => {
          const fileDir = item as Directory;

          // Read only metadata (not content)
          const metadata = await readFileMetadata(fileDir);
          if (!metadata || !metadata.category) {
            return null;
          }

          return metadata.category;
        });

      // Execute in parallel and get results
      const categories = await Promise.all(metadataPromises);

      // Count category usage
      for (const category of categories) {
        if (category && category !== '' && category !== '未分類') {
          categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        }
      }

      // Sort by usage count (most used first)
      return Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to get all categories',
        'GET_ALL_CATEGORIES_ERROR',
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
   *   category: '研究/AI',
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
        contentType: data.contentType,
        mimeType: data.mimeType,
        tags: data.tags || [],
        category: data.category || '',
        summary: data.summary,
        relatedNoteIds: data.relatedNoteIds,
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
   * @returns Updated file
   */
  static async update(
    id: string,
    data: UpdateFileDataFlat
  ): Promise<FileFlat> {
    try {
      // Get existing file
      const existingFile = await this.getById(id);
      if (!existingFile) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      // Create updated file
      const updatedFile: FileFlat = {
        ...existingFile,
        title: data.title ?? existingFile.title,
        content: data.content ?? existingFile.content,
        contentType: data.contentType ?? existingFile.contentType,
        mimeType: data.mimeType ?? existingFile.mimeType,
        tags: data.tags ?? existingFile.tags,
        category: data.category ?? existingFile.category,
        order: data.order ?? existingFile.order,
        summary: data.summary ?? existingFile.summary,
        relatedNoteIds: data.relatedNoteIds ?? existingFile.relatedNoteIds,
        embedding: data.embedding ?? existingFile.embedding,
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

  /**
   * Updates specific lines of a file's content
   *
   * @param id - File ID
   * @param startLine - Start line number (1-based, inclusive)
   * @param endLine - End line number (1-based, inclusive)
   * @param newContent - New content to replace the lines (may contain newlines)
   * @returns Updated file
   *
   * @example
   * // Replace lines 3-5 with new content
   * const file = await FileRepository.updateLines(
   *   'file-id',
   *   3,
   *   5,
   *   'New line 3\nNew line 4\nNew line 5'
   * );
   *
   * @example
   * // Delete lines 3-5
   * const file = await FileRepository.updateLines('file-id', 3, 5, '');
   *
   * @remarks
   * - Line numbers are 1-based for editor compatibility
   * - Both start_line and end_line are inclusive
   * - newContent can be empty string to delete lines
   * - Validates that 1 <= start_line <= end_line <= totalLines
   */
  static async updateLines(
    id: string,
    startLine: number,
    endLine: number,
    newContent: string
  ): Promise<FileFlat> {
    try {
      // Validation
      if (startLine < 1) {
        throw new FileSystemV2Error(
          'start_line must be >= 1',
          'INVALID_LINE_NUMBER'
        );
      }
      if (endLine < 1) {
        throw new FileSystemV2Error(
          'end_line must be >= 1',
          'INVALID_LINE_NUMBER'
        );
      }
      if (startLine > endLine) {
        throw new FileSystemV2Error(
          'start_line must be <= end_line',
          'INVALID_LINE_RANGE'
        );
      }

      // Get file content as lines
      const fileContentLines = await this.getContentAsLines(id);
      if (!fileContentLines) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      const lines = fileContentLines.lines.map((line) => line.content);
      const totalLines = lines.length;

      // Validate line range
      if (startLine > totalLines) {
        throw new FileSystemV2Error(
          `start_line (${startLine}) is greater than total lines (${totalLines})`,
          'LINE_OUT_OF_RANGE'
        );
      }
      if (endLine > totalLines) {
        throw new FileSystemV2Error(
          `end_line (${endLine}) is greater than total lines (${totalLines})`,
          'LINE_OUT_OF_RANGE'
        );
      }

      // Split new content into lines
      const newLines = newContent === '' ? [] : newContent.split('\n');

      // Calculate splice parameters
      const deleteCount = endLine - startLine + 1;
      const insertIndex = startLine - 1;

      // Replace lines
      lines.splice(insertIndex, deleteCount, ...newLines);

      // Join lines back into content
      const updatedContent = lines.join('\n');

      // Update file using existing update method
      return await this.update(id, { content: updatedContent });
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to update lines: ${id}`,
        'UPDATE_LINES_ERROR',
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
