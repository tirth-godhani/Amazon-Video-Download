// ============================================================
// Supported Amazon domains
// ============================================================

/** All Amazon domains the extension supports */
export const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.in',
  'amazon.co.uk',
  'amazon.de',
  'amazon.ca',
  'amazon.com.au',
  'amazon.co.jp',
] as const;

export type AmazonDomain = (typeof AMAZON_DOMAINS)[number];

/**
 * Check if a URL belongs to a supported Amazon domain.
 */
export function isAmazonUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return AMAZON_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export const isAmazonDomain = isAmazonUrl;

/**
 * Check if a URL is an Amazon product page (contains /dp/ or /gp/product/).
 */
export function isProductPage(url: string): boolean {
  if (!isAmazonUrl(url)) return false;
  return /\/(dp|gp\/product)\/[A-Z0-9]{10}/i.test(url);
}
