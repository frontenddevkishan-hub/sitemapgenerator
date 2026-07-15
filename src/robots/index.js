import axios from 'axios';
import robotsParser from 'robots-parser';
import { logger } from '../utils/logger.js';

/**
 * Fetches and parses robots.txt for a given domain
 */
export async function getRobotsTxt(baseUrl, userAgent = '*') {
  const robotsUrl = new URL('/robots.txt', baseUrl).toString();
  
  try {
    const response = await axios.get(robotsUrl, { timeout: 10000 });
    const robots = robotsParser(robotsUrl, response.data);
    logger.success(`Successfully parsed robots.txt from ${robotsUrl}`);
    return robots;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      logger.info(`No robots.txt found at ${robotsUrl}. Proceeding without restrictions.`);
    } else {
      logger.warn(`Failed to fetch robots.txt at ${robotsUrl}: ${err.message}`);
    }
    // Return a dummy robots parser that allows everything if fetch fails
    return robotsParser(robotsUrl, '');
  }
}
