import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, Users } from 'lucide-react'
import { checkUrl } from '../api/client'
import type { CheckUrlResult } from '../api/client'
import { ButtonSpinner, ErrorMessage } from '../components/Feedback'
import { VerdictCard } from '../components/VerdictCard'
import { useI18n } from '../i18n/LanguageContext'
import spotUrl from '../assets/illustrations/spot-url.svg'

function looksLikeUrl(value: string): boolean {
  const v = value.trim()
  if (v === '' || /\s/.test(v)) return false
  // Accept both full URLs and bare domains like "bit.ly/xy".
  return /^(https?:\/\/)?[^\s./]+\.[^\s.]{2,}/i.test(v)
}

export function UrlChecker() {
  const { t, lang } = useI18n()
  const [searchParams] = useSearchParams()
  const [url, setUrl] = useState(searchParams.get('url') ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [result, setResult] = useState<CheckUrlResult | null>(null)

  const runCheck = async (value: string) => {
    if (!looksLikeUrl(value)) {
      setValidationError(t('urlInvalid'))
      return
    }
    setValidationError(null)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await checkUrl(value.trim()))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Support deep-linking from the Message Analyzer (?url=…).
  useEffect(() => {
    const prefill = searchParams.get('url')
    if (prefill) {
      setUrl(prefill)
      void runCheck(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runCheck(url)
  }

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <Link2 size={14} aria-hidden="true" /> {t('navCheckGroup')}
        </span>
        <h1>{t('urlCheckerTitle')}</h1>
        <p>{t('urlCheckerDesc')}</p>
      </header>

      {!result && !loading && (
        <div className="checker-art" aria-hidden="true">
          <img src={spotUrl} alt="" width={140} height={140} />
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">{t('urlInputLabel')}</span>
          <input
            type="text"
            inputMode="url"
            dir="ltr"
            className={`field-input mono ${validationError ? 'invalid' : ''}`}
            placeholder={t('urlInputPlaceholder')}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setValidationError(null)
            }}
          />
        </label>
        {validationError && <p className="field-error">{validationError}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <ButtonSpinner />}
          {loading ? t('checking') : t('checkNow')}
        </button>
      </form>

      {error != null && <ErrorMessage error={error} onRetry={() => void runCheck(url)} />}

      {result && (
        <div className="result-area">
          <p className="checked-value mono" dir="ltr">
            {result.url}
          </p>
          <VerdictCard verdict={result.verdict} score={result.score} reasons={result.reasons}>
            <div className="verdict-extra">
              <span className="verdict-extra-label">
                <Users size={16} aria-hidden="true" />
                {t('communityReportsLabel')}
              </span>
              <span className="verdict-extra-value">
                {result.communityReports.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </span>
            </div>
          </VerdictCard>
        </div>
      )}
    </div>
  )
}
