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

/** Shield with an olive-branch mark — brand logo. */
export function ShieldLogo({ className = 'logo-mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="aman-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a6b3c" />
          <stop offset="1" stopColor="#0c3b20" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 L42 9.5 V23 C42 34.5 34.5 42.5 24 45.5 C13.5 42.5 6 34.5 6 23 V9.5 Z"
        fill="url(#aman-shield)"
      />
      {/* Olive branch: curved stem + leaf pairs */}
      <path
        d="M24 36 C23 30 23 24 25.5 18.5"
        stroke="#e9f5ee"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M23.4 31.5 C19.5 31.5 17 29 16.5 25.5 C20.5 25.8 23 28 23.4 31.5 Z" fill="#7fc79a" />
      <path d="M23.6 31.5 C27.5 31 30 28.5 30.5 25 C26.5 25.4 24 27.8 23.6 31.5 Z" fill="#a8d8bb" />
      <path d="M23.5 25.5 C20 25.3 17.8 23 17.5 19.8 C21.2 20.2 23.3 22.3 23.5 25.5 Z" fill="#a8d8bb" />
      <path d="M24 25.3 C27.5 24.8 29.6 22.5 30 19.2 C26.3 19.8 24.3 22 24 25.3 Z" fill="#7fc79a" />
      <circle cx="25.8" cy="15.8" r="2.3" fill="#e9f5ee" />
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
