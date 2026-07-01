import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);

const TOAST_DURATION_MS = 4000;

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    return () => {};
  }
  return showToast;
}

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    const text = String(message || "").trim();
    if (!text) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message: text, type });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast ? (
        <div className={`app-toast app-toast-${toast.type}`} role="status" aria-live="polite">
          <span className="app-toast-message">{toast.message}</span>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
