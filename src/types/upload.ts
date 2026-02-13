import type { FileType } from '@/constants/fileTypes'

/**
 * Request payload for requesting a presigned URL from the backend
 */
export interface PresignedUrlRequest {
  fileName: string
  contentType: string
  fileType: FileType
  parent?: string
}

/**
 * Response from backend containing presigned URL and file metadata
 */
export interface PresignedUrlResponse {
  presignedUrl: string
  fileUrl: string
  key: string
  expiresIn: number
}

/**
 * Generic API response wrapper
 * Used for standardizing API response structure
 */
export interface ApiResponse<T> {
  statusCode: number
  status: string
  message: string
  data: T
}

/**
 * Upload progress information
 * Used for tracking file upload progress to S3
 */
export interface UploadProgress {
  loaded: number // bytes uploaded
  total: number // total bytes to upload
  percent: number // percentage complete (0-100)
}
