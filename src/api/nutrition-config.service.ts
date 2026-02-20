import api from './axios'

export interface NutritionConfigItem {
  key: string
  value: string | number | boolean | Record<string, unknown>
}

export const nutritionConfigService = {
  /** Admin: list all config keys */
  list: () =>
    api.get<{ statusCode: number; data: NutritionConfigItem[] }>(
      'admin/nutrition-config'
    ),

  /** Admin: get by key */
  getByKey: (key: string) =>
    api.get<{ statusCode: number; data: NutritionConfigItem }>(
      `admin/nutrition-config/key/${encodeURIComponent(key)}`
    ),

  /** Admin: create or update (upsert by key) */
  set: (body: {
    key: string
    value: string | number | boolean | Record<string, unknown>
  }) =>
    api.post<{ statusCode: number; data: NutritionConfigItem }>(
      'admin/nutrition-config',
      body
    ),

  /** Admin: update by key */
  update: (
    key: string,
    body: { value: string | number | boolean | Record<string, unknown> }
  ) =>
    api.put<{ statusCode: number; data: NutritionConfigItem }>(
      `admin/nutrition-config/key/${encodeURIComponent(key)}`,
      body
    ),

  /** Admin: delete by key */
  delete: (key: string) =>
    api.delete<{ statusCode: number }>(
      `admin/nutrition-config/key/${encodeURIComponent(key)}`
    ),
}
