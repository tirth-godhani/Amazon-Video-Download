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

/** Regex pattern to check if a URL belongs to Amazon media CDNs */
export const MEDIA_URL_PATTERN =
  /^https?:\/\/([a-zA-Z0-9-]+\.)*(media-amazon\.com|ssl-images-amazon\.com|cloudfront\.net)\/.+/i;

/** Known video file extensions and stream playlist extensions */
export const VIDEO_EXTENSIONS = ['.mp4', '.m3u8', '.webm'] as const;

/** Check if a URL looks like an Amazon video stream or file */
export function isAmazonVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const isCdn = AMAZON_CDN_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
    const hasVideoExt = VIDEO_EXTENSIONS.some((ext) =>
      parsed.pathname.toLowerCase().endsWith(ext)
    );
    return isCdn && hasVideoExt;
  } catch {
    return false;
  }
}
