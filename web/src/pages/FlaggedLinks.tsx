import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { getFlaggedUrls } from '../api/client'
import type { FlaggedUrl } from '../api/client'
import { EmptyState, ErrorMessage, ListSkeleton } from '../components/Feedback'
import emptySafe from '../assets/illustrations/empty-safe.svg'
import { ScoreGauge, VerdictBadge } from '../components/VerdictCard'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/LanguageContext'

function FlaggedRow({ item }: { item: FlaggedUrl }) {
  const { t, lang } = useI18n()
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
  const date = new Date(item.lastSeenAt)
  const dateText = Number.isNaN(date.getTime())
    ? item.lastSeenAt
    : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <article className={`card flagged-card flagged-${item.verdict}`}>
      <div className="flagged-card-top">
        <VerdictBadge verdict={item.verdict} />
        <span className="chip">
          {t('sourceLabel')}: {item.source === 'check' ? t('sourceCheck') : t('sourceReport')}
        </span>
      </div>
      {/* Deliberately not a hyperlink — these URLs must not be opened. */}
      <p className="report-value mono" dir="ltr">
        {item.url}
      </p>
      <ScoreGauge score={item.score} verdict={item.verdict} />
      <p className="report-meta muted">
        {t('timesChecked')}: {item.timesChecked.toLocaleString(locale)} — {t('lastSeen')}: {dateText}
      </p>
    </article>
  )
}

export function FlaggedLinks() {
  const { t, lang } = useI18n()
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch(() => getFlaggedUrls(page), [page])

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const numFmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <ShieldAlert size={14} aria-hidden="true" /> {t('navFlagged')}
        </span>
        <h1>{t('flaggedTitle')}</h1>
        <p>{t('flaggedDesc')}</p>
      </header>

      {loading && <ListSkeleton rows={4} />}
      {error != null && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && error == null && (
        <>
          {items.length === 0 ? (
            <EmptyState illustration={emptySafe} text={t('flaggedEmpty')} />
          ) : (
            <div className="report-list">
              {items.map((item) => (
                <FlaggedRow key={`${item.url}-${item.lastSeenAt}`} item={item} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('prevPage')}
              </button>
              <span>
                {t('pageLabel')} {numFmt(page)} / {numFmt(totalPages)}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('nextPage')}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
