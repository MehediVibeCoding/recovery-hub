"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export interface TurnstileHandle {
  waitForToken: (timeoutMs?: number) => Promise<string>;
  reset: () => void;
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

/** Cloudflare Turnstile (siteKey না থাকলে কিছুই দেখায় না — সার্ভারেও তখন যাচাই স্কিপ) */
const TurnstileBox = forwardRef<TurnstileHandle, { siteKey: string }>(function TurnstileBox({ siteKey }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef("");

  useImperativeHandle(ref, () => ({
    waitForToken: (timeoutMs = 10000) =>
      new Promise<string>((resolve) => {
        if (token.current) return resolve(token.current);
        const start = Date.now();
        const t = setInterval(() => {
          if (token.current || Date.now() - start >= timeoutMs) {
            clearInterval(t);
            resolve(token.current);
          }
        }, 100);
      }),
    reset: () => {
      token.current = "";
      if (window.turnstile && widgetId.current) {
        try {
          window.turnstile.reset(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    },
  }));

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || !box.current || widgetId.current) return;
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          size: "flexible",
          appearance: "interaction-only",
          retry: "auto",
          "refresh-expired": "auto",
          callback: (t: string) => (token.current = t),
          "error-callback": () => (token.current = ""),
          "expired-callback": () => (token.current = ""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (window.turnstile && widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
      token.current = "";
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={box} className="flex w-full justify-center" />;
});

export default TurnstileBox;
