import { describe, expect, it } from 'vitest'
import { categoryLabel, strings } from './strings'
import { SCAM_CATEGORIES } from '../api/client'

describe('i18n dictionaries', () => {
  it('has identical key sets in Arabic and English', () => {
    const ar = Object.keys(strings.ar).sort()
    const en = Object.keys(strings.en).sort()
    // A missing key renders as `undefined` in the UI rather than failing the
    // build, so assert parity explicitly.
    expect(en).toEqual(ar)
  })

  it('has no blank values in either language', () => {
    for (const lang of ['ar', 'en'] as const) {
      const blank = Object.entries(strings[lang])
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key)
      expect(blank).toEqual([])
    }
  })

  it('translates every scam category the API can return', () => {
    for (const category of SCAM_CATEGORIES) {
      expect(categoryLabel('ar', category)).not.toBe(category)
      expect(categoryLabel('en', category)).not.toBe(category)
    }
  })

  it('falls back to the raw code for an unknown category', () => {
    expect(categoryLabel('ar', 'SOME_NEW_SCAM')).toBe('SOME_NEW_SCAM')
  })

  it('keeps Arabic as the primary language for shared UI copy', () => {
    // Arabic strings should actually be Arabic — guards against a copy/paste
    // that leaves English text in the `ar` dictionary.
    const arabic = /[؀-ۿ]/
    expect(strings.ar.adminTitle).toMatch(arabic)
    expect(strings.ar.verdictDangerous).toMatch(arabic)
    expect(strings.ar.navHome).toMatch(arabic)
  })
})
