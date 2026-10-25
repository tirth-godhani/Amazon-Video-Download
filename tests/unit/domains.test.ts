import { describe, it, expect } from 'vitest';
import { isAmazonUrl, isProductPage, AMAZON_DOMAINS } from '../../src/config/domains';

describe('Domain Configuration', () => {
  it('supports all major global Amazon domains', () => {
    expect(AMAZON_DOMAINS).toContain('amazon.com');
    expect(AMAZON_DOMAINS).toContain('amazon.in');
    expect(AMAZON_DOMAINS).toContain('amazon.co.uk');
    expect(AMAZON_DOMAINS).toContain('amazon.de');
    expect(AMAZON_DOMAINS).toContain('amazon.ca');
    expect(AMAZON_DOMAINS).toContain('amazon.com.au');
    expect(AMAZON_DOMAINS).toContain('amazon.co.jp');
  });

  describe('isAmazonUrl', () => {
    it('matches valid amazon subdomains', () => {
      expect(isAmazonUrl('https://www.amazon.com/dp/B084DCJKSL')).toBe(true);
      expect(isAmazonUrl('https://smile.amazon.co.uk/')).toBe(true);
      expect(isAmazonUrl('https://amazon.in/')).toBe(true);
    });

    it('rejects non-amazon domains', () => {
      expect(isAmazonUrl('https://www.google.com')).toBe(false);
      expect(isAmazonUrl('https://notamazon.com')).toBe(false);
      expect(isAmazonUrl('invalid-url')).toBe(false);
    });
  });

  describe('isProductPage', () => {
    it('identifies /dp/ product pages', () => {
      expect(
        isProductPage('https://www.amazon.com/Product-Name/dp/B0FKX43RC3')
      ).toBe(true);
      expect(isProductPage('https://www.amazon.in/dp/B084DCJKSL?th=1')).toBe(
        true
      );
    });

    it('identifies /gp/product/ product pages', () => {
      expect(
        isProductPage('https://www.amazon.de/gp/product/B084DCJKSL')
      ).toBe(true);
    });

    it('returns false for search and home pages', () => {
      expect(isProductPage('https://www.amazon.com/')).toBe(false);
      expect(isProductPage('https://www.amazon.com/s?k=laptop')).toBe(false);
    });
  });
});
