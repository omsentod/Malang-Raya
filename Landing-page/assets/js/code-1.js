// assets/js/code-1.js
// Custom JavaScript for code-1.html

document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth scrolling for internal navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if(link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                if(targetId === '#') return; // Skip top-level #
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // 2. Add subtle parallax effect to decorative blob in Hero
    const blob = document.querySelector('.decorative-blob');
    if (blob) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            blob.style.transform = `translateY(${scrollY * 0.2}px)`;
        });
    }

    console.log("code-1.js loaded successfully.");
});
