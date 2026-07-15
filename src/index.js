import { program } from 'commander';
import path from 'path';
import { loadConfig } from './config/index.js';
import { Crawler } from './crawler/index.js';
import { logger } from './utils/logger.js';
import { isValidUrl } from './utils/validators.js';
import { normalizeUrl } from './normalizer/index.js';

program
  .name('sitemapgenerator')
  .description('Enterprise Sitemap Generator - Crawls websites and generates XML sitemaps')
  .version('1.0.0')
  .argument('<url>', 'The start URL of the website to crawl (e.g., https://example.com)')
  .option('-c, --config <path>', 'Path to configuration JSON file', 'config.json')
  .action(async (url, options) => {
    try {
      if (!isValidUrl(url)) {
        logger.error(`Invalid URL provided: ${url}`);
        process.exit(1);
      }

      const configPath = path.resolve(process.cwd(), options.config);
      const config = await loadConfig(configPath);
      
      // Inject startUrl into config
      config.startUrl = normalizeUrl(url);

      const crawler = new Crawler(config);
      await crawler.start();
      
    } catch (err) {
      logger.error('An unexpected error occurred:', err);
      process.exit(1);
    }
  });

program.parse();
