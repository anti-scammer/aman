import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Tags, UserCheck } from 'lucide-react'
import { analyzeMessage } from '../api/client'
import type { AnalyzeMessageResult } from '../api/client'
import { ButtonSpinner, ErrorMessage } from '../components/Feedback'
import { TrustBadge } from '../components/TrustBadge'
import { VerdictCard } from '../components/VerdictCard'
import { useI18n } from '../i18n/LanguageContext'
import { categoryLabel } from '../i18n/strings'
import spotMessage from '../assets/illustrations/spot-message.svg'

export function MessageAnalyzer() {
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const [sender, setSender] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [result, setResult] = useState<AnalyzeMessageResult | null>(null)

  const runAnalysis = async () => {
    if (text.trim() === '') {
      setValidationError(t('requiredField'))
      return
    }
    setValidationError(null)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await analyzeMessage(text.trim(), sender.trim() || undefined))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runAnalysis()
  }

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <MessageSquare size={14} aria-hidden="true" /> {t('navCheckGroup')}
        </span>
        <h1>{t('msgAnalyzerTitle')}</h1>
        <p>{t('msgAnalyzerDesc')}</p>
      </header>

      {!result && !loading && (
        <div className="checker-art" aria-hidden="true">
          <img src={spotMessage} alt="" width={140} height={140} />
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">{t('msgInputLabel')}</span>
          <textarea
            className={`field-input field-textarea ${validationError ? 'invalid' : ''}`}
            rows={6}
            placeholder={t('msgInputPlaceholder')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setValidationError(null)
            }}
          />
        </label>
        {validationError && <p className="field-error">{validationError}</p>}

        <label className="field">
          <span className="field-label">{t('msgSenderLabel')}</span>
          <input
            type="text"
            dir="ltr"
            inputMode="tel"
            className="field-input mono"
            placeholder={t('msgSenderPlaceholder')}
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />
          <p className="field-hint">{t('msgSenderHint')}</p>
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <ButtonSpinner />}
          {loading ? t('analyzing') : t('analyzeNow')}
        </button>
      </form>

      {error != null && <ErrorMessage error={error} onRetry={() => void runAnalysis()} />}

      {result && (
        <div className="result-area">
          {result.sender && (
            <div className="sender-result">
              <p className="sender-result-title">
                <UserCheck size={16} aria-hidden="true" />
                {t('senderAssessment')}
              </p>
              {/* Full reasons (incl. SPOOFING_WARNING) are already merged into the
                  main verdict card by the backend; keep the sender card focused
                  on the trust badge but still surface its own reasons. */}
              <TrustBadge result={result.sender} />
            </div>
          )}

          <VerdictCard verdict={result.verdict} score={result.score} reasons={result.reasons}>
            {result.categories.length > 0 && (
              <div className="verdict-extra-block">
                <h3>
                  <Tags size={14} className="icon-inline" aria-hidden="true" />{' '}
                  {t('matchedCategories')}
                </h3>
                <div className="chip-row">
                  {result.categories.map((cat) => (
                    <span key={cat} className="chip">
                      {categoryLabel(lang, cat)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.extractedUrls.length > 0 && (
              <div className="verdict-extra-block">
                <h3>{t('extractedUrls')}</h3>
                <ul className="extracted-urls">
                  {result.extractedUrls.map((u) => (
                    <li key={u}>
                      <span className="mono" dir="ltr">
                        {u}
                      </span>
                      <Link
                        to={`/check-url?url=${encodeURIComponent(u)}`}
                        className="btn btn-outline btn-sm"
                      >
                        {t('checkThisUrl')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </VerdictCard>
        </div>
      )}
    </div>
  )
}
