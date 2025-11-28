/**
 * @file fileMetadataMapper.ts
 * @summary Type conversion utilities between domain types and DTO types
 * @description
 * Handles conversion between FileFlat (domain type with Date objects)
 * and FileMetadataFlat (DTO type with ISO string dates for JSON serialization).
 */

import type { FileFlat, FileMetadataFlat } from '../../core/typesFlat';

/**
 * Converts FileMetadataFlat to FileFlat
 *
 * @param metadata - File metadata (DTO type)
 * @param content - File content
 * @returns FileFlat (domain type)
 */
export const metadataToFile = (metadata: FileMetadataFlat, content: string): FileFlat => {
  return {
    id: metadata.id,
    title: metadata.title,
    content,
    contentType: metadata.contentType,
    mimeType: metadata.mimeType,
    tags: metadata.tags,
    category: metadata.category,
    order: metadata.order,
    summary: metadata.summary,
    relatedNoteIds: metadata.relatedNoteIds,
    embedding: metadata.embedding,
    createdAt: new Date(metadata.createdAt),
    updatedAt: new Date(metadata.updatedAt),
  };
};

/**
 * Converts FileFlat to FileMetadataFlat
 *
 * @param file - File (domain type)
 * @returns FileMetadataFlat (DTO type)
 */
export const fileToMetadata = (file: FileFlat): FileMetadataFlat => {
  return {
    id: file.id,
    title: file.title,
    contentType: file.contentType,
    mimeType: file.mimeType,
    tags: file.tags,
    category: file.category,
    order: file.order,
    summary: file.summary,
    relatedNoteIds: file.relatedNoteIds,
    embedding: file.embedding,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
};
