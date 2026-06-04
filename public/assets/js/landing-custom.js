// 1. GLOBAL IMAGE ERROR HANDLER
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

// 2. LEVENSHTEIN FUZZY MATCH ALGORITHM FOR AUTOCORRECT
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
    let minDistance = 3; // Maximum typo tolerance distance

    for (const item of items) {
        const name = item.Nama_Tempat.toLowerCase();
        // Split words for fuzzy matching on single words
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

// 3. SEARCH AUTOCOMPLETE ENGINE
let searchIndex = [];
const searchInput = document.getElementById('nav-search-input');
const searchDropdown = document.getElementById('search-autocomplete-dropdown');

// Asynchronously fetch search index
fetch('/assets/search_index.json')
    .then(res => res.json())
    .then(data => {
        searchIndex = data;
    })
    .catch(err => console.error("Error loading search index:", err));

if (searchInput && searchDropdown) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        renderSearchSuggestions(query);
    });

    // Close search on clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.remove('open');
        }
    });

    // Show suggestions on focus if not empty
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            searchDropdown.classList.add('open');
        }
    });
}

function renderSearchSuggestions(query) {
    if (!searchDropdown) return;
    const cleanQuery = query.trim().toLowerCase();
    
    if (cleanQuery.length === 0) {
        searchDropdown.classList.remove('open');
        return;
    }

    searchDropdown.classList.add('open');
    searchDropdown.innerHTML = '';

    // Filter index
    const matches = [];
    const exactRegex = new RegExp(escapeRegExp(cleanQuery), 'i');

    for (const item of searchIndex) {
        if (exactRegex.test(item.Nama_Tempat) || exactRegex.test(item.Kategori)) {
            matches.push(item);
        }
        if (matches.length >= 8) break; // Limit to 8 suggestions
    }

    let html = '';

    // Check for Autocorrect Typo matches if no exact match found or low matches
    if (matches.length < 3) {
        const autocorrectSuggestion = findTypoAutocorrect(cleanQuery, searchIndex);
        if (autocorrectSuggestion && !matches.some(m => m.Id_Tempat === autocorrectSuggestion.Id_Tempat)) {
            html += `
                <div class="autocomplete-autocorrect-banner">
                    <span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span>
                    <span>Maksud Anda: <strong onclick="triggerAutocorrectClick(${JSON.stringify(autocorrectSuggestion).replace(/"/g, '&quot;')})">${autocorrectSuggestion.Nama_Tempat}</strong>?</span>
                </div>
            `;
        }
    }

    if (matches.length === 0 && html === '') {
        searchDropdown.innerHTML = `
            <div class="autocomplete-empty">
                <span class="material-symbols-outlined">search_off</span>
                <h5>Tidak Ada Hasil</h5>
                <p>Cobalah kata kunci lain seperti "bromo", "hotel", atau "sate".</p>
            </div>
        `;
        return;
    }

    html += `<div class="autocomplete-section-title">Hasil Pencarian</div>`;

    matches.forEach(item => {
        const priceFormatted = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';
        const hasImg = item.Gambar && item.Gambar.length > 0;
        
        const imgHTML = hasImg
            ? `<img class="suggestion-thumb" src="${item.Gambar[0]}" alt="${item.Nama_Tempat}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
               <div class="suggestion-shimmer" style="display:none;"></div>`
            : `<div class="ota-shimmer-placeholder suggestion-thumb">
                   <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-slate-400);">landscape</span>
               </div>`;

        // Highlight matching characters
        const highlightedName = item.Nama_Tempat.replace(
            new RegExp(`(${escapeRegExp(query)})`, 'gi'),
            '<span class="suggestion-highlight">$1</span>'
        );

        html += `
            <div class="autocomplete-suggestion" onclick='triggerAutocorrectClick(${JSON.stringify(item).replace(/"/g, '&quot;')})'>
                ${imgHTML}
                <div class="suggestion-info">
                    <div class="suggestion-title">${highlightedName}</div>
                    <div class="suggestion-meta">
                        <span class="suggestion-badge">${item.Kategori}</span>
                        <span>• ${item.Sub_Kategori}</span>
                    </div>
                </div>
                <div class="suggestion-price">${priceFormatted}</div>
            </div>
        `;
    });

    searchDropdown.innerHTML = html;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

window.triggerAutocorrectClick = function(item) {
    if (searchInput) searchInput.value = '';
    if (searchDropdown) searchDropdown.classList.remove('open');
    openOtaDetail(item);
}

function fmtRupiah(num) {
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

// 4. AUTO-SLIDING CAROUSEL CONTROLLER
const track = document.getElementById('ota-carousel-track');
const prevBtn = document.getElementById('ota-prev-btn');
const nextBtn = document.getElementById('ota-next-btn');
const filterBtns = document.querySelectorAll('.ota-toggle-btn');
const cards = document.querySelectorAll('.ota-carousel-card');

let activeFilter = 'Semua';
let visibleCards = [];
let carouselIndex = 0;
let autoSlideInterval = null;

function updateCarouselFilter(filter) {
    activeFilter = filter;
    carouselIndex = 0;
    
    // Show/hide cards matching filter
    cards.forEach(card => {
        if (filter === 'Semua' || card.dataset.category === filter) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });

    // Update cached visible cards list
    visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    
    // Reset track transform
    if (track) track.style.transform = 'translateX(0)';

    // Update next/prev buttons state
    updateArrowButtons();
}

function getCardWidth() {
    if (visibleCards.length === 0) return 0;
    const card = visibleCards[0];
    const style = window.getComputedStyle(card);
    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    // Default Gap inside track is 1.5rem (24px)
    return card.offsetWidth + 24; 
}

function slideCarousel(direction) {
    if (visibleCards.length <= 1) return;
    const cardWidth = getCardWidth();
    const containerWidth = track.parentNode.offsetWidth;
    const maxIndex = visibleCards.length - Math.floor(containerWidth / cardWidth);

    if (direction === 'next') {
        if (carouselIndex >= maxIndex) {
            carouselIndex = 0; // Wrap around to beginning
        } else {
            carouselIndex++;
        }
    } else {
        if (carouselIndex <= 0) {
            carouselIndex = maxIndex > 0 ? maxIndex : 0; // Wrap around to end
        } else {
            carouselIndex--;
        }
    }

    if (track) {
        track.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
    }
}

function updateArrowButtons() {
    if (visibleCards.length <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    } else {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    }
}

// Auto sliding runner
function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(() => {
        slideCarousel('next');
    }, 4000);
}

function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

// Attach Carousel Event listeners
if (prevBtn) prevBtn.addEventListener('click', () => { slideCarousel('prev'); startAutoSlide(); });
if (nextBtn) nextBtn.addEventListener('click', () => { slideCarousel('next'); startAutoSlide(); });

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCarouselFilter(btn.dataset.filter);
        startAutoSlide();
    });
});

