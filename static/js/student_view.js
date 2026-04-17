// ===================================================
// ================= STUDENT VIEW JS =================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    calculateStats();
});

// ===================================================
// ================= STATS CALCULATION ===============
// ===================================================

function calculateStats() {
    const cards = document.querySelectorAll('.student-card');
    let hostellers = 0;
    let dayscholars = 0;
    
    cards.forEach(card => {
        if (card.dataset.type === 'hosteller') {
            hostellers++;
        } else {
            dayscholars++;
        }
    });
    
    document.getElementById('hostellerCount').textContent = hostellers;
    document.getElementById('dayscholarCount').textContent = dayscholars;
}

// ===================================================
// ================= SEARCH FUNCTION =================
// ===================================================

function searchStudent() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.student-card');
    const rows = document.querySelectorAll('.student-row');
    let visibleCount = 0;
    
    // Filter cards
    cards.forEach(card => {
        const name = card.dataset.name;
        const rollno = card.dataset.rollno;
        
        if (name.includes(searchValue) || rollno.includes(searchValue)) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    
    // Filter table rows
    rows.forEach(row => {
        const name = row.dataset.name;
        const rollno = row.dataset.rollno;
        
        if (name.includes(searchValue) || rollno.includes(searchValue)) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });
    
    updateResultsCount();
}

// ===================================================
// ================= FILTER FUNCTIONS ================
// ===================================================

function filterByType() {
    const typeValue = document.getElementById('typeFilter').value;
    applyFilters();
}

function filterByCourse() {
    const courseValue = document.getElementById('courseFilter').value;
    applyFilters();
}

function applyFilters() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const typeValue = document.getElementById('typeFilter').value;
    const courseValue = document.getElementById('courseFilter').value;
    
    const cards = document.querySelectorAll('.student-card');
    const rows = document.querySelectorAll('.student-row');
    
    // Filter cards
    cards.forEach(card => {
        const name = card.dataset.name;
        const rollno = card.dataset.rollno;
        const type = card.dataset.type;
        const course = card.dataset.course;
        
        const matchesSearch = name.includes(searchValue) || rollno.includes(searchValue);
        const matchesType = typeValue === 'all' || type === typeValue;
        const matchesCourse = courseValue === 'all' || course === courseValue;
        
        if (matchesSearch && matchesType && matchesCourse) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
    
    // Filter table rows
    rows.forEach(row => {
        const name = row.dataset.name;
        const rollno = row.dataset.rollno;
        const type = row.dataset.type;
        const course = row.dataset.course;
        
        const matchesSearch = name.includes(searchValue) || rollno.includes(searchValue);
        const matchesType = typeValue === 'all' || type === typeValue;
        const matchesCourse = courseValue === 'all' || course === courseValue;
        
        if (matchesSearch && matchesType && matchesCourse) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });
    
    updateResultsCount();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('courseFilter').value = 'all';
    
    const cards = document.querySelectorAll('.student-card');
    const rows = document.querySelectorAll('.student-row');
    
    cards.forEach(card => card.classList.remove('hidden'));
    rows.forEach(row => row.classList.remove('hidden'));
    
    updateResultsCount();
}

function updateResultsCount() {
    const visibleCards = document.querySelectorAll('.student-card:not(.hidden)').length;
    document.getElementById('resultsCount').textContent = `Showing ${visibleCards} students`;
}

// ===================================================
// ================= VIEW TOGGLE =====================
// ===================================================

function setView(view) {
    const gridView = document.getElementById('gridView');
    const tableView = document.getElementById('tableView');
    const gridBtn = document.getElementById('gridViewBtn');
    const tableBtn = document.getElementById('tableViewBtn');
    
    if (view === 'grid') {
        gridView.style.display = 'grid';
        tableView.style.display = 'none';
        gridBtn.classList.add('active');
        tableBtn.classList.remove('active');
    } else {
        gridView.style.display = 'none';
        tableView.style.display = 'block';
        gridBtn.classList.remove('active');
        tableBtn.classList.add('active');
    }
}

// ===================================================
// ================= DELETE MODAL ====================
// ===================================================

function confirmDelete(rollNo, name) {
    const modal = document.getElementById('deleteModal');
    const studentNameEl = document.getElementById('deleteStudentName');
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    
    studentNameEl.textContent = name;
    confirmBtn.href = `/admin/students/delete/${rollNo}`;
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});