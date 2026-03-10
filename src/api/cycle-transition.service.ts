import type {
  ConfirmCycleTransitionDTO,
  CycleTransitionResponse,
  PendingScheduledTransitionResponse,
} from '@/types/cycle-transition'
import api from './axios'

export const cycleTransitionService = {
  /**
   * Confirm cycle transition
   */
  confirmCycleTransition: (data: ConfirmCycleTransitionDTO) =>
    api.post<CycleTransitionResponse>('athlete/cycle-transition/confirm', data),

  /**
   * Get transition history
   */
  getTransitionHistory: () =>
    api.get<CycleTransitionResponse>('athlete/cycle-transition/history'),

  /**
   * 3.3 Green: Get pending scheduled transition (Amber→Green) where scheduledAt <= today.
   */
  getPendingScheduledTransition: () =>
    api.get<PendingScheduledTransitionResponse>(
      'athlete/cycle-transition/pending-scheduled'
    ),

  /**
   * 3.3 Green: Athlete confirms scheduled transition (e.g. Amber→Green).
   */
  confirmScheduledTransition: () =>
    api.post<CycleTransitionResponse>(
      'athlete/cycle-transition/confirm-scheduled'
    ),
}
