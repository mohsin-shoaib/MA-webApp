import { requestFcmToken } from '@/lib/firebase'
import {
  notificationsService,
  setCurrentFcmToken,
  getCurrentFcmToken,
} from '@/api/notifications.service'

/**
 * Request permission, get FCM token, and register with backend.
 * Call after login for ATHLETE users, or on app load when already logged in as athlete.
 */
export async function registerFcmTokenIfNeeded(): Promise<void> {
  try {
    const token = await requestFcmToken()
    if (!token) return
    await notificationsService.registerToken(token, 'web')
    setCurrentFcmToken(token)
  } catch (e) {
    console.warn('FCM registration failed:', e)
  }
}

/**
 * Unregister current FCM token with backend. Call before logout.
 */
export async function unregisterFcmToken(): Promise<void> {
  const token = getCurrentFcmToken()
  if (!token) return
  try {
    await notificationsService.unregisterToken(token)
  } catch {
    // ignore
  } finally {
    setCurrentFcmToken(null)
  }
}
