import fs from 'fs';
import path from 'path';
import { SitemapAndIndexStream, SitemapStream } from 'sitemap';
import { createGzip } from 'zlib';

/**
 * Builds the sitemap XML and index using sitemap package
 */
export async function buildSitemap(urls, outputDir, baseUrl) {
  // Priority Rules
  const getPriority = (urlPath) => {
    if (urlPath === '/' || urlPath === '') return 1.0;
    if (urlPath.match(/^\/[^/]+$/)) return 0.9; // Main pages
    if (urlPath.includes('/category/')) return 0.8;
    if (urlPath.includes('/blog/') && !urlPath.match(/\/blog\/[^/]+/)) return 0.7; // Blog index
    if (urlPath.includes('/blog/')) return 0.6; // Articles
    if (urlPath.includes('/archive/')) return 0.5;
    return 0.5; // Fallback
  };

  // Change Frequency
  const getChangeFreq = (urlPath) => {
    if (urlPath === '/' || urlPath === '') return 'daily';
    if (urlPath.match(/^\/[^/]+$/)) return 'weekly'; // Main pages
    if (urlPath.includes('/blog/')) return 'monthly';
    if (urlPath.includes('/archive/')) return 'yearly';
    return 'weekly'; // Fallback
  };

  return new Promise((resolve, reject) => {
    const sms = new SitemapAndIndexStream({
      limit: 50000,
      getSitemapStream: (i) => {
        const sitemapStream = new SitemapStream({ hostname: baseUrl });
        // Generate sitemap-0.xml, sitemap-1.xml etc.
        const filename = `sitemap-${i}.xml`;
        const dest = fs.createWriteStream(path.join(outputDir, filename));
        sitemapStream.pipe(dest);
        return [new URL(filename, baseUrl).toString(), sitemapStream, dest];
      },
    });

    const indexFile = fs.createWriteStream(path.join(outputDir, 'sitemap_index.xml'));
    sms.pipe(indexFile);

    sms.on('error', reject);
    indexFile.on('finish', resolve);
    indexFile.on('error', reject);

    for (const url of urls) {
      const parsedUrl = new URL(url);
      sms.write({
        url: url,
        changefreq: getChangeFreq(parsedUrl.pathname),
        priority: getPriority(parsedUrl.pathname),
        lastmod: new Date().toISOString()
      });
    }

    sms.end();
  });
}
