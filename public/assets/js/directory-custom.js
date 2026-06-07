// 2. IMAGE FALLBACK ERROR HANDLER
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

// 2.5 LEVENSHTEIN FUZZY MATCH ALGORITHM FOR AUTOCORRECT
function levenshteinDistance(s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) { arr[i] = [i]; }
    for (let j = 0; j <= s.length; j++) { arr[0][j] = j; }
    for (let i = 1; i <= t.length; i++) {
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] = s[j - 1] === t[i - 1] 
                ? arr[i - 1][j - 1] 
                : Math.min(arr[i - 1][j - 1] + 1, arr[i][j - 1] + 1, arr[i - 1][j] + 1);
        }
    }
    return arr[t.length][s.length];
}

function findTypoAutocorrect(query, items) {
    if (query.length < 3) return null;
    const cleanQuery = query.toLowerCase().trim();
    let bestMatch = null;
    let minDistance = 3;

    for (const item of items) {
        const name = item.Nama_Tempat.toLowerCase();
        const words = name.split(/\s+/);
        for (const word of words) {
            if (word.length < 3) continue;
            const distance = levenshteinDistance(cleanQuery, word);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = item;
            }
        }
    }
    return bestMatch;
}

// 3. EXPLORER SYSTEM MAIN ENGINE
let searchIndex = [];
let filteredIndex = [];
let currentPage = 1;
const itemsPerPage = 12;

let activeCatFilter = 'Semua';
let activeLocFilter = 'Semua';
let searchQuery = '';

// Price Filter State
let activePriceTier = 'Semua';
let customMinPrice = null;
let customMaxPrice = null;
let activeSortOption = 'default';

// Dynamic price tier configurations matching our dataset statistics
const priceTierConfigs = {
    'Semua': {
        Hemat: { label: 'Hemat (< Rp 50k)', min: 0, max: 50000 },
        Menengah: { label: 'Menengah (50k - 250k)', min: 50000, max: 250000 },
        Premium: { label: 'Premium (> Rp 250k)', min: 250000, max: Infinity }
    },
    'Wisata': {
        Hemat: { label: 'Hemat (< Rp 10k)', min: 0, max: 10000 },
        Menengah: { label: 'Menengah (10k - 50k)', min: 10000, max: 50000 },
        Premium: { label: 'Premium (> Rp 50k)', min: 50000, max: Infinity }
    },
    'Hotel': {
        Hemat: { label: 'Hemat (< Rp 150k)', min: 0, max: 150000 },
        Menengah: { label: 'Menengah (150k - 350k)', min: 150000, max: 350000 },
        Premium: { label: 'Premium (> Rp 350k)', min: 350000, max: Infinity }
    },
    'Kuliner': {
        Hemat: { label: 'Hemat (< Rp 15k)', min: 0, max: 15000 },
        Menengah: { label: 'Menengah (15k - 35k)', min: 15000, max: 35000 },
        Premium: { label: 'Premium (> Rp 35k)', min: 35000, max: Infinity }
    }
};

function updatePriceTierLabels(category) {
    const config = priceTierConfigs[category] || priceTierConfigs['Semua'];
    const hematLabel = document.getElementById('tier-label-hemat');
    const menengahLabel = document.getElementById('tier-label-menengah');
    const premiumLabel = document.getElementById('tier-label-premium');
    
    if (hematLabel) hematLabel.textContent = config.Hemat.label;
    if (menengahLabel) menengahLabel.textContent = config.Menengah.label;
    if (premiumLabel) premiumLabel.textContent = config.Premium.label;
}

const gridElement = document.getElementById('directory-grid');
const countLabel = document.getElementById('results-count-label');
const paginationControls = document.getElementById('pagination-controls');

// Kumpulkan semua kemungkinan input pencarian (Desktop, Mobile Spesifik, dan Mobile Navbar)
const dirSearchInputs = [
    document.getElementById('dir-search-input'),
    document.getElementById('mobile-dir-search-input'),
    document.getElementById('mobile-nav-search-input')
].filter(Boolean);

