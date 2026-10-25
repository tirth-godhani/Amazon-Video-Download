import { describe, it, expect } from 'vitest';
import { mergeDetections } from '../../src/detectors';
import type { VideoSource } from '../../src/lib/types';

describe('Detectors Merge & Deduplication', () => {
  it('deduplicates identical URLs across detectors', () => {
    const jsonVideo: VideoSource = {
      id: 'v1',
      asin: 'B012345678',
      title: 'Demo Video',
      kind: 'mp4',
      variants: [{ url: 'https://m.media-amazon.com/video/1080p.mp4', height: 1080 }],
      origin: 'page-json',
      section: 'gallery',
      thumbnail: 'https://m.media-amazon.com/thumb.jpg',
    };

    const domVideo: VideoSource = {
      id: 'v2',
      asin: 'B012345678',
      title: 'Gallery Video',
      kind: 'mp4',
      variants: [{ url: 'https://m.media-amazon.com/video/1080p.mp4?tracking=123', height: 720 }],
      origin: 'dom',
      section: 'gallery',
    };

    const result = mergeDetections([[jsonVideo], [domVideo]]);
    expect(result.length).toBe(1);
    // page-json has higher priority than dom
    expect(result[0].origin).toBe('page-json');
    expect(result[0].thumbnail).toBe('https://m.media-amazon.com/thumb.jpg');
  });

  it('preserves distinct videos', () => {
    const video1: VideoSource = {
      id: 'v1',
      asin: 'B012345678',
      title: 'Product Demo',
      kind: 'mp4',
      variants: [{ url: 'https://m.media-amazon.com/video/clip1.mp4', height: 1080 }],
      origin: 'page-json',
      section: 'gallery',
    };

    const video2: VideoSource = {
      id: 'v2',
      asin: 'B012345678',
      title: 'A+ Brand Video',
      kind: 'mp4',
      variants: [{ url: 'https://m.media-amazon.com/video/clip2.mp4', height: 720 }],
      origin: 'page-json',
      section: 'aplus',
    };

    const result = mergeDetections([[video1], [video2]]);
    expect(result.length).toBe(2);
  });
});
