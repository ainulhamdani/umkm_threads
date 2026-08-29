import type { ReactNode } from "react";

export type IconName =
  | "activity"
  | "arrow-right"
  | "cart"
  | "check"
  | "chevron-down"
  | "close"
  | "edit"
  | "external"
  | "eye"
  | "filter"
  | "home"
  | "image"
  | "lock"
  | "logout"
  | "menu"
  | "minus"
  | "package"
  | "phone"
  | "plus"
  | "search"
  | "settings"
  | "share"
  | "shield"
  | "store"
  | "users";

type Props = { name: IconName; size?: number; label?: string; className?: string };

function iconPaths(name: IconName): ReactNode {
  switch (name) {
    case "activity": return <><path d="M4 19V5M10 19v-8M16 19V8M22 19V3" /><path d="M2 19h22" /></>;
    case "arrow-right": return <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>;
    case "cart": return <><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></>;
    case "check": return <path d="m5 12 4 4L19 6" />;
    case "chevron-down": return <path d="m6 9 6 6 6-6" />;
    case "close": return <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>;
    case "edit": return <><path d="m4 16-.8 4.8L8 20l11.2-11.2a2.8 2.8 0 0 0-4-4L4 16Z" /><path d="m13.8 6.2 4 4" /></>;
    case "external": return <><path d="M14 5h5v5" /><path d="m19 5-8 8" /><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>;
    case "eye": return <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>;
    case "filter": return <path d="M4 6h16M7 12h10m-6 6h2" />;
    case "home": return <><path d="m4 10 8-7 8 7v10H4V10Z" /><path d="M9 20v-6h6v6" /></>;
    case "image": return <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 3.5 3 2.5-2.5 5 5" /></>;
    case "lock": return <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>;
    case "logout": return <><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" /><path d="m14 8 4 4-4 4M18 12H8" /></>;
    case "menu": return <><path d="M4 7h16M4 12h16M4 17h16" /></>;
    case "minus": return <path d="M5 12h14" />;
    case "package": return <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>;
    case "phone": return <><path d="M6.5 3.5h3l1.5 4-2 1.5a14 14 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C10.6 18.5 5.5 13.4 5.5 6a2 2 0 0 1 1-2.5Z" /></>;
    case "plus": return <><path d="M12 5v14M5 12h14" /></>;
    case "search": return <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>;
    case "settings": return <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.5V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6.2v-2.5h.2A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.5V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.5H21a1.7 1.7 0 0 0-1.6 1Z" /></>;
    case "share": return <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>;
    case "shield": return <path d="M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3Z" />;
    case "store": return <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6" /><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-5h6v5" /></>;
    case "users": return <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2" /><path d="M16 5.5a3 3 0 0 1 0 5.8M18 20v-2a5 5 0 0 0-2-4" /></>;
  }
}

export function Icon({ name, size = 20, label, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}>
      {iconPaths(name)}
    </svg>
  );
}
