// ============================================================
// Amazon Media CDN & Host Patterns
// ============================================================

/** Known Amazon CDN and media hosts where video assets are served */
export const AMAZON_CDN_HOSTS = [
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'ssl-images-amazon.com',
  'images-amazon.com',
  'cloudfront.net',
] as const;

/** Known video file extensions and stream playlist extensions */
export const VIDEO_EXTENSIONS = ['.mp4', '.m3u8'] as const;

/**
 * Clean, sanitize, and validate a candidate video URL.
 * Rejects corrupt concatenations (e.g. containing &quot;, commas, or multiple http prefixes).
 */
export function cleanAndValidateVideoUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\"/g, '"')
    .replace(/\\/g, '')
    .trim();

  // If there are multiple http/https or &quot;, extract the last valid URL substring
  if (url.includes('&quot;') || url.includes('&lt;') || url.lastIndexOf('http') > 0) {
    const matches = url.match(
      /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9_.\-\/]+\.(?:mp4|m3u8)/gi
    );
    if (matches && matches.length > 0) {
      url = matches[matches.length - 1];
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(url);

    // Validate hostname is Amazon media CDN
    const isCdn = AMAZON_CDN_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
    if (!isCdn) return null;

    // Validate path ends with mp4 or m3u8
    const cleanPath = parsed.pathname.toLowerCase();
    const hasValidExt = VIDEO_EXTENSIONS.some((ext) => cleanPath.endsWith(ext));
    if (!hasValidExt) return null;

    // Must not contain invalid characters in path
    if (/["'<>\\,;]/.test(parsed.pathname)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

/** Check if a URL looks like an Amazon video stream or file */
export function isAmazonVideoUrl(url: string): boolean {
  return cleanAndValidateVideoUrl(url) !== null;
}

/** Infer video resolution height from URL */
export function inferHeightFromUrl(url: string): number {
  if (/1080p|1920x1080|\.1080\./i.test(url)) return 1080;
  if (/720p|1280x720|\.720\./i.test(url)) return 720;
  if (/480p|854x480|\.480\./i.test(url)) return 480;
  if (/360p|640x360|\.360\./i.test(url)) return 360;
  return 720;
}

/**
 * Extract the base asset UUID/identifier from Amazon media URLs
 * e.g., .../6a128e13-6ee4-4878-8e86-ba4c97ce4846/default... -> 6a128e13-6ee4-4878-8e86-ba4c97ce4846
 */
export function extractAssetBaseId(url: string): string {
  const uuidMatch = url.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  if (uuidMatch) {
    return uuidMatch[0].toLowerCase();
  }
  // Fallback: strip extension and quality suffixes from pathname
  try {
    const parsed = new URL(url);
    return parsed.pathname
      .replace(/(\.jobtemplate)?(\.mp4|\.hls)?(\.\d+)?\.(mp4|m3u8)$/i, '')
      .replace(/[-_](1080p|720p|480p|360p)\.(mp4|m3u8)$/i, '');
  } catch {
    return url;
  }
}
