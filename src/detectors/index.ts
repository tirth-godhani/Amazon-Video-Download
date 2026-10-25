// ============================================================
// Detection Coordinator — Merge & Deduplicate
// ============================================================

import type { VideoSource, VideoVariant } from '@/lib/types';
import { extractVideosFromScripts } from './page-json';
import { extractVideosFromDom } from './dom';
import { extractAssetBaseId } from '@/config/cdn-hosts';
import { Logger } from '@/lib/logger';

const logger = new Logger('DetectionCoordinator');

/**
 * Merge video lists with deduplication, variant aggregation, and priority weighting
 */
export function mergeDetections(videoLists: VideoSource[][]): VideoSource[] {
  // Map from asset ID -> VideoSource
  const mergedMap = new Map<string, VideoSource>();

  for (const list of videoLists) {
    for (const video of list) {
      const primaryUrl = video.variants[0]?.url;
      if (!primaryUrl) continue;

      const assetId = extractAssetBaseId(primaryUrl);
      const existing = mergedMap.get(assetId);

      if (!existing) {
        mergedMap.set(assetId, { ...video });
      } else {
        // Merge variants
        const mergedVariants: VideoVariant[] = [...existing.variants];
        for (const v of video.variants) {
          if (!mergedVariants.some((existingV) => existingV.url === v.url)) {
            mergedVariants.push(v);
          }
        }

        // Sort variants: Direct MP4 preferred, then highest resolution
        mergedVariants.sort((a, b) => {
          const aIsMp4 = a.url.endsWith('.mp4') && !a.url.includes('videopreview') ? 1 : 0;
          const bIsMp4 = b.url.endsWith('.mp4') && !b.url.includes('videopreview') ? 1 : 0;
          if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
          return (b.height || 0) - (a.height || 0);
        });

        // Use best title and thumbnail
        const title =
          existing.title && !existing.title.includes('Video ')
            ? existing.title
            : video.title || existing.title;
        const thumbnail = existing.thumbnail || video.thumbnail;

        mergedMap.set(assetId, {
          ...existing,
          title,
          thumbnail,
          variants: mergedVariants,
          kind: mergedVariants[0].url.endsWith('.m3u8') ? 'hls' : 'mp4',
        });
      }
    }
  }

  const result = Array.from(mergedMap.values());
  logger.info(`Detection complete: discovered ${result.length} unique video assets`);
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
