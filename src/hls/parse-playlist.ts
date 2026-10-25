// ============================================================
// HLS M3U8 Playlist Parser
// ============================================================

export interface HlsStreamVariant {
  url: string;
  height: number;
  width?: number;
  bandwidth?: number;
}

/**
 * Parse an HLS master playlist text and extract variant stream URLs
 */
export function parseMasterPlaylist(
  manifestText: string,
  baseUrl: string
): HlsStreamVariant[] {
  const lines = manifestText.split(/\r?\n/).map((l) => l.trim());
  const variants: HlsStreamVariant[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      let height = 720;
      let width: number | undefined;
      let bandwidth: number | undefined;

      const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      if (resMatch) {
        width = parseInt(resMatch[1], 10);
        height = parseInt(resMatch[2], 10);
      }

      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      if (bwMatch) {
        bandwidth = parseInt(bwMatch[1], 10);
      }

      // Next non-empty, non-comment line is the stream URL
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (nextLine && !nextLine.startsWith('#')) {
          const resolvedUrl = new URL(nextLine, baseUrl).href;
          variants.push({
            url: resolvedUrl,
            height,
            width,
            bandwidth,
          });
          i = j;
          break;
        }
      }
    }
  }

  // Sort highest resolution first
  variants.sort((a, b) => (b.height || 0) - (a.height || 0));
  return variants;
}

/**
 * Parse an HLS media playlist text and extract all .ts segment URLs
 */
export function parseMediaPlaylist(
  playlistText: string,
  baseUrl: string
): string[] {
  const lines = playlistText.split(/\r?\n/).map((l) => l.trim());
  const segmentUrls: string[] = [];

  for (const line of lines) {
    if (line && !line.startsWith('#')) {
      const resolved = new URL(line, baseUrl).href;
      segmentUrls.push(resolved);
    }
  }

  return segmentUrls;
}