// Pause sliding on Hover (hover-stop)
const wrapper = document.querySelector('.ota-carousel-wrapper');
if (wrapper) {
    wrapper.addEventListener('mouseenter', stopAutoSlide);
    wrapper.addEventListener('mouseleave', startAutoSlide);
}

// Initial setup
updateCarouselFilter('Semua');
startAutoSlide();

// Responsive resize recalculation
window.addEventListener('resize', () => {
    updateCarouselFilter(activeFilter);
});


// 5. PRODUCT DETAIL MODAL POP-UP SYSTEM
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

    // Fill text values
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

    // Custom descriptions based on categories & subcategories
    let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
    if (item.Kategori === 'Hotel') {
        desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
    } else if (item.Kategori === 'Kuliner') {
        desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
    }
    const descEl = document.getElementById('modal-place-desc');
    if (descEl) descEl.textContent = desc;

    // Maps route link
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
    const mapsLinkEl = document.getElementById('modal-gmaps-link');
    if (mapsLinkEl) mapsLinkEl.href = mapsUrl;

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

    // Check bookmark status
    const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
    const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
    const uniqueId = `${item.Kategori}_${item.Id_Tempat}`;
    const isSaved = saved.some(id => id === uniqueId || id === item.Id_Tempat);
    const saveIcon = document.getElementById('modal-save-icon');
    if (saveIcon) {
        saveIcon.textContent = isSaved ? 'bookmark_added' : 'bookmark';
        saveIcon.style.color = isSaved ? 'var(--color-primary)' : 'inherit';
    }

    // Render Images slideshow
    renderModalSlideshow();

    // Open modal overlay
    if (detailModal) detailModal.classList.add('show');
    stopAutoSlide(); // Pause main landing carousel
};

