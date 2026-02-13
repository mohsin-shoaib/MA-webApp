/**
 * File Type Constants
 *
 * Defines file types, parent types, and validation rules for S3 presigned URL uploads.
 */

/**
 * File type constants for different upload categories
 */
export const FileType = {
  PROFILE_IMAGE: 'profile',
  PROGRAM_VIDEO: 'video',
  PROGRAM_IMAGE: 'image',
  DOCUMENT: 'document',
} as const

/**
 * File type union type
 */
export type FileType = (typeof FileType)[keyof typeof FileType]

/**
 * Parent type constants for organizing files by entity type
 */
export const ParentType = {
  USERS: 'users',
  PROGRAMS: 'programs',
} as const

/**
 * Parent type union type
 */
export type ParentType = (typeof ParentType)[keyof typeof ParentType]

/**
 * Configuration for each file type
 */
export interface FileTypeConfig {
  allowedMimeTypes: string[]
  maxSize: number // in bytes
  parent: ParentType
}

/**
 * File type configuration mapping
 * Defines validation rules and metadata for each file type
 */
export const FILE_TYPE_CONFIG: Record<FileType, FileTypeConfig> = {
  [FileType.PROFILE_IMAGE]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    parent: ParentType.USERS,
  },
  [FileType.PROGRAM_VIDEO]: {
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
    parent: ParentType.PROGRAMS,
  },
  [FileType.PROGRAM_IMAGE]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    parent: ParentType.PROGRAMS,
  },
  [FileType.DOCUMENT]: {
    allowedMimeTypes: ['application/pdf', 'application/msword'],
    maxSize: 20 * 1024 * 1024, // 20MB
    parent: ParentType.PROGRAMS,
  },
} as const
