import { useState } from 'react'
import { CheckCircle2, ListChecks, XCircle } from 'lucide-react'
import { getQuiz } from '../api/client'
import type { QuizQuestion } from '../api/client'
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback'
import { useFetch } from '../hooks/useFetch'
import { useI18n } from '../i18n/LanguageContext'

function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const { t, pick, lang } = useI18n()
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const numFmt = (n: number) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')

  const restart = () => {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    const ratio = questions.length > 0 ? score / questions.length : 0
    const feedback =
      ratio === 1 ? t('quizPerfect') : ratio >= 0.6 ? t('quizGood') : t('quizNeedsWork')
    return (
      <div className="card quiz-card quiz-result">
        <h2>{t('quizResultTitle')}</h2>
        <p className="quiz-score-big">
          {numFmt(score)} <span className="muted">{t('quizScoreOutOf')}</span> {numFmt(questions.length)}
        </p>
        <div className="score-gauge-track quiz-result-track" aria-hidden="true">
          <div
            className={`score-gauge-fill ${ratio >= 0.6 ? 'fill-safe' : ratio >= 0.3 ? 'fill-suspicious' : 'fill-dangerous'}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p>{feedback}</p>
        <button type="button" className="btn btn-primary" onClick={restart}>
          {t('retakeQuiz')}
        </button>
      </div>
    )
  }

  const question = questions[index]
  const answered = selected !== null
  const isCorrect = selected === question.correctOptionId
  const isLast = index === questions.length - 1

  const choose = (optionId: string) => {
    if (answered) return
    setSelected(optionId)
    if (optionId === question.correctOptionId) setScore((s) => s + 1)
  }

  const next = () => {
    if (isLast) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
      setSelected(null)
    }
  }

  return (
    <div className="card quiz-card">
      <p className="quiz-progress muted">
        {t('questionLabel')} {numFmt(index + 1)} {t('ofLabel')} {numFmt(questions.length)}
      </p>
      <div className="quiz-progress-track" aria-hidden="true">
        <div
          className="quiz-progress-fill"
          style={{ width: `${Math.round(((index + (answered ? 1 : 0)) / questions.length) * 100)}%` }}
        />
      </div>

      <h2 className="quiz-question">{pick(question.questionAr, question.questionEn)}</h2>

      <div className="quiz-options" role="group">
        {question.options.map((option) => {
          let cls = 'quiz-option'
          if (answered) {
            if (option.id === question.correctOptionId) cls += ' correct'
            else if (option.id === selected) cls += ' wrong'
            else cls += ' disabled'
          }
          return (
            <button
              key={option.id}
              type="button"
              className={cls}
              disabled={answered}
              onClick={() => choose(option.id)}
            >
              {pick(option.textAr, option.textEn)}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`}>
          <strong>
            {isCorrect ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : (
              <XCircle size={16} aria-hidden="true" />
            )}
            {isCorrect ? t('correctAnswer') : t('wrongAnswer')}
          </strong>
          <p>
            <span className="muted">{t('explanationLabel')}:</span>{' '}
            {pick(question.explanationAr, question.explanationEn)}
          </p>
          <button type="button" className="btn btn-primary" onClick={next}>
            {isLast ? t('showResult') : t('nextQuestion')}
          </button>
        </div>
      )}
    </div>
  )
}

export function QuizPage() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useFetch(getQuiz)

  return (
    <div className="container page-narrow">
      <header className="page-header">
        <span className="page-eyebrow">
          <ListChecks size={14} aria-hidden="true" /> {t('navQuiz')}
        </span>
        <h1>{t('quizTitle')}</h1>
        <p>{t('quizDesc')}</p>
      </header>

      {loading && <Loading />}
      {error != null && <ErrorMessage error={error} onRetry={reload} />}

      {!loading && error == null && (
        <>
          {!data || data.length === 0 ? (
            <EmptyState icon={<ListChecks size={26} />} text={t('quizEmpty')} />
          ) : (
            <QuizRunner questions={data} />
          )}
        </>
      )}
    </div>
  )
}
