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
        let mapsUrl = "";
        let routeStops = [];
        let routeCoords = [];
        if (plan.legs && plan.legs.length > 0) {
            const resolvedStops = plan.legs.map(leg => leg.from);
            const resolvedCoords = plan.legs.map(leg => leg.from_coords);
            resolvedStops.push(plan.legs[plan.legs.length - 1].to);
            resolvedCoords.push(plan.legs[plan.legs.length - 1].to_coords);
            
            resolvedStops.forEach((name, idx) => {
                const cleanName = name ? name.trim() : "";
                const coord = resolvedCoords[idx];
                if (cleanName && cleanName !== 'N/A' && cleanName !== 'Checkout' && coord) {
                    if (routeStops.length === 0 || routeStops[routeStops.length - 1] !== cleanName) {
                        routeStops.push(cleanName);
                        routeCoords.push(coord);
                    }
                }
            });
        }

        if (routeCoords.length >= 2) {
            const originSearch = routeCoords[0];
            const destName = routeCoords[routeCoords.length - 1];
            const waypointsNames = routeCoords.slice(1, -1).join('|');
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originSearch)}&destination=${encodeURIComponent(destName)}&waypoints=${encodeURIComponent(waypointsNames)}&travelmode=driving`;
        } else {
            // Fallback ke logika lama jika legs tidak tersedia
            let origin = plan.hotel ? plan.hotel.nama : (plan.days && plan.days[0] ? plan.days[0].wisata : "");
            if (plan.hotelMode === 'split' && plan.hotelsByNight && plan.hotelsByNight[1]) {
                origin = plan.hotelsByNight[1].nama;
            }
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}`;
            if (plan.days && plan.days.length > 0) {
                let waypoints = plan.days.map(d => `${d.wisata}|${d.kuliner}`).join('|');
                mapsUrl += `&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
            }
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
            if (typeof printPlanToPDF === 'function') {
                printPlanToPDF(plan);
            } else {
                printPlanToPDFGlobal(plan);
            }
        });
    };

    // Helper function to render a print-optimized travel itinerary window and trigger browser print dialog
    function printPlanToPDFGlobal(plan) {
        const persons = plan.persons;
        const duration = plan.duration;
        const nights = duration - 1;
        const fmtRp = fmtRpGlobal;

        let accommodationHTML = '';
        if (plan.hotelMode === 'same' || !plan.hotelMode) {
            if (plan.hotel) {
                accommodationHTML = `
                    <div class="section-title">🏨 Akomodasi Terpilih (Satu Hotel)</div>
                    <div class="item-card">
                        <div class="item-info">
                            <div class="item-cat">Hotel / Homestay (${(plan.hotel.className || '').toUpperCase()})</div>
                            <div class="item-name">${plan.hotel.nama}</div>
                            <div class="item-price">Tarif: ${fmtRp(plan.hotel.harga)} /malam | Durasi: ${nights} Malam | Kamar: ${Math.ceil(persons / 2)} Kamar</div>
                            <div style="font-weight:700; margin-top:4px; color:#0f766e;">Subtotal Akomodasi: ${fmtRp(plan.hotel.cost || (plan.hotel.harga * nights * Math.ceil(persons / 2)))}</div>
                        </div>
                    </div>
                `;
            }
        } else {
            accommodationHTML = `<div class="section-title">🏨 Akomodasi Terpilih (Ganti Hotel Tiap Malam)</div>`;
            const nightKeys = Object.keys(plan.hotelsByNight || {});
            nightKeys.forEach(n => {
                const hot = plan.hotelsByNight[n];
                accommodationHTML += `
                    <div class="item-card">
                        <div class="item-info">
                            <div class="item-cat">Hotel Malam ${n} (${(hot.className || '').toUpperCase()})</div>
                            <div class="item-name">${hot.nama}</div>
                            <div class="item-price">Tarif: ${fmtRp(hot.harga)} /malam | Kamar: ${Math.ceil(persons / 2)} Kamar</div>
                            <div style="font-weight:700; margin-top:4px; color:#0f766e;">Total Malam Ini: ${fmtRp(hot.cost || (hot.harga * Math.ceil(persons / 2)))}</div>
                        </div>
                    </div>
                `;
            });
        }

        let itineraryHTML = '';
        (plan.days || []).forEach((day, dIdx) => {
            const dayWisataCost = (day.day === 1) ? day.wisata_harga * persons : 0;
            const dayKulinerCost = ((day.kuliner_harga || 0) + (day.kuliner_malam_harga || 0)) * persons;
            const dayTransportCost = plan.transportCost ? Math.round(plan.transportCost / duration) : 0;
            const daySubtotal = dayWisataCost + dayKulinerCost + dayTransportCost;

            itineraryHTML += `
                <div class="day-card">
                    <div class="day-header">
                        <span class="day-title">HARI ${day.day} (${(day.className || '').toUpperCase()})</span>
                        <span class="day-badge">${day.className || ''}</span>
                    </div>
                    <div class="day-wisata">🌲 Wisata: ${day.wisata} <span style="font-weight:600; font-size:12px; color:#64748b;">(Tiket: ${day.day === 1 ? fmtRp(day.wisata_harga) + '/org' : 'Gratis (Sudah di Hari 1)'})</span></div>
                    <div class="day-kuliner">☀️ Makan Siang: ${day.kuliner} <span style="font-weight:600; font-size:12px; color:#64748b;">(Harga: ${fmtRp(day.kuliner_harga)} /org)</span></div>
                    <div class="day-kuliner" style="margin-top:2px;">🌙 Makan Malam: ${day.kuliner_malam || 'N/A'} <span style="font-weight:600; font-size:12px; color:#64748b;">(Harga: ${fmtRp(day.kuliner_malam_harga || 0)} /org)</span></div>
            `;

            if (plan.legs && plan.legs.length > 0) {
                const isOneDay = plan.duration === 1;
                const legsPerDay = isOneDay ? 2 : 4;
                const dayLegs = plan.legs.slice(dIdx * legsPerDay, dIdx * legsPerDay + legsPerDay);
                if (dayLegs.length > 0) {
                    itineraryHTML += `<div style="margin-top:12px; padding-top:8px; border-top:1px dashed #cbd5e1;">`;
                    dayLegs.forEach(leg => {
                        itineraryHTML += `
                            <div class="leg-row">
                                <span style="font-size:14px;">🚗</span>
                                <span>${leg.from} &rarr; ${leg.to} <strong>(${leg.distance?.toFixed(1) || '?'} km)</strong></span>
                            </div>
                        `;
                    });
                    itineraryHTML += `</div>`;
                }
            }

            itineraryHTML += `
                    <div style="margin-top:10px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:12px; display:flex; justify-content:space-between; font-weight:700; color:#475569;">
                        <span>Subtotal Wisata, Makan & Transport Hari ${day.day}:</span>
                        <span style="color:#0f766e;">${fmtRp(daySubtotal)}</span>
                    </div>
                </div>
            `;
        });

        const printWin = window.open('', '_blank', 'width=850,height=900');
        if (!printWin) {
            alert("Popup blocked! Silakan izinkan browser membuka pop-up untuk mencetak PDF.");
            return;
        }

        printWin.document.write(`
            <html>
            <head>
                <title>${plan.title}</title>
                <style>
                    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background: #fff; }
                    .header { background: #0f766e; color: #fff; padding: 24px; border-radius: 12px; margin-bottom: 30px; }
                    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
                    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
                    .section-title { font-size: 16px; font-weight: 800; color: #0f766e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin: 30px 0 16px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .item-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; display: flex; gap: 16px; align-items: center; margin-bottom: 12px; background: #fff; page-break-inside: avoid; }
                    .item-info { flex: 1; }
                    .item-cat { font-size: 11px; font-weight: 700; color: #0d9488; text-transform: uppercase; margin-bottom: 4px; }
                    .item-name { font-size: 15px; font-weight: 800; margin: 2px 0 4px; color: #0f172a; }
                    .item-price { font-size: 12.5px; color: #475569; }
                    .day-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; background: #f8fafc; margin-bottom: 16px; page-break-inside: avoid; }
                    .day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
                    .day-title { font-size: 13.5px; font-weight: 800; color: #0f766e; letter-spacing: 0.5px; }
                    .day-badge { background: #cbd5e1; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
                    .day-wisata { font-size: 14.5px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
                    .day-kuliner { font-size: 13.5px; font-weight: 700; color: #475569; }
                    .leg-row { font-size: 11.5px; color: #0f766e; font-style: italic; display: flex; align-items: center; gap: 6px; margin-top: 6px; }
                    .total-row { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 20px; border-radius: 12px; font-weight: 800; font-size: 16px; border: 1.5px solid #cbd5e1; margin-top: 30px; page-break-inside: avoid; }
                    @media print {
                        body { padding: 0; font-size: 12px; }
                        .header { border-radius: 0; box-shadow: none; border: 1px solid #0f766e; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Laporan Rencana Perjalanan Wisata</h1>
                    <p>Hasil Kustomisasi Mandiri — Malang Raya Spatiotemporal Planner</p>
                    <div style="margin-top: 14px; font-size: 13.5px; opacity:0.95; font-weight:600;">
                        👥 Jumlah Peserta: ${persons} Orang | 📅 Durasi Perjalanan: ${duration} Hari | 🚗 Transportasi: ${plan.vehDesc || 'N/A'}
                    </div>
                </div>

                ${accommodationHTML}

                <div class="section-title">📅 Rincian Rencana Perjalanan Harian</div>
                ${itineraryHTML}

                <div class="section-title">🚗 Biaya Transportasi & Jarak Spasial</div>
                <div class="item-card">
                    <div class="item-info">
                        <div class="item-cat">Transportasi Darat (${plan.vehDesc || 'N/A'})</div>
                        <div class="item-name">Total Jarak Tempuh Spasial: ${(plan.totalDistance || 0).toFixed(1)} km</div>
                        <div class="item-price">Menggunakan tarif transportasi kustom: ${fmtRp(plan.transportCost || 0)}</div>
                    </div>
                </div>

                <div class="total-row">
                    <span>ESTIMASI GABUNGAN BIAYA RUTE KUSTOM:</span>
                    <span style="color:#0f766e; font-size:22px; font-weight:900;">${fmtRp(plan.totalCost)}</span>
                </div>

                <script>
                    setTimeout(function() {
                        window.print();
                    }, 500);
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    }


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
