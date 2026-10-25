// ============================================================
// Detector 3: DOM Video Element Parsing (Fallback)
// ============================================================

import type { VideoSource, VideoVariant } from '@/lib/types';
import { extractAsinFromUrl, extractProductTitle } from '@/lib/filename';
import {
  cleanAndValidateVideoUrl,
  inferHeightFromUrl,
  extractAssetBaseId,
} from '@/config/cdn-hosts';
import { Logger } from '@/lib/logger';

const logger = new Logger('DomDetector');

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `vid_dom_${Math.abs(hash).toString(36)}`;
}

export function extractVideosFromDom(doc: Document = document): VideoSource[] {
  const asin = extractAsinFromUrl(window.location.href) || '';
  const pageTitle = extractProductTitle();
  const videos: VideoSource[] = [];

  // 1. Check data-video-items attributes (e.g. .video-items-metadata)
  const metaContainers = Array.from(
    doc.querySelectorAll('[data-video-items]')
  );

  for (const container of metaContainers) {
    const rawAttr = container.getAttribute('data-video-items');
    if (!rawAttr) continue;

    try {
      const items = JSON.parse(rawAttr);
      if (Array.isArray(items)) {
        for (const item of items) {
          const variants: VideoVariant[] = [];
          const mainUrl = cleanAndValidateVideoUrl(item.videoURL || item.url);
          if (mainUrl) {
            const h = item.videoImageHeight ? parseInt(item.videoImageHeight, 10) : inferHeightFromUrl(mainUrl);
            variants.push({
              url: mainUrl,
              height: h,
              label: `${h}p ${mainUrl.endsWith('.m3u8') ? '(HLS)' : '(MP4)'}`,
            });
          }

          // Check preview assets
          if (typeof item.videoPreviewAssets === 'string') {
            const previewMatches = item.videoPreviewAssets.match(
              /https:\/\/[a-zA-Z0-9.-]*media-amazon\.com\/images\/[a-zA-Z0-9_.\-\/]+\.(?:mp4|m3u8)/g
            );
            if (previewMatches) {
              for (const pUrl of previewMatches) {
                const clean = cleanAndValidateVideoUrl(pUrl);
                if (clean && !variants.some((v) => v.url === clean)) {
                  variants.push({
                    url: clean,
                    height: 360,
                    label: '360p (Preview MP4)',
                  });
                }
              }
            }
          }

          if (variants.length > 0) {
            const title = item.title || `${pageTitle} Video`;
            const thumbnail =
              cleanAndValidateVideoUrl(item.videoImageUrl) ||
              item.videoImageUrl ||
              item.videoImageUrlUnchanged;
            const assetId = extractAssetBaseId(variants[0].url);

            videos.push({
              id: hashString(assetId),
              asin,
              title,
              thumbnail,
              kind: variants[0].url.endsWith('.m3u8') ? 'hls' : 'mp4',
              variants,
              origin: 'dom',
              section: 'gallery',
            });
          }
        }
      }
    } catch {
      // Ignore JSON parse error in data-video-items
    }
  }

  // 2. Check HTML5 video elements
  const videoElements = Array.from(doc.querySelectorAll('video'));
  for (const videoEl of videoElements) {
    let src = videoEl.currentSrc || videoEl.src;

    if (!src) {
      const sourceEl = videoEl.querySelector('source');
      if (sourceEl?.src) {
        src = sourceEl.src;
      }
    }

    const cleanUrl = cleanAndValidateVideoUrl(src);
    if (cleanUrl && !videos.some((v) => v.variants.some((varItem) => varItem.url === cleanUrl))) {
      const isHls = cleanUrl.endsWith('.m3u8');
      const isAplus = Boolean(
        videoEl.closest('#aplus, #aplus_feature_div, .aplus-v2, [class*="aplus"]')
      );
      const height = videoEl.videoHeight || inferHeightFromUrl(cleanUrl);

      videos.push({
        id: hashString(cleanUrl),
        asin,
        title: `${pageTitle} (${isAplus ? 'A+ Content' : 'Gallery Video'})`,
        thumbnail: videoEl.poster || undefined,
        kind: isHls ? 'hls' : 'mp4',
        variants: [
          {
            url: cleanUrl,
            height,
            width: videoEl.videoWidth || undefined,
            label: `${height}p ${isHls ? '(HLS)' : '(MP4)'}`,
          },
        ],
        origin: 'dom',
        section: isAplus ? 'aplus' : 'gallery',
      });
    }
  }

  logger.debug(`Extracted ${videos.length} videos from DOM elements`);
  return videos;
}
