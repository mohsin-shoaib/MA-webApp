import api from './axios'

const base = 'admin/library'

/** MASS 2.9: Library item types for search */
export type LibraryItemType = 'exercises' | 'circuits' | 'sessions' | 'programs'

export interface LibrarySearchParams {
  type?: LibraryItemType
  q?: string
  /** Filter exercises by tags (exercise must have at least one matching tag). */
  tags?: string[]
  page?: number
  limit?: number
}

export interface LibrarySearchResult {
  exercises?: {
    rows: Array<{ id: number; name: string; tags?: unknown }>
    meta: { total: number; page: number; limit: number; pages: number }
  }
  circuits?: {
    rows: Array<{
      id: number
      name: string
      instructions?: string | null
      resultTrackingType?: string | null
      blockCategory?: string | null
      conditioningFormat?: string | null
      conditioningConfig?: unknown
      videoUrls?: unknown
    }>
    meta: { total: number; page: number; limit: number; pages: number }
  }
  sessions?: {
    rows: Array<{ id: number; name: string; content: Record<string, unknown> }>
    meta: { total: number; page: number; limit: number; pages: number }
  }
  programs?: {
    rows: Array<{
      id: number
      name: string
      description?: string | null
      numberOfWeeks?: number
      cycleType?: string
    }>
    meta: { total: number; page: number; limit: number; pages: number }
  }
}

export interface LibraryCircuitPayload {
  id: number
  name: string
  instructions?: string | null
  resultTrackingType?: string | null
  blockCategory?: string | null
  conditioningFormat?: string | null
  conditioningConfig?: unknown
  videoUrls?: unknown
}

export interface LibrarySessionPayload {
  id: number
  name: string
  content: Record<string, unknown>
}

interface ApiResponse<T> {
  statusCode: number
  data: T
  message?: string
}

export const libraryService = {
  /** Unified search: exercises, circuits, sessions, programs (optional type filter, tags for exercises) */
  search: (params: LibrarySearchParams = {}) =>
    api.get<ApiResponse<LibrarySearchResult>>(`${base}/search`, {
      params: {
        type: params.type,
        q: params.q,
        tags: params.tags?.length ? params.tags : undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    }),

  /** List circuits (optional q, page, limit) */
  listCircuits: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get<
      ApiResponse<{
        rows: LibraryCircuitPayload[]
        meta: { total: number; page: number; limit: number; pages: number }
      }>
    >(`${base}/circuits`, { params: params ?? {} }),

  /** Get circuit by ID (for "Add" payload) */
  getCircuit: (id: number) =>
    api.get<ApiResponse<LibraryCircuitPayload>>(`${base}/circuits/${id}`),

  /** Create library circuit (save current block to library) */
  createCircuit: (body: {
    name: string
    instructions?: string
    resultTrackingType?: string
    blockCategory?: string
    conditioningFormat?: string
    conditioningConfig?: Record<string, number>
    videoUrls?: unknown
  }) => api.post<ApiResponse<LibraryCircuitPayload>>(`${base}/circuits`, body),

  /** Update library circuit */
  updateCircuit: (
    id: number,
    body: Partial<{
      name: string
      instructions?: string
      resultTrackingType?: string
      blockCategory?: string
      conditioningFormat?: string
      conditioningConfig?: Record<string, number>
      videoUrls?: unknown
    }>
  ) =>
    api.patch<ApiResponse<LibraryCircuitPayload>>(
      `${base}/circuits/${id}`,
      body
    ),

  /** Delete library circuit */
  deleteCircuit: (id: number) =>
    api.delete<ApiResponse<null>>(`${base}/circuits/${id}`),

  /** List sessions (optional q, page, limit) */
  listSessions: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get<
      ApiResponse<{
        rows: LibrarySessionPayload[]
        meta: { total: number; page: number; limit: number; pages: number }
      }>
    >(`${base}/sessions`, { params: params ?? {} }),

  /** Get session by ID (for "Add" payload) */
  getSession: (id: number) =>
    api.get<ApiResponse<LibrarySessionPayload>>(`${base}/sessions/${id}`),

  /** Create library session (save current day to library) */
  createSession: (body: { name: string; content: Record<string, unknown> }) =>
    api.post<ApiResponse<LibrarySessionPayload>>(`${base}/sessions`, body),

  /** Update library session */
  updateSession: (
    id: number,
    body: Partial<{ name: string; content: Record<string, unknown> }>
  ) =>
    api.patch<ApiResponse<LibrarySessionPayload>>(
      `${base}/sessions/${id}`,
      body
    ),

  /** Delete library session */
  deleteSession: (id: number) =>
    api.delete<ApiResponse<null>>(`${base}/sessions/${id}`),

  /** Save program to library (creates a copy with isLibraryTemplate=true) */
  saveProgramToLibrary: (programId: number, name?: string) =>
    api.post<ApiResponse<{ id: number; name: string }>>(
      `${base}/save-program/${programId}`,
      name != null ? { name } : {}
    ),
}
