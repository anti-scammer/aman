import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Admin } from './Admin'
import * as client from '../api/client'
import { ApiError } from '../api/client'
import { renderWithProviders, t } from '../test/utils'

const TOKEN = 'admin-token-0123456789abcdef'

const PENDING_REPORT: client.AdminReport = {
  id: 'rep-1',
  type: 'PHONE',
  value: '0599 123 456',
  normalizedValue: '+970599123456',
  description: 'اتصل وادّعى أنه من جوال وطلب رمز التحقق',
  scamCategory: 'OTP_THEFT',
  reporterName: null,
  status: 'PENDING',
  createdAt: '2026-07-01T10:00:00.000Z',
}

const EMPTY_STATS: client.AdminStats = {
  byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
  pendingByType: { PHONE: 0, URL: 0, SOCIAL_ACCOUNT: 0 },
  total: 0,
}

function queue(items: client.AdminReport[]): client.AdminQueueResult {
  return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 }
}

function mockApi(items: client.AdminReport[] = [PENDING_REPORT]) {
  const reports = vi.spyOn(client, 'getAdminReports').mockResolvedValue(queue(items))
  const stats = vi.spyOn(client, 'getAdminStats').mockResolvedValue({
    ...EMPTY_STATS,
    byStatus: { PENDING: items.length, APPROVED: 16, REJECTED: 0 },
    total: items.length + 16,
  })
  return { reports, stats }
}

/** Sign in through the token gate the way a moderator would. */
async function signIn(user: ReturnType<typeof userEvent.setup>, token = TOKEN) {
  await user.type(screen.getByLabelText(t('adminTokenLabel')), token)
  await user.click(screen.getByRole('button', { name: t('adminSignIn') }))
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Admin token gate', () => {
  it('asks for a token before fetching anything', () => {
    const { reports } = mockApi()
    renderWithProviders(<Admin />)

    expect(screen.getByLabelText(t('adminTokenLabel'))).toBeInTheDocument()
    expect(reports).not.toHaveBeenCalled()
  })

  it('masks the token field', () => {
    mockApi()
    renderWithProviders(<Admin />)
    expect(screen.getByLabelText(t('adminTokenLabel'))).toHaveAttribute('type', 'password')
  })

  it('will not submit an empty token', async () => {
    mockApi()
    renderWithProviders(<Admin />)
    expect(screen.getByRole('button', { name: t('adminSignIn') })).toBeDisabled()
  })

  it('loads the pending queue after signing in', async () => {
    const { reports } = mockApi()
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await signIn(user)

    await waitFor(() =>
      expect(reports).toHaveBeenCalledWith(TOKEN, { status: 'PENDING', page: 1 })
    )
    expect(await screen.findByText(PENDING_REPORT.value)).toBeInTheDocument()
  })

  it('keeps the token in sessionStorage, not localStorage, by default', async () => {
    mockApi()
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await signIn(user)
    await screen.findByText(PENDING_REPORT.value)

    expect(sessionStorage.getItem('aman.adminToken')).toBe(TOKEN)
    expect(localStorage.getItem('aman.adminToken')).toBeNull()
  })

  it('persists the token to localStorage when "remember" is ticked', async () => {
    mockApi()
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await user.type(screen.getByLabelText(t('adminTokenLabel')), TOKEN)
    await user.click(screen.getByLabelText(t('adminRemember')))
    await user.click(screen.getByRole('button', { name: t('adminSignIn') }))
    await screen.findByText(PENDING_REPORT.value)

    expect(localStorage.getItem('aman.adminToken')).toBe(TOKEN)
  })

  it('discards a rejected token so the gate is not stuck in a retry loop', async () => {
    vi.spyOn(client, 'getAdminReports').mockRejectedValue(
      new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid or missing admin token', status: 401 })
    )
    vi.spyOn(client, 'getAdminStats').mockRejectedValue(
      new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid or missing admin token', status: 401 })
    )
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await signIn(user, 'wrong-token-value-123456')

    // Back at the gate, with nothing left in storage.
    expect(await screen.findByLabelText(t('adminTokenLabel'))).toBeInTheDocument()
    expect(sessionStorage.getItem('aman.adminToken')).toBeNull()
    expect(localStorage.getItem('aman.adminToken')).toBeNull()
  })

  it('surfaces the server-side "moderation disabled" state', async () => {
    vi.spyOn(client, 'getAdminReports').mockRejectedValue(
      new ApiError({ code: 'ADMIN_DISABLED', message: 'Moderation is disabled', status: 503 })
    )
    vi.spyOn(client, 'getAdminStats').mockRejectedValue(
      new ApiError({ code: 'ADMIN_DISABLED', message: 'Moderation is disabled', status: 503 })
    )
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await signIn(user)

    // Not a bad token, so the moderator stays signed in and sees the reason.
    expect(await screen.findByRole('alert')).toHaveTextContent('Moderation is disabled')
  })

  it('reuses a token already stored from a previous visit', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    const { reports } = mockApi()
    renderWithProviders(<Admin />)

    await waitFor(() => expect(reports).toHaveBeenCalledWith(TOKEN, { status: 'PENDING', page: 1 }))
    expect(screen.queryByLabelText(t('adminTokenLabel'))).not.toBeInTheDocument()
  })

  it('signing out clears the token and returns to the gate', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi()
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await screen.findByText(PENDING_REPORT.value)
    await user.click(screen.getByRole('button', { name: t('adminSignOut') }))

    expect(screen.getByLabelText(t('adminTokenLabel'))).toBeInTheDocument()
    expect(sessionStorage.getItem('aman.adminToken')).toBeNull()
  })
})

