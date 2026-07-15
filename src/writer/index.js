import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

/**
 * Output writers for different formats
 */
export async function writeOutputs(urls, outputDir) {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // 1. links.txt
  await fs.writeFile(path.join(outputDir, 'links.txt'), urls.join('\n'));

  // 2. links.json
  await fs.writeFile(path.join(outputDir, 'links.json'), JSON.stringify(urls, null, 2));

  // 3. urls.csv
  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'urls.csv'),
    header: [
      { id: 'url', title: 'URL' }
    ]
  });
  
  const records = urls.map(url => ({ url }));
  await csvWriter.writeRecords(records);
}
