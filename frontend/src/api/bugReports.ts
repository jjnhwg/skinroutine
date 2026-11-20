import { apiSend } from "./http";

/**
 * Send a bug report. The page and browser go along with it, so the report says
 * where it happened without the person having to.
 */
export function sendBugReport(message: string): Promise<void> {
  return apiSend<void>("POST", "/api/bug-reports", {
    message,
    page: (window.location.hash || "#/").slice(0, 200),
    user_agent: navigator.userAgent.slice(0, 400),
  });
}
