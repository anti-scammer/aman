import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AtSign,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Link2,
  MessageSquare,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { getFlaggedUrls, getReportsStats } from '../api/client'
import { VerdictBadge } from '../components/VerdictCard'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'
import heroUrl from '../assets/illustrations/hero.svg'
import spotUrl from '../assets/illustrations/spot-url.svg'
import spotMessage from '../assets/illustrations/spot-message.svg'
import spotSocial from '../assets/illustrations/spot-social.svg'
import spotSender from '../assets/illustrations/spot-sender.svg'
import spotCommunity from '../assets/illustrations/spot-community.svg'
import spotAwareness from '../assets/illustrations/spot-awareness.svg'

const FEATURES: {
  to: string
  icon: React.ComponentType<{ size?: number | string }>
  art: string
  title: StringKey
  desc: StringKey
}[] = [
  { to: '/check-url', icon: Link2, art: spotUrl, title: 'featureUrlTitle', desc: 'featureUrlDesc' },
  { to: '/analyze-message', icon: MessageSquare, art: spotMessage, title: 'featureMsgTitle', desc: 'featureMsgDesc' },
  { to: '/check-social', icon: AtSign, art: spotSocial, title: 'featureSocialTitle', desc: 'featureSocialDesc' },
  { to: '/check-sender', icon: Phone, art: spotSender, title: 'featureSenderTitle', desc: 'featureSenderDesc' },
  { to: '/reports', icon: Users, art: spotCommunity, title: 'featureReportsTitle', desc: 'featureReportsDesc' },
  { to: '/awareness', icon: BookOpen, art: spotAwareness, title: 'featureAwarenessTitle', desc: 'featureAwarenessDesc' },
]

/** Animated count-up (skipped under prefers-reduced-motion). */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

function StatCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number | string }>
  label: StringKey
  value: number
}) {
  const { t, lang } = useI18n()
  const animated = useCountUp(value)
  return (
    <div className="stat-cell">
      <span className="stat-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="stat-body">
        <span className="stat-value">
          {animated.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
        </span>
        <span className="stat-label">{t(label)}</span>
      </span>
    </div>
  )
}

function StatsStrip() {
  const { t } = useI18n()
  const { data, loading, error } = useFetch(getReportsStats)

  if (loading) {
    return (
      <div className="stats-strip" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton-card">
            <span className="skeleton sk-line-lg sk-w-50" />
            <span className="skeleton sk-line sk-w-70" />
          </div>
        ))}
      </div>
    )
  }
  // Stats are decorative on the home page — degrade quietly if offline.
  if (error || !data) {
    return <p className="muted stats-unavailable">{t('statsUnavailable')}</p>
  }

  return (
    <div className="stats-strip">
      <StatCell icon={ShieldCheck} label="statsTotalReports" value={data.total ?? 0} />
      <StatCell icon={Phone} label="statsPhones" value={data.byType?.PHONE ?? 0} />
      <StatCell icon={Link2} label="statsUrls" value={data.byType?.URL ?? 0} />
      <StatCell icon={AtSign} label="statsAccounts" value={data.byType?.SOCIAL_ACCOUNT ?? 0} />
    </div>
  )
}

/** Three most recently flagged URLs; hidden entirely when unavailable/empty. */
function RecentFlaggedStrip() {
  const { t, dir, lang } = useI18n()
  const { data, loading, error } = useFetch(() => getFlaggedUrls(1))

  if (loading || error || !data || data.items.length === 0) return null
  const items = data.items.slice(0, 3)
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <section className="container section">
      <div className="section-head">
        <h2 className="section-title">{t('recentFlaggedTitle')}</h2>
        <Link to="/flagged" className="section-link">
          {t('viewAll')} <Chevron size={15} aria-hidden="true" />
        </Link>
      </div>
      <div className="recent-strip">
        {items.map((item) => (
          <article key={`${item.url}-${item.lastSeenAt}`} className="recent-card">
            <VerdictBadge verdict={item.verdict} />
            {/* Deliberately not a hyperlink — these URLs must not be opened. */}
            <p className="recent-url" dir="ltr">
              {item.url}
            </p>
            <p className="recent-meta">
              <Activity size={12} aria-hidden="true" />
              {t('timesChecked')}: {item.timesChecked.toLocaleString(locale)}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const { t, lang } = useI18n()
  const steps: { title: StringKey; desc: StringKey }[] = [
    { title: 'howStep1Title', desc: 'howStep1Desc' },
    { title: 'howStep2Title', desc: 'howStep2Desc' },
    { title: 'howStep3Title', desc: 'howStep3Desc' },
  ]
  return (
    <section className="section how-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">{t('howItWorksTitle')}</h2>
        </div>
        <div className="how-grid">
        {steps.map((step, i) => (
          <div key={step.title} className="how-step">
            <div className="how-step-head">
              <span className="step-num" aria-hidden="true">
                {(i + 1).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </span>
              <h3>{t(step.title)}</h3>
            </div>
            <p>{t(step.desc)}</p>
          </div>
        ))}
        </div>
      </div>
    </section>
  )
}

export function Home() {
  const { t, dir } = useI18n()
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <>
      <section className="hero">
        <div className="container hero-inner hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <ShieldCheck size={15} aria-hidden="true" />
              {t('appTagline')}
            </span>
            <h1>{t('heroTitle')}</h1>
            <p className="hero-subtitle">{t('heroSubtitle')}</p>
            <div className="hero-actions">
              <Link to="/check-url" className="btn btn-primary btn-lg">
                <Link2 size={18} aria-hidden="true" />
                {t('heroCheckUrl')}
              </Link>
              <Link to="/analyze-message" className="btn btn-ghost btn-lg">
                <MessageSquare size={18} aria-hidden="true" />
                {t('heroAnalyzeMessage')}
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <img src={heroUrl} alt={t('heroImageAlt')} width={480} height={360} />
          </div>
        </div>
      </section>

      <section className="container">
        <StatsStrip />
      </section>

      <section className="container section">
        <div className="section-head">
          <h2 className="section-title">{t('featuresTitle')}</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <Link key={feature.to} to={feature.to} className="feature-card">
              <span className="feature-art" aria-hidden="true">
                <img src={feature.art} alt="" loading="lazy" width={80} height={80} />
              </span>
              <span className="feature-icon-wrap" aria-hidden="true">
                <feature.icon size={18} />
              </span>
              <h3>{t(feature.title)}</h3>
              <p>{t(feature.desc)}</p>
              <span className="feature-cta">
                {t('goTo')} <Chevron size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <RecentFlaggedStrip />

      <HowItWorks />
    </>
  )
}
