// Global state
let allFrames = [];
let filteredFrames = [];
let detectionResults = null;
let currentCategory = 'all';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFrames();
});

// Load available frames from server
async function loadFrames() {
    try {
        const response = await fetch('/api/frames');
        const data = await response.json();
        
        if (data.frames) {
            allFrames = data.frames;
            filteredFrames = [...allFrames];
            renderFrameList();
            updateFrameCount();
        }
    } catch (error) {
        console.error('Error loading frames:', error);
    }
}

// Render frame list
function renderFrameList() {
    const frameList = document.getElementById('frameList');
    
    if (filteredFrames.length === 0) {
        frameList.innerHTML = '<div class="empty-state"><p>No frames found</p></div>';
        return;
    }
    
    frameList.innerHTML = filteredFrames.map(frame => `
        <div class="frame-item" onclick="toggleFrame(this, '${frame.filename}')">
            <input type="checkbox" data-filename="${frame.filename}">
            <div class="frame-info">
                <div class="frame-name">${frame.filename}</div>
                <div class="frame-time">${frame.datetime}</div>
            </div>
        </div>
    `).join('');
}

// Toggle frame selection
function toggleFrame(element, filename) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
    element.classList.toggle('selected', checkbox.checked);
}

// Select all frames
function selectAllFrames() {
    const checkboxes = document.querySelectorAll('.frame-item input[type="checkbox"]');
    const items = document.querySelectorAll('.frame-item');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => cb.checked = !allSelected);
    items.forEach(item => item.classList.toggle('selected', !allSelected));
}

// Filter frames by time range
function filterFrames() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!startTime && !endTime) {
        filteredFrames = [...allFrames];
    } else {
        filteredFrames = allFrames.filter(frame => {
            // Convert frame datetime to comparable format
            const [date, time] = frame.filename.replace('.jpg', '').split('_');
            const [day, month, year] = date.split('-');
            const [hour, min, sec] = time.split('-');
            const frameDate = new Date(year, month - 1, day, hour, min, sec);
            
            const start = startTime ? new Date(startTime) : new Date(0);
            const end = endTime ? new Date(endTime) : new Date(9999, 11, 31);
            
            return frameDate >= start && frameDate <= end;
        });
    }
    
    renderFrameList();
    updateFrameCount();
}

// Clear filter
function clearFilter() {
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    filteredFrames = [...allFrames];
    renderFrameList();
    updateFrameCount();
}

// Update frame count display
function updateFrameCount() {
    document.getElementById('frameCount').textContent = `${filteredFrames.length} frames`;
}

// Run detection on selected frames
async function runDetection() {
    const checkboxes = document.querySelectorAll('.frame-item input[type="checkbox"]:checked');
    const selectedFrames = Array.from(checkboxes).map(cb => cb.dataset.filename);
    
    if (selectedFrames.length === 0) {
        alert('Please select at least one frame');
        return;
    }
    
    // Show loading
    document.getElementById('loadingOverlay').classList.add('active');
    
    try {
        const response = await fetch('/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frames: selectedFrames })
        });
        
        const data = await response.json();
        
        if (data.results) {
            detectionResults = data.results;
            updateSummaryCards(data.summary);
            renderResults('all');
        }
    } catch (error) {
        console.error('Error running detection:', error);
        alert('Error running detection');
    } finally {
        document.getElementById('loadingOverlay').classList.remove('active');
    }
}

// Update summary cards
function updateSummaryCards(summary) {
    document.getElementById('detectedCount').textContent = summary.detected_count;
    document.getElementById('maskedCount').textContent = summary.masked_count;
    document.getElementById('unknownCount').textContent = summary.unknown_count;
    document.getElementById('siameseCount').textContent = summary.siamese_failed_count;
}

// Show category
function showCategory(category) {
    currentCategory = category;
    
    // Update tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    renderResults(category);
}

// Render results
function renderResults(category) {
    const grid = document.getElementById('resultsGrid');
    
    if (!detectionResults) {
        grid.innerHTML = '<div class="empty-state"><p>📷 Select frames and run detection to see results</p></div>';
        return;
    }
    
    let results = [];
    
    if (category === 'all') {
        results = [
            ...detectionResults.detected,
            ...detectionResults.masked,
            ...detectionResults.unknown,
            ...detectionResults.siamese_failed
        ];
    } else {
        results = detectionResults[category] || [];
    }
    
    if (results.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No results in this category</p></div>';
        return;
    }
    
    grid.innerHTML = results.map(result => renderResultCard(result)).join('');
}

// Render single result card
function renderResultCard(result) {
    const status = result.status;
    let name = '';
    let score = 0;
    let scoreLabel = '';
    
    if (status === 'detected') {
        name = result.name;
        score = result.score * 100;
        scoreLabel = `Score: ${(result.score * 100).toFixed(1)}% | Verified: ${result.verified}`;
    } else if (status === 'masked') {
        name = 'Masked Person';
        score = result.mask_prob * 100;
        scoreLabel = `Confidence: ${(result.mask_prob * 100).toFixed(1)}%`;
    } else if (status === 'unknown') {
        name = 'Unknown Person';
        score = (1 - result.distance) * 100;
        scoreLabel = `Distance: ${result.distance.toFixed(4)}`;
    } else if (status === 'siamese_failed') {
        name = result.name + ' (Verification Failed)';
        score = result.score * 100;
        scoreLabel = `Score: ${(result.score * 100).toFixed(1)}% | Verified: ${result.verified}`;
    }
    
    const scoreClass = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
    
    // Extract filename and build correct path
    const filename = result.path.split(/[/\\]/).pop();
    const folderMap = {
        'detected': 'detected',
        'masked': 'masked',
        'unknown': 'unknown',
        'siamese_failed': 'siamese_failed'
    };
    const imagePath = `/detection_images/${folderMap[status]}/${encodeURIComponent(filename)}`;
    
    return `
        <div class="result-card" data-status="${status}">
            <img src="${imagePath}" alt="${name}" onclick="openModal('${imagePath}', '${name}', '${scoreLabel}')">
            <div class="result-info">
                <span class="result-status ${status}">${formatStatus(status)}</span>
                <div class="result-name">${name}</div>
                <div class="result-meta">${result.source_frame || ''}</div>
                <div class="result-score">
                    <div class="score-bar">
                        <div class="score-fill ${scoreClass}" style="width: ${score}%"></div>
                    </div>
                    <span class="score-value">${score.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    `;
}

// Format status text
function formatStatus(status) {
    const statusMap = {
        'detected': '✅ Detected',
        'masked': '😷 Masked',
        'unknown': '❓ Unknown',
        'siamese_failed': '⚠️ Verify Failed'
    };
    return statusMap[status] || status;
}

// Open image modal
function openModal(imagePath, name, scoreLabel) {
    document.getElementById('modalImage').src = imagePath;
    document.getElementById('modalInfo').innerHTML = `
        <strong>${name}</strong><br>
        ${scoreLabel}
    `;
    document.getElementById('imageModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

// Close modal on outside click
document.getElementById('imageModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'imageModal') {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});