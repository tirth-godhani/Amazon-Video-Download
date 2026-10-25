// ============================================================
// Filename sanitization and formatting
// ============================================================

const MAX_TITLE_LENGTH = 50;
const UNSAFE_CHARS = /[^a-z0-9_-]/g;
const CONSECUTIVE_HYPHENS = /-{2,}/g;

/**
 * Sanitize a string for use in a filename.
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 * - Truncates to MAX_TITLE_LENGTH
 */
export function sanitizeForFilename(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(UNSAFE_CHARS, '')
    .replace(CONSECUTIVE_HYPHENS, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TITLE_LENGTH);
}

/**
 * Build a download filename from video metadata.
 *
 * Format: {ASIN}_{sanitized-title}_{height}p.mp4
 * Example: B0FKX43RC3_echo-show-8_1080p.mp4
 */
export function buildFilename(
  asin: string,
  title: string,
  height: number
): string {
  const safeName = sanitizeForFilename(title);
  const safeAsin = asin.toUpperCase();

  if (safeName) {
    return `${safeAsin}_${safeName}_${height}p.mp4`;
  }

  return `${safeAsin}_video_${height}p.mp4`;
}

/**
 * Extract ASIN from an Amazon product URL.
 * Handles patterns like:
 *   /dp/B0FKX43RC3
 *   /gp/product/B0FKX43RC3
 *   /product/B0FKX43RC3
 */
export function extractAsinFromUrl(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

/**
 * Extract product title from the page.
 */
export function extractProductTitle(): string {
  // Try the main product title element
  const titleEl = document.querySelector('#productTitle');
  if (titleEl?.textContent) {
    return titleEl.textContent.trim();
  }

  // Fallback: try meta title
  const metaTitle = document.querySelector('meta[name="title"]');
  if (metaTitle?.getAttribute('content')) {
    return metaTitle.getAttribute('content')!.trim();
  }

  // Fallback: document title (strip Amazon suffix)
  const docTitle = document.title
    .replace(/:\s*Amazon\.\w+.*$/i, '')
    .replace(/\s*-\s*Amazon\.\w+.*$/i, '')
    .trim();

  return docTitle || 'video';
}
