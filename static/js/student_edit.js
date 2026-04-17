// ===================================================
// ================= STUDENT EDIT JS =================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    setupFormValidation();
    trackChanges();
});

// ===================================================
// ================= FORM VALIDATION =================
// ===================================================

function setupFormValidation() {
    const form = document.getElementById('editForm');
    const submitBtn = document.getElementById('submitBtn');
    
    form.addEventListener('submit', function(e) {
        const name = document.getElementById('name').value.trim();
        const course = document.getElementById('course').value.trim();
        const year = document.getElementById('year').value;
        
        if (!name || !course || !year) {
            e.preventDefault();
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Saving...</span>';
    });
}

// ===================================================
// ================= TRACK CHANGES ===================
// ===================================================

let originalValues = {};

function trackChanges() {
    const inputs = document.querySelectorAll('input:not([disabled]), select');
    
    // Store original values
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked) {
                originalValues[input.name] = input.value;
            }
        } else {
            originalValues[input.name] = input.value;
        }
    });
    
    // Listen for changes
    inputs.forEach(input => {
        input.addEventListener('change', checkForChanges);
        input.addEventListener('input', checkForChanges);
    });
}

function checkForChanges() {
    const inputs = document.querySelectorAll('input:not([disabled]), select');
    const submitBtn = document.getElementById('submitBtn');
    let hasChanges = false;
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            if (input.checked && originalValues[input.name] !== input.value) {
                hasChanges = true;
            }
        } else {
            if (originalValues[input.name] !== input.value) {
                hasChanges = true;
            }
        }
    });
    
    if (hasChanges) {
        submitBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        submitBtn.innerHTML = '<span class="btn-icon">💾</span><span>Save Changes</span>';
    } else {
        submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        submitBtn.innerHTML = '<span class="btn-icon">✓</span><span>Save Changes</span>';
    }
}

// ===================================================
// ================= DELETE MODAL ====================
// ===================================================

function confirmDelete() {
    const modal = document.getElementById('deleteModal');
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

// ===================================================
// ================= NOTIFICATIONS ===================
// ===================================================

function showNotification(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const bgColor = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️';
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${bgColor};
        color: white;
        padding: 15px 30px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes slideDown {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    .btn-primary.loading {
        opacity: 0.7;
        pointer-events: none;
    }
`;
document.head.appendChild(style);