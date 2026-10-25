// ============================================================
// Download Manager for Direct MP4 & Media Downloads
// ============================================================

import type { DownloadJob, VideoSource } from '@/lib/types';
import { buildFilename } from '@/lib/filename';
import { Logger } from '@/lib/logger';

const logger = new Logger('DownloadManager');

class DownloadManager {
  private jobs: Map<string, DownloadJob> = new Map();
  private chromeDownloadToJobId: Map<number, string> = new Map();

  constructor() {
    this.initDownloadListeners();
  }

  private initDownloadListeners(): void {
    if (typeof chrome === 'undefined' || !chrome.downloads?.onChanged) return;

    chrome.downloads.onChanged.addListener((delta) => {
      const jobId = this.chromeDownloadToJobId.get(delta.id);
      if (!jobId) return;

      const job = this.jobs.get(jobId);
      if (!job) return;

      if (delta.state) {
        if (delta.state.current === 'complete') {
          job.status = 'complete';
          job.progress = 100;
          logger.info(`Download completed for job: ${jobId} (${job.filename})`);
          this.broadcastProgress(job);
        } else if (delta.state.current === 'interrupted') {
          job.status = 'error';
          job.error = delta.error?.current || 'Download interrupted';
          logger.error(`Download failed for job: ${jobId}: ${job.error}`);
          this.broadcastProgress(job);
        }
      }
    });
  }

  /**
   * Start a download for a given video and variant
   */
  public async startDownload(
    video: VideoSource,
    variantIndex: number
  ): Promise<DownloadJob> {
    const variant = video.variants[variantIndex] || video.variants[0];
    if (!variant) {
      throw new Error('No video variant available to download');
    }

    const filename = buildFilename(
      video.asin || 'amazon',
      video.title || 'video',
      variant.height || 720
    );

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: DownloadJob = {
      id: jobId,
      videoId: video.id,
      variantUrl: variant.url,
      status: 'downloading',
      progress: 0,
      filename,
      retryCount: 0,
      startedAt: Date.now(),
    };

    this.jobs.set(jobId, job);

    try {
      logger.info(`Initiating Chrome download: ${filename} from ${variant.url}`);
      const chromeDownloadId = await chrome.downloads.download({
        url: variant.url,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify',
      });

      job.chromeDownloadId = chromeDownloadId;
      this.chromeDownloadToJobId.set(chromeDownloadId, jobId);
      this.broadcastProgress(job);
      return job;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      job.status = 'error';
      job.error = errorMsg;
      logger.error(`Failed to initiate download for ${jobId}:`, errorMsg);
      this.broadcastProgress(job);
      return job;
    }
  }

  public getJob(jobId: string): DownloadJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(): DownloadJob[] {
    return Array.from(this.jobs.values());
  }

  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.chromeDownloadId) {
      chrome.downloads.cancel(job.chromeDownloadId, () => {
        logger.info(`Cancelled download: ${jobId}`);
      });
    }
    job.status = 'cancelled';
    this.broadcastProgress(job);
    return true;
  }

  private broadcastProgress(job: DownloadJob): void {
    // Notify runtime listeners (e.g. open popup)
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_PROGRESS',
      jobId: job.id,
      progress: job.progress,
      status: job.status,
      filename: job.filename,
      error: job.error,
    }).catch(() => {
      // Ignored if popup is closed
    });
  }
}

export const downloadManager = new DownloadManager();
