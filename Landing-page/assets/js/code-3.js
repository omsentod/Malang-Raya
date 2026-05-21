// assets/js/code-3.js
// Custom JavaScript for code-3.html

document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth scrolling for internal navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if(targetId === '#') return; // Skip top-level #
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    console.log("code-3.js loaded successfully.");
});
