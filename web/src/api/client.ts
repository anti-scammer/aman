/**
 * Typed API client for the Anti-Scam platform backend.
 * Contract: PROJECT_PLAN.md §4 (API Contract v1).
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Verdict = 'safe' | 'suspicious' | 'dangerous'

export type ReportType = 'PHONE' | 'URL' | 'SOCIAL_ACCOUNT'

export type ReportStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ScamCategory =
  | 'PRIZE_SCAM'
  | 'DELIVERY_SCAM'
  | 'JOB_SCAM'
  | 'BANK_PHISHING'
  | 'OTP_THEFT'
  | 'FAKE_SHOP'
  | 'CHARITY_SCAM'
  | 'CRYPTO_SCAM'
  | 'OTHER'

export const SCAM_CATEGORIES: ScamCategory[] = [
  'PRIZE_SCAM',
  'DELIVERY_SCAM',
  'JOB_SCAM',
  'BANK_PHISHING',
  'OTP_THEFT',
  'FAKE_SHOP',
  'CHARITY_SCAM',
  'CRYPTO_SCAM',
  'OTHER',
]

export const REPORT_TYPES: ReportType[] = ['PHONE', 'URL', 'SOCIAL_ACCOUNT']

/** A localized reason returned by the analyzers. */
export interface Reason {
  code: string
  /** Arabic message (the contract's `message` field). */
  message: string
  messageEn: string
}

// ---------------------------------------------------------------------------
// §4.1 URL Checker
// ---------------------------------------------------------------------------

export interface CheckUrlResult {
  url: string
  verdict: Verdict
  score: number
  reasons: Reason[]
  communityReports: number
}

// ---------------------------------------------------------------------------
// §4.2 Message Analyzer
// ---------------------------------------------------------------------------

export interface AnalyzeMessageResult {
  verdict: Verdict
  score: number
  categories: ScamCategory[]
  reasons: Reason[]
  extractedUrls: string[]
  /** Present when the request included a `sender` (§4.2c sender-aware analysis). */
  sender?: CheckSenderResult
}

// ---------------------------------------------------------------------------
// §4.2b Social Account Checker
// ---------------------------------------------------------------------------

export type SocialPlatform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'TELEGRAM'
  | 'X'
  | 'WHATSAPP'
  | 'UNKNOWN'

export interface CheckSocialResult {
  input: string
  platform: SocialPlatform
  handle: string
  verdict: Verdict
  score: number
  reasons: Reason[]
  communityReports: number
}

// ---------------------------------------------------------------------------
// §4.2c Sender / Caller Checker
// ---------------------------------------------------------------------------

export type SenderTrust = 'official' | 'reported' | 'unknown'

export type SenderType = 'PHONE' | 'SENDER_ID'

export interface CheckSenderResult {
  value: string
  normalizedValue: string
  type: SenderType
  trust: SenderTrust
  verdict: Verdict
  score: number
  communityReports: number
  reasons: Reason[]
}

// ---------------------------------------------------------------------------
// §4.3 Community Reports
// ---------------------------------------------------------------------------

export interface Report {
  id: string
  type: ReportType
  value: string
  description: string
  scamCategory: ScamCategory
  reporterName?: string | null
  status: ReportStatus
  createdAt: string
}

export interface ReportsSearchResult {
  items: Report[]
  page: number
  totalPages?: number
  pageSize?: number
  total: number
}

export interface NewReport {
  type: ReportType
  value: string
  description: string
  scamCategory: ScamCategory
  reporterName?: string
}

export interface ReportsStats {
  total: number
  byType: Partial<Record<ReportType, number>>
  byCategory: Partial<Record<ScamCategory, number>>
}

// ---------------------------------------------------------------------------
// §4.3b Flagged Links Feed
// ---------------------------------------------------------------------------

export interface FlaggedUrl {
  url: string
  verdict: Verdict
  score: number
  timesChecked: number
  lastSeenAt: string
  source: 'check' | 'report'
}

