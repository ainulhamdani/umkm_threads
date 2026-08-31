import { ApiError } from "./api";
import { ui } from "../shared/i18n";

export function navigateAdmin(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function adminErrorMessage(reason: unknown): string | null {
  if (reason instanceof ApiError && reason.status === 401) {
    navigateAdmin("/admin/login");
    return null;
  }
  return reason instanceof ApiError ? reason.message : ui.errorGeneric;
}
