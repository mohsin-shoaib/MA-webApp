import api from './axios'
import type {
  CreateAthleteGoalDTO,
  UpdateAthleteGoalDTO,
  SetPrimaryGoalDTO,
  AthleteGoal,
  AthleteGoalsResponse,
  AthleteGoalResponse,
} from '@/types/athlete-goal'

export const athleteGoalsService = {
  getMyGoals: (): Promise<AthleteGoal[]> =>
    api
      .get<AthleteGoalsResponse>('athlete/goals')
      .then(r => (r.data?.data ?? []) as AthleteGoal[]),

  createGoal: (data: CreateAthleteGoalDTO) =>
    api.post<AthleteGoalResponse>('athlete/goals', data),

  updateGoal: (goalId: number, data: UpdateAthleteGoalDTO) =>
    api.put<AthleteGoalResponse>(`athlete/goals/${goalId}`, data),

  deleteGoal: (goalId: number) =>
    api.delete<AthleteGoalResponse>(`athlete/goals/${goalId}`),

  setPrimaryGoal: (goalId: number, data: SetPrimaryGoalDTO) =>
    api.post<AthleteGoalResponse>(`athlete/goals/${goalId}/set-primary`, data),
}
