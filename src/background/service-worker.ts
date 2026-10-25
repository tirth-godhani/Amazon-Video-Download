// ============================================================
// Service Worker — Main Background Entry for Amazon Video Saver
// ============================================================

import { Logger } from '@/lib/logger';
import { tabState } from './tab-state';
import { downloadManager } from './download-manager';
import type { ExtensionMessage, MessageResponse } from '@/lib/messaging';

const logger = new Logger('ServiceWorker');

logger.info('Amazon Video Saver Service Worker initialized');

// Clean up state when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.removeTab(tabId);
});

// Update badge with video count
function updateBadge(tabId: number, count: number): void {
  if (count > 0) {
    chrome.action.setBadgeText({ tabId, text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF9900' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// Handle messages from content scripts, popups, and offscreen
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => {
    logger.debug('Received message:', message.type, 'from:', sender.tab?.id ?? 'internal');

    const handleMessage = async () => {
      switch (message.type) {
        case 'VIDEOS_DETECTED': {
          const tabId = sender.tab?.id;
          if (tabId !== undefined) {
            tabState.setVideos(tabId, message.videos);
            updateBadge(tabId, message.videos.length);
          }
          return { success: true };
        }

        case 'PAGE_READY': {
          const tabId = sender.tab?.id;
          if (tabId !== undefined) {
            tabState.getOrCreate(tabId, message.asin);
          }
          return { success: true };
        }

        case 'GET_VIDEOS': {
          // Get the active tab
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' };
          }

          const videos = tabState.getVideos(activeTab.id);
          return { success: true, data: videos };
        }

        case 'START_DOWNLOAD': {
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });

          if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' };
          }

          const videos = tabState.getVideos(activeTab.id);
          const video = videos.find((v) => v.id === message.videoId);
          if (!video) {
            return { success: false, error: `Video ${message.videoId} not found` };
          }

          const job = await downloadManager.startDownload(video, message.variantIndex);
          return { success: true, data: job };
        }

        case 'CANCEL_DOWNLOAD': {
          const ok = downloadManager.cancelJob(message.jobId);
          return { success: ok };
        }

        case 'GET_DOWNLOAD_STATUS': {
          const jobs = downloadManager.getAllJobs();
          return { success: true, data: jobs };
        }

        default:
          return { success: true };
      }
    };

    handleMessage()
      .then(sendResponse)
      .catch((err) => {
        logger.error('Error handling message:', err);
        sendResponse({ success: false, error: String(err) });
      });

    return true; // Keep channel open for async response
  }
);
