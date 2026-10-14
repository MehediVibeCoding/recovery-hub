import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

// Mehediadmin-এর DESIGN_SYSTEM.md v2 অনুযায়ী টোকেন — দুই প্যানেল একই পরিবার।
// ⚠️ `sm` = 480px (Tailwind ডিফল্ট 640px নয়), `lg` = কার্ড → টেবিল সুইচ।
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "359px",
      sm2: "411px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1200px",
      "2xl": "1440px",
    },
    extend: {
      colors: {
        brand: {
          bg: "#C3DEFC",
          light: "#44A7FC",
          "light-hover": "#3C93DE",
        },
        ink: "#1A1A1A",
        muted: "#6B7280",
        "surface-muted": "#F3F4F6",
        "border-base": "#E5E7EB",
        success: "#10B981",
        danger: "#E63946",
        warn: "#F59E0B",
      },
      fontFamily: {
        body: ["var(--font-dm-sans)", "var(--font-bengali)", "'Noto Sans Bengali'", "sans-serif"],
      },
      boxShadow: {
        sh1: "0 1px 4px rgba(0,0,0,.07)",
        sh2: "0 4px 18px rgba(0,0,0,.10)",
        sh3: "0 8px 36px rgba(0,0,0,.13)",
      },
      transitionDuration: { brand: "250ms" },
      keyframes: {
        softFadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "soft-fade-in": "softFadeIn .35s ease-out both",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // hover: শুধু হোভার-সক্ষম ডিভাইসে (মোবাইলে active: ব্যবহার করো)
      addVariant("hover", "@media (hover: hover) and (pointer: fine) { &:hover }");
    }),
  ],
};

export default config;
