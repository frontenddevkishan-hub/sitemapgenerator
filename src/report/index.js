import fs from 'fs/promises';
import path from 'path';

/**
 * Generates the crawl report and statistics
 */
export async function generateReport(stats, outputDir) {
  // stats contains: totalPages, totalRedirects, brokenPages, duplicateUrls, skippedUrls, avgResponseTime, maxDepth, duration

  const report = {
    crawlReport: {
      totalPages: stats.totalPages || 0,
      totalRedirects: stats.totalRedirects || 0,
      brokenPages: stats.brokenPages || 0,
      duplicateUrlsRemoved: stats.duplicateUrlsRemoved || 0,
      skippedUrls: stats.skippedUrls || 0,
      averageResponseTimeMs: stats.avgResponseTime || 0,
      maximumDepthReached: stats.maxDepth || 0,
      totalCrawlDurationMs: stats.duration || 0,
      timestamp: new Date().toISOString()
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'crawl-report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outputDir, 'statistics.json'), JSON.stringify(report.crawlReport, null, 2));
}

export async function logError(errorMsg, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.appendFile(path.join(outputDir, 'errors.log'), `${new Date().toISOString()} - ${errorMsg}\n`);
}
