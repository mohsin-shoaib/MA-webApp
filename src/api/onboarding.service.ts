import type { OnboardingProps, OnboardingResponse } from '@/types/onboarding'
import api from './axios'

export const onboardingService = {
  createOnboarding: (payload: OnboardingProps) =>
    api.post<OnboardingResponse>('onboarding/create', payload),
}
