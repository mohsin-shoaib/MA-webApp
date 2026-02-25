import api from './axios'

export interface CoachAssignmentItem {
  id: number
  coachId: number
  athleteId: number
  assignedAt: string
  coach: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
  }
  athlete: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export interface ListAssignmentsResponse {
  statusCode: number
  data: { assignments: CoachAssignmentItem[] }
}

export interface CoachRequestItem {
  id: number
  athleteId: number
  status: string
  createdAt: string
  athlete: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export interface ListCoachRequestsResponse {
  statusCode: number
  data: { requests: CoachRequestItem[] }
}

export const adminCoachAssignmentService = {
  list: () => api.get<ListAssignmentsResponse>('admin/coach-assignment'),

  /** Pending coach requests (athletes who requested a coach). */
  listCoachRequests: () =>
    api.get<ListCoachRequestsResponse>('admin/coach-assignment/requests'),

  assign: (coachId: number, athleteId: number) =>
    api.post<{ statusCode: number; data: unknown }>('admin/coach-assignment', {
      coachId,
      athleteId,
    }),

  unassign: (coachId: number, athleteId: number) =>
    api.delete<{ statusCode: number }>('admin/coach-assignment', {
      data: { coachId, athleteId },
    }),
}
