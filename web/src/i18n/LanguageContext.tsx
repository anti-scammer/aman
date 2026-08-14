import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { strings } from './strings'
import type { Lang, StringKey } from './strings'

interface I18nContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  /** Translate a UI string key. */
  t: (key: StringKey) => string
  /** Pick the right field from a bilingual API object (message/messageAr vs messageEn). */
  pick: (arValue: string, enValue: string) => string
  toggleLang: () => void
  setLang: (lang: Lang) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'antiscammer-lang'

function loadInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ar' || saved === 'en') return saved
  } catch {
    // localStorage unavailable — fall through to default.
  }
  return 'ar' // Arabic-first
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(loadInitialLang)
  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr'

  // Flip document direction + language so the whole page (scrollbars,
  // native widgets, text alignment) follows the selected language.
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Ignore storage failures (private mode etc.)
    }
  }, [lang, dir])

  const t = useCallback((key: StringKey) => strings[lang][key], [lang])

  const pick = useCallback(
    (arValue: string, enValue: string) => (lang === 'ar' ? arValue : enValue || arValue),
    [lang],
  )

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir, t, pick, toggleLang, setLang }),
    [lang, dir, t, pick, toggleLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
