import type { IconName } from "../common/Icon";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: "home" },
  { label: "Drafts Inbox", href: "/drafts", icon: "inbox" },
  { label: "Stock Requests", href: "/stock", icon: "bell" },
  { label: "SMS Agent", href: "/sms-agent", icon: "chat" },
  { label: "Templates", href: "/templates", icon: "template" },
  { label: "Orders Backup", href: "/orders", icon: "box" },
  { label: "Export Center", href: "/export", icon: "download" },
  { label: "Settings", href: "/settings", icon: "cog" },
];

/** মোবাইলের নিচের ট্যাব বারে সরাসরি দেখানো আইটেম; বাকিগুলো "মেনু" শীটে */
export const MOBILE_TABS = ["/", "/drafts", "/orders"];
