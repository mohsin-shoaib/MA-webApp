import type {
  ConfirmCycleTransitionDTO,
  CycleTransitionResponse,
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
}
