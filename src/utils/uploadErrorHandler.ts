/**
 * Upload Error Types
 */
export type UploadErrorCode =
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'SIZE_ERROR'
  | 'TYPE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * UploadError class
 *
 * Custom error class for upload-related errors with error codes and status codes.
 * Provides structured error information for better error handling.
 */
export class UploadError extends Error {
  public readonly code: UploadErrorCode
  public readonly statusCode?: number
  public readonly originalError?: unknown

  constructor(
    message: string,
    code: UploadErrorCode,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message)
    this.name = 'UploadError'
    this.code = code
    this.statusCode = statusCode
    this.originalError = originalError

    // Maintains proper stack trace for where our error was thrown (only available on V8/Node.js)
    const ErrorConstructor = Error as unknown as {
      captureStackTrace?: (
        error: Error,
        constructor: typeof UploadError
      ) => void
    }
    if (typeof ErrorConstructor.captureStackTrace === 'function') {
      ErrorConstructor.captureStackTrace(this, UploadError)
    }
  }
}

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  AUTH_ERROR: 'Authentication failed. Please login again.',
  PERMISSION_ERROR: 'You do not have permission to upload files.',
  SIZE_ERROR: 'File is too large. Please choose a smaller file.',
  TYPE_ERROR: 'File type is not allowed. Please choose a different file.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Upload timed out. Please try again.',
  VALIDATION_ERROR:
    'File validation failed. Please check the file and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
}

/**
 * Get user-friendly error message for error code
 */
export function getErrorMessage(code: UploadErrorCode): string {
  return ERROR_MESSAGES[code]
}

/**
 * Handle upload errors and convert them to UploadError instances
 *
 * Analyzes various error types and converts them to structured UploadError
 * instances with appropriate error codes and user-friendly messages.
 *
 * @param error - The error to handle (can be any type)
 * @returns UploadError instance with appropriate code and message
 *
 * @example
 * ```ts
 * try {
 *   await uploadFile(file)
 * } catch (error) {
 *   const uploadError = handleUploadError(error)
 *   switch (uploadError.code) {
 *     case 'AUTH_ERROR':
 *       redirectToLogin()
 *       break
 *     case 'SIZE_ERROR':
 *       showSizeLimitMessage()
 *       break
 *     default:
 *       showGenericError(uploadError.message)
 *   }
 * }
 * ```
 */
export function handleUploadError(error: unknown): UploadError {
  // If already an UploadError, return as-is
  if (error instanceof UploadError) {
    return error
  }

  // Handle Error instances
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()
    const errorString = error.toString().toLowerCase()

    // Check for authentication errors (401)
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('token') ||
      errorMessage.includes('auth token not found')
    ) {
      return new UploadError(
        ERROR_MESSAGES.AUTH_ERROR,
        'AUTH_ERROR',
        401,
        error
      )
    }

    // Check for permission errors (403)
    if (
      errorMessage.includes('403') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('access denied')
    ) {
      return new UploadError(
        ERROR_MESSAGES.PERMISSION_ERROR,
        'PERMISSION_ERROR',
        403,
        error
      )
    }

    // Check for file size errors (413)
    if (
      errorMessage.includes('413') ||
      errorMessage.includes('too large') ||
      errorMessage.includes('exceeds maximum') ||
      errorMessage.includes('file size')
    ) {
      return new UploadError(
        ERROR_MESSAGES.SIZE_ERROR,
        'SIZE_ERROR',
        413,
        error
      )
    }

    // Check for file type errors
    if (
      errorMessage.includes('not allowed') ||
      errorMessage.includes('file type') ||
      errorMessage.includes('invalid type') ||
      errorMessage.includes('content type')
    ) {
      return new UploadError(
        ERROR_MESSAGES.TYPE_ERROR,
        'TYPE_ERROR',
        undefined,
        error
      )
    }

    // Check for network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('failed to fetch') ||
      errorString.includes('networkerror')
    ) {
      return new UploadError(
        ERROR_MESSAGES.NETWORK_ERROR,
        'NETWORK_ERROR',
        undefined,
        error
      )
    }

    // Check for timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('aborted')
    ) {
      return new UploadError(
        ERROR_MESSAGES.TIMEOUT_ERROR,
        'TIMEOUT_ERROR',
        undefined,
        error
      )
    }

    // Check for validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('validate')
    ) {
      return new UploadError(
        ERROR_MESSAGES.VALIDATION_ERROR,
        'VALIDATION_ERROR',
        undefined,
        error
      )
    }

    // Check for HTTP status codes in error message
    const statusCodeMatch = errorMessage.match(/\b(40[0-9]|50[0-9])\b/)
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1], 10)
      if (statusCode === 401) {
        return new UploadError(
          ERROR_MESSAGES.AUTH_ERROR,
          'AUTH_ERROR',
          401,
          error
        )
      }
      if (statusCode === 403) {
        return new UploadError(
          ERROR_MESSAGES.PERMISSION_ERROR,
          'PERMISSION_ERROR',
          403,
          error
        )
      }
      if (statusCode === 413) {
        return new UploadError(
          ERROR_MESSAGES.SIZE_ERROR,
          'SIZE_ERROR',
          413,
          error
        )
      }
    }

    // Return unknown error with original message
    return new UploadError(
      error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      'UNKNOWN_ERROR',
      undefined,
      error
    )
  }

  // Handle string errors
  if (typeof error === 'string') {
    return new UploadError(error, 'UNKNOWN_ERROR', undefined, error)
  }

  // Handle unknown error types
  return new UploadError(
    ERROR_MESSAGES.UNKNOWN_ERROR,
    'UNKNOWN_ERROR',
    undefined,
    error
  )
}

/**
 * Check if error is an UploadError
 */
export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): UploadErrorCode {
  if (isUploadError(error)) {
    return error.code
  }
  const uploadError = handleUploadError(error)
  return uploadError.code
}

/**
 * Get user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isUploadError(error)) {
    return error.message
  }
  const uploadError = handleUploadError(error)
  return uploadError.message
}
