import api from './axios'
import type {
  CreateProgramDTO,
  UpdateProgramDTO,
  CreateProgramResponse,
  UpdateProgramResponse,
  GetProgramResponse,
  GetProgramsResponse,
  GetProgramsQueryDTO,
  ProgramListByCycleResponse,
  Program,
  ProgramWithCycle,
  EnrollProgramResponse,
  CurrentProgramResponse,
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
   * List programs by cycle for manual selection (onboarding Step 3).
   * GET /api/v1/athlete/program/list?cycleId=...&subCategory=...
   * Red/Green: filter by subCategory (primary goal); Amber: no programs.
   */
  getProgramsByCycle: (
    cycleId: number,
    subCategory?: string
  ): Promise<{ data: Program[] }> => {
    const params: { cycleId: number; subCategory?: string } = { cycleId }
    if (subCategory) params.subCategory = subCategory
    return api
      .get<ProgramListByCycleResponse>('athlete/program/list', { params })
      .then(res => {
        const apiRes = res.data
        const list = Array.isArray(apiRes.data)
          ? apiRes.data
          : ((apiRes.data as { rows: Program[] }).rows ?? [])
        return { data: list }
      })
  },

  /**
   * Get program by ID for athlete (detail / preview before enroll).
   * GET /api/v1/athlete/program/:id
   */
  getByIdForAthlete: (programId: number) =>
    api.get<{ statusCode: number; data: ProgramWithCycle; message?: string }>(
      `athlete/program/${programId}`
    ),

  /**
   * Enroll in a program (sets as athlete's active program).
   * POST /api/v1/athlete/program/enroll
   * Response may include data.warning for conflict – show confirmation modal.
   */
  enroll: (programId: number) =>
    api.post<EnrollProgramResponse>('athlete/program/enroll', { programId }),

  /**
   * Get current enrolled program (all days + exercises). For Exercise Library.
   * GET /api/v1/athlete/program/current
   * If not enrolled, data is null.
   */
  getCurrentProgram: () =>
    api.get<CurrentProgramResponse>('athlete/program/current'),

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
