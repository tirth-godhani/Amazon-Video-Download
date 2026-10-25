import { describe, it, expect } from 'vitest';
import {
  cleanAndValidateVideoUrl,
  inferHeightFromUrl,
  extractAssetBaseId,
} from '../../src/config/cdn-hosts';

describe('CDN Hosts and URL Validation', () => {
  it('validates and cleans genuine Amazon MP4 URLs', () => {
    const url =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.mp4.480.mp4';
    expect(cleanAndValidateVideoUrl(url)).toBe(url);
  });

  it('validates and cleans genuine Amazon HLS M3U8 URLs', () => {
    const url =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls.m3u8';
    expect(cleanAndValidateVideoUrl(url)).toBe(url);
  });

  it('safely extracts video URL from corrupted attribute string with &quot;', () => {
    const corrupted =
      'https://m.media-amazon.com/images/I/51p05IL824L._CR1,0,638,360_SR342,193_.jpg&quot;,&quot;hiResVideoImageUrl&quot;:&quot;https://m.media-amazon.com/images/I/51p05IL824L._CR1,0,638,360_SR342,193_.jpg&quot;,&quot;secondaryImgUrl&quot;:&quot;https://m.media-amazon.com/images/I/51p05IL824L._CR1,0,638,360_SR342,193_CR0,126,342,67_.jpg&quot;,&quot;videoURL&quot;:&quot;https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls.m3u8';
    const result = cleanAndValidateVideoUrl(corrupted);
    expect(result).toBe(
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls.m3u8'
    );
  });

  it('rejects non-Amazon hosts or invalid video extensions', () => {
    expect(cleanAndValidateVideoUrl('https://evil.com/video.mp4')).toBeNull();
    expect(
      cleanAndValidateVideoUrl('https://m.media-amazon.com/images/photo.jpg')
    ).toBeNull();
    expect(cleanAndValidateVideoUrl('')).toBeNull();
  });

  it('correctly infers resolution height from URL', () => {
    expect(inferHeightFromUrl('https://m.media-amazon.com/.../default.1080.mp4')).toBe(1080);
    expect(inferHeightFromUrl('https://m.media-amazon.com/.../default.720.mp4')).toBe(720);
    expect(inferHeightFromUrl('https://m.media-amazon.com/.../default.jobtemplate.mp4.480.mp4')).toBe(480);
    expect(inferHeightFromUrl('https://m.media-amazon.com/.../default.360.mp4')).toBe(360);
  });

  it('extracts consistent asset UUID across sister MP4 and HLS files', () => {
    const mp4Url =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.mp4.480.mp4';
    const hlsUrl =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls.m3u8';
    expect(extractAssetBaseId(mp4Url)).toBe('6a128e13-6ee4-4878-8e86-ba4c97ce4846');
    expect(extractAssetBaseId(hlsUrl)).toBe('6a128e13-6ee4-4878-8e86-ba4c97ce4846');
  });
});
