import { DM_Sans, Hind_Siliguri } from "next/font/google";

// Mehediadmin-এর মতো একই দুই ফন্ট ও CSS variable নাম।
export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});
