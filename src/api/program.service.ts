import api from './axios'
import type {
  CreateProgramDTO,
  UpdateProgramDTO,
  CreateProgramResponse,
  UpdateProgramResponse,
  GetProgramResponse,
  GetProgramsResponse,
  GetProgramsQueryDTO,
} from '@/types/program'

export const programService = {
  /**
   * Create a new program
   * POST /api/v1/admin/program/create
   */
  create: (payload: CreateProgramDTO) =>
    api.post<CreateProgramResponse>('admin/program/create', payload),

  /**
   * Update program by ID
   * PUT /api/v1/admin/program/update-by-id/:programId
   */
  update: (programId: number, payload: UpdateProgramDTO) =>
    api.put<UpdateProgramResponse>(
      `admin/program/update-by-id/${programId}`,
      payload
    ),

  /**
   * Get all programs with pagination
   * POST /api/v1/admin/program/get-all
   */
  getAll: (query: GetProgramsQueryDTO = {}) =>
    api.post<GetProgramsResponse>('admin/program/get-all', query),

  /**
   * Get program by ID
   * GET /api/v1/admin/program/find-by-id/:programId
   */
  getById: (programId: number) =>
    api.get<GetProgramResponse>(`admin/program/find-by-id/${programId}`),

  /**
   * Delete program by ID
   * DELETE /api/v1/admin/program/delete-by-id/:programId
   */
  delete: (programId: number) =>
    api.delete<{ statusCode: number; status: string; message: string }>(
      `admin/program/delete-by-id/${programId}`
    ),

  // Legacy method (kept for backward compatibility)
  createProgram: (payload: CreateProgramDTO) =>
    api.post<CreateProgramResponse>('admin/program/create', payload),

  /**
   * Upload video to S3
   * POST /api/v1/s3/upload
   */
  uploadVideo: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    // Content-Type header is automatically handled by axios interceptor for FormData
    return api.post<{ data: { url: string }; url?: string }>(
      's3/upload',
      formData
    )
  },
}
