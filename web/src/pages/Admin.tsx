import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Check, ShieldCheck, X } from 'lucide-react'
import { ApiError, getAdminReports, getAdminStats, moderateReport } from '../api/client'
import type {
  AdminQueueResult,
  AdminReport,
  AdminStats,
  ReportStatus,
  ReportType,
} from '../api/client'
import { ButtonSpinner, EmptyState, ErrorMessage, ListSkeleton } from '../components/Feedback'
import { useI18n } from '../i18n/LanguageContext'
import { categoryLabel } from '../i18n/strings'
import type { StringKey } from '../i18n/strings'

/**
 * Moderation console (PROJECT_PLAN.md §4.5).
 *
 * Deliberately not linked from the site navigation — a moderator reaches it by
 * URL. The shared secret lives in sessionStorage by default so it dies with the
 * tab; "remember" upgrades it to localStorage on a trusted machine.
 */

const TOKEN_KEY = 'aman.adminToken'

const TYPE_LABEL: Record<ReportType, StringKey> = {
  PHONE: 'typePhone',
  URL: 'typeUrl',
  SOCIAL_ACCOUNT: 'typeSocial',
}

const STATUS_LABEL: Record<ReportStatus, StringKey> = {
  PENDING: 'adminPending',
  APPROVED: 'adminApproved',
  REJECTED: 'adminRejected',
}

const STATUS_TABS: ReportStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

function readStoredToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    // Storage can throw in private-mode browsers; fall back to in-memory only.
    return ''
  }
}

function storeToken(token: string, remember: boolean) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    if (remember) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Token gate
// ---------------------------------------------------------------------------

function TokenGate({ onSubmit, error }: { onSubmit: (t: string, remember: boolean) => void; error: unknown }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [remember, setRemember] = useState(false)

  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onSubmit(value.trim(), remember)
      }}
    >
      <label className="field">
        <span className="field-label">{t('adminTokenLabel')}</span>
        <input
          type="password"
          className="field-input"
          dir="ltr"
          autoComplete="off"
          placeholder={t('adminTokenPlaceholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <label className="field-checkbox">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span>{t('adminRemember')}</span>
      </label>
      {error != null && <ErrorMessage error={error} />}
      <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
        {t('adminSignIn')}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Queue row
// ---------------------------------------------------------------------------

function QueueRow({
  report,
  busy,
  onDecide,
}: {
  report: AdminReport
  busy: boolean
  onDecide: (status: 'APPROVED' | 'REJECTED') => void
}) {
  const { t, lang } = useI18n()
  const date = new Date(report.createdAt)
  const dateText = Number.isNaN(date.getTime())
    ? report.createdAt
    : date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')

  return (
    <article className="card report-card">
      <div className="report-card-top">
        <span className="chip chip-type">{t(TYPE_LABEL[report.type])}</span>
        <span className="chip">{categoryLabel(lang, report.scamCategory)}</span>
        <span className={`chip chip-status chip-${report.status.toLowerCase()}`}>
          {t(STATUS_LABEL[report.status])}
        </span>
      </div>

      <p className="report-value mono" dir="ltr">
        {report.value}
      </p>
      {report.normalizedValue !== report.value && (
        <p className="muted mono report-normalized" dir="ltr">
          {t('adminNormalized')}: {report.normalizedValue}
        </p>
      )}
      {report.description && <p className="report-desc">{report.description}</p>}

      <p className="report-meta muted">
        <CalendarDays size={13} aria-hidden="true" />
        {t('reportedOn')}: {dateText} — {t('adminReporter')}:{' '}
        {report.reporterName || t('adminAnonymous')}
      </p>

      {report.status === 'PENDING' && (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            title={t('adminApproveHint')}
            onClick={() => onDecide('APPROVED')}
          >
            {busy ? <ButtonSpinner /> : <Check size={15} aria-hidden="true" />}
            {t('adminApprove')}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            title={t('adminRejectHint')}
            onClick={() => onDecide('REJECTED')}
          >
            <X size={15} aria-hidden="true" />
            {t('adminReject')}
          </button>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Admin() {
  const { t, lang } = useI18n()
  const [token, setToken] = useState<string>(() => readStoredToken())
  const [authError, setAuthError] = useState<unknown | null>(null)

  const [status, setStatus] = useState<ReportStatus>('PENDING')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AdminQueueResult | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const signOut = useCallback(() => {
    clearToken()
    setToken('')
    setResult(null)
    setStats(null)
    setError(null)
  }, [])

  const load = useCallback(
    async (targetStatus: ReportStatus, targetPage: number) => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const [queue, s] = await Promise.all([
          getAdminReports(token, { status: targetStatus, page: targetPage }),
          getAdminStats(token),
        ])
        setResult(queue)
        setStats(s)
        setStatus(targetStatus)
        setPage(targetPage)
      } catch (err) {
        // A rejected token must not stay in storage, or the gate never returns.
        if (err instanceof ApiError && err.status === 401) {
          clearToken()
          setToken('')
          setAuthError(err)
        } else {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (token) void load('PENDING', 1)
  }, [token, load])

  const decide = async (report: AdminReport, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(report.id)
    setNotice(null)
    try {
      await moderateReport(token, report.id, decision)
      setNotice(decision === 'APPROVED' ? t('adminApproved1') : t('adminRejected1'))
      await load(status, page)
    } catch (err) {
      setError(err)
    } finally {
      setBusyId(null)
    }
  }

  const signIn = (value: string, remember: boolean) => {
    storeToken(value, remember)
    setAuthError(null)
    setToken(value)
  }

  const numFmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')
  const items = result?.items ?? []
  const totalPages = result?.totalPages ?? 1

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <ShieldCheck size={14} aria-hidden="true" /> {t('adminTitle')}
        </span>
        <h1>{t('adminTitle')}</h1>
        <p>{t('adminDesc')}</p>
      </header>

      {!token ? (
        <TokenGate onSubmit={signIn} error={authError} />
      ) : (
        <>
          <div className="admin-bar">
            <div className="admin-tabs" role="tablist">
              {STATUS_TABS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={status === s}
                  className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline'}`}
                  disabled={loading}
                  onClick={() => void load(s, 1)}
                >
                  {t(STATUS_LABEL[s])}
                  {stats ? ` (${numFmt(stats.byStatus[s] ?? 0)})` : ''}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={signOut}>
              {t('adminSignOut')}
            </button>
          </div>

          {notice && (
            <p className="feedback feedback-success" role="status">
              {notice}
            </p>
          )}

          {loading && <ListSkeleton rows={3} />}
          {error != null && <ErrorMessage error={error} onRetry={() => void load(status, page)} />}

          {!loading && error == null && (
            <div className="result-area">
              <p className="muted">
                {t('resultsCount')}: {numFmt(result?.total ?? items.length)}
              </p>

              {items.length === 0 ? (
                <EmptyState icon={<ShieldCheck size={22} />} text={t('adminQueueEmpty')} />
              ) : (
                <div className="report-list">
                  {items.map((report) => (
                    <QueueRow
                      key={report.id}
                      report={report}
                      busy={busyId === report.id}
                      onDecide={(decision) => void decide(report, decision)}
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={page <= 1 || loading}
                    onClick={() => void load(status, page - 1)}
                  >
                    {t('prevPage')}
                  </button>
                  <span>
                    {t('pageLabel')} {numFmt(page)} / {numFmt(totalPages)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={page >= totalPages || loading}
                    onClick={() => void load(status, page + 1)}
                  >
                    {t('nextPage')}
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
