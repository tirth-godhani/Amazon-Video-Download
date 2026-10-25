// ============================================================
// Detector 3: DOM Video Element Parsing (Fallback)
// ============================================================

import type { VideoSource } from '@/lib/types';
import { extractAsinFromUrl, extractProductTitle } from '@/lib/filename';
import { Logger } from '@/lib/logger';

const logger = new Logger('DomDetector');

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `vid_dom_${Math.abs(hash).toString(36)}`;
}

export function extractVideosFromDom(doc: Document = document): VideoSource[] {
  const videos: VideoSource[] = [];
  const asin = extractAsinFromUrl(window.location.href) || '';
  const pageTitle = extractProductTitle();
  const seenUrls = new Set<string>();

  // 1. Check all HTML5 video elements
  const videoElements = Array.from(doc.querySelectorAll('video'));
  for (const videoEl of videoElements) {
    let src = videoEl.currentSrc || videoEl.src;

    if (!src) {
      const sourceEl = videoEl.querySelector('source');
      if (sourceEl?.src) {
        src = sourceEl.src;
      }
    }

    if (src && !seenUrls.has(src)) {
      seenUrls.add(src);
      const isHls = src.includes('.m3u8');
      const isAplus = Boolean(videoEl.closest('#aplus, #aplus_feature_div, .aplus-v2, [class*="aplus"]'));

      videos.push({
        id: hashUrl(src),
        asin,
        title: `${pageTitle} (${isAplus ? 'A+ Content' : 'Gallery Video'})`,
        thumbnail: videoEl.poster || undefined,
        kind: isHls ? 'hls' : 'mp4',
        variants: [
          {
            url: src,
            height: videoEl.videoHeight || 720,
            width: videoEl.videoWidth || 1280,
            label: `${videoEl.videoHeight || 720}p`,
          },
        ],
        origin: 'dom',
        section: isAplus ? 'aplus' : 'gallery',
      });
    }
  }

  // 2. Check elements with data attributes (e.g. data-video-url)
  const dataVideoElements = Array.from(
    doc.querySelectorAll('[data-video-url], [data-config*="videoUrl"]')
  );

  for (const el of dataVideoElements) {
    let url = el.getAttribute('data-video-url');
    if (!url) {
      const config = el.getAttribute('data-config');
      if (config) {
        try {
          const parsed = JSON.parse(config);
          url = parsed.videoUrl || parsed.url;
        } catch {
          // ignore invalid json
        }
      }
    }

    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      const isHls = url.includes('.m3u8');
      videos.push({
        id: hashUrl(url),
        asin,
        title: `${pageTitle} Video ${videos.length + 1}`,
        kind: isHls ? 'hls' : 'mp4',
        variants: [
          {
            url,
            height: 720,
            label: '720p',
          },
        ],
        origin: 'dom',
        section: 'gallery',
      });
    }
  }

  logger.debug(`Extracted ${videos.length} videos from DOM elements`);
  return videos;
}
