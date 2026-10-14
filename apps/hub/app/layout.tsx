import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recovery Hub",
  description: "Vangcur abandoned-checkout recovery system",
};

const NAV_ITEMS = [
  { label: "Overview", href: "#", active: true },
  { label: "Drafts Inbox", href: "#" },
  { label: "SMS Agent", href: "#" },
  { label: "Templates", href: "#" },
  { label: "Orders Backup", href: "#" },
  { label: "Export Center", href: "#" },
  { label: "Settings", href: "#" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-white/10 p-4">
            <div className="mb-6 text-lg font-semibold">Recovery Hub</div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm ${
                    item.active
                      ? "bg-white/10 font-medium"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
