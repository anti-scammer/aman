import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getArticle } from '../api/client'
import { ArticleSkeleton, ErrorMessage } from '../components/Feedback'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/LanguageContext'
import { categoryLabel } from '../i18n/strings'
import { markdownToHtml } from '../utils/markdown'

export function ArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { t, pick, lang, dir } = useI18n()
  const BackChevron = dir === 'rtl' ? ChevronRight : ChevronLeft
  const { data, loading, error, reload } = useFetch(() => getArticle(slug), [slug])

  const bodyHtml = useMemo(() => {
    if (!data) return ''
    return markdownToHtml(pick(data.bodyAr, data.bodyEn))
  }, [data, pick])

  return (
    <div className="container page-narrow">
      <p>
        <Link to="/awareness" className="back-link">
          <BackChevron size={16} aria-hidden="true" /> {t('backToArticles')}
        </Link>
      </p>

      {loading && <ArticleSkeleton />}
      {error != null && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && error == null && data && (
        <article className="card article-body-card">
          <span className="chip">{categoryLabel(lang, data.category)}</span>
          <h1>{pick(data.titleAr, data.titleEn)}</h1>
          <p className="article-summary muted">{pick(data.summaryAr, data.summaryEn)}</p>
          {/* Markdown is converted by our own helper which HTML-escapes the
              source first, so this cannot inject markup. */}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </article>
      )}
    </div>
  )
}
