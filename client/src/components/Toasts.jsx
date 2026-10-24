import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

// Dynamic success/error messages (auto-dismiss)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('danger', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`alert alert-${t.type} shadow d-flex align-items-center gap-2 mb-0`} role="alert">
            <i className={`bi ${t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`} />
            <span className="flex-grow-1">{t.message}</span>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