// Fetch dataset index dynamically
fetch('/assets/search_index.json')
    .then(res => res.json())
    .then(data => {
        searchIndex = data;
        
        // Parse URL query parameter for search if exists!
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search') || urlParams.get('q');
        if (searchParam) {
            dirSearchInputs.forEach(input => input.value = searchParam);
            searchQuery = searchParam.toLowerCase().trim();
        }
        
        applyFilters();
    })
    .catch(err => {
        console.error("Error loading directory index:", err);
        if (countLabel) countLabel.textContent = "Gagal memuat data direktori.";
    });

// Search Input listener
dirSearchInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        // Sinkronisasi teks otomatis ke semua kotak pencarian lain yang ada di layar
        dirSearchInputs.forEach(other => {
            if (other !== input) other.value = e.target.value;
        });
        
        applyFilters();
    });
});

// Category buttons listeners
const catButtons = document.querySelectorAll('[data-cat]');
catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCatFilter = btn.dataset.cat;
        updatePriceTierLabels(activeCatFilter);
        applyFilters();
    });
});

// Location buttons listeners
const locButtons = document.querySelectorAll('[data-loc]');
locButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        locButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLocFilter = btn.dataset.loc;
        applyFilters();
    });
});

// Price Tier buttons listeners
const priceTierButtons = document.querySelectorAll('[data-price-tier]');
priceTierButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        priceTierButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePriceTier = btn.dataset.priceTier;
        
        // Clear custom price inputs when a quick tier is chosen
        const minInput = document.getElementById('price-min-input');
        const maxInput = document.getElementById('price-max-input');
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        customMinPrice = null;
        customMaxPrice = null;
        
        applyFilters();
    });
});

// Format number helper (adds dots as thousands separators)
function formatNumberInput(value) {
    let clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('id-ID');
}

// Custom price inputs formatting listeners
const minInput = document.getElementById('price-min-input');
const maxInput = document.getElementById('price-max-input');
if (minInput && maxInput) {
    [minInput, maxInput].forEach(inp => {
        inp.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const originalLength = e.target.value.length;
            const formatted = formatNumberInput(e.target.value);
            e.target.value = formatted;
            
            // Adjust cursor position to handle inserted dots
            const newLength = formatted.length;
            e.target.setSelectionRange(
                cursorPosition + (newLength - originalLength),
                cursorPosition + (newLength - originalLength)
            );
        });
    });
}

// Apply custom price filter
const btnApplyPrice = document.getElementById('btn-apply-price');
if (btnApplyPrice) {
    btnApplyPrice.addEventListener('click', () => {
        const minVal = minInput ? minInput.value.replace(/\D/g, '') : '';
        const maxVal = maxInput ? maxInput.value.replace(/\D/g, '') : '';
        
        customMinPrice = minVal ? Number(minVal) : null;
        customMaxPrice = maxVal ? Number(maxVal) : null;
        
        // Deactivate tier buttons if custom prices are specified
        priceTierButtons.forEach(b => b.classList.remove('active'));
        
        // If custom range is applied, activePriceTier is Kustom
        activePriceTier = 'Kustom';
        
        applyFilters();
    });
}

// Reset price filters
const btnClearPrice = document.getElementById('btn-clear-price');
if (btnClearPrice) {
    btnClearPrice.addEventListener('click', () => {
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        customMinPrice = null;
        customMaxPrice = null;
        
        priceTierButtons.forEach(b => b.classList.remove('active'));
        const allPriceBtn = document.querySelector('[data-price-tier="Semua"]');
        if (allPriceBtn) allPriceBtn.classList.add('active');
        
        activePriceTier = 'Semua';
        applyFilters();
    });
}

// Custom Premium Dropdown Event Listeners
const customSortDropdown = document.getElementById('custom-sort-dropdown');
const sortTriggerBtn = document.getElementById('sort-trigger-btn');
const sortOptionsList = document.getElementById('sort-options-list');
const selectedSortLabel = document.getElementById('selected-sort-label');
const sortOptItems = document.querySelectorAll('.sort-opt-item');

