"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "../common/Icon";
import { MOBILE_TABS, NAV_ITEMS } from "./nav";
import { hubLogout } from "../../app/actions/auth";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-light font-body text-[15px] font-black text-white">
        RH
      </span>
      <span className="font-body text-[16px] font-black leading-tight text-ink">
        Recovery Hub
        <span className="block text-[11px] font-semibold text-muted">Vangcur</span>
      </span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const [sheet, setSheet] = useState(false);

  // রুট বদলালে শীট বন্ধ
  useEffect(() => setSheet(false), [pathname]);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const tabs = NAV_ITEMS.filter((n) => MOBILE_TABS.includes(n.href));
  const menuActive = !tabs.some((t) => isActive(pathname, t.href));

  return (
    <>
      {/* ডেস্কটপ সাইডবার (z-50) */}
      <aside
        aria-label="প্রধান মেনু"
        className="sticky top-0 z-50 hidden h-screen w-[236px] shrink-0 flex-col border-r border-white/90 bg-white/85 px-3 py-5 backdrop-blur md:flex"
      >
        <div className="px-2 pb-5">
          <Brand />
        </div>
        <nav className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-[14px] px-3.5 font-body text-[13.5px] font-extrabold transition-all duration-brand active:scale-[0.98] ${
                  active
                    ? "bg-brand-light text-white"
                    : "text-ink hover:bg-brand-light/10"
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={hubLogout} className="pt-3">
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3.5 font-body text-[13.5px] font-extrabold text-muted transition-all duration-brand hover:bg-red-50 hover:text-danger active:scale-[0.98]"
          >
            <Icon name="logout" className="h-5 w-5 shrink-0" />
            লগআউট
          </button>
        </form>
      </aside>

      {/* মোবাইল নিচের ট্যাব বার (z-40) */}
      <nav
        aria-label="প্রধান মেনু"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/90 bg-white/95 px-2 pt-1.5 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
      >
        {tabs.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl font-body text-[10.5px] font-extrabold transition-all duration-brand active:scale-95 ${
                active ? "text-brand-light" : "text-muted"
              }`}
            >
              <Icon name={item.icon} className="h-[22px] w-[22px]" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-label="সব মেনু খুলুন"
          className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl font-body text-[10.5px] font-extrabold transition-all duration-brand active:scale-95 ${
            menuActive ? "text-brand-light" : "text-muted"
          }`}
        >
          <Icon name="menu" className="h-[22px] w-[22px]" />
          মেনু
        </button>
      </nav>

      {/* মোবাইল মেনু ড্রয়ার (z-[550]/[560]) */}
      {sheet && (
        <>
          <div
            className="animate-soft-fade-in fixed inset-0 z-[550] bg-ink/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setSheet(false)}
          />
          <div
            className="animate-sheet-up fixed inset-x-0 bottom-0 z-[560] flex max-h-[86dvh] flex-col overflow-hidden rounded-t-[32px] bg-white px-4 pt-3 shadow-[0_-12px_50px_rgba(26,26,26,0.22)] md:hidden"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
            role="dialog"
            aria-modal="true"
            aria-label="মেনু"
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-border-base" />
            <div className="mb-3 px-1">
              <Brand />
            </div>
            <div className="grid grid-cols-1 gap-1.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-12 items-center gap-3 rounded-2xl px-4 font-body text-[14px] font-extrabold transition-all duration-brand active:scale-[0.98] ${
                      active ? "bg-brand-light text-white" : "bg-surface-muted/60 text-ink"
                    }`}
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              <form action={hubLogout}>
                <button
                  type="submit"
                  className="flex h-12 w-full items-center gap-3 rounded-2xl bg-red-50 px-4 font-body text-[14px] font-extrabold text-danger transition-all duration-brand active:scale-[0.98]"
                >
                  <Icon name="logout" className="h-5 w-5" />
                  লগআউট
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
