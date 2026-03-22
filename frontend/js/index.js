// ==========================================
// Landing Page JavaScript
// ==========================================

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuPanel = document.getElementById('mobileMenuPanel');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

if (mobileMenuBtn && mobileMenuPanel && mobileMenuOverlay) {
    let menuOpen = false;

    function openMenu() {
        menuOpen = true;
        mobileMenuPanel.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
    }

    function closeMenu() {
        menuOpen = false;
        mobileMenuPanel.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }

    // Toggle menu on button click
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (menuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close menu on overlay click
    mobileMenuOverlay.addEventListener('click', closeMenu);

    // Close menu when a link is clicked
    mobileMenuPanel.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.stopPropagation();
            closeMenu();
        });
    });

    // Close menu when button in menu is clicked
    mobileMenuPanel.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeMenu();
        });
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add fade-in animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeIn 0.6s ease-in forwards';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .step').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
