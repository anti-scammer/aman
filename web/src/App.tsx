import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LanguageProvider } from './i18n/LanguageContext'
import { Admin } from './pages/Admin'
import { ArticlePage } from './pages/ArticlePage'
import { Awareness } from './pages/Awareness'
import { FlaggedLinks } from './pages/FlaggedLinks'
import { Home } from './pages/Home'
import { MessageAnalyzer } from './pages/MessageAnalyzer'
import { QuizPage } from './pages/QuizPage'
import { SearchReports } from './pages/SearchReports'
import { SenderChecker } from './pages/SenderChecker'
import { SocialChecker } from './pages/SocialChecker'
import { SubmitReport } from './pages/SubmitReport'
import { UrlChecker } from './pages/UrlChecker'

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/check-url" element={<UrlChecker />} />
            <Route path="/analyze-message" element={<MessageAnalyzer />} />
            <Route path="/check-social" element={<SocialChecker />} />
            <Route path="/check-sender" element={<SenderChecker />} />
            <Route path="/reports" element={<SearchReports />} />
            <Route path="/report" element={<SubmitReport />} />
            <Route path="/flagged" element={<FlaggedLinks />} />
            <Route path="/awareness" element={<Awareness />} />
            <Route path="/awareness/:slug" element={<ArticlePage />} />
            <Route path="/quiz" element={<QuizPage />} />
            {/* Moderator-only; intentionally absent from the site navigation. */}
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
