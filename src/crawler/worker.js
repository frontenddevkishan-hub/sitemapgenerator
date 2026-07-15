import { parseHtml } from '../parser/index.js';
import { logError } from '../report/index.js';
import axios from 'axios';

export class CrawlerWorker {
  constructor(browser, outputDir) {
    // browser is no longer used, kept for API compatibility
    this.outputDir = outputDir;
  }

  async processUrl(url) {
    const startTime = Date.now();
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true, // don't throw on 4xx/5xx
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SitemapGenerator'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      
      let redirectCount = 0;
      let finalUrl = url;
      if (response.request && response.request.res && response.request.res.responseUrl) {
          finalUrl = response.request.res.responseUrl;
          if (finalUrl !== url) redirectCount = 1;
      }

      if (status >= 400) {
        throw new Error(`HTTP Error ${status}`);
      }

      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const parsedData = parseHtml(html, finalUrl);

      return {
        success: true,
        originalUrl: url,
        finalUrl: finalUrl,
        canonicalUrl: parsedData.canonicalUrl,
        links: parsedData.links,
        responseTime,
        status,
        redirectCount
      };

    } catch (err) {
      await logError(`Failed to fetch ${url}: ${err.message}`, this.outputDir);
      return {
        success: false,
        url,
        error: err.message,
        responseTime: Date.now() - startTime
      };
    }
  }
}
