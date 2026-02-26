import api from './axios'

export interface InviteCoachPayload {
  email: string
  firstName?: string
  lastName?: string
}

export interface CoachInviteByToken {
  email: string
  firstName?: string | null
  lastName?: string | null
}

export interface AcceptCoachPayload {
  token: string
  password: string
  firstName?: string
  lastName?: string
}

export interface AcceptCoachResponse {
  token: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
    role: string
  }
}

export const coachInviteService = {
  /** Admin: send coach invite email */
  inviteCoach: (body: InviteCoachPayload) =>
    api.post<{
      statusCode: number
      data: { message: string }
      message: string
    }>('admin/invite-coach', body),

  /** Public: get invite details by token (for accept page) */
  getByToken: (token: string) =>
    api.get<{ statusCode: number; data: CoachInviteByToken; message: string }>(
      `invite/coach-by-token?token=${encodeURIComponent(token)}`
    ),

  /** Public: accept invite (create coach account, returns JWT) */
  acceptCoach: (body: AcceptCoachPayload) =>
    api.post<{
      statusCode: number
      data: AcceptCoachResponse
      message: string
    }>('invite/accept-coach', body),
}
