// ============================================================
// HLS TS to MP4 Transmuxer using mux.js
// ============================================================

import muxjs from 'mux.js';
import { Logger } from '@/lib/logger';

const logger = new Logger('Transmuxer');

export interface TransmuxResult {
  blob: Blob;
  sizeBytes: number;
}

/**
 * Transmux an array of MPEG-TS segment buffers into an MP4 Blob
 */
export async function transmuxTsToMp4(
  segments: Uint8Array[]
): Promise<TransmuxResult> {
  return new Promise((resolve, reject) => {
    try {
      const transmuxer = new muxjs.mp4.Transmuxer({
        keepOriginalTimestamps: true,
      });

      const initSegments: Uint8Array[] = [];
      const mediaSegments: Uint8Array[] = [];

      transmuxer.on('data', (segment: { initSegment?: Uint8Array; data: Uint8Array }) => {
        if (segment.initSegment && segment.initSegment.byteLength > 0) {
          initSegments.push(segment.initSegment);
        }
        if (segment.data && segment.data.byteLength > 0) {
          mediaSegments.push(segment.data);
        }
      });

      transmuxer.on('done', () => {
        try {
          const parts: BlobPart[] = [];
          if (initSegments.length > 0) {
            parts.push(initSegments[0].buffer as ArrayBuffer);
          }
          for (const chunk of mediaSegments) {
            parts.push(chunk.buffer as ArrayBuffer);
          }

          const blob = new Blob(parts, { type: 'video/mp4' });
          logger.info(
            `Transmux complete: produced ${blob.size} bytes (${mediaSegments.length} media segments)`
          );
          resolve({ blob, sizeBytes: blob.size });
        } catch (err) {
          reject(err);
        }
      });

      // Feed segments sequentially
      for (let i = 0; i < segments.length; i++) {
        transmuxer.push(segments[i]);
        transmuxer.flush();
      }

      // Finalize
      transmuxer.end();
    } catch (err) {
      logger.error('Transmux error:', err);
      reject(err);
    }
  });
}
