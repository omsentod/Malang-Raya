/* ==================================================
   HOW IT WORKS JS — Animations & Scroll effects
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── Animated Data Bars ──
    const barObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('.hiw-bar-item');
                items.forEach((item, i) => {
                    const val = item.getAttribute('data-value');
                    const fill = item.querySelector('.hiw-bar-fill');
                    if (fill && val) {
                        setTimeout(() => {
                            fill.style.width = val + '%';
                        }, i * 150);
                    }
                });
                barObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    const barsWrapper = document.querySelector('.hiw-bars');
    if (barsWrapper) barObserver.observe(barsWrapper);

    // ── Navbar scroll effect ──
    const navbar = document.querySelector('.g-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 60
                ? '0 4px 24px rgba(0,0,0,0.3)'
                : '';
        }, { passive: true });
    }
});
