import { describe, it, expect } from 'vitest';
import {
  extractAsinFromUrl,
  sanitizeForFilename,
  buildFilename,
} from '../../src/lib/filename';

describe('Filename Utilities', () => {
  describe('extractAsinFromUrl', () => {
    it('extracts ASIN from standard /dp/ URL', () => {
      const url = 'https://www.amazon.com/Echo-Show-8-HD-smart-display/dp/B084DCJKSL';
      expect(extractAsinFromUrl(url)).toBe('B084DCJKSL');
    });

    it('extracts ASIN from /gp/product/ URL', () => {
      const url = 'https://www.amazon.in/gp/product/B09XYZ1234?ref=xyz';
      expect(extractAsinFromUrl(url)).toBe('B09XYZ1234');
    });

    it('extracts ASIN from URL with extra query params', () => {
      const url = 'https://www.amazon.co.uk/dp/B08N5WRWNW/ref=sxin_16?th=1&psc=1';
      expect(extractAsinFromUrl(url)).toBe('B08N5WRWNW');
    });

    it('returns null for non-product URLs', () => {
      expect(extractAsinFromUrl('https://www.amazon.com/s?k=echo')).toBeNull();
      expect(extractAsinFromUrl('https://www.google.com')).toBeNull();
    });
  });

  describe('sanitizeForFilename', () => {
    it('converts to lowercase and replaces spaces with hyphens', () => {
      expect(sanitizeForFilename('Echo Show 8 Smart Display')).toBe(
        'echo-show-8-smart-display'
      );
    });

    it('strips unsafe special characters', () => {
      expect(sanitizeForFilename('Echo Dot (4th Gen) - 50% OFF! *NEW*')).toBe(
        'echo-dot-4th-gen-50-off-new'
      );
    });

    it('collapses multiple hyphens and trims edges', () => {
      expect(sanitizeForFilename('---Hello---World---')).toBe('hello-world');
    });

    it('truncates to 50 characters', () => {
      const longTitle = 'A'.repeat(100);
      expect(sanitizeForFilename(longTitle).length).toBe(50);
    });
  });

  describe('buildFilename', () => {
    it('builds standard formatted MP4 filename', () => {
      expect(buildFilename('B0FKX43RC3', 'Echo Show 8', 1080)).toBe(
        'B0FKX43RC3_echo-show-8_1080p.mp4'
      );
    });

    it('falls back cleanly if title is empty', () => {
      expect(buildFilename('B0FKX43RC3', '', 720)).toBe(
        'B0FKX43RC3_video_720p.mp4'
      );
    });
  });
});
