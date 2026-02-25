import api from './axios'

export interface CurriculumItemDto {
  id: number
  type: string
  title: string
  description: string | null
  url: string | null
  weekIndex: number
  sortOrder: number
  completedAt?: string | null
}

export const curriculumHubService = {
  getStatus: () =>
    api.get<{ statusCode: number; data: { enrolled: boolean } }>(
      'athlete/curriculum-hub/status'
    ),
  getItems: () =>
    api.get<{
      statusCode: number
      data: {
        items: CurriculumItemDto[]
        enrolled: boolean
        progress?: { completed: number; total: number }
      }
    }>('athlete/curriculum-hub/items'),

  /** Mark a curriculum item as complete (PRD 17.2.7) */
  completeItem: (curriculumItemId: number) =>
    api.post<{ statusCode: number }>('athlete/curriculum-hub/complete', {
      curriculumItemId,
    }),

  /** Request 90 Unchained enrollment (admin will enroll from Curriculum page). Idempotent. */
  request90Unchained: () =>
    api.post<{
      statusCode: number
      data: {
        request: { id: number; status: string; createdAt: string } | null
        alreadyEnrolled: boolean
        alreadyRequested: boolean
      }
    }>('athlete/curriculum-hub/request-enrollment'),
}
