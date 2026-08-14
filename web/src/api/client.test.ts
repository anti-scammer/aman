import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  checkUrl,
  getAdminReports,
  getAdminStats,
  moderateReport,
  searchReports,
  submitReport,
} from './client'

/** Minimal fetch stub returning a JSON body with the given status. */
function stubFetch(body: unknown, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
  vi.stubGlobal('fetch', spy)
  return spy
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request helper', () => {
  it('sends JSON and returns the parsed body', async () => {
    const result = { url: 'https://x.test', verdict: 'safe', score: 0, reasons: [], communityReports: 0 }
    const spy = stubFetch(result)

    await expect(checkUrl('https://x.test')).resolves.toEqual(result)

    const [, init] = spy.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ url: 'https://x.test' })
  })

  it('maps a server error body onto ApiError', async () => {
    stubFetch({ error: { code: 'VALIDATION_ERROR', message: 'url: invalid' } }, 400)

    await expect(checkUrl('nope')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'url: invalid',
      status: 400,
      isNetworkError: false,
    })
  })

  it('flags an unreachable server as a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    )

    const err = await checkUrl('https://x.test').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.isNetworkError).toBe(true)
    expect(err.code).toBe('NETWORK_ERROR')
  })

  it('survives a non-JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Response)
    )

    await expect(checkUrl('https://x.test')).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 502,
    })
  })
})

describe('paging', () => {
  it('derives totalPages when the server omits it', async () => {
    stubFetch({ items: [], total: 45, page: 2, pageSize: 20 })
    const res = await searchReports({ page: 2 })
    expect(res.totalPages).toBe(3)
  })

  it('never reports fewer than one page', async () => {
    stubFetch({ items: [], total: 0, page: 1, pageSize: 20 })
    expect((await searchReports({})).totalPages).toBe(1)
  })

  it('encodes the search query and type', async () => {
    const spy = stubFetch({ items: [], total: 0, page: 1, pageSize: 20 })
    await searchReports({ query: '+970599123456', type: 'PHONE', page: 1 })
    const url = spy.mock.calls[0][0] as string
    expect(url).toContain('query=%2B970599123456')
    expect(url).toContain('type=PHONE')
  })
})

describe('report submission', () => {
  it('posts the report payload as-is', async () => {
    const spy = stubFetch({ id: 'r1', type: 'PHONE', value: '+970599123456', status: 'PENDING' }, 201)
    await submitReport({
      type: 'PHONE',
      value: '+970599123456',
      description: 'scam caller',
      scamCategory: 'PRIZE_SCAM',
    })
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({
      type: 'PHONE',
      value: '+970599123456',
      description: 'scam caller',
      scamCategory: 'PRIZE_SCAM',
    })
  })
})

describe('admin endpoints', () => {
  it('sends the admin token as a header, never in the URL', async () => {
    const spy = stubFetch({ items: [], total: 0, page: 1, pageSize: 20 })
    await getAdminReports('secret-token-value-123456')

    const [url, init] = spy.mock.calls[0]
    expect(init.headers).toMatchObject({ 'x-admin-token': 'secret-token-value-123456' })
    // A token in the query string would leak into logs and browser history.
    expect(url).not.toContain('secret-token-value-123456')
  })

  it('defaults the queue to page 1 and passes the status filter', async () => {
    const spy = stubFetch({ items: [], total: 0, page: 1, pageSize: 20 })
    await getAdminReports('tok-0123456789abcdef', { status: 'APPROVED' })
    const url = spy.mock.calls[0][0] as string
    expect(url).toContain('status=APPROVED')
    expect(url).toContain('page=1')
  })

  it('PATCHes a moderation decision', async () => {
    const spy = stubFetch({ id: 'r1', status: 'APPROVED', previousStatus: 'PENDING' })
    const res = await moderateReport('tok-0123456789abcdef', 'r1', 'APPROVED')

    const [url, init] = spy.mock.calls[0]
    expect(url).toContain('/admin/reports/r1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ status: 'APPROVED' })
    expect(res.previousStatus).toBe('PENDING')
  })

  it('escapes the report id in the path', async () => {
    const spy = stubFetch({ id: 'a/b', status: 'REJECTED', previousStatus: 'PENDING' })
    await moderateReport('tok-0123456789abcdef', 'a/b', 'REJECTED')
    expect(spy.mock.calls[0][0]).toContain('/admin/reports/a%2Fb')
  })

  it('surfaces a 401 as an ApiError the UI can branch on', async () => {
    stubFetch({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing admin token' } }, 401)
    const err = await getAdminStats('wrong').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('surfaces the 503 raised when moderation is disabled server-side', async () => {
    stubFetch({ error: { code: 'ADMIN_DISABLED', message: 'Moderation is disabled' } }, 503)
    const err = await getAdminStats('tok-0123456789abcdef').catch((e) => e)
    expect(err.code).toBe('ADMIN_DISABLED')
    expect(err.status).toBe(503)
  })
})
