import * as cheerio from 'cheerio';
import { normalizeUrl } from '../normalizer/index.js';

/**
 * Extracts links and canonical URL from HTML
 */
export function parseHtml(html, currentUrl) {
  const $ = cheerio.load(html);
  const links = new Set();
  
  // Helper to resolve and normalize URLs
  const addLink = (href) => {
    if (!href) return;
    try {
      const resolved = new URL(href, currentUrl).toString();
      links.add(normalizeUrl(resolved));
    } catch (err) {
      // Ignore invalid URLs
    }
  };

  // 1. Canonical URL
  let canonicalUrl = null;
  const canonicalHref = $('link[rel="canonical"]').attr('href');
  if (canonicalHref) {
    try {
      canonicalUrl = normalizeUrl(new URL(canonicalHref, currentUrl).toString());
    } catch (e) {}
  }

  // 2. Extract standard links
  $('a[href], area[href]').each((_, el) => {
    addLink($(el).attr('href'));
  });

  // 3. Extract media/embed links
  $('iframe[src]').each((_, el) => {
    addLink($(el).attr('src'));
  });
  
  // Note: video/picture sources might not be standard pages to crawl, 
  // but if the spec requires extracting URLs from video[source] and picture[source]:
  $('video source, picture source').each((_, el) => {
    addLink($(el).attr('src') || $(el).attr('srcset'));
  });

  // 4. Other link elements (e.g. alternate links)
  $('link[href]').each((_, el) => {
    // Optionally filter by rel, but spec says link[href]
    const rel = $(el).attr('rel');
    if (rel !== 'stylesheet' && rel !== 'icon') {
      addLink($(el).attr('href'));
    }
  });

  // 5. Meta refresh
  $('meta[http-equiv="refresh"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) {
      const match = content.match(/url=(.*)/i);
      if (match && match[1]) {
        addLink(match[1].replace(/['"]/g, '').trim());
      }
    }
  });

  return {
    canonicalUrl,
    links: Array.from(links)
  };
}