window.closeOtaDetail = function() {
    if (detailModal) detailModal.classList.remove('show');
    clearInterval(modalSlideInterval);
    startAutoSlide(); // Resume main landing carousel
};

function renderModalSlideshow() {
    if (!modalTrack || !modalIndicators) return;
    modalTrack.innerHTML = '';
    modalIndicators.innerHTML = '';
    
    const imgs = activePlace.Gambar || [];
    
    if (imgs.length === 0) {
        // Show animated placeholder
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

    // Add Slides
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

    // Set slide bounds
    window.slideModalTo(0);
    
    // Auto slide inside modal
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

    // Update Indicators
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

// Attach modal gallery listeners
if (modalPrev) modalPrev.addEventListener('click', () => { slideModalPrev(); clearInterval(modalSlideInterval); });
if (modalNext) modalNext.addEventListener('click', () => { slideModalNext(); clearInterval(modalSlideInterval); });

// Bookmark saved toggle
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

// 6. HERO RANDOM AUTO-SLIDING BACKGROUND SLIDESHOW (CINEMATIC DOUBLE-BUFFER CROSS-FADE)
function initHeroSlideshow() {
    const container = document.querySelector('.hero-bg-container');
    const slide1 = document.querySelector('.bg-slide-1');
    const slide2 = document.querySelector('.bg-slide-2');
    if (!container || !slide1 || !slide2) return;

    let heroImages = [];
    try {
        heroImages = JSON.parse(container.getAttribute('data-images') || '[]');
    } catch (e) {
        console.error("Error parsing hero images from server:", e);
    }

    function runSlideshow(images) {
        if (!images || images.length <= 1) return;
        
        let currentIndex = 0;
        let isSlide1Active = true;

        // Adjust initial style filters to ensure optimum readability for text overlays
        slide1.style.filter = "brightness(0.58) saturate(0.85) contrast(1.02)";
        slide2.style.filter = "brightness(0.58) saturate(0.85) contrast(1.02)";

        setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length;
            const nextImg = images[currentIndex];

            if (isSlide1Active) {
                // Load image to slide2 (hidden), fade it in, fade slide1 out
                slide2.style.backgroundImage = `url('${nextImg}')`;
                slide2.style.opacity = '1';
                slide1.style.opacity = '0';
            } else {
                // Load image to slide1 (hidden), fade it in, fade slide2 out
                slide1.style.backgroundImage = `url('${nextImg}')`;
                slide1.style.opacity = '1';
                slide2.style.opacity = '0';
            }
            isSlide1Active = !isSlide1Active;
        }, 6000); // Cinematic cross-fade every 6 seconds
    }

    if (heroImages.length > 1) {
        runSlideshow(heroImages);
    } else {
        // Client-side fallback if server-side data is empty
        let checkInterval = setInterval(() => {
            if (searchIndex && searchIndex.length > 0) {
                clearInterval(checkInterval);
                
                const wisataWithImgs = searchIndex.filter(item => item.Kategori === 'Wisata' && item.Gambar && item.Gambar.length > 0);
                if (wisataWithImgs.length === 0) return;

                const selectedSpots = [];
                const tempIndex = [...wisataWithImgs];
                for (let i = 0; i < Math.min(5, wisataWithImgs.length); i++) {
                    const randIdx = Math.floor(Math.random() * tempIndex.length);
                    selectedSpots.push(tempIndex.splice(randIdx, 1)[0]);
                }
                const imgs = selectedSpots.map(s => s.Gambar[0]);
                
                slide1.style.backgroundImage = `url('${imgs[0]}')`;
                runSlideshow(imgs);
            }
        }, 100);
    }
}
initHeroSlideshow();

// Close on clicking backdrop overlay
if (detailModal) {
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeOtaDetail();
    });
}
