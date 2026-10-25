// ============================================================
// Offscreen Document Handler for HLS Stream Processing & Transmuxing
// ============================================================

import { Logger } from '@/lib/logger';
import type { OffscreenMessage } from '@/lib/messaging';

const logger = new Logger('Offscreen');

logger.info('Offscreen document initialized');

// Listen for messages dispatched to the offscreen document
chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  if (message.type === 'HLS_PROCESS') {
    logger.info(`Processing HLS stream for job: ${message.jobId}`, message.url);
    // Placeholder response for M1; full transmuxer pipeline wired in M4
    sendResponse({ success: true, message: 'HLS processing received' });
    return true;
  }
  return false;
});
