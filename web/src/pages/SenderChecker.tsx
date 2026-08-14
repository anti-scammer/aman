import { useState } from 'react'
import { Phone, Users } from 'lucide-react'
import { checkSender } from '../api/client'
import type { CheckSenderResult } from '../api/client'
import { ButtonSpinner, ErrorMessage } from '../components/Feedback'
import { TrustBadge } from '../components/TrustBadge'
import { useI18n } from '../i18n/LanguageContext'
import spotSender from '../assets/illustrations/spot-sender.svg'

export function SenderChecker() {
  const { t, lang } = useI18n()
  const [value, setValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [result, setResult] = useState<CheckSenderResult | null>(null)

  const runCheck = async () => {
    if (value.trim() === '') {
      setValidationError(t('requiredField'))
      return
    }
    setValidationError(null)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await checkSender(value.trim()))
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void runCheck()
  }

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <Phone size={14} aria-hidden="true" /> {t('navCheckGroup')}
        </span>
        <h1>{t('senderCheckerTitle')}</h1>
        <p>{t('senderCheckerDesc')}</p>
      </header>

      {!result && !loading && (
        <div className="checker-art" aria-hidden="true">
          <img src={spotSender} alt="" width={140} height={140} />
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">{t('senderInputLabel')}</span>
          <input
            type="text"
            dir="ltr"
            inputMode="tel"
            className={`field-input mono ${validationError ? 'invalid' : ''}`}
            placeholder={t('senderInputPlaceholder')}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
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

      {error != null && <ErrorMessage error={error} onRetry={() => void runCheck()} />}

      {result && (
        <div className="result-area">
          <TrustBadge result={result}>
            {result.communityReports > 0 && (
              <div className="verdict-extra">
                <span className="verdict-extra-label">
                  <Users size={16} aria-hidden="true" />
                  {t('communityReportsSenderLabel')}
                </span>
                <span className="verdict-extra-value">
                  {result.communityReports.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>
            )}
          </TrustBadge>
        </div>
      )}
    </div>
  )
}
