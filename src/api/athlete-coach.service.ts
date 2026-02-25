import api from './axios'

export interface CoachRequestResponse {
  statusCode: number
  data: {
    request: {
      id: number
      athleteId: number
      status: string
      createdAt: string
    }
    alreadyRequested: boolean
  }
}

export const athleteCoachService = {
  /** Request a coach; admin is notified to assign. Idempotent: returns existing if already requested. */
  requestCoach: () =>
    api.post<CoachRequestResponse>('athlete/coach/request-coach'),
}
