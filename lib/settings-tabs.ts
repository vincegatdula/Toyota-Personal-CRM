export const SETTINGS_TAB_VALUES = ["profile", "lists", "models", "targets", "data", "admin"] as const;

export type SettingsTab = (typeof SETTINGS_TAB_VALUES)[number];

export function resolveSettingsTab(
  tab: string | null | undefined,
  isAdmin: boolean,
): SettingsTab {
  if (tab && (SETTINGS_TAB_VALUES as readonly string[]).includes(tab)) {
    if (tab === "admin" && !isAdmin) return "profile";
    return tab as SettingsTab;
  }
  // Default settings landing is profile (never admin by default).
  return "profile";
}

export function isUserManagementNavActive(pathname: string, tab: string | null | undefined, isAdmin: boolean) {
  return isAdmin && pathname === "/settings" && resolveSettingsTab(tab, true) === "admin";
}

export function isSettingsNavActive(pathname: string, tab: string | null | undefined, isAdmin: boolean) {
  if (pathname !== "/settings" && !pathname.startsWith("/settings/")) return false;
  return !isUserManagementNavActive(pathname, tab, isAdmin);
}
