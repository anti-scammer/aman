import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AtSign,
  BookOpen,
  ChevronDown,
  Flag,
  Home,
  Languages,
  Link2,
  ListChecks,
  Menu,
  MessageSquare,
  Phone,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
import type { StringKey } from '../i18n/strings'

/**
 * Brand mark: a shield holding an olive sprig.
 * Source of truth is assets/logo/aman-mark.svg; keep the two in step.
 */
export function ShieldLogo({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="aman-shield" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#2a8a51" />
          <stop offset="1" stopColor="#0d4526" />
        </linearGradient>
      </defs>
      <path
        d="M32 3.5 L57.5 12 V31.5 C57.5 46.8 47.2 57.4 32 61.5 C16.8 57.4 6.5 46.8 6.5 31.5 V12 Z"
        fill="url(#aman-shield)"
      />
      {/* Olive sprig: stem, two leaf pairs, one fruit */}
      <path
        d="M28.8 52.5 C26.2 43 27 32.6 33.4 23.4"
        stroke="#f2fbf5"
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M28.4 46.6 C20.8 47 15.6 42.6 14.3 34.8 C22.1 34.6 27.4 39 28.4 46.6 Z" fill="#8ed3a8" />
      <path d="M30.2 35.2 C23.6 34.2 19.6 29.4 19.6 22.6 C26.3 23.8 30.1 28.5 30.2 35.2 Z" fill="#8ed3a8" />
      <path d="M30 46.8 C37.4 45.4 41.8 40.2 41.8 32.8 C34.7 34.6 30.4 39.5 30 46.8 Z" fill="#d3edde" />
      <path d="M32.1 34.6 C38.5 32.6 42 27.2 41.4 20.4 C35.1 22.8 31.9 27.9 32.1 34.6 Z" fill="#d3edde" />
      <circle cx="34.6" cy="19.4" r="3.4" fill="#f4c95d" />
    </svg>
  )
}

interface NavItem {
  to: string
  label: StringKey
  icon: React.ComponentType<{ size?: number | string }>
}

const CHECK_ITEMS: NavItem[] = [
  { to: '/check-url', label: 'navUrlChecker', icon: Link2 },
  { to: '/analyze-message', label: 'navMessageAnalyzer', icon: MessageSquare },
  { to: '/check-social', label: 'navSocialChecker', icon: AtSign },
  { to: '/check-sender', label: 'navSenderChecker', icon: Phone },
]

const OTHER_ITEMS: NavItem[] = [
  { to: '/flagged', label: 'navFlagged', icon: ShieldAlert },
  { to: '/reports', label: 'navSearchReports', icon: Search },
  { to: '/awareness', label: 'navAwareness', icon: BookOpen },
  { to: '/quiz', label: 'navQuiz', icon: ListChecks },
]

function CheckDropdown() {
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isCheckRoute = CHECK_ITEMS.some((item) => location.pathname.startsWith(item.to))

  // Close on click outside / route change.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className={`nav-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`nav-link ${isCheckRoute ? 'active' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {t('navCheckGroup')}
        <ChevronDown size={15} className="chevron" aria-hidden="true" />
      </button>
      <div className="nav-dropdown-menu" role="menu">
        {CHECK_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            role="menuitem"
            className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
          >
            <span className="dropdown-item-icon" aria-hidden="true">
              <item.icon size={16} />
            </span>
            {t(item.label)}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function Layout() {
  const { t, toggleLang } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile panel after navigating.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Lock body scroll while the panel is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const isHome = location.pathname === '/'

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand">
            <ShieldLogo />
            <span className="brand-text">
              <span className="brand-name">{t('appName')}</span>
              <span className="brand-tagline">{t('appTagline')}</span>
            </span>
          </Link>

          <nav className="main-nav" aria-label="Main">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('navHome')}
            </NavLink>
            <CheckDropdown />
            {OTHER_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t(item.label)}
              </NavLink>
            ))}
            <Link to="/report" className="nav-cta">
              <Flag size={14} aria-hidden="true" />
              {t('navSubmitReport')}
            </Link>
            <button type="button" className="lang-toggle" onClick={toggleLang}>
              <Languages size={14} aria-hidden="true" />
              {t('langToggle')}
            </button>
          </nav>

          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-label={t('menuOpen')}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile slide-in panel */}
      <div
        className={`mobile-backdrop ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <div className={`mobile-panel ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-panel-head">
          <span className="brand" style={{ marginInlineEnd: 0 }}>
            <ShieldLogo />
            <span className="brand-name">{t('appName')}</span>
          </span>
          <button
            type="button"
            className="mobile-close"
            aria-label={t('menuClose')}
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <NavLink to="/" end className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
          <span className="dropdown-item-icon" aria-hidden="true">
            <Home size={16} />
          </span>
          {t('navHome')}
        </NavLink>

        <p className="mobile-group-label">{t('navCheckGroup')}</p>
        {CHECK_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
          >
            <span className="dropdown-item-icon" aria-hidden="true">
              <item.icon size={16} />
            </span>
            {t(item.label)}
          </NavLink>
        ))}

        <p className="mobile-group-label">{t('footerLinks')}</p>
        {OTHER_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}
          >
            <span className="dropdown-item-icon" aria-hidden="true">
              <item.icon size={16} />
            </span>
            {t(item.label)}
          </NavLink>
        ))}

        <Link to="/report" className="nav-cta">
          <Flag size={14} aria-hidden="true" />
          {t('navSubmitReport')}
        </Link>
        <button type="button" className="lang-toggle" onClick={toggleLang}>
          <Languages size={14} aria-hidden="true" />
          {t('langToggle')}
        </button>
      </div>

      <main className={`site-main ${isHome ? 'flush-top' : ''}`}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-col footer-about">
            <div className="footer-brand">
              <ShieldLogo />
              <span className="brand-name">{t('appName')}</span>
            </div>
            <p>{t('footerAbout')}</p>
            <p className="footer-disclaimer">{t('footerDisclaimer')}</p>
          </div>
          <div className="footer-col">
            <h3>{t('footerLinks')}</h3>
            <ul className="footer-links">
              {[...CHECK_ITEMS, ...OTHER_ITEMS].map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>
                    <item.icon size={13} aria-hidden="true" />
                    {t(item.label)}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/report">
                  <Flag size={13} aria-hidden="true" />
                  {t('navSubmitReport')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">{t('footerRights')}</div>
        </div>
      </footer>
    </div>
  )
}
