// ============================================================
// Detector 1: Page JSON Extraction (Primary)
// ============================================================

import type { VideoSource, VideoVariant } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { extractAsinFromUrl, extractProductTitle } from '@/lib/filename';
import {
  cleanAndValidateVideoUrl,
  inferHeightFromUrl,
  extractAssetBaseId,
} from '@/config/cdn-hosts';

const logger = new Logger('PageJsonDetector');

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `vid_${Math.abs(hash).toString(36)}`;
}

interface RawVideoMeta {
  url: string;
  title?: string;
  thumbnail?: string;
  height?: number;
  section?: 'gallery' | 'aplus';
}

/**
 * Safely parse JSON strings or nested JSON objects from script texts
 */
export function extractVideosFromScripts(
  doc: Document = document
): VideoSource[] {
  const asin = extractAsinFromUrl(window.location.href) || '';
  const pageTitle = extractProductTitle();
  const scripts = Array.from(doc.querySelectorAll('script:not([src])'));

  // Map from assetBaseId -> RawVideoMeta[]
  const assetMap = new Map<string, RawVideoMeta[]>();

  function addCandidate(meta: RawVideoMeta) {
    const cleanUrl = cleanAndValidateVideoUrl(meta.url);
    if (!cleanUrl) return;

    const assetId = extractAssetBaseId(cleanUrl);
    const existing = assetMap.get(assetId) || [];
    if (!existing.some((item) => item.url === cleanUrl)) {
      existing.push({
        ...meta,
        url: cleanUrl,
        height: meta.height || inferHeightFromUrl(cleanUrl),
      });
      assetMap.set(assetId, existing);
    }
  }

  for (const script of scripts) {
    const text = script.textContent || '';
    if (
      !text.includes('media-amazon.com') &&
      !text.includes('videoUrl') &&
      !text.includes('.mp4') &&
      !text.includes('.m3u8')
    ) {
      continue;
    }

    // Strategy 1: Find ImageBlockATF or JSON.parse blocks with videos
    const jsonParseMatches = text.matchAll(/JSON\.parse\(['"](\[.*?\])['"]\)/g);
    for (const match of jsonParseMatches) {
      try {
        const unescaped = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\u002F/g, '/')
          .replace(/\\\\/g, '\\');
        const parsed = JSON.parse(unescaped);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const url = item.url || item.videoUrl || item.hlsUrl;
            if (url) {
              addCandidate({
                url,
                title: item.title,
                thumbnail: item.thumbUrl || item.slateUrl || item.image,
                height: item.videoHeight ? parseInt(item.videoHeight, 10) : undefined,
                section: 'gallery',
              });
            }
          }
        }
      } catch {
        // Continue to other patterns if JSON.parse string parsing fails
      }
    }

    // Strategy 2: Search for key-value url patterns e.g. "url":"https://..."
    const kvRegex =
      /"(?:url|videoUrl|hlsUrl)":\s*"([^"]+?\.(?:mp4|m3u8)[^"]*)"/g;
    let kvMatch: RegExpExecArray | null;
    while ((kvMatch = kvRegex.exec(text)) !== null) {
      const candidateUrl = kvMatch[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      const clean = cleanAndValidateVideoUrl(candidateUrl);
      if (clean) {
        // Look for adjacent title and thumb
        const ctxStart = Math.max(0, kvMatch.index - 300);
        const ctxEnd = Math.min(text.length, kvMatch.index + 300);
        const ctx = text.slice(ctxStart, ctxEnd);

        const titleM = ctx.match(/"(?:title|videoTitle)":\s*"([^"]+)"/);
        const thumbM = ctx.match(/"(?:thumb|thumbUrl|slateUrl|thumbnail)":\s*"([^"]+)"/);

        addCandidate({
          url: clean,
          title: titleM ? titleM[1].replace(/\\"/g, '"') : undefined,
          thumbnail: thumbM ? thumbM[1].replace(/\\u002F/g, '/').replace(/\\/g, '') : undefined,
          section: text.includes('aplus') ? 'aplus' : 'gallery',
        });
      }
    }

    // Strategy 3: Clean media URL extraction
    const cleanMediaRegex =
      /https:\/\/[a-zA-Z0-9.-]*media-amazon\.com\/images\/[a-zA-Z0-9_.\-\/]+\.(?:mp4|m3u8)/g;
    const mediaMatches = text.match(cleanMediaRegex) || [];
    for (const m of mediaMatches) {
      addCandidate({
        url: m,
        section: text.includes('aplus') ? 'aplus' : 'gallery',
      });
    }
  }

  // Convert assetMap to VideoSource array
  const videos: VideoSource[] = [];
  let videoIndex = 1;

  assetMap.forEach((metas, assetId) => {
    // Determine video title
    const namedMeta = metas.find((m) => m.title && m.title.trim().length > 0);
    const videoTitle = namedMeta?.title
      ? namedMeta.title
      : `${pageTitle} Video ${videoIndex++}`;

    // Determine thumbnail
    const thumbMeta = metas.find((m) => m.thumbnail && m.thumbnail.trim().length > 0);
    const thumbnail = thumbMeta?.thumbnail;

    // Build variants
    const variants: VideoVariant[] = metas.map((m) => {
      const isHls = m.url.endsWith('.m3u8');
      const height = m.height || inferHeightFromUrl(m.url);
      const isPreview = m.url.includes('videopreview');
      return {
        url: m.url,
        height,
        label: `${height}p ${isHls ? '(HLS)' : isPreview ? '(Preview)' : '(MP4)'}`,
      };
    });

    // Sort variants: Direct MP4 preferred, then highest resolution
    variants.sort((a, b) => {
      const aIsMp4 = a.url.endsWith('.mp4') && !a.url.includes('videopreview') ? 1 : 0;
      const bIsMp4 = b.url.endsWith('.mp4') && !b.url.includes('videopreview') ? 1 : 0;
      if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
      return (b.height || 0) - (a.height || 0);
    });

    const primaryVariant = variants[0];
    const isHls = primaryVariant.url.endsWith('.m3u8');

    videos.push({
      id: hashString(assetId),
      asin,
      title: videoTitle,
      thumbnail,
      kind: isHls ? 'hls' : 'mp4',
      variants,
      origin: 'page-json',
      section: metas.some((m) => m.section === 'aplus') ? 'aplus' : 'gallery',
    });
  });

  logger.debug(`Extracted ${videos.length} videos from inline page JSON`);
  return videos;
}
