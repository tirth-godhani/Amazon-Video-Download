import { describe, it, expect } from 'vitest';
import {
  parseMasterPlaylist,
  parseMediaPlaylist,
} from '../../src/hls/parse-playlist';

describe('HLS Playlist Parser', () => {
  it('parses master playlist with multiple resolution variants', () => {
    const masterM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=671115,RESOLUTION=640x360
default.jobtemplate.hls360.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1115103,RESOLUTION=854x480
default.jobtemplate.hls480.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1956502,RESOLUTION=1280x720
default.jobtemplate.hls720.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3535627,RESOLUTION=1920x1080
default.jobtemplate.hls1080.m3u8`;

    const baseUrl =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls.m3u8';

    const variants = parseMasterPlaylist(masterM3u8, baseUrl);
    expect(variants.length).toBe(4);
    // Sorted highest first
    expect(variants[0].height).toBe(1080);
    expect(variants[0].url).toBe(
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls1080.m3u8'
    );
    expect(variants[3].height).toBe(360);
  });

  it('parses media playlist into absolute segment URLs', () => {
    const mediaM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:7
#EXTINF:6,
default.jobtemplate.hls720_00001.ts
#EXTINF:6,
default.jobtemplate.hls720_00002.ts
#EXT-X-ENDLIST`;

    const baseUrl =
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls720.m3u8';

    const segments = parseMediaPlaylist(mediaM3u8, baseUrl);
    expect(segments.length).toBe(2);
    expect(segments[0]).toBe(
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls720_00001.ts'
    );
    expect(segments[1]).toBe(
      'https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/6a128e13-6ee4-4878-8e86-ba4c97ce4846/default.jobtemplate.hls720_00002.ts'
    );
  });
});
