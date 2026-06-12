/* ==================================================
   GLOBAL AUTHENTICATION & SESSION CONTROLLER (AJAX)
   ================================================== */

(function() {
    // Helper function for user-specific localStorage keys
    window.getSavedPlacesKey = function() {
        return window.currentUser ? 'saved_places_' + window.currentUser.id : 'saved_places_guest';
    };
    window.getTravelNotesKey = function() {
        return window.currentUser ? 'travel_notes_' + window.currentUser.id : 'travel_notes_guest';
    };
    window.getMrayaBookmarksKey = function() {
        return window.currentUser ? 'mraya_bookmarks_' + window.currentUser.id : 'mraya_bookmarks_guest';
    };
    window.getTargetBudgetKey = function() {
        return window.currentUser ? 'mraya_target_budget_' + window.currentUser.id : 'mraya_target_budget_guest';
    };

    // Helper: Get avatar URL based on preset seed or custom URL
    window.getAvatarUrl = function(seed) {
        if (!seed) return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix';
        if (seed.startsWith('http') || seed.startsWith('/')) return seed;
        
        // Premium traveler presets mapped to Dicebear seeds
        const presets = {
            'explorer': 'Felix',
            'nature': 'Aneka',
            'culinary': 'Buster',
            'heritage': 'Charlie',
            'luxury': 'Missy'
        };
        const mappedSeed = presets[seed.toLowerCase()] || seed;
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${mappedSeed}`;
    };

    // Helper: Get first name only
    const getFirstName = name => {
        if (!name) return 'User';
        return name.split(' ')[0];
    };

    // Global check session function
    window.checkGlobalAuth = function() {
        fetch('/api/auth/status')
            .then(res => res.json())
            .then(data => {
                const container = document.getElementById('nav-profile-container');
                const mobileMenu = document.getElementById('mobile-menu');
                if (!container) return;

                if (data.logged_in) {
                    window.currentUser = data.user;

                    // 1. RENDER DESKTOP NAVBAR PROFILE BADGE & DROPDOWN
                    container.innerHTML = `
                        <div class="g-nav-profile-container">
                            <div class="g-profile-badge" id="g-profile-badge">
                                <img src="${window.getAvatarUrl(data.user.avatar)}" class="g-profile-avatar" alt="${escapeHtml(data.user.name)}" />
                                <span class="g-profile-name">${escapeHtml(getFirstName(data.user.name))}</span>
                            </div>
                            <div class="g-profile-dropdown" id="g-profile-dropdown">
                                ${data.user.role === 'admin' ? `
                                <a class="g-profile-dropdown-item admin-link" href="/admin" style="border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: 600; color: #fb7185;">
                                    <span class="material-symbols-outlined" style="color: #fb7185;">admin_panel_settings</span>
                                    <span>Panel Admin</span>
                                </a>
                                ` : ''}
                                <a class="g-profile-dropdown-item" href="/dashboard">
                                    <span class="material-symbols-outlined">dashboard</span>
                                    <span>Dashboard Saya</span>
                                </a>
                                <a class="g-profile-dropdown-item" href="/dashboard#edit-profile" id="dropdown-edit-profile-btn">
                                    <span class="material-symbols-outlined">edit_square</span>
                                    <span>Edit Profil</span>
                                </a>
                                <div class="g-profile-dropdown-item logout" id="dropdown-logout-btn">
                                    <span class="material-symbols-outlined">logout</span>
                                    <span>Keluar Akun</span>
                                </div>
                            </div>
                        </div>
                    `;

                    // 2. CLEAN UP MOBILE MENU FROM AUTH ELEMENTS
                    if (mobileMenu) {
                        mobileMenu.querySelector('.mobile-profile-section')?.remove();
                        mobileMenu.querySelector('.mobile-logout-link')?.remove();
                        mobileMenu.querySelector('#mobile-login-trigger')?.remove();
                    }

                    // Attach desktop dropdown toggling
                    const badge = document.getElementById('g-profile-badge');
                    const dropdown = document.getElementById('g-profile-dropdown');
                    if (badge && dropdown) {
                        badge.addEventListener('click', (e) => {
                            e.stopPropagation();
                            dropdown.classList.toggle('open');
                        });
                        document.addEventListener('click', () => dropdown.classList.remove('open'));
                    }

                    // Attach logout button
                    document.getElementById('dropdown-logout-btn')?.addEventListener('click', handleLogoutAction);

                    // Trigger edit profile tab link binding
                    document.getElementById('dropdown-edit-profile-btn')?.addEventListener('click', (e) => {
                        if (window.location.pathname === '/dashboard') {
                            e.preventDefault();
                            document.getElementById('g-profile-dropdown')?.classList.remove('open');
                            const editTabBtn = document.querySelector('.dash-tab-btn[data-tab="tab-profile"]');
                            if (editTabBtn) editTabBtn.click();
                        }
                    });

                } else {
                    window.currentUser = null;

                    // 1. RENDER DESKTOP GUEST LOGIN TRIGGER
                    container.innerHTML = `
                        <button class="g-nav-btn" id="nav-login-trigger" style="margin-left: 10px;">Masuk</button>
                    `;

                    // 2. CLEAN UP MOBILE MENU FROM AUTH ELEMENTS
                    if (mobileMenu) {
                        mobileMenu.querySelector('.mobile-profile-section')?.remove();
                        mobileMenu.querySelector('.mobile-logout-link')?.remove();
                        mobileMenu.querySelector('#mobile-login-trigger')?.remove();
                    }

                    // Attach click modal opening
                    document.getElementById('nav-login-trigger')?.addEventListener('click', openAuthModal);
                }

                // Update badge and profile UI
                if (typeof window.updateNavbarBookmarkBadge === 'function') {
                    window.updateNavbarBookmarkBadge();
                }
                if (typeof window.updateBookmarkUI === 'function') {
                    window.updateBookmarkUI();
                }
                if (window.updateDashboardProfileUI) {
                    window.updateDashboardProfileUI();
                }
            })
            .catch(err => console.error("Error checking auth status:", err));
    };

    // Logout handling
    function handleLogoutAction() {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // If on dashboard, redirect to home
                if (window.location.pathname === '/dashboard') {
                    window.location.href = '/';
                } else {
                    window.checkGlobalAuth();
                }
            }
        })
        .catch(err => console.error("Error during logout:", err));
    }

    // Modal open/close helpers
    function openAuthModal() {
        const overlay = document.getElementById('auth-modal-overlay');
        overlay?.classList.add('open');
        hideAuthError();
    }
    window.openAuthModal = openAuthModal;

    window.closeAuthModal = function() {
        const overlay = document.getElementById('auth-modal-overlay');
        overlay?.classList.remove('open');
    };

    // Error list renderers
    function showAuthError(errors) {
        const box = document.getElementById('auth-error-box');
        const list = document.getElementById('auth-error-list');
        if (!box || !list) return;

        list.innerHTML = errors.map(err => `<li>${escapeHtml(err)}</li>`).join('');
        box.style.display = 'flex';
    }

    function hideAuthError() {
        const box = document.getElementById('auth-error-box');
        if (box) box.style.display = 'none';
    }

    // Helpers
    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // DOM Setup
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('auth-modal-overlay');
        const closeBtn = document.getElementById('auth-modal-close-btn');

        // Close modal triggers
        closeBtn?.addEventListener('click', window.closeAuthModal);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) window.closeAuthModal();
        });

        // Auth Tabs Switching logic
        const tabs = document.querySelectorAll('.auth-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const contentId = tab.dataset.tab;
                document.querySelectorAll('.auth-tab-content').forEach(c => c.style.display = 'none');
                const targetContent = document.getElementById(contentId);
                if (targetContent) targetContent.style.display = 'block';

                hideAuthError();
            });
        });

        // Form Submit: AJAX Login
        document.getElementById('ajax-login-form')?.addEventListener('submit', function(e) {
            e.preventDefault();
            hideAuthError();

            const formData = new FormData(this);
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(async res => {
                const data = await res.json();
                if (res.ok && data.success) {
                    window.closeAuthModal();
                    window.checkGlobalAuth();
                    
                    // If on dashboard, reload page to load MySQL user details
                    if (window.location.pathname === '/dashboard') {
                        window.location.reload();
                    }
                } else {
                    showAuthError(data.errors || ['Gagal melakukan login.']);
                }
            })
            .catch(err => {
                console.error("Login request error:", err);
                showAuthError(['Terjadi kesalahan koneksi server.']);
            });
        });

        // Form Submit: AJAX Register
        document.getElementById('ajax-register-form')?.addEventListener('submit', function(e) {
            e.preventDefault();
            hideAuthError();

            const formData = new FormData(this);
            fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'Accept': 'application/json'
                },
                body: formData
            })
            .then(async res => {
                const data = await res.json();
                if (res.ok && data.success) {
                    window.closeAuthModal();
                    window.checkGlobalAuth();
                    
                    // If on dashboard, reload
                    if (window.location.pathname === '/dashboard') {
                        window.location.reload();
                    }
                } else {
                    showAuthError(data.errors || ['Gagal membuat akun.']);
                }
            })
            .catch(err => {
                console.error("Register request error:", err);
                showAuthError(['Terjadi kesalahan koneksi server.']);
            });
        });

        // Initial status load
        window.checkGlobalAuth();
    });
})();
