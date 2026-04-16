// ===================================================
// ================= STUDENT DASHBOARD JS ============
// ===================================================

// Chart instances
let weeklyChart = null;
let hourlyChart = null;
let trendChart = null;
let attendanceRateChart = null;
let peakHoursChart = null;
let dayWiseChart = null;

// Data storage
let attendanceRecords = [];
let currentCalendarDate = new Date();

// ===================================================
// ================= INITIALIZATION ==================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    document.getElementById('currentDate').textContent = formatDate(new Date());
    
    // Initialize navigation
    setupNavigation();
    
    // Load dashboard data
    loadStats();
    loadAttendanceRecords();
    loadWeeklyChart();
    loadHourlyActivity();
    
    // Setup trend buttons
    setupTrendButtons();
    
    // Setup calendar navigation
    setupCalendar();
    
    // Setup sidebar toggle
    setupSidebar();
});

// ===================================================
// ================= NAVIGATION ======================
// ===================================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');
    
    const titles = {
        'overview': 'Dashboard Overview',
        'attendance': 'Attendance History',
        'analytics': 'Personal Analytics'
    };
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Update active section
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(section + 'Section').classList.add('active');
            
            // Update title
            pageTitle.textContent = titles[section];
            
            // Load section-specific data
            if (section === 'analytics') {
                loadAnalytics();
            } else if (section === 'attendance') {
                renderCalendar();
            }
        });
    });
}

function setupSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// ===================================================
// ================= STATS LOADING ===================
// ===================================================

