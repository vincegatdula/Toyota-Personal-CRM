export const SETTINGS_TAB_VALUES = ["profile", "lists", "models", "targets", "data"] as const;

export type SettingsTab = (typeof SETTINGS_TAB_VALUES)[number];

export function resolveSettingsTab(tab: string | null | undefined): SettingsTab {
  if (tab && (SETTINGS_TAB_VALUES as readonly string[]).includes(tab)) {
    return tab as SettingsTab;
  }
  return "profile";
}

export function isUserManagementNavActive(pathname: string) {
  return pathname === "/user-management" || pathname.startsWith("/user-management/");
}

export function isSettingsNavActive(pathname: string) {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}
