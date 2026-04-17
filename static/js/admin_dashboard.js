// ===================================================
// ================= ADMIN DASHBOARD JS ==============
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    loadDashboardStats();
    
    // Load home section by default
    loadSection('home');
});

// ===================================================
// ================= DATE DISPLAY ====================
// ===================================================

function setCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// ===================================================
// ================= SECTION SWITCHING ===============
// ===================================================

function loadSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar li').forEach(li => {
        li.classList.remove('active');
    });
    
    // Find and activate the clicked item
    const sidebarItems = document.querySelectorAll('.sidebar li');
    sidebarItems.forEach(li => {
        const onclickAttr = li.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${sectionId}'`)) {
            li.classList.add('active');
        }
    });
}

// ===================================================
// ================= DASHBOARD STATS =================
// ===================================================

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/analytics/stats');
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('statTotalStudents').textContent = data.total_students || 0;
            document.getElementById('statHostellers').textContent = data.hostellers || 0;
            document.getElementById('statEntriesToday').textContent = data.entries_today || 0;
            
            const alerts = (data.masked_alerts || 0) + (data.unknown_alerts || 0);
            document.getElementById('statAlerts').textContent = alerts;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// ===================================================
// ================= DAY SCHOLARS ====================
// ===================================================

let dayScholarsData = [];

async function loadDayScholars() {
    const startDate = document.getElementById('dsStartDate').value;
    const endDate = document.getElementById('dsEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    // Format dates to DD-MM-YYYY
    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);
    
    try {
        const response = await fetch(`/api/dayscholars?start_date=${formattedStart}&end_date=${formattedEnd}`);
        const data = await response.json();
        
        dayScholarsData = data.dayscholars || [];
        renderDayScholars(dayScholarsData);
        updateDSStats(dayScholarsData);
    } catch (error) {
        console.error('Error loading day scholars:', error);
    }
}

function formatDate(dateStr) {
    const parts = dateStr.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function renderDayScholars(dayscholars) {
    const grid = document.getElementById('dsGrid');
    
    if (dayscholars.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <p>No day scholar entries found for the selected date range</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = dayscholars.map(ds => `
        <div class="ds-card" data-rollno="${ds.roll_no}" data-date="${ds.date}">
            <div class="ds-card-header">
                <img src="/static/uploads/${ds.photo || 'default.png'}" alt="${ds.name}" class="ds-photo" onerror="this.src='/static/uploads/default.png'">
                <div class="ds-info">
                    <div class="ds-name">${ds.name}</div>
                    <div class="ds-rollno">${ds.roll_no}</div>
                    <div class="ds-date">📅 ${ds.date}</div>
                </div>
            </div>
            <div class="ds-card-body">
                <div class="ds-entries">
                    <h4>Entry Times (${ds.entry_count})</h4>
                    <div class="entry-times">
                        ${ds.entries.slice(0, 5).map(e => `<span class="entry-time">${e.time}</span>`).join('')}
                        ${ds.entries.length > 5 ? `<span class="entry-time">+${ds.entries.length - 5} more</span>` : ''}
                    </div>
                </div>
                <div class="ds-email-status">
                    <span class="status-badge ${ds.email_sent ? 'sent' : 'pending'}">
                        ${ds.email_sent ? '✓ Email Sent' : '⏳ Pending'}
                    </span>
                    ${!ds.email_sent ? `
                        <button class="send-email-btn" onclick="sendEmail('${ds.roll_no}', '${ds.name}', '${ds.date}', this)">
                            📧 Send Email
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function updateDSStats(dayscholars) {
    const pending = dayscholars.filter(ds => !ds.email_sent).length;
    document.getElementById('dsCount').textContent = `${dayscholars.length} day scholars detected`;
    document.getElementById('dsPending').textContent = `${pending} pending emails`;
}

function clearDSFilter() {
    document.getElementById('dsStartDate').value = '';
    document.getElementById('dsEndDate').value = '';
    document.getElementById('dsGrid').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>Select date range and click Filter to load day scholar entries</p>
        </div>
    `;
    document.getElementById('dsCount').textContent = '0 day scholars detected';
    document.getElementById('dsPending').textContent = '0 pending emails';
    dayScholarsData = [];
}

async function sendEmail(rollNo, name, date, btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = 'Sending...';
    
    const ds = dayScholarsData.find(d => d.roll_no === rollNo && d.date === date);
    
    try {
        const response = await fetch('/api/dayscholars/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roll_no: rollNo,
                name: name,
                date: date,
                entries: ds ? ds.entries : []
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            btnElement.textContent = '✓ Sent';
            btnElement.style.background = '#10b981';
            
            // Update the status badge
            const card = btnElement.closest('.ds-card');
            const badge = card.querySelector('.status-badge');
            badge.className = 'status-badge sent';
            badge.textContent = '✓ Email Sent';
            
            // Update data
            if (ds) ds.email_sent = true;
            updateDSStats(dayScholarsData);
        } else {
            btnElement.textContent = 'Failed';
            btnElement.style.background = '#ef4444';
            setTimeout(() => {
                btnElement.disabled = false;
                btnElement.textContent = '📧 Send Email';
                btnElement.style.background = '';
            }, 2000);
        }
    } catch (error) {
        console.error('Error sending email:', error);
        btnElement.disabled = false;
        btnElement.textContent = '📧 Send Email';
    }
}

async function sendAllEmails(event) {
    const btn = event.target;
    const pendingDS = dayScholarsData.filter(ds => !ds.email_sent);
    
    if (pendingDS.length === 0) {
        alert('No pending emails to send');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = `Sending ${pendingDS.length} emails...`;
    
    try {
        const response = await fetch('/api/dayscholars/send_all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dayscholars: pendingDS })
        });
        
        const result = await response.json();
        
        btn.textContent = `✓ Sent ${result.sent} emails`;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        // Refresh the list
        setTimeout(() => {
            loadDayScholars();
            btn.disabled = false;
            btn.textContent = '📧 Send All Pending Emails';
            btn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error sending all emails:', error);
        btn.disabled = false;
        btn.textContent = '📧 Send All Pending Emails';
    }
}