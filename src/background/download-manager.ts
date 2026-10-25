// ============================================================
// Download Manager for Direct MP4 & HLS Media Streams
// ============================================================

import type { DownloadJob, VideoSource } from '@/lib/types';
import { buildFilename } from '@/lib/filename';
import { Logger } from '@/lib/logger';

const logger = new Logger('DownloadManager');

class DownloadManager {
  private jobs: Map<string, DownloadJob> = new Map();
  private chromeDownloadToJobId: Map<number, string> = new Map();
  private blobUrlToJobId: Map<string, string> = new Map();

  constructor() {
    this.initDownloadListeners();
    this.initOffscreenListeners();
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

  private initOffscreenListeners(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'HLS_PROGRESS') {
        const job = this.jobs.get(message.jobId);
        if (job) {
          job.progress = message.progress;
          job.status = message.stage === 'muxing' ? 'muxing' : 'downloading';
          this.broadcastProgress(job, message.statusText);
        }
      } else if (message.type === 'HLS_COMPLETE') {
        const job = this.jobs.get(message.jobId);
        if (job) {
          logger.info(`HLS transmuxing complete for job: ${job.id}, saving file`);
          this.blobUrlToJobId.set(message.blobUrl, job.id);
          this.triggerDownloadWithUrl(job, message.blobUrl);
        }
      } else if (message.type === 'HLS_ERROR') {
        const job = this.jobs.get(message.jobId);
        if (job) {
          job.status = 'error';
          job.error = message.error;
          logger.error(`HLS processing error for job ${job.id}:`, message.error);
          this.broadcastProgress(job);
        }
      }
    });
  }

  private async ensureOffscreen(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.offscreen) return;

    // Check if offscreen document already exists
    if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) {
      return;
    }

    try {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
        reasons: [chrome.offscreen.Reason.BLOBS],
        justification: 'Transmux HLS video streams to MP4 Blob',
      });
      logger.info('Offscreen document created successfully');
    } catch (err: unknown) {
      const msg = String(err);
      if (!msg.includes('Only a single offscreen document')) {
        logger.error('Failed to create offscreen document:', msg);
      }
    }
  }

  /**
   * Start a download for a given video and variant
   */
  public async startDownload(
    video: VideoSource,
    variantIndex: number
  ): Promise<DownloadJob> {
    const variant = video.variants[variantIndex] || video.variants[0];
    if (!variant || !variant.url) {
      throw new Error('No valid video variant available to download');
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

    const isHls = variant.url.includes('.m3u8');
    if (isHls) {
      // Route through offscreen HLS processor
      logger.info(`Starting HLS stream processing for ${filename}`);
      job.status = 'downloading';
      this.broadcastProgress(job, 'Connecting to HLS stream...');

      try {
        await this.ensureOffscreen();
        // Send message to offscreen document
        chrome.runtime.sendMessage({
          type: 'HLS_PROCESS',
          url: variant.url,
          jobId: job.id,
          quality: variant.height,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        job.status = 'error';
        job.error = errorMsg;
        this.broadcastProgress(job);
      }
      return job;
    }

    // Direct MP4 download
    await this.triggerDownloadWithUrl(job, variant.url);
    return job;
  }

  private async triggerDownloadWithUrl(job: DownloadJob, url: string): Promise<void> {
    try {
      logger.info(`Initiating Chrome download: ${job.filename} from ${url.slice(0, 80)}...`);
      const chromeDownloadId = await chrome.downloads.download({
        url,
        filename: job.filename,
        saveAs: false,
        conflictAction: 'uniquify',
      });

      job.chromeDownloadId = chromeDownloadId;
      this.chromeDownloadToJobId.set(chromeDownloadId, job.id);
      this.broadcastProgress(job);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      job.status = 'error';
      job.error = errorMsg;
      logger.error(`Failed to initiate download for ${job.id}:`, errorMsg);
      this.broadcastProgress(job);
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

  private broadcastProgress(job: DownloadJob, statusText?: string): void {
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_PROGRESS',
      jobId: job.id,
      videoId: job.videoId,
      progress: job.progress,
      status: job.status,
      filename: job.filename,
      error: job.error,
      statusText: statusText || (job.error ? job.error : `${job.status} (${job.progress}%)`),
    }).catch(() => {
      // Ignored if popup is closed
    });
  }
}

export const downloadManager = new DownloadManager();
