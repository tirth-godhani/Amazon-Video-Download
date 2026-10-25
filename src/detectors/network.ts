// ============================================================
// Detector 2: Network Sniffing Results Collector
// ============================================================

import type { VideoSource, SniffedUrl } from '@/lib/types';
import { Logger } from '@/lib/logger';

const logger = new Logger('NetworkDetector');

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `vid_net_${Math.abs(hash).toString(36)}`;
}

export function parseSniffedUrls(
  sniffed: SniffedUrl[],
  asin: string,
  productTitle: string
): VideoSource[] {
  const videos: VideoSource[] = [];

  for (const item of sniffed) {
    const isHls = item.url.includes('.m3u8');
    videos.push({
      id: hashUrl(item.url),
      asin,
      title: `${productTitle} (Captured Stream)`,
      kind: isHls ? 'hls' : 'mp4',
      variants: [
        {
          url: item.url,
          height: 720,
          label: isHls ? 'HLS Stream' : '720p',
        },
      ],
      origin: 'network',
      section: 'gallery',
    });
  }

  logger.debug(`Formatted ${videos.length} network-sniffed videos`);
  return videos;
}
