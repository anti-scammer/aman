import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Banknote,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Copy,
  Flag,
  HelpCircle,
  KeyRound,
  Link2,
  Lock,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import type { Reason, Verdict } from '../api/client'
import { useI18n } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

const VERDICT_LABEL: Record<Verdict, StringKey> = {
  safe: 'verdictSafe',
  suspicious: 'verdictSuspicious',
  dangerous: 'verdictDangerous',
}

const VERDICT_DESC: Record<Verdict, StringKey> = {
  safe: 'verdictSafeDesc',
  suspicious: 'verdictSuspiciousDesc',
  dangerous: 'verdictDangerousDesc',
}

function VerdictIcon({ verdict, size = 34 }: { verdict: Verdict; size?: number }) {
  if (verdict === 'safe') return <CheckCircle2 size={size} aria-hidden="true" />
  if (verdict === 'suspicious') return <AlertTriangle size={size} aria-hidden="true" />
  return <XCircle size={size} aria-hidden="true" />
}

/** Small inline verdict pill (used in lists like the flagged-links feed). */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n()
  return (
    <span className={`verdict-badge verdict-${verdict}`}>
      <VerdictIcon verdict={verdict} size={13} /> {t(VERDICT_LABEL[verdict])}
    </span>
  )
}

/** Horizontal 0–100 risk score bar, colored by verdict (compact lists). */
export function ScoreGauge({ score, verdict }: { score: number; verdict: Verdict }) {
  const { t } = useI18n()
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="score-gauge">
      <div className="score-gauge-header">
        <span className="muted">{t('riskScore')}</span>
        <span className={`score-gauge-value text-${verdict}`}>{clamped} / 100</span>
      </div>
      <div
        className="score-gauge-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={t('riskScore')}
      >
        <div className={`score-gauge-fill fill-${verdict}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

/** Animated semicircular score dial (inline SVG), colored by verdict. */
export function ScoreDial({ score, verdict }: { score: number; verdict: Verdict }) {
  const { t } = useI18n()
  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  // Semicircle: r=65 → arc length π·65. Animate dashoffset after mount so the
  // CSS transition sweeps in (disabled under prefers-reduced-motion).
  const ARC = Math.PI * 65
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const offset = drawn ? ARC * (1 - clamped / 100) : ARC

  return (
    <div
      className="score-dial"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={t('riskScore')}
    >
      <svg className="score-dial-svg" viewBox="0 0 160 90" aria-hidden="true">
        <path className="dial-track" d="M 15 82 A 65 65 0 0 1 145 82" />
        <path
          className={`dial-fill fill-${verdict}`}
          d="M 15 82 A 65 65 0 0 1 145 82"
          strokeDasharray={ARC}
          strokeDashoffset={offset}
        />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className={`score-dial-value text-${verdict}`}
          fill="currentColor"
          style={{ fontSize: '1.6rem', fontWeight: 700 }}
        >
          {clamped}
        </text>
      </svg>
      <span className="score-dial-label">{t('riskScore')} / 100</span>
    </div>
  )
}

type ReasonTone = 'neutral' | 'danger' | 'ok'

/** Best-effort icon + tone for a backend reason code. */
function reasonPresentation(code: string): { Icon: typeof AlertCircle; tone: ReasonTone } {
  const c = code.toUpperCase()
  if (c.includes('OFFICIAL')) return { Icon: BadgeCheck, tone: 'ok' }
  if (c.includes('SPOOF')) return { Icon: ShieldAlert, tone: 'danger' }
  if (c.includes('REPORT')) return { Icon: Flag, tone: 'danger' }
  if (c.includes('UNKNOWN')) return { Icon: HelpCircle, tone: 'neutral' }
  if (c.includes('OTP') || c.includes('CREDENTIAL') || c.includes('PASSWORD'))
    return { Icon: KeyRound, tone: 'danger' }
  if (c.includes('HTTPS') || c.includes('SSL') || c.includes('TLS'))
    return { Icon: Lock, tone: 'danger' }
  if (c.includes('BRAND') || c.includes('LOOKALIKE') || c.includes('IMPERSON'))
    return { Icon: Copy, tone: 'danger' }
  if (
    c.includes('URL') ||
    c.includes('LINK') ||
    c.includes('SHORTENER') ||
    c.includes('DOMAIN') ||
    c.includes('TLD') ||
    c.includes('PUNYCODE') ||
    c.includes('IP_')
  )
    return { Icon: Link2, tone: 'neutral' }
  if (c.includes('PRIZE') || c.includes('PAYMENT') || c.includes('FEE') || c.includes('MONEY'))
    return { Icon: Banknote, tone: 'danger' }
  if (c.includes('URGEN')) return { Icon: Clock3, tone: 'danger' }
  if (c.includes('FREQUEN') || c.includes('CHECK')) return { Icon: Activity, tone: 'neutral' }
  return { Icon: AlertCircle, tone: 'neutral' }
}

/** Clean reasons list with a per-reason icon. Exported for TrustBadge reuse. */
export function ReasonList({ reasons }: { reasons: Reason[] }) {
  const { t, pick } = useI18n()
  if (reasons.length === 0) return <p className="muted">{t('noReasons')}</p>
  return (
    <ul className="reason-list">
      {reasons.map((reason) => {
        const { Icon, tone } = reasonPresentation(reason.code)
        return (
          <li key={reason.code} className={`reason-item tone-${tone}`}>
            <span className="reason-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span>{pick(reason.message, reason.messageEn)}</span>
          </li>
        )
      })}
    </ul>
  )
}

interface VerdictCardProps {
  verdict: Verdict
  score: number
  reasons: Reason[]
  /** Extra rows rendered under the reasons (e.g. community reports, extracted URLs). */
  children?: React.ReactNode
}

/**
 * Color-coded result card: big verdict icon in a tinted circle, animated
 * semicircular score dial, localized reasons with per-reason icons.
 */
export function VerdictCard({ verdict, score, reasons, children }: VerdictCardProps) {
  const { t } = useI18n()

  return (
    <div className={`verdict-card verdict-card-${verdict}`}>
      <div className="verdict-card-main">
        <div className="verdict-card-header">
          <div className={`verdict-icon-wrap verdict-${verdict}`}>
            <VerdictIcon verdict={verdict} />
          </div>
          <div>
            <h2 className={`verdict-title text-${verdict}`}>{t(VERDICT_LABEL[verdict])}</h2>
            <p className="verdict-desc">{t(VERDICT_DESC[verdict])}</p>
          </div>
        </div>
        <ScoreDial score={score} verdict={verdict} />
      </div>

      <div className="verdict-reasons">
        <h3>{t('reasonsTitle')}</h3>
        <ReasonList reasons={reasons} />
      </div>

      {children}
    </div>
  )
}
