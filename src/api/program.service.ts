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
  RecommendedNextResponse,
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

  /**
   * Publish program (Admin only). Coach-created programs are unpublished until admin approves.
   * PATCH /api/v1/admin/program/publish/:programId
   */
  publish: (programId: number) =>
    api.patch<GetProgramResponse>(`admin/program/publish/${programId}`),

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
   * Get recommended next program (PRD 10.7). User must confirm; no auto-assign.
   * GET /api/v1/athlete/program/recommended-next
   */
  getRecommendedNext: () =>
    api.get<RecommendedNextResponse>('athlete/program/recommended-next'),

  /**
   * MASS Phase 4: Create block (section) in a day.
   * POST admin/program/:programId/weeks/:weekIndex/days/:dayIndex/blocks
   */
  createBlock: (
    programId: number,
    weekIndex: number,
    dayIndex: number,
    body: {
      blockType: 'EXERCISE' | 'CIRCUIT' | 'SUPERSET'
      sectionType?: string
      name?: string
      blockCategory?: string
      instructions?: string
      resultTrackingType?: string
      conditioningFormat?: string
      videoUrls?: unknown
      exerciseId?: number
      sets?: number
      reps?: number
      weightPercent?: number
      tempo?: string
      rest?: string
      coachingNotes?: string
    }
  ) =>
    api.post<{ statusCode: number; data: { id: number }; message?: string }>(
      `admin/program/${programId}/weeks/${weekIndex}/days/${dayIndex}/blocks`,
      body
    ),

  /**
   * MASS Phase 4: Update block (section).
   * PATCH admin/program/sections/:sectionId
   */
  updateSection: (
    sectionId: number,
    body: {
      blockType?: string
      name?: string
      blockCategory?: string
      instructions?: string
      resultTrackingType?: string
      videoUrls?: unknown
      conditioningFormat?: string
      parentSectionId?: number | null
      supersetRounds?: number
      restBetweenExercises?: string
      restBetweenRounds?: string
      orderIndex?: number
    }
  ) =>
    api.patch<{ statusCode: number; data: unknown; message?: string }>(
      `admin/program/sections/${sectionId}`,
      body
    ),

  /**
   * MASS Phase 4: Delete block (section).
   * DELETE admin/program/sections/:sectionId
   */
  deleteSection: (sectionId: number) =>
    api.delete<{ statusCode: number; message?: string }>(
      `admin/program/sections/${sectionId}`
    ),

  /** MASS Phase 6: List Amber date-based sessions for a program. GET .../find-by-id/:programId/amber-sessions?from=&to= */
  getAmberSessions: (
    programId: number,
    params?: { from?: string; to?: string }
  ) =>
    api.get<{
      statusCode: number
      data: {
        rows: Array<{
          id: number
          sessionDate: string
          programDayId: number
          dayName?: string
          dayIndex: number
          isRestDay: boolean
        }>
      }
    }>(`admin/program/find-by-id/${programId}/amber-sessions`, {
      params: params ?? {},
    }),

  /** MASS Phase 6: Assign session to date (Amber program). PUT .../find-by-id/:programId/amber-sessions */
  setAmberSession: (
    programId: number,
    body: { date: string; programDayId: number }
  ) =>
    api.put<{ statusCode: number; data: unknown }>(
      `admin/program/find-by-id/${programId}/amber-sessions`,
      body
    ),

  /** MASS Phase 6: Remove Amber session for a date. DELETE .../find-by-id/:programId/amber-sessions/:date */
  deleteAmberSession: (programId: number, date: string) =>
    api.delete<{ statusCode: number }>(
      `admin/program/find-by-id/${programId}/amber-sessions/${date}`
    ),

  /** MASS Phase 6: Copy Amber session from one date to another. POST .../find-by-id/:programId/amber-sessions/copy */
  copyAmberSession: (
    programId: number,
    body: { fromDate: string; toDate: string }
  ) =>
    api.post<{ statusCode: number; data: unknown }>(
      `admin/program/find-by-id/${programId}/amber-sessions/copy`,
      body
    ),

  /** MASS Phase 6: Assign Custom 1:1 program to athlete. PUT .../find-by-id/:programId/assign */
  assignCustomProgram: (
    programId: number,
    body: { userId: number; endDate?: string }
  ) =>
    api.put<{ statusCode: number; data: { assignment: unknown } }>(
      `admin/program/find-by-id/${programId}/assign`,
      body
    ),

  /**
   * MASS Phase 6: End Sustainment/Custom override and resume paused program.
   * POST /api/v1/athlete/program/resume
   */
  resumeProgram: () =>
    api.post<{
      statusCode: number
      data: { enrollment: unknown }
      message?: string
    }>('athlete/program/resume'),

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
