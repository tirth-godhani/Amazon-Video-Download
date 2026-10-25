// ============================================================
// Offscreen Document Handler for HLS Stream Processing & Transmuxing
// ============================================================

import { Logger } from '@/lib/logger';
import type { OffscreenMessage } from '@/lib/messaging';
import { downloadHlsStream } from '@/hls/fetch-stream';

const logger = new Logger('Offscreen');

logger.info('Offscreen document initialized for audio/video transmuxing');

chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message.type === 'HLS_PROCESS') {
    logger.info(`Processing HLS stream for job: ${message.jobId}`, message.url);

    sendResponse({ success: true });

    (async () => {
      try {
        const blob = await downloadHlsStream(message.url, {
          preferredHeight: message.quality || 720,
          onProgress: (progress, statusText) => {
            chrome.runtime.sendMessage({
              type: 'HLS_PROGRESS',
              jobId: message.jobId,
              progress,
              stage: progress > 90 ? 'muxing' : 'fetching',
              statusText,
            });
          },
        });

        const blobUrl = URL.createObjectURL(blob);
        logger.info(`Blob created for job ${message.jobId}: ${blobUrl} (${blob.size} bytes)`);

        chrome.runtime.sendMessage({
          type: 'HLS_COMPLETE',
          jobId: message.jobId,
          blobUrl,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to process HLS stream for job ${message.jobId}:`, errorMsg);
        chrome.runtime.sendMessage({
          type: 'HLS_ERROR',
          jobId: message.jobId,
          error: errorMsg,
        });
      }
    })();

    return true;
  }
  return false;
});
