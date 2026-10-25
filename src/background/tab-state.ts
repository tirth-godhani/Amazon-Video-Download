// ============================================================
// Per-Tab Video State Management
// ============================================================

import type { TabVideoState, VideoSource, SniffedUrl } from '@/lib/types';
import { Logger } from '@/lib/logger';

const logger = new Logger('TabState');

class TabStateManager {
  private tabStates: Map<number, TabVideoState> = new Map();

  /** Get or create state for a tab */
  public getOrCreate(tabId: number, asin = ''): TabVideoState {
    let state = this.tabStates.get(tabId);
    if (!state) {
      state = {
        tabId,
        asin,
        videos: [],
        sniffedUrls: [],
        lastDetectedAt: Date.now(),
      };
      this.tabStates.set(tabId, state);
    }
    if (asin && !state.asin) {
      state.asin = asin;
    }
    return state;
  }

  /** Update detected videos for a tab */
  public setVideos(tabId: number, videos: VideoSource[]): void {
    const state = this.getOrCreate(tabId);
    state.videos = videos;
    state.lastDetectedAt = Date.now();
    logger.debug(`Tab ${tabId} updated with ${videos.length} videos`);
  }

  /** Get all videos for a tab */
  public getVideos(tabId: number): VideoSource[] {
    return this.tabStates.get(tabId)?.videos || [];
  }

  /** Record a network-sniffed media URL for a tab */
  public addSniffedUrl(
    tabId: number,
    item: Omit<SniffedUrl, 'timestamp'>
  ): void {
    const state = this.getOrCreate(tabId);
    // Avoid duplicate URLs
    if (!state.sniffedUrls.some((s) => s.url === item.url)) {
      state.sniffedUrls.push({
        ...item,
        timestamp: Date.now(),
      });
      logger.debug(`Tab ${tabId} captured media URL:`, item.url);
    }
  }

  /** Remove state when a tab is closed */
  public removeTab(tabId: number): void {
    this.tabStates.delete(tabId);
    logger.debug(`Cleaned up state for closed tab ${tabId}`);
  }

  /** Clear videos on tab navigation */
  public clearTabVideos(tabId: number): void {
    const state = this.tabStates.get(tabId);
    if (state) {
      state.videos = [];
      state.sniffedUrls = [];
      state.lastDetectedAt = Date.now();
    }
  }
}

export const tabState = new TabStateManager();