describe('Admin queue', () => {
  it('shows the review fields a moderator needs', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi()
    renderWithProviders(<Admin />)

    const card = (await screen.findByText(PENDING_REPORT.value)).closest('article')!
    expect(within(card).getByText(PENDING_REPORT.description)).toBeInTheDocument()
    // Normalized value is shown because it differs from the raw input.
    expect(within(card).getByText(/\+970599123456/)).toBeInTheDocument()
    // The reporter line is one paragraph, so assert on its text content.
    expect(card).toHaveTextContent(t('adminAnonymous'))
  })

  it('explains an empty queue instead of rendering a blank page', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi([])
    renderWithProviders(<Admin />)

    expect(await screen.findByText(t('adminQueueEmpty'))).toBeInTheDocument()
  })

  it('switches to the approved tab on demand', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    const { reports } = mockApi()
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    await screen.findByText(PENDING_REPORT.value)
    await user.click(screen.getByRole('tab', { name: new RegExp(t('adminApproved')) }))

    await waitFor(() =>
      expect(reports).toHaveBeenLastCalledWith(TOKEN, { status: 'APPROVED', page: 1 })
    )
  })
})

describe('Admin decisions', () => {
  it('approves a report and refreshes the queue', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    const { reports } = mockApi()
    const moderate = vi.spyOn(client, 'moderateReport').mockResolvedValue({
      ...PENDING_REPORT,
      status: 'APPROVED',
      previousStatus: 'PENDING',
    })
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    const card = (await screen.findByText(PENDING_REPORT.value)).closest('article')!
    await user.click(within(card).getByRole('button', { name: t('adminApprove') }))

    expect(moderate).toHaveBeenCalledWith(TOKEN, 'rep-1', 'APPROVED')
    expect(await screen.findByText(t('adminApproved1'))).toBeInTheDocument()
    // Queue reloaded so the decided report leaves the pending list.
    await waitFor(() => expect(reports).toHaveBeenCalledTimes(2))
  })

  it('rejects a report', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi()
    const moderate = vi.spyOn(client, 'moderateReport').mockResolvedValue({
      ...PENDING_REPORT,
      status: 'REJECTED',
      previousStatus: 'PENDING',
    })
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    const card = (await screen.findByText(PENDING_REPORT.value)).closest('article')!
    await user.click(within(card).getByRole('button', { name: t('adminReject') }))

    expect(moderate).toHaveBeenCalledWith(TOKEN, 'rep-1', 'REJECTED')
    expect(await screen.findByText(t('adminRejected1'))).toBeInTheDocument()
  })

  it('offers no decision buttons for an already-decided report', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi([{ ...PENDING_REPORT, status: 'APPROVED' }])
    renderWithProviders(<Admin />)

    await screen.findByText(PENDING_REPORT.value)
    expect(screen.queryByRole('button', { name: t('adminApprove') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('adminReject') })).not.toBeInTheDocument()
  })

  it('reports a failed decision without losing the queue', async () => {
    sessionStorage.setItem('aman.adminToken', TOKEN)
    mockApi()
    vi.spyOn(client, 'moderateReport').mockRejectedValue(
      new ApiError({ code: 'NOT_FOUND', message: 'Report not found', status: 404 })
    )
    const user = userEvent.setup()
    renderWithProviders(<Admin />)

    const card = (await screen.findByText(PENDING_REPORT.value)).closest('article')!
    await user.click(within(card).getByRole('button', { name: t('adminApprove') }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Report not found')
  })
})
