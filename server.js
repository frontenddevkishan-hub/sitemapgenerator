import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Crawler } from './src/crawler/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static('public'));

// Serve output files for download
app.use('/output', express.static('output'));

const jobs = new Map(); // Store active crawl jobs

app.post('/api/crawl', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const jobId = Date.now().toString();
    const outputDirectory = resolve(__dirname, 'output', jobId);
    
    // Create base config for the job
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    config.startUrl = url;
    config.outputDirectory = outputDirectory;

    const crawler = new Crawler(config);
    jobs.set(jobId, { crawler, status: 'running', progress: 0, stats: null });

    // Handle events
    crawler.on('progress', (data) => {
        const job = jobs.get(jobId);
        if (job) {
            job.progress = data.progress;
            job.stats = data.stats;
        }
    });

    crawler.on('done', (data) => {
        const job = jobs.get(jobId);
        if (job) {
            job.status = 'completed';
            job.finalData = data;
        }
    });

    // Start asynchronously
    crawler.start().catch(err => {
        console.error('Crawler failed:', err);
        const job = jobs.get(jobId);
        if (job) job.status = 'failed';
    });

    res.json({ jobId });
});

// Server-Sent Events endpoint for real-time progress
app.get('/api/progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const interval = setInterval(() => {
        if (job.status === 'completed') {
            res.write(`data: ${JSON.stringify({ status: 'completed', data: job.finalData })}\n\n`);
            clearInterval(interval);
            res.end();
        } else if (job.status === 'failed') {
            res.write(`data: ${JSON.stringify({ status: 'failed' })}\n\n`);
            clearInterval(interval);
            res.end();
        } else {
            res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, stats: job.stats })}\n\n`);
        }
    }, 1000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
