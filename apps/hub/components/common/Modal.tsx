"use client";

import { useEffect } from "react";
import Icon from "./Icon";

interface Props {
  eyebrow?: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** ডিটেইল/ভিউ মডালে true (Esc বন্ধ করে); সেভ-ফর্মে false */
  escToClose?: boolean;
  maxWidth?: string;
}

// মডাল শেল — DESIGN_SYSTEM §৬.১: মোবাইলে নিচ থেকে ওঠা শীট, ডেস্কটপে মাঝখানের কার্ড
export default function Modal({
  eyebrow,
  title,
  onClose,
  children,
  footer,
  escToClose = false,
  maxWidth = "max-w-[820px]",
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!escToClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escToClose, onClose]);

  return (
    <div
      className="animate-soft-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 backdrop-blur-[3px] md:items-center md:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`animate-sheet-up flex max-h-[94dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[30px] bg-white shadow-[0_-12px_50px_rgba(26,26,26,0.22)] md:max-h-[92dvh] md:rounded-[28px] md:shadow-[0_24px_70px_rgba(26,26,26,0.28)]`}
      >
        <div className="shrink-0 border-b border-brand-light/20 bg-gradient-to-b from-brand-light/[0.12] to-white px-5 pb-3.5 pt-2.5 md:pt-5">
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-brand-light/30 md:hidden" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <div className="font-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-light">
                  {eyebrow}
                </div>
              )}
              <h2 className="mt-0.5 break-words font-body text-[22px] font-black leading-tight text-ink">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="বন্ধ করুন"
              title="বন্ধ করুন"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sh1 transition-all duration-brand active:scale-95 lg:h-9 lg:w-9"
            >
              <Icon name="close" className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">{children}</div>
        {footer && (
          <div
            className="shrink-0 border-t border-border-base/70 bg-white px-5 pt-3.5"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
