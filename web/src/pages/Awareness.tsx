import { Link } from 'react-router-dom'
import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, ListChecks } from 'lucide-react'
import { getArticles } from '../api/client'
import { EmptyState, ErrorMessage, GridSkeleton } from '../components/Feedback'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/LanguageContext'
import { categoryLabel } from '../i18n/strings'
import spotAwareness from '../assets/illustrations/spot-awareness.svg'
import emptySearch from '../assets/illustrations/empty-search.svg'

export function Awareness() {
  const { t, pick, lang, dir } = useI18n()
  const { data, loading, error, reload } = useFetch(getArticles)
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div className="container">
      <header className="page-header page-header-art">
        <div className="page-header-text">
          <span className="page-eyebrow">
            <BookOpen size={14} aria-hidden="true" /> {t('navAwareness')}
          </span>
          <h1>{t('awarenessTitle')}</h1>
          <p>{t('awarenessDesc')}</p>
        </div>
        <img className="page-header-img" src={spotAwareness} alt="" width={120} height={120} />
      </header>

      <div className="card quiz-cta-card">
        <span className="quiz-cta-text">
          <GraduationCap size={22} aria-hidden="true" />
          {t('quizCta')}
        </span>
        <Link to="/quiz" className="btn btn-primary">
          <ListChecks size={16} aria-hidden="true" />
          {t('startQuiz')}
        </Link>
      </div>

      {loading && <GridSkeleton cards={6} />}
      {error != null && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && error == null && (
        <>
          {!data || data.length === 0 ? (
            <EmptyState illustration={emptySearch} text={t('awarenessEmpty')} />
          ) : (
            <div className="article-grid">
              {data.map((article) => (
                <Link key={article.id} to={`/awareness/${article.slug}`} className="card article-card">
                  <span className="chip">{categoryLabel(lang, article.category)}</span>
                  <h2>{pick(article.titleAr, article.titleEn)}</h2>
                  <p>{pick(article.summaryAr, article.summaryEn)}</p>
                  <span className="feature-cta">
                    {t('readArticle')} <Chevron size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