async function loadStats() {
    try {
        const response = await fetch('/api/student/stats');
        const data = await response.json();
        
        document.getElementById('entriesToday').textContent = data.entries_today || 0;
        document.getElementById('weekPresent').textContent = data.week_present || 0;
        document.getElementById('weekPercentage').textContent = data.attendance_percentage + '%';
        document.getElementById('monthPresent').textContent = data.month_present || 0;
        document.getElementById('totalEntries').textContent = data.total_entries || 0;
        
        // Update attendance section summary
        document.getElementById('totalDaysPresent').textContent = data.total_days_present || 0;
        document.getElementById('totalEntriesAll').textContent = data.total_entries || 0;
        document.getElementById('attendancePercent').textContent = data.attendance_percentage + '%';
        
        // Load hourly chart with today's data
        if (data.hourly_today) {
            renderHourlyChart(data.hourly_today);
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===================================================
// ================= ATTENDANCE RECORDS ==============
// ===================================================

async function loadAttendanceRecords() {
    try {
        const response = await fetch('/api/student/attendance');
        const data = await response.json();
        attendanceRecords = data.records || [];
        
        renderRecentActivity();
        renderAttendanceTable();
        renderCalendar();
        
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    const recentRecords = attendanceRecords.slice(0, 5);
    
    if (recentRecords.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon entry">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Your attendance records will appear here</div>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentRecords.map(record => {
        const entries = record.entries || [];
        const lastEntry = entries[entries.length - 1];
        return `
            <div class="activity-item">
                <div class="activity-icon entry">
                    <i class="fas fa-door-open"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">Checked in - ${record.date}</div>
                    <div class="activity-time">${entries.length} entries | Last: ${lastEntry?.time || 'N/A'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (attendanceRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = attendanceRecords.map(record => {
        const entries = record.entries || [];
        const dayName = getDayName(record.date);
        const entryTimes = entries.map(e => 
            `<span class="entry-time-badge">${e.time}</span>`
        ).join(' ');
        
        return `
            <tr>
                <td>${record.date}</td>
                <td>${dayName}</td>
                <td>${entries.length}</td>
                <td>${entryTimes || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ===================================================
// ================= CALENDAR ========================
// ===================================================

function setupCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const container = document.getElementById('calendarDays');
    const monthLabel = document.getElementById('calendarMonth');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Get attendance dates for this month
    const presentDates = new Set();
    attendanceRecords.forEach(record => {
        const [day, mon, yr] = record.date.split('-').map(Number);
        if (yr === year && mon === month + 1) {
            presentDates.add(day);
        }
    });
    
    let html = '';
    
    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getDate() === day && 
                        today.getMonth() === month && 
                        today.getFullYear() === year;
        const isPresent = presentDates.has(day);
        const isPast = new Date(year, month, day) < today;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isPresent) classes += ' present';
        else if (isPast) classes += ' absent';
        
        html += `<div class="${classes}">${day}</div>`;
    }
    
    container.innerHTML = html;
}

// ===================================================
// ================= CHARTS ==========================
// ===================================================

async function loadWeeklyChart() {
    try {
        const response = await fetch('/api/student/attendance_trend?days=7');
        const data = await response.json();
        
        const labels = data.trend.map(d => d.date.split('-').slice(0, 2).join('/'));
        const entries = data.trend.map(d => d.entries);
        
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        
        if (weeklyChart) weeklyChart.destroy();
        
        weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Entries',
                    data: entries,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading weekly chart:', error);
    }
}

function renderHourlyChart(hourlyData) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    // Get hours with data (6 AM to 10 PM)
    const startHour = 6;
    const endHour = 22;
    const labels = [];
    const data = [];
    
    for (let h = startHour; h <= endHour; h++) {
        labels.push(h + ':00');
        data.push(hourlyData[h] || 0);
    }
    
    if (hourlyChart) hourlyChart.destroy();
    
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Entries',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

async function loadHourlyActivity() {
    try {
        const response = await fetch('/api/student/stats');
        const data = await response.json();
        if (data.hourly_today) {
            renderHourlyChart(data.hourly_today);
        }
    } catch (error) {
        console.error('Error loading hourly activity:', error);
    }
}

// ===================================================
// ================= ANALYTICS =======================
// ===================================================

function setupTrendButtons() {
    document.querySelectorAll('.trend-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.trend-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadTrendChart(parseInt(this.dataset.days));
        });
    });
}

async function loadAnalytics() {
    loadTrendChart(7);
    loadAttendanceRateChart();
    loadPeakHoursChart();
    loadDayWiseChart();
    generateInsights();
}

async function loadTrendChart(days) {
    try {
        const response = await fetch(`/api/student/attendance_trend?days=${days}`);
        const data = await response.json();
        
        const labels = data.trend.map(d => d.date.split('-').slice(0, 2).join('/'));
        const entries = data.trend.map(d => d.entries);
        const present = data.trend.map(d => d.present);
        
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        if (trendChart) trendChart.destroy();
        
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entries',
                        data: entries,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Present',
                        data: present,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 5,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            boxWidth: 12,
                            padding: 15
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading trend chart:', error);
    }
}

async function loadAttendanceRateChart() {
    try {
        const response = await fetch('/api/student/stats');
        const data = await response.json();
        
        const present = data.week_present || 0;
        const absent = 7 - present;
        
        const ctx = document.getElementById('attendanceRateChart').getContext('2d');
        
        if (attendanceRateChart) attendanceRateChart.destroy();
        
        attendanceRateChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent'],
                datasets: [{
                    data: [present, absent],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderColor: ['#059669', '#dc2626'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                cutout: '70%'
            }
        });
        
    } catch (error) {
        console.error('Error loading attendance rate chart:', error);
    }
}

async function loadPeakHoursChart() {
    // Aggregate hourly data from all records
    const hourlyTotals = new Array(24).fill(0);
    
    attendanceRecords.forEach(record => {
        (record.entries || []).forEach(entry => {
            const hour = parseInt(entry.time.split(':')[0]);
            hourlyTotals[hour]++;
        });
    });
    
    // Get peak hours (8 AM to 8 PM)
    const labels = [];
    const data = [];
    for (let h = 8; h <= 20; h++) {
        labels.push(h + ':00');
        data.push(hourlyTotals[h]);
    }
    
    const ctx = document.getElementById('peakHoursChart').getContext('2d');
    
    if (peakHoursChart) peakHoursChart.destroy();
    
    peakHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Entries',
                data: data,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 7
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function loadDayWiseChart() {
    // Count entries by day of week
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
    
    attendanceRecords.forEach(record => {
        const [day, month, year] = record.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        dayTotals[dayOfWeek] += (record.entries || []).length;
    });
    
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const ctx = document.getElementById('dayWiseChart').getContext('2d');
    
    if (dayWiseChart) dayWiseChart.destroy();
    
    dayWiseChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Entries',
                data: dayTotals,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    pointLabels: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

async function generateInsights() {
    const container = document.getElementById('insightsGrid');
    
    try {
        const response = await fetch('/api/student/stats');
        const stats = await response.json();
        
        const insights = [];
        
        // Attendance rate insight
        if (stats.attendance_percentage >= 80) {
            insights.push({
                icon: 'fa-trophy',
                title: 'Great Attendance!',
                text: `You've maintained ${stats.attendance_percentage}% attendance this week. Keep it up!`
            });
        } else if (stats.attendance_percentage >= 50) {
            insights.push({
                icon: 'fa-exclamation-triangle',
                title: 'Room for Improvement',
                text: `Your attendance is ${stats.attendance_percentage}% this week. Try to be more consistent.`
            });
        } else {
            insights.push({
                icon: 'fa-exclamation-circle',
                title: 'Low Attendance Alert',
                text: `Your attendance is only ${stats.attendance_percentage}% this week. Please improve.`
            });
        }
        
        // Total days insight
        insights.push({
            icon: 'fa-calendar-check',
            title: 'Total Presence',
            text: `You've been present for ${stats.total_days_present} days with ${stats.total_entries} total entries.`
        });
        
        // Today's insight
        if (stats.entries_today > 0) {
            insights.push({
                icon: 'fa-check-circle',
                title: 'Active Today',
                text: `You've made ${stats.entries_today} entries today. Great job being active!`
            });
        } else {
            insights.push({
                icon: 'fa-info-circle',
                title: 'No Entries Today',
                text: 'No entries recorded today yet. Make sure to check in!'
            });
        }
        
        // Month insight
        insights.push({
            icon: 'fa-chart-line',
            title: 'Monthly Progress',
            text: `You've been present ${stats.month_present} days this month.`
        });
        
        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.text}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error generating insights:', error);
    }
}

// ===================================================
// ================= EXPORT ==========================
// ===================================================

function exportAttendance() {
    if (attendanceRecords.length === 0) {
        alert('No records to export');
        return;
    }
    
    let csv = 'Date,Day,Entries,Entry Times\n';
    
    attendanceRecords.forEach(record => {
        const entries = record.entries || [];
        const day = getDayName(record.date);
        const times = entries.map(e => e.time).join('; ');
        csv += `${record.date},${day},${entries.length},"${times}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_attendance.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===================================================
// ================= UTILITIES =======================
// ===================================================

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getDayName(dateStr) {
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}