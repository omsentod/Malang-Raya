// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        
        e.preventDefault();
        const targetElement = document.querySelector(href);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
            // Close mobile menu if open
            const mobileMenu = document.getElementById('mobile-menu');
            if(mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        }
    });
});

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});

// Header transparency/shadow on scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('header') || document.querySelector('nav');
    if (header && window.scrollY > 20) {
        header.classList.add('shadow-md');
        if(header.tagName.toLowerCase() === 'nav') {
           header.classList.add('shadow-sm');
        }
    } else if (header) {
        header.classList.remove('shadow-md');
        if(header.tagName.toLowerCase() === 'nav') {
           header.classList.remove('shadow-sm');
        }
    }
});
