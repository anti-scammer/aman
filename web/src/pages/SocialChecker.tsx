import { useState } from 'react'
import {
  AtSign,
  Camera,
  Globe,
  Hash,
  MessageCircle,
  Music2,
  Send,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { checkSocial } from '../api/client'
import type { CheckSocialResult, SocialPlatform } from '../api/client'
import { ButtonSpinner, ErrorMessage } from '../components/Feedback'
import { VerdictCard } from '../components/VerdictCard'
import { useI18n } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'
import spotSocial from '../assets/illustrations/spot-social.svg'

const PLATFORM_LABEL: Record<SocialPlatform, StringKey> = {
  FACEBOOK: 'platFACEBOOK',
  INSTAGRAM: 'platINSTAGRAM',
  TIKTOK: 'platTIKTOK',
  TELEGRAM: 'platTELEGRAM',
  X: 'platX',
  WHATSAPP: 'platWHATSAPP',
  UNKNOWN: 'platUNKNOWN',
}

function PlatformIcon({ platform, size = 16 }: { platform: SocialPlatform; size?: number }) {
  // lucide ships no brand icons — use recognizable generic stand-ins.
  switch (platform) {
    case 'FACEBOOK':
      return <ThumbsUp size={size} aria-hidden="true" />
    case 'INSTAGRAM':
      return <Camera size={size} aria-hidden="true" />
    case 'TIKTOK':
      return <Music2 size={size} aria-hidden="true" />
    case 'TELEGRAM':
      return <Send size={size} aria-hidden="true" />
    case 'X':
      return <Hash size={size} aria-hidden="true" />
    case 'WHATSAPP':
      return <MessageCircle size={size} aria-hidden="true" />
    default:
      return <Globe size={size} aria-hidden="true" />
  }
}

export function SocialChecker() {
  const { t, lang } = useI18n()
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown | null>(null)
  const [result, setResult] = useState<CheckSocialResult | null>(null)

  const runCheck = async () => {
    if (input.trim() === '') {
      setValidationError(t('requiredField'))
      return
    }
    setValidationError(null)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await checkSocial(input.trim()))
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
          <AtSign size={14} aria-hidden="true" /> {t('navCheckGroup')}
        </span>
        <h1>{t('socialCheckerTitle')}</h1>
        <p>{t('socialCheckerDesc')}</p>
      </header>

      {!result && !loading && (
        <div className="checker-art" aria-hidden="true">
          <img src={spotSocial} alt="" width={140} height={140} />
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">{t('socialInputLabel')}</span>
          <input
            type="text"
            dir="ltr"
            className={`field-input mono ${validationError ? 'invalid' : ''}`}
            placeholder={t('socialInputPlaceholder')}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
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
          <div className="chip-row" style={{ marginBottom: '0.75rem' }}>
            <span className="chip">
              <PlatformIcon platform={result.platform} size={13} />
              {t(PLATFORM_LABEL[result.platform])}
            </span>
            <span className="chip chip-neutral mono" dir="ltr">
              @{result.handle}
            </span>
          </div>
          <VerdictCard verdict={result.verdict} score={result.score} reasons={result.reasons}>
            <div className="verdict-extra">
              <span className="verdict-extra-label">
                <Users size={16} aria-hidden="true" />
                {t('communityReportsSocialLabel')}
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
