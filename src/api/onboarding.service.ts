import type {
  OnboardingProps,
  OnboardingResponse,
  CreateOnboardingDTO,
  UpdateOnboardingDTO,
  OnboardingResponseV2,
} from '@/types/onboarding'
import api from './axios'

export const onboardingService = {
  // Legacy method - kept for backward compatibility
  createOnboarding: (payload: OnboardingProps) =>
    api.post<OnboardingResponse>('create', payload),

  // New methods for recommendation flow
  createOnboardingV2: (data: CreateOnboardingDTO) =>
    api.post<OnboardingResponseV2>('athlete/onboarding/create', data),

  updateOnboarding: (onboardingId: number, data: UpdateOnboardingDTO) =>
    api.put<OnboardingResponseV2>(
      `athlete/onboarding/update-by-id/${onboardingId}`,
      data
    ),
}
