import { parseHtml } from '../parser/index.js';
import { logError } from '../report/index.js';

export class CrawlerWorker {
  constructor(browser, outputDir) {
    this.browser = browser;
    this.outputDir = outputDir;
  }

  async processUrl(url) {
    const startTime = Date.now();
    let page;
    try {
      const context = await this.browser.newContext({ ignoreHTTPSErrors: true });
      page = await context.newPage();
      
      // We use 'domcontentloaded' and catch timeouts. Many enterprise sites hang due to WAF or trackers.
      // If it times out, we still try to extract whatever HTML has been loaded so far.
      let response = null;
      try {
        response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (gotoErr) {
        // If it's just a timeout, we ignore it and proceed to extract HTML
        if (!gotoErr.message.includes('Timeout')) {
          throw gotoErr;
        }
      }
      
      const responseTime = Date.now() - startTime;
      const status = response ? response.status() : 200;
      let redirectCount = 0;
      if (response) {
        let req = response.request().redirectedFrom();
        while (req) {
          redirectCount++;
          req = req.redirectedFrom();
        }
      }

      if (status >= 400) {
        throw new Error(`HTTP Error ${status}`);
      }

      // Extract HTML after JS execution
      const html = await page.content();
      
      // Parse out canonical and links
      const parsedData = parseHtml(html, url);

      let finalUrl = url;
      // Handle redirects / canonical if needed
      // If there were redirects, the final finalUrl is page.url()
      if (page.url() !== url) {
        finalUrl = page.url();
      }

      await context.close();

      return {
        success: true,
        originalUrl: url,
        finalUrl: finalUrl,
        canonicalUrl: parsedData.canonicalUrl,
        links: parsedData.links,
        responseTime,
        status,
        redirectCount: redirectCount
      };

    } catch (err) {
      if (page) await page.context().close().catch(() => {});
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
