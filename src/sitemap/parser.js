import axios from 'axios';
import { parseSitemap } from 'sitemap';
import { logger } from '../utils/logger.js';
import { normalizeUrl } from '../normalizer/index.js';
import { Readable } from 'stream';

/**
 * Tries to fetch existing sitemaps and extract URLs
 */
export async function getExistingSitemapUrls(baseUrl) {
  const discoveredUrls = new Set();
  
  const checkUrls = [
    new URL('/sitemap.xml', baseUrl).toString(),
    new URL('/sitemap_index.xml', baseUrl).toString()
  ];

  for (const url of checkUrls) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      if (response.data) {
        logger.info(`Found existing sitemap at ${url}, parsing...`);
        
        // sitemap.parseSitemap can parse XML sitemaps into objects
        // However, sitemap package's parseSitemap might need a stream or string.
        // It's often simpler to do a quick regex or use XML parser for just loc extraction.
        
        // A simple fallback using regex for fast extraction if parseSitemap is stream based
        const matches = response.data.match(/<loc>(.*?)<\/loc>/g);
        if (matches) {
          matches.forEach(match => {
            const loc = match.replace(/<\/?loc>/g, '').trim();
            try {
              discoveredUrls.add(normalizeUrl(loc));
            } catch(e) {}
          });
        }
      }
    } catch (err) {
      // Ignore 404s
      if (err.response && err.response.status !== 404) {
        logger.warn(`Failed to fetch sitemap at ${url}: ${err.message}`);
      }
    }
  }

  if (discoveredUrls.size > 0) {
    logger.success(`Extracted ${discoveredUrls.size} URLs from existing sitemaps.`);
  }

  return Array.from(discoveredUrls);
}
