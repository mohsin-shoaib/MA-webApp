export const RECOVERY_PROTOCOL_TYPES = [
  'MOBILITY',
  'STRETCHING',
  'SOFT_TISSUE',
  'ROUTINE',
] as const
export type RecoveryProtocolType = (typeof RECOVERY_PROTOCOL_TYPES)[number]

export const RECOVERY_SESSION_STATUSES = [
  'SCHEDULED',
  'COMPLETED',
  'SKIPPED',
] as const
export type RecoverySessionStatus = (typeof RECOVERY_SESSION_STATUSES)[number]

export interface RecoveryProtocol {
  id: number
  name: string
  description?: string | null
  type: RecoveryProtocolType
  /** Rich text (HTML) or legacy JSON string */
  content?: string | null
}

export interface RecoverySession {
  id: number
  userId: number
  recoveryProtocolId: number
  scheduledDate: string
  status: RecoverySessionStatus
  completedAt?: string | null
  recoveryProtocol: RecoveryProtocol
}

export interface RecoveryProtocolWithCreator extends RecoveryProtocol {
  creator?: {
    id: number
    firstName?: string
    lastName?: string
    email?: string
  }
  isPublished?: boolean
}
