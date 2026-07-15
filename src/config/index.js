import fs from 'fs/promises';
import path from 'path';

export async function loadConfig(configPath) {
  const defaultConfig = {
    concurrency: 10,
    maxPages: Infinity,
    maxDepth: Infinity,
    timeout: 30000,
    respectRobots: true,
    followRedirects: true,
    retryAttempts: 3,
    outputDirectory: './output',
    mergeSitemaps: true
  };

  try {
    const rawData = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(rawData);
    return { ...defaultConfig, ...userConfig };
  } catch (err) {
    if (err.code === 'ENOENT') {
      // If config doesn't exist, return default
      return defaultConfig;
    }
    throw new Error(`Failed to parse config file: ${err.message}`);
  }
}
