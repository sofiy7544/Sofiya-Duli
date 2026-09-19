import { useCallback, useEffect, useRef, useState } from 'react';
import { store, useStoreVersion } from './mock/store';

export type Resource<T> = { data: T | undefined; loading: boolean; error: Error | null; retry: () => void };

/**
 * Минимальный аналог useEffect+api в реальных экранах (или react-query).
 * Повторно запрашивает при смене режима данных; мутации обновляют тихо, без skeleton.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const version = useStoreVersion();
  const mode = store.settings.dataMode;
  const [state, setState] = useState<{ data?: T; loading: boolean; error: Error | null }>({ loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  const lastMode = useRef(mode);
  const hasData = useRef(false);

  useEffect(() => {
    let alive = true;
    const modeChanged = lastMode.current !== mode;
    lastMode.current = mode;
    if (!hasData.current || modeChanged || nonce) setState((s) => ({ data: modeChanged ? undefined : s.data, loading: true, error: null }));
    load().then(
      (data) => { if (alive) { hasData.current = true; setState({ data, loading: false, error: null }); } },
      (error: Error) => { if (alive) { hasData.current = false; setState({ data: undefined, loading: false, error }); } },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, mode, nonce, ...deps]);

  const retry = useCallback(() => { hasData.current = false; if (store.settings.dataMode === 'error') store.setSettings({ dataMode: 'ready' }); setNonce((n) => n + 1); }, []);
  return { data: state.data, loading: state.loading, error: state.error, retry };
}
