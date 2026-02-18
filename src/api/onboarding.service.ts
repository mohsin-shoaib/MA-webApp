import type {
  OnboardingProps,
  OnboardingResponse,
  CreateOnboardingDTO,
  UpdateOnboardingDTO,
  OnboardingResponseV2,
  ConfirmOnboardingPayload,
  ConfirmOnboardingResponse,
} from '@/types/onboarding'
import api from './axios'

export const onboardingService = {
  // Legacy method - kept for backward compatibility
  createOnboarding: (payload: OnboardingProps) =>
    api.post<OnboardingResponse>('create', payload),

  // New methods for recommendation flow
  createOnboardingV2: (data: CreateOnboardingDTO) =>
    api.post<OnboardingResponseV2>('athlete/onboarding/create', data),

  /**
   * Defer-save: confirm onboarding with full payload. Backend creates onboarding,
   * recommendation (with confirmed cycle), roadmap, and cycle transition. Call only on Step 3.
   */
  confirmOnboarding: (payload: ConfirmOnboardingPayload) =>
    api.post<ConfirmOnboardingResponse>('athlete/onboarding/confirm', payload),

  updateOnboarding: (onboardingId: number, data: UpdateOnboardingDTO) =>
    api.put<OnboardingResponseV2>(
      `athlete/onboarding/update-by-id/${onboardingId}`,
      data
    ),

  /**
   * Mark onboarding as completed (e.g. when user clicks "Go to dashboard" on step 4).
   * Backend sets onboarding_completed so GET dashboard returns isOnboarded: true next time.
   */
  completeOnboarding: () =>
    api.post<{ statusCode: number; data?: unknown; message?: string }>(
      'athlete/onboarding/complete'
    ),
}
