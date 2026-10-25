// ============================================================
// Injected Download Button with Shadow DOM Isolation
// ============================================================

import type { VideoSource } from '@/lib/types';
import { SELECTORS } from '@/config/selectors';
import { Logger } from '@/lib/logger';
import { sendToBackground } from '@/lib/messaging';

const logger = new Logger('ContentButton');

const CONTAINER_ID = 'amazon-video-saver-root';

export function injectDownloadButton(videos: VideoSource[]): void {
  // If no videos, remove existing button if present
  if (!videos.length) {
    document.getElementById(CONTAINER_ID)?.remove();
    return;
  }

  // Check if container already exists
  let hostEl = document.getElementById(CONTAINER_ID);
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = CONTAINER_ID;
    hostEl.style.position = 'relative';
    hostEl.style.zIndex = '9999';
    hostEl.style.margin = '10px 0';

    // Find insertion target near product gallery
    let targetEl: Element | null = null;
    for (const selector of SELECTORS.buttonInsertPoint) {
      const found = document.querySelector(selector);
      if (found) {
        targetEl = found;
        break;
      }
    }

    if (targetEl) {
      targetEl.prepend(hostEl);
    } else {
      // Fallback: attach to body fixed
      hostEl.style.position = 'fixed';
      hostEl.style.bottom = '24px';
      hostEl.style.right = '24px';
      document.body.appendChild(hostEl);
    }
  }

  // Create or retrieve Shadow Root
  let shadow = hostEl.shadowRoot;
  if (!shadow) {
    shadow = hostEl.attachShadow({ mode: 'open' });
  }

  // Render the button inside Shadow DOM
  shadow.innerHTML = `
    <style>
      .avs-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
      }
      .avs-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #FF9900 0%, #FFB84D 100%);
        color: #111;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid #E68A00;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        user-select: none;
      }
      .avs-btn:hover {
        background: linear-gradient(135deg, #FF8C00 0%, #FFA834 100%);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.22);
        transform: translateY(-1px);
      }
      .avs-btn:active {
        transform: translateY(0);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      .avs-badge {
        background: #131921;
        color: #FFF;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
      }
      .avs-icon {
        width: 15px;
        height: 15px;
        fill: #131921;
      }
      .avs-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 6px;
        background: #FFFFFF;
        border: 1px solid #D5D9D9;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        min-width: 260px;
        padding: 6px 0;
        z-index: 10000;
      }
      .avs-menu.show {
        display: block;
      }
      .avs-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 14px;
        font-size: 12px;
        color: #0F1111;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .avs-menu-item:hover {
        background: #F0F2F2;
      }
      .avs-menu-title {
        font-weight: 500;
        max-width: 170px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .avs-quality-badge {
        font-size: 11px;
        font-weight: 600;
        color: #007185;
      }
    </style>

    <div class="avs-container">
      <button class="avs-btn" id="avs-trigger-btn" type="button" title="Download videos from this product">
        <svg class="avs-icon" viewBox="0 0 24 24">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>Download Video</span>
        <span class="avs-badge">${videos.length}</span>
      </button>

      <div class="avs-menu" id="avs-quick-menu">
        ${videos
          .map(
            (v, idx) => `
            <div class="avs-menu-item" data-video-id="${v.id}" data-variant-idx="0">
              <span class="avs-menu-title" title="${v.title}">🎬 ${v.title}</span>
              <span class="avs-quality-badge">${v.variants[0]?.label || 'HD'} ⬇</span>
            </div>
          `
          )
          .join('')}
      </div>
    </div>
  `;

  // Add click listener for dropdown menu toggle
  const triggerBtn = shadow.getElementById('avs-trigger-btn');
  const menu = shadow.getElementById('avs-quick-menu');

  triggerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.classList.toggle('show');
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    menu?.classList.remove('show');
  });

  // Handle direct download clicks
  const items = shadow.querySelectorAll('.avs-menu-item');
  items.forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const videoId = item.getAttribute('data-video-id');
      const variantIdx = parseInt(item.getAttribute('data-variant-idx') || '0', 10);
      if (videoId) {
        menu?.classList.remove('show');
        logger.info(`Starting download for video: ${videoId}`);
        await sendToBackground({
          type: 'START_DOWNLOAD',
          videoId,
          variantIndex: variantIdx,
        });
      }
    });
  });

  logger.debug('Injected download button with video count:', videos.length);
}
