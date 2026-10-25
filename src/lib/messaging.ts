// ============================================================
// Type-safe messaging layer for Chrome extension communication
// ============================================================

import type { VideoSource, DownloadJob } from './types';

// ---- Message Definitions ----

/** Messages sent from content script → service worker */
export type ContentToBackgroundMessage =
  | { type: 'VIDEOS_DETECTED'; videos: VideoSource[] }
  | { type: 'PAGE_READY'; asin: string; url: string };

/** Messages sent from popup → service worker */
export type PopupToBackgroundMessage =
  | { type: 'GET_VIDEOS' }
  | { type: 'START_DOWNLOAD'; videoId: string; variantIndex: number }
  | { type: 'CANCEL_DOWNLOAD'; jobId: string }
  | { type: 'RETRY_DOWNLOAD'; jobId: string }
  | { type: 'DOWNLOAD_ALL' }
  | { type: 'GET_DOWNLOAD_STATUS' };

/** Messages sent from service worker → popup */
export type BackgroundToPopupMessage =
  | { type: 'VIDEOS_RESPONSE'; videos: VideoSource[] }
  | { type: 'DOWNLOAD_STARTED'; job: DownloadJob }
  | { type: 'DOWNLOAD_PROGRESS'; jobId: string; progress: number }
  | { type: 'DOWNLOAD_COMPLETE'; jobId: string; filename: string }
  | { type: 'DOWNLOAD_ERROR'; jobId: string; error: string }
  | { type: 'DOWNLOAD_STATUS'; jobs: DownloadJob[] }
  | { type: 'NO_ACTIVE_TAB' };

/** Messages sent to/from offscreen document */
export type OffscreenMessage =
  | { type: 'HLS_PROCESS'; url: string; jobId: string; quality: number }
  | {
      type: 'HLS_PROGRESS';
      jobId: string;
      progress: number;
      stage: 'fetching' | 'muxing';
    }
  | { type: 'HLS_COMPLETE'; jobId: string; blobUrl: string }
  | { type: 'HLS_ERROR'; jobId: string; error: string };

/** Union of all message types */
export type ExtensionMessage =
  | ContentToBackgroundMessage
  | PopupToBackgroundMessage
  | BackgroundToPopupMessage
  | OffscreenMessage;

// ---- Message Response Type ----

/** Standard response wrapper */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Typed Send/Listen Helpers ----

/**
 * Send a message to the service worker and get a typed response.
 */
export function sendToBackground<T = unknown>(
  message: ContentToBackgroundMessage | PopupToBackgroundMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message ?? 'Unknown error',
        });
      } else {
        resolve(response ?? { success: true });
      }
    });
  });
}

/**
 * Send a message to a specific tab's content script.
 */
export function sendToTab<T = unknown>(
  tabId: number,
  message: ExtensionMessage
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message ?? 'Unknown error',
        });
      } else {
        resolve(response ?? { success: true });
      }
    });
  });
}

/**
 * Register a message handler in the service worker.
 * Returns a cleanup function to remove the listener.
 */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => boolean | void
): () => void {
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}
