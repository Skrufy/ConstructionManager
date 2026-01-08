'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Language, getTranslation, getTranslationWithParams, detectBrowserLanguage, supportedLanguages } from './index'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
  supportedLanguages: typeof supportedLanguages
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LANGUAGE_STORAGE_KEY = 'constructionpro_language'

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: Language
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage || 'en')
  const [isLoading, setIsLoading] = useState(true)

  // Initialize language on mount
  useEffect(() => {
    const initLanguage = async () => {
      // Priority: 1) User preference from API, 2) LocalStorage, 3) Browser language
      let lang: Language = 'en'

      // Check localStorage first
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (stored && (stored === 'en' || stored === 'es')) {
        lang = stored as Language
      } else {
        // Detect from browser
        lang = detectBrowserLanguage()
      }

      setLanguageState(lang)
      setIsLoading(false)
    }

    initLanguage()
  }, [])

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage)

    // Update HTML lang attribute
    document.documentElement.lang = newLanguage

    // Sync to API if user is authenticated
    syncLanguageToAPI(newLanguage)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return params
        ? getTranslationWithParams(language, key, params)
        : getTranslation(language, key)
    },
    [language]
  )

  // Sync language from API user profile
  const syncFromUser = useCallback((userLanguage: string | undefined) => {
    if (userLanguage && (userLanguage === 'en' || userLanguage === 'es')) {
      if (userLanguage !== language) {
        setLanguageState(userLanguage as Language)
        localStorage.setItem(LANGUAGE_STORAGE_KEY, userLanguage)
        document.documentElement.lang = userLanguage
      }
    }
  }, [language])

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

/**
 * Hook that just returns the translation function
 * Useful when you only need translations
 */
export function useTranslations() {
  const { t, language } = useLanguage()
  return { t, language }
}

/**
 * Sync language preference to API
 */
async function syncLanguageToAPI(language: Language) {
  try {
    await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
      credentials: 'include',
    })
  } catch (error) {
    // Silently fail - user preference is saved locally
    console.warn('Failed to sync language to API:', error)
  }
}
