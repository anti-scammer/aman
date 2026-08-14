import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider } from '../i18n/LanguageContext'
import { strings } from '../i18n/strings'
import type { Lang } from '../i18n/strings'

/**
 * Render a component inside the providers every page depends on.
 * `lang` seeds the language the way the real app does — via localStorage —
 * so tests can assert Arabic (default) or English copy.
 */
export function renderWithProviders(
  ui: ReactElement,
  { lang = 'ar', route = '/', ...options }: { lang?: Lang; route?: string } & RenderOptions = {}
) {
  localStorage.setItem('antiscammer-lang', lang)
  const wrap = (node: ReactElement) => (
    <LanguageProvider>
      <MemoryRouter initialEntries={[route]}>{node}</MemoryRouter>
    </LanguageProvider>
  )

  const result = render(wrap(ui), options)
  return {
    ...result,
    // RTL's rerender replaces the whole tree, dropping the providers; re-wrap
    // so a rerendering test doesn't crash inside useI18n.
    rerender: (next: ReactElement) => result.rerender(wrap(next)),
  }
}

/** Localized UI string, for asserting without hardcoding Arabic in every test. */
export function t(key: keyof typeof strings.ar, lang: Lang = 'ar'): string {
  return strings[lang][key]
}
