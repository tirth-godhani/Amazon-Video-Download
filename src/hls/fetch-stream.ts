// ============================================================
// HLS Stream Downloader & Coordinator
// ============================================================

import { parseMasterPlaylist, parseMediaPlaylist } from './parse-playlist';
import { transmuxTsToMp4 } from './transmux';
import { Logger } from '@/lib/logger';

const logger = new Logger('HlsFetcher');

export interface HlsDownloadOptions {
  preferredHeight?: number;
  concurrency?: number;
  onProgress?: (progressPercent: number, statusText: string) => void;
}

/**
 * Fetch and transmux an entire HLS stream to an MP4 Blob
 */
export async function downloadHlsStream(
  playlistUrl: string,
  options: HlsDownloadOptions = {}
): Promise<Blob> {
  const { preferredHeight = 720, concurrency = 4, onProgress } = options;

  onProgress?.(5, 'Fetching playlist...');
  logger.info(`Fetching playlist: ${playlistUrl}`);

  const resp = await fetch(playlistUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: HTTP ${resp.status}`);
  }

  const text = await resp.text();
  let mediaPlaylistUrl = playlistUrl;

  // If this is a master playlist, select the best matching variant
  if (text.includes('#EXT-X-STREAM-INF')) {
    const variants = parseMasterPlaylist(text, playlistUrl);
    if (!variants.length) {
      throw new Error('Master playlist contains no valid stream variants');
    }

    // Find exact or closest resolution
    let chosen = variants[0];
    if (preferredHeight) {
      const match = variants.find((v) => v.height === preferredHeight);
      if (match) {
        chosen = match;
      } else {
        // closest height
        chosen = variants.reduce((prev, curr) =>
          Math.abs(curr.height - preferredHeight) <
          Math.abs(prev.height - preferredHeight)
            ? curr
            : prev
        );
      }
    }

    logger.info(`Selected variant: ${chosen.height}p (${chosen.url})`);
    mediaPlaylistUrl = chosen.url;

    // Fetch the chosen media playlist
    const mediaResp = await fetch(mediaPlaylistUrl);
    if (!mediaResp.ok) {
      throw new Error(`Failed to fetch media playlist: HTTP ${mediaResp.status}`);
    }
    const mediaText = await mediaResp.text();
    return downloadMediaSegments(mediaText, mediaPlaylistUrl, concurrency, onProgress);
  }

  return downloadMediaSegments(text, mediaPlaylistUrl, concurrency, onProgress);
}

async function downloadMediaSegments(
  mediaPlaylistText: string,
  mediaPlaylistUrl: string,
  concurrency: number,
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<Blob> {
  const segmentUrls = parseMediaPlaylist(mediaPlaylistText, mediaPlaylistUrl);
  if (!segmentUrls.length) {
    throw new Error('Media playlist contains no .ts segment URLs');
  }

  const total = segmentUrls.length;
  logger.info(`Downloading ${total} segments with concurrency ${concurrency}`);

  const segmentBuffers: Uint8Array[] = new Array(total);
  let completed = 0;

  // Worker pool for concurrent downloading
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < total) {
      const idx = nextIndex++;
      const url = segmentUrls[idx];
      let attempts = 0;
      let success = false;

      while (attempts < 3 && !success) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          segmentBuffers[idx] = new Uint8Array(buf);
          success = true;
        } catch (err) {
          attempts++;
          if (attempts >= 3) {
            throw new Error(`Failed to download segment ${idx + 1} after 3 attempts: ${err}`);
          }
          await new Promise((r) => setTimeout(r, 500 * attempts));
        }
      }

      completed++;
      const pct = Math.min(90, Math.round((completed / total) * 85) + 5);
      onProgress?.(pct, `Downloading video: ${completed}/${total} parts (${pct}%)`);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker()
  );
  await Promise.all(workers);

  onProgress?.(92, 'Transmuxing stream to MP4...');
  logger.info('All segments fetched. Starting transmuxing...');

  const { blob } = await transmuxTsToMp4(segmentBuffers);

  onProgress?.(100, 'Processing complete');
  return blob;
}
