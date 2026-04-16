const UPDATE_INTERVAL = 500; // Update every 500ms
let statusCheckInterval;
let isRecording = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎥 Liveness Detection App Initialized');
    
    // Button listeners
    document.getElementById('start-btn').addEventListener('click', startRecording);
    document.getElementById('stop-btn').addEventListener('click', stopRecording);
    
    // Start status updates
    startStatusUpdates();
});

/**
 * Start recording
 */
async function startRecording() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    try {
        const response = await fetch('/start_recording');
        const data = await response.json();
        
        if (data.status === 'success') {
            isRecording = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            updateRecordingUI();
            console.log('✓ Recording started');
        }
    } catch (error) {
        console.error('Start error:', error);
    }
}

/**
 * Stop recording
 */
async function stopRecording() {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    try {
        const response = await fetch('/stop_recording');
        const data = await response.json();
        
        if (data.status === 'success') {
            isRecording = false;
            startBtn.disabled = false;
            stopBtn.disabled = true;
            updateRecordingUI();
            console.log(`✓ Recording stopped - ${data.frames_saved} frames saved`);
        }
    } catch (error) {
        console.error('Stop error:', error);
    }
}

/**
 * Update recording UI
 */
function updateRecordingUI() {
    const statusDisplay = document.getElementById('recording-status');
    if (isRecording) {
        statusDisplay.textContent = '🔴 RECORDING';
        statusDisplay.className = 'rec-status-on';
    } else {
        statusDisplay.textContent = '⚫ OFF';
        statusDisplay.className = 'rec-status-off';
    }
}

/**
 * Start periodic status updates
 */
function startStatusUpdates() {
    updateStatus();
    statusCheckInterval = setInterval(updateStatus, UPDATE_INTERVAL);
}

/**
 * Fetch and update status
 */
async function updateStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        
        // Liveness Status
        const livenessDisplay = document.getElementById('liveness-display');
        const livenessBadge = document.getElementById('liveness-badge');
        
        if (data.liveness_status === 'LIFE') {
            livenessDisplay.textContent = '✓ LIFE DETECTED';
            livenessDisplay.style.color = '#10b981';
            livenessBadge.className = 'liveness-badge life';
            livenessBadge.querySelector('.liveness-text').textContent = '✓ LIFE';
        } else if (data.liveness_status === 'SPOOFING') {
            livenessDisplay.textContent = '✗ SPOOFING DETECTED';
            livenessDisplay.style.color = '#ef4444';
            livenessBadge.className = 'liveness-badge spoofing';
            livenessBadge.querySelector('.liveness-text').textContent = '✗ SPOOFING';
        } else {
            livenessDisplay.textContent = data.liveness_status;
            livenessDisplay.style.color = '#6b7280';
            livenessBadge.className = 'liveness-badge unknown';
            livenessBadge.querySelector('.liveness-text').textContent = '?';
        }
        
        // Liveness Score & Bar
        const score = data.liveness_score;
        document.getElementById('liveness-score').textContent = Math.round(score) + '%';
        document.getElementById('liveness-bar-fill').style.width = score + '%';
        document.getElementById('liveness-bar-fill').style.background = 
            score >= 5 ? '#10b981' : '#ef4444';
        
        // Frames Saved
        document.getElementById('frames-saved').textContent = data.frames_saved;
        
        // Timestamp
        const now = new Date();
        document.getElementById('last-update').textContent = now.toLocaleTimeString();
        
    } catch (error) {
        console.error('Status update error:', error);
    }
}

window.addEventListener('beforeunload', function() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
});