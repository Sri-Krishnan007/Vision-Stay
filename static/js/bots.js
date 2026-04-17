// ===================================================
// ================= BOTS JS =========================
// ===================================================

// ===================================================
// ================= INITIALIZATION ==================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    loadQuickStats();
    setupEventListeners();
});

function setupEventListeners() {
    // Enter key to send
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Quick question buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            document.getElementById('chatInput').value = question;
            sendMessage();
        });
    });
}

// ===================================================
// ================= QUICK STATS =====================
// ===================================================

async function loadQuickStats() {
    try {
        const response = await fetch('/api/bot/quick_stats');
        const data = await response.json();
        
        document.getElementById('statStudents').textContent = data.total_students || 0;
        document.getElementById('statHostellers').textContent = data.hostellers || 0;
        document.getElementById('statDayScholars').textContent = data.day_scholars || 0;
        document.getElementById('statToday').textContent = data.today_entries || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===================================================
// ================= CHAT FUNCTIONS ==================
// ===================================================

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Disable send button
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    
    try {
        const response = await fetch('/api/bot/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        if (data.success && data.reply) {
            addMessage(data.reply, 'bot');
        } else {
            addMessage('Sorry, I encountered an error processing your request. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Sorry, there was a connection error. Please check your network and try again.', 'bot');
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

function addMessage(content, type) {
    const chatMessages = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = type === 'bot' ? '🤖' : '👤';
    
    // Format content (handle markdown-like formatting)
    const formattedContent = formatContent(content);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${formattedContent}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatContent(content) {
    // Convert markdown-like formatting to HTML
    let formatted = content;
    
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert bullet points
    formatted = formatted.replace(/^[-•]\s(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive <li> in <ul>
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert numbered lists
    formatted = formatted.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
    
    // Convert newlines to <br> (but not within lists)
    const lines = formatted.split('\n');
    let result = [];
    let inList = false;
    
    for (let line of lines) {
        if (line.includes('<ul>') || line.includes('<ol>')) {
            inList = true;
        }
        if (line.includes('</ul>') || line.includes('</ol>')) {
            inList = false;
        }
        
        if (!inList && line.trim() && !line.includes('<li>') && !line.includes('<ul>') && !line.includes('</ul>')) {
            result.push(`<p>${line}</p>`);
        } else {
            result.push(line);
        }
    }
    
    return result.join('');
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// ===================================================
// ================= UTILITY FUNCTIONS ===============
// ===================================================

function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="message bot">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Chat cleared! How can I help you?</p>
            </div>
        </div>
    `;
}