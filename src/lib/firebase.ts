import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY
  )
}

export function getFirebaseMessaging(): Messaging | null {
  if (typeof globalThis.window === 'undefined') return null
  if (!isFirebaseConfigured()) return null
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    return getMessaging(app)
  } catch {
    return null
  }
}

/** Request notification permission and return FCM token for web push. Call after login for athletes. */
export async function requestFcmToken(): Promise<string | null> {
  if (
    typeof globalThis.window === 'undefined' ||
    !('Notification' in globalThis)
  )
    return null
  if (!isFirebaseConfigured()) return null
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string
  if (!vapidKey) return null

  const supported = await isSupported()
  if (!supported) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const messaging = getFirebaseMessaging()
    if (!messaging) return null

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await getOrRegisterServiceWorker(),
    })
    return token || null
  } catch (e) {
    console.warn('FCM getToken failed:', e)
    return null
  }
}

function getOrRegisterServiceWorker(): Promise<
  ServiceWorkerRegistration | undefined
> {
  if (
    typeof globalThis.navigator === 'undefined' ||
    !globalThis.navigator.serviceWorker
  ) {
    return Promise.resolve(undefined)
  }
  const nav = globalThis.navigator
  return nav.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then(reg => reg)
    .catch(() => undefined)
}
