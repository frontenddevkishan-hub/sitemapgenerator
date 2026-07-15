import fs from 'fs';
import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { SingleBar, Presets } from 'cli-progress';
import { CrawlerWorker } from './worker.js';
import { isInternalUrl, isValidUrl } from '../utils/validators.js';
import { normalizeUrl } from '../normalizer/index.js';
import { logger } from '../utils/logger.js';
import { getRobotsTxt } from '../robots/index.js';
import { getExistingSitemapUrls } from '../sitemap/parser.js';
import { buildSitemap } from '../sitemap/builder.js';
import { writeOutputs } from '../writer/index.js';
import { generateReport } from '../report/index.js';

export class Crawler extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.queue = new PQueue({ concurrency: config.concurrency });
    this.visited = new Set();
    this.uniqueUrls = new Set();
    this.duplicateUrls = [];
    this.stats = {
      totalPages: 0,
      totalRedirects: 0,
      brokenPages: 0,
      duplicateUrlsRemoved: 0,
      skippedUrls: 0,
      totalResponseTime: 0,
      maxDepth: 0,
      startTime: Date.now(),
      duration: 0
    };
    this.browser = null;
    this.robots = null;
    this.progressBar = new SingleBar({}, Presets.shades_classic);
  }

  async init() {
    fs.mkdirSync(this.config.outputDirectory, { recursive: true });
    if (this.config.respectRobots) {
      this.robots = await getRobotsTxt(this.config.startUrl);
    }
  }

  async start() {
    await this.init();
    logger.info(`Starting crawl for ${this.config.startUrl}`);
    this.progressBar.start(this.config.maxPages === Infinity ? 1000 : this.config.maxPages, 0);

    const startNormalized = normalizeUrl(this.config.startUrl);
    
    // Check existing sitemap
    if (this.config.mergeSitemaps) {
      const existing = await getExistingSitemapUrls(this.config.startUrl);
      for (const url of existing) {
        if (isInternalUrl(url, this.config.startUrl)) {
          const norm = normalizeUrl(url);
          if (this.uniqueUrls.has(norm)) {
            this.duplicateUrls.push(url);
          } else {
            this.uniqueUrls.add(norm);
          }
        }
      }
    }

    this.enqueue(startNormalized, 0, 0);

    await this.queue.onIdle();

    this.stats.duration = Date.now() - this.stats.startTime;
    this.stats.avgResponseTime = this.stats.totalPages > 0 ? this.stats.totalResponseTime / this.stats.totalPages : 0;
    this.progressBar.stop();
    logger.success('Crawl completed!');

    await this.finalize();
  }

  enqueue(url, depth, attempt = 0) {
    if (this.visited.has(url)) {
      this.stats.duplicateUrlsRemoved++;
      return;
    }
    if (this.config.maxDepth !== Infinity && depth > this.config.maxDepth) {
      this.stats.skippedUrls++;
      return;
    }
    if (this.stats.totalPages + this.queue.size >= this.config.maxPages) {
      return;
    }
    if (this.config.respectRobots && this.robots && !this.robots.isAllowed(url)) {
      this.stats.skippedUrls++;
      return;
    }

    this.visited.add(url);

    this.queue.add(async () => {
      const worker = new CrawlerWorker(this.browser, this.config.outputDirectory);
      const result = await worker.processUrl(url);

      if (result.success) {
        this.stats.totalPages++;
        this.stats.totalResponseTime += result.responseTime;
        if (result.redirectCount > 0) this.stats.totalRedirects += result.redirectCount;
        if (depth > this.stats.maxDepth) this.stats.maxDepth = depth;

        let finalStoreUrl = result.canonicalUrl || result.finalUrl;
        const normFinal = normalizeUrl(finalStoreUrl);
        if (this.uniqueUrls.has(normFinal)) {
           this.duplicateUrls.push(finalStoreUrl);
        } else {
           this.uniqueUrls.add(normFinal);
        }

        for (const link of result.links) {
          if (isValidUrl(link) && isInternalUrl(link, this.config.startUrl)) {
            const normLink = normalizeUrl(link);
            if (this.uniqueUrls.has(normLink)) {
               this.duplicateUrls.push(link);
            } else {
               this.uniqueUrls.add(normLink);
            }
            this.enqueue(link, depth + 1, 0);
          }
        }
      } else {
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          this.visited.delete(url); // allow re-entry
          setTimeout(() => this.enqueue(url, depth, attempt + 1), delay);
        } else {
          this.stats.brokenPages++;
        }
      }
      this.progressBar.update(this.stats.totalPages);
      const progressPercent = Math.min((this.stats.totalPages / this.config.maxPages) * 100, 100);
      this.emit('progress', { progress: progressPercent.toFixed(2), stats: this.stats });
    });
  }

  async finalize() {
    const urlsArray = Array.from(this.uniqueUrls).sort();
    logger.info(`Building outputs for ${urlsArray.length} unique URLs and ${this.duplicateUrls.length} duplicates...`);
    
    await buildSitemap(urlsArray, this.config.outputDirectory, this.config.startUrl);
    await writeOutputs(urlsArray, this.config.outputDirectory);
    
    // Write duplicates specifically
    fs.writeFileSync(`${this.config.outputDirectory}/duplicate.txt`, this.duplicateUrls.join('\n'));
    
    await generateReport(this.stats, this.config.outputDirectory);

    logger.success('All outputs generated successfully.');
    this.emit('done', { 
        uniqueCount: urlsArray.length, 
        duplicateCount: this.duplicateUrls.length,
        stats: this.stats
    });
  }
}
