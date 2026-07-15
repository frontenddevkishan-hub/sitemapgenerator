document.getElementById('crawlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const url = document.getElementById('urlInput').value;
    const submitBtn = document.getElementById('submitBtn');
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!url) return;

    // Reset UI
    submitBtn.disabled = true;
    submitBtn.textContent = 'Starting...';
    resultsSection.classList.add('hidden');
    progressSection.classList.remove('hidden');
    
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '0% Complete';
    document.getElementById('pagesCrawledText').textContent = '0 Pages';

    try {
        const response = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        const jobId = data.jobId;
        listenToProgress(jobId);

    } catch (err) {
        alert('Failed to start crawl: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate';
        progressSection.classList.add('hidden');
    }
});

function listenToProgress(jobId) {
    const eventSource = new EventSource(`/api/progress/${jobId}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === 'running' || data.status === 'starting') {
            const progress = data.progress || 0;
            const stats = data.stats || {};
            
            document.getElementById('progressBar').style.width = `${progress}%`;
            document.getElementById('progressText').textContent = `${progress}% Complete`;
            document.getElementById('pagesCrawledText').textContent = `${stats.totalPages || 0} Pages Crawled`;
            
            // Allow the user to know it's working
            document.getElementById('submitBtn').textContent = 'Crawling...';
        } 
        else if (data.status === 'completed') {
            eventSource.close();
            showResults(data.data, jobId);
        }
        else if (data.status === 'failed') {
            eventSource.close();
            alert('The crawl process failed unexpectedly. Check server logs.');
            resetForm();
        }
    };

    eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        eventSource.close();
        alert('Lost connection to the server. The crawl may still be running in the background.');
        resetForm();
    };
}

function showResults(data, jobId) {
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');
    
    progressSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    const stats = data.stats || {};
    
    // Update Stats
    document.getElementById('statUnique').textContent = data.uniqueCount || 0;
    document.getElementById('statDuplicates').textContent = data.duplicateCount || 0;
    document.getElementById('statBroken').textContent = stats.brokenPages || 0;
    
    const avgTime = stats.avgResponseTime ? Math.round(stats.avgResponseTime) : 0;
    document.getElementById('statTime').textContent = `${avgTime}ms`;

    // Generate Download Links
    const linksContainer = document.getElementById('downloadLinks');
    linksContainer.innerHTML = ''; // Clear old links

    const files = [
        { name: 'Sitemap XML', path: 'sitemap-0.xml', primary: true },
        { name: 'Sitemap Index', path: 'sitemap_index.xml' },
        { name: 'Duplicates (TXT)', path: 'duplicate.txt' },
        { name: 'All URLs (CSV)', path: 'urls.csv' },
        { name: 'Error Log', path: 'errors.log' },
        { name: 'Full Stats JSON', path: 'statistics.json' }
    ];

    files.forEach(file => {
        const a = document.createElement('a');
        a.href = `/output/${jobId}/${file.path}`;
        a.className = `download-btn ${file.primary ? 'primary' : ''}`;
        a.download = file.path;
        
        // Add icons based on file type
        let icon = '📄';
        if (file.path.endsWith('.xml')) icon = '🗺️';
        if (file.path.endsWith('.csv')) icon = '📊';
        if (file.path.endsWith('.log')) icon = '⚠️';
        
        a.innerHTML = `${icon} ${file.name}`;
        linksContainer.appendChild(a);
    });

    resetForm();
}

function resetForm() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate New Sitemap';
}
