import api from './axios'

export interface CurriculumItemDto {
  id: number
  type: string
  title: string
  description: string | null
  url: string | null
  weekIndex: number
  sortOrder: number
}

export const curriculumHubService = {
  getStatus: () =>
    api.get<{ statusCode: number; data: { enrolled: boolean } }>(
      'athlete/curriculum-hub/status'
    ),
  getItems: () =>
    api.get<{
      statusCode: number
      data: { items: CurriculumItemDto[]; enrolled: boolean }
    }>('athlete/curriculum-hub/items'),
}
