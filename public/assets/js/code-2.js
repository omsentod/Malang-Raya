/* ==================================================
   LANDING PAGE JS — Scroll animations, navbar, chart bars
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ── Hamburger Toggle ──
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            const icon = hamburger.querySelector('.material-symbols-outlined');
            icon.textContent = mobileMenu.classList.contains('open') ? 'close' : 'menu';
        });
    }

    // ── Scroll Reveal ──
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── Animated Bar Charts ──
    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const fills = entry.target.querySelectorAll('.bar-fill');
                const items = entry.target.querySelectorAll('.bar-item');
                items.forEach((item, i) => {
                    const val = item.getAttribute('data-value');
                    const fill = item.querySelector('.bar-fill');
                    if (fill && val) {
                        setTimeout(() => {
                            fill.style.width = val + '%';
                        }, i * 180);
                    }
                });
                barObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    const chartArea = document.querySelector('.chart-bars');
    if (chartArea) barObserver.observe(chartArea);

    // ── Navbar Scroll Effect ──
    const navbar = document.querySelector('.g-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)';
            } else {
                navbar.style.boxShadow = '';
            }
        }, { passive: true });
    }

    // ── Hero Parallax (subtle) ──
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
        }, { passive: true });
    }
});