if (sortTriggerBtn && customSortDropdown) {
    // Toggle open on click
    sortTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        customSortDropdown.classList.toggle('open');
        
        // Toggle accessibility attributes
        const isOpen = customSortDropdown.classList.contains('open');
        sortTriggerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!customSortDropdown.contains(e.target)) {
            customSortDropdown.classList.remove('open');
            sortTriggerBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Option selection click handler
    sortOptItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = item.dataset.value;
            
            let cleanText = 'Rekomendasi';
            if (val === 'price-asc') cleanText = 'Harga: Terendah ↑';
            else if (val === 'price-desc') cleanText = 'Harga: Tertinggi ↓';
            
            if (selectedSortLabel) selectedSortLabel.textContent = cleanText;

            sortOptItems.forEach(opt => opt.classList.remove('active'));
            item.classList.add('active');

            activeSortOption = val;
            customSortDropdown.classList.remove('open');
            sortTriggerBtn.setAttribute('aria-expanded', 'false');
            applyFilters();
        });
    });
}

window.applyAutocorrect = function(correctedWord) {
    let updated = false;
    dirSearchInputs.forEach(input => {
        input.value = correctedWord;
        updated = true;
    });
    
    if (updated) {
        searchQuery = correctedWord.toLowerCase().trim();
        applyFilters();
    }
};

function applyFilters() {
    currentPage = 1;

    filteredIndex = searchIndex.filter(item => {
        // Category filter
        const matchesCat = (activeCatFilter === 'Semua' || item.Kategori === activeCatFilter);

        // Location filter
        let matchesLoc = true;
        if (activeLocFilter !== 'Semua') {
            const link = (item.Link || "").toLowerCase();
            const subcat = (item.Sub_Kategori || "").toLowerCase();
            const name = (item.Nama_Tempat || "").toLowerCase();
            const lat = Number(item.Latitude);
            const lng = Number(item.Longitude);

            // High-precision geographic coordinate classification for Malang Raya
            // 1. Kota Malang: Central dense urban area
            const isKotaMalangCoords = (lat <= -7.91 && lat >= -8.04 && lng >= 112.58 && lng <= 112.69);
            
            // 2. Kota Batu: Northwest mountainous area (excluding western districts Pujon/Ngantang/Kasembon)
            const isBatuCoords = (lat <= -7.74 && lat >= -7.92 && lng >= 112.475 && lng <= 112.578);

            // Default to Kabupaten Malang (since it surrounds both Kota Malang and Batu)
            let itemLoc = "Kab. Malang";
            
            if (isKotaMalangCoords && !name.includes("kabupaten") && !link.includes("kabupaten")) {
                itemLoc = "Kota Malang";
            } else if (isBatuCoords || name.includes("batu") || link.includes("batu") || subcat.includes("batu")) {
                // Exclude western districts (Pujon, Ngantang, Kasembon) which are Kabupaten Malang
                const isWesternKabMalang = (lng < 112.47 || name.includes("pujon") || name.includes("ngantang") || name.includes("kasembon") || link.includes("pujon") || link.includes("ngantang") || link.includes("kasembon"));
                if (!isWesternKabMalang) {
                    itemLoc = "Batu";
                }
            }

            // Apply filter based on target active location
            if (activeLocFilter === 'Batu') {
                matchesLoc = (itemLoc === "Batu");
            } else if (activeLocFilter === 'Kota Malang') {
                matchesLoc = (itemLoc === "Kota Malang");
            } else if (activeLocFilter === 'Kab. Malang') {
                matchesLoc = (itemLoc === "Kab. Malang");
            }
        }

        // Search query filter
        const matchesSearch = (searchQuery === '' || 
            item.Nama_Tempat.toLowerCase().includes(searchQuery) || 
            item.Sub_Kategori.toLowerCase().includes(searchQuery) ||
            item.Kategori.toLowerCase().includes(searchQuery)
        );

        // Price filter
        let matchesPrice = true;
        if (customMinPrice !== null || customMaxPrice !== null) {
            const price = item.Estimasi_Harga || 0;
            const min = customMinPrice !== null ? customMinPrice : 0;
            const max = customMaxPrice !== null ? customMaxPrice : Infinity;
            matchesPrice = (price >= min && price <= max);
        } else if (activePriceTier !== 'Semua') {
            const price = item.Estimasi_Harga || 0;
            const catConfig = priceTierConfigs[activeCatFilter] || priceTierConfigs['Semua'];
            const tier = catConfig[activePriceTier];
            if (tier) {
                matchesPrice = (price >= tier.min && price <= tier.max);
            }
        }

        return matchesCat && matchesLoc && matchesSearch && matchesPrice;
    });

    // Apply sorting
    if (activeSortOption === 'price-asc') {
        filteredIndex.sort((a, b) => (a.Estimasi_Harga || 0) - (b.Estimasi_Harga || 0));
    } else if (activeSortOption === 'price-desc') {
        filteredIndex.sort((a, b) => (b.Estimasi_Harga || 0) - (a.Estimasi_Harga || 0));
    }

    // Update header count
    if (countLabel) {
        countLabel.className = 'results-count';
        countLabel.removeAttribute('style');
        countLabel.textContent = `Menampilkan ${filteredIndex.length} dari ${searchIndex.length} objek terkurasi`;
    }

    renderGrid();
}

