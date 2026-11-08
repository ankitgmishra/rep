import { isValidUrl, normalizeStoreUrl } from "@/lib/utils";

/**
 * Validates a target URL and enforces strict SSRF protections:
 * - Scheme must be http or https
 * - Hostname cannot be localhost, loopback, private IPv4/IPv6, or cloud metadata endpoints
 */
export function isSafePublicUrl(url: string): { safe: boolean; error?: string; normalizedUrl?: string } {
  if (!url || typeof url !== "string") {
    return { safe: false, error: "URL string is required." };
  }

  if (!isValidUrl(url)) {
    return { safe: false, error: "Invalid URL syntax." };
  }

  const normalized = normalizeStoreUrl(url);

  try {
    const parsed = new URL(normalized);

    // 1. Only allow standard HTTP / HTTPS protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: `Protocol ${parsed.protocol} is disallowed. Only http/https supported.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Reject localhost and local domains
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan") ||
      hostname === "0.0.0.0"
    ) {
      return { safe: false, error: "Access to local or private hostnames is forbidden." };
    }

    // 3. Reject loopback and private IPv4 ranges
    // 127.0.0.0/8 (Loopback)
    // 10.0.0.0/8 (Private)
    // 172.16.0.0/12 (Private)
    // 192.168.0.0/16 (Private)
    // 169.254.0.0/16 (Link-local / AWS & Cloud Metadata: 169.254.169.254)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      if (octet1 === 127) {
        return { safe: false, error: "Loopback IP addresses are forbidden." };
      }
      if (octet1 === 10) {
        return { safe: false, error: "Private 10.0.0.0/8 network IP addresses are forbidden." };
      }
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { safe: false, error: "Private 172.16.0.0/12 network IP addresses are forbidden." };
      }
      if (octet1 === 192 && octet2 === 168) {
        return { safe: false, error: "Private 192.168.0.0/16 network IP addresses are forbidden." };
      }
      if (octet1 === 169 && octet2 === 254) {
        return { safe: false, error: "Cloud metadata and link-local IP addresses are forbidden." };
      }
      if (octet1 === 0) {
        return { safe: false, error: "Zero-network addresses are forbidden." };
      }
    }

    // 4. Reject IPv6 loopback and private
    if (
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("fe80:")
    ) {
      return { safe: false, error: "Private IPv6 addresses are forbidden." };
    }

    return { safe: true, normalizedUrl: normalized };
  } catch {
    return { safe: false, error: "Malformed URL provided." };
  }
}
