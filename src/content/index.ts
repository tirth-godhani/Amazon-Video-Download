// ============================================================
// Content Script Entry — Amazon Video Saver
// ============================================================

import { Logger } from '@/lib/logger';
import { extractAsinFromUrl } from '@/lib/filename';
import { detectAllVideosOnPage } from '@/detectors';
import { injectDownloadButton } from './button';
import { setupContentObserver } from './observer';
import { sendToBackground } from '@/lib/messaging';

const logger = new Logger('ContentScript');

async function runDetection(): Promise<void> {
  const asin = extractAsinFromUrl(window.location.href) || '';
  logger.info(`Scanning page for product videos. ASIN: ${asin || 'N/A'}`);

  const videos = detectAllVideosOnPage(document);
  logger.info(`Discovered ${videos.length} videos`);

  // Inject or update on-page download button
  injectDownloadButton(videos);

  // Send videos to background service worker for badge and popup access
  await sendToBackground({
    type: 'VIDEOS_DETECTED',
    videos,
  });

  if (asin) {
    await sendToBackground({
      type: 'PAGE_READY',
      asin,
      url: window.location.href,
    });
  }
}

// Initial execution once document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runDetection();
    setupContentObserver(() => runDetection());
  });
} else {
  runDetection();
  setupContentObserver(() => runDetection());
}
