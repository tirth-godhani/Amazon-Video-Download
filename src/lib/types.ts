// ============================================================
// Core data types for Amazon Video Saver
// ============================================================

/** A single video discovered on the page */
export interface VideoSource {
  /** Unique ID (hash of primary URL) */
  id: string;
  /** Amazon ASIN */
  asin: string;
  /** Human-readable title */
  title: string;
  /** Thumbnail URL for popup display */
  thumbnail?: string;
  /** Stream type */
  kind: 'mp4' | 'hls';
  /** Available quality variants, sorted best-first */
  variants: VideoVariant[];
  /** Which detector found this */
  origin: DetectorOrigin;
  /** Gallery section: main gallery or A+ content */
  section: 'gallery' | 'aplus';
  /** Duration in seconds (if known) */
  durationSeconds?: number;
}

/** A single quality variant of a video */
export interface VideoVariant {
  /** Direct URL to the video stream */
  url: string;
  /** Vertical resolution (e.g., 720, 1080) */
  height: number;
  /** Horizontal resolution (if available) */
  width?: number;
  /** Bitrate in kbps (if available) */
  bitrate?: number;
  /** Estimated file size in bytes (if available) */
  estimatedSize?: number;
  /** Label for UI display (e.g., "1080p", "720p HD") */
  label?: string;
}

/** Which detection method found the video */
export type DetectorOrigin = 'page-json' | 'network' | 'dom';

/** Download job tracking */
export interface DownloadJob {
  /** Unique job ID */
  id: string;
  /** Reference to the VideoSource.id */
  videoId: string;
  /** The URL being downloaded */
  variantUrl: string;
  /** Current status */
  status: DownloadStatus;
  /** Progress percentage 0–100 */
  progress: number;
  /** Target filename */
  filename: string;
  /** Error message if status is 'error' */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Chrome download ID (for direct MP4 downloads) */
  chromeDownloadId?: number;
  /** Timestamp when download started */
  startedAt: number;
}

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'muxing'
  | 'complete'
  | 'error'
  | 'cancelled';

/** Per-tab state stored in the service worker */
export interface TabVideoState {
  /** Tab ID */
  tabId: number;
  /** ASIN for this product page */
  asin: string;
  /** All detected videos */
  videos: VideoSource[];
  /** Network-sniffed URLs for this tab */
  sniffedUrls: SniffedUrl[];
  /** Timestamp of last detection */
  lastDetectedAt: number;
}

/** A URL captured via webRequest sniffing */
export interface SniffedUrl {
  url: string;
  type: string;
  contentType?: string;
  timestamp: number;
}

/** User preferences stored in chrome.storage */
export interface UserPreferences {
  /** Default quality preference */
  defaultQuality: 'best' | 'worst' | number;
  /** Whether to show notifications on download complete */
  showNotifications: boolean;
  /** Custom filename template */
  filenameTemplate: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  defaultQuality: 'best',
  showNotifications: true,
  filenameTemplate: '{asin}_{title}_{height}p',
};
