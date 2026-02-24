/**
 * Generates public/firebase-messaging-sw.js from the template using env vars.
 * Run before dev or build so the service worker gets the Firebase config from .env.
 * The generated file is gitignored; only the template is committed.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')

// Load .env (Vite-style: only VITE_* and unquoted values)
function loadEnv() {
  const envPath = resolve(root, '.env')
  try {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      const [, key, value] = match
      const trimmed = value.replace(/^["']|["']$/g, '').trim()
      if (key.startsWith('VITE_')) process.env[key] = trimmed
    }
  } catch {
    // .env may not exist
  }
}

loadEnv()

const vars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

const templatePath = resolve(root, 'public', 'firebase-messaging-sw.template.js')
const outPath = resolve(root, 'public', 'firebase-messaging-sw.js')

let content = readFileSync(templatePath, 'utf8')
for (const key of vars) {
  const value = process.env[key] ?? ''
  content = content.replace(new RegExp(`__${key}__`, 'g'), value)
}

writeFileSync(outPath, content, 'utf8')
console.log('Generated public/firebase-messaging-sw.js from env')
