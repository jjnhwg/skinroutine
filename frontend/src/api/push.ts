import { apiGet, apiSend } from "./http";

/** The server's VAPID public key, or null when push isn't set up there. */
export async function getPushKey(): Promise<string | null> {
  return (await apiGet<{ public_key: string | null }>("/api/push/key")).public_key;
}

export function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  return apiSend<void>("PUT", "/api/push/subscriptions", subscription);
}

export function removePushSubscription(endpoint: string): Promise<void> {
  return apiSend<void>("POST", "/api/push/subscriptions/remove", { endpoint });
}

/** Sends the reminder to every subscribed device now. */
export function sendTestPush(): Promise<void> {
  return apiSend<void>("POST", "/api/push/test");
}
