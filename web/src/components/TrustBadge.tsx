import { BadgeCheck, HelpCircle, OctagonAlert } from 'lucide-react'
import type { CheckSenderResult, SenderTrust, SenderType } from '../api/client'
import { useI18n } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'
import { ReasonList } from './VerdictCard'

const TYPE_LABEL: Record<SenderType, StringKey> = {
  PHONE: 'senderTypePHONE',
  SENDER_ID: 'senderTypeSENDER_ID',
}

const TRUST_DESC: Record<SenderTrust, StringKey> = {
  official: 'trustOfficialDesc',
  reported: 'trustReportedDesc',
  unknown: 'trustUnknownDesc',
}

function TrustIcon({ trust }: { trust: SenderTrust }) {
  if (trust === 'official') return <BadgeCheck size={30} aria-hidden="true" />
  if (trust === 'reported') return <OctagonAlert size={30} aria-hidden="true" />
  return <HelpCircle size={30} aria-hidden="true" />
}

/**
 * Trust card for a sender/caller check result:
 * official = green with checkmark, reported = red with report count,
 * unknown = neutral "no data — stay cautious".
 */
export function TrustBadge({
  result,
  showReasons = true,
  children,
}: {
  result: CheckSenderResult
  showReasons?: boolean
  /** Extra rows appended inside the card body. */
  children?: React.ReactNode
}) {
  const { t, lang } = useI18n()
  const numFmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')

  const title =
    result.trust === 'official'
      ? t('trustOfficial')
      : result.trust === 'reported'
        ? `${t('trustReportedBy')} ${numFmt(result.communityReports)} ${t('trustReportedUsers')}`
        : t('trustUnknown')

  return (
    <div className={`trust-card trust-${result.trust}`}>
      <span className="trust-icon">
        <TrustIcon trust={result.trust} />
      </span>
      <div className="trust-body">
        <p className="trust-title">{title}</p>
        <p className="trust-desc">{t(TRUST_DESC[result.trust])}</p>
        <div className="trust-meta">
          <span className="chip chip-neutral">{t(TYPE_LABEL[result.type])}</span>
          <span className="trust-value" dir="ltr">
            {result.normalizedValue || result.value}
          </span>
        </div>
        {showReasons && result.reasons.length > 0 && <ReasonList reasons={result.reasons} />}
        {children}
      </div>
    </div>
  )
}
