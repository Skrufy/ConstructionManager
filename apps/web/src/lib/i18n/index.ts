import enMessages from './en.json'
import esMessages from './es.json'

export type Language = 'en' | 'es'
export type Messages = typeof enMessages

const messages: Record<Language, Messages> = {
  en: enMessages,
  es: esMessages,
}

/**
 * Get all messages for a specific language
 */
export function getMessages(language: Language): Messages {
  return messages[language] || messages.en
}

/**
 * Get a nested translation value from a dot-notation key
 * e.g., 'common.save' => messages.common.save
 */
export function getTranslation(language: Language, key: string): string {
  const msgs = getMessages(language)
  const keys = key.split('.')
  let value: any = msgs

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
  }

  return typeof value === 'string' ? value : key
}

/**
 * Get a translation with interpolation
 * e.g., t('welcome', { name: 'John' }) with "welcome": "Welcome, {name}!"
 */
export function getTranslationWithParams(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = getTranslation(language, key)

  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), String(value))
    })
  }

  return text
}

/**
 * Supported languages list
 */
export const supportedLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
]

/**
 * Detect browser language, fallback to English
 */
export function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en'

  const browserLang = navigator.language?.split('-')[0]
  return supportedLanguages.some(l => l.code === browserLang)
    ? (browserLang as Language)
    : 'en'
}
