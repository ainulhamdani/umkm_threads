import { HttpError } from "./http";

type Entry = { failures: number; windowStarted: number; lockedUntil: number };
const attempts = new Map<string, Entry>();
const windowMs = 15 * 60 * 1000;
const maxFailures = 5;

export function checkLoginRateLimit(key: string): void {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil > Date.now()) throw new HttpError(429, "LOGIN_RATE_LIMITED", "Terlalu banyak percobaan masuk. Silakan coba lagi nanti.");
  if (entry && entry.windowStarted + windowMs <= Date.now()) attempts.delete(key);
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const previous = attempts.get(key);
  const entry = previous && previous.windowStarted + windowMs > now ? previous : { failures: 0, windowStarted: now, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= maxFailures) entry.lockedUntil = now + windowMs;
  attempts.set(key, entry);
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
