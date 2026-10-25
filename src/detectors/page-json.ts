// ============================================================
// Detector 1: Page JSON Extraction (Primary)
// ============================================================

import type { VideoSource, VideoVariant } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { extractAsinFromUrl, extractProductTitle } from '@/lib/filename';

const logger = new Logger('PageJsonDetector');

/**
 * Generate a consistent unique ID for a video given its URL
 */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `vid_${Math.abs(hash).toString(36)}`;
}

/**
 * Infer video resolution height from URL if possible
 */
function inferHeightFromUrl(url: string): number {
  if (/1080p|1920x1080/i.test(url)) return 1080;
  if (/720p|1280x720/i.test(url)) return 720;
  if (/480p|854x480/i.test(url)) return 480;
  if (/360p|640x360/i.test(url)) return 360;
  return 720; // Default sensible fallback
}

/**
 * Safely parse JSON strings or nested JSON objects from script texts
 */
export function extractVideosFromScripts(
  doc: Document = document
): VideoSource[] {
  const videos: VideoSource[] = [];
  const asin = extractAsinFromUrl(window.location.href) || '';
  const pageTitle = extractProductTitle();
  const scripts = Array.from(doc.querySelectorAll('script:not([src])'));

  const seenUrls = new Set<string>();

  for (const script of scripts) {
    const text = script.textContent || '';
    if (!text.includes('media-amazon.com') && !text.includes('videoUrl') && !text.includes('.mp4')) {
      continue;
    }

    // Pattern 1: Search for JSON blocks containing 'videos' or 'colorImages'
    // Extract video objects directly using regex patterns
    // e.g., "videoUrl":"https://..."
    const videoUrlRegex = /"(?:videoUrl|url|hlsUrl)":\s*"([^"]+?\.(?:mp4|m3u8)[^"]*)"/g;
    let match: RegExpExecArray | null;

    while ((match = videoUrlRegex.exec(text)) !== null) {
      const rawUrl = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      if (seenUrls.has(rawUrl)) continue;
      seenUrls.add(rawUrl);

      const isHls = rawUrl.includes('.m3u8');
      const height = inferHeightFromUrl(rawUrl);

      // Try to find an adjacent thumbnail or title near this match
      const windowStart = Math.max(0, match.index - 500);
      const windowEnd = Math.min(text.length, match.index + 500);
      const surroundingContext = text.slice(windowStart, windowEnd);

      const thumbMatch = surroundingContext.match(/"(?:thumb|thumbnail|videoThumbnail|image)":\s*"([^"]+)"/);
      const thumbUrl = thumbMatch ? thumbMatch[1].replace(/\\u002F/g, '/').replace(/\\/g, '') : undefined;

      const titleMatch = surroundingContext.match(/"(?:title|videoTitle)":\s*"([^"]+)"/);
      const videoTitle = titleMatch ? titleMatch[1].replace(/\\"/g, '"') : `${pageTitle} Video ${videos.length + 1}`;

      const variant: VideoVariant = {
        url: rawUrl,
        height,
        label: `${height}p ${isHls ? 'HLS' : 'MP4'}`,
      };

      videos.push({
        id: hashUrl(rawUrl),
        asin,
        title: videoTitle,
        thumbnail: thumbUrl,
        kind: isHls ? 'hls' : 'mp4',
        variants: [variant],
        origin: 'page-json',
        section: text.includes('aplus') ? 'aplus' : 'gallery',
      });
    }

    // Pattern 2: Search for raw media-amazon video URLs directly if not caught above
    const rawMediaRegex = /(https:\/\/[a-zA-Z0-9.-]*media-amazon\.com\/images\/[^\s"'<>]+\.(?:mp4|m3u8))/g;
    while ((match = rawMediaRegex.exec(text)) !== null) {
      const rawUrl = match[1];
      if (seenUrls.has(rawUrl)) continue;
      seenUrls.add(rawUrl);

      const isHls = rawUrl.includes('.m3u8');
      const height = inferHeightFromUrl(rawUrl);

      videos.push({
        id: hashUrl(rawUrl),
        asin,
        title: `${pageTitle} Video ${videos.length + 1}`,
        kind: isHls ? 'hls' : 'mp4',
        variants: [
          {
            url: rawUrl,
            height,
            label: `${height}p`,
          },
        ],
        origin: 'page-json',
        section: 'gallery',
      });
    }
  }

  logger.debug(`Extracted ${videos.length} videos from inline page JSON`);
  return videos;
}
