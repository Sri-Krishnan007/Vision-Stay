// ===================================================
// ================= STUDENT ADD JS ==================
// ===================================================

document.addEventListener('DOMContentLoaded', function() {
    setupFormValidation();
});

// ===================================================
// ================= PHOTO PREVIEW ===================
// ===================================================

function previewPhoto(input) {
    const preview = document.getElementById('photoPreview');
    const fileName = document.getElementById('fileName');
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            input.value = '';
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.style.borderStyle = 'solid';
            preview.style.borderColor = '#10b981';
        };
        
        reader.readAsDataURL(file);
        fileName.textContent = file.name;
        fileName.style.color = '#10b981';
    }
}

// ===================================================
// ================= FORM VALIDATION =================
// ===================================================

function setupFormValidation() {
    const form = document.getElementById('studentForm');
    const submitBtn = document.getElementById('submitBtn');
    
    form.addEventListener('submit', function(e) {
        // Basic validation
        const rollNo = document.getElementById('roll_no').value.trim();
        const name = document.getElementById('name').value.trim();
        const course = document.getElementById('course').value.trim();
        const year = document.getElementById('year').value;
        const photo = document.getElementById('photoInput').files[0];
        
        if (!rollNo || !name || !course || !year || !photo) {
            e.preventDefault();
            showError('Please fill in all required fields');
            return;
        }
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Adding Student...</span>';
    });
    
    // Real-time validation feedback
    const inputs = form.querySelectorAll('input[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
}

function validateField(field) {
    if (field.value.trim() === '') {
        field.classList.add('error');
        field.style.borderColor = '#ef4444';
    } else {
        field.classList.remove('error');
        field.style.borderColor = '#10b981';
    }
}

function showError(message) {
    // Create error toast
    const existingToast = document.querySelector('.error-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.innerHTML = `
        <span class="toast-icon">⚠️</span>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
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
`;
document.head.appendChild(style);