import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerdictCard } from './VerdictCard'
import type { Reason, Verdict } from '../api/client'
import { renderWithProviders, t } from '../test/utils'

const REASONS: Reason[] = [
  {
    code: 'BRAND_LOOKALIKE',
    message: 'يشبه اسم علامة تجارية فلسطينية (جوال)',
    messageEn: 'Resembles a Palestinian brand (Jawwal)',
  },
  {
    code: 'URL_SHORTENER',
    message: 'رابط مختصر يخفي الوجهة الحقيقية',
    messageEn: 'Shortened link hides the real destination',
  },
]

describe('VerdictCard', () => {
  it.each<[Verdict, 'verdictSafe' | 'verdictSuspicious' | 'verdictDangerous']>([
    ['safe', 'verdictSafe'],
    ['suspicious', 'verdictSuspicious'],
    ['dangerous', 'verdictDangerous'],
  ])('renders the %s verdict with its localized label', (verdict, key) => {
    const { container } = renderWithProviders(
      <VerdictCard verdict={verdict} score={50} reasons={[]} />
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(t(key))
    // The color coding is what a user actually reads first (§7).
    expect(container.querySelector(`.verdict-card-${verdict}`)).not.toBeNull()
  })

  it('exposes the score as an accessible meter', () => {
    renderWithProviders(<VerdictCard verdict="dangerous" score={82} reasons={REASONS} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '82')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps an out-of-range score into 0–100', () => {
    const { rerender } = renderWithProviders(
      <VerdictCard verdict="dangerous" score={140} reasons={[]} />
    )
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')

    rerender(<VerdictCard verdict="safe" score={-20} reasons={[]} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows Arabic reason text by default', () => {
    renderWithProviders(<VerdictCard verdict="dangerous" score={82} reasons={REASONS} />)
    expect(screen.getByText(REASONS[0].message)).toBeInTheDocument()
    expect(screen.queryByText(REASONS[0].messageEn)).not.toBeInTheDocument()
  })

  it('shows English reason text when the language is English', () => {
    renderWithProviders(<VerdictCard verdict="dangerous" score={82} reasons={REASONS} />, {
      lang: 'en',
    })
    expect(screen.getByText(REASONS[0].messageEn)).toBeInTheDocument()
    expect(screen.queryByText(REASONS[0].message)).not.toBeInTheDocument()
  })

  it('explains an empty reasons list instead of rendering nothing', () => {
    renderWithProviders(<VerdictCard verdict="safe" score={0} reasons={[]} />)
    expect(screen.getByText(t('noReasons'))).toBeInTheDocument()
  })

  it('renders extra children under the reasons', () => {
    renderWithProviders(
      <VerdictCard verdict="safe" score={0} reasons={[]}>
        <div>community reports: 3</div>
      </VerdictCard>
    )
    expect(screen.getByText('community reports: 3')).toBeInTheDocument()
  })
})
