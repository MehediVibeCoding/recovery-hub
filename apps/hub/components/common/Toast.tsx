"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// একটাই toast element পুনর্ব্যবহার; নতুন মেসেজে টাইমার রিসেট (Mehediadmin-এর Toast)
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-[calc(14px+env(safe-area-inset-top,0px))] z-[9999] w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-2xl bg-ink px-5 py-2.5 text-center text-[13px] font-medium leading-snug text-white shadow-sh3 transition-opacity duration-300 md:bottom-6 md:top-auto md:rounded-full"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
