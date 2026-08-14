import { useState } from 'react'
import { CheckCircle2, Flag } from 'lucide-react'
import { REPORT_TYPES, SCAM_CATEGORIES, submitReport } from '../api/client'
import type { ReportType, ScamCategory } from '../api/client'
import { ButtonSpinner, ErrorMessage } from '../components/Feedback'
import { useI18n } from '../i18n/LanguageContext'
import { categoryLabel } from '../i18n/strings'
import type { StringKey } from '../i18n/strings'

const TYPE_LABEL: Record<ReportType, StringKey> = {
  PHONE: 'typePhone',
  URL: 'typeUrl',
  SOCIAL_ACCOUNT: 'typeSocial',
}

const VALUE_PLACEHOLDER: Record<ReportType, StringKey> = {
  PHONE: 'reportValuePlaceholderPhone',
  URL: 'reportValuePlaceholderUrl',
  SOCIAL_ACCOUNT: 'reportValuePlaceholderSocial',
}

export function SubmitReport() {
  const { t, lang } = useI18n()
  const [type, setType] = useState<ReportType>('PHONE')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [scamCategory, setScamCategory] = useState<ScamCategory>('PRIZE_SCAM')
  const [reporterName, setReporterName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ value?: string; description?: string }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const resetForm = () => {
    setType('PHONE')
    setValue('')
    setDescription('')
    setScamCategory('PRIZE_SCAM')
    setReporterName('')
    setFieldErrors({})
    setError(null)
    setSubmitted(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: { value?: string; description?: string } = {}
    if (value.trim() === '') errors.value = t('requiredField')
    if (description.trim() === '') errors.description = t('requiredField')
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    setError(null)
    try {
      await submitReport({
        type,
        value: value.trim(),
        description: description.trim(),
        scamCategory,
        ...(reporterName.trim() ? { reporterName: reporterName.trim() } : {}),
      })
      setSubmitted(true)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="container page-narrow">
        <div className="card success-card" role="status">
          <div className="success-icon" aria-hidden="true">
            <CheckCircle2 size={36} />
          </div>
          <h1>{t('reportSuccessTitle')}</h1>
          <p>{t('reportSuccessBody')}</p>
          <button type="button" className="btn btn-primary" onClick={resetForm}>
            {t('submitAnother')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <Flag size={14} aria-hidden="true" /> {t('navSubmitReport')}
        </span>
        <h1>{t('submitReportTitle')}</h1>
        <p>{t('submitReportDesc')}</p>
      </header>

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <fieldset className="field">
          <legend className="field-label">{t('reportTypeLabel')}</legend>
          <div className="radio-row">
            {REPORT_TYPES.map((rt) => (
              <label key={rt} className={`radio-pill ${type === rt ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="report-type"
                  value={rt}
                  checked={type === rt}
                  onChange={() => setType(rt)}
                />
                {t(TYPE_LABEL[rt])}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="field-label">{t('reportValueLabel')}</span>
          <input
            type="text"
            dir={type === 'SOCIAL_ACCOUNT' ? undefined : 'ltr'}
            className={`field-input ${type !== 'SOCIAL_ACCOUNT' ? 'mono' : ''} ${fieldErrors.value ? 'invalid' : ''}`}
            placeholder={t(VALUE_PLACEHOLDER[type])}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setFieldErrors((prev) => ({ ...prev, value: undefined }))
            }}
          />
        </label>
        {fieldErrors.value && <p className="field-error">{fieldErrors.value}</p>}

        <label className="field">
          <span className="field-label">{t('reportDescLabel')}</span>
          <textarea
            className={`field-input field-textarea ${fieldErrors.description ? 'invalid' : ''}`}
            rows={4}
            placeholder={t('reportDescPlaceholder')}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setFieldErrors((prev) => ({ ...prev, description: undefined }))
            }}
          />
        </label>
        {fieldErrors.description && <p className="field-error">{fieldErrors.description}</p>}

        <label className="field">
          <span className="field-label">{t('reportCategoryLabel')}</span>
          <select
            className="field-input"
            value={scamCategory}
            onChange={(e) => setScamCategory(e.target.value as ScamCategory)}
          >
            {SCAM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabel(lang, cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t('reporterNameLabel')}</span>
          <input
            type="text"
            className="field-input"
            placeholder={t('reporterNamePlaceholder')}
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <ButtonSpinner />}
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      {error != null && <ErrorMessage error={error} />}
    </div>
  )
}
