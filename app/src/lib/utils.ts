import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names safely with Tailwind conflict resolution
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Validates whether a string is a syntactically valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const formatted = trimmed.startsWith("http://") || trimmed.startsWith("https://") 
      ? trimmed 
      : `https://${trimmed}`;
    const parsed = new URL(formatted);
    return parsed.hostname.includes(".") && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

/**
 * Normalizes a store URL to standard https format
 */
export function normalizeStoreUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Derives a human-readable brand name from a storefront domain
 */
export function extractBrandNameFromUrl(url: string): string {
  try {
    const formatted = normalizeStoreUrl(url);
    const parsed = new URL(formatted);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    if (parts.length > 0 && parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return hostname;
  } catch {
    return "Storefront Brand";
  }
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Deterministically formats dates to avoid SSR/client hydration mismatches
 */
export function formatDisplayDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

export function formatFullDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const month = MONTH_NAMES[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

