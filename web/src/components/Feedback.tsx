import { AlertTriangle } from 'lucide-react'
import { ApiError } from '../api/client'
import { useI18n } from '../i18n/LanguageContext'

/** Centered loading spinner with localized label. */
export function Loading() {
  const { t } = useI18n()
  return (
    <div className="feedback feedback-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{t('loading')}</span>
    </div>
  )
}

/** Small spinner used inline inside submit buttons. */
export function ButtonSpinner() {
  return <span className="btn-spinner" aria-hidden="true" />
}

/**
 * Friendly error box. Network errors (backend offline) get a dedicated
 * message; API errors show the server-provided message when available.
 */
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n()

  let detail = t('errorGeneric')
  if (error instanceof ApiError) {
    detail = error.isNetworkError ? t('errorNetwork') : error.message || t('errorGeneric')
  }

  return (
    <div className="feedback feedback-error" role="alert">
      <div className="feedback-error-icon" aria-hidden="true">
        <AlertTriangle size={18} />
      </div>
      <div className="feedback-error-body">
        <strong>{t('errorTitle')}</strong>
        <p>{detail}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
            {t('retry')}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Friendly empty-list placeholder. Prefer an on-brand `illustration` (SVG URL);
 * falls back to a lucide `icon` in a tinted circle when no illustration is given.
 */
export function EmptyState({
  icon,
  illustration,
  text,
}: {
  icon?: React.ReactNode
  illustration?: string
  text: string
}) {
  return (
    <div className="card empty-state">
      {illustration ? (
        <img className="empty-state-art" src={illustration} alt="" loading="lazy" />
      ) : (
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <p>{text}</p>
    </div>
  )
}

/** One shimmering skeleton card imitating a list row. */
function SkeletonRow() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span className="skeleton sk-chip" />
      <span className="skeleton sk-line sk-w-70" />
      <span className="skeleton sk-line sk-w-90" />
      <span className="skeleton sk-line sk-w-30" />
    </div>
  )
}

/** Skeleton loader for vertical lists (reports, flagged links). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n()
  return (
    <div className="skeleton-list" role="status" aria-label={t('loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

/** Skeleton loader for card grids (articles). */
export function GridSkeleton({ cards = 6 }: { cards?: number }) {
  const { t } = useI18n()
  return (
    <div className="skeleton-grid" role="status" aria-label={t('loading')}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <span className="skeleton sk-chip" />
          <span className="skeleton sk-line-lg sk-w-70" />
          <span className="skeleton sk-line sk-w-90" />
          <span className="skeleton sk-line sk-w-50" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton loader for the article reading page. */
export function ArticleSkeleton() {
  const { t } = useI18n()
  return (
    <div className="skeleton-card" role="status" aria-label={t('loading')} style={{ padding: '2rem' }}>
      <span className="skeleton sk-chip" />
      <span className="skeleton sk-line-lg sk-w-70" />
      <span className="skeleton sk-line sk-w-90" />
      <span className="skeleton sk-line sk-w-90" />
      <span className="skeleton sk-line sk-w-70" />
      <span className="skeleton sk-line sk-w-90" />
      <span className="skeleton sk-line sk-w-50" />
    </div>
  )
}
