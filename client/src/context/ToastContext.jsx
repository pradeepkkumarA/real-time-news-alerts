import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    ({ title, body, url, tone = 'info' }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, title, body, url, tone }]);
      setTimeout(() => dismiss(id), 7000);
    },
    [dismiss]
  );

  const border = { info: 'border-slate-300', breaking: 'border-red-500', error: 'border-red-300' };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`card animate-slideIn border-l-4 p-3 ${border[t.tone]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {t.tone === 'breaking' && (
                  <span className="mb-1 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Breaking
                  </span>
                )}
                <p className="text-sm font-semibold leading-snug">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-slate-500">{t.body}</p>}
                {t.url && (
                  <a href={t.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-red-600 hover:underline">
                    Read story
                  </a>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
