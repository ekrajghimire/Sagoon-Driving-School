export const ALL_STAFF = ["OWNER", "STAFF", "INSTRUCTOR"] as const;
export const ADMINS = ["OWNER", "STAFF"] as const;
export const OWNER_ONLY = ["OWNER"] as const;

export type NavItem = { href: string; label: string; roles: readonly string[] };

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Today", roles: ALL_STAFF },
  { href: "/admin/bookings", label: "Bookings", roles: ALL_STAFF },
  { href: "/admin/bookings/new", label: "New booking", roles: ADMINS },
  { href: "/admin/customers", label: "Customers", roles: ADMINS },
  { href: "/admin/availability", label: "Availability", roles: ALL_STAFF },
  { href: "/admin/pricing", label: "Pricing & promos", roles: ADMINS },
  { href: "/admin/content", label: "Content", roles: ADMINS },
  { href: "/admin/inbox", label: "Inbox", roles: ADMINS },
  { href: "/admin/reports", label: "Reports", roles: ADMINS },
  { href: "/admin/settings", label: "Settings", roles: OWNER_ONLY },
  { href: "/admin/users", label: "Users & roles", roles: OWNER_ONLY },
];
