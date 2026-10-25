// ============================================================
// Amazon-specific CSS selectors & JSON patterns
// ============================================================
// ALL Amazon-specific selectors live here. When Amazon changes
// their page structure, this is the ONE file to update.

/** CSS selectors for finding video-related elements on Amazon pages */
export const SELECTORS = {
  /** Product title */
  productTitle: '#productTitle',

  /** Image gallery container */
  imageGallery: '#imageBlock, #altImages',

  /** Gallery thumbnail list */
  thumbnailList: '#altImages ul.a-unordered-list',

  /** Video thumbnails in the gallery sidebar */
  videoThumbnails: [
    '.videoThumbnail',
    '[data-action="thumb-action"] .a-button-thumbnail',
    '.imageThumbnail[data-video-url]',
    'li.videoThumbnail',
    '#altImages .a-button-thumbnail img[src*="video"]',
  ],

  /** The main video player container */
  videoPlayer: [
    '#video-player',
    '.vjs-tech',
    '#main-video-container',
    '.a-video-player',
  ],

  /** The video element itself */
  videoElement: 'video',

  /** A+ content sections */
  aplusContent: [
    '#aplus',
    '#aplusBrandStory_feature_div',
    '.aplus-v2',
    '#aplus_feature_div',
    '.apm-tablemodule',
  ],

  /** A+ video containers */
  aplusVideo: [
    '.aplus-module video',
    '.aplus-v2 video',
    '[class*="aplus"] video',
  ],

  /** Gallery insert point for our download button */
  buttonInsertPoint: [
    '#imageBlock_feature_div',
    '#imageBlock',
    '#leftCol',
  ],
} as const;

/** Regex patterns for extracting video data from inline scripts */
export const JSON_PATTERNS = {
  /** Main product gallery data (colorImages / imageGalleryData) */
  colorImages: /'colorImages'\s*:\s*\{/,
  imageGalleryData: /'imageGalleryData'\s*:\s*\[/,

  /** Video-specific data */
  videos: /['"]videos['"]\s*:\s*\[/,
  videoList: /"videoList"\s*:\s*\[/,

  /** Video URL patterns within JSON */
  videoUrl: /['"](?:videoUrl|url|hlsUrl|dashUrl)['"]\s*:\s*['"](https?:\/\/[^'"]+)['"]/g,

  /** A+ content media */
  aplusMedia: /aplus.*?video|aplusBrandStory.*?mediaMatrix/,

  /** General data variable assignments */
  dataAssignment: /(?:var\s+data\s*=|P\.when\s*\(\s*['"]A['"]\s*\)\.register\s*\(\s*['"]ImageBlockATF['"]\s*,\s*function\s*\(\s*\)\s*\{)/,
} as const;

/** Known JSON key paths where video data may be found */
export const VIDEO_JSON_PATHS = [
  // colorImages → initial → entries with videoUrl
  ['colorImages', 'initial'],
  // Direct videos array
  ['videos'],
  // Video gallery data
  ['videoGalleryData'],
  // A+ content
  ['aplus', 'media'],
] as const;
