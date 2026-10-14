import type { Metadata, Viewport } from "next";
import "./globals.css";
import { dmSans, hindSiliguri } from "./fonts";
import { ToastProvider } from "../components/common/Toast";
import Sidebar from "../components/shell/Sidebar";

export const metadata: Metadata = {
  title: "Recovery Hub",
  description: "Vangcur abandoned-checkout recovery system",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${dmSans.variable} ${hindSiliguri.variable}`}>
      <body className="min-h-screen bg-transparent font-body text-ink antialiased">
        {/* Mehediadmin-এর স্কাই-ব্লু ক্যানভাস */}
        <div aria-hidden="true" className="fixed inset-0 -z-10 bg-gradient-to-b from-brand-bg via-[#DCEBFD] to-white" />
        <ToastProvider>
          <div className="relative flex min-h-screen w-full flex-col md:flex-row">
            <Sidebar />
            <main
              className="min-w-0 flex-1 overflow-x-hidden px-3.5 pt-3 sm:px-5 md:px-8 md:pb-8 md:pt-6 xl:px-10"
              style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="mx-auto w-full max-w-[1520px]">{children}</div>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
