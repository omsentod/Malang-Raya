/* ==================================================
   GLOBAL BOOKMARK DRAWER & ROUTE MODAL CONTROLLER
   ================================================== */

(function() {
    // Helper: Currency formatting
    const fmtRpGlobal = n => {
        if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    };

    // Helper: Escape HTML attributes
    const escapeHtmlGlobal = str => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    // Global image fallback handler
    window.handleImgErrorRecom = window.handleImgErrorRecom || function (el, icon) {
        if (el.dataset.fallbackTriggered) return;
        el.dataset.fallbackTriggered = "true";
        const parent = el.parentNode;
        if (parent) {
            parent.innerHTML = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#94a3b8;">
                    <span class="material-symbols-outlined" style="font-size:24px;">${icon}</span>
                </div>
            `;
        }
    };

    // Global Drawer Update UI function
    window.updateBookmarkUI = function() {
        // Read bookmarks
        const mrayaKey = typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
        const bookmarkList = JSON.parse(localStorage.getItem(mrayaKey) || '[]');
        const count = bookmarkList.length;

        // Update badge counts in navbars
        const badge = document.getElementById('bookmark-badge-count');
        if (badge) badge.textContent = count;

        const mBadge = document.getElementById('mobile-bookmark-badge-count');
        if (mBadge) mBadge.textContent = count;

        // Render bookmarks inside drawer body
        const drawerBody = document.getElementById('bookmark-drawer-body');
        if (!drawerBody) return;

        if (count === 0) {
            drawerBody.innerHTML = `
                <div class="empty-drawer-state">
                    <span class="material-symbols-outlined" style="font-size:48px; color:var(--color-slate-300); margin-bottom:12px;">shopping_bag</span>
                    <p style="margin:0; color:var(--color-slate-400); font-size:14px; font-weight:500;">Belum ada rencana perjalanan yang disimpan.</p>
                    <p style="margin:4px 0 0; color:var(--color-slate-400); font-size:12px; text-align:center;">Gunakan alur kerja Explore untuk merancang rute perjalanan kustom Anda.</p>
                </div>
            `;
        } else {
            drawerBody.innerHTML = bookmarkList.map((plan, idx) => `
                <div class="bookmark-plan-card">
                    <button class="plan-delete-btn" data-idx="${idx}" title="Hapus Rencana">
                        <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                    </button>
                    <h4 class="plan-title">${plan.title}</h4>
                    <div class="plan-meta">
                        <span>👥 ${plan.persons} Orang</span>
                        <span>📅 ${plan.duration} Hari</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <span style="font-size:11px; color:var(--color-slate-400); font-weight:700;">ESTIMASI TOTAL BIAYA</span>
                        <span class="plan-price">${fmtRpGlobal(plan.totalCost)}</span>
                    </div>
                    <button class="plan-details-btn" data-idx="${idx}">
                        <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
                        <span>Detail & Rute Perjalanan</span>
                    </button>
                </div>
            `).join('');

            // Attach event listeners for delete button
            drawerBody.querySelectorAll('.plan-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.idx);
                    const mrayaKey = typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
                    const currentBookmarks = JSON.parse(localStorage.getItem(mrayaKey) || '[]');
                    currentBookmarks.splice(idx, 1);
                    localStorage.setItem(mrayaKey, JSON.stringify(currentBookmarks));
                    window.updateBookmarkUI();
                    
                    // If in dashboard, notify to re-render
                    if (window.renderDashboard) {
                        window.renderDashboard();
                    }
                });
            });

            // Attach event listeners for detail button
            drawerBody.querySelectorAll('.plan-details-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    const mrayaKey = typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
                    const currentBookmarks = JSON.parse(localStorage.getItem(mrayaKey) || '[]');
                    window.openBookmarkedPlanDetails(currentBookmarks[idx]);
                });
            });
        }
    };

    // Modal view for saved plan details
    window.openBookmarkedPlanDetails = function(plan) {
        const modal = document.getElementById('route-modal');
        const body = document.getElementById('modal-body-content');
        if (!modal || !body) return;

        let html = `
            <div style="text-align:left;">
                <div style="background:rgba(13,148,136,0.08); border:1.5px solid rgba(13,148,136,0.15); border-radius:16px; padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:var(--color-slate-800);">${plan.title}</h4>
                        <span style="font-size:12px; color:var(--color-slate-500); font-weight:600;">👥 ${plan.persons} Orang | 📅 ${plan.duration} Hari</span>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <span style="font-size:10px; color:var(--color-slate-400); font-weight:800; display:block; letter-spacing:0.5px;">ESTIMASI GABUNGAN</span>
                        <strong style="font-size:18px; color:var(--teal-700); font-weight:900;">${fmtRpGlobal(plan.totalCost)}</strong>
                    </div>
                </div>
        `;

        // Render Hotel same mode
        if (plan.hotelMode === 'same' || !plan.hotelMode) {
            if (plan.hotel) {
                const hFolder = plan.hotel.nama.trim().replace(/ /g, '_');
                html += `
                    <div style="font-weight: 800; font-size: 14.5px; color: var(--color-slate-800); margin-bottom: 12px; border-bottom: 1.5px solid var(--color-slate-100); padding-bottom: 6px;">🏨 Akomodasi Terpilih (Satu Hotel)</div>
                    <div class="pkg-item" style="margin-bottom:20px; border:1px solid var(--color-slate-200); border-radius:12px; padding:12px; display:flex; gap:12px; align-items:center; background:#fff;">
                        <div class="pkg-item-icon hotel-img-container" style="position:relative; overflow:hidden; width:80px; height:60px; border-radius:8px; flex-shrink:0;">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${plan.hotel.nama}" class="pkg-thumb-img" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="pkg-item-info">
                            <div class="pkg-item-cat" style="font-size:11px; font-weight:700; color:var(--color-primary); margin-bottom:2px;">Hotel / Homestay (${(plan.hotel.className || '').toUpperCase()})</div>
                            <div class="pkg-item-name" style="font-weight:800; font-size:13.5px; color:var(--color-slate-800);">${plan.hotel.nama}</div>
                            <div class="pkg-item-price" style="font-size:12px; color:var(--color-slate-500); font-weight:600;">${fmtRpGlobal(plan.hotel.harga)} <span style="font-size:10px;color:var(--color-slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Render split hotels night by night
            html += `<div style="font-weight: 800; font-size: 14.5px; color: var(--color-slate-800); margin-bottom: 12px; border-bottom: 1.5px solid var(--color-slate-100); padding-bottom: 6px;">🏨 Akomodasi Terpilih (Split Malam)</div>`;
            const nightKeys = Object.keys(plan.hotelsByNight || {});
            nightKeys.forEach(n => {
                const hot = plan.hotelsByNight[n];
                const hFolder = hot.nama.trim().replace(/ /g, '_');
                html += `
                    <div class="pkg-item" style="margin-bottom:10px; border:1px solid var(--color-slate-200); border-radius:12px; padding:10px; display:flex; gap:12px; align-items:center; background:#fff;">
                        <div class="pkg-item-icon hotel-img-container" style="position:relative; overflow:hidden; width:64px; height:48px; border-radius:6px; flex-shrink:0;">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${hot.nama}" class="pkg-thumb-img" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="pkg-item-info">
                            <div class="pkg-item-cat" style="font-size:10px; font-weight:700; color:var(--color-primary); margin-bottom:2px;">Hotel Malam ${n} (${(hot.className || '').toUpperCase()})</div>
                            <div class="pkg-item-name" style="font-weight:800; font-size:12.5px; color:var(--color-slate-800);">${hot.nama}</div>
                            <div class="pkg-item-price" style="font-size:11.5px; color:var(--color-slate-500); font-weight:600;">${fmtRpGlobal(hot.harga)} <span style="font-size:9.5px;color:var(--color-slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            });
        }

        html += `<div style="font-weight: 800; font-size: 14.5px; color: var(--color-slate-800); margin: 20px 0 12px; border-bottom: 1.5px solid var(--color-slate-100); padding-bottom: 6px;">📅 Rencana Perjalanan Harian</div>`;
        html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:24px;">`;

        (plan.days || []).forEach((day, dIdx) => {
            html += `
                <div style="background:#f8fafc; border:1.5px solid var(--color-slate-200); border-radius:14px; padding:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:11px; font-weight:800; color:var(--color-primary); letter-spacing:0.5px; text-transform:uppercase;">HARI ${day.day}</span>
                        <span class="pkg-badge ${day.className || ''}" style="font-size:9.5px; padding:2px 8px; border-radius:10px; font-weight:800; background:rgba(20,184,166,0.1); color:#0f766e;">${(day.className || 'OPTIMAL').toUpperCase()}</span>
                    </div>
                    <div style="font-size:14px; font-weight:800; color:var(--color-slate-800); margin-bottom:4px; text-align:left;">🌲 Wisata: ${day.wisata}</div>
                    <div style="font-size:12.5px; font-weight:600; color:var(--color-slate-500); margin-bottom:6px; text-align:left;">🍜 Makan: ${day.kuliner}</div>
            `;

            // If the plan has exact leg distances calculated
            if (plan.legs && plan.legs.length > 0) {
                const dayLegs = plan.legs.slice(dIdx * 3, dIdx * 3 + 3);
                if (dayLegs.length > 0) {
                    html += `
                        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--color-slate-200);">
                            <div style="font-size:10px; font-weight:800; color:var(--color-slate-400); margin-bottom:4px; letter-spacing:0.5px;">RUTE SPASIAL HARIAN:</div>
                    `;
                    dayLegs.forEach(leg => {
                        html += `
                            <div class="recap-dist-row">
                                <span class="material-symbols-outlined">directions_car</span>
                                <span style="font-size:11.5px; font-weight:600; color:var(--color-slate-600);">${leg.from} → ${leg.to} <strong style="color:var(--color-primary); margin-left:4px;">(${leg.distance?.toFixed(1) || '?'} km)</strong></span>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
            }

            html += `</div>`;
        });

        html += `</div>`;

        // Multi-point Google Maps URL
        let origin = plan.hotel ? plan.hotel.nama : (plan.days && plan.days[0] ? plan.days[0].wisata : "");
        if (plan.hotelMode === 'split' && plan.hotelsByNight && plan.hotelsByNight[1]) {
            origin = plan.hotelsByNight[1].nama;
        }

        let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}`;
        if (plan.days && plan.days.length > 0) {
            let waypoints = plan.days.map(d => `${d.wisata}|${d.kuliner}`).join('|');
            mapsUrl += `&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
        }

        html += `
            <a href="${mapsUrl}" target="_blank" class="gmaps-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:var(--color-primary); color:#fff; text-decoration:none; padding:14px; border-radius:12px; font-weight:800; text-align:center; box-shadow:0 4px 12px rgba(0,101,101,0.3); transition:all 0.2s;">
                <span class="material-symbols-outlined">map</span>
                Buka Rute Lengkap di Google Maps
            </a>
            <button id="print-custom-pdf-btn-global" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:var(--color-slate-800); color:#fff; border:none; padding:14px; border-radius:12px; font-weight:800; text-align:center; margin-top:12px; cursor:pointer; box-shadow:0 4px 12px rgba(30,41,59,0.3); transition:all 0.2s;">
                <span class="material-symbols-outlined">print</span>
                Cetak / Simpan PDF Rencana
            </button>
            </div>
        `;

        body.innerHTML = html;
        modal.classList.add('show');

        // Attach click listener for printing PDF
        document.getElementById('print-custom-pdf-btn-global')?.addEventListener('click', () => {
            window.print();
        });
    };

    // Attach listeners on DOM Load
    document.addEventListener('DOMContentLoaded', () => {
        // Toggle Drawer open
        document.querySelectorAll('#nav-bookmark-btn, #mobile-nav-bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('bookmark-drawer')?.classList.add('open');
                document.getElementById('bookmark-drawer-overlay')?.classList.add('open');
            });
        });

        // Toggle Drawer close
        document.getElementById('drawer-close-btn')?.addEventListener('click', () => {
            document.getElementById('bookmark-drawer')?.classList.remove('open');
            document.getElementById('bookmark-drawer-overlay')?.classList.remove('open');
        });

        document.getElementById('bookmark-drawer-overlay')?.addEventListener('click', () => {
            document.getElementById('bookmark-drawer')?.classList.remove('open');
            document.getElementById('bookmark-drawer-overlay')?.classList.remove('open');
        });

        // Modal close
        const routeModal = document.getElementById('route-modal');
        const modalCloseBtn = document.getElementById('modal-close-btn-global');

        const closeModal = () => {
            routeModal?.classList.remove('show');
        };

        modalCloseBtn?.addEventListener('click', closeModal);
        routeModal?.addEventListener('click', (e) => {
            if (e.target === routeModal) closeModal();
        });

        // Initialize UI Badge count and content
        window.updateBookmarkUI();
    });
})();