export interface FlaggedUrlsResult {
  items: FlaggedUrl[]
  page: number
  totalPages?: number
  pageSize?: number
  total: number
}

// ---------------------------------------------------------------------------
// §4.4 Awareness Hub
// ---------------------------------------------------------------------------

export interface ArticleSummary {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  summaryAr: string
  summaryEn: string
  category: string
  createdAt: string
}

export interface Article extends ArticleSummary {
  bodyAr: string
  bodyEn: string
}

export interface QuizOption {
  id: string
  textAr: string
  textEn: string
}

export interface QuizQuestion {
  id: string
  questionAr: string
  questionEn: string
  options: QuizOption[]
  correctOptionId: string
  explanationAr: string
  explanationEn: string
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: { code: string; message: string }
}

/** Error thrown for any failed request (HTTP error or network failure). */
export class ApiError extends Error {
  readonly code: string
  readonly status: number | null
  /** True when the server could not be reached at all (offline / not running). */
  readonly isNetworkError: boolean

  constructor(opts: {
    code: string
    message: string
    status?: number | null
    isNetworkError?: boolean
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.code = opts.code
    this.status = opts.status ?? null
    this.isNetworkError = opts.isNetworkError ?? false
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
  } catch {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server',
      isNetworkError: true,
    })
  }

  if (!res.ok) {
    let code = 'HTTP_ERROR'
    let message = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as Partial<ApiErrorBody>
      if (body?.error?.code) code = body.error.code
      if (body?.error?.message) message = body.error.message
    } catch {
      // Non-JSON error body — keep defaults.
    }
    throw new ApiError({ code, message, status: res.status })
  }

  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export function checkUrl(url: string): Promise<CheckUrlResult> {
  return request<CheckUrlResult>('/check-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export function analyzeMessage(text: string, sender?: string): Promise<AnalyzeMessageResult> {
  return request<AnalyzeMessageResult>('/analyze-message', {
    method: 'POST',
    body: JSON.stringify(sender ? { text, sender } : { text }),
  })
}

/** §4.2b — check a social profile URL or bare @handle. */
export function checkSocial(input: string): Promise<CheckSocialResult> {
  return request<CheckSocialResult>('/check-social', {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

/** §4.2c — check a phone number or SMS sender ID. */
export function checkSender(value: string): Promise<CheckSenderResult> {
  return request<CheckSenderResult>(`/check-sender?value=${encodeURIComponent(value)}`)
}

interface PagedResponse {
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

function withTotalPages<T extends PagedResponse>(res: T): T & { totalPages: number } {
  const totalPages =
    res.totalPages ??
    (res.total != null && res.pageSize ? Math.max(1, Math.ceil(res.total / res.pageSize)) : 1)
  return { ...res, totalPages }
}

export async function searchReports(params: {
  query?: string
  type?: ReportType
  page?: number
}): Promise<ReportsSearchResult> {
  const qs = new URLSearchParams()
  if (params.query) qs.set('query', params.query)
  if (params.type) qs.set('type', params.type)
  qs.set('page', String(params.page ?? 1))
  return withTotalPages(await request<ReportsSearchResult>(`/reports?${qs.toString()}`))
}

export function submitReport(report: NewReport): Promise<Report> {
  return request<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  })
}

export function getReportsStats(): Promise<ReportsStats> {
  return request<ReportsStats>('/reports/stats')
}

export async function getFlaggedUrls(page = 1): Promise<FlaggedUrlsResult> {
  return withTotalPages(await request<FlaggedUrlsResult>(`/flagged-urls?page=${page}`))
}

export function getArticles(): Promise<ArticleSummary[]> {
  return request<ArticleSummary[]>('/articles')
}

export function getArticle(slug: string): Promise<Article> {
  return request<Article>(`/articles/${encodeURIComponent(slug)}`)
}

export function getQuiz(): Promise<QuizQuestion[]> {
  return request<QuizQuestion[]>('/quiz')
}
