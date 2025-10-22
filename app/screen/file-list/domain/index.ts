/**
 * @file domain/index.ts
 * @summary Domain層のエクスポート
 */

export { NoteDomainService } from './NoteDomainService';
export { FolderDomainService } from './FolderDomainService';

export type {
  ValidationResult,
  DuplicateCheckResult as NoteDuplicateCheckResult,
  MoveValidationResult,
} from './NoteDomainService';

export type {
  ValidationResult as FolderValidationResult,
  DuplicateCheckResult as FolderDuplicateCheckResult,
} from './FolderDomainService';
