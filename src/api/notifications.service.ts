import api from './axios'

const NOTIFICATION_TYPES = [
  'DAILY_WORKOUT_REMINDER',
  'CYCLE_TRANSITION_WARNING',
  'EVENT_COUNTDOWN',
  'INCOMPLETE_PROFILE_PROMPT',
  'NEW_ANNOUNCEMENT',
  'COACH_FEEDBACK',
  'CHAT_MENTION',
  'MARKETPLACE_ITEM_ASSIGNED',
  'PRICE_CHANGE',
] as const

export type NotificationTypeKey = (typeof NOTIFICATION_TYPES)[number]

export const NOTIFICATION_TYPE_LABELS: Record<NotificationTypeKey, string> = {
  DAILY_WORKOUT_REMINDER: 'Daily workout reminders',
  CYCLE_TRANSITION_WARNING: 'Cycle transition warnings',
  EVENT_COUNTDOWN: 'Event countdown',
  INCOMPLETE_PROFILE_PROMPT: 'Incomplete profile prompts',
  NEW_ANNOUNCEMENT: 'New announcements',
  COACH_FEEDBACK: 'Coach feedback',
  CHAT_MENTION: 'Chat mentions',
  MARKETPLACE_ITEM_ASSIGNED: 'Marketplace item assigned',
  PRICE_CHANGE: 'Price change (before billing)',
}

let currentFcmToken: string | null = null

export function getCurrentFcmToken(): string | null {
  return currentFcmToken
}

export function setCurrentFcmToken(token: string | null): void {
  currentFcmToken = token
}

interface PreferencesResponse {
  data: { preferences?: Record<string, boolean> }
}

export const notificationsService = {
  registerToken: (fcmToken: string, platform: string = 'web') =>
    api.post('athlete/notifications/register-token', { fcmToken, platform }),

  unregisterToken: (fcmToken: string) =>
    api.delete('athlete/notifications/unregister-token', {
      data: { fcmToken },
    }),

  getPreferences: () =>
    api.get<PreferencesResponse>('athlete/notifications/preferences'),

  updatePreferences: (preferences: Record<string, boolean>) =>
    api.patch('athlete/notifications/preferences', { preferences }),

  getNotificationTypes: () => NOTIFICATION_TYPES,
}
