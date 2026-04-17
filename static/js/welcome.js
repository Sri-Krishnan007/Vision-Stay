// ==================== DOM ELEMENTS ====================
const heroSection = document.getElementById('heroSection');
const loginSection = document.getElementById('loginSection');
const showLoginBtn = document.getElementById('showLoginBtn');
const autoMsg = document.getElementById('autoMsg');
const msgText = document.getElementById('msgText');
const adminBox = document.getElementById('adminBox');
const studentBox = document.getElementById('studentBox');
const adminBtn = document.getElementById('adminBtn');
const studentBtn = document.getElementById('studentBtn');
const backBtn = document.getElementById('backBtn');
const tagline = document.getElementById('tagline');
const particles = document.getElementById('particles');

// ==================== CONFIGURATION ====================
const taglineText = "AI-Powered Hostel Attendance & Security System";
const countdownStart = 5;
let countdown = countdownStart;
let timer;

// ==================== PARTICLE SYSTEM ====================
function createParticles() {
    const particleCount = window.innerWidth < 768 ? 25 : 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particle.style.width = (2 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;
        particles.appendChild(particle);
    }
}

// ==================== TYPING EFFECT ====================
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// ==================== COUNTDOWN TIMER ====================
function startCountdown() {
    updateMessage();
    
    timer = setInterval(() => {
        countdown--;
        updateMessage();
        
        if (countdown <= 0) {
            clearInterval(timer);
            showLogin();
        }
    }, 1000);
}

function updateMessage() {
    const icon = autoMsg.querySelector('i');
    
    if (countdown > 0) {
        icon.className = 'fas fa-hourglass-half';
        msgText.innerHTML = `Login portal opens in <strong>${countdown}</strong> second${countdown !== 1 ? 's' : ''}...`;
    } else {
        icon.className = 'fas fa-check-circle';
        msgText.innerHTML = 'Ready! Select your login type below';
    }
}

// ==================== VIEW TRANSITIONS ====================
function showLogin() {
    clearInterval(timer);
    
    heroSection.style.animation = 'fadeOut 0.4s ease-out forwards';
    
    setTimeout(() => {
        heroSection.classList.add('hidden');
        loginSection.classList.add('active');
        loginSection.style.animation = 'fadeInUp 0.5s ease-out';
    }, 400);
}

function goBack() {
    loginSection.style.animation = 'fadeOut 0.4s ease-out forwards';
    
    setTimeout(() => {
        loginSection.classList.remove('active');
        heroSection.classList.remove('hidden');
        heroSection.style.animation = 'fadeInUp 0.5s ease-out';
        
        // Reset forms
        adminBox.classList.remove('active');
        studentBox.classList.remove('active');
        adminBtn.classList.remove('active');
        studentBtn.classList.remove('active');
        
        // Reset countdown
        countdown = countdownStart;
        startCountdown();
    }, 400);
}

// ==================== ROLE SWITCHING ====================
function showAdmin() {
    adminBox.classList.add('active');
    studentBox.classList.remove('active');
    adminBtn.classList.add('active');
    studentBtn.classList.remove('active');
    
    // Focus first input
    setTimeout(() => {
        adminBox.querySelector('input[name="username"]').focus();
    }, 100);
}

function showStudent() {
    studentBox.classList.add('active');
    adminBox.classList.remove('active');
    studentBtn.classList.add('active');
    adminBtn.classList.remove('active');
    
    // Focus first input
    setTimeout(() => {
        studentBox.querySelector('input[name="username"]').focus();
    }, 100);
}

// ==================== INPUT ANIMATIONS ====================
function setupInputAnimations() {
    const inputs = document.querySelectorAll('.input-group input');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('focused');
        });
    });
}

// ==================== FORM SUBMISSION EFFECTS ====================
function setupFormEffects() {
    const forms = document.querySelectorAll('.login-box');
    
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const btn = form.querySelector('.submit-btn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Authenticating...</span>';
            btn.disabled = true;
        });
    });
}

// ==================== FADE OUT ANIMATION ====================
const fadeOutKeyframes = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
const styleSheet = document.createElement('style');
styleSheet.textContent = fadeOutKeyframes;
document.head.appendChild(styleSheet);

// ==================== BUTTON CLICK HANDLER ====================
showLoginBtn.addEventListener('click', showLogin);

// ==================== KEYBOARD NAVIGATION ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginSection.classList.contains('active')) {
        goBack();
    }
    
    if (e.key === 'Enter' && !loginSection.classList.contains('active')) {
        showLogin();
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Create particles
    createParticles();
    
    // Typing effect for tagline
    setTimeout(() => {
        typeWriter(tagline, taglineText, 40);
    }, 500);
    
    // Start countdown
    startCountdown();
    
    // Setup interactions
    setupInputAnimations();
    setupFormEffects();
});

// ==================== WINDOW RESIZE HANDLER ====================
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Rebuild particles on resize
        particles.innerHTML = '';
        createParticles();
    }, 250);
});