/**
 * @file domain/index.ts
 * @summary Domain層のエクスポート
 */

export { FileDomainService } from './FileDomainService';
export { FolderDomainService } from './FolderDomainService';

export type {
  ValidationResult,
  DuplicateCheckResult as NoteDuplicateCheckResult,
  MoveValidationResult,
} from './FileDomainService';

export type {
  ValidationResult as FolderValidationResult,
  DuplicateCheckResult as FolderDuplicateCheckResult,
} from './FolderDomainService';
