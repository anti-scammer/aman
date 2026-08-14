import { useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { searchReports } from '../api/client'
import type { Report, ReportsSearchResult, ReportType } from '../api/client'
import { EmptyState, ErrorMessage, ListSkeleton } from '../components/Feedback'
import { useI18n } from '../i18n/LanguageContext'
import emptySearch from '../assets/illustrations/empty-search.svg'
import { categoryLabel } from '../i18n/strings'
import type { StringKey } from '../i18n/strings'

const TYPE_OPTIONS: { value: ReportType | ''; label: StringKey }[] = [
  { value: '', label: 'typeAll' },
  { value: 'PHONE', label: 'typePhone' },
  { value: 'URL', label: 'typeUrl' },
  { value: 'SOCIAL_ACCOUNT', label: 'typeSocial' },
]

const TYPE_LABEL: Record<ReportType, StringKey> = {
  PHONE: 'typePhone',
  URL: 'typeUrl',
  SOCIAL_ACCOUNT: 'typeSocial',
}

function ReportRow({ report }: { report: Report }) {
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
      </div>
      <p className="report-value mono" dir="ltr">
        {report.value}
      </p>
      {report.description && <p className="report-desc">{report.description}</p>}
      <p className="report-meta muted">
        <CalendarDays size={13} aria-hidden="true" />
        {t('reportedOn')}: {dateText}
        {report.reporterName ? ` — ${report.reporterName}` : ''}
      </p>
    </article>
  )
}

export function SearchReports() {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<ReportType | ''>('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [result, setResult] = useState<ReportsSearchResult | null>(null)
  const [searched, setSearched] = useState(false)

  const runSearch = async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await searchReports({
        query: query.trim() || undefined,
        type: type || undefined,
        page: targetPage,
      })
      setResult(res)
      setPage(targetPage)
      setSearched(true)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runSearch(1)
  }

  const items = result?.items ?? []
  const totalPages = result?.totalPages ?? 1
  const numFmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <Search size={14} aria-hidden="true" /> {t('navSearchReports')}
        </span>
        <h1>{t('searchReportsTitle')}</h1>
        <p>{t('searchReportsDesc')}</p>
      </header>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field field-grow">
            <span className="field-label">{t('searchInputLabel')}</span>
            <input
              type="text"
              className="field-input"
              placeholder={t('searchInputPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('searchTypeLabel')}</span>
            <select
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as ReportType | '')}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {t('search')}
        </button>
      </form>

      {loading && <ListSkeleton rows={3} />}
      {error != null && <ErrorMessage error={error} onRetry={() => void runSearch(page)} />}

      {!loading && error == null && searched && result && (
        <div className="result-area">
          <p className="muted">
            {t('resultsCount')}: {numFmt(result.total ?? items.length)}
          </p>

          {items.length === 0 ? (
            <EmptyState illustration={emptySearch} text={t('noResults')} />
          ) : (
            <div className="report-list">
              {items.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1 || loading}
                onClick={() => void runSearch(page - 1)}
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
                onClick={() => void runSearch(page + 1)}
              >
                {t('nextPage')}
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  )
}