function fmtRupiah(num) {
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function renderGrid() {
    if (!gridElement) return;
    gridElement.innerHTML = '';

    if (filteredIndex.length === 0) {
        const autocorrectSuggestion = findTypoAutocorrect(searchQuery, searchIndex);
        let autocorrectHtml = '';
        if (autocorrectSuggestion) {
            autocorrectHtml = `
                <div style="margin-top:16px; display:inline-flex; align-items:center; gap:8px; background:rgba(20,184,166,0.1); color:var(--teal-700); padding:10px 16px; border-radius:8px; border:1px solid rgba(20,184,166,0.2);">
                    <span class="material-symbols-outlined" style="font-size:18px;">auto_awesome</span>
                    <span>Maksud Anda: <strong style="cursor:pointer; text-decoration:underline;" onclick="applyAutocorrect('${autocorrectSuggestion.Nama_Tempat.replace(/'/g, "\\'")}')">${autocorrectSuggestion.Nama_Tempat}</strong>?</span>
                </div>
            `;
        }

        gridElement.innerHTML = `
            <div class="empty-results" style="grid-column: 1/-1; text-align:center; padding: 40px 20px;">
                <span class="material-symbols-outlined empty-results-icon">sentiment_dissatisfied</span>
                <h4>Destinasi Tidak Ditemukan</h4>
                <p>Cobalah menyaring dengan kata kunci lain atau ubah filter kategori/wilayah Anda.</p>
                ${autocorrectHtml}
            </div>
        `;
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredIndex.length);
    const paginatedItems = filteredIndex.slice(startIndex, endIndex);

    paginatedItems.forEach(item => {
        const hasImg = item.Gambar && item.Gambar.length > 0;
        const imgHTML = hasImg
            ? `<img class="ota-card-img" src="${item.Gambar[0]}" alt="${item.Nama_Tempat}" onerror="handleImgError(this)" />`
            : `<div class="ota-shimmer-placeholder">
                   <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                   <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
               </div>`;

        const priceLabel = item.Kategori === 'Wisata' ? 'Tiket Masuk' : (item.Kategori === 'Hotel' ? 'Per Malam' : 'Menu Porsi');
        const priceFormatted = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';

        gridElement.innerHTML += `
            <div class="ota-carousel-card" style="width:100%; min-width:unset" onclick="openOtaDetail(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="ota-card-img-wrapper">
                    ${imgHTML}
                    <span class="ota-card-badge">${item.Kategori}</span>
                    <span class="ota-card-rating">
                        <span class="material-symbols-outlined star-icon">star</span>
                        ${Number(item.Rating).toFixed(1)}
                    </span>
                </div>
                <div class="ota-card-body">
                    <div class="ota-card-subcat">${item.Sub_Kategori}</div>
                    <h4 class="ota-card-title">${item.Nama_Tempat}</h4>
                    <div class="ota-card-footer">
                        <div>
                            <div class="ota-card-price-label">${priceLabel}</div>
                            <div class="ota-card-price-value">${priceFormatted}</div>
                        </div>
                        <button class="ota-card-btn">
                            Detail
                            <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    if (!paginationControls) return;
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(filteredIndex.length / itemsPerPage);
    if (totalPages <= 1) return;

    // Previous Button
    paginationControls.innerHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" onclick="changePage(${currentPage - 1})">
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
    `;

    // Max visible page numbers = 5
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        paginationControls.innerHTML += `
            <button class="pagination-btn" onclick="changePage(1)">1</button>
            ${startPage > 2 ? '<span style="color:var(--color-slate-400);padding:0 4px">...</span>' : ''}
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationControls.innerHTML += `
            <button class="pagination-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
        `;
    }

    if (endPage < totalPages) {
        paginationControls.innerHTML += `
            ${endPage < totalPages - 1 ? '<span style="color:var(--color-slate-400);padding:0 4px">...</span>' : ''}
            <button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>
        `;
    }

    // Next Button
    paginationControls.innerHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" onclick="changePage(${currentPage + 1})">
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;
}

window.changePage = function(page) {
    currentPage = page;
    renderGrid();
    
    // Smooth scroll grid to top
    const layoutEl = document.querySelector('.directory-layout');
    if (layoutEl) {
        window.scrollTo({
            top: layoutEl.offsetTop - 100,
            behavior: 'smooth'
        });
    }
};


// 4. DETAILED MODAL ENGINE (COPY-PASTE COMPATIBILITY FROM HOMEPAGE)
const detailModal = document.getElementById('ota-detail-modal');
const modalTrack = document.getElementById('modal-gallery-track');
const modalIndicators = document.getElementById('modal-gallery-indicators');
const modalPrev = document.getElementById('modal-gallery-prev');
const modalNext = document.getElementById('modal-gallery-next');

let activePlace = null;
let modalImgIndex = 0;
let modalSlideInterval = null;

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
    }

    const titleEl = document.getElementById('modal-place-title');
    const catEl = document.getElementById('modal-place-cat');
    const subcatEl = document.getElementById('modal-place-subcat');
    const ratingEl = document.getElementById('modal-place-rating');
    const reviewsEl = document.getElementById('modal-place-reviews');
    
    if (titleEl) titleEl.textContent = item.Nama_Tempat;
    if (catEl) catEl.textContent = item.Kategori;
    if (subcatEl) subcatEl.textContent = item.Sub_Kategori;
    if (ratingEl) ratingEl.textContent = Number(item.Rating).toFixed(1);
    if (reviewsEl) reviewsEl.textContent = item.Jumlah_Ulasan.toLocaleString('id-ID') + ' ulasan';
    
    const priceLabel = document.getElementById('modal-price-label');
    if (priceLabel) {
        if (item.Kategori === 'Wisata') {
            priceLabel.textContent = 'Tiket Masuk';
        } else if (item.Kategori === 'Hotel') {
            priceLabel.textContent = 'Per Malam';
        } else {
            priceLabel.textContent = 'Menu Porsi';
        }
    }

    const priceValEl = document.getElementById('modal-place-price');
    if (priceValEl) {
        priceValEl.textContent = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';
    }

    let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
    if (item.Kategori === 'Hotel') {
        desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
    } else if (item.Kategori === 'Kuliner') {
        desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
    }
    const descEl = document.getElementById('modal-place-desc');
    if (descEl) descEl.textContent = desc;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
    const gmapsLinkEl = document.getElementById('modal-gmaps-link');
    if (gmapsLinkEl) gmapsLinkEl.href = mapsUrl;

    // Package button visibility and href
    const packageBtn = document.getElementById('modal-package-btn');
    if (packageBtn) {
        if (item.Kategori === 'Wisata') {
            packageBtn.style.display = 'inline-flex';
            packageBtn.href = `/recommender?workflow=destination&dest_id=${item.Id_Tempat}&dest_name=${encodeURIComponent(item.Nama_Tempat)}`;
        } else {
            packageBtn.style.display = 'none';
            packageBtn.href = '#';
        }
    }

    // Check bookmark
    const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
    const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
    const uniqueId = `${item.Kategori}_${item.Id_Tempat}`;
    const isSaved = saved.some(id => id === uniqueId || id === item.Id_Tempat);
    const saveIcon = document.getElementById('modal-save-icon');
    if (saveIcon) {
        saveIcon.textContent = isSaved ? 'bookmark_added' : 'bookmark';
        saveIcon.style.color = isSaved ? 'var(--color-primary)' : 'inherit';
    }

    renderModalSlideshow();
    if (detailModal) detailModal.classList.add('show');
};

window.closeOtaDetail = function() {
    if (detailModal) detailModal.classList.remove('show');
    clearInterval(modalSlideInterval);
};

function renderModalSlideshow() {
    if (!modalTrack || !modalIndicators) return;
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
        if (modalPrev) modalPrev.style.display = 'none';
        if (modalNext) modalNext.style.display = 'none';
        return;
    }

    if (modalPrev) modalPrev.style.display = imgs.length > 1 ? 'flex' : 'none';
    if (modalNext) modalNext.style.display = imgs.length > 1 ? 'flex' : 'none';

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

window.slideModalTo = function(index) {
    if (!modalTrack || !modalIndicators) return;
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
    window.slideModalTo(nextIdx);
}

function slideModalPrev() {
    const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
    if (count <= 1) return;
    const prevIdx = (modalImgIndex - 1 + count) % count;
    window.slideModalTo(prevIdx);
}

if (modalPrev) modalPrev.addEventListener('click', () => { slideModalPrev(); clearInterval(modalSlideInterval); });
if (modalNext) modalNext.addEventListener('click', () => { slideModalNext(); clearInterval(modalSlideInterval); });

window.savePlaceToggle = function() {
    if (!activePlace) return;
    const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
    const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
    const uniqueId = `${activePlace.Kategori}_${activePlace.Id_Tempat}`;
    const index = saved.findIndex(id => id === uniqueId || id === activePlace.Id_Tempat);
    const saveIcon = document.getElementById('modal-save-icon');

    if (index > -1) {
        saved.splice(index, 1);
        if (saveIcon) {
            saveIcon.textContent = 'bookmark';
            saveIcon.style.color = 'inherit';
        }
    } else {
        saved.push(uniqueId);
        if (saveIcon) {
            saveIcon.textContent = 'bookmark_added';
            saveIcon.style.color = 'var(--color-primary)';
        }
    }
    localStorage.setItem(savedPlacesKey, JSON.stringify(saved));
    if (window.updateNavbarBookmarkBadge) window.updateNavbarBookmarkBadge();
};

if (detailModal) {
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeOtaDetail();
    });
}

// 5. NAVBAR SEARCH AUTOCOMPLETE ENGINE
const navSearchInputs = [
    { input: document.getElementById('nav-search-input'), dropdown: document.getElementById('search-autocomplete-dropdown') },
    { input: document.getElementById('mobile-nav-search-input'), dropdown: document.getElementById('mobile-search-autocomplete-dropdown') }
].filter(item => item.input && item.dropdown);

navSearchInputs.forEach(({input, dropdown}) => {
    input.addEventListener('input', (e) => {
        const query = e.target.value;
        renderNavSearchSuggestions(query, dropdown);
    });

    // Close search on clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    // Show suggestions on focus if not empty
    input.addEventListener('focus', () => {
        if (input.value.trim().length > 0) {
            dropdown.classList.add('open');
        }
    });
});

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderNavSearchSuggestions(query, targetDropdown) {
    if (!targetDropdown) return;
    const cleanQuery = query.trim().toLowerCase();
    
    if (cleanQuery.length === 0) {
        targetDropdown.classList.remove('open');
        return;
    }

    targetDropdown.classList.add('open');
    targetDropdown.innerHTML = '';

    const matches = [];
    const exactRegex = new RegExp(escapeRegExp(cleanQuery), 'i');

    for (const item of searchIndex) {
        if (exactRegex.test(item.Nama_Tempat) || exactRegex.test(item.Kategori)) {
            matches.push(item);
        }
        if (matches.length >= 8) break;
    }

    let html = '';

    if (matches.length < 3) {
        const autocorrectSuggestion = findTypoAutocorrect(cleanQuery, searchIndex);
        if (autocorrectSuggestion && !matches.some(m => m.Id_Tempat === autocorrectSuggestion.Id_Tempat)) {
            html += `
                <div class="autocomplete-autocorrect-banner" style="padding: 8px 12px; background: rgba(20,184,166,0.1); color: var(--teal-700); font-size: 12px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid rgba(20,184,166,0.2);">
                    <span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span>
                    <span>Maksud Anda: <strong style="cursor:pointer; text-decoration:underline;" onclick='triggerNavAutocorrectClick(${JSON.stringify(autocorrectSuggestion).replace(/"/g, '&quot;')})'>${autocorrectSuggestion.Nama_Tempat}</strong>?</span>
                </div>
            `;
        }
    }

    if (matches.length === 0 && html === '') {
        targetDropdown.innerHTML = `
            <div class="autocomplete-empty" style="padding: 16px; text-align: center; color: var(--slate-400);">
                <span class="material-symbols-outlined" style="font-size: 24px;">search_off</span>
                <h5 style="margin: 4px 0 2px; font-size: 13px; color: var(--slate-600);">Tidak Ada Hasil</h5>
                <p style="margin: 0; font-size: 11px;">Cobalah kata kunci lain seperti "bromo", "hotel", atau "sate".</p>
            </div>
        `;
        return;
    }

    html += `<div class="autocomplete-section-title" style="padding: 8px 12px; font-size: 10px; font-weight: 800; color: var(--slate-400); text-transform: uppercase;">Hasil Pencarian</div>`;

    matches.forEach(item => {
        const priceFormatted = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';
        const hasImg = item.Gambar && item.Gambar.length > 0;
        
        const imgHTML = hasImg
            ? `<img class="suggestion-thumb" src="${item.Gambar[0]}" alt="${escapeRegExp(item.Nama_Tempat)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;" />
               <div class="suggestion-shimmer" style="display:none; width: 40px; height: 40px; border-radius: 6px; background: var(--slate-100);"></div>`
            : `<div class="ota-shimmer-placeholder suggestion-thumb" style="width: 40px; height: 40px; border-radius: 6px; background: var(--slate-100); display: flex; align-items: center; justify-content: center;">
                   <span class="material-symbols-outlined" style="font-size:16px;color:var(--slate-400);">landscape</span>
               </div>`;

        const highlightedName = item.Nama_Tempat.replace(
            new RegExp(`(${escapeRegExp(query)})`, 'gi'),
            '<span class="suggestion-highlight" style="color: var(--teal-600);">$1</span>'
        );

        html += `
            <div class="autocomplete-suggestion" onclick='triggerNavAutocorrectClick(${JSON.stringify(item).replace(/"/g, '&quot;')})' style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--slate-50); transition: background 0.2s;">
                ${imgHTML}
                <div class="suggestion-info" style="flex: 1; min-width: 0;">
                    <div class="suggestion-title" style="font-size: 12px; font-weight: 700; color: var(--slate-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${highlightedName}</div>
                    <div class="suggestion-meta" style="font-size: 10px; color: var(--slate-400); margin-top: 2px;">
                        <span class="suggestion-badge" style="background: var(--slate-100); padding: 1px 4px; border-radius: 4px; font-weight: 600;">${item.Kategori}</span>
                        <span>• ${item.Sub_Kategori}</span>
                    </div>
                </div>
                <div class="suggestion-price" style="font-size: 11px; font-weight: 700; color: var(--teal-600);">${priceFormatted}</div>
            </div>
        `;
    });

    targetDropdown.innerHTML = html;
}

window.triggerNavAutocorrectClick = function(item) {
    navSearchInputs.forEach(({input, dropdown}) => {
        input.value = '';
        dropdown.classList.remove('open');
    });
    openOtaDetail(item);
}
