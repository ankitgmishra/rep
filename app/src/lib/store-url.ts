"use client";

const STORE_URL_KEY = "cadra_target_store_url";

/**
 * Saves the target store URL to local storage for persistence across signup/onboarding
 */
export function persistTargetStoreUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORE_URL_KEY, url.trim());
    localStorage.setItem(STORE_URL_KEY, url.trim());
  } catch (e) {
    console.warn("Storage unavailable to persist target store URL", e);
  }
}

/**
 * Retrieves the persisted store URL if previously entered
 */
export function getPersistedStoreUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORE_URL_KEY) || localStorage.getItem(STORE_URL_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Clears the persisted store URL
 */
export function clearPersistedStoreUrl(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORE_URL_KEY);
    localStorage.removeItem(STORE_URL_KEY);
  } catch {}
}

