/* ==================================================
   DASHBOARD JS — Dynamic LocalStorage Bookmarks,
   Bento Box Details, Interactive Budget Calculator,
   and Detail Slide Modals.
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────────────
    // Hamburger & Navbar Shadows
    // ─────────────────────────────────────────────────
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            const icon = hamburger.querySelector('.material-symbols-outlined');
            icon.textContent = mobileMenu.classList.contains('open') ? 'close' : 'menu';
        });
    }

    const navbar = document.querySelector('.g-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 60
                ? '0 4px 24px rgba(0,0,0,0.1)'
                : '';
        }, { passive: true });
    }

    // ─────────────────────────────────────────────────
    // Scroll Reveal Intersection Observer
    // ─────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ─────────────────────────────────────────────────
    // GLOBAL BOOKMARK ENGINE (LocalStorage / Opsi A)
    // ─────────────────────────────────────────────────
    let searchIndex = [];
    let savedPlaces = [];
    try {
        const key = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
        savedPlaces = JSON.parse(localStorage.getItem(key) || '[]');
    } catch(e) {
        savedPlaces = [];
    }
    let activePlace = null;
    let modalImgIndex = 0;
    let modalSlideInterval = null;

    // Helper currency formatting
    const fmtRp = n => {
        if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
        return 'Rp ' + Math.round(n).toLocaleString('id-ID');
    };

    // Global Navbar Badge Sync
    window.updateNavbarBookmarkBadge = function() {
        const key = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        const count = saved.length;
        const savedLinks = document.querySelectorAll('a[href="/dashboard"]');
        savedLinks.forEach(link => {
            const existingBadge = link.querySelector('.nav-bookmark-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'nav-bookmark-badge';
                badge.textContent = count;
                badge.style.cssText = `
                    background: var(--color-primary, #006565);
                    color: white;
                    border-radius: 10px;
                    padding: 1px 6px;
                    font-size: 10px;
                    font-weight: 800;
                    margin-left: 6px;
                    display: inline-block;
                    vertical-align: middle;
                `;
                link.appendChild(badge);
            }
        });
    };
    updateNavbarBookmarkBadge();

    // ── Fetch search index to resolve places detail ──
    fetch('/assets/search_index.json')
        .then(res => res.json())
        .then(data => {
            searchIndex = data;
            renderDashboard();
        })
        .catch(err => {
            console.error("Error loading search index for dashboard:", err);
            const grid = document.getElementById('saved-places-grid');
            if (grid) grid.innerHTML = `<p style="color:var(--rose-500); padding: 20px 0;">Gagal memuat data pariwisata.</p>`;
        });

    // ─────────────────────────────────────────────────
    // DYNAMIC RECENT SEARCHES RENDERING (100% REAL!)
    // ─────────────────────────────────────────────────
    window.renderRecentSearches = function() {
        const recentSearchesContainer = document.querySelector('.recent-list');
        if (recentSearchesContainer && searchIndex && searchIndex.length > 0) {
            const key = window.currentUser ? 'mraya_recent_searches_' + window.currentUser.id : 'mraya_recent_searches_guest';
            let recentSearches = JSON.parse(localStorage.getItem(key) || '[]');
            recentSearchesContainer.innerHTML = '';
            
            if (recentSearches.length === 0) {
                recentSearchesContainer.innerHTML = `
                    <li style="color:var(--color-slate-400); font-size:12.5px; font-weight:700; padding: 8px 0; list-style:none; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="font-size:18px;">history_toggle_off</span>
                        <span>Belum ada riwayat pencarian</span>
                    </li>
                `;
                return;
            }
            
            recentSearches.slice(0, 5).forEach(query => {
                const li = document.createElement('li');
                li.className = 'recent-item';
                li.style.cursor = 'pointer';
                li.innerHTML = `
                    <span class="material-symbols-outlined recent-icon">history</span>
                    <span>${query}</span>
                `;
                
                li.onclick = () => {
                    const matchedItem = searchIndex.find(item => item.Nama_Tempat.toLowerCase() === query.toLowerCase());
                    if (matchedItem) {
                        openOtaDetail(matchedItem);
                    } else {
                        window.location.href = `/directory?search=${encodeURIComponent(query)}`;
                    }
                };
                recentSearchesContainer.appendChild(li);
            });
        }
    };

    // ─────────────────────────────────────────────────
    // DYNAMIC DASHBOARD RENDERER
    // ─────────────────────────────────────────────────
    window.renderDashboard = renderDashboard;
    function renderDashboard() {
        const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
        savedPlaces = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
        const grid = document.getElementById('saved-places-grid');
        if (!grid) return;

        // Render recent searches dynamically
        if (typeof window.renderRecentSearches === 'function') {
            window.renderRecentSearches();
        }

        // Resolve places detail objects
        const places = savedPlaces.map(id => searchIndex.find(item => item.Id_Tempat === id)).filter(Boolean);

        // 1. UPDATE USER ACCOUNT INFO DYNAMICALLY
        const totalDestinationsCount = places.length;
        const subGreeting = document.querySelector('.dash-role');
        if (subGreeting) {
            subGreeting.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:1rem;font-variation-settings:'FILL' 1;color:var(--color-tertiary-container);">stars</span>
                Elite Explorer · ${totalDestinationsCount} Destinasi Favorit
            `;
        }

        const mrayaKey = typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
        const itineraries = JSON.parse(localStorage.getItem(mrayaKey) || '[]');
        const totalItinerariesCount = itineraries.length;

        const pillVal = document.querySelectorAll('.dash-stat-val');
        if (pillVal.length >= 2) {
            pillVal[0].textContent = (totalDestinationsCount * 120 + totalItinerariesCount * 500).toLocaleString('id-ID'); // Dynamic Explorer Points
            pillVal[1].textContent = totalItinerariesCount; // Active saved itineraries
        }

        // 2. RENDER TOP EXPERIENCE BENTO BOX DETAIL FOR LATEST SAVED PLACE
        const bentoSection = document.getElementById('place-details-section');
        if (bentoSection) {
            if (places.length > 0) {
                bentoSection.style.display = 'block';
                
                // Get user-specific active preview ID
                const previewKey = window.currentUser ? 'mraya_preview_id_' + window.currentUser.id : 'mraya_preview_id_guest';
                let activePreviewId = localStorage.getItem(previewKey);
                
                // Find chosen place in bookmarks
                let chosenPlace = places.find(item => item.Id_Tempat === activePreviewId);
                if (!chosenPlace) {
                    chosenPlace = places[0]; // Fallback to first saved place
                }
                
                renderBentoBoxDetails(chosenPlace);
            } else {
                bentoSection.style.display = 'none'; // Hide bento details if nothing is bookmarked
            }
        }

        // 3. RENDER SAVED DESTINATIONS GRID
        if (places.length === 0) {
            grid.innerHTML = `
                <div class="empty-results" style="grid-column: 1 / -1; width: 100%; border-radius: 16px; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); border: 1px dashed var(--color-surface-container-high); padding: 4rem 2rem; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 3.5rem; color: var(--color-slate-300); margin-bottom: 1rem;">explore</span>
                    <h4 style="font-family: var(--font-headline); font-size: 1.25rem; font-weight: 800; color: var(--color-slate-700); margin-bottom: 0.5rem;">Belum ada destinasi tersimpan</h4>
                    <p style="color: var(--color-slate-400); font-size: 0.875rem; margin-bottom: 1.5rem; max-width: 400px; margin-left: auto; margin-right: auto;">
                        Cari dan simpan objek wisata, hotel akomodasi, dan kuliner terpopuler Malang Raya untuk merancang petualangan kustom Anda.
                    </p>
                    <a href="/directory" class="btn-teal" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 0.65rem 1.75rem; border-radius: var(--radius-full); font-size: 0.875rem; box-shadow: 0 4px 14px rgba(0, 101, 101, 0.2);">
                        Eksplorasi Direktori
                        <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
                    </a>
                </div>
            `;
        } else {
            grid.innerHTML = '';
            places.forEach(item => {
                const img = item.Gambar && item.Gambar.length > 0 ? item.Gambar[0] : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVaNEszJuD9BPaw-6ZNUZ8bF3kddFP3uY5bYtMggIeUsA948ziuMoZ4agiRwOCc9OLM5QuWv27aeOmLthubH8zjZDm8lbfFyo5lQO7RNXZCBNz7MRvFoTPW7dce9pmUX6he4SWq-4cfNpQrxwDUa1c5-Eya_edzJcNFWIdWDqs5HFnYesaakGMnVEfY7euiVJrHutsUhEqY9dDbD-xkH3Mc-PTMLAq34QDdOipGhsndemVHqUN0Hv6jQzc25K2K8D9ZxeHhGJc';
                const hasImg = item.Gambar && item.Gambar.length > 0;
                
                // Get user-specific active preview ID
                const previewKey = window.currentUser ? 'mraya_preview_id_' + window.currentUser.id : 'mraya_preview_id_guest';
                let activePreviewId = localStorage.getItem(previewKey);
                if (!activePreviewId && places[0]) {
                    activePreviewId = places[0].Id_Tempat; // Default to first saved place
                }
                const isCurrentPreview = (item.Id_Tempat === activePreviewId);
                
                const card = document.createElement('div');
                card.className = `saved-card ${isCurrentPreview ? 'active-preview-card' : ''}`;
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <img class="saved-img" alt="${escapeHtmlAttr(item.Nama_Tempat)}" src="${img}" onerror="handleImgError(this)" />
                    <div class="saved-overlay"></div>
                    <div class="saved-info">
                        <span class="saved-tag">${item.Sub_Kategori}</span>
                        <h4 class="saved-name">${item.Nama_Tempat}</h4>
                        <p class="saved-loc">${item.Kategori}</p>
                    </div>
                    <button class="saved-preview-btn ${isCurrentPreview ? 'active' : ''}" title="${isCurrentPreview ? 'Pratinjau Aktif' : 'Tampilkan di Pratinjau'}">
                        <span class="material-symbols-outlined" style="font-size: 20px;">${isCurrentPreview ? 'visibility' : 'visibility_off'}</span>
                    </button>
                    <button class="saved-bookmark active" aria-label="Hapus Bookmark">
                        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">bookmark</span>
                    </button>
                `;

                // Card body click opens Detail Modal
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.saved-bookmark') || e.target.closest('.saved-preview-btn')) return; // Avoid triggering on buttons
                    openOtaDetail(item);
                });

                // Preview button listener
                card.querySelector('.saved-preview-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const previewKey = window.currentUser ? 'mraya_preview_id_' + window.currentUser.id : 'mraya_preview_id_guest';
                    localStorage.setItem(previewKey, item.Id_Tempat);
                    renderDashboard(); // Re-render to update gallery and active class instantly
                });

                // Bookmark delete button listener
                card.querySelector('.saved-bookmark').addEventListener('click', (e) => {
                    e.stopPropagation();
                    savedPlaces = savedPlaces.filter(id => id !== item.Id_Tempat);
                    const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
                    localStorage.setItem(savedPlacesKey, JSON.stringify(savedPlaces));
                    
                    // Clear active preview if deleted
                    const previewKey = window.currentUser ? 'mraya_preview_id_' + window.currentUser.id : 'mraya_preview_id_guest';
                    if (localStorage.getItem(previewKey) === item.Id_Tempat) {
                        localStorage.removeItem(previewKey);
                    }
                    
                    updateNavbarBookmarkBadge();
                    renderDashboard(); // Re-render dashboard lists instantly
                });

                grid.appendChild(card);
            });
        }

        // 3.5. DYNAMIC AI RECOMMENDATION ENGINE (100% REAL!)
        const recTitleEl = document.getElementById('rec-engine-title');
        const recCardsEl = document.getElementById('rec-engine-cards');
        if (recTitleEl && recCardsEl && searchIndex.length > 0) {
            let recTitleText = '';
            let recItems = [];

            if (places.length > 0) {
                // User has bookmarked places! Recommend based on the latest saved item.
                const latestPlace = places[0];
                recTitleText = `Karena Anda menyukai <span class="rec-highlight text-glow">${latestPlace.Nama_Tempat}</span>, kami sarankan:`;
                
                // Find other items in searchIndex with same category, excluding already bookmarked
                let matches = searchIndex.filter(item => 
                    item.Id_Tempat !== latestPlace.Id_Tempat && 
                    !savedPlaces.includes(item.Id_Tempat) &&
                    item.Kategori === latestPlace.Kategori
                );

                // If not enough matches in same category, look for anything high-rated not saved
                if (matches.length < 2) {
                    matches = searchIndex.filter(item => !savedPlaces.includes(item.Id_Tempat));
                }

                // Sort matches by Rating desc and grab top 2
                matches.sort((a, b) => (b.Rating || 0) - (a.Rating || 0));
                recItems = matches.slice(0, 2);
            } else {
                // Onboarding recommendations since they haven't bookmarked anything yet
                recTitleText = `Karena Anda menyukai petualangan di <span class="rec-highlight text-glow">Malang Raya</span>, kami sarankan:`;
                
                // Pick 2 highly rated items from different categories
                let matches = searchIndex.filter(item => 
                    item.Nama_Tempat.includes("Bromo") || 
                    item.Nama_Tempat.includes("Melati Restaurant") ||
                    item.Nama_Tempat.includes("Alun Alun Tugu Malang")
                );
                
                if (matches.length < 2) {
                    matches = searchIndex.filter(item => Number(item.Rating) >= 4.5);
                }
                
                recItems = matches.slice(0, 2);
            }

            // Populate HTML
            recTitleEl.innerHTML = recTitleText;
            recCardsEl.innerHTML = '';
            
            recItems.forEach(item => {
                const img = item.Gambar && item.Gambar.length > 0 ? item.Gambar[0] : '/assets/GAMBAR/makan/Melati_Restaurant/Melati_Restaurant-1.jpg';
                const card = document.createElement('div');
                card.className = 'rec-card';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <img class="rec-img" alt="${escapeHtmlAttr(item.Nama_Tempat)}" src="${img}" onerror="handleImgError(this)" />
                    <div class="rec-card-info">
                        <h4 class="rec-card-name">${item.Nama_Tempat}</h4>
                        <p class="rec-card-desc">${item.Kategori} · ${item.Sub_Kategori}</p>
                    </div>
                `;
                
                card.onclick = () => openOtaDetail(item);
                recCardsEl.appendChild(card);
            });
        }

        // 4. CALCULATE INTERACTIVE BUDGET ALLOCATION
        calculateBudgetWidgets(places);
    }

    // ─────────────────────────────────────────────────
    // DYNAMIC BENTO BOX PLACE DETAILS WRITER
    // ─────────────────────────────────────────────────
    function renderBentoBoxDetails(item) {
        const titleEl = document.querySelector('.gallery-title');
        const badgeEl = document.querySelector('.gallery-badge');
        const locEl = document.querySelector('.gallery-loc');
        const mainImg = document.querySelector('.gallery-main .gallery-img');
        const sideImgs = document.querySelectorAll('.gallery-side .gallery-img');
        
        if (titleEl) titleEl.textContent = item.Nama_Tempat;
        if (badgeEl) badgeEl.textContent = `${item.Kategori} · ${item.Sub_Kategori}`;
        if (locEl) {
            locEl.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:1rem;">location_on</span>
                ${item.Kategori === 'Wisata' ? 'Objek Wisata Terpopuler Malang' : (item.Kategori === 'Hotel' ? 'Akomodasi Premium Terpilih' : 'Kuliner Khas Malang')}
            `;
        }

        const imgs = item.Gambar || [];
        if (mainImg) {
            mainImg.src = imgs.length > 0 ? imgs[0] : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBckI6diUlpeCn1s-3qGDyJX04VHUXOxifrW1Eb03rN7p3U2yNkrdDMXQOAFYw3KjNGqEX0TImv4dnCAFv8LSjaCqhtpqEmNjEDzrB50WeVFfUHkJw7mBsJivdUmbH7M0_u3M-JHUn4LFhn4pOApkHxjdOFbGNuosTJu2N_gh5lUi0CIdo1y-rt9O9LNriikcX2vzY5UMAZjaoUP0eruSPHOHFwZYev_4IenNnNk81LZi2_LDnV6ogNgb1_yLZn2365CPOgTtx28Ic';
        }
        if (sideImgs.length >= 2) {
            sideImgs[0].src = imgs.length > 1 ? imgs[1] : (imgs.length > 0 ? imgs[0] : '');
            sideImgs[1].src = imgs.length > 2 ? imgs[2] : (imgs.length > 1 ? imgs[1] : (imgs.length > 0 ? imgs[0] : ''));
            
            // Photo count indicator
            const moreOverlay = document.querySelector('.gallery-more-overlay span');
            if (moreOverlay) {
                moreOverlay.textContent = imgs.length > 3 ? `+${imgs.length - 2} Photos` : `Details`;
            }
        }

        // Set up about/experience description based on data
        const descEl = document.querySelector('.content-section-desc');
        if (descEl) {
            let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
            if (item.Kategori === 'Hotel') {
                desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
            } else if (item.Kategori === 'Kuliner') {
                desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
            }
            descEl.textContent = desc;
        }

        // Sidebar Widget values
        const priceValEl = document.querySelector('.price-val');
        const priceUnitEl = document.querySelector('.price-unit');
        const priceHintEl = document.querySelector('.price-hint');
        const ratingNumEl = document.querySelector('.rating-num');
        const ratingCountEl = document.querySelector('.rating-count');

        if (priceValEl) {
            priceValEl.textContent = item.Estimasi_Harga > 0 ? fmtRp(item.Estimasi_Harga) : 'Gratis';
        }
        if (priceUnitEl) {
            priceUnitEl.textContent = item.Kategori === 'Wisata' ? '/tiket' : (item.Kategori === 'Hotel' ? '/malam' : '/porsi');
        }
        if (priceHintEl) {
            priceHintEl.textContent = item.Kategori === 'Wisata' ? 'HTM Wisata' : (item.Kategori === 'Hotel' ? 'Tarif Kamar' : 'Harga Estimasi');
        }
        if (ratingNumEl) ratingNumEl.textContent = Number(item.Rating).toFixed(1);
        if (ratingCountEl) ratingCountEl.textContent = `(${item.Jumlah_Ulasan})`;

        // Side details button actions
        const btnBook = document.querySelector('.btn-book');
        if (btnBook) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
            btnBook.onclick = () => window.open(mapsUrl, '_blank');
        }

        // Side Details remove bookmark button action
        const btnSave = document.querySelector('.btn-save');
        if (btnSave) {
            btnSave.onclick = () => {
                savedPlaces = savedPlaces.filter(id => id !== item.Id_Tempat);
                const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
                localStorage.setItem(savedPlacesKey, JSON.stringify(savedPlaces));
                updateNavbarBookmarkBadge();
                renderDashboard();
            };
        }

        // Make Gallery click open Slideshow detail modal
        const mainGallery = document.querySelector('.gallery-main');
        if (mainGallery) {
            mainGallery.onclick = () => openOtaDetail(item);
        }
        document.querySelectorAll('.gallery-sub').forEach(el => {
            el.onclick = () => openOtaDetail(item);
        });
    }

    // ─────────────────────────────────────────────────
    // INTERACTIVE BUDGET CALCULATION WIDGETS
    // ─────────────────────────────────────────────────
    function calculateBudgetWidgets(places) {
        let costHotel = 0;
        let costWisata = 0;
        let costKuliner = 0;

        places.forEach(item => {
            const harga = item.Estimasi_Harga || 0;
            if (item.Kategori === 'Hotel') {
                costHotel += harga;
            } else if (item.Kategori === 'Wisata') {
                costWisata += harga;
            } else if (item.Kategori === 'Kuliner') {
                costKuliner += harga;
            }
        });

        // Transport flat synthetic cost
        let costTransport = places.length > 0 ? 150000 : 0;
        let actualExpense = costHotel + costWisata + costKuliner + costTransport;

        // ── TARGET BUDGET TRACKER LOGIC ──
        const targetInput = document.getElementById('target-budget-input');
        const targetFill = document.getElementById('target-budget-fill');
        const targetCurrent = document.getElementById('target-budget-current');
        const targetStatus = document.getElementById('target-budget-status');

        let targetBudget = 100000; // default initial fallback

        if (targetInput && targetFill && targetCurrent && targetStatus) {
            // Load saved target budget
            const targetKey = typeof window.getTargetBudgetKey === 'function' ? window.getTargetBudgetKey() : 'mraya_target_budget';
            targetBudget = parseFloat(localStorage.getItem(targetKey) || '100000');
            // If the user modified the input value, use that
            if (targetInput.value && parseFloat(targetInput.value) > 0 && document.activeElement === targetInput) {
                targetBudget = parseFloat(targetInput.value);
            } else {
                targetInput.value = targetBudget;
            }

            targetCurrent.textContent = `Terpakai: ${fmtRp(actualExpense)}`;
            const pctUsed = targetBudget > 0 ? Math.round((actualExpense / targetBudget) * 100) : 0;
            targetFill.style.width = Math.min(100, pctUsed) + '%';

            if (pctUsed > 100) {
                targetFill.style.background = '#ef4444'; // Red if exceeded
                targetStatus.textContent = `${pctUsed}% Melebihi Anggaran!`;
                targetStatus.style.color = '#ef4444';
            } else {
                targetFill.style.background = 'var(--color-primary)'; // Teal if safe
                targetStatus.textContent = `${pctUsed}% Terpakai (Aman)`;
                targetStatus.style.color = 'var(--color-primary)';
            }
        }

        // ── BUDGET ALLOCATION LINKED TO TARGET BUDGET ──
        // Category limits are calculated as a percentage of the overall Target Budget!
        const limitHotel = targetBudget * 0.40;
        const limitKuliner = targetBudget * 0.25;
        const limitWisata = targetBudget * 0.20;
        const limitTransport = targetBudget * 0.15;

        // Fill bar percentages:
        // If places are bookmarked, show spent out of category limit (e.g. costHotel / limitHotel)
        // If nothing is bookmarked, show default proportion shares (40%, 25%, 20%, 15%)
        const pctHotel = places.length > 0 ? (limitHotel > 0 ? Math.min(100, Math.round((costHotel / limitHotel) * 100)) : 0) : 40;
        const pctKuliner = places.length > 0 ? (limitKuliner > 0 ? Math.min(100, Math.round((costKuliner / limitKuliner) * 100)) : 0) : 25;
        const pctWisata = places.length > 0 ? (limitWisata > 0 ? Math.min(100, Math.round((costWisata / limitWisata) * 100)) : 0) : 20;
        const pctTransport = places.length > 0 ? (limitTransport > 0 ? Math.min(100, Math.round((costTransport / limitTransport) * 100)) : 0) : 15;

        // Update UI Widget labels
        const labels = document.querySelectorAll('.budget-item');
        const amounts = document.querySelectorAll('.budget-amount');
        const fills = document.querySelectorAll('.budget-fill');

        if (labels.length >= 4 && amounts.length >= 4 && fills.length >= 4) {
            if (places.length > 0) {
                labels[0].querySelector('span').textContent = `Akomodasi (40%) - ${pctHotel}%`;
                amounts[0].textContent = `${fmtRp(costHotel)} / ${fmtRp(limitHotel)}`;
                fills[0].style.width = pctHotel + '%';

                labels[1].querySelector('span').textContent = `Kuliner (25%) - ${pctKuliner}%`;
                amounts[1].textContent = `${fmtRp(costKuliner)} / ${fmtRp(limitKuliner)}`;
                fills[1].style.width = pctKuliner + '%';

                labels[2].querySelector('span').textContent = `Eksplorasi (20%) - ${pctWisata}%`;
                amounts[2].textContent = `${fmtRp(costWisata)} / ${fmtRp(limitWisata)}`;
                fills[2].style.width = pctWisata + '%';

                labels[3].querySelector('span').textContent = `Transport (15%) - ${pctTransport}%`;
                amounts[3].textContent = `${fmtRp(costTransport)} / ${fmtRp(limitTransport)}`;
                fills[3].style.width = pctTransport + '%';
            } else {
                labels[0].querySelector('span').textContent = `Akomodasi (40%)`;
                amounts[0].textContent = fmtRp(limitHotel);
                fills[0].style.width = '40%';

                labels[1].querySelector('span').textContent = `Kuliner (25%)`;
                amounts[1].textContent = fmtRp(limitKuliner);
                fills[1].style.width = '25%';

                labels[2].querySelector('span').textContent = `Eksplorasi (20%)`;
                amounts[2].textContent = fmtRp(limitWisata);
                fills[2].style.width = '20%';

                labels[3].querySelector('span').textContent = `Transport (15%)`;
                amounts[3].textContent = fmtRp(limitTransport);
                fills[3].style.width = '15%';
            }
        }

        const totalValEl = document.querySelector('.budget-total-val');
        if (totalValEl) {
            totalValEl.textContent = fmtRp(targetBudget);
        }
    }

    // ─────────────────────────────────────────────────
    // DYNAMIC SLIDESHOW PRODUCT DETAIL MODAL
    // ─────────────────────────────────────────────────
    const detailModal = document.getElementById('ota-detail-modal');
    const modalTrack = document.getElementById('modal-gallery-track');
    const modalIndicators = document.getElementById('modal-gallery-indicators');
    const modalPrev = document.getElementById('modal-gallery-prev');
    const modalNext = document.getElementById('modal-gallery-next');

    window.openOtaDetail = function(item) {
        activePlace = item;
        modalImgIndex = 0;

        // Record search query/item name dynamically
        if (item && item.Nama_Tempat) {
            const key = window.currentUser ? 'mraya_recent_searches_' + window.currentUser.id : 'mraya_recent_searches_guest';
            let searches = JSON.parse(localStorage.getItem(key) || '[]');
            searches = searches.filter(s => s.toLowerCase() !== item.Nama_Tempat.toLowerCase());
            searches.unshift(item.Nama_Tempat);
            searches = searches.slice(0, 5);
            localStorage.setItem(key, JSON.stringify(searches));
            if (typeof window.renderRecentSearches === 'function') {
                window.renderRecentSearches();
            }
        }

        document.getElementById('modal-place-title').textContent = item.Nama_Tempat;
        document.getElementById('modal-place-cat').textContent = item.Kategori;
        document.getElementById('modal-place-subcat').textContent = item.Sub_Kategori;
        document.getElementById('modal-place-rating').textContent = Number(item.Rating).toFixed(1);
        document.getElementById('modal-place-reviews').textContent = item.Jumlah_Ulasan.toLocaleString('id-ID') + ' ulasan';
        
        const priceLabel = document.getElementById('modal-price-label');
        if (item.Kategori === 'Wisata') {
            priceLabel.textContent = 'Tiket Masuk';
        } else if (item.Kategori === 'Hotel') {
            priceLabel.textContent = 'Per Malam';
        } else {
            priceLabel.textContent = 'Menu Porsi';
        }

        document.getElementById('modal-place-price').textContent = item.Estimasi_Harga > 0 ? fmtRp(item.Estimasi_Harga) : 'Gratis';

        let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
        if (item.Kategori === 'Hotel') {
            desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
        } else if (item.Kategori === 'Kuliner') {
            desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
        }
        document.getElementById('modal-place-desc').textContent = desc;

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
        document.getElementById('modal-gmaps-link').href = mapsUrl;

        // Check bookmark icon
        const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
        const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
        const isSaved = saved.some(id => id === item.Id_Tempat);
        const saveIcon = document.getElementById('modal-save-icon');
        if (saveIcon) {
            saveIcon.textContent = isSaved ? 'bookmark_added' : 'bookmark';
            saveIcon.style.color = isSaved ? 'var(--color-primary)' : 'inherit';
        }

        renderModalSlideshow();
        detailModal.classList.add('show');
    };

    window.closeOtaDetail = function() {
        detailModal.classList.remove('show');
        clearInterval(modalSlideInterval);
    };

    function renderModalSlideshow() {
        modalTrack.innerHTML = '';
        modalIndicators.innerHTML = '';
        
        const imgs = activePlace.Gambar || [];
        
        if (imgs.length === 0) {
            modalTrack.innerHTML = `
                <div class="ota-modal-gallery-slide">
                    <div class="ota-shimmer-placeholder">
                        <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                        <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                    </div>
                </div>
            `;
            modalPrev.style.display = 'none';
            modalNext.style.display = 'none';
            return;
        }

        modalPrev.style.display = imgs.length > 1 ? 'flex' : 'none';
        modalNext.style.display = imgs.length > 1 ? 'flex' : 'none';

        imgs.forEach((img, i) => {
            modalTrack.innerHTML += `
                <div class="ota-modal-gallery-slide">
                    <img src="${img}" alt="${activePlace.Nama_Tempat}" onerror="handleImgError(this)" />
                </div>
            `;
            modalIndicators.innerHTML += `
                <div class="ota-modal-gallery-indicator ${i === 0 ? 'active' : ''}" onclick="slideModalTo(${i})"></div>
            `;
        });

        slideModalTo(0);
        
        clearInterval(modalSlideInterval);
        if (imgs.length > 1) {
            modalSlideInterval = setInterval(() => {
                slideModalNext();
            }, 3500);
        }
    }

    function slideModalTo(index) {
        const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
        if (count <= 1) return;

        modalImgIndex = index;
        modalTrack.style.transform = `translateX(-${index * 100}%)`;

        const indicators = modalIndicators.querySelectorAll('.ota-modal-gallery-indicator');
        indicators.forEach((ind, i) => {
            if (i === index) ind.classList.add('active');
            else ind.classList.remove('active');
        });
    }

    function slideModalNext() {
        const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
        if (count <= 1) return;
        const nextIdx = (modalImgIndex + 1) % count;
        slideModalTo(nextIdx);
    }

    function slideModalPrev() {
        const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
        if (count <= 1) return;
        const prevIdx = (modalImgIndex - 1 + count) % count;
        slideModalTo(prevIdx);
    }

    if (modalPrev) modalPrev.addEventListener('click', () => { slideModalPrev(); clearInterval(modalSlideInterval); });
    if (modalNext) modalNext.addEventListener('click', () => { slideModalNext(); clearInterval(modalSlideInterval); });

    window.savePlaceToggle = function() {
        if (!activePlace) return;
        const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
        const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
        const index = saved.indexOf(activePlace.Id_Tempat);
        const saveIcon = document.getElementById('modal-save-icon');

        if (index > -1) {
            saved.splice(index, 1);
            saveIcon.textContent = 'bookmark';
            saveIcon.style.color = 'inherit';
        } else {
            saved.push(activePlace.Id_Tempat);
            saveIcon.textContent = 'bookmark_added';
            saveIcon.style.color = 'var(--color-primary)';
        }
        localStorage.setItem(savedPlacesKey, JSON.stringify(saved));
        updateNavbarBookmarkBadge();
        renderDashboard(); // Re-render instantly
    };

    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeOtaDetail();
        });
    }

    // Dynamic error handling
    window.handleImgError = function(el) {
        if (el.dataset.fallbackTriggered) return;
        el.dataset.fallbackTriggered = "true";
        const parent = el.parentNode;
        if (parent) {
            parent.innerHTML = `
                <div class="ota-shimmer-placeholder">
                    <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                    <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                </div>
            `;
        }
    };

    // ─────────────────────────────────────────────────
    // DYNAMIC TAB SWITCHING
    // ─────────────────────────────────────────────────
    const tabBtns = document.querySelectorAll('.dash-tab-btn');
    const tabPanels = document.querySelectorAll('.dash-tab-panel-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.dataset.tab;
            tabPanels.forEach(p => {
                if (p.id === targetTab) {
                    p.style.display = 'block';
                } else {
                    p.style.display = 'none';
                }
            });
        });
    });

    // Handle direct hashes in URL (e.g. /dashboard#edit-profile)
    if (window.location.hash === '#edit-profile') {
        const editTabBtn = document.querySelector('.dash-tab-btn[data-tab="tab-profile"]');
        if (editTabBtn) editTabBtn.click();
    }

    // ─────────────────────────────────────────────────
    // DYNAMIC TARGET BUDGET INPUT HANDLER
    // ─────────────────────────────────────────────────
    const targetInput = document.getElementById('target-budget-input');
    if (targetInput) {
        targetInput.addEventListener('input', () => {
            const val = parseFloat(targetInput.value) || 0;
            const targetKey = typeof window.getTargetBudgetKey === 'function' ? window.getTargetBudgetKey() : 'mraya_target_budget';
            localStorage.setItem(targetKey, val.toString());
            // Re-calculate budget stats
            if (searchIndex.length > 0) {
                const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
                const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
                const placesObj = saved.map(id => searchIndex.find(item => item.Id_Tempat === id)).filter(Boolean);
                calculateBudgetWidgets(placesObj);
            }
        });
    }

    // ─────────────────────────────────────────────────
    // TRAVEL NOTES CONTROLLER (LocalStorage)
    // ─────────────────────────────────────────────────
    function renderTravelNotes() {
        const notesList = document.getElementById('travel-notes-list');
        if (!notesList) return;

        const noteKey = typeof window.getTravelNotesKey === 'function' ? window.getTravelNotesKey() : 'travel_notes';
        const notes = JSON.parse(localStorage.getItem(noteKey) || '[]');
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-results" style="border-radius:16px; background:rgba(255,255,255,0.7); border:1px dashed var(--color-surface-container-high); padding:3rem 1.5rem; text-align:center;">
                    <span class="material-symbols-outlined" style="font-size:3rem; color:var(--color-slate-300); margin-bottom:0.75rem;">assignment_late</span>
                    <h4 style="font-family:var(--font-headline); font-size:1.15rem; font-weight:800; color:var(--color-slate-700); margin-bottom:0.25rem;">Belum ada catatan</h4>
                    <p style="color:var(--color-slate-400); font-size:0.8125rem; margin:0;">Tambahkan daftar rencana, barang bawaan, atau kuliner impian Anda di atas.</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = notes.map(note => `
            <div class="note-card ${note.completed ? 'completed' : ''}">
                <div class="note-content">
                    <div class="note-checkbox ${note.completed ? 'checked' : ''}" data-id="${note.id}">
                        ${note.completed ? '<span class="material-symbols-outlined">check</span>' : ''}
                    </div>
                    <span class="note-text">${escapeHtml(note.text)}</span>
                </div>
                <button class="btn-delete-note note-delete-btn" data-id="${note.id}" title="Hapus Catatan">
                    <span class="material-symbols-outlined" style="font-size:20px;">delete</span>
                </button>
            </div>
        `).join('');

        // Bind check action to the custom checkbox and card click
        notesList.querySelectorAll('.note-content').forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', () => {
                const checkbox = element.querySelector('.note-checkbox');
                const id = parseInt(checkbox.dataset.id);
                const noteKey = typeof window.getTravelNotesKey === 'function' ? window.getTravelNotesKey() : 'travel_notes';
                const currentNotes = JSON.parse(localStorage.getItem(noteKey) || '[]');
                const note = currentNotes.find(n => n.id === id);
                if (note) {
                    note.completed = !note.completed;
                    localStorage.setItem(noteKey, JSON.stringify(currentNotes));
                    renderTravelNotes();
                }
            });
        });

        // Bind delete action
        notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const noteKey = typeof window.getTravelNotesKey === 'function' ? window.getTravelNotesKey() : 'travel_notes';
                let currentNotes = JSON.parse(localStorage.getItem(noteKey) || '[]');
                currentNotes = currentNotes.filter(n => n.id !== id);
                localStorage.setItem(noteKey, JSON.stringify(currentNotes));
                renderTravelNotes();
            });
        });
    }

    // Add Travel Note Form submission
    document.getElementById('add-travel-note-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('new-note-input');
        if (!input) return;

        const val = input.value.trim();
        if (val) {
            const noteKey = typeof window.getTravelNotesKey === 'function' ? window.getTravelNotesKey() : 'travel_notes';
            const currentNotes = JSON.parse(localStorage.getItem(noteKey) || '[]');
            currentNotes.unshift({
                id: Date.now(),
                text: val,
                completed: false
            });
            localStorage.setItem(noteKey, JSON.stringify(currentNotes));
            input.value = '';
            renderTravelNotes();
        }
    });

    // Helper escape html
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Helper escape html attribute
    function escapeHtmlAttr(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Initial render notes
    renderTravelNotes();

    // ─────────────────────────────────────────────────
    // PROFILE UPDATES & GUEST STATE UI SYNC
    // ─────────────────────────────────────────────────
    window.updateDashboardProfileUI = function() {
        const guestState = document.getElementById('dashboard-guest-state');
        const loggedInState = document.getElementById('dashboard-logged-in-state');
        if (!guestState || !loggedInState) return;

        if (window.currentUser) {
            guestState.style.display = 'none';
            loggedInState.style.display = 'block';

            // Populate header info
            document.getElementById('dash-profile-name').textContent = window.currentUser.name;
            document.getElementById('dash-profile-bio').textContent = window.currentUser.bio || 'Petualang penjelajah Malang Raya!';
            document.getElementById('dash-profile-avatar').src = window.getAvatarUrl(window.currentUser.avatar);

            // Populate stats
            const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
            const mrayaKey = typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
            const savedCount = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]').length;
            const plansCount = JSON.parse(localStorage.getItem(mrayaKey) || '[]').length;
            document.getElementById('dash-plans-val').textContent = plansCount;
            document.getElementById('dash-points-val').textContent = (savedCount * 120 + plansCount * 500).toLocaleString('id-ID');

            // Populate edit form values
            const nameInput = document.getElementById('edit-profile-name');
            const emailInput = document.getElementById('edit-profile-email');
            const bioInput = document.getElementById('edit-profile-bio');
            if (nameInput) nameInput.value = window.currentUser.name;
            if (emailInput) emailInput.value = window.currentUser.email;
            if (bioInput) bioInput.value = window.currentUser.bio || '';

            // Set active avatar radio preset selection
            const activePreset = window.currentUser.avatar || 'explorer';
            const radio = document.querySelector(`input[name="avatar"][value="${activePreset}"]`);
            if (radio) {
                radio.checked = true;
                highlightAvatarPresetChoice(activePreset);
            }
        } else {
            loggedInState.style.display = 'none';
            guestState.style.display = 'block';
        }

        // Trigger dynamic dashboard content and travel notes update matching the loaded auth keys
        if (typeof renderDashboard === 'function') {
            renderDashboard();
        }
        if (typeof renderTravelNotes === 'function') {
            renderTravelNotes();
        }
    };

    function highlightAvatarPresetChoice(preset) {
        document.querySelectorAll('.avatar-preset-choice').forEach(img => {
            if (img.dataset.preset === preset) {
                img.style.borderColor = 'var(--color-primary)';
                img.style.transform = 'scale(1.08)';
            } else {
                img.style.borderColor = 'transparent';
                img.style.transform = 'none';
            }
        });
    }

    // Attach click listener for preset selection labels
    document.querySelectorAll('.avatar-preset-choice').forEach(img => {
        img.addEventListener('click', () => {
            const preset = img.dataset.preset;
            const radio = document.querySelector(`input[name="avatar"][value="${preset}"]`);
            if (radio) {
                radio.checked = true;
                highlightAvatarPresetChoice(preset);
            }
        });
    });

    // Setup Profile Edit Form Submission via AJAX MySQL Auth
    document.getElementById('profile-edit-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const msg = document.getElementById('profile-edit-msg');
        if (msg) {
            msg.style.display = 'none';
            msg.className = '';
        }

        const formData = new FormData(this);
        fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(async res => {
            const data = await res.json();
            if (res.ok && data.success) {
                msg.textContent = data.message;
                msg.style.cssText = 'display:block; margin-top:16px; padding:12px; border-radius:12px; font-size:13px; font-weight:700; text-align:center; background:#ecfdf5; color:#065f46;';
                
                // Update global auth info and refresh all navbars dynamically
                window.checkGlobalAuth();
                
                setTimeout(() => {
                    msg.style.display = 'none';
                }, 3000);
            } else {
                msg.textContent = (data.errors && data.errors[0]) || 'Gagal memperbarui profil.';
                msg.style.cssText = 'display:block; margin-top:16px; padding:12px; border-radius:12px; font-size:13px; font-weight:700; text-align:center; background:#fef2f2; color:#991b1b;';
            }
        })
        .catch(err => {
            console.error("Profile update error:", err);
            msg.textContent = 'Terjadi kesalahan koneksi server.';
            msg.style.cssText = 'display:block; margin-top:16px; padding:12px; border-radius:12px; font-size:13px; font-weight:700; text-align:center; background:#fef2f2; color:#991b1b;';
        });
    });

    // Delay slightly to wait for checkGlobalAuth's initial response
    setTimeout(() => {
        window.updateDashboardProfileUI();
    }, 400);
});
