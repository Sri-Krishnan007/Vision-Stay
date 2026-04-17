// ===================================================
// ================= ANALYTICS JS ====================
// ===================================================

// Chart instances
let attendanceTrendChart = null;
let distributionChart = null;
let hourlyChart = null;
let topVisitorsChart = null;

// Store records for export
let currentRecords = [];

// ===================================================
// ================= INITIALIZATION ==================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadAttendanceTrend(7);
    loadDistributionChart();
    loadHourlyChart();
    loadTopVisitors();
    setDefaultDates();
    loadAttendanceTable();
    
    // Add event listeners for trend buttons
    document.querySelectorAll('.trend-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.trend-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadAttendanceTrend(parseInt(this.dataset.days));
        });
    });
});

// ===================================================
// ================= STATS LOADING ===================
// ===================================================

async function loadStats() {
    try {
        const response = await fetch('/api/analytics/stats');
        const data = await response.json();
        
        document.getElementById('totalStudents').textContent = data.total_students || 0;
        document.getElementById('hostellers').textContent = data.hostellers || 0;
        document.getElementById('dayScholars').textContent = data.day_scholars || 0;
        document.getElementById('entriesToday').textContent = data.entries_today || 0;
        document.getElementById('maskedAlerts').textContent = data.masked_alerts || 0;
        document.getElementById('unknownAlerts').textContent = data.unknown_alerts || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===================================================
// ================= ATTENDANCE TREND ================
// ===================================================

async function loadAttendanceTrend(days) {
    try {
        const response = await fetch(`/api/analytics/attendance_trend?days=${days}`);
        const data = await response.json();
        
        const labels = data.trend.map(d => d.date);
        const entries = data.trend.map(d => d.total_entries);
        const uniquePersons = data.trend.map(d => d.unique_persons);
        
        const ctx = document.getElementById('attendanceTrendChart').getContext('2d');
        
        if (attendanceTrendChart) {
            attendanceTrendChart.destroy();
        }
        
        attendanceTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Entries',
                        data: entries,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Unique Persons',
                        data: uniquePersons,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
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
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading attendance trend:', error);
    }
}

// ===================================================
// ================= DISTRIBUTION CHART ==============
// ===================================================

async function loadDistributionChart() {
    try {
        const response = await fetch('/api/analytics/stats');
        const data = await response.json();
        
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        if (distributionChart) {
            distributionChart.destroy();
        }
        
        distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Hostellers', 'Day Scholars'],
                datasets: [{
                    data: [data.hostellers || 0, data.day_scholars || 0],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error loading distribution chart:', error);
    }
}

// ===================================================
// ================= HOURLY CHART ====================
// ===================================================

async function loadHourlyChart() {
    try {
        const response = await fetch('/api/analytics/hourly_distribution');
        const data = await response.json();
        
        const ctx = document.getElementById('hourlyChart').getContext('2d');
        
        if (hourlyChart) {
            hourlyChart.destroy();
        }
        
        // Show only hours 6 AM to 11 PM for better visualization
        const filteredLabels = data.labels.slice(6, 24);
        const filteredValues = data.values.slice(6, 24);
        
        hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filteredLabels.map(h => `${h}:00`),
                datasets: [{
                    label: 'Entries',
                    data: filteredValues,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 9 },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading hourly chart:', error);
    }
}

// ===================================================
// ================= TOP VISITORS ====================
// ===================================================

async function loadTopVisitors() {
    try {
        const response = await fetch('/api/analytics/top_visitors?days=7&limit=5');
        const data = await response.json();
        
        const ctx = document.getElementById('topVisitorsChart').getContext('2d');
        
        if (topVisitorsChart) {
            topVisitorsChart.destroy();
        }
        
        const names = data.top_visitors.map(v => v.name.length > 12 ? v.name.slice(0, 12) + '...' : v.name);
        const entries = data.top_visitors.map(v => v.entries);
        
        topVisitorsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: names,
                datasets: [{
                    label: 'Total Entries',
                    data: entries,
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(139, 92, 246, 0.7)'
                    ],
                    borderColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#10b981',
                        '#3b82f6',
                        '#8b5cf6'
                    ],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    y: {
                        ticks: {
                            font: { size: 10 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading top visitors:', error);
    }
}

// ===================================================
// ================= ATTENDANCE TABLE ================
// ===================================================

function setDefaultDates() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    document.getElementById('filterEndDate').valueAsDate = today;
    document.getElementById('filterStartDate').valueAsDate = weekAgo;
}

async function loadAttendanceTable() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const name = document.getElementById('filterName').value;
    const type = document.getElementById('filterType').value;
    
    let url = '/api/analytics/attendance_table?';
    
    if (startDate) {
        const formatted = formatDateForAPI(startDate);
        url += `start_date=${formatted}&`;
    }
    if (endDate) {
        const formatted = formatDateForAPI(endDate);
        url += `end_date=${formatted}&`;
    }
    if (name) {
        url += `name=${encodeURIComponent(name)}&`;
    }
    if (type && type !== 'all') {
        url += `type=${type}&`;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        currentRecords = data.records;
        document.getElementById('recordCount').textContent = `${data.count} records found`;
        
        renderTable(data.records);
    } catch (error) {
        console.error('Error loading attendance table:', error);
    }
}

function formatDateForAPI(dateStr) {
    // Convert from YYYY-MM-DD to DD-MM-YYYY
    const parts = dateStr.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function renderTable(records) {
    const tbody = document.getElementById('tableBody');
    
    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <p>No attendance records found matching your filters.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.roll_no || 'N/A'}</td>
            <td><strong>${record.name}</strong></td>
            <td>${record.course}</td>
            <td>${record.year}</td>
            <td>
                <span class="type-badge ${record.is_hosteller ? 'hosteller' : 'dayscholar'}">
                    ${record.is_hosteller ? 'Hosteller' : 'Day Scholar'}
                </span>
            </td>
            <td>${record.date}</td>
            <td>${record.entry_count}</td>
            <td>
                <div class="entry-times-list">
                    ${record.entries.slice(0, 5).map(e => `
                        <span class="entry-time-badge">${e.time}</span>
                    `).join('')}
                    ${record.entries.length > 5 ? `<span class="entry-time-badge">+${record.entries.length - 5} more</span>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function applyFilters() {
    loadAttendanceTable();
}

function clearFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterName').value = '';
    document.getElementById('filterType').value = 'all';
    setDefaultDates();
    loadAttendanceTable();
}

// ===================================================
// ================= EXPORT FUNCTION =================
// ===================================================

function exportTable() {
    if (currentRecords.length === 0) {
        alert('No records to export');
        return;
    }
    
    // Create CSV content
    const headers = ['Roll No', 'Name', 'Course', 'Year', 'Type', 'Date', 'Entry Count', 'Entry Times'];
    const rows = currentRecords.map(record => [
        record.roll_no || 'N/A',
        record.name,
        record.course,
        record.year,
        record.is_hosteller ? 'Hosteller' : 'Day Scholar',
        record.date,
        record.entry_count,
        record.entries.map(e => e.time).join('; ')
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}