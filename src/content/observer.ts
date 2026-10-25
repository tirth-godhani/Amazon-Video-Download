// ============================================================
// MutationObserver for SPA Navigation & Gallery Re-renders
// ============================================================

import { Logger } from '@/lib/logger';

const logger = new Logger('ContentObserver');

/**
 * Setup debounced MutationObserver targeting gallery changes
 */
export function setupContentObserver(onUpdate: () => void): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerDebounced = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      logger.debug('DOM change detected, re-evaluating videos');
      onUpdate();
    }, 400);
  };

  const observer = new MutationObserver((mutations) => {
    let shouldTrigger = false;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node instanceof HTMLElement) {
            // Ignore mutations caused by our own injected element
            if (node.id === 'amazon-video-saver-root') continue;

            if (
              node.tagName === 'VIDEO' ||
              node.querySelector?.('video') ||
              node.id?.includes('image') ||
              node.className?.includes('thumbnail') ||
              node.id?.includes('altImages')
            ) {
              shouldTrigger = true;
              break;
            }
          }
        }
      }
      if (shouldTrigger) break;
    }

    if (shouldTrigger) {
      triggerDebounced();
    }
  });

  // Observe the body with subtree
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  logger.debug('Content observer activated');

  return () => {
    observer.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
