/* ==================================================
   DASHBOARD JS — Scroll animations, budget bars
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
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── Animated Budget Bars ──
    const budgetObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const items = entry.target.querySelectorAll('.budget-item');
                items.forEach((item, i) => {
                    const pct = item.getAttribute('data-pct');
                    const fill = item.querySelector('.budget-fill');
                    if (fill && pct) {
                        setTimeout(() => {
                            fill.style.width = pct + '%';
                        }, i * 180);
                    }
                });
                budgetObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    const budgetList = document.querySelector('.budget-list');
    if (budgetList) budgetObserver.observe(budgetList.closest('.sidebar-widget'));

    // ── Navbar scroll shadow ──
    const navbar = document.querySelector('.g-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 60
                ? '0 4px 24px rgba(0,0,0,0.1)'
                : '';
        }, { passive: true });
    }
});
