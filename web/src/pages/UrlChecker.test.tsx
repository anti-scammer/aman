import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UrlChecker } from './UrlChecker'
import * as client from '../api/client'
import { ApiError } from '../api/client'
import { renderWithProviders, t } from '../test/utils'

const DANGEROUS: client.CheckUrlResult = {
  url: 'https://jawwal-prize.win/claim',
  verdict: 'dangerous',
  score: 82,
  reasons: [
    {
      code: 'BRAND_LOOKALIKE',
      message: 'يشبه اسم علامة تجارية فلسطينية (جوال)',
      messageEn: 'Resembles a Palestinian brand (Jawwal)',
    },
  ],
  communityReports: 3,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UrlChecker', () => {
  it('checks a URL and renders the verdict', async () => {
    const spy = vi.spyOn(client, 'checkUrl').mockResolvedValue(DANGEROUS)
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'https://jawwal-prize.win/claim')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))

    expect(spy).toHaveBeenCalledWith('https://jawwal-prize.win/claim')
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(t('verdictDangerous'))
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '82')
    expect(screen.getByText(DANGEROUS.reasons[0].message)).toBeInTheDocument()
  })

  it('accepts a bare domain without a scheme', async () => {
    const spy = vi.spyOn(client, 'checkUrl').mockResolvedValue({ ...DANGEROUS, url: 'bit.ly/xy' })
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'bit.ly/xy')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))

    expect(spy).toHaveBeenCalledWith('bit.ly/xy')
  })

  it('rejects input that is not a URL without calling the API', async () => {
    const spy = vi.spyOn(client, 'checkUrl')
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'not a url')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))

    expect(await screen.findByText(t('urlInvalid'))).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('clears the validation error as soon as the user edits the field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'bad')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))
    expect(await screen.findByText(t('urlInvalid'))).toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), 'x')
    await waitFor(() => expect(screen.queryByText(t('urlInvalid'))).not.toBeInTheDocument())
  })

  it('shows a network-specific message when the backend is unreachable', async () => {
    vi.spyOn(client, 'checkUrl').mockRejectedValue(
      new ApiError({ code: 'NETWORK_ERROR', message: 'Could not reach the server', isNetworkError: true })
    )
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'https://x.test')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errorNetwork'))
  })

  it('retries the same URL from the error state', async () => {
    const spy = vi
      .spyOn(client, 'checkUrl')
      .mockRejectedValueOnce(new ApiError({ code: 'HTTP_ERROR', message: 'boom', status: 500 }))
      .mockResolvedValueOnce(DANGEROUS)
    const user = userEvent.setup()
    renderWithProviders(<UrlChecker />)

    await user.type(screen.getByRole('textbox'), 'https://jawwal-prize.win/claim')
    await user.click(screen.getByRole('button', { name: t('checkNow') }))
    await screen.findByRole('alert')

    await user.click(screen.getByRole('button', { name: t('retry') }))

    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(t('verdictDangerous'))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('auto-checks a URL deep-linked from the message analyzer', async () => {
    const spy = vi.spyOn(client, 'checkUrl').mockResolvedValue(DANGEROUS)
    renderWithProviders(<UrlChecker />, {
      route: `/check-url?url=${encodeURIComponent('https://jawwal-prize.win/claim')}`,
    })

    await waitFor(() => expect(spy).toHaveBeenCalledWith('https://jawwal-prize.win/claim'))
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(t('verdictDangerous'))
  })
})
