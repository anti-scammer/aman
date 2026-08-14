import { useCallback, useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: unknown | null
}

/**
 * Small data-fetching hook: runs `fetcher` on mount (and whenever `deps`
 * change), tracks loading/error, and exposes `reload` for retry buttons.
 * Stale responses from superseded requests are ignored.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })
  const [reloadCounter, setReloadCounter] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFetcher = useCallback(fetcher, deps)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))
    memoFetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error })
      })
    return () => {
      cancelled = true
    }
  }, [memoFetcher, reloadCounter])

  const reload = useCallback(() => setReloadCounter((n) => n + 1), [])

  return { ...state, reload }
}
