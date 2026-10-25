// ============================================================
// Popup Controller — Amazon Video Saver
// ============================================================

import type { VideoSource } from '@/lib/types';
import { isAmazonDomain } from '@/config/domains';
import { sendToBackground } from '@/lib/messaging';
import { Logger } from '@/lib/logger';

const logger = new Logger('Popup');

// DOM Elements
const stateLoading = document.getElementById('state-loading')!;
const stateNotAmazon = document.getElementById('state-not-amazon')!;
const stateEmpty = document.getElementById('state-empty')!;
const stateVideos = document.getElementById('state-videos')!;
const videoListEl = document.getElementById('video-list')!;
const badgeEl = document.getElementById('video-count-badge')!;
const btnDownloadAll = document.getElementById('btn-download-all')!;
const statusSummary = document.getElementById('status-summary')!;

let detectedVideos: VideoSource[] = [];

function showState(state: 'loading' | 'not-amazon' | 'empty' | 'videos'): void {
  stateLoading.classList.add('hidden');
  stateNotAmazon.classList.add('hidden');
  stateEmpty.classList.add('hidden');
  stateVideos.classList.add('hidden');

  if (state === 'loading') stateLoading.classList.remove('hidden');
  if (state === 'not-amazon') stateNotAmazon.classList.remove('hidden');
  if (state === 'empty') stateEmpty.classList.remove('hidden');
  if (state === 'videos') stateVideos.classList.remove('hidden');
}

function renderVideoCards(videos: VideoSource[]): void {
  videoListEl.innerHTML = '';
  badgeEl.textContent = videos.length.toString();
  statusSummary.textContent = `${videos.length} Video${videos.length > 1 ? 's' : ''} Ready`;

  videos.forEach((video) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.id = `card-${video.id}`;

    // Thumbnail or placeholder
    const thumbHtml = video.thumbnail
      ? `<img class="video-thumb" src="${video.thumbnail}" alt="Thumbnail" />`
      : `<div class="video-thumb-placeholder">🎬</div>`;

    // Quality variant options
    const qualityOptions = video.variants
      .map(
        (variant, idx) =>
          `<option value="${idx}">${variant.label || `${variant.height}p`}</option>`
      )
      .join('');

    card.innerHTML = `
      <div class="video-card-top">
        ${thumbHtml}
        <div class="video-details">
          <div class="video-title" title="${video.title}">${video.title}</div>
          <div class="video-meta">
            <span class="section-tag">${video.section === 'aplus' ? 'A+ Content' : 'Gallery'}</span>
            <span>${video.kind.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div class="video-card-bottom">
        <select class="quality-select" id="select-${video.id}">
          ${qualityOptions}
        </select>
        <button class="btn btn-primary" id="btn-dl-${video.id}">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          Download
        </button>
      </div>
      <div id="progress-${video.id}" class="progress-container hidden">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="fill-${video.id}"></div>
        </div>
        <div class="status-text" id="status-${video.id}">Starting download...</div>
      </div>
    `;

    videoListEl.appendChild(card);

    // Download button event
    const dlBtn = card.querySelector(`#btn-dl-${video.id}`) as HTMLButtonElement;
    const selectEl = card.querySelector(`#select-${video.id}`) as HTMLSelectElement;

    dlBtn?.addEventListener('click', async () => {
      const variantIdx = parseInt(selectEl.value || '0', 10);
      await startSingleDownload(video.id, variantIdx, dlBtn);
    });
  });
}

async function startSingleDownload(
  videoId: string,
  variantIndex: number,
  buttonEl?: HTMLButtonElement
): Promise<void> {
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Saving...';
  }

  const progressEl = document.getElementById(`progress-${videoId}`);
  const fillEl = document.getElementById(`fill-${videoId}`);
  const statusEl = document.getElementById(`status-${videoId}`);

  if (progressEl) progressEl.classList.remove('hidden');
  if (fillEl) fillEl.style.width = '35%';

  try {
    const res = await sendToBackground({
      type: 'START_DOWNLOAD',
      videoId,
      variantIndex,
    });

    if (!res.success) {
      if (statusEl) statusEl.textContent = res.error || 'Failed';
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.textContent = 'Retry';
      }
    } else {
      if (fillEl) fillEl.style.width = '100%';
      if (statusEl) statusEl.textContent = 'Download started';
      if (buttonEl) buttonEl.textContent = 'Downloading';
    }
  } catch (err) {
    logger.error('Failed to trigger download:', err);
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = 'Download';
    }
  }
}

async function init(): Promise<void> {
  showState('loading');

  // Check active tab URL
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.url || !isAmazonDomain(activeTab.url)) {
    showState('not-amazon');
    badgeEl.textContent = '0';
    return;
  }

  // Request detected videos from background
  try {
    const response = await sendToBackground<VideoSource[]>({
      type: 'GET_VIDEOS',
    });

    if (response.success && response.data && response.data.length > 0) {
      detectedVideos = response.data;
      showState('videos');
      renderVideoCards(detectedVideos);
    } else {
      showState('empty');
      badgeEl.textContent = '0';
    }
  } catch (err) {
    logger.error('Error fetching videos:', err);
    showState('empty');
  }
}

// Download All Handler
btnDownloadAll?.addEventListener('click', async () => {
  btnDownloadAll.setAttribute('disabled', 'true');
  btnDownloadAll.textContent = 'Starting Downloads...';

  for (const video of detectedVideos) {
    await startSingleDownload(video.id, 0);
  }

  setTimeout(() => {
    btnDownloadAll.removeAttribute('disabled');
    btnDownloadAll.textContent = 'Download All';
  }, 2000);
});

// Real-time download progress listener
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DOWNLOAD_PROGRESS') {
    const fillEl = document.getElementById(`fill-${message.jobId}`);
    const statusEl = document.getElementById(`status-${message.jobId}`);
    if (fillEl && message.progress !== undefined) {
      fillEl.style.width = `${message.progress}%`;
    }
    if (statusEl && message.status) {
      statusEl.textContent = `${message.status} (${message.progress}%)`;
    }
  }
});

init();
