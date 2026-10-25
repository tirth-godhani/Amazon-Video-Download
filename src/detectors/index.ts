// ============================================================
// Detection Coordinator — Merge & Deduplicate
// ============================================================

import type { VideoSource, DetectorOrigin } from '@/lib/types';
import { extractVideosFromScripts } from './page-json';
import { extractVideosFromDom } from './dom';
import { Logger } from '@/lib/logger';

const logger = new Logger('DetectionCoordinator');

const ORIGIN_PRIORITY: Record<DetectorOrigin, number> = {
  'page-json': 3,
  network: 2,
  dom: 1,
};

/** Normalize URL by stripping tracking and signed query params for comparison */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0];
  }
}

/**
 * Merge video lists with deduplication and priority weighting
 */
export function mergeDetections(videoLists: VideoSource[][]): VideoSource[] {
  const mergedMap = new Map<string, VideoSource>();

  for (const list of videoLists) {
    for (const video of list) {
      const primaryUrl = video.variants[0]?.url;
      if (!primaryUrl) continue;

      const normUrl = normalizeUrl(primaryUrl);
      const existing = mergedMap.get(normUrl);

      if (!existing) {
        mergedMap.set(normUrl, video);
      } else {
        // If current candidate has higher priority origin or better details, replace or merge variants
        const currentPrio = ORIGIN_PRIORITY[video.origin] || 0;
        const existingPrio = ORIGIN_PRIORITY[existing.origin] || 0;

        if (currentPrio > existingPrio) {
          mergedMap.set(normUrl, {
            ...video,
            // Keep thumbnail if existing had one and new doesn't
            thumbnail: video.thumbnail || existing.thumbnail,
          });
        }
      }
    }
  }

  const result = Array.from(mergedMap.values());
  logger.info(`Detection complete: discovered ${result.length} unique videos`);
  return result;
}

/**
 * Run all on-page detection strategies and return combined results
 */
export function detectAllVideosOnPage(doc: Document = document): VideoSource[] {
  const jsonVideos = extractVideosFromScripts(doc);
  const domVideos = extractVideosFromDom(doc);

  return mergeDetections([jsonVideos, domVideos]);
}
