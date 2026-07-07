// ─────────────────────────────────────────────────
// Utilities (Globally accessible)
// ─────────────────────────────────────────────────
const fmtRp = n => {
    if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};
const parseIdr = str => {
    if (!str) return 0;
    const cleaned = String(str).replace(/\./g, '').replace(/,.*$/, '');
    return parseInt(cleaned, 10) || 0;
};
const escapeHtmlAttr = str => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

window.handleImgErrorRecom = function (el, icon) {
    if (el.dataset.fallbackTriggered) return;
    el.dataset.fallbackTriggered = "true";
    const parent = el.parentNode;
    if (parent) {
        parent.innerHTML = `
            <div class="ota-shimmer-placeholder-recom">
                <span class="material-symbols-outlined" style="font-size:16px;">${icon}</span>
            </div>
        `;
    }
};

// Wrap everything else in DOMContentLoaded to ensure safe element parsing
document.addEventListener('DOMContentLoaded', () => {
    let activeWorkflow = 'budget';
    let allOptions = [];
    let searchIndex = [];
    let isSyncingBudget = false; // TAHAP 11: State sinkronisasi untuk integrasi response

    // Personalization Initialization
    function initPersonalization() {
        const presets = {
            balanced: { hemat: 33, balanced: 33, premium: 34 },
            backpacker: { hemat: 80, balanced: 20, premium: 0 },
            luxury: { hemat: 0, balanced: 30, premium: 70 },
            custom: null
        };

        ['b', 'f', 'd'].forEach(prefix => {
            // Preset buttons click handlers
            document.querySelectorAll(`.preset-btn[data-prefix="${prefix}"]`).forEach(btn => {
                btn.addEventListener('click', function () {
                    // Update active state
                    document.querySelectorAll(`.preset-btn[data-prefix="${prefix}"]`).forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    const presetType = this.dataset.preset;
                    const sliderPanel = document.getElementById(`${prefix}-personalization-sliders`);

                    if (presetType === 'custom') {
                        if (sliderPanel) {
                            sliderPanel.style.display = 'flex';
                        }
                    } else {
                        if (sliderPanel) {
                            sliderPanel.style.display = 'none';
                        }
                        const values = presets[presetType];
                        if (values) {
                            const sh = document.getElementById(`${prefix}-pref-hemat`);
                            const sb = document.getElementById(`${prefix}-pref-balanced`);
                            const sp = document.getElementById(`${prefix}-pref-premium`);
                            if (sh) { sh.value = values.hemat; document.getElementById(`${prefix}-pref-hemat-val`).innerText = values.hemat + '%'; }
                            if (sb) { sb.value = values.balanced; document.getElementById(`${prefix}-pref-balanced-val`).innerText = values.balanced + '%'; }
                            if (sp) { sp.value = values.premium; document.getElementById(`${prefix}-pref-premium-val`).innerText = values.premium + '%'; }
                        }
                    }
                });
            });

            // Sliders input change handlers
            ['hemat', 'balanced', 'premium'].forEach(attr => {
                const slider = document.getElementById(`${prefix}-pref-${attr}`);
                const valText = document.getElementById(`${prefix}-pref-${attr}-val`);
                if (slider && valText) {
                    slider.addEventListener('input', function () {
                        valText.innerText = this.value + '%';
                        // Switch preset button to custom since user manually dragged a slider
                        const customBtn = document.querySelector(`.preset-btn[data-preset="custom"][data-prefix="${prefix}"]`);
                        if (customBtn) {
                            document.querySelectorAll(`.preset-btn[data-prefix="${prefix}"]`).forEach(b => b.classList.remove('active'));
                            customBtn.classList.add('active');
                        }
                    });
                }
            });
        });
    }

    initPersonalization();

    // Helper: Resolve real names of places to strip generic labels and get correct locations
    const resolveRealName = (label, pkg) => {
        if (!label) return "";
        const dayMatch = label.match(/\(Hari (\d+)\)/i);
        const dayNum = dayMatch ? parseInt(dayMatch[1]) : 1;
        const dayItin = pkg.itinerary?.find(d => d.day === dayNum);
        const cleanLabel = label.replace(/\s*\(Hari \d+\)/gi, '').trim().toLowerCase();

        if (cleanLabel.includes('wisata')) {
            return dayItin ? dayItin.wisata : pkg.wisata_nama;
        }
        if (cleanLabel.includes('makan pagi') || cleanLabel.includes('pagi')) {
            return (dayItin && dayItin.kuliner_pagi !== 'N/A') ? dayItin.kuliner_pagi : (pkg.kuliner_pagi_nama || 'Kopi Lonceng');
        }
        if (cleanLabel.includes('makan siang') || cleanLabel.includes('siang') || cleanLabel.includes('kuliner')) {
            return dayItin ? dayItin.kuliner : pkg.kuliner_nama;
        }
        if (cleanLabel.includes('makan malam') || cleanLabel.includes('malam')) {
            return (dayItin && dayItin.kuliner_malam !== 'N/A') ? dayItin.kuliner_malam : (pkg.kuliner_malam_nama || '');
        }
        if (cleanLabel.includes('hotel') || cleanLabel.includes('akomodasi')) {
            if (dayItin && dayItin.hotel && dayItin.hotel !== 'Checkout') {
                return dayItin.hotel;
            }
            return pkg.hotel_nama_real || pkg.hotel_nama || "";
        }
        return label;
    };

    // Helper: Resolve coordinates of places to get exact lat,lon
    const resolveCoords = (label, pkg) => {
        if (!label) return "";
        const dayMatch = label.match(/\(Hari (\d+)\)/i);
        const dayNum = dayMatch ? parseInt(dayMatch[1]) : 1;
        const dayItin = pkg.itinerary?.find(d => d.day === dayNum);
        const cleanLabel = label.replace(/\s*\(Hari \d+\)/gi, '').trim().toLowerCase();

        let lat = 0, lon = 0;
        if (cleanLabel.includes('wisata')) {
            lat = dayItin ? (dayItin.wisata_lat || 0) : (pkg.wisata_lat || 0);
            lon = dayItin ? (dayItin.wisata_lon || 0) : (pkg.wisata_lon || 0);
        } else if (cleanLabel.includes('makan pagi') || cleanLabel.includes('pagi')) {
            lat = dayItin ? (dayItin.kuliner_pagi_lat || 0) : (pkg.kuliner_pagi_lat || 0);
            lon = dayItin ? (dayItin.kuliner_pagi_lon || 0) : (pkg.kuliner_pagi_lon || 0);
        } else if (cleanLabel.includes('makan siang') || cleanLabel.includes('siang') || cleanLabel.includes('kuliner')) {
            lat = dayItin ? (dayItin.kuliner_lat || 0) : (pkg.kuliner_lat || 0);
            lon = dayItin ? (dayItin.kuliner_lon || 0) : (pkg.kuliner_lon || 0);
        } else if (cleanLabel.includes('makan malam') || cleanLabel.includes('malam')) {
            lat = dayItin ? (dayItin.kuliner_malam_lat || 0) : (pkg.kuliner_malam_lat || 0);
            lon = dayItin ? (dayItin.kuliner_malam_lon || 0) : (pkg.kuliner_malam_lon || 0);
        } else if (cleanLabel.includes('hotel') || cleanLabel.includes('akomodasi')) {
            if (dayItin && dayItin.hotel && dayItin.hotel !== 'Checkout') {
                lat = dayItin.hotel_lat || pkg.hotel_lat || 0;
                lon = dayItin.hotel_lon || pkg.hotel_lon || 0;
            } else {
                lat = pkg.hotel_lat || 0;
                lon = pkg.hotel_lon || 0;
            }
        }
        if (lat && lon) {
            return `${lat},${lon}`;
        }
        return "";
    };

    // Helper: Rebuild card transport legs list dynamically with extra destinations
    function rebuildCardLegsHTML(pkg, extraDests = []) {
        const originalLegs = pkg.transport_detail?.legs || [];
        const planLegs = [];

        originalLegs.forEach(l => {
            planLegs.push({
                from: resolveRealName(l.from, pkg),
                to: resolveRealName(l.to, pkg),
                distance_km: l.distance_km,
                cost: l.cost
            });

            if (l.from?.startsWith("Wisata")) {
                const match = l.from.match(/Hari (\d+)/);
                const dayNum = match ? parseInt(match[1], 10) : 1;
                const ed = extraDests[dayNum - 1];
                if (ed) {
                    const prevLeg = planLegs[planLegs.length - 1];
                    if (prevLeg) {
                        prevLeg.to = ed.nama;
                        prevLeg.distance_km = ed.distance_km;
                        prevLeg.cost = Math.round(ed.distance_km * 500);
                    }

                    planLegs.push({
                        from: ed.nama,
                        to: resolveRealName(l.to, pkg),
                        distance_km: 2.0,
                        cost: 1000
                    });
                }
            }
        });

        return planLegs.map(l => `
            <div class="transport-leg-row" style="align-items:flex-start; gap:4px;">
                <span style="flex:1; min-width:0; word-break:break-word; line-height:1.3;">${l.from} → ${l.to} (${l.distance_km?.toFixed(1)} km)</span>
                <span style="flex-shrink:0;">${fmtRp(l.cost)}</span>
            </div>
        `).join('');
    }

    // Helper to turn native select dropdowns into beautiful custom dropdowns
    function initializeCustomSelects() {
        function getOptionGraphic(val, text) {
            const textLower = text.toLowerCase();
            const valLower = String(val).toLowerCase();

            // Otomatis / AI
            if (valLower === '' && textLower.includes('otomatis')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#ai-grad)" />
  <path d="M12 6L13.5 9.5L17 11L13.5 12.5L12 16L10.5 12.5L7 11L10.5 9.5L12 6Z" fill="white"/>
  <path d="M6 16L6.75 17.75L8.5 18.5L6.75 19.25L6 21L5.25 19.25L3.5 18.5L5.25 17.75L6 16Z" fill="white" opacity="0.8"/>
  <path d="M18 4L18.5 5.5L20 6L18.5 6.5L18 8L17.5 6.5L16 6L17.5 5.5L18 4Z" fill="white" opacity="0.8"/>
  <defs>
    <linearGradient id="ai-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            // Motor
            if (valLower === 'motor' || textLower.includes('motor')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#motor-grad)" />
  <path d="M19 12H17.56L15.34 8.67C15.01 8.18 14.45 7.88 13.86 7.88H10.5V6.5C10.5 5.95 10.05 5.5 9.5 5.5C8.95 5.5 8.5 5.95 8.5 6.5V7.88H5C3.9 7.88 3 8.78 3 9.88V12C3 13.1 3.9 14 5 14H6.18C6.6 15.17 7.7 16 9 16C10.3 16 11.4 15.17 11.82 14H15.18C15.6 15.17 16.7 16 18 16C19.3 16 20.4 15.17 20.82 14H21C21.55 14 22 13.55 22 13C22 12.45 21.55 12 21 12H19ZM9 14.5C8.17 14.5 7.5 13.83 7.5 13C7.5 12.17 8.17 11.5 9 11.5C9.83 11.5 10.5 12.17 10.5 13C10.5 13.83 9.83 14.5 9 14.5ZM18 14.5C17.17 14.5 16.5 13.83 16.5 13C16.5 12.17 17.17 11.5 18 11.5C18.83 11.5 19.5 12.17 19.5 13C19.5 13.83 18.83 14.5 18 14.5Z" fill="white"/>
  <defs>
    <linearGradient id="motor-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10b981"/>
      <stop offset="1" stop-color="#047857"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            // Mobil Standard
            if (valLower === 'mobil' || (textLower.includes('gocar') && !textLower.includes('xl')) || textLower.includes('standard')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#car-grad)" />
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.29 5.42 5.08 6.01L3 12V19C3 19.55 3.45 20 4 20H5C5.55 20 6 19.55 6 19V18H18V19C18 19.55 18.45 20 19 20H20C20.55 20 21 19.55 21 19V12L18.92 6.01ZM6.5 16C5.67 16 5 15.33 5 14.5C5 13.67 5.67 13 6.5 13C7.33 13 8 13.67 8 14.5C8 15.33 7.33 16 6.5 16ZM17.5 16C16.67 16 16 15.33 16 14.5C16 13.67 16.67 13 17.5 13C18.33 13 19 13.67 19 14.5C19 15.33 18.33 16 17.5 16ZM5 11L6.5 6.5H17.5L19 11H5Z" fill="white"/>
  <defs>
    <linearGradient id="car-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            // Mobil XL
            if (valLower === 'mobil_xl' || textLower.includes('xl') || textLower.includes('gocar xl')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#car-xl-grad)" />
  <path d="M17 5H7C5.9 5 5 5.9 5 7V17C5 17.55 5.45 18 6 18H7C7.55 18 8 17.55 8 17V16H16V17C16 17.55 16.45 18 17 18H18C18.55 18 19 17.55 19 17V7C19 5.9 18.1 5 17 5ZM8.5 14C7.67 14 7 13.33 7 12.5C7 11.67 7.67 11 8.5 11C9.33 11 10 11.67 10 12.5C10 13.33 9.33 14 8.5 14ZM15.5 14C14.67 14 14 13.33 14 12.5C14 11.67 14.67 11 15.5 11C16.33 11 17 11.67 17 12.5C17 13.33 16.33 14 15.5 14ZM6.5 9H17.5V6.5H6.5V9Z" fill="white"/>
  <defs>
    <linearGradient id="car-xl-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            // Same Hotel
            if (valLower === 'same' || textLower.includes('sama') || textLower.includes('stay') || textLower.includes('same')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#hotel-same-grad)" />
  <path d="M7 13H9V15H7V13ZM7 9H9V11H7V9ZM7 5H9V7H7V5ZM11 13H13V15H11V13ZM11 9H13V11H11V9ZM11 5H13V7H11V5ZM15 13H17V15H15V13ZM15 9H17V11H15V9ZM15 5H17V7H15V5ZM19 3H5C3.9 3 3 3.9 3 5V19C3 19.55 3.45 20 4 20H20C20.55 20 21 19.55 21 19V5C21 3.9 20.1 3 19 3ZM19 18H5V5H19V18Z" fill="white"/>
  <defs>
    <linearGradient id="hotel-same-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            // Split Hotel
            if (valLower === 'split' || textLower.includes('pindah') || textLower.includes('split')) {
                return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
  <rect width="24" height="24" rx="6" fill="url(#hotel-split-grad)" />
  <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" fill="white"/>
  <defs>
    <linearGradient id="hotel-split-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ec4899"/>
      <stop offset="1" stop-color="#db2777"/>
    </linearGradient>
  </defs>
</svg>`;
            }
            return '';
        }

        document.querySelectorAll('select.form-input-select').forEach(selectEl => {
            if (selectEl.dataset.customized || selectEl.id === 'ai-alternatives-select') return;
            selectEl.dataset.customized = 'true';

            selectEl.style.display = 'none';

            const container = document.createElement('div');
            container.className = 'custom-select-dropdown-container';
            container.style.cssText = 'position: relative; width: 100%;';

            const options = Array.from(selectEl.options);
            const activeOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
            const selectedLabel = activeOption ? activeOption.text : '';
            const activeGraphic = activeOption ? getOptionGraphic(activeOption.value, activeOption.text) : '';

            let menuItemsHTML = options.map((opt, i) => {
                const isSelected = selectEl.selectedIndex === i;
                const optGraphic = getOptionGraphic(opt.value, opt.text);
                return `
                    <button type="button" class="custom-select-item ${isSelected ? 'active' : ''}" data-value="${opt.value}">
                        <div class="trigger-inner">
                            ${optGraphic ? optGraphic : ''}
                            <span class="item-text-span">${opt.text}</span>
                        </div>
                        ${isSelected ? '<span class="material-symbols-outlined check-icon">check_circle</span>' : ''}
                    </button>
                `;
            }).join('');

            container.innerHTML = `
                <button type="button" class="custom-select-trigger">
                    <div class="trigger-inner">
                        <span class="trigger-prefix-icon">
                            ${activeGraphic ? activeGraphic : ''}
                        </span>
                        <span class="custom-select-trigger-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${selectedLabel}</span>
                    </div>
                    <span class="material-symbols-outlined select-arrow-icon">expand_more</span>
                </button>
                
                <div class="custom-select-menu">
                    ${menuItemsHTML}
                </div>
            `;

            selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

            const triggerBtn = container.querySelector('.custom-select-trigger');
            const menuList = container.querySelector('.custom-select-menu');
            const arrowIcon = triggerBtn.querySelector('.select-arrow-icon');

            triggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = menuList.classList.contains('open');

                // Close other open custom select menus
                document.querySelectorAll('.custom-select-menu').forEach(m => {
                    if (m !== menuList) {
                        m.classList.remove('open');
                        m.style.display = 'none';
                    }
                });
                document.querySelectorAll('.select-arrow-icon').forEach(a => {
                    if (a !== arrowIcon) a.style.transform = 'rotate(0deg)';
                });

                if (isOpen) {
                    menuList.classList.remove('open');
                    menuList.style.display = 'none';
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
                } else {
                    menuList.classList.add('open');
                    menuList.style.display = 'flex';
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(180deg)';
                }
            });

            menuList.querySelectorAll('.custom-select-item').forEach((itemEl, idx) => {
                itemEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuList.classList.remove('open');
                    menuList.style.display = 'none';
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';

                    container.querySelector('.custom-select-trigger-text').textContent = itemEl.querySelector('span').textContent;

                    // Update trigger icon
                    const triggerIcon = triggerBtn.querySelector('.trigger-prefix-icon');
                    const optionIcon = itemEl.querySelector('svg');
                    if (triggerIcon) {
                        triggerIcon.innerHTML = optionIcon ? optionIcon.outerHTML : '';
                    }

                    menuList.querySelectorAll('.custom-select-item').forEach(btn => {
                        btn.classList.remove('active');
                        const checkIcon = btn.querySelector('.check-icon');
                        checkIcon?.remove();
                    });
                    itemEl.classList.add('active');

                    const checkSpan = document.createElement('span');
                    checkSpan.className = 'material-symbols-outlined check-icon';
                    checkSpan.textContent = 'check_circle';
                    itemEl.appendChild(checkSpan);

                    selectEl.selectedIndex = idx;
                    selectEl.dispatchEvent(new Event('change'));
                });
            });
        });

        // Document click to close all custom select menus
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.custom-select-menu').forEach(m => {
                m.classList.remove('open');
                m.style.display = 'none';
            });
            document.querySelectorAll('.select-arrow-icon').forEach(a => a.style.transform = 'rotate(0deg)');

            // Close searchable suggestions on clicking outside (from custom planner wizard)
            document.querySelectorAll('.custom-search-select-dropdown').forEach(dropdownEl => {
                const triggerEl = dropdownEl.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger');
                if (dropdownEl && triggerEl && !triggerEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                    dropdownEl.style.display = 'none';
                }
            });
        });
    }

    // Initialize custom selects immediately on load
    initializeCustomSelects();

    // Asynchronously fetch search index
    fetch('/assets/search_index.json')
        .then(res => res.json())
        .then(data => {
            searchIndex = data;
            initDestinationFirstSearch();
        })
        .catch(err => console.error("Error loading search index:", err));

    // Levenshtein and fuzzy match spelling autocorrect helpers
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

    function findTypoAutocorrect(query, items, nameKey = 'Nama_Tempat') {
        if (query.length < 3) return null;
        const cleanQuery = query.toLowerCase().trim();
        const queryWords = cleanQuery.split(/\s+/).filter(w => w.length >= 2);

        let bestMatch = null;
        let bestScore = 999;

        for (const item of items) {
            const name = (item[nameKey] || '').toLowerCase();
            if (!name) continue;

            const itemWords = name.split(/\s+/).filter(w => w.length >= 2);

            if (queryWords.length === 1) {
                const qWord = queryWords[0];
                for (const iWord of itemWords) {
                    const dist = levenshteinDistance(qWord, iWord);
                    if (dist < 3 && dist < bestScore) {
                        bestScore = dist;
                        bestMatch = item;
                    }
                }
            } else {
                let totalDist = 0;
                let matchedAll = true;

                for (const qWord of queryWords) {
                    let minWordDist = 999;
                    for (const iWord of itemWords) {
                        const dist = levenshteinDistance(qWord, iWord);
                        if (dist < minWordDist) {
                            minWordDist = dist;
                        }
                    }
                    if (minWordDist > 2) {
                        matchedAll = false;
                        break;
                    }
                    totalDist += minWordDist;
                }

                if (matchedAll && totalDist < bestScore) {
                    bestScore = totalDist;
                    bestMatch = item;
                }
            }
        }
        return bestMatch;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightQueryMatch(name, query) {
        if (!query || query.trim() === '') return name;
        const cleanQuery = escapeRegExp(query.trim());
        return name.replace(new RegExp(`(${cleanQuery})`, 'gi'), '<span class="suggestion-highlight">$1</span>');
    }

    function initDestinationFirstSearch() {
        const searchInput = document.getElementById('d-dest-search-input');
        const searchDropdown = document.getElementById('d-dest-autocomplete-dropdown');

        if (!searchInput || !searchDropdown) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            renderDestinationSuggestions(query);
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
                renderDestinationSuggestions(searchInput.value);
            }
        });
    }

    function renderDestinationSuggestions(query) {
        const searchDropdown = document.getElementById('d-dest-autocomplete-dropdown');
        if (!searchDropdown) return;

        const cleanQuery = query.trim().toLowerCase();
        if (cleanQuery.length === 0) {
            searchDropdown.classList.remove('open');
            return;
        }

        searchDropdown.classList.add('open');
        searchDropdown.innerHTML = '';

        const matches = [];
        const exactRegex = new RegExp(escapeRegExp(cleanQuery), 'i');

        // Only search tourist items for Destination-First (Wisata)
        const wisataItems = searchIndex.filter(item => (item.Kategori || '').toLowerCase() === 'wisata');

        for (const item of wisataItems) {
            if (exactRegex.test(item.Nama_Tempat) || exactRegex.test(item.Sub_Kategori)) {
                matches.push(item);
            }
            if (matches.length >= 8) break;
        }

        let html = '';

        if (matches.length < 3) {
            const autocorrectSuggestion = findTypoAutocorrect(cleanQuery, wisataItems, 'Nama_Tempat');
            if (autocorrectSuggestion && !matches.some(m => m.Id_Tempat === autocorrectSuggestion.Id_Tempat)) {
                html += `
                    <div class="autocomplete-autocorrect-banner">
                        <span class="material-symbols-outlined" style="font-size:16px;">auto_awesome</span>
                        <span>Maksud Anda: <strong class="destination-autocorrect-link" data-id="${autocorrectSuggestion.Id_Tempat}" data-name="${escapeHtmlAttr(autocorrectSuggestion.Nama_Tempat)}">${autocorrectSuggestion.Nama_Tempat}</strong>?</span>
                    </div>
                `;
            }
        }

        if (matches.length === 0 && html === '') {
            searchDropdown.innerHTML = `
                <div class="autocomplete-empty">
                    <span class="material-symbols-outlined">search_off</span>
                    <h5>Tidak Ada Hasil</h5>
                    <p>Cobalah kata kunci destinasi lain seperti "bromo", "jatim park", atau "coban".</p>
                </div>
            `;
            return;
        }

        html += `<div class="autocomplete-section-title">Hasil Pencarian Wisata</div>`;

        matches.forEach(item => {
            const priceFormatted = item.Estimasi_Harga > 0 ? fmtRp(item.Estimasi_Harga) : 'Gratis';
            const hasImg = item.Gambar && item.Gambar.length > 0;

            const imgHTML = hasImg
                ? `<img class="suggestion-thumb" src="${item.Gambar[0]}" alt="${escapeHtmlAttr(item.Nama_Tempat)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                   <div class="suggestion-shimmer" style="display:none;"></div>`
                : `<div class="ota-shimmer-placeholder suggestion-thumb">
                       <span class="material-symbols-outlined" style="font-size:16px;color:var(--color-slate-400);">landscape</span>
                   </div>`;

            const highlightedName = highlightQueryMatch(item.Nama_Tempat, query);

            html += `
                <div class="autocomplete-suggestion destination-suggestion-item" 
                     data-id="${item.Id_Tempat}" 
                     data-name="${escapeHtmlAttr(item.Nama_Tempat)}">
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

        searchDropdown.querySelectorAll('.destination-suggestion-item').forEach(itemEl => {
            itemEl.addEventListener('click', () => {
                const id = itemEl.dataset.id;
                const name = itemEl.dataset.name;
                selectDestinationItem(id, name);
            });
        });

        searchDropdown.querySelectorAll('.destination-autocorrect-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = link.dataset.id;
                const name = link.dataset.name;
                selectDestinationItem(id, name);
            });
        });
    }

    function selectDestinationItem(id, name) {
        const searchInput = document.getElementById('d-dest-search-input');
        const hiddenId = document.getElementById('d-dest-id');
        const searchDropdown = document.getElementById('d-dest-autocomplete-dropdown');

        if (searchInput && hiddenId) {
            searchInput.value = name;
            hiddenId.value = id;
        }

        if (searchDropdown) {
            searchDropdown.classList.remove('open');
        }

        onBudgetChange();
    }

    function renderSearchSelectSuggestions(triggerEl) {
        const dropdownEl = triggerEl.closest('.custom-dropdown-wrap')?.querySelector('.custom-search-select-dropdown');
        if (!dropdownEl) return;

        const type = triggerEl.dataset.type;
        const classIdx = parseInt(triggerEl.dataset.classIdx);
        const dayNum = parseInt(triggerEl.dataset.day || 1);
        const nightNum = parseInt(triggerEl.dataset.night || 1);

        let alts = [];
        if (type === 'hotel' || type === 'split-hotel') {
            alts = getAlternatives('hotel', classIdx);
        } else if (type === 'wisata') {
            alts = getWisataAlternativesForTier(classIdx, dayNum);
        } else if (type === 'kuliner' || type === 'kuliner_pagi' || type === 'kuliner_malam') {
            alts = getKulinerAlternativesForTier(classIdx, dayNum);
        }

        const pkg = activeOptionPackages[classIdx];
        if (!pkg) return;

        const duration = pkg.duration;
        const persons = pkg.num_persons;
        const nights = duration - 1;

        // Compute Hotel coordinates for dayNum
        let currentHotel = null;
        let nextHotel = null;
        if (nights > 0) {
            if (hotelMode === 'same') {
                currentHotel = selectedHotel || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0, nama: pkg.hotel_nama || '' };
                nextHotel = currentHotel;
            } else {
                const getHotelN = (n) => { return selectedHotelsByNight[n] || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0, nama: pkg.hotel_nama || '' }; };
                currentHotel = getHotelN(dayNum - 1) || getHotelN(dayNum);
                nextHotel = getHotelN(dayNum) || getHotelN(dayNum - 1);
            }
        }
        const chLat = currentHotel ? (currentHotel.lat || 0) : 0;
        const chLon = currentHotel ? (currentHotel.lon || 0) : 0;
        const nhLat = nextHotel ? (nextHotel.lat || 0) : chLat;
        const nhLon = nextHotel ? (nextHotel.lon || 0) : chLon;

        // Compute day plan coordinates
        const dayPlan = selectedDays[dayNum];
        let dayItin = pkg.itinerary?.find(it => it.day === dayNum) || {
            wisata: pkg.wisata_nama,
            wisata_harga: pkg.wisata_harga,
            wisata_lat: pkg.wisata_lat || 0,
            wisata_lon: pkg.wisata_lon || 0,
            kuliner: pkg.kuliner_nama,
            kuliner_harga: pkg.kuliner_harga,
            kuliner_lat: pkg.kuliner_lat || 0,
            kuliner_lon: pkg.kuliner_lon || 0,
            kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
            kuliner_pagi_harga: pkg.kuliner_pagi_harga || 0,
            kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0,
            kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
            kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A',
            kuliner_malam_harga: pkg.kuliner_malam_harga || 0,
            kuliner_malam_lat: pkg.kuliner_malam_lat || 0,
            kuliner_malam_lon: pkg.kuliner_malam_lon || 0
        };

        const wLat = dayPlan ? dayPlan.wisata_lat : (dayItin.wisata_lat || pkg.wisata_lat || 0);
        const wLon = dayPlan ? dayPlan.wisata_lon : (dayItin.wisata_lon || pkg.wisata_lon || 0);
        const kpLat = dayPlan ? dayPlan.kuliner_pagi_lat : (dayItin.kuliner_pagi_lat || pkg.kuliner_pagi_lat || 0);
        const kpLon = dayPlan ? dayPlan.kuliner_pagi_lon : (dayItin.kuliner_pagi_lon || pkg.kuliner_pagi_lon || 0);
        const ksLat = dayPlan ? dayPlan.kuliner_lat : (dayItin.kuliner_lat || pkg.kuliner_lat || 0);
        const ksLon = dayPlan ? dayPlan.kuliner_lon : (dayItin.kuliner_lon || pkg.kuliner_lon || 0);
        const kmLat = dayPlan ? dayPlan.kuliner_malam_lat : (dayItin.kuliner_malam_lat || pkg.kuliner_malam_lat || 0);
        const kmLon = dayPlan ? dayPlan.kuliner_malam_lon : (dayItin.kuliner_malam_lon || pkg.kuliner_malam_lon || 0);

        let anchorLat = 0, anchorLon = 0, anchorName = '';
        if (type === 'wisata') {
            anchorLat = chLat;
            anchorLon = chLon;
            anchorName = currentHotel ? currentHotel.nama : '';
        } else if (type === 'kuliner' || type === 'kuliner_pagi' || type === 'kuliner_malam') {
            anchorLat = wLat;
            anchorLon = wLon;
            anchorName = dayPlan ? dayPlan.wisata : (dayItin.wisata || '');
        }

        let visibleAlts = JSON.parse(JSON.stringify(alts));

        visibleAlts.forEach(item => {
            const itemLat = item.lat || item.Latitude || 0;
            const itemLon = item.lon || item.Longitude || 0;
            if (anchorLat && anchorLon && itemLat && itemLon) {
                item.distFromAnchor = haversineDist(anchorLat, anchorLon, itemLat, itemLon);
            } else {
                item.distFromAnchor = 9999;
            }
        });

        visibleAlts.sort((a, b) => a.distFromAnchor - b.distFromAnchor);

        let budgetLimit = 0;
        if (activeWorkflow === 'budget') {
            budgetLimit = getRawBudget('b-budget');
        } else if (activeWorkflow === 'destination') {
            budgetLimit = getRawBudget('d-budget');
        }
        const hasBudget = budgetLimit > 0;

        if (hasBudget) {
            visibleAlts.forEach(item => {
                const itemHarga = item.harga || item.Estimasi_Harga || 0;
                let hypAccCost = 0;
                let hypWisCost = 0;
                let hypKulCost = 0;

                // 1. Calculate accommodation cost for this prospective choice
                if (nights > 0) {
                    if (hotelMode === 'same') {
                        if (type === 'hotel') {
                            hypAccCost = itemHarga * nights * pkg.num_rooms;
                        } else {
                            hypAccCost = selectedHotel ? selectedHotel.cost : 0;
                        }
                    } else {
                        for (let n = 1; n <= nights; n++) {
                            if (type === 'split-hotel' && nightNum === n) {
                                hypAccCost += itemHarga * pkg.num_rooms;
                            } else {
                                const activeN = selectedHotelsByNight[n];
                                if (activeN) {
                                    hypAccCost += activeN.cost;
                                }
                            }
                        }
                    }
                }

                // 2. Calculate Wisata cost (Day 1 only)
                if (type === 'wisata') {
                    if (dayNum === 1) {
                        hypWisCost = itemHarga * persons;
                    }
                } else {
                    const activeDay1 = selectedDays[1];
                    if (activeDay1) {
                        hypWisCost = activeDay1.wisata_harga * persons;
                    }
                }

                // 3. Calculate Kuliner cost dynamically
                for (let d = 1; d <= duration; d++) {
                    const isDayCheckoutOrODT = (duration === 1 || d === duration);
                    let pagi = 0, siang = 0, malam = 0;

                    if (d === dayNum) {
                        const activeD = selectedDays[d];
                        if (type === 'kuliner_pagi') {
                            pagi = itemHarga;
                            siang = activeD ? activeD.kuliner_harga : (dayItin.kuliner_harga || pkg.kuliner_harga || 0);
                            malam = isDayCheckoutOrODT ? 0 : (activeD ? activeD.kuliner_malam_harga : (dayItin.kuliner_malam_harga || pkg.kuliner_malam_harga || 0));
                        } else if (type === 'kuliner') {
                            pagi = activeD ? activeD.kuliner_pagi_harga : (dayItin.kuliner_pagi_harga || 0);
                            siang = itemHarga;
                            malam = isDayCheckoutOrODT ? 0 : (activeD ? activeD.kuliner_malam_harga : (dayItin.kuliner_malam_harga || pkg.kuliner_malam_harga || 0));
                        } else if (type === 'kuliner_malam') {
                            pagi = activeD ? activeD.kuliner_pagi_harga : (dayItin.kuliner_pagi_harga || 0);
                            siang = activeD ? activeD.kuliner_harga : (dayItin.kuliner_harga || pkg.kuliner_harga || 0);
                            malam = isDayCheckoutOrODT ? 0 : itemHarga;
                        } else {
                            pagi = activeD ? activeD.kuliner_pagi_harga : (dayItin.kuliner_pagi_harga || 0);
                            siang = activeD ? activeD.kuliner_harga : (dayItin.kuliner_harga || pkg.kuliner_harga || 0);
                            malam = isDayCheckoutOrODT ? 0 : (activeD ? activeD.kuliner_malam_harga : (dayItin.kuliner_malam_harga || pkg.kuliner_malam_harga || 0));
                        }
                    } else {
                        const activeD = selectedDays[d];
                        const dayItinOfD = pkg.itinerary?.find(it => it.day === d);
                        pagi = activeD ? (activeD.kuliner_pagi_harga || 0) : (dayItinOfD ? (dayItinOfD.kuliner_pagi_harga || 0) : 0);
                        siang = activeD ? (activeD.kuliner_harga || 0) : (dayItinOfD ? (dayItinOfD.kuliner_harga || 0) : (pkg.kuliner_harga || 0));
                        malam = isDayCheckoutOrODT ? 0 : (activeD ? (activeD.kuliner_malam_harga || 0) : (dayItinOfD ? (dayItinOfD.kuliner_malam_harga || 0) : (pkg.kuliner_malam_harga || 0)));
                    }

                    hypKulCost += (pagi + siang + malam) * persons;
                }

                // 4. Calculate spatial distance and transport costs dynamically
                let hypTotalDistance = 0;
                for (let dNum = 1; dNum <= duration; dNum++) {
                    const isDayCheckoutOrODT = (duration === 1 || dNum === duration);
                    let dPlan = null;
                    if (dNum === dayNum && (type === 'wisata' || type === 'kuliner' || type === 'kuliner_pagi' || type === 'kuliner_malam')) {
                        const itemLat = item.lat || item.Latitude || 0;
                        const itemLon = item.lon || item.Longitude || 0;
                        const activeD = selectedDays[dNum];

                        dPlan = {
                            wisata_lat: type === 'wisata' ? itemLat : (activeD ? activeD.wisata_lat : wLat),
                            wisata_lon: type === 'wisata' ? itemLon : (activeD ? activeD.wisata_lon : wLon),
                            kuliner_pagi_lat: type === 'kuliner_pagi' ? itemLat : (activeD ? activeD.kuliner_pagi_lat : kpLat),
                            kuliner_pagi_lon: type === 'kuliner_pagi' ? itemLon : (activeD ? activeD.kuliner_pagi_lon : kpLon),
                            kuliner_lat: type === 'kuliner' ? itemLat : (activeD ? activeD.kuliner_lat : ksLat),
                            kuliner_lon: type === 'kuliner' ? itemLon : (activeD ? activeD.kuliner_lon : ksLon),
                            kuliner_malam_lat: type === 'kuliner_malam' ? itemLat : (activeD ? activeD.kuliner_malam_lat : kmLat),
                            kuliner_malam_lon: type === 'kuliner_malam' ? itemLon : (activeD ? activeD.kuliner_malam_lon : kmLon)
                        };
                    } else {
                        dPlan = selectedDays[dNum] || pkg.itinerary?.find(it => it.day === dNum) || {
                            wisata_lat: pkg.wisata_lat || 0, wisata_lon: pkg.wisata_lon || 0,
                            kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0, kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
                            kuliner_lat: pkg.kuliner_lat || 0, kuliner_lon: pkg.kuliner_lon || 0,
                            kuliner_malam_lat: pkg.kuliner_malam_lat || 0, kuliner_malam_lon: pkg.kuliner_malam_lon || 0
                        };
                    }

                    if (dPlan) {
                        let curHotel = null;
                        let nexHotel = null;
                        if (nights > 0) {
                            if (hotelMode === 'same') {
                                if (type === 'hotel') {
                                    curHotel = item;
                                    nexHotel = item;
                                } else {
                                    curHotel = selectedHotel || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                                    nexHotel = curHotel;
                                }
                            } else {
                                const getHotelN = (n) => {
                                    if (type === 'split-hotel' && nightNum === n) return item;
                                    return selectedHotelsByNight[n] || null;
                                };
                                curHotel = getHotelN(dNum - 1) || getHotelN(dNum) || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                                nexHotel = getHotelN(dNum) || getHotelN(dNum - 1) || curHotel;
                            }
                        }

                        const chLatD = curHotel ? (curHotel.lat || curHotel.Latitude || 0) : 0;
                        const chLonD = curHotel ? (curHotel.lon || curHotel.Longitude || 0) : 0;
                        const nhLatD = nexHotel ? (nexHotel.lat || nexHotel.Latitude || 0) : chLatD;
                        const nhLonD = nexHotel ? (nexHotel.lon || nexHotel.Longitude || 0) : chLonD;

                        const kpLatD = dPlan.kuliner_pagi_lat || 0;
                        const kpLonD = dPlan.kuliner_pagi_lon || 0;
                        const wLatD = dPlan.wisata_lat || 0;
                        const wLonD = dPlan.wisata_lon || 0;
                        const ksLatD = dPlan.kuliner_lat || 0;
                        const ksLonD = dPlan.kuliner_lon || 0;
                        const kmLatD = dPlan.kuliner_malam_lat || 0;
                        const kmLonD = dPlan.kuliner_malam_lon || 0;

                        if (duration === 1 || !curHotel || !chLatD) {
                            const d1 = haversineDist(kpLatD, kpLonD, wLatD, wLonD);
                            const d2 = haversineDist(wLatD, wLonD, ksLatD, ksLonD);
                            hypTotalDistance += d1 + d2;
                        } else if (dNum === 1) {
                            const d1 = haversineDist(kpLatD, kpLonD, wLatD, wLonD);
                            const d2 = haversineDist(wLatD, wLonD, ksLatD, ksLonD);
                            const d3 = haversineDist(ksLatD, ksLonD, nhLatD, nhLonD);
                            const d4 = isDayCheckoutOrODT ? 0 : haversineDist(nhLatD, nhLonD, kmLatD, kmLonD);
                            const d5 = isDayCheckoutOrODT ? 0 : haversineDist(kmLatD, kmLonD, nhLatD, nhLonD);
                            hypTotalDistance += d1 + d2 + d3 + d4 + d5;
                        } else if (dNum === duration) {
                            const d1 = haversineDist(chLatD, chLonD, kpLatD, kpLonD);
                            const d2 = haversineDist(kpLatD, kpLonD, wLatD, wLonD);
                            const d3 = haversineDist(wLatD, wLonD, ksLatD, ksLonD);
                            hypTotalDistance += d1 + d2 + d3;
                        } else {
                            const d1 = haversineDist(chLatD, chLonD, kpLatD, kpLonD);
                            const d2 = haversineDist(kpLatD, kpLonD, wLatD, wLonD);
                            const d3 = haversineDist(wLatD, wLonD, ksLatD, ksLonD);
                            const d4 = haversineDist(ksLatD, ksLonD, nhLatD, nhLonD);
                            const d5 = isDayCheckoutOrODT ? 0 : haversineDist(nhLatD, nhLonD, kmLatD, kmLonD);
                            const d6 = isDayCheckoutOrODT ? 0 : haversineDist(kmLatD, kmLonD, nhLatD, nhLonD);
                            hypTotalDistance += d1 + d2 + d3 + d4 + d5 + d6;
                        }
                    }
                }

                let hypRatePerKm = 2250;
                if (persons <= 1) hypRatePerKm = 2250;
                else if (persons <= 4) hypRatePerKm = 5150;
                else hypRatePerKm = 6000;

                const hypTransportCost = hypTotalDistance > 0 ? Math.round(hypTotalDistance * hypRatePerKm) : 0;
                const hypRunningCost = hypAccCost + hypWisCost + hypKulCost + hypTransportCost;

                item.isOverBudget = (hypRunningCost > budgetLimit);
            });

            // Mengurutkan alternatif: menempatkan opsi sesuai anggaran di atas dan opsi melebihi anggaran di bawah
            visibleAlts.sort((a, b) => {
                if (a.isOverBudget && !b.isOverBudget) return 1;
                if (!a.isOverBudget && b.isOverBudget) return -1;
                return a.distFromAnchor - b.distFromAnchor;
            });
        }

        dropdownEl.style.display = 'block';
        dropdownEl.innerHTML = '';

        let html = '';

        if (visibleAlts.length === 0) {
            dropdownEl.innerHTML = `
                <div class="autocomplete-empty autocomplete-empty-alt">
                    <span class="material-symbols-outlined">search_off</span>
                    <h5>Tidak Ada Pilihan</h5>
                    <p>Tidak ditemukan alternatif yang cocok.</p>
                </div>
            `;
            return;
        }

        html += `<div class="autocomplete-section-title alt-section-title">Pilihan Alternatif</div>`;

        visibleAlts.forEach(item => {
            const priceFormatted = fmtRp(item.harga || item.Estimasi_Harga || 0);
            let distSuffix = '';
            const itemLat = item.lat || item.Latitude || 0;
            const itemLon = item.lon || item.Longitude || 0;

            if (type === 'hotel' || type === 'split-hotel') {
                distSuffix = '';
            } else if (type === 'wisata') {
                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(kpLat, kpLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, ksLat, ksLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km) & Wisata → Makan Siang (${d2.toFixed(1)} km)`;
                } else if (dayNum === 1) {
                    const d1 = haversineDist(kpLat, kpLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, ksLat, ksLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km) & Wisata → Makan Siang (${d2.toFixed(1)} km)`;
                } else if (dayNum === duration) {
                    const d1 = haversineDist(kpLat, kpLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, ksLat, ksLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km) & Wisata → Makan Siang (${d2.toFixed(1)} km)`;
                } else {
                    const d1 = haversineDist(kpLat, kpLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, ksLat, ksLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km) & Wisata → Makan Siang (${d2.toFixed(1)} km)`;
                }
            } else if (type === 'kuliner_pagi') {
                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(itemLat, itemLon, wLat, wLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km)`;
                } else if (dayNum === 1) {
                    const d1 = haversineDist(itemLat, itemLon, wLat, wLon);
                    distSuffix = `Makan Pagi → Wisata (${d1.toFixed(1)} km)`;
                } else {
                    const d1 = haversineDist(chLat, chLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, wLat, wLon);
                    distSuffix = `Hotel → Makan Pagi (${d1.toFixed(1)} km) & Makan Pagi → Wisata (${d2.toFixed(1)} km)`;
                }
            } else if (type === 'kuliner') {
                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(wLat, wLon, itemLat, itemLon);
                    distSuffix = `Wisata → Makan Siang (${d1.toFixed(1)} km)`;
                } else if (dayNum === 1) {
                    const d1 = haversineDist(wLat, wLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, nhLat, nhLon);
                    distSuffix = `Wisata → Makan Siang (${d1.toFixed(1)} km) & Makan Siang → Hotel (${d2.toFixed(1)} km)`;
                } else if (dayNum === duration) {
                    const d1 = haversineDist(wLat, wLon, itemLat, itemLon);
                    distSuffix = `Wisata → Makan Siang (${d1.toFixed(1)} km)`;
                } else {
                    const d1 = haversineDist(wLat, wLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, nhLat, nhLon);
                    distSuffix = `Wisata → Makan Siang (${d1.toFixed(1)} km) & Makan Siang → Hotel (${d2.toFixed(1)} km)`;
                }
            } else if (type === 'kuliner_malam') {
                if (duration === 1 || !currentHotel || !chLat) {
                    distSuffix = '';
                } else {
                    const d1 = haversineDist(chLat, chLon, itemLat, itemLon);
                    const d2 = haversineDist(itemLat, itemLon, nhLat, nhLon);
                    distSuffix = `Hotel → Makan Malam (${d1.toFixed(1)} km) & Makan Malam → Hotel (${d2.toFixed(1)} km)`;
                }
            }

            let imgHTML = '';
            if (type === 'hotel' || type === 'split-hotel') {
                const hFolder = item.nama.trim().replace(/ /g, '_');
                imgHTML = `
                    <div class="suggestion-thumb-wrap">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'hotel')" />
                    </div>
                `;
            } else if (type === 'wisata') {
                const wFolder = item.nama.trim().replace(/ /g, '_');
                imgHTML = `
                    <div class="suggestion-thumb-wrap">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'landscape')" />
                    </div>
                `;
            } else {
                const kFolder = item.nama.trim().replace(/ /g, '_');
                imgHTML = `
                    <div class="suggestion-thumb-wrap">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'restaurant')" />
                    </div>
                `;
            }

            html += `
                <div class="autocomplete-suggestion custom-suggestion-item" data-name="${escapeHtmlAttr(item.nama)}">
                    ${imgHTML}
                    <div class="suggestion-info">
                        <div class="suggestion-title">${item.nama}</div>
                        <div class="suggestion-meta">
                            ${item.isOverBudget ? '<span class="suggestion-badge over-budget-badge">⚠️ BUDGET OVER</span>' : '<span class="suggestion-badge ok-budget-badge">✓ AMAN</span>'}
                            ${distSuffix ? `<span>• 📍 ${distSuffix}</span>` : ''}
                        </div>
                    </div>
                    <div class="suggestion-price">${priceFormatted}</div>
                </div>
            `;
        });

        dropdownEl.innerHTML = html;

        dropdownEl.querySelectorAll('.custom-suggestion-item').forEach(itemEl => {
            itemEl.addEventListener('click', () => {
                selectSearchSelectSuggestion(triggerEl, itemEl.dataset.name, visibleAlts);
            });
        });
    }

    function selectSearchSelectSuggestion(triggerEl, name, alternativesList) {
        const type = triggerEl.dataset.type;
        const classIdx = triggerEl.dataset.classIdx;
        const dayNum = parseInt(triggerEl.dataset.day || 1);
        const nightNum = parseInt(triggerEl.dataset.night || 1);

        const chosen = alternativesList.find(a => a.nama === name);
        if (!chosen) return;

        const spanEl = triggerEl.querySelector('span');
        if (spanEl) {
            spanEl.textContent = name;
        }

        const dropdownEl = triggerEl.closest('.custom-dropdown-wrap')?.querySelector('.custom-search-select-dropdown');
        if (dropdownEl) dropdownEl.style.display = 'none';

        const pkg = activeOptionPackages[classIdx];
        const realClusterId = (pkg && pkg.cluster_id !== undefined) ? pkg.cluster_id : classIdx;
        const nights = pkg.duration - 1;

        if (type === 'hotel') {
            activeOptionPackages[classIdx].hotel_nama = chosen.nama;
            activeOptionPackages[classIdx].hotel_nama_real = chosen.nama;
            activeOptionPackages[classIdx].hotel_harga = chosen.harga;
            activeOptionPackages[classIdx].cost_akomodasi = chosen.harga * nights * activeOptionPackages[0].num_rooms;
            activeOptionPackages[classIdx].hotel_lat = chosen.lat;
            activeOptionPackages[classIdx].hotel_lon = chosen.lon;

            if (selectedHotel && selectedHotel.classIdx == classIdx) {
                selectedHotel.nama = chosen.nama;
                selectedHotel.harga = chosen.harga;
                selectedHotel.cost = chosen.harga * nights * activeOptionPackages[0].num_rooms;
                selectedHotel.lat = chosen.lat;
                selectedHotel.lon = chosen.lon;
            }
            renderPlannerStep();
        } else if (type === 'split-hotel') {
            activeOptionPackages[classIdx].hotel_nama = chosen.nama;
            activeOptionPackages[classIdx].hotel_nama_real = chosen.nama;
            activeOptionPackages[classIdx].hotel_harga = chosen.harga;
            activeOptionPackages[classIdx].cost_akomodasi = chosen.harga * activeOptionPackages[0].num_rooms;
            activeOptionPackages[classIdx].hotel_lat = chosen.lat;
            activeOptionPackages[classIdx].hotel_lon = chosen.lon;

            if (selectedHotelsByNight[nightNum] && selectedHotelsByNight[nightNum].classIdx == classIdx) {
                selectedHotelsByNight[nightNum].nama = chosen.nama;
                selectedHotelsByNight[nightNum].harga = chosen.harga;
                selectedHotelsByNight[nightNum].cost = chosen.harga * activeOptionPackages[0].num_rooms;
                selectedHotelsByNight[nightNum].lat = chosen.lat;
                selectedHotelsByNight[nightNum].lon = chosen.lon;
            }
            renderPlannerStep();
        } else if (type === 'wisata') {
            let anchorLat = 0, anchorLon = 0;
            if (hotelMode === 'same') {
                anchorLat = selectedHotel ? selectedHotel.lat : (pkg.hotel_lat || 0);
                anchorLon = selectedHotel ? selectedHotel.lon : (pkg.hotel_lon || 0);
            } else {
                const activeN = selectedHotelsByNight[dayNum];
                anchorLat = activeN ? activeN.lat : (pkg.hotel_lat || 0);
                anchorLon = activeN ? activeN.lon : (pkg.hotel_lon || 0);
            }
            const distance = haversineDist(anchorLat, anchorLon, chosen.lat, chosen.lon);

            const title = "Konfirmasi Rute Wisata";
            const message = `Anda memilih <strong>${chosen.nama}</strong>.<br><br>📍 Jarak dari Hotel Akomodasi: <strong>${distance.toFixed(1)} km</strong>.<br>💰 HTM Tiket: <strong>${fmtRp(chosen.harga)} per orang</strong>.<br><br>Apakah Anda ingin mengonfirmasi perubahan rute wisata ini?`;

            showSpatialConfirmationModal(title, message,
                () => {
                    let dayItin = activeOptionPackages[classIdx].itinerary.find(item => item.day === dayNum);
                    if (!dayItin) {
                        dayItin = { day: dayNum };
                        activeOptionPackages[classIdx].itinerary.push(dayItin);
                    }
                    dayItin.wisata = chosen.nama;
                    dayItin.wisata_harga = chosen.harga;
                    dayItin.wisata_lat = chosen.lat;
                    dayItin.wisata_lon = chosen.lon;

                    // Unlock Kuliner dropdown since wisata is successfully chosen
                    stepWisataSelected[dayNum] = true;

                    function updateSelectedDayCost(dNum) {
                        if (!selectedDays[dNum]) return;
                        const targetDPlan = selectedDays[dNum];

                        const persons = activeOptionPackages[0].num_persons;
                        let ratePerKm = 2250;
                        if (persons <= 1) {
                            ratePerKm = 2250;
                        } else if (persons <= 4) {
                            ratePerKm = 5150;
                        } else {
                            ratePerKm = 6000;
                        }

                        const dayWisataCost = (targetDPlan.wisata_harga || 0) * persons;
                        const isCheckoutOrODT = (pkg.duration === 1 || dNum === pkg.duration);
                        const dayKulinerCost = ((targetDPlan.kuliner_pagi_harga || 0) + targetDPlan.kuliner_harga + (isCheckoutOrODT ? 0 : (targetDPlan.kuliner_malam_harga || 0))) * persons;

                        let dayDistance = 0;
                        let currentHotel = null;
                        let nextHotel = null;
                        const nights = pkg.duration - 1;
                        if (nights > 0) {
                            if (hotelMode === 'same') {
                                currentHotel = selectedHotel || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                                nextHotel = currentHotel;
                            } else {
                                const getHotelN = (n) => { return selectedHotelsByNight[n] || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 }; };
                                currentHotel = getHotelN(dNum - 1) || getHotelN(dNum);
                                nextHotel = getHotelN(dNum) || getHotelN(dNum - 1);
                            }
                        }
                        const chLat = currentHotel ? (currentHotel.lat || 0) : 0;
                        const chLon = currentHotel ? (currentHotel.lon || 0) : 0;
                        const nhLat = nextHotel ? (nextHotel.lat || 0) : chLat;
                        const nhLon = nextHotel ? (nextHotel.lon || 0) : chLon;

                        const kpLat = targetDPlan.kuliner_pagi_lat || 0;
                        const kpLon = targetDPlan.kuliner_pagi_lon || 0;
                        const wLat = targetDPlan.wisata_lat || 0;
                        const wLon = targetDPlan.wisata_lon || 0;
                        const ksLat = targetDPlan.kuliner_lat || 0;
                        const ksLon = targetDPlan.kuliner_lon || 0;
                        const kmLat = targetDPlan.kuliner_malam_lat || 0;
                        const kmLon = targetDPlan.kuliner_malam_lon || 0;

                        if (pkg.duration === 1 || !currentHotel || !chLat) {
                            const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                            dayDistance = d1 + d2;
                        } else if (dNum === 1) {
                            const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                            const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                            const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                            const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                            dayDistance = d1 + d2 + d3 + d4 + d5;
                        } else if (dNum === pkg.duration) {
                            const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                            const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                            dayDistance = d1 + d2 + d3;
                        } else {
                            const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                            const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                            const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                            const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                            const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                            dayDistance = d1 + d2 + d3 + d4 + d5 + d6;
                        }

                        const dayTransportCost = Math.round(dayDistance * ratePerKm);
                        targetDPlan.cost = dayWisataCost + dayKulinerCost + dayTransportCost;
                    }

                    if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                        selectedDays[dayNum].wisata = chosen.nama;
                        selectedDays[dayNum].wisata_harga = chosen.harga;
                        selectedDays[dayNum].wisata_lat = chosen.lat;
                        selectedDays[dayNum].wisata_lon = chosen.lon;
                        updateSelectedDayCost(dayNum);
                    }
                    renderPlannerStep();
                },
                () => {
                    const dayItin = activeOptionPackages[classIdx].itinerary.find(item => item.day === dayNum);
                    if (spanEl) spanEl.textContent = dayItin ? dayItin.wisata : pkg.wisata_nama;
                }
            );
        } else if (type === 'kuliner' || type === 'kuliner_pagi' || type === 'kuliner_malam') {
            let dayItin = activeOptionPackages[classIdx].itinerary.find(item => item.day === dayNum);
            if (!dayItin) {
                dayItin = { day: dayNum };
                activeOptionPackages[classIdx].itinerary.push(dayItin);
            }
            if (type === 'kuliner_pagi') {
                dayItin.kuliner_pagi_nama = chosen.nama;
                dayItin.kuliner_pagi = chosen.nama;
                dayItin.kuliner_pagi_harga = chosen.harga;
                dayItin.kuliner_pagi_lat = chosen.lat;
                dayItin.kuliner_pagi_lon = chosen.lon;

                if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                    selectedDays[dayNum].kuliner_pagi_nama = chosen.nama;
                    selectedDays[dayNum].kuliner_pagi = chosen.nama;
                    selectedDays[dayNum].kuliner_pagi_harga = chosen.harga;
                    selectedDays[dayNum].kuliner_pagi_lat = chosen.lat;
                    selectedDays[dayNum].kuliner_pagi_lon = chosen.lon;
                    updateSelectedDayCost(dayNum);
                }
            } else if (type === 'kuliner') {
                dayItin.kuliner = chosen.nama;
                dayItin.kuliner_harga = chosen.harga;
                dayItin.kuliner_lat = chosen.lat;
                dayItin.kuliner_lon = chosen.lon;

                if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                    selectedDays[dayNum].kuliner = chosen.nama;
                    selectedDays[dayNum].kuliner_harga = chosen.harga;
                    selectedDays[dayNum].kuliner_lat = chosen.lat;
                    selectedDays[dayNum].kuliner_lon = chosen.lon;
                    updateSelectedDayCost(dayNum);
                }
            } else {
                dayItin.kuliner_malam_nama = chosen.nama;
                dayItin.kuliner_malam = chosen.nama;
                dayItin.kuliner_malam_harga = chosen.harga;
                dayItin.kuliner_malam_lat = chosen.lat;
                dayItin.kuliner_malam_lon = chosen.lon;

                if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                    selectedDays[dayNum].kuliner_malam_nama = chosen.nama;
                    selectedDays[dayNum].kuliner_malam = chosen.nama;
                    selectedDays[dayNum].kuliner_malam_harga = chosen.harga;
                    selectedDays[dayNum].kuliner_malam_lat = chosen.lat;
                    selectedDays[dayNum].kuliner_malam_lon = chosen.lon;
                    updateSelectedDayCost(dayNum);
                }
            }
            renderPlannerStep();
        }
    }

    // ─────────────────────────────────────────────────
    // Navbar
    // ─────────────────────────────────────────────────
    document.getElementById('hamburger-btn')?.addEventListener('click', () => {
        const m = document.getElementById('mobile-menu');
        if (m) {
            m.classList.toggle('open');
            const icon = document.querySelector('#hamburger-btn .material-symbols-outlined');
            if (icon) {
                icon.textContent = m.classList.contains('open') ? 'close' : 'menu';
            }
        }
    });

    // ─────────────────────────────────────────────────
    // Scroll reveal
    // ─────────────────────────────────────────────────
    const recomHero = document.querySelector('.recom-hero');
    if (recomHero) {
        new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); } });
        }, { threshold: 0.1 }).observe(recomHero);
    }

    // ─────────────────────────────────────────────────
    // Workflow Tab Switching
    // ─────────────────────────────────────────────────
    document.querySelectorAll('.wf-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const wf = tab.dataset.wf;
            if (wf === activeWorkflow) return;
            activeWorkflow = wf;

            document.querySelectorAll('.wf-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.wf-panel').forEach(p => p.style.display = 'none');
            const panel = document.getElementById('wf-' + wf);
            if (panel) panel.style.display = 'block';

            hideResults();
            hideError();
        });
    });

    // ─────────────────────────────────────────────────
    // Counter helper
    // ─────────────────────────────────────────────────
    function showToast(title, message) {
        let container = document.getElementById('custom-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'custom-toast-container';
            container.className = 'custom-toast-container';
            document.body.appendChild(container);

            const style = document.createElement('style');
            style.textContent = `
                .custom-toast-container {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    pointer-events: none;
                }
                .custom-toast {
                    background: rgba(15, 23, 42, 0.95);
                    color: #fff;
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    max-width: 380px;
                    pointer-events: auto;
                    transform: translateX(120%);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
                    opacity: 0;
                }
                .custom-toast.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                .custom-toast-icon {
                    font-size: 22px;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 2px;
                }
                .custom-toast-content {
                    flex: 1;
                }
                .custom-toast-title {
                    font-family: 'Manrope', 'Inter', sans-serif;
                    font-weight: 800;
                    font-size: 13.5px;
                    margin-bottom: 4px;
                    color: #f3f4f6;
                    letter-spacing: 0.2px;
                    text-align: left;
                }
                .custom-toast-message {
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    color: #9ca3af;
                    line-height: 1.45;
                    text-align: left;
                }
                .custom-toast-close {
                    cursor: pointer;
                    color: #6b7280;
                    transition: color 0.2s;
                    display: flex;
                    align-items: center;
                    background: none;
                    border: none;
                    padding: 0;
                    margin-top: 2px;
                }
                .custom-toast-close:hover {
                    color: #d1d5db;
                }
            `;
            document.head.appendChild(style);
        }

        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.innerHTML = `
            <span class="material-symbols-outlined custom-toast-icon">warning</span>
            <div class="custom-toast-content">
                <div class="custom-toast-title">${title}</div>
                <div class="custom-toast-message">${message}</div>
            </div>
            <button class="custom-toast-close">
                <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
            </button>
        `;

        container.appendChild(toast);
        toast.offsetHeight;
        toast.classList.add('show');

        const closeBtn = toast.querySelector('.custom-toast-close');
        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };
        closeBtn.addEventListener('click', dismiss);
        setTimeout(dismiss, 5000);
    }

    function setupCounter(inputId, minusId, plusId, min = 1) {
        const inp = document.getElementById(inputId);
        const plus = document.getElementById(plusId);
        const minus = document.getElementById(minusId);
        if (!inp || !plus || !minus) return;
        const max = inp.hasAttribute('max') ? +inp.getAttribute('max') : Infinity;
        minus.addEventListener('click', () => {
            if (+inp.value > min) {
                inp.value = +inp.value - 1;
                updateBudgetSliders();
                fetchApiMinMaxUpdate();
                onBudgetChange();
            }
        });
        plus.addEventListener('click', () => {
            if (+inp.value < max) {
                inp.value = +inp.value + 1;
                updateBudgetSliders();
                fetchApiMinMaxUpdate();
                onBudgetChange();
            } else {
                if (max === 6 && (inputId === 'b-persons' || inputId === 'f-persons' || inputId === 'd-persons')) {
                    showToast("Batas Maksimal Peserta", "Jumlah peserta dibatasi maksimal 6 orang untuk menyesuaikan kapasitas GoCar XL (armada terbesar yang tersedia).");
                }
            }
        });
        inp.addEventListener('input', () => {
            if (+inp.value > max) {
                inp.value = max;
                if (max === 6 && (inputId === 'b-persons' || inputId === 'f-persons' || inputId === 'd-persons')) {
                    showToast("Batas Maksimal Peserta", "Jumlah peserta dibatasi maksimal 6 orang untuk menyesuaikan kapasitas GoCar XL (armada terbesar yang tersedia).");
                }
            }
            updateBudgetSliders();
            fetchApiMinMaxUpdate();
            onBudgetChange();
        });
        inp.addEventListener('change', () => {
            if (+inp.value > max) {
                inp.value = max;
            }
            updateBudgetSliders();
            fetchApiMinMaxUpdate();
            onBudgetChange();
        });
    }
    setupCounter('b-persons', 'b-persons-minus', 'b-persons-plus');
    setupCounter('b-duration', 'b-duration-minus', 'b-duration-plus');
    setupCounter('f-persons', 'f-persons-minus', 'f-persons-plus');
    setupCounter('f-duration', 'f-duration-minus', 'f-duration-plus');
    setupCounter('d-persons', 'd-persons-minus', 'd-persons-plus');
    setupCounter('d-duration', 'd-duration-minus', 'd-duration-plus');

    // ─────────────────────────────────────────────────
    // Dynamic Budget Range Sliders
    // ─────────────────────────────────────────────────
    function calculateScaledMinBudget(persons, duration, hotelMode = 'same', transport = '') {
        let ratePerKm = 2250;
        if (transport) {
            const mode = String(transport).trim().toLowerCase();
            if (mode === 'motor' || mode === 'goride') ratePerKm = 2250;
            else if (mode === 'mobil' || mode === 'gocar_standard') ratePerKm = 5150;
            else if (mode === 'mobil_xl' || mode === 'gocar_xl') ratePerKm = 6000;
        } else {
            if (persons > 4) ratePerKm = 6000;
            else if (persons > 1) ratePerKm = 5150;
        }

        const minHotelPrice = 135000; // Harga homestay/kost harian rata-rata yang lebih realistis untuk durasi panjang
        const minWisataPrice = 0;
        const avgWisataPrice = 30000; // Rata-rata tiket wisata (beberapa gratis, beberapa berbayar)
        const minKulinerPrice = 18000; // Minimal makan layak (nasi bungkus/warung)
        const avgKulinerPrice = 25000; // Rata-rata makan untuk variasi menu harian

        const nights = duration - 1;
        const rooms = Math.ceil(persons / 2);

        let costHotel = 0;
        if (duration > 1) {
            // Jika pindah hotel, estimasi harga rata-rata hotel termurah bertambah karena harus mix & match
            const hotelMultiplier = (hotelMode === 'split' && nights > 1) ? 1.2 : 1.0;
            costHotel = (minHotelPrice * hotelMultiplier) * nights * rooms;
        }

        const costWisata = (minWisataPrice + avgWisataPrice * (duration - 1)) * persons;

        let costKuliner = 0;
        if (duration === 1) {
            costKuliner = (minKulinerPrice * 2) * persons;
        } else {
            const day1K = minKulinerPrice * 3;
            const middleK = (avgKulinerPrice * 3) * (duration - 2);
            const checkoutK = (avgKulinerPrice * 2);
            costKuliner = (day1K + (duration > 2 ? middleK : 0) + checkoutK) * persons;
        }

        let minDistanceBase = 0;
        if (duration === 1) minDistanceBase = 20;
        else if (duration === 2) minDistanceBase = 25 + 15;
        else minDistanceBase = 35 + 35 * (duration - 2) + 20; // Naikkan estimasi jarak harian menjadi 35km untuk mobilitas riil

        // Ekstra mobilitas / jarak untuk perpindahan lokasi hotel baru
        if (hotelMode === 'split' && duration > 2) minDistanceBase += (15 * (duration - 2));

        const costTransport = Math.round(minDistanceBase * ratePerKm);

        const totalMin = costHotel + costWisata + costKuliner + costTransport;
        return Math.ceil((totalMin * 1.45) / 50000) * 50000; // Naikkan safety margin ke 45%
    }

    function calculateScaledMaxBudget(persons, duration, hotelMode = 'same', transport = '') {
        let ratePerKm = 2250;
        if (transport) {
            const mode = String(transport).trim().toLowerCase();
            if (mode === 'motor' || mode === 'goride') ratePerKm = 2250;
            else if (mode === 'mobil' || mode === 'gocar_standard') ratePerKm = 5150;
            else if (mode === 'mobil_xl' || mode === 'gocar_xl') ratePerKm = 6000;
        } else {
            if (persons > 4) ratePerKm = 6000;
            else if (persons > 1) ratePerKm = 5150;
        }

        const maxHotelPrice = 1200000;
        const maxWisataPrice = 200000;
        const maxKulinerPrice = 75000;

        const nights = duration - 1;
        const rooms = Math.ceil(persons / 2);

        const costHotel = duration > 1 ? maxHotelPrice * nights * rooms : 0;
        const costWisata = maxWisataPrice * persons * duration;
        const mealsCount = duration === 1 ? 2 : (3 * (duration - 1) + 2);
        const costKuliner = maxKulinerPrice * persons * mealsCount;

        // Estimasi jarak maksimum realistis: lintas wilayah Batu↔Malang
        // ODT: ~35 km
        // 2 hari: Hari1 (~50km lintas wilayah) + Hari2 (~35km) = ~85 km
        const maxDistanceBase = duration === 1 ? 35 : 50 + 35 * (duration - 1);

        let adjustedMaxDistance = maxDistanceBase;
        if (hotelMode === 'split' && duration > 2) adjustedMaxDistance += (20 * (duration - 2));
        const costTransport = Math.round(adjustedMaxDistance * ratePerKm);

        const totalMax = costHotel + costWisata + costKuliner + costTransport;
        return Math.ceil(totalMax / 50000) * 50000;
    }

    function updateBudgetSliders() {
        // --- 1. Tab Budget-First ---
        const bPersons = +document.getElementById('b-persons')?.value || 1;
        const bDuration = +document.getElementById('b-duration')?.value || 1;
        const bHotelMode = document.getElementById('b-hotel-mode')?.value || 'same';
        const bTransport = document.getElementById('b-transport')?.value || '';

        const bMin = calculateScaledMinBudget(bPersons, bDuration, bHotelMode, bTransport);
        const bMax = calculateScaledMaxBudget(bPersons, bDuration, bHotelMode, bTransport);

        // Show/hide b-hotel-mode-group depending on bDuration > 2
        const bHotelGroup = document.getElementById('b-hotel-mode-group');
        if (bHotelGroup) {
            bHotelGroup.style.display = bDuration > 2 ? 'block' : 'none';
        }

        const bSlider = document.getElementById('b-budget');
        if (bSlider) {
            bSlider.min = 0; // Biarkan slider fisik bebas mentok 0 demi UX yang smooth
            bSlider.dataset.aiMin = bMin; // Simpan batas AI secara implisit (data attribute)
            bSlider.max = bMax;
            bSlider.step = 10000;

            let curVal = parseInt(bSlider.value) || 1000000;
            if (curVal < 0) curVal = 0;
            if (curVal > bMax) curVal = bMax;
            bSlider.value = curVal;

            const valEl = document.getElementById('b-budget-val');
            if (valEl) valEl.textContent = fmtRp(curVal);

            const minLbl = document.getElementById('b-budget-min-label');
            if (minLbl) minLbl.textContent = "Min: Rp 0";

            const maxLbl = document.getElementById('b-budget-max-label');
            if (maxLbl) maxLbl.textContent = "Max: " + fmtRp(bMax);

            const manualInp = document.getElementById('b-budget-manual');
            if (manualInp) {
                if (document.activeElement !== manualInp) {
                    manualInp.value = curVal;
                }
                manualInp.min = 0;
                manualInp.max = bMax;
            }
        }

        // --- 2. Tab Destination-First ---
        const dPersons = +document.getElementById('d-persons')?.value || 1;
        const dDuration = +document.getElementById('d-duration')?.value || 1;
        const dHotelMode = document.getElementById('d-hotel-mode')?.value || 'same';
        const dTransport = document.getElementById('d-transport')?.value || '';

        const dMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode, dTransport);
        const dMax = calculateScaledMaxBudget(dPersons, dDuration, dHotelMode, dTransport);

        // Show/hide d-hotel-mode-group depending on dDuration > 2
        const dHotelGroup = document.getElementById('d-hotel-mode-group');
        if (dHotelGroup) {
            dHotelGroup.style.display = dDuration > 2 ? 'block' : 'none';
        }

        const dSlider = document.getElementById('d-budget');
        if (dSlider) {
            // 0 merepresentasikan "Tanpa Batasan Budget"
            const dSliderMin = 0;
            dSlider.min = 0;
            dSlider.dataset.aiMin = dMin; // Simpan batas AI secara implisit (data attribute)
            dSlider.max = dMax;
            dSlider.step = 10000;

            let curVal = parseInt(dSlider.value);
            if (isNaN(curVal) || curVal === 0) {
                curVal = dSliderMin;
            }
            if (curVal < dSliderMin) curVal = dSliderMin;
            if (curVal > dMax) curVal = dMax;
            dSlider.value = curVal;

            const isNoBudget = curVal < dMin;
            const valEl = document.getElementById('d-budget-val');
            if (valEl) valEl.textContent = isNoBudget ? "Tanpa Batasan Anggaran " : fmtRp(curVal);

            const minLbl = document.getElementById('d-budget-min-label');
            if (minLbl) minLbl.textContent = "Min: Rp 0";

            const maxLbl = document.getElementById('d-budget-max-label');
            if (maxLbl) maxLbl.textContent = "Max: " + fmtRp(dMax);

            const manualInp = document.getElementById('d-budget-manual');
            if (manualInp) {
                if (document.activeElement !== manualInp) {
                    manualInp.value = isNoBudget ? "" : curVal;
                }
                manualInp.min = 0;
                manualInp.max = dMax;
            }
        }
    }

    // Attach slider input event listeners
    document.getElementById('b-budget')?.addEventListener('input', e => {
        const valEl = document.getElementById('b-budget-val');
        if (valEl) valEl.textContent = fmtRp(+e.target.value);

        const manualInp = document.getElementById('b-budget-manual');
        if (manualInp) manualInp.value = e.target.value;

        onBudgetChange();
    });

    document.getElementById('d-budget')?.addEventListener('input', e => {
        const val = +e.target.value;
        const dPersons = +document.getElementById('d-persons')?.value || 1;
        const dDuration = +document.getElementById('d-duration')?.value || 1;
        const dHotelMode = document.getElementById('d-hotel-mode')?.value || 'same';
        const dTransport = document.getElementById('d-transport')?.value || '';

        let dMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode, dTransport);
        const slider = document.getElementById('d-budget');
        if (slider && slider.dataset.aiMin) {
            dMin = parseInt(slider.dataset.aiMin);
        }

        const valEl = document.getElementById('d-budget-val');
        if (valEl) {
            if (val < dMin) {
                valEl.textContent = "Tanpa Batasan Anggaran ";
            } else {
                valEl.textContent = fmtRp(val);
            }
        }

        const manualInp = document.getElementById('d-budget-manual');
        if (manualInp) manualInp.value = val < dMin ? "" : val;

        onBudgetChange();
    });

    // Attach manual inputs event listeners
    const bManual = document.getElementById('b-budget-manual');
    if (bManual) {
        bManual.addEventListener('input', e => {
            const slider = document.getElementById('b-budget');
            if (!slider) return;

            let val = parseIdr(e.target.value);
            if (val <= 0) return;

            const sliderMin = 0;
            const sliderMax = parseInt(slider.max);

            // Only synchronize to slider and trigger calculation if the value is within range
            if (val >= sliderMin && val <= sliderMax) {
                slider.value = val;
                const valEl = document.getElementById('b-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
                onBudgetChange();
            } else {
                // Trigger validation warning even when out of range
                onBudgetChange();
            }
        });

        bManual.addEventListener('blur', e => {
            const slider = document.getElementById('b-budget');
            if (!slider) return;

            let val = parseIdr(e.target.value);
            const sliderMin = 0;
            const sliderMax = parseInt(slider.max);

            if (val <= 0) {
                // Empty → reset to minimum budget
                val = 0;
            } else if (val < 0) {
                val = 0;
            } else if (val > sliderMax) {
                val = sliderMax;
            }

            slider.value = val;
            e.target.value = val;
            const valEl = document.getElementById('b-budget-val');
            if (valEl) valEl.textContent = fmtRp(val);
            onBudgetChange();
        });
    }

    const dManual = document.getElementById('d-budget-manual');
    if (dManual) {
        dManual.addEventListener('input', e => {
            const slider = document.getElementById('d-budget');
            if (!slider) return;

            let val = parseIdr(e.target.value);
            if (val <= 0) return;

            const dMin = 0;
            const sliderMax = parseInt(slider.max);

            // Only synchronize to slider and trigger calculation if the value is within range
            if (val >= dMin && val <= sliderMax) {
                slider.value = val;
                const valEl = document.getElementById('d-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
                onBudgetChange();
            } else {
                // Trigger validation / treat as No Budget if below min
                onBudgetChange();
            }
        });

        dManual.addEventListener('blur', e => {
            const slider = document.getElementById('d-budget');
            if (!slider) return;

            let val = parseIdr(e.target.value);
            const sliderMin = 0;
            const dMin = 0;
            const sliderMax = parseInt(slider.max);

            if (val <= 0) {
                // Empty means No Budget
                slider.value = 0;
                e.target.value = "";
                const valEl = document.getElementById('d-budget-val');
                if (valEl) valEl.textContent = "Tanpa Batasan Anggaran ";
            } else {
                if (val > sliderMax) {
                    val = sliderMax;
                }
                slider.value = val;
                e.target.value = val;
                const valEl = document.getElementById('d-budget-val');

                const dPersons = +document.getElementById('d-persons')?.value || 1;
                const dDuration = +document.getElementById('d-duration')?.value || 1;
                const dHotelMode = document.getElementById('d-hotel-mode')?.value || 'same';
                const dTransport = document.getElementById('d-transport')?.value || '';
                let targetDMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode, dTransport);
                if (slider && slider.dataset.aiMin) targetDMin = parseInt(slider.dataset.aiMin);
                if (valEl) valEl.textContent = (val < targetDMin) ? "Tanpa Batasan Anggaran " : fmtRp(val);
            }
            onBudgetChange();
        });
    }

    function getRawBudget(elId) {
        const manual = document.getElementById(elId + '-manual');
        if (manual) {
            const rawText = manual.value.trim();
            if (rawText === "") return 0;
            const manualVal = parseIdr(rawText);
            if (manualVal > 0) return manualVal;
        }

        const slider = document.getElementById(elId);
        if (!slider) return 0;
        const val = parseFloat(slider.value) || 0;

        if (elId === 'd-budget') {
            const persons = +document.getElementById('d-persons')?.value || 1;
            const duration = +document.getElementById('d-duration')?.value || 1;
            const hotelMode = document.getElementById('d-hotel-mode')?.value || 'same';
            const transport = document.getElementById('d-transport')?.value || '';
            let minBudget = calculateScaledMinBudget(persons, duration, hotelMode, transport);
            const slider = document.getElementById('d-budget');
            if (slider && slider.dataset.aiMin) minBudget = parseInt(slider.dataset.aiMin);
            if (val < minBudget) return 0; // return 0 for "No Budget"
        }
        return val;
    }

    function checkMinBudget(personsId, durationId, budgetId, warningBoxId, hotelModeId) {
        const prefix = personsId.substring(0, 2); // 'b-' or 'd-'
        const persons = +document.getElementById(personsId)?.value || 1;
        const duration = +document.getElementById(durationId)?.value || 1;
        const hotelMode = document.getElementById(hotelModeId)?.value || 'same';
        const transport = document.getElementById(prefix + 'transport')?.value || '';
        const budget = getRawBudget(budgetId);
        const box = document.getElementById(warningBoxId);

        if (!box) return;

        if (budget === 0) {
            box.style.display = 'none';
            return;
        }

        if (typeof isSyncingBudget !== 'undefined' && isSyncingBudget) {
            box.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0;animation:spin 1s linear infinite;">sync</span>
                <span>Sedang mensinkronkan batas anggaran minimum ...</span>
            `;
            box.style.display = 'flex';
            return;
        }

        // Ambil nilai AI pintar dari label (jika ada), sehingga kotak peringatan responsif terhadap Python AI
        let minBudget = calculateScaledMinBudget(persons, duration, hotelMode, transport);
        const slider = document.getElementById(budgetId);
        if (slider && slider.dataset.aiMin) {
            minBudget = parseInt(slider.dataset.aiMin);
        }

        if (budget < minBudget) {
            box.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0;">warning</span>
                <span>Budget minimal yang disarankan untuk <strong>${persons} orang</strong>, <strong>${duration} hari</strong> adalah <strong>${fmtRp(minBudget)}</strong>.</span>
            `;
            box.style.display = 'flex';
        } else {
            box.style.display = 'none';
        }
    }

    function checkCapacity(personsId, transportId, warningBoxId) {
        const persons = +document.getElementById(personsId)?.value || 1;
        const transport = document.getElementById(transportId)?.value || '';
        const box = document.getElementById(warningBoxId);

        if (!box) return true;

        let warningMsg = '';
        let maxCap = 999;
        let vehicleName = '';

        if (transport === 'motor') {
            maxCap = 1;
            vehicleName = 'Motor (GoRide)';
        } else if (transport === 'mobil') {
            maxCap = 4;
            vehicleName = 'Mobil Standard (GoCar)';
        } else if (transport === 'mobil_xl') {
            maxCap = 6;
            vehicleName = 'Mobil XL (GoCar XL)';
        }

        if (persons > maxCap) {
            warningMsg = `Kapasitas ${vehicleName} maksimal adalah ${maxCap} orang. Kurangi jumlah peserta atau ganti moda transportasi.`;
        }

        if (warningMsg) {
            box.innerHTML = `
                <span class="material-symbols-outlined" style="font-size:18px;flex-shrink:0;">warning</span>
                <span>${warningMsg}</span>
            `;
            box.style.display = 'flex';
            return false;
        } else {
            box.style.display = 'none';
            return true;
        }
    }

    async function fetchBudgetRange(persons, duration, hotelMode = 'same', transport = '') {
        try {
            const fd = new FormData();
            fd.append('persons', persons);
            fd.append('duration', duration);
            fd.append('hotel_mode', hotelMode);
            fd.append('transport', transport);
            const res = await fetch('/api/min-budget', {
                method: 'POST',
                body: fd,
                headers: { 'X-CSRF-TOKEN': csrfToken() }
            });
            const data = await res.json();
            return data.status === 'success' ? data : null;
        } catch (e) {
            return null;
        }
    }
    let minBudgetDebounceTimer = null;
    let budgetFetchSeq = 0;

    function fetchApiMinMaxUpdate() {
        // Aktifkan state syncing agar "Response Sistem" segera bereaksi secara visual
        isSyncingBudget = true;
        onBudgetChange();

        // Beri indikator visual agar user mengerti Python sedang mengkalkulasi batas asli
        const bMaxLbl = document.getElementById('b-budget-max-label');
        if (bMaxLbl) bMaxLbl.innerHTML = '<span style="color:var(--teal-600);font-weight:700">Sinkronisasi Budget...</span>';
        const dMaxLbl = document.getElementById('d-budget-max-label');
        if (dMaxLbl) dMaxLbl.innerHTML = '<span style="color:var(--teal-600);font-weight:700">Sinkronisasi Budget...</span>';

        clearTimeout(minBudgetDebounceTimer);
        minBudgetDebounceTimer = setTimeout(async () => {
            const seq = ++budgetFetchSeq;

            // ── Fetch untuk Budget-First ──
            const bPersons = +document.getElementById('b-persons')?.value || 1;
            const bDuration = +document.getElementById('b-duration')?.value || 1;
            const bHotelModeVal = document.getElementById('b-hotel-mode')?.value || 'same';
            const bTransportVal = document.getElementById('b-transport')?.value || '';

            // ── Fetch untuk Destination-First (pakai nilai d- bukan b-) ──
            const dPersons = +document.getElementById('d-persons')?.value || 1;
            const dDuration = +document.getElementById('d-duration')?.value || 1;
            const dHotelModeVal = document.getElementById('d-hotel-mode')?.value || 'same';
            const dTransportVal = document.getElementById('d-transport')?.value || '';

            // Fetch keduanya paralel
            const [bRange, dRange] = await Promise.all([
                fetchBudgetRange(bPersons, bDuration, bHotelModeVal, bTransportVal),
                fetchBudgetRange(dPersons, dDuration, dHotelModeVal, dTransportVal)
            ]);

            if (seq !== budgetFetchSeq) return;

            // ── Update b-slider ──
            if (bRange) {
                const bSlider = document.getElementById('b-budget');
                if (bSlider) {
                    bSlider.dataset.aiMin = bRange.min_budget;
                    const oldVal = parseInt(bSlider.value) || 0;

                    const safeMax = Math.max(bRange.min_budget + 50000, bRange.max_budget);
                    bSlider.max = safeMax;
                    bSlider.min = 0; // Biarkan slider tetap di 0
                    bSlider.step = 10000;

                    // Jika nilai saat ini di bawah minimum budget, set ke minimum budget agar tombol submit tidak di-disable
                    let newVal = Math.max(0, Math.min(safeMax, oldVal));
                    if (newVal < bRange.min_budget) newVal = bRange.min_budget;
                    bSlider.value = newVal;

                    document.getElementById('b-budget-val')?.textContent !== undefined &&
                        (document.getElementById('b-budget-val').textContent = fmtRp(newVal));
                    document.getElementById('b-budget-min-label') &&
                        (document.getElementById('b-budget-min-label').textContent = "Min: " + fmtRp(bRange.min_budget));
                    document.getElementById('b-budget-max-label') &&
                        (document.getElementById('b-budget-max-label').textContent = "Max: " + fmtRp(bRange.max_budget));

                    const bManual = document.getElementById('b-budget-manual');
                    if (bManual && document.activeElement !== bManual) bManual.value = newVal;
                }
            }

            // ── Update d-slider ──
            if (dRange) {
                const dSlider = document.getElementById('d-budget');
                if (dSlider) {
                    dSlider.dataset.aiMin = dRange.min_budget;
                    const oldVal = parseInt(dSlider.value) || 0;
                    const safeMax = Math.max(dRange.min_budget + 50000, dRange.max_budget);

                    dSlider.max = safeMax;
                    dSlider.min = 0;
                    dSlider.step = 10000;

                    let newVal = Math.max(0, Math.min(safeMax, oldVal));
                    dSlider.value = newVal;

                    const isNoBudget = newVal < dRange.min_budget;
                    const dValEl = document.getElementById('d-budget-val');
                    if (dValEl) dValEl.textContent = isNoBudget ? "Tanpa Batasan Anggaran " : fmtRp(newVal);

                    document.getElementById('d-budget-min-label') &&
                        (document.getElementById('d-budget-min-label').textContent = "Min: Rp 0");
                    document.getElementById('d-budget-max-label') &&
                        (document.getElementById('d-budget-max-label').textContent = "Max: " + fmtRp(dRange.max_budget));

                    const dManual = document.getElementById('d-budget-manual');
                    if (dManual && document.activeElement !== dManual) {
                        dManual.value = isNoBudget ? "" : newVal;
                        dManual.min = dRange.min_budget;
                        dManual.max = dRange.max_budget;
                    }
                }
            }

            // Selesai sinkronisasi, tampilkan angka final
            isSyncingBudget = false;
            onBudgetChange();
        }, 800);
    }

    function onBudgetChange() {
        // Tab Budget-First
        const budget = getRawBudget('b-budget');
        const persons = +document.getElementById('b-persons')?.value || 1;
        const duration = +document.getElementById('b-duration')?.value || 1;

        const perPersonEl = document.getElementById('b-per-person');
        if (perPersonEl) {
            perPersonEl.textContent = fmtRp(persons > 0 ? budget / persons : 0);
        }
        const roomsEl = document.getElementById('b-rooms');
        if (roomsEl) {
            roomsEl.textContent = Math.ceil(persons / 2) + ' kamar';
        }
        const mealsEl = document.getElementById('b-meals');
        if (mealsEl) {
            const mealsPerPerson = duration === 1 ? 2 : (3 * duration - 1);
            const totalMeals = persons * mealsPerPerson;
            mealsEl.textContent = `${totalMeals} kali (${mealsPerPerson}x per Orang)`;
        }

        checkMinBudget('b-persons', 'b-duration', 'b-budget', 'b-warning-box', 'b-hotel-mode');

        // Tab Destination-First
        checkMinBudget('d-persons', 'd-duration', 'd-budget', 'd-warning-box', 'd-hotel-mode');

        // Run capacity checks
        const isBudgetCapValid = checkCapacity('b-persons', 'b-transport', 'b-capacity-warning');
        const isDestCapValid = checkCapacity('d-persons', 'd-transport', 'd-capacity-warning');

        // Enable/disable submit buttons based on capacity + minimum budget checks
        const bSubmit = document.getElementById('b-submit');
        if (bSubmit) {
            const bBudgetVal = getRawBudget('b-budget');
            const bPersonsVal = +document.getElementById('b-persons')?.value || 1;
            const bDurationVal = +document.getElementById('b-duration')?.value || 1;
            const bHotMode = document.getElementById('b-hotel-mode')?.value || 'same';
            const bTransportVal = document.getElementById('b-transport')?.value || '';
            let bMinBudget = calculateScaledMinBudget(bPersonsVal, bDurationVal, bHotMode, bTransportVal);
            const bSliderEl = document.getElementById('b-budget');
            if (bSliderEl && bSliderEl.dataset.aiMin) bMinBudget = parseInt(bSliderEl.dataset.aiMin);
            const bBudgetTooLow = bBudgetVal <= 0 || bBudgetVal < bMinBudget;
            bSubmit.disabled = !isBudgetCapValid || bBudgetTooLow;
        }

        const dSubmit = document.getElementById('d-submit');
        if (dSubmit) dSubmit.disabled = !isDestCapValid;
    }

    document.getElementById('b-transport')?.addEventListener('change', () => {
        updateBudgetSliders();
        fetchApiMinMaxUpdate();
        onBudgetChange();
    });
    document.getElementById('d-transport')?.addEventListener('change', () => {
        updateBudgetSliders();
        fetchApiMinMaxUpdate();
        onBudgetChange();
    });

    document.getElementById('b-hotel-mode')?.addEventListener('change', () => {
        updateBudgetSliders();
        fetchApiMinMaxUpdate();
        onBudgetChange();
    });
    document.getElementById('d-hotel-mode')?.addEventListener('change', () => {
        updateBudgetSliders();
        fetchApiMinMaxUpdate();
        onBudgetChange();
    });

    // Initial budget calculation
    updateBudgetSliders();
    fetchApiMinMaxUpdate();
    onBudgetChange();

    // ─────────────────────────────────────────────────
    // UI State Helpers
    // ─────────────────────────────────────────────────
    function showLoading() {
        document.querySelectorAll('.wf-panel').forEach(p => p.style.display = 'none');
        hideResults();
        hideError();
        const lo = document.getElementById('loading-overlay');
        if (lo) lo.classList.add('visible');

        // animate steps
        let step = 1;
        clearInterval(window._loadInterval);
        window._loadInterval = setInterval(() => {
            document.querySelectorAll('.loading-step').forEach(s => s.classList.remove('active'));
            const cur = document.getElementById('ls-' + step);
            if (cur) cur.classList.add('active');
            if (++step > 4) clearInterval(window._loadInterval);
        }, 900);
    }

    function hideLoading() {
        document.getElementById('loading-overlay')?.classList.remove('visible');
        clearInterval(window._loadInterval);
        const panel = document.getElementById('wf-' + activeWorkflow);
        if (panel) panel.style.display = 'block';
    }

    function showError(msg) {
        const box = document.getElementById('error-box');
        const msgEl = document.getElementById('error-msg');
        if (msgEl) msgEl.textContent = msg;
        if (box) box.classList.add('visible');
    }

    function hideError() {
        document.getElementById('error-box')?.classList.remove('visible');
    }

    function hideResults() {
        document.getElementById('results-section')?.classList.remove('visible');
    }

    function showResults(options, workflowLabel) {
        const sec = document.getElementById('results-section');
        const tabsContainer = document.getElementById('options-tabs-container');
        const tabsEl = document.getElementById('options-tabs');
        const modeToggle = document.getElementById('mode-toggle-container');

        allOptions = options;

        // Ensure one option is marked active
        const hasActive = options.some(opt => opt.active);
        if (!hasActive && options && options[0]) {
            options[0].active = true;
        }

        const initialPackages = options && options[0] ? options[0].packages : [];
        const duration = initialPackages[0]?.duration || 1;

        // Render dynamic options scrollable pill tabs if more than 1 option is returned
        if (options && options.length > 1 && tabsEl && tabsContainer) {
            const slicedOptions = options.slice(0, currentAlternativeLimit);
            let tabsHTML = slicedOptions.map((opt, i) => {
                const isSelected = opt.active;
                const firstPkg = opt.packages && opt.packages[0];
                const wName = firstPkg ? firstPkg.wisata_nama : '';
                const wFolder = wName ? (wName.includes(' & ') ? wName.split(' & ')[0] : wName).trim().replace(/ /g, '_') : '';
                const imgUrl = wFolder ? `/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg` : '';
                return `
                    <button type="button" class="opt-tab ${isSelected ? 'active' : ''}" data-idx="${i}">
                        <div class="opt-tab-thumb-wrap">
                            <img class="opt-tab-thumb" src="${imgUrl}" alt="${escapeHtmlAttr(wName)}" onerror="handleImgErrorRecom(this, 'landscape')" />
                        </div>
                        <div class="opt-tab-text-col">
                            <span class="opt-tab-title">Opsi Alternatif ${opt.option_index}</span>
                            <span class="opt-tab-subtitle">📍 ${wName || 'Wisata'}</span>
                        </div>
                    </button>
                `;
            }).join('');

            if (options.length > currentAlternativeLimit) {
                const remaining = options.length - currentAlternativeLimit;
                tabsHTML += `
                    <button type="button" class="opt-tab-load-more" id="load-more-alts-btn">
                        <span class="material-symbols-outlined">add</span>
                        <span>Opsi Lainnya (${remaining})</span>
                    </button>
                `;
            }

            tabsEl.innerHTML = tabsHTML;
            tabsContainer.style.display = 'flex';

            // Attach event listeners for pill tabs click
            tabsEl.querySelectorAll('.opt-tab').forEach(itemEl => {
                itemEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(itemEl.dataset.idx);

                    // Mark as active
                    options.forEach((opt, i) => opt.active = (i === idx));

                    // Regenerate tabs to update active styling and load new packages
                    showResults(options, workflowLabel);

                    const selPackages = options[idx].packages;
                    const dur = selPackages[0]?.duration || 1;

                    if (dur > 1) {
                        const isCustom = document.getElementById('mode-btn-custom')?.classList.contains('active');
                        if (isCustom) {
                            initPlannerWizard(selPackages);
                        } else {
                            renderPackages(selPackages);
                        }
                    } else {
                        renderPackages(selPackages);
                    }

                    // Smooth scroll the clicked tab into view within the horizontal bar
                    itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                });
            });

            // Attach event listener for load more button
            const loadMoreBtn = document.getElementById('load-more-alts-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    currentAlternativeLimit += 5;
                    showResults(options, workflowLabel);
                });
            }
        } else if (tabsContainer) {
            tabsContainer.style.display = 'none';
        }

        // Handle Dual-Mode Toggle for Multi-Day plans
        if (duration > 1 && modeToggle) {
            modeToggle.style.display = 'flex';

            // Set default active buttons
            const btnAuto = document.getElementById('mode-btn-auto');
            const btnCustom = document.getElementById('mode-btn-custom');

            btnAuto?.classList.add('active');
            btnCustom?.classList.remove('active');

            // Show pre-assembled Automatic Packages Grid by default
            document.getElementById('planner-wizard-container').style.display = 'none';
            document.getElementById('packages-grid').style.display = 'grid';
            renderPackages(initialPackages);

            // Click Mode Auto
            btnAuto?.replaceWith(btnAuto.cloneNode(true));
            document.getElementById('mode-btn-auto')?.addEventListener('click', () => {
                document.getElementById('mode-btn-auto').classList.add('active');
                document.getElementById('mode-btn-custom').classList.remove('active');

                document.getElementById('planner-wizard-container').style.display = 'none';
                document.getElementById('packages-grid').style.display = 'grid';

                const tabsCont = document.getElementById('options-tabs-container');
                if (tabsCont) tabsCont.style.display = 'flex';

                const idx = allOptions.findIndex(opt => opt.active);
                const activeIdx = idx !== -1 ? idx : 0;
                renderPackages(allOptions[activeIdx]?.packages || initialPackages);
            });

            // Click Mode Custom
            btnCustom?.replaceWith(btnCustom.cloneNode(true));
            document.getElementById('mode-btn-custom')?.addEventListener('click', () => {
                document.getElementById('mode-btn-custom').classList.add('active');
                document.getElementById('mode-btn-auto').classList.remove('active');

                document.getElementById('packages-grid').style.display = 'none';
                document.getElementById('planner-wizard-container').style.display = 'block';

                const tabsCont = document.getElementById('options-tabs-container');
                if (tabsCont) tabsCont.style.display = 'none';

                // Sembunyikan filter kategori karena tidak ada kartu paket otomatis yang tampil
                hideKategoriFilter();

                const idx = allOptions.findIndex(opt => opt.active);
                const activeIdx = idx !== -1 ? idx : 0;
                initPlannerWizard(allOptions[activeIdx]?.packages || initialPackages);
            });
        } else {
            if (modeToggle) modeToggle.style.display = 'none';
            document.getElementById('planner-wizard-container').style.display = 'none';
            document.getElementById('packages-grid').style.display = 'grid';
            renderPackages(initialPackages);
        }

        const resultsTitle = document.getElementById('results-title');
        if (resultsTitle) resultsTitle.textContent = workflowLabel;

        const resultsSub = document.getElementById('results-sub');
        if (resultsSub) resultsSub.textContent = `${options.length} pilihan alternatif paket ditemukan`;

        if (sec) {
            sec.classList.add('visible');
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderPackages(packages) {
        const grid = document.getElementById('packages-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!packages || packages.length === 0) {
            hideKategoriFilter();
            const persons = (activeWorkflow === 'budget' ? +document.getElementById('b-persons')?.value : +document.getElementById('d-persons')?.value) || 1;
            const duration = (activeWorkflow === 'budget' ? +document.getElementById('b-duration')?.value : +document.getElementById('d-duration')?.value) || 1;
            const budgetId = (activeWorkflow === 'budget' ? 'b-budget' : 'd-budget');
            const hotelModeId = (activeWorkflow === 'budget' ? 'b-hotel-mode' : 'd-hotel-mode');
            const currentHotelMode = document.getElementById(hotelModeId)?.value || 'same';

            const slider = document.getElementById(budgetId);
            let minBudget = calculateScaledMinBudget(persons, duration, currentHotelMode);
            if (slider && slider.dataset.aiMin) minBudget = parseInt(slider.dataset.aiMin);

            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                    <h3>Anggaran Belum Mencukupi</h3>
                    <p>Maaf, kami tidak dapat menemukan paket yang sesuai. Analisis AI menunjukkan bahwa budget minimal yang disarankan untuk <strong>${persons} orang</strong>, <strong>${duration} hari</strong> adalah sekitar <strong>${fmtRp(minBudget)}</strong>.</p>
                </div>`;
        } else {
            packages.forEach(pkg => grid.appendChild(buildPkgCard(pkg)));
            buildKategoriFilter(packages);
        }
    }

    function buildKategoriFilter(packages) {
        const bar = document.getElementById('kategori-filter-bar');
        if (!bar) return;

        // Ambil kategori unik dalam urutan kemunculan (Hemat → Balanced → Premium)
        const seen = new Set();
        const kategoriList = [];
        packages.forEach(pkg => {
            const k = (pkg.kategori || 'Hemat');
            if (!seen.has(k)) { seen.add(k); kategoriList.push(k); }
        });

        // Hanya tampilkan filter jika ada lebih dari 1 kategori
        if (kategoriList.length <= 1) { bar.style.display = 'none'; return; }

        const buttons = ['Semua', ...kategoriList].map(k => {
            const cls = k === 'Semua' ? '' : k.toLowerCase();
            return `<button class="kat-filter-btn ${cls} ${k === 'Semua' ? 'active' : ''}" data-kat="${k === 'Semua' ? 'semua' : k.toLowerCase()}">${k.toUpperCase()}</button>`;
        }).join('');

        bar.innerHTML = `<div class="kat-filter-inner"><span class="kat-filter-label">Filter:</span>${buttons}</div>`;
        bar.style.display = 'block';

        bar.querySelectorAll('.kat-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                bar.querySelectorAll('.kat-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const kat = btn.dataset.kat;
                document.querySelectorAll('#packages-grid .pkg-card').forEach(card => {
                    card.style.display = (kat === 'semua' || card.dataset.kategori === kat) ? '' : 'none';
                });
            });
        });
    }

    function hideKategoriFilter() {
        const bar = document.getElementById('kategori-filter-bar');
        if (bar) bar.style.display = 'none';
    }

    // ─────────────────────────────────────────────────
    // Build Package Card
    // ─────────────────────────────────────────────────
    function buildPkgCard(pkg) {
        const pkgUid = 'pkg_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const kat = (pkg.kategori || 'Hemat').toLowerCase();
        const katMap = { hemat: 'hemat', balanced: 'balanced', premium: 'premium', luxury: 'premium', elite: 'premium' };
        const cls = katMap[kat] || 'hemat';
        let budget = 0;
        if (activeWorkflow === 'budget') {
            budget = getRawBudget('b-budget');
        } else if (activeWorkflow === 'destination') {
            budget = getRawBudget('d-budget');
        }
        const remaining = budget > 0 ? budget - pkg.total_cost : null;
        const isOver = remaining !== null && remaining < 0;

        const legs = pkg.transport_detail?.legs || [];
        const legHTML = legs.length > 0
            ? `<div class="transport-legs" id="transport-legs-${pkgUid}">
                ${legs.map(l => `<div class="transport-leg-row" style="align-items:flex-start; gap:4px;"><span style="flex:1; min-width:0; word-break:break-word; line-height:1.3;">${l.from} → ${l.to} (${l.distance_km?.toFixed(1)} km)</span><span style="flex-shrink:0;">${fmtRp(l.cost)}</span></div>`).join('')}
               </div>` : '';

        const remainHTML = remaining !== null
            ? `<div class="pkg-sisa ${isOver ? 'over' : 'ok'}">${isOver ? '⚠ Melebihi budget ' + fmtRp(Math.abs(remaining)) : '✓ Sisa ' + fmtRp(remaining)}</div>` : '';

        const getFolder = name => {
            if (!name) return '';
            const cleanName = name.includes(' & ') ? name.split(' & ')[0] : name;
            return cleanName.trim().replace(/ /g, '_');
        };

        // BUG FIX: Ambil hanya nama pertama jika durasi > 1 agar tidak menumpuk "A & B & C" di Hari 1
        const displayWisata = (pkg.duration > 1 && pkg.wisata_nama.includes(' & ')) ? pkg.wisata_nama.split(' & ')[0] : pkg.wisata_nama;
        const displayKuliner = (pkg.duration > 1 && pkg.kuliner_nama.includes(' & ')) ? pkg.kuliner_nama.split(' & ')[0] : pkg.kuliner_nama;

        const hFolder = getFolder(pkg.hotel_nama_real || pkg.hotel_nama);
        const wFolder = getFolder(displayWisata);
        const kpFolder = getFolder(pkg.kuliner_pagi_nama);
        const kFolder = getFolder(displayKuliner);

        const isOneDay = pkg.nights === 0 || pkg.cost_akomodasi === 0 || pkg.duration === 1;

        const hotelItemHTML = !isOneDay ? `
                <div class="pkg-item">
                    <div class="pkg-item-icon hotel-img-container" style="position:relative; overflow:hidden;">
                        <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${pkg.hotel_nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                        <div class="pkg-thumb-shimmer" style="display:none;"></div>
                    </div>
                    <div class="pkg-item-info">
                        <div class="pkg-item-cat">Hotel / Akomodasi</div>
                        <div class="pkg-item-name">${pkg.hotel_nama}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.hotel_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/malam</span></div>
                    </div>
                </div>
        ` : '';

        const akomodasiRowHTML = !isOneDay ? `
                    <div class="pkg-breakdown-row">
                        <span>🏨 Akomodasi (${pkg.nights !== undefined ? pkg.nights : pkg.duration - 1} malam × ${pkg.num_rooms} kamar)</span>
                        <span>${fmtRp(pkg.cost_akomodasi)}</span>
                    </div>
        ` : '';

        let subsequentDaysHTML = '';
        if (pkg.duration > 1 && pkg.itinerary && pkg.itinerary.length > 1) {
            subsequentDaysHTML += `
                <div class="pkg-subsequent-days" style="margin-top: 14px; border-top: 1px dashed var(--slate-200); padding-top: 12px; display: flex; flex-direction: column; gap: 10px;">
                    ${pkg.itinerary.slice(1).map(day => {
                const prevDayHotel = pkg.itinerary[day.day - 2]?.hotel || (pkg.hotel_nama_real || pkg.hotel_nama);
                const isPindah = day.hotel && day.hotel !== 'Checkout' && day.hotel !== prevDayHotel;

                const hasHotel = day.hotel && day.hotel !== 'Checkout';
                const hotelCost = hasHotel ? (day.hotel_harga || 0) * pkg.num_rooms : 0;
                const wisataCost = (day.wisata_harga || 0) * pkg.num_persons;
                const kulinerCost = ((day.kuliner_pagi_harga || 0) + (day.kuliner_harga || 0) + (day.kuliner_malam_harga || 0)) * pkg.num_persons;

                const dayLegs = legs.filter(l => l.from.includes(`(Hari ${day.day})`) || l.to.includes(`(Hari ${day.day})`));
                const transportCost = dayLegs.length > 0
                    ? dayLegs.reduce((sum, l) => sum + (l.cost || 0), 0)
                    : Math.round(pkg.cost_transport / pkg.duration);
                const daySubtotal = hotelCost + wisataCost + kulinerCost + transportCost;

                return `
                        <div class="pkg-subsequent-day-row" style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s;">
                            <div style="font-size: 10px; font-weight: 800; color: var(--teal-600); display: flex; align-items: center; gap: 4px; letter-spacing: 0.5px;">
                                <span class="material-symbols-outlined" style="font-size: 13px;">calendar_month</span>
                                <span>REKOMENDASI HARI ${day.day}</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--slate-600);">
                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500); margin-top: 1px;">hotel</span>
                                        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">Hotel: <span style="color: var(--slate-800); font-weight: 700;">${hasHotel ? day.hotel : 'Checkout'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px; flex-shrink: 0; text-align: right;">
                                        ${hasHotel ? `${fmtRp(day.hotel_harga)} /malam ${isPindah ? '<span class="pkg-badge hemat" style="font-size: 9px; padding: 1px 4px; font-weight: 700; margin-left: 4px;">Pindah</span>' : '<span class="pkg-badge balanced" style="font-size: 9px; padding: 1px 4px; font-weight: 700; margin-left: 4px;">Sama</span>'}` : 'Rp 0'}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500); margin-top: 1px;">landscape</span>
                                        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">Wisata: <span style="color: var(--slate-800); font-weight: 700;">${day.wisata}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px; flex-shrink: 0; text-align: right;">${fmtRp(day.wisata_harga || 0)} /orang</span>
                                </div>
                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500); margin-top: 1px;">wb_twilight</span>
                                        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">Makan Pagi: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner_pagi || 'N/A'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px; flex-shrink: 0; text-align: right;">${fmtRp(day.kuliner_pagi_harga || 0)} /org</span>
                                </div>
                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500); margin-top: 1px;">sunny</span>
                                        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">Makan Siang: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px; flex-shrink: 0; text-align: right;">${fmtRp(day.kuliner_harga || 0)} /org</span>
                                </div>
                                ${(pkg.duration === 1 || day.day === pkg.duration) ? '' : `
                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1; min-width: 0;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500); margin-top: 1px;">dark_mode</span>
                                        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">Makan Malam: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner_malam || 'N/A'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px; flex-shrink: 0; text-align: right;">${fmtRp(day.kuliner_malam_harga || 0)} /org</span>
                                </div>
                                `}
                            </div>
                            
                            <!-- Kalkulasi Transparan Harian -->
                            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--slate-200); font-size: 10.5px; color: var(--slate-500); display: flex; flex-direction: column; gap: 3px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Kamar Hotel (${hasHotel ? `${pkg.num_rooms} Kamar × 1 Malam` : '0 Malam'})</span>
                                    <span>${fmtRp(hotelCost)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Tiket Wisata (${pkg.num_persons} Orang)</span>
                                    <span>${fmtRp(wisataCost)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Kuliner (${pkg.num_persons} Orang × ${(pkg.duration === 1 || day.day === pkg.duration) ? '2x' : '3x'} Makan)</span>
                                    <span>${fmtRp(kulinerCost)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Transportasi (${dayLegs.length > 0 ? legs[0]?.vehicle?.split(' ')[0] || 'Mobil' : 'Porsi Harian Flat'})</span>
                                    <span>${fmtRp(transportCost)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-weight: 750; color: var(--slate-700); margin-top: 2px; padding-top: 2px; border-top: 1px solid var(--slate-200);">
                                    <span>Subtotal Hari ${day.day}:</span>
                                    <span>${fmtRp(daySubtotal)}</span>
                                </div>
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'pkg-card';
        card.dataset.kategori = kat;
        card.innerHTML = `
            <div class="pkg-banner ${cls}">
                <span class="pkg-badge ${cls}">${pkg.kategori || 'HEMAT'}</span>
                <span class="pkg-xbi">XBI Optimal</span>
            </div>
            <div class="pkg-body">
                ${hotelItemHTML}
                <div class="pkg-item">
                    <div class="pkg-item-icon kuliner-img-container" style="position:relative; overflow:hidden;">
                        <img src="/assets/GAMBAR/makan/${kpFolder}/${kpFolder}-1.jpg" alt="${pkg.kuliner_pagi_nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'restaurant')" />
                        <div class="pkg-thumb-shimmer" style="display:none;"></div>
                    </div>
                    <div class="pkg-item-info">
                        <div class="pkg-item-cat">Makan Pagi (Kuliner)</div>
                        <div class="pkg-item-name">${pkg.kuliner_pagi_nama || 'N/A'}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.kuliner_pagi_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/porsi</span></div>
                    </div>
                </div>
                <div class="pkg-item">
                    <div class="pkg-item-icon wisata-img-container" style="position:relative; overflow:hidden;">
                        <img src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" alt="${pkg.wisata_nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'landscape')" />
                        <div class="pkg-thumb-shimmer" style="display:none;"></div>
                    </div>
                    <div class="pkg-item-info">
                        <div class="pkg-item-cat">Destinasi Wisata</div>
                        <div class="pkg-item-name">${displayWisata}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.wisata_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/tiket</span></div>
                    </div>
                </div>
                <div class="pkg-item">
                    <div class="pkg-item-icon kuliner-img-container" style="position:relative; overflow:hidden;">
                        <img src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" alt="${pkg.kuliner_nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'restaurant')" />
                        <div class="pkg-thumb-shimmer" style="display:none;"></div>
                    </div>
                    <div class="pkg-item-info">
                        <div class="pkg-item-cat">Makan Siang (Kuliner)</div>
                        <div class="pkg-item-name">${displayKuliner}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.kuliner_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/porsi</span></div>
                    </div>
                </div>
                <div class="pkg-item">
                    <div class="pkg-item-icon kuliner-img-container" style="position:relative; overflow:hidden;">
                        <img src="/assets/GAMBAR/makan/${getFolder(pkg.kuliner_malam_nama)}/${getFolder(pkg.kuliner_malam_nama)}-1.jpg" alt="${pkg.kuliner_malam_nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'restaurant')" />
                        <div class="pkg-thumb-shimmer" style="display:none;"></div>
                    </div>
                    <div class="pkg-item-info">
                        <div class="pkg-item-cat">Makan Malam (Kuliner)</div>
                        <div class="pkg-item-name">${pkg.kuliner_malam_nama}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.kuliner_malam_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/porsi</span></div>
                    </div>
                </div>

                ${subsequentDaysHTML}

                <div class="pkg-divider"></div>

                <div class="pkg-breakdown">
                    ${akomodasiRowHTML}
                    <div class="pkg-breakdown-row">
                        <span id="wisata-label-${pkgUid}">🎯 Tiket Wisata (${pkg.num_persons} orang × ${pkg.duration} wisata)</span>
                        <span id="wisata-display-${pkgUid}">${fmtRp(pkg.cost_wisata)}</span>
                    </div>
                    <div class="pkg-breakdown-row">
                        <span>🍜 Kuliner (${pkg.num_persons} orang × ${pkg.duration === 1 ? 2 : (3 * (pkg.duration - 1) + 2)} makan)</span>
                        <span>${fmtRp(pkg.cost_kuliner)}</span>
                    </div>
                    <div class="pkg-breakdown-row transport-row">
                        <span>🚗 Transportasi (${legs[0]?.vehicle || 'Otomatis'})</span>
                        <span id="transport-display-${pkgUid}">${fmtRp(pkg.cost_transport)}</span>
                    </div>
                    ${legHTML}
                </div>

                ${(pkg.additional_facilities && pkg.additional_facilities.length > 0) ? `
                <div class="wahana-panel" id="wahana-panel-${pkgUid}">
                    <div class="wahana-panel-header">
                        <span class="material-symbols-outlined" style="font-size:15px;color:var(--amber-500);">bolt</span>
                        <span class="wahana-panel-title">Fasilitas Opsional</span>
                        <span class="wahana-panel-badge">Pilih sesuka hati</span>
                    </div>
                    <div class="wahana-items-list">
                        ${pkg.additional_facilities.map((fac, fi) => `
                        <label class="wahana-item" for="wahana-${pkgUid}-${fi}">
                            <input type="checkbox"
                                   class="wahana-checkbox"
                                   id="wahana-${pkgUid}-${fi}"
                                   data-pkg-uid="${pkgUid}"
                                   data-cost="${fac.cost_per_person}"
                                   data-cost-min="${fac.cost_min}"
                                   data-cost-max="${fac.cost_max}"
                                   data-label="${fac.label}"
                                   data-facility-id="${fac.id}">
                            <div class="wahana-item-info">
                                <span class="wahana-item-name">${fac.label}</span>
                                <span class="wahana-item-range">estimasi Rp ${fac.cost_min.toLocaleString('id-ID')}–${fac.cost_max.toLocaleString('id-ID')}/org</span>
                            </div>
                            <span class="wahana-item-cost">+${fmtRp(fac.cost_per_person)}/org</span>
                        </label>
                        `).join('')}
                    </div>
                    <div class="wahana-subtotal" id="wahana-subtotal-${pkgUid}">
                        <span>Dipilih: <strong id="wahana-chosen-${pkgUid}">Rp 0</strong></span>
                        <span class="wahana-note">Tidak dihitung ke total wajib</span>
                    </div>
                </div>` : ''}

                <div class="pkg-total ${remaining !== null ? (isOver ? 'over' : 'ok') : 'neutral'}" id="pkg-total-box-${pkgUid}">
                    <div>
                        <div class="total-label">TOTAL PAKET</div>
                        <div class="total-amount" id="total-display-${pkgUid}">${fmtRp(pkg.total_cost)}</div>
                    </div>
                    ${remaining !== null ? `
                    <span class="material-symbols-outlined" style="font-size:28px;color:${isOver ? '#dc2626' : 'var(--teal-400)'}" id="total-icon-${pkgUid}">
                        ${isOver ? 'warning' : 'check_circle'}
                    </span>` : ''}
                </div>
                <div id="remain-display-${pkgUid}">${remainHTML}</div>

                ${pkg.budget_remaining !== null && pkg.budget_remaining !== undefined ? `
                <div class="extra-dest-panel" id="extra-dest-${pkgUid}" style="display:none;">
                    <div class="extra-dest-header">
                        <span class="material-symbols-outlined" style="font-size:15px;color:var(--teal-600);">add_location_alt</span>
                        <span class="extra-dest-title">Maksimalkan Budget</span>
                    </div>
                    <div class="extra-dest-info" id="extra-dest-info-${pkgUid}"></div>
                    <div class="extra-dest-added" id="extra-dest-added-${pkgUid}"></div>
                    <button class="btn-add-dest" id="btn-add-dest-${pkgUid}"
                            data-pkg-uid="${pkgUid}"
                            data-lat="${pkg.wisata_lat || 0}"
                            data-lon="${pkg.wisata_lon || 0}"
                            data-persons="${pkg.num_persons}"
                            data-wisata-id="${pkg.wisata_id || ''}"
                    >
                        <span class="material-symbols-outlined" style="font-size:15px;">add</span>
                        Tambah Destinasi Wisata Hari Ini
                    </button>
                </div>` : ''}

            </div>
            <div class="pkg-footer" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <button class="pkg-btn-detail" style="flex:1;">Lihat Detail & Rute</button>
                <button class="pkg-btn-save" style="flex:1; background:var(--teal-600); color:#fff; border:none; padding:10px 14px; border-radius:10px; font-weight:800; cursor:pointer; font-size:12.5px; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:background 0.2s;">
                     <span class="material-symbols-outlined" style="font-size:16px;">bookmark</span>
                     <span>Simpan Rencana</span>
                </button>
            </div>
        `;

        // ─── Wahana Toggle: real-time recalculation ───────────────────────
        card.querySelectorAll('.wahana-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const uid = cb.dataset.pkgUid;

                // Sum selected wahana cost for all persons
                let wahanaCostTotal = 0;
                const selectedFacilities = [];
                card.querySelectorAll(`.wahana-checkbox[data-pkg-uid="${uid}"]:checked`).forEach(chk => {
                    const cPerPerson = parseInt(chk.dataset.cost, 10) || 0;
                    wahanaCostTotal += cPerPerson * pkg.num_persons;
                    selectedFacilities.push({ id: chk.dataset.facilityId, label: chk.dataset.label, cost_per_person: cPerPerson });
                });

                // Store on card for Simpan Rencana
                card._selectedFacilities = selectedFacilities;

                // Update display subtotal
                const chosenEl = document.getElementById(`wahana-chosen-${uid}`);
                if (chosenEl) chosenEl.textContent = fmtRp(wahanaCostTotal);

                // Gunakan single source of truth untuk menghitung ulang semuanya
                _refreshExtraDestUI(pkg, card, uid, pkg.duration);
            });
        });

        // ─── Initial: show extra-dest panel if original remaining is sufficient ────
        (() => {
            const uid = pkgUid;
            const extraPanel = card.querySelector(`#extra-dest-${uid}`);
            if (!extraPanel) return;
            const budgetRem = pkg.budget_remaining;
            const MIN_TICKET = 5000;
            const MAX_EXTRA = pkg.duration;
            if (budgetRem !== null && budgetRem !== undefined && budgetRem >= MIN_TICKET) {
                extraPanel.style.display = 'block';
                const infoEl = card.querySelector(`#extra-dest-info-${uid}`);
                if (infoEl) infoEl.textContent = `Sisa ${fmtRp(budgetRem)} — tambah wisata untuk Hari 1!`;
                const addBtn = card.querySelector(`#btn-add-dest-${uid}`);
                if (addBtn) addBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px;">add</span> Tambah Wisata Hari 1`;
            }
        })();

        // ─── Tambah Destinasi button ────────────────────────────────────────────
        const addDestBtn = card.querySelector('.btn-add-dest');
        if (addDestBtn) {
            addDestBtn.addEventListener('click', () => openAddDestinationModal(pkg, card, pkgUid));
        }

        const btn = card.querySelector('.pkg-btn-detail');
        if (btn) {
            btn.addEventListener('click', () => {
                openDetailModal(pkg, card._extraDestinations || [], card._selectedFacilities || [], card._extraTransportCost || 0);
            });
        }

        const saveBtn = card.querySelector('.pkg-btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!window.currentUser) {
                    alert("Silakan masuk (login) terlebih dahulu untuk menyimpan rencana perjalanan Anda ke Dashboard.");
                    if (typeof window.openAuthModal === 'function') {
                        window.openAuthModal();
                    }
                    return;
                }
                const days = [];
                if (pkg.itinerary && pkg.itinerary.length > 0) {
                    pkg.itinerary.forEach(it => {
                        days.push({
                            day: it.day,
                            className: (pkg.kategori || 'Hemat').toLowerCase(),
                            wisata: it.wisata,
                            kuliner: it.kuliner
                        });
                    });
                } else {
                    days.push({
                        day: 1,
                        className: (pkg.kategori || 'Hemat').toLowerCase(),
                        wisata: pkg.wisata_nama,
                        kuliner: pkg.kuliner_nama
                    });
                }

                const newPlan = {
                    id: 'mraya_' + Date.now(),
                    title: `Rencana Wisata Malang (${pkg.kategori || 'Hemat'} - ${pkg.duration} Hari)`,
                    persons: pkg.num_persons,
                    duration: pkg.duration,
                    totalCost: pkg.total_cost + (card._wahanaTotalCost || 0) + (card._extraTransportCost || 0),
                    selected_facilities: card._selectedFacilities || [],
                    extra_destinations: card._extraDestinations || [],
                    hotel: pkg.duration > 1 ? {
                        nama: pkg.hotel_nama_real || pkg.hotel_nama,
                        harga: pkg.hotel_harga,
                        cost: pkg.cost_akomodasi,
                        className: (pkg.kategori || 'Hemat').toLowerCase()
                    } : null,
                    days: days,
                    legs: (() => {
                        const planLegs = [];
                        const originalLegs = pkg.transport_detail?.legs || [];
                        const extraDests = card._extraDestinations || [];

                        originalLegs.forEach(l => {
                            planLegs.push({
                                from: resolveRealName(l.from, pkg),
                                to: resolveRealName(l.to, pkg),
                                from_coords: resolveCoords(l.from, pkg),
                                to_coords: resolveCoords(l.to, pkg),
                                distance: l.distance_km
                            });

                            if (l.from?.startsWith("Wisata")) {
                                const match = l.from.match(/Hari (\d+)/);
                                const dayNum = match ? parseInt(match[1], 10) : 1;
                                const ed = extraDests[dayNum - 1];
                                if (ed) {
                                    const prevLeg = planLegs[planLegs.length - 1];
                                    if (prevLeg) {
                                        prevLeg.to = ed.nama;
                                        prevLeg.to_coords = `${ed.lat},${ed.lon}`;
                                        prevLeg.distance = ed.distance_km;
                                    }

                                    planLegs.push({
                                        from: ed.nama,
                                        to: resolveRealName(l.to, pkg),
                                        from_coords: `${ed.lat},${ed.lon}`,
                                        to_coords: resolveCoords(l.to, pkg),
                                        distance: 2.0
                                    });
                                }
                            }
                        });
                        return planLegs;
                    })(),
                    totalDistance: (pkg.transport_detail?.total_distance_km || 0) + (card._extraDestinations || []).reduce((s, d) => s + d.distance_km, 0),
                    transportCost: pkg.cost_transport || 0,
                    vehDesc: pkg.transport_detail?.legs?.[0]?.vehicle || 'Otomatis'
                };
                bookmarkList.unshift(newPlan);
                localStorage.setItem(getMrayaKey(), JSON.stringify(bookmarkList));
                updateBookmarkUI();
                showSuccessSplash();
            });
        }

        return card;
    }

    // ─────────────────────────────────────────────────
    // Route Detail Modal with Day-by-Day Itinerary
    // ─────────────────────────────────────────────────
    function openDetailModal(pkg, extraDests = [], selectedWahana = [], extraTransportCost = 0) {
        const modal = document.getElementById('route-modal');
        const body = document.getElementById('modal-body-content');
        if (!modal || !body) return;

        const legs = pkg.transport_detail?.legs || [];
        const isOneDay = pkg.nights === 0 || pkg.cost_akomodasi === 0 || pkg.duration === 1;
        const getFolder = name => {
            if (!name) return '';
            const cleanName = name.includes(' & ') ? name.split(' & ')[0] : name;
            return cleanName.trim().replace(/ /g, '_');
        };

        // Bangun daftar waypoint berurutan dengan nama, koordinat, dan tipe tempat
        const routeWaypoints = []; // [{name, coord, type, label}]
        const pushWp = (name, coord, type, label) => {
            if (!name || name === 'N/A' || name === 'Checkout' || !coord) return;
            const clean = name.trim();
            const last = routeWaypoints[routeWaypoints.length - 1];
            if (!last || last.name !== clean) routeWaypoints.push({ name: clean, coord, type, label });
        };

        if (legs.length > 0) {
            const typeMap = { 'Hotel': 'hotel', 'Wisata': 'wisata', 'Makan Pagi': 'kuliner-pagi', 'Makan Siang': 'kuliner-siang', 'Makan Malam': 'kuliner-malam', 'Kuliner': 'kuliner-siang' };
            legs.forEach(leg => {
                const n = resolveRealName(leg.from, pkg);
                const c = resolveCoords(leg.from, pkg);
                const t = typeMap[leg.from?.split('(')[0]?.trim()] || 'place';
                pushWp(n, c, t, leg.from);

                // Sisipkan destinasi tambahan Hari N setelah Wisata (Hari N)
                if (leg.from?.startsWith("Wisata")) {
                    const match = leg.from.match(/Hari (\d+)/);
                    const dayNum = match ? parseInt(match[1], 10) : 1;
                    const ed = extraDests[dayNum - 1];
                    if (ed) {
                        pushWp(ed.nama, `${ed.lat},${ed.lon}`, 'wisata', `Wisata Tambahan (Hari ${dayNum})`);
                    }
                }
            });
            const lastLeg = legs[legs.length - 1];
            const ln = resolveRealName(lastLeg.to, pkg);
            const lc = resolveCoords(lastLeg.to, pkg);
            const lt = typeMap[lastLeg.to?.split('(')[0]?.trim()] || 'place';
            pushWp(ln, lc, lt, lastLeg.to);
        } else {
            if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
                pushWp(pkg.hotel_nama_real || pkg.hotel_nama, `${pkg.hotel_lat || 0},${pkg.hotel_lon || 0}`, 'hotel', 'Hotel');
            }
            pkg.itinerary?.forEach(day => {
                pushWp(day.kuliner_pagi, `${day.kuliner_pagi_lat || 0},${day.kuliner_pagi_lon || 0}`, 'kuliner-pagi', 'Makan Pagi');
                pushWp(day.wisata, `${day.wisata_lat || 0},${day.wisata_lon || 0}`, 'wisata', 'Wisata');

                const ed = extraDests[day.day - 1];
                if (ed) {
                    pushWp(ed.nama, `${ed.lat},${ed.lon}`, 'wisata', `Wisata Tambahan (Hari ${day.day})`);
                }

                pushWp(day.kuliner, `${day.kuliner_lat || 0},${day.kuliner_lon || 0}`, 'kuliner-siang', 'Makan Siang');
                pushWp(day.kuliner_malam, `${day.kuliner_malam_lat || 0},${day.kuliner_malam_lon || 0}`, 'kuliner-malam', 'Makan Malam');
                if (day.hotel && day.hotel !== 'Checkout')
                    pushWp(day.hotel, `${day.hotel_lat || pkg.hotel_lat || 0},${day.hotel_lon || pkg.hotel_lon || 0}`, 'hotel', 'Hotel');
            });
        }

        // Koordinat array untuk backward-compat (masih dipakai di bookmark)
        const uniqueRealNames = routeWaypoints.map(w => w.name);
        const uniqueRealCoords = routeWaypoints.map(w => w.coord);

        // Build unique places image list for gallery view
        const uniquePics = [];
        const addPic = (name, cat, label) => {
            if (!name || name === 'N/A' || name === 'Checkout') return;
            const folder = getFolder(name);
            const picPath = `/assets/GAMBAR/${cat}/${folder}/${folder}-1.jpg`;
            if (!uniquePics.some(p => p.folder === folder)) {
                uniquePics.push({ name, cat, folder, picPath, label });
            }
        };

        if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
            addPic(pkg.hotel_nama_real || pkg.hotel_nama, 'hotel', 'Hotel');
        }

        pkg.itinerary?.forEach(day => {
            addPic(day.wisata, 'wisata', 'Wisata');
            addPic(day.kuliner_pagi, 'makan', 'Makan Pagi');
            addPic(day.kuliner, 'makan', 'Makan Siang');
            addPic(day.kuliner_malam, 'makan', 'Makan Malam');
        });

        extraDests.forEach(ed => {
            addPic(ed.nama, 'wisata', 'Wisata Tambahan');
        });

        const imagesGridHTML = uniquePics.slice(0, 4).map(pic => {
            let errorIcon = 'restaurant';
            if (pic.cat === 'hotel') errorIcon = 'hotel';
            if (pic.cat === 'wisata') errorIcon = 'landscape';

            return `
                <div class="detail-gallery-item" title="${pic.name}">
                    <img src="${pic.picPath}" alt="${escapeHtmlAttr(pic.name)}" onerror="handleImgErrorRecom(this, '${errorIcon}')" />
                    <div class="detail-gallery-caption">
                        <span class="detail-gallery-label">${pic.label}</span>
                        <span class="detail-gallery-name">${pic.name}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Build accommodation cost breakdown HTML
        let accommodationBreakdownHTML = '';
        if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
            accommodationBreakdownHTML = `
                <div class="detail-calc-row">
                    <div class="detail-calc-label-col">
                        <strong class="detail-calc-main-label">🏨 Akomodasi Hotel</strong>
                        <span class="detail-calc-sub-label">
                            ${pkg.nights} malam × ${pkg.num_rooms} kamar
                        </span>
                    </div>
                    <div class="detail-calc-val-col">
                        <strong class="detail-calc-main-val">${fmtRp(pkg.cost_akomodasi)}</strong>
                        <span class="detail-calc-sub-val">@ ${fmtRp(pkg.hotel_harga)}/malam</span>
                    </div>
                </div>
            `;
        }

        // Calculate meals count
        const mealsCount = pkg.duration === 1 ? 2 : (3 * (pkg.duration - 1) + 2);

        // Build daily timeline cards
        const timelineHTML = (pkg.itinerary || []).map(day => {
            const ed = extraDests[day.day - 1];
            let dayExtraHTML = '';
            if (ed) {
                dayExtraHTML = `
                    <div style="display:flex; align-items:center; gap:8px; border-left: 2px solid var(--teal-500); padding-left: 8px; margin-top: 4px; margin-bottom: 4px;">
                        <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">add_location_alt</span>
                        <span>Wisata Tambahan: <strong style="color:var(--slate-800);">${ed.nama}</strong></span>
                    </div>
                `;
            }
            return `
                <div style="background:#fff; border:1px solid var(--slate-200); border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--slate-100); padding-bottom:6px;">
                        <span style="font-size:11px; font-weight:800; color:var(--teal-600); letter-spacing:0.5px;">HARI ${day.day}</span>
                        <span style="font-size:10px; color:var(--slate-400); font-weight:700;">Destinasi & Kuliner</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:12.5px; font-weight:600; color:var(--slate-600);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">landscape</span>
                            <span>Wisata: <strong style="color:var(--slate-800);">${day.wisata}</strong></span>
                        </div>
                        ${dayExtraHTML}
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">wb_twilight</span>
                            <span>Makan Pagi: <strong style="color:var(--slate-800);">${day.kuliner_pagi || 'N/A'}</strong></span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">sunny</span>
                            <span>Makan Siang: <strong style="color:var(--slate-800);">${day.kuliner}</strong></span>
                        </div>
                        ${(day.kuliner_malam && day.kuliner_malam !== 'N/A') ? `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">dark_mode</span>
                            <span>Makan Malam: <strong style="color:var(--slate-800);">${day.kuliner_malam}</strong></span>
                        </div>
                        ` : ''}
                        ${(day.hotel && day.hotel !== 'Checkout') ? `
                        <div style="display:flex; align-items:center; gap:8px; border-top:1px dashed var(--slate-100); margin-top:4px; padding-top:4px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">hotel</span>
                            <span>Hotel: <strong style="color:var(--slate-800);">${day.hotel}</strong></span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Dynamic price aggregation inside the modal
        let extraBreakdownHTML = '';
        const wahanaTotal = selectedWahana.reduce((s, f) => s + f.cost_per_person * pkg.num_persons, 0);
        const extraTickets = extraDests.reduce((s, d) => s + d.total_ticket_cost, 0);
        const totalCost = pkg.total_cost + wahanaTotal + extraTickets + extraTransportCost;
        const costWisata = pkg.cost_wisata + wahanaTotal + extraTickets;
        const costTransport = pkg.cost_transport + extraTransportCost;

        let originalDist = pkg.transport_detail?.total_distance_km || 0;
        let extraDist = extraDests.reduce((s, d) => s + d.distance_km, 0);
        const totalDistance = originalDist + extraDist;

        if (selectedWahana.length > 0) {
            extraBreakdownHTML += selectedWahana.map(fac => `
                <div class="detail-calc-row">
                    <div class="detail-calc-label-col">
                        <strong class="detail-calc-main-label">⚡ ${fac.label} (Fasilitas Opsional)</strong>
                        <span class="detail-calc-sub-label">
                            Dicentang oleh pengguna × ${pkg.num_persons} orang
                        </span>
                    </div>
                    <div class="detail-calc-val-col">
                        <strong class="detail-calc-main-val">${fmtRp(fac.cost_per_person * pkg.num_persons)}</strong>
                        <span class="detail-calc-sub-val">@ ${fmtRp(fac.cost_per_person)}/org</span>
                    </div>
                </div>
            `).join('');
        }
        if (extraDests.length > 0) {
            extraBreakdownHTML += extraDests.map((ed, edi) => `
                <div class="detail-calc-row">
                    <div class="detail-calc-label-col">
                        <strong class="detail-calc-main-label">📍 Wisata Tambahan: ${ed.nama}</strong>
                        <span class="detail-calc-sub-label">
                            Ditambahkan via "Maksimalkan Budget" × ${pkg.num_persons} orang
                        </span>
                    </div>
                    <div class="detail-calc-val-col">
                        <strong class="detail-calc-main-val">${fmtRp(ed.total_ticket_cost)}</strong>
                        <span class="detail-calc-sub-val">@ ${fmtRp(ed.harga_tiket)}/org</span>
                    </div>
                </div>
            `).join('');
        }

        // Put everything together
        body.innerHTML = `
            <div class="pkg-detail-premium">
                <!-- 1. Header Banner -->
                <div class="detail-header-banner">
                    <div class="detail-header-content">
                        <div class="detail-header-top">
                            <span class="detail-header-badge">
                                Paket ${pkg.kategori || 'Hemat'}
                            </span>
                            <span class="detail-header-meta">
                                👥 ${pkg.num_persons} Peserta · 📅 ${pkg.duration} Hari
                            </span>
                        </div>
                        <h2 class="detail-header-title">Rencana Perjalanan Cerdas FCM</h2>
                        <p class="detail-header-desc">
                            Kombinasi destinasi, penginapan, dan kuliner terklaster dengan jarak spasial terpendek.
                        </p>
                    </div>
                    <div class="detail-header-decor"></div>
                </div>

                <!-- 2. Visual Gallery of the Package (Gambar Tempat) -->
                <div class="detail-gallery-wrap">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">gallery_thumbnail</span>
                        Galeri Destinasi & Akomodasi Pilihan
                    </h4>
                    <div class="detail-gallery-grid">
                        ${imagesGridHTML}
                    </div>
                </div>

                <!-- 3. Rincian Anggaran (Semua Hitungannya) -->
                <div class="detail-calc-card">
                    <h4 class="detail-calc-header">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">receipt_long</span>
                        Kalkulasi Transparan & Rincian Biaya Paket
                    </h4>
                    <div class="detail-calc-list">
                        ${accommodationBreakdownHTML}
                        
                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🌲 Tiket Masuk Wisata</strong>
                                <span class="detail-calc-sub-label">
                                    1x Tiket Hari 1 (sesuai rumus skripsi) × ${pkg.num_persons} orang
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(costWisata)}</strong>
                                <span class="detail-calc-sub-val">@ ${fmtRp(pkg.wisata_harga)}/org</span>
                            </div>
                        </div>

                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🍜 Konsumsi & Kuliner</strong>
                                <span class="detail-calc-sub-label">
                                    Makan ${pkg.num_persons} orang × ${mealsCount} porsi makan
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(pkg.cost_kuliner)}</strong>
                                <span class="detail-calc-sub-val">Pagi, siang, malam</span>
                            </div>
                        </div>

                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🚗 Transportasi Darat</strong>
                                <span class="detail-calc-sub-label transport-label-trunc">
                                    ${pkg.transport_detail?.legs?.[0]?.vehicle || 'Otomatis'}
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(costTransport)}</strong>
                                <span class="detail-calc-sub-val">
                                    📏 ${totalDistance?.toFixed(1) || '?'} km
                                </span>
                            </div>
                        </div>

                        ${extraBreakdownHTML}

                        <div class="detail-calc-total-row">
                            <strong class="detail-calc-total-label">Total Estimasi Gabungan:</strong>
                            <strong class="detail-calc-total-val">${fmtRp(totalCost)}</strong>
                        </div>
                    </div>
                </div>

                <!-- 4. Leaflet Route Map (OSRM geometry + OSM tiles) -->
                <div class="detail-map-wrapper">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">map</span>
                        Peta Rute Perjalanan (OSRM + OpenStreetMap)
                    </h4>
                    <div id="leaflet-route-map" style="height:400px; border-radius:12px; overflow:hidden; border:1px solid var(--slate-200); background:#f1f5f9;">
                        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--slate-400);font-size:13px;gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:20px;">sync</span> Memuat peta…
                        </div>
                    </div>
                    <p style="margin:6px 0 0;font-size:11px;color:var(--slate-400);">
                        Peta berbasis OpenStreetMap · Rute dihitung via OSRM · Klik marker untuk validasi di Google Maps
                    </p>
                </div>

                <!-- 5. Day-by-Day Timeline -->
                <div class="detail-timeline-wrapper">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">calendar_today</span>
                        Rencana Perjalanan Harian
                    </h4>
                    <div class="bookmark-day-list">
                        ${timelineHTML}
                    </div>
                </div>

                <!-- 6. Action Buttons -->
                <div class="detail-footer-actions">
                    <button onclick="document.getElementById('route-modal').classList.remove('show')" class="gmaps-btn" style="background:var(--slate-600);">Tutup</button>
                </div>
            </div>
        `;

        modal.classList.add('show');
        // Render Leaflet setelah DOM modal sudah ada
        requestAnimationFrame(() => initLeafletRouteMap('leaflet-route-map', routeWaypoints));
    }

    function openCustomDetailModal(legs, accommodationCost, totalWisataCost, totalKulinerCost, transportCost, runningCost, totalDistance, duration, persons, vehDesc, pkg) {
        const modal = document.getElementById('route-modal');
        const body = document.getElementById('modal-body-content');
        if (!modal || !body) return;

        const getFolder = name => {
            if (!name) return '';
            const cleanName = name.includes(' & ') ? name.split(' & ')[0] : name;
            return cleanName.trim().replace(/ /g, '_');
        };

        const nights = duration > 1 ? duration - 1 : 0;

        // Bangun daftar waypoint berurutan dengan nama, koordinat, dan tipe tempat
        const routeWaypoints = []; // [{name, coord, type, label}]
        const pushWp = (name, coord, type, label) => {
            if (!name || name === 'N/A' || name === 'Checkout' || !coord || coord === '0,0') return;
            const clean = name.trim();
            const last = routeWaypoints[routeWaypoints.length - 1];
            if (!last || last.name !== clean) routeWaypoints.push({ name: clean, coord, type, label });
        };

        legs.forEach(leg => {
            if (leg.from_coords) {
                const coordStr = `${leg.from_coords[0]},${leg.from_coords[1]}`;
                pushWp(leg.from, coordStr, leg.from_type || 'place', leg.from);
            }
        });
        if (legs.length > 0) {
            const lastLeg = legs[legs.length - 1];
            if (lastLeg.to_coords) {
                const coordStr = `${lastLeg.to_coords[0]},${lastLeg.to_coords[1]}`;
                pushWp(lastLeg.to, coordStr, lastLeg.to_type || 'place', lastLeg.to);
            }
        }

        // Build unique places image list for gallery view
        const uniquePics = [];
        const addPic = (name, cat, label) => {
            if (!name || name === 'N/A' || name === 'Checkout') return;
            const folder = getFolder(name);
            const picPath = `/assets/GAMBAR/${cat}/${folder}/${folder}-1.jpg`;
            if (!uniquePics.some(p => p.folder === folder)) {
                uniquePics.push({ name, cat, folder, picPath, label });
            }
        };

        legs.forEach(leg => {
            let cat = 'wisata';
            if (leg.from_type === 'hotel') cat = 'hotel';
            else if (leg.from_type && leg.from_type.startsWith('kuliner')) cat = 'makan';

            let label = 'Tempat';
            if (leg.from_type === 'hotel') label = 'Hotel';
            else if (leg.from_type === 'wisata') label = 'Wisata';
            else if (leg.from_type === 'kuliner-pagi') label = 'Makan Pagi';
            else if (leg.from_type === 'kuliner-siang') label = 'Makan Siang';
            else if (leg.from_type === 'kuliner-malam') label = 'Makan Malam';

            addPic(leg.from, cat, label);
        });

        const imagesGridHTML = uniquePics.slice(0, 4).map(pic => {
            let errorIcon = 'restaurant';
            if (pic.cat === 'hotel') errorIcon = 'hotel';
            if (pic.cat === 'wisata') errorIcon = 'landscape';

            return `
                <div class="detail-gallery-item" title="${pic.name}">
                    <img src="${pic.picPath}" alt="${escapeHtmlAttr(pic.name)}" onerror="handleImgErrorRecom(this, '${errorIcon}')" />
                    <div class="detail-gallery-caption">
                        <span class="detail-gallery-label">${pic.label}</span>
                        <span class="detail-gallery-name">${pic.name}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Build accommodation cost breakdown HTML
        let accommodationBreakdownHTML = '';
        if (nights > 0) {
            accommodationBreakdownHTML = `
                <div class="detail-calc-row">
                    <div class="detail-calc-label-col">
                        <strong class="detail-calc-main-label">🏨 Akomodasi Hotel</strong>
                        <span class="detail-calc-sub-label">
                            ${nights} malam × ${pkg.num_rooms || 1} kamar
                        </span>
                    </div>
                    <div class="detail-calc-val-col">
                        <strong class="detail-calc-main-val">${fmtRp(accommodationCost)}</strong>
                    </div>
                </div>
            `;
        }

        // Calculate meals count
        const mealsCount = duration === 1 ? 2 : (3 * (duration - 1) + 2);

        // Build custom itinerary for the timeline
        const customItinerary = [];
        for (let dNum = 1; dNum <= duration; dNum++) {
            let dayPlan = selectedDays[dNum];
            if (!dayPlan) {
                let dayItin = pkg.itinerary?.find(item => item.day === dNum) || {
                    wisata: pkg.wisata_nama,
                    kuliner: pkg.kuliner_nama,
                    kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
                    kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A'
                };
                dayPlan = {
                    day: dNum,
                    wisata: dayItin.wisata || dayItin.wisata_nama || pkg.wisata_nama,
                    kuliner: dayItin.kuliner || dayItin.kuliner_nama || pkg.kuliner_nama,
                    kuliner_pagi: dayItin.kuliner_pagi || 'N/A',
                    kuliner_malam: dayItin.kuliner_malam || 'N/A'
                };
            } else {
                dayPlan = {
                    day: dNum,
                    wisata: dayPlan.wisata,
                    kuliner: dayPlan.kuliner,
                    kuliner_pagi: dayPlan.kuliner_pagi,
                    kuliner_malam: dayPlan.kuliner_malam
                };
            }
            // Add hotel info if applicable
            let hotelNama = null;
            if (nights > 0) {
                if (hotelMode === 'same') {
                    hotelNama = selectedHotel ? selectedHotel.nama : pkg.hotel_nama;
                } else {
                    const activeN = selectedHotelsByNight[dNum];
                    hotelNama = activeN ? activeN.nama : pkg.hotel_nama;
                }
            }
            dayPlan.hotel = hotelNama;
            customItinerary.push(dayPlan);
        }

        // Build daily timeline cards
        const timelineHTML = customItinerary.map(day => {
            return `
                <div style="background:#fff; border:1px solid var(--slate-200); border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--slate-100); padding-bottom:6px;">
                        <span style="font-size:11px; font-weight:800; color:var(--teal-600); letter-spacing:0.5px;">HARI ${day.day}</span>
                        <span style="font-size:10px; color:var(--slate-400); font-weight:700;">Destinasi & Kuliner</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size:12.5px; font-weight:600; color:var(--slate-600);">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">landscape</span>
                            <span>Wisata: <strong style="color:var(--slate-800);">${day.wisata}</strong></span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">wb_twilight</span>
                            <span>Makan Pagi: <strong style="color:var(--slate-800);">${day.kuliner_pagi || 'N/A'}</strong></span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">sunny</span>
                            <span>Makan Siang: <strong style="color:var(--slate-800);">${day.kuliner}</strong></span>
                        </div>
                        ${(day.kuliner_malam && day.kuliner_malam !== 'N/A') ? `
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">dark_mode</span>
                            <span>Makan Malam: <strong style="color:var(--slate-800);">${day.kuliner_malam}</strong></span>
                        </div>
                        ` : ''}
                        ${(day.hotel && day.hotel !== 'Checkout' && day.hotel !== 'Tanpa Akomodasi (One Day Trip)') ? `
                        <div style="display:flex; align-items:center; gap:8px; border-top:1px dashed var(--slate-100); margin-top:4px; padding-top:4px;">
                            <span class="material-symbols-outlined" style="font-size:16px; color:var(--teal-500);">hotel</span>
                            <span>Hotel: <strong style="color:var(--slate-800);">${day.hotel}</strong></span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Put everything together
        body.innerHTML = `
            <div class="pkg-detail-premium">
                <!-- 1. Header Banner -->
                <div class="detail-header-banner">
                    <div class="detail-header-content">
                        <div class="detail-header-top">
                            <span class="detail-header-badge">
                                Paket Kustom
                            </span>
                            <span class="detail-header-meta">
                                👥 ${persons} Peserta · 📅 ${duration} Hari
                            </span>
                        </div>
                        <h2 class="detail-header-title">Rencana Perjalanan Kustom Anda</h2>
                        <p class="detail-header-desc">
                            Kombinasi akomodasi, destinasi, dan kuliner yang telah Anda pilih secara kustom.
                        </p>
                    </div>
                    <div class="detail-header-decor"></div>
                </div>

                <!-- 2. Visual Gallery of the Package (Gambar Tempat) -->
                <div class="detail-gallery-wrap">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">gallery_thumbnail</span>
                        Galeri Destinasi & Akomodasi Pilihan
                    </h4>
                    <div class="detail-gallery-grid">
                        ${imagesGridHTML}
                    </div>
                </div>

                <!-- 3. Rincian Anggaran (Semua Hitungannya) -->
                <div class="detail-calc-card">
                    <h4 class="detail-calc-header">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">receipt_long</span>
                        Kalkulasi Transparan & Rincian Biaya Rute
                    </h4>
                    <div class="detail-calc-list">
                        ${accommodationBreakdownHTML}
                        
                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🌲 Tiket Masuk Wisata</strong>
                                <span class="detail-calc-sub-label">
                                    1x Tiket Hari 1 (sesuai rumus skripsi) × ${persons} orang
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(totalWisataCost)}</strong>
                            </div>
                        </div>

                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🍜 Konsumsi & Kuliner</strong>
                                <span class="detail-calc-sub-label">
                                    Makan ${persons} orang × ${mealsCount} porsi makan
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(totalKulinerCost)}</strong>
                            </div>
                        </div>

                        <div class="detail-calc-row">
                            <div class="detail-calc-label-col">
                                <strong class="detail-calc-main-label">🚗 Transportasi Darat</strong>
                                <span class="detail-calc-sub-label transport-label-trunc">
                                    ${vehDesc}
                                </span>
                            </div>
                            <div class="detail-calc-val-col">
                                <strong class="detail-calc-main-val">${fmtRp(transportCost)}</strong>
                                <span class="detail-calc-sub-val">
                                    📏 ${totalDistance.toFixed(1)} km
                                </span>
                            </div>
                        </div>

                        <div class="detail-calc-total-row">
                            <strong class="detail-calc-total-label">Total Estimasi Gabungan:</strong>
                            <strong class="detail-calc-total-val">${fmtRp(runningCost)}</strong>
                        </div>
                    </div>
                </div>

                <!-- 4. Leaflet Route Map (OSRM geometry + OSM tiles) -->
                <div class="detail-map-wrapper">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">map</span>
                        Peta Rute Perjalanan (OSRM + OpenStreetMap)
                    </h4>
                    <div id="leaflet-route-map" style="height:400px; border-radius:12px; overflow:hidden; border:1px solid var(--slate-200); background:#f1f5f9;">
                        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--slate-400);font-size:13px;gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:20px;">sync</span> Memuat peta…
                        </div>
                    </div>
                    <p style="margin:6px 0 0;font-size:11px;color:var(--slate-400);">
                        Peta berbasis OpenStreetMap · Rute dihitung via OSRM · Klik marker untuk validasi di Google Maps
                    </p>
                </div>

                <!-- 5. Day-by-Day Timeline -->
                <div class="detail-timeline-wrapper">
                    <h4 class="detail-section-title">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">calendar_today</span>
                        Rencana Perjalanan Harian
                    </h4>
                    <div class="bookmark-day-list">
                        ${timelineHTML}
                    </div>
                </div>

                <!-- 6. Action Buttons -->
                <div class="detail-footer-actions">
                    <button onclick="document.getElementById('route-modal').classList.remove('show')" class="gmaps-btn" style="background:var(--slate-600);">Tutup</button>
                </div>
            </div>
        `;

        modal.classList.add('show');
        // Render Leaflet setelah DOM modal sudah ada
        requestAnimationFrame(() => initLeafletRouteMap('leaflet-route-map', routeWaypoints));
    }

    // ─── Leaflet + OSRM Route Map ───────────────────────────────────────
    let _leafletMapInstance = null;

    const WAYPOINT_STYLE = {
        'hotel': { color: '#2563eb', emoji: '🏨', label: 'Hotel' },
        'wisata': { color: '#16a34a', emoji: '🏞️', label: 'Wisata' },
        'kuliner-pagi': { color: '#d97706', emoji: '☀️', label: 'Makan Pagi' },
        'kuliner-siang': { color: '#ea580c', emoji: '🍽️', label: 'Makan Siang' },
        'kuliner-malam': { color: '#7c3aed', emoji: '🌙', label: 'Makan Malam' },
        'place': { color: '#475569', emoji: '📍', label: 'Tempat' },
    };

    function makeLeafletIcon(type, seq) {
        const s = WAYPOINT_STYLE[type] || WAYPOINT_STYLE.place;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
            <ellipse cx="16" cy="40" rx="6" ry="2" fill="rgba(0,0,0,0.2)"/>
            <path d="M16 0C9.4 0 4 5.4 4 12c0 9 12 28 12 28S28 21 28 12C28 5.4 22.6 0 16 0z" fill="${s.color}"/>
            <circle cx="16" cy="12" r="7" fill="#fff"/>
            <text x="16" y="16" text-anchor="middle" font-size="9" font-weight="700" fill="${s.color}">${seq}</text>
        </svg>`;
        return L.divIcon({
            html: svg, className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44]
        });
    }

    async function fetchOSRMGeometry(waypoints) {
        if (waypoints.length < 2) return null;
        const coordStr = waypoints
            .map(w => { const [lat, lon] = w.coord.split(','); return `${parseFloat(lon)},${parseFloat(lat)}`; })
            .join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await res.json();
            if (data.code === 'Ok') return data.routes[0].geometry;
        } catch (e) {
            console.warn('OSRM geometry fetch failed:', e);
        }
        return null;
    }

    async function initLeafletRouteMap(containerId, waypoints) {
        if (typeof L === 'undefined') return;

        // Hancurkan instance lama jika ada
        if (_leafletMapInstance) {
            _leafletMapInstance.remove();
            _leafletMapInstance = null;
        }

        const container = document.getElementById(containerId);
        if (!container || waypoints.length === 0) return;

        const map = L.map(container, { zoomControl: true });
        _leafletMapInstance = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://openstreetmap.org" target="_blank">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);

        const latLngs = waypoints.map(w => {
            const [lat, lon] = w.coord.split(',').map(Number);
            return [lat, lon];
        }).filter(([lat, lon]) => lat !== 0 || lon !== 0);

        if (latLngs.length === 0) return;

        // Tambahkan marker dulu (langsung, tidak tunggu OSRM)
        waypoints.forEach((wp, idx) => {
            const [lat, lon] = wp.coord.split(',').map(Number);
            if (lat === 0 && lon === 0) return;
            const s = WAYPOINT_STYLE[wp.type] || WAYPOINT_STYLE.place;
            const gmapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(wp.name)}/@${lat},${lon},17z`;
            L.marker([lat, lon], { icon: makeLeafletIcon(wp.type, idx + 1) })
                .addTo(map)
                .bindPopup(`
                    <div style="min-width:190px;font-family:system-ui,sans-serif;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px;">
                            ${s.emoji} ${wp.name}
                        </div>
                        <span style="font-size:10px;background:${s.color}22;color:${s.color};padding:2px 7px;border-radius:99px;font-weight:600;">
                            ${s.label}
                        </span>
                        <hr style="margin:7px 0;border:none;border-top:1px solid #e2e8f0;">
                        <a href="${gmapsUrl}" target="_blank"
                           style="font-size:11px;color:#0ea5e9;text-decoration:none;display:flex;align-items:center;gap:4px;font-weight:600;">
                            🔗 Validasi di Google Maps
                        </a>
                    </div>
                `);
        });

        map.fitBounds(latLngs, { padding: [24, 24] });

        // Fetch OSRM geometry secara async — gambar polyline setelah dapat
        const geometry = await fetchOSRMGeometry(waypoints.filter(w => {
            const [lat, lon] = w.coord.split(',').map(Number);
            return lat !== 0 || lon !== 0;
        }));

        if (geometry && _leafletMapInstance === map) {
            const routeLatLngs = geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            L.polyline(routeLatLngs, { color: '#2563eb', weight: 4, opacity: 0.75 }).addTo(map);
            map.fitBounds(routeLatLngs, { padding: [24, 24] });
        }
    }
    // ────────────────────────────────────────────────────────────────────

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('route-modal')?.classList.remove('show');
    });

    document.getElementById('route-modal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('route-modal')) {
            document.getElementById('route-modal').classList.remove('show');
        }
    });

    // ─────────────────────────────────────────────────
    // API Call
    // ─────────────────────────────────────────────────
    async function callRecommend(payload, workflowLabel) {
        // Reset interactive planner variables on new recommendations
        selectedHotel = null;
        selectedHotelsByNight = {};
        selectedDays = {};
        showingAllAlternatives = {};
        showingAllAIAlternatives = false;
        currentAlternativeLimit = 5;
        currentStep = 0;
        hotelMode = 'same';
        activeOptionPackages = [];

        showLoading();
        try {
            const fd = new FormData();
            Object.entries(payload).forEach(([k, v]) => { if (v !== null && v !== '' && v !== undefined) fd.append(k, v); });

            const res = await fetch('/api/recommend', {
                method: 'POST',
                body: fd,
                headers: { 'X-CSRF-TOKEN': csrfToken() }
            });
            const data = await res.json();

            hideLoading();

            if (!res.ok) {
                showError(data.error || 'Server error. Coba lagi.');
                return;
            }
            if (data.status === 'success') {
                showResults(data.data, workflowLabel);
            } else {
                showError(data.error || 'Terjadi kesalahan pada server.');
            }
        } catch (err) {
            hideLoading();
            const msg = err.message || 'Koneksi ke server gagal. Pastikan PHP artisan serve berjalan.';
            showError(msg);
        }
    }


    // ─────────────────────────────────────────────────
    // Form Submissions
    // ─────────────────────────────────────────────────
    document.getElementById('form-budget')?.addEventListener('submit', e => {
        e.preventDefault();
        const budget = getRawBudget('b-budget');
        const persons = +document.getElementById('b-persons')?.value || 1;
        const duration = +document.getElementById('b-duration')?.value || 1;
        const transport = document.getElementById('b-transport')?.value || '';
        const hotel_mode = document.getElementById('b-hotel-mode')?.value || 'same';

        if (!budget) {
            showError('Masukkan total anggaran terlebih dahulu.');
            return;
        }

        callRecommend({ workflow: 'budget', budget, persons, duration, transport, hotel_mode },
            `Budget Rp ${budget.toLocaleString('id-ID')} — ${persons} orang, ${duration} hari`);
    });

    document.getElementById('form-flexible')?.addEventListener('submit', e => {
        e.preventDefault();
        const persons = +document.getElementById('f-persons')?.value || 1;
        const duration = +document.getElementById('f-duration')?.value || 1;

        callRecommend({ workflow: 'flexible', persons, duration },
            `Flexible Explore — ${persons} orang, ${duration} hari`);
    });

    document.getElementById('form-destination')?.addEventListener('submit', e => {
        e.preventDefault();
        const destEl = document.getElementById('d-dest-id');
        if (!destEl) return;
        const destId = destEl.value;
        const persons = +document.getElementById('d-persons')?.value || 1;
        const duration = +document.getElementById('d-duration')?.value || 1;
        const budget = getRawBudget('d-budget');
        const transport = document.getElementById('d-transport')?.value || '';
        const hotel_mode = document.getElementById('d-hotel-mode')?.value || 'same';

        if (!destId) { showError('Pilih destinasi wisata terlebih dahulu.'); return; }

        let dMin = calculateScaledMinBudget(persons, duration, hotel_mode);
        const slider = document.getElementById('d-budget');
        if (slider && slider.dataset.aiMin) {
            dMin = parseInt(slider.dataset.aiMin);
        }

        const sliderVal = parseFloat(document.getElementById('d-budget')?.value) || 0;
        const isNoBudget = sliderVal < dMin;

        const destSearchInp = document.getElementById('d-dest-search-input');
        callRecommend({ workflow: 'destination', dest_id: destId, persons, duration, budget: (isNoBudget ? null : (budget || null)), transport, hotel_mode },
            `Destination-First — ${destSearchInp ? destSearchInp.value : ''}`);
    });

    // ─────────────────────────────────────────────────
    // Reset
    // ─────────────────────────────────────────────────
    document.getElementById('reset-btn')?.addEventListener('click', () => {
        hideResults();
        const panel = document.getElementById('wf-' + activeWorkflow);
        if (panel) panel.style.display = 'block';
    });

    // ─────────────────────────────────────────────────
    // TAHAP 7: INTERACTIVE PLANNER & BOOKMARK STATE & LOGIC
    // ─────────────────────────────────────────────────
    const getMrayaKey = () => typeof window.getMrayaBookmarksKey === 'function' ? window.getMrayaBookmarksKey() : 'mraya_bookmarks';
    let bookmarkList = [];
    try {
        bookmarkList = JSON.parse(localStorage.getItem(getMrayaKey()) || '[]');
    } catch (e) {
        bookmarkList = [];
    }
    let selectedHotel = null;
    let selectedHotelsByNight = {};
    let selectedDays = {};
    let showingAllAlternatives = {};
    let showingAllAIAlternatives = false;
    let currentAlternativeLimit = 5;
    let currentStep = 0;
    let lastRenderedStep = null;
    let activeOptionPackages = [];
    let hotelMode = 'same';

    // Custom interactive flow state variables
    let chosenStepPackageIdx = null;
    let stepWisataSelected = {};
    let stepKulinerSelected = {};

    function getDropdownOptionsHTML(alts, selectedVal, key, type, classIdx, context = {}) {
        let visibleAlts = JSON.parse(JSON.stringify(alts)); // clone to avoid sorting side-effects

        let anchorLat = 0;
        let anchorLon = 0;
        let anchorName = '';

        if (activeOptionPackages && activeOptionPackages[classIdx]) {
            const pkg = activeOptionPackages[classIdx];
            const duration = pkg.duration;
            const persons = pkg.num_persons;
            const nights = duration - 1;

            // 1. Calculate spatial anchor point
            if (type === 'wisata' && context.dayNum !== undefined) {
                const d = context.dayNum;
                if (hotelMode === 'same') {
                    if (selectedHotel) {
                        anchorLat = selectedHotel.lat;
                        anchorLon = selectedHotel.lon;
                        anchorName = selectedHotel.nama;
                    } else {
                        anchorLat = pkg.hotel_lat || 0;
                        anchorLon = pkg.hotel_lon || 0;
                        anchorName = pkg.hotel_nama || '';
                    }
                } else {
                    const activeN = selectedHotelsByNight[d];
                    if (activeN) {
                        anchorLat = activeN.lat;
                        anchorLon = activeN.lon;
                        anchorName = activeN.nama;
                    } else {
                        anchorLat = pkg.hotel_lat || 0;
                        anchorLon = pkg.hotel_lon || 0;
                        anchorName = pkg.hotel_nama || '';
                    }
                }
            } else if (type === 'kuliner' && context.dayNum !== undefined) {
                const d = context.dayNum;
                const dayPlan = selectedDays[d];
                if (dayPlan) {
                    anchorLat = dayPlan.wisata_lat;
                    anchorLon = dayPlan.wisata_lon;
                    anchorName = dayPlan.wisata;
                } else {
                    const dayItin = pkg.itinerary?.find(item => item.day === d);
                    if (dayItin) {
                        anchorLat = dayItin.wisata_lat || 0;
                        anchorLon = dayItin.wisata_lon || 0;
                        anchorName = dayItin.wisata || '';
                    } else {
                        anchorLat = pkg.wisata_lat || 0;
                        anchorLon = pkg.wisata_lon || 0;
                        anchorName = pkg.wisata_nama || '';
                    }
                }
            }

            // Calculate distance for all alternatives
            visibleAlts.forEach(item => {
                const itemLat = item.lat || item.Latitude || 0;
                const itemLon = item.lon || item.Longitude || 0;
                if (anchorLat && anchorLon && itemLat && itemLon) {
                    item.distFromAnchor = haversineDist(anchorLat, anchorLon, itemLat, itemLon);
                } else {
                    item.distFromAnchor = 9999;
                }

                // Calculate distance to hotel for kuliner alternatives
                if (type === 'kuliner' && context.dayNum !== undefined) {
                    const d = context.dayNum;
                    let hLat = 0, hLon = 0;
                    if (nights > 0) {
                        if (hotelMode === 'same') {
                            if (selectedHotel) {
                                hLat = selectedHotel.lat;
                                hLon = selectedHotel.lon;
                            } else {
                                hLat = pkg.hotel_lat || 0;
                                hLon = pkg.hotel_lon || 0;
                            }
                        } else {
                            const activeN = selectedHotelsByNight[d] || selectedHotelsByNight[d - 1] || null;
                            if (activeN) {
                                hLat = activeN.lat;
                                hLon = activeN.lon;
                            } else {
                                hLat = pkg.hotel_lat || 0;
                                hLon = pkg.hotel_lon || 0;
                            }
                        }
                    }
                    if (hLat && hLon && itemLat && itemLon) {
                        item.distToHotel = haversineDist(itemLat, itemLon, hLat, hLon);
                    } else {
                        item.distToHotel = 0;
                    }
                }
            });

            // Sort nearest first!
            visibleAlts.sort((a, b) => a.distFromAnchor - b.distFromAnchor);

            // 2. Perform budget forecast simulation for each option
            let budgetLimit = 0;
            if (activeWorkflow === 'budget') {
                budgetLimit = getRawBudget('b-budget');
            } else if (activeWorkflow === 'destination') {
                budgetLimit = getRawBudget('d-budget');
            }
            const hasBudget = budgetLimit > 0;

            if (hasBudget) {
                visibleAlts.forEach(item => {
                    let hypAccCost = 0;
                    let hypWisCost = 0;
                    let hypKulCost = 0;
                    let hypTotalDistance = 0;

                    const itemHarga = item.harga || item.Estimasi_Harga || 0;

                    // 1. Calculate hypothetical accommodation cost
                    if (nights > 0) {
                        if (hotelMode === 'same') {
                            if (type === 'hotel') {
                                hypAccCost = itemHarga * nights * pkg.num_rooms;
                            } else {
                                hypAccCost = selectedHotel ? selectedHotel.cost : 0;
                            }
                        } else {
                            for (let n = 1; n <= nights; n++) {
                                if (type === 'split-hotel' && n === context.nightNum) {
                                    hypAccCost += itemHarga * pkg.num_rooms;
                                } else {
                                    const activeN = selectedHotelsByNight[n];
                                    if (activeN) {
                                        hypAccCost += activeN.cost;
                                    }
                                }
                            }
                        }
                    }

                    // 2. Calculate hypothetical day costs (wisata + kuliner + distance)
                    for (let dNum = 1; dNum <= duration; dNum++) {
                        let dPlan = null;
                        if (type === 'wisata' && context.dayNum === dNum) {
                            dPlan = {
                                wisata_harga: itemHarga,
                                wisata_lat: item.lat || item.Latitude || 0,
                                wisata_lon: item.lon || item.Longitude || 0,
                                kuliner_harga: selectedDays[dNum] ? selectedDays[dNum].kuliner_harga : 0,
                                kuliner_lat: selectedDays[dNum] ? selectedDays[dNum].kuliner_lat : 0,
                                kuliner_lon: selectedDays[dNum] ? selectedDays[dNum].kuliner_lon : 0,
                                kuliner_malam_harga: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_harga : 0,
                                kuliner_malam_lat: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_lat : 0,
                                kuliner_malam_lon: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_lon : 0,
                            };
                        } else if (type === 'kuliner' && context.dayNum === dNum) {
                            dPlan = {
                                wisata_harga: selectedDays[dNum] ? selectedDays[dNum].wisata_harga : 0,
                                wisata_lat: selectedDays[dNum] ? selectedDays[dNum].wisata_lat : 0,
                                wisata_lon: selectedDays[dNum] ? selectedDays[dNum].wisata_lon : 0,
                                kuliner_harga: itemHarga,
                                kuliner_lat: item.lat || item.Latitude || 0,
                                kuliner_lon: item.lon || item.Longitude || 0,
                                kuliner_malam_harga: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_harga : 0,
                                kuliner_malam_lat: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_lat : 0,
                                kuliner_malam_lon: selectedDays[dNum] ? selectedDays[dNum].kuliner_malam_lon : 0,
                            };
                        } else {
                            dPlan = selectedDays[dNum];
                        }

                        if (dPlan) {
                            if (dNum === 1) {
                                hypWisCost += dPlan.wisata_harga * persons;
                            }
                            hypKulCost += (dPlan.kuliner_harga + (dPlan.kuliner_malam_harga || 0)) * persons;

                            // Distance calculation
                            let curHotel = null;
                            let nexHotel = null;
                            if (nights > 0) {
                                if (hotelMode === 'same') {
                                    if (type === 'hotel') {
                                        curHotel = { lat: item.lat || item.Latitude || 0, lon: item.lon || item.Longitude || 0 };
                                        nexHotel = curHotel;
                                    } else {
                                        curHotel = selectedHotel;
                                        nexHotel = selectedHotel;
                                    }
                                } else {
                                    const getHotelN = (n) => {
                                        if (type === 'split-hotel' && n === context.nightNum) return item;
                                        return selectedHotelsByNight[n] || null;
                                    };
                                    curHotel = getHotelN(dNum - 1) || getHotelN(dNum);
                                    nexHotel = getHotelN(dNum) || getHotelN(dNum - 1);
                                }
                            }

                            const chLat = curHotel ? (curHotel.lat || curHotel.Latitude || 0) : 0;
                            const chLon = curHotel ? (curHotel.lon || curHotel.Longitude || 0) : 0;
                            const nhLat = nexHotel ? (nexHotel.lat || nexHotel.Latitude || 0) : chLat;
                            const nhLon = nexHotel ? (nexHotel.lon || nexHotel.Longitude || 0) : chLon;

                            if (duration === 1 || !curHotel || !chLat) {
                                const d1 = haversineDist(dPlan.kuliner_lat, dPlan.kuliner_lon, dPlan.wisata_lat, dPlan.wisata_lon);
                                const d2 = haversineDist(dPlan.wisata_lat, dPlan.wisata_lon, dPlan.kuliner_malam_lat || 0, dPlan.kuliner_malam_lon || 0);
                                hypTotalDistance += d1 + d2;
                            } else {
                                const d1 = haversineDist(dPlan.kuliner_lat, dPlan.kuliner_lon, dPlan.wisata_lat, dPlan.wisata_lon);
                                const d2 = haversineDist(dPlan.wisata_lat, dPlan.wisata_lon, chLat, chLon);
                                const d3 = haversineDist(chLat, chLon, dPlan.kuliner_malam_lat || 0, dPlan.kuliner_malam_lon || 0);
                                const d4 = haversineDist(dPlan.kuliner_malam_lat || 0, dPlan.kuliner_malam_lon || 0, nhLat, nhLon);
                                hypTotalDistance += d1 + d2 + d3 + d4;
                            }
                        }
                    }

                    let hypRatePerKm = 2250;
                    if (persons <= 1) hypRatePerKm = 2250;
                    else if (persons <= 4) hypRatePerKm = 5150;
                    else hypRatePerKm = 6000;

                    const hypTransportCost = hypTotalDistance > 0 ? Math.round(hypTotalDistance * hypRatePerKm) : 0;
                    const hypRunningCost = hypAccCost + hypWisCost + hypKulCost + hypTransportCost;

                    item.isOverBudget = (hypRunningCost > budgetLimit);
                });

                // Mengurutkan alternatif: menempatkan opsi sesuai anggaran di atas dan opsi melebihi anggaran di bawah
                visibleAlts.sort((a, b) => {
                    if (a.isOverBudget && !b.isOverBudget) return 1;
                    if (!a.isOverBudget && b.isOverBudget) return -1;
                    return a.distFromAnchor - b.distFromAnchor;
                });
            }
        }

        const needsViewAll = alts.length > 5;
        const isShowingAll = showingAllAlternatives[key];

        if (needsViewAll && !isShowingAll) {
            visibleAlts = visibleAlts.slice(0, 5);
        }

        let html = visibleAlts.map(item => {
            const isSelected = (selectedVal === item.nama);
            const badgePrefix = item.isOverBudget ? '⚠️ [MELEBIHI ANGGARAN] ' : '';
            let distSuffix = '';
            if (item.distFromAnchor && item.distFromAnchor !== 9999) {
                if (type === 'wisata') {
                    distSuffix = ` (${item.distFromAnchor.toFixed(1)} km dari Hotel)`;
                } else if (type === 'kuliner') {
                    if (item.distToHotel) {
                        distSuffix = ` (${item.distFromAnchor.toFixed(1)} km dari Wisata & ${item.distToHotel.toFixed(1)} km ke Hotel)`;
                    } else {
                        distSuffix = ` (${item.distFromAnchor.toFixed(1)} km dari Wisata)`;
                    }
                } else {
                    distSuffix = ` (${item.distFromAnchor.toFixed(1)} km)`;
                }
            }
            const styleString = item.isOverBudget ? 'color: #dc2626; font-weight: 700;' : '';

            return `
                <option value="${item.nama}" ${isSelected ? 'selected' : ''} style="${styleString}">
                    ${badgePrefix}${item.nama} — ${fmtRp(item.harga || item.Estimasi_Harga || 0)}${distSuffix}
                </option>
            `;
        }).join('');

        if (needsViewAll && !isShowingAll) {
            html += `<option value="__view_all__">🔍 Lihat Semua (${alts.length} Opsi)...</option>`;
        }

        return html;
    }

    // Bookmark UI synchronizer
    function updateBookmarkUI() {
        try {
            bookmarkList = JSON.parse(localStorage.getItem(getMrayaKey()) || '[]');
        } catch (e) {
            bookmarkList = [];
        }
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
                    <span class="material-symbols-outlined" style="font-size:48px; color:var(--slate-300); margin-bottom:12px;">shopping_bag</span>
                    <p style="margin:0; color:var(--slate-400); font-size:14px; font-weight:500;">Belum ada rencana perjalanan yang disimpan.</p>
                    <p style="margin:4px 0 0; color:var(--slate-400); font-size:12px;">Gunakan alur kerja pencarian untuk merancang rute perjalanan kustom Anda.</p>
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
                        <span style="font-size:11px; color:var(--slate-400); font-weight:700;">ESTIMASI TOTAL BIAYA</span>
                        <span class="plan-price">${fmtRp(plan.totalCost)}</span>
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
                    bookmarkList.splice(idx, 1);
                    localStorage.setItem(getMrayaKey(), JSON.stringify(bookmarkList));
                    updateBookmarkUI();
                });
            });

            // Attach event listeners for detail button
            drawerBody.querySelectorAll('.plan-details-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    openBookmarkedPlanDetails(bookmarkList[idx]);
                });
            });
        }
    }
    window.updateBookmarkUI = updateBookmarkUI;

    // Modal view for saved plan details
    function openBookmarkedPlanDetails(plan) {
        const modal = document.getElementById('route-modal');
        const body = document.getElementById('modal-body-content');
        if (!modal || !body) return;

        let html = `
            <div class="pkg-detail-premium">
                <div class="bookmark-summary-box">
                    <div>
                        <h4 class="bookmark-summary-title">${plan.title}</h4>
                        <span class="bookmark-summary-meta">👥 ${plan.persons} Orang | 📅 ${plan.duration} Hari</span>
                    </div>
                    <div class="bookmark-summary-price-col">
                        <span class="bookmark-summary-price-label">ESTIMASI GABUNGAN</span>
                        <strong class="bookmark-summary-price-val">${fmtRp(plan.totalCost)}</strong>
                    </div>
                </div>
        `;

        // Render Hotel same mode
        if (plan.hotelMode === 'same' || !plan.hotelMode) {
            if (plan.hotel) {
                const hFolder = plan.hotel.nama.trim().replace(/ /g, '_');
                html += `
                    <div class="bookmark-section-title">🏨 Akomodasi Terpilih (Satu Hotel)</div>
                    <div class="bookmark-item-card">
                        <div class="bookmark-item-thumb">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${plan.hotel.nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="bookmark-detail-item-info">
                            <div class="bookmark-item-cat">Hotel / Homestay (${plan.hotel.className.toUpperCase()})</div>
                            <div class="bookmark-item-name">${plan.hotel.nama}</div>
                            <div class="bookmark-item-price">${fmtRp(plan.hotel.harga)} <span style="font-size:10px;color:var(--slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Render split hotels night by night
            html += `<div class="bookmark-section-title">🏨 Akomodasi Terpilih (Split Malam)</div>`;
            const nightKeys = Object.keys(plan.hotelsByNight || {});
            nightKeys.forEach(n => {
                const hot = plan.hotelsByNight[n];
                const hFolder = hot.nama.trim().replace(/ /g, '_');
                html += `
                    <div class="bookmark-item-card sm">
                        <div class="bookmark-item-thumb">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${hot.nama}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="bookmark-detail-item-info">
                            <div class="bookmark-item-cat">Hotel Malam ${n} (${hot.className.toUpperCase()})</div>
                            <div class="bookmark-item-name">${hot.nama}</div>
                            <div class="bookmark-item-price">${fmtRp(hot.harga)} <span style="font-size:9.5px;color:var(--slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            });
        }

        html += `<div class="bookmark-section-title mt">📅 Rencana Perjalanan Harian</div>`;
        html += `<div class="bookmark-day-list">`;

        plan.days.forEach((day, dIdx) => {
            const ed = (plan.extra_destinations || [])[day.day - 1];
            let dayExtraHTML = '';
            if (ed) {
                dayExtraHTML = `<div class="bookmark-day-card-wisata" style="color:var(--teal-600); margin-top:2px;">📍 Wisata Tambahan: ${ed.nama}</div>`;
            }

            html += `
                <div class="bookmark-day-card">
                    <div class="bookmark-day-card-header">
                        <span class="bookmark-day-card-title">HARI ${day.day} (${day.className.toUpperCase()})</span>
                        <span class="pkg-badge ${day.className}" style="font-size:9.5px; padding:2px 8px; border-radius:10px; font-weight:800;">${day.className.toUpperCase()}</span>
                    </div>
                    <div class="bookmark-day-card-wisata">🌲 Wisata: ${day.wisata}</div>
                    ${dayExtraHTML}
                    <div class="bookmark-day-card-kuliner">☀️ Makan Siang: ${day.kuliner} <span>(${fmtRp(day.kuliner_harga || 0)})</span></div>
                    <div class="bookmark-day-card-kuliner" style="margin-top:2px;">🌙 Makan Malam: ${day.kuliner_malam || 'N/A'} <span>(${fmtRp(day.kuliner_malam_harga || 0)})</span></div>
            `;

            // If the plan has exact leg distances calculated
            if (plan.legs && plan.legs.length > 0) {
                const isOneDay = plan.duration === 1;
                const legsPerDay = isOneDay ? 2 : 4;
                const dayLegs = plan.legs.slice(dIdx * legsPerDay, dIdx * legsPerDay + legsPerDay);
                if (dayLegs.length > 0) {
                    html += `
                        <div class="bookmark-day-card-legs">
                            <div class="bookmark-day-card-legs-title">RUTE SPASIAL HARIAN:</div>
                    `;
                    dayLegs.forEach(leg => {
                        html += `
                            <div class="recap-dist-row">
                                <span class="material-symbols-outlined" style="margin-top: 2px;">directions_car</span>
                                <span style="font-size:11.5px; font-weight:600; color:var(--slate-600); flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">${leg.from} → ${leg.to} <strong style="color:var(--teal-600); margin-left:4px; display: inline-block;">(${leg.distance?.toFixed(1) || '?'} km)</strong></span>
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
        let isOneDay = plan.duration === 1;
        let origin = "";
        let destination = "";
        let waypoints = "";

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
            if (isOneDay) {
                origin = plan.days[0] ? plan.days[0].kuliner : "";
                destination = plan.days[0] ? (plan.days[0].kuliner_malam || plan.days[0].kuliner) : "";
                waypoints = plan.days[0] ? plan.days[0].wisata : "";
            } else {
                origin = plan.hotel ? plan.hotel.nama : (plan.days[0] ? plan.days[0].wisata : "");
                if (plan.hotelMode === 'split' && plan.hotelsByNight && plan.hotelsByNight[1]) {
                    origin = plan.hotelsByNight[1].nama;
                }
                destination = origin;
                waypoints = plan.days.map(d => `${d.kuliner}|${d.wisata}|${d.kuliner_malam}`).join('|');
            }
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
            if (waypoints) {
                mapsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
            }
            mapsUrl += `&travelmode=driving`;
        }

        html += `
            <!-- Leaflet Route Map (OSRM geometry + OSM tiles) -->
            <div class="detail-map-wrapper" style="margin-top: 14px;">
                <h4 class="detail-section-title">
                    <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">map</span>
                    Peta Rute Perjalanan (OSRM + OpenStreetMap)
                </h4>
                <div id="leaflet-route-map" style="height:400px; border-radius:12px; overflow:hidden; border:1px solid var(--slate-200); background:#f1f5f9; margin-bottom: 12px;">
                    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--slate-400);font-size:13px;gap:8px;">
                        <span class="material-symbols-outlined" style="font-size:20px;">sync</span> Memuat peta…
                    </div>
                </div>
                <p style="margin:6px 0 14px;font-size:11px;color:var(--slate-400);">
                    Peta berbasis OpenStreetMap · Rute dihitung via OSRM · Klik marker untuk validasi di Google Maps
                </p>
            </div>

            <a href="${mapsUrl}" target="_blank" class="gmaps-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:var(--teal-600); color:#fff; text-decoration:none; padding:14px; border-radius:12px; font-weight:800; text-align:center; box-shadow:0 4px 12px rgba(13,148,136,0.3); transition:all 0.2s;">
                <span class="material-symbols-outlined">map</span>
                Buka Rute Lengkap di Google Maps
            </a>
            <button id="print-custom-pdf-btn" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; background:var(--slate-800); color:#fff; border:none; padding:14px; border-radius:12px; font-weight:800; text-align:center; margin-top:12px; cursor:pointer; box-shadow:0 4px 12px rgba(30,41,59,0.3); transition:all 0.2s;">
                <span class="material-symbols-outlined">print</span>
                Cetak / Simpan PDF Rencana
            </button>
            </div>
        `;

        body.innerHTML = html;
        modal.classList.add('show');

        // Build routeWaypoints list from routeStops and routeCoords
        const routeWaypoints = [];
        routeStops.forEach((name, idx) => {
            let t = 'place';
            const nameLower = name.toLowerCase();
            if (nameLower.includes('hotel') || nameLower.includes('homestay') || nameLower.includes('inn') || nameLower.includes('resort')) {
                t = 'hotel';
            } else if (nameLower.includes('makan') || nameLower.includes('warung') || nameLower.includes('resto') || nameLower.includes('kuliner')) {
                t = 'kuliner-siang';
            } else {
                t = 'wisata';
            }
            routeWaypoints.push({ name, coord: routeCoords[idx], type: t });
        });

        requestAnimationFrame(() => initLeafletRouteMap('leaflet-route-map', routeWaypoints));

        // Attach click listener for printing PDF
        document.getElementById('print-custom-pdf-btn')?.addEventListener('click', () => {
            printPlanToPDF(plan);
        });
    }

    // Helper function to render a print-optimized travel itinerary window and trigger browser print dialog
    function printPlanToPDF(plan) {
        const persons = plan.persons;
        const duration = plan.duration;
        const nights = duration - 1;

        let accommodationHTML = '';
        if (plan.hotelMode === 'same' || !plan.hotelMode) {
            if (plan.hotel) {
                accommodationHTML = `
                    <div class="section-title">🏨 Akomodasi Terpilih (Satu Hotel)</div>
                    <div class="item-card">
                        <div class="item-info">
                            <div class="item-cat">Hotel / Homestay (${plan.hotel.className.toUpperCase()})</div>
                            <div class="item-name">${plan.hotel.nama}</div>
                            <div class="item-price">Tarif: ${fmtRp(plan.hotel.harga)} /malam | Durasi: ${nights} Malam | Kamar: ${Math.ceil(persons / 2)} Kamar</div>
                            <div style="font-weight:700; margin-top:4px; color:#0f766e;">Subtotal Akomodasi: ${fmtRp(plan.hotel.cost)}</div>
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
                            <div class="item-cat">Hotel Malam ${n} (${hot.className.toUpperCase()})</div>
                            <div class="item-name">${hot.nama}</div>
                            <div class="item-price">Tarif: ${fmtRp(hot.harga)} /malam | Kamar: ${Math.ceil(persons / 2)} Kamar</div>
                            <div style="font-weight:700; margin-top:4px; color:#0f766e;">Total Malam Ini: ${fmtRp(hot.cost)}</div>
                        </div>
                    </div>
                `;
            });
        }

        let itineraryHTML = '';
        plan.days.forEach((day, dIdx) => {
            const dayWisataCost = (day.day === 1) ? day.wisata_harga * persons : 0;
            const dayKulinerCost = (day.kuliner_harga + (day.kuliner_malam_harga || 0)) * persons;
            const dayTransportCost = Math.round(plan.transportCost / duration);
            const daySubtotal = dayWisataCost + dayKulinerCost + dayTransportCost;

            itineraryHTML += `
                <div class="day-card">
                    <div class="day-header">
                        <span class="day-title">HARI ${day.day} (${day.className.toUpperCase()})</span>
                        <span class="day-badge">${day.className}</span>
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
                        👥 Jumlah Peserta: ${persons} Orang | 📅 Durasi Perjalanan: ${duration} Hari | 🚗 Transportasi: ${plan.vehDesc}
                    </div>
                </div>

                ${accommodationHTML}

                <div class="section-title">📅 Rincian Rencana Perjalanan Harian</div>
                ${itineraryHTML}

                <div class="section-title">🚗 Biaya Transportasi & Jarak Spasial</div>
                <div class="item-card">
                    <div class="item-info">
                        <div class="item-cat">Transportasi Darat (${plan.vehDesc || 'Otomatis'})</div>
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

    // Trigger Success Splash Celebration
    function showSuccessSplash() {
        let splash = document.getElementById('success-splash-overlay');
        if (!splash) {
            splash = document.createElement('div');
            splash.className = 'success-splash-modal';
            splash.id = 'success-splash-overlay';
            splash.innerHTML = `
                <div class="success-splash-content" style="max-width: 460px;">
                    <div class="success-splash-icon">
                        <span class="material-symbols-outlined">auto_awesome</span>
                    </div>
                    <h3 style="margin:0 0 10px; font-size:20px; font-weight:900; color:var(--slate-800);">Rencana Perjalanan Disimpan!</h3>
                    <p style="margin:0 0 16px; font-size:13.5px; color:var(--slate-500); line-height:1.5;">Perjalanan impian Anda telah berhasil dirancang secara kustom dan disimpan ke menu Rencana Saya.</p>
                    
                    <!-- Evaluasi SUS Google Form Box -->
                    <div style="background: rgba(13, 148, 136, 0.05); border: 1.5px dashed rgba(13, 148, 136, 0.3); border-radius: 16px; padding: 16px; margin: 0 0 20px; text-align: left;">
                        <div style="display: flex; gap: 8px; align-items: center; color: var(--teal-700); margin-bottom: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 20px; font-weight: 700;">rate_review</span>
                            <span style="font-size: 13.5px; font-weight: 800;">Bantu Evaluasi Usability Sistem</span>
                        </div>
                        <p style="margin: 0 0 14px; font-size: 12px; color: var(--slate-600); line-height: 1.45;">
                            Mohon luangkan waktu 2 menit untuk menilai kemudahan penggunaan sistem rekomendasi paket wisata Malang Raya ini melalui kuesioner singkat (Google Form).
                        </p>
                        <a href="https://forms.gle/jmEKbnHShR8HsEDaA" target="_blank" class="finalize-btn" id="survey-link-btn" style="background: linear-gradient(135deg, var(--teal-600), var(--teal-500)); box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2); margin-top: 0; text-decoration: none; padding: 10px 14px; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-sizing: border-box;">
                            <span>Isi Kuesioner (Google Form)</span>
                            <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
                        </a>
                    </div>

                    <button class="finalize-btn" id="close-splash-btn" style="background:var(--slate-700); box-shadow:0 4px 12px rgba(71,85,105,0.2); width: 100%; margin-top: 0;">
                        Buka Rencana Saya
                    </button>
                </div>
            `;
            document.body.appendChild(splash);
        }

        splash.classList.add('show');

        const closeBtn = document.getElementById('close-splash-btn');
        const surveyBtn = document.getElementById('survey-link-btn');

        const closeSplash = () => {
            splash.classList.remove('show');
            // Auto open bookmark drawer
            document.getElementById('bookmark-drawer')?.classList.add('open');
            document.getElementById('bookmark-drawer-overlay')?.classList.add('open');
        };

        closeBtn?.addEventListener('click', closeSplash);
        surveyBtn?.addEventListener('click', () => {
            setTimeout(closeSplash, 800);
        });
    }

    // Day-by-Day Wizard Initializer
    function initPlannerWizard(selPackages) {
        if (!selPackages || selPackages.length === 0) return;
        // Deep copy packages
        activeOptionPackages = JSON.parse(JSON.stringify(selPackages));

        // Reset interactive selection states completely
        selectedHotel = null;
        selectedHotelsByNight = {};
        selectedDays = {};
        showingAllAlternatives = {};
        currentStep = 0;
        hotelMode = 'same'; // Default mode is 'same'

        // Reset custom interactive flow states
        chosenStepPackageIdx = null;
        lastRenderedStep = null;
        stepWisataSelected = {};
        stepKulinerSelected = {};

        // Hide options tabs container to satisfy custom mode layout
        const tabsCont = document.getElementById('options-tabs-container');
        if (tabsCont) tabsCont.style.display = 'none';

        // Render the first step
        renderPlannerStep();
    }

    // Helper Haversine Spasial Distance (ditambahkan faktor koreksi jalan darat 1.45x agar sinkron dengan Python)
    function haversineDist(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1.45;
    }

    // Custom spatial confirmation modal
    function showSpatialConfirmationModal(title, message, onConfirm, onCancel) {
        document.getElementById('spatial-confirm-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'spatial-confirm-modal';
        modal.className = 'spatial-modal-overlay';

        modal.innerHTML = `
            <div class="spatial-modal-content">
                <div style="display: flex; align-items: center; gap: 12px; color: var(--teal-600);">
                    <span class="material-symbols-outlined" style="font-size: 32px; background: rgba(13,148,136,0.1); padding: 8px; border-radius: 50%;">spatial_tracking</span>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--slate-800);">${title}</h4>
                </div>
                <div class="spatial-modal-body">
                    ${message}
                </div>
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button id="spatial-cancel-btn" class="spatial-modal-btn-cancel">Batal</button>
                    <button id="spatial-confirm-btn" class="spatial-modal-btn-confirm">Konfirmasi</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 250);
        };

        modal.querySelector('#spatial-confirm-btn').addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });

        modal.querySelector('#spatial-cancel-btn').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
    }


    // Gathers all unique alternative items for a category and class index across all loaded options
    function getAlternatives(category, classIdx, dayNum = null) {
        const list = [];
        if (!allOptions || !allOptions[0] || !allOptions[0].clustered_items) return list;

        const clustered = allOptions[0].clustered_items;
        if (category === 'hotel') {
            const hotels = clustered.hotel[classIdx] || clustered.hotel[String(classIdx)] || [];
            hotels.forEach(h => {
                const name = h.Nama_Tempat || h.nama;
                if (name && !list.some(item => item.nama === name)) {
                    list.push({
                        nama: name,
                        harga: h.Estimasi_Harga || h.harga || 0,
                        cost: (h.Estimasi_Harga || h.harga || 0) * (activeOptionPackages[0].nights || 1) * (activeOptionPackages[0].num_rooms || 1),
                        lat: h.Latitude || h.lat || 0,
                        lon: h.Longitude || h.lon || 0
                    });
                }
            });
        }
        return list;
    }

    // Gathers unique wisata alternatives specifically for a budget tier (0: Hemat, 1: Balanced, 2: Premium)
    function getWisataAlternativesForTier(classIdx, dayNum) {
        let list = [];
        if (!allOptions || !allOptions[0] || !allOptions[0].clustered_items) return list;
        const clustered = allOptions[0].clustered_items;

        const wisatas = clustered.wisata[classIdx] || clustered.wisata[String(classIdx)] || [];
        wisatas.forEach(w => {
            const name = w.Nama_Tempat || w.nama;
            if (name && !list.some(item => item.nama === name)) {
                list.push({
                    nama: name,
                    harga: w.Estimasi_Harga || w.harga || 0,
                    lat: w.Latitude || w.lat || 0,
                    lon: w.Longitude || w.lon || 0
                });
            }
        });
        return list;
    }

    // Gathers unique kuliner alternatives specifically for a budget tier
    function getKulinerAlternativesForTier(classIdx, dayNum) {
        let list = [];
        if (!allOptions || !allOptions[0] || !allOptions[0].clustered_items) return list;
        const clustered = allOptions[0].clustered_items;

        const kuliners = clustered.kuliner[classIdx] || clustered.kuliner[String(classIdx)] || [];
        kuliners.forEach(k => {
            const name = k.Nama_Tempat || k.nama;
            if (name && !list.some(item => item.nama === name)) {
                list.push({
                    nama: name,
                    harga: k.Estimasi_Harga || k.harga || 0,
                    lat: k.Latitude || k.lat || 0,
                    lon: k.Longitude || k.lon || 0
                });
            }
        });
        return list;
    }

    // Gathers all unique alternative items for a category across ALL options (up to 15 options)
    function getAllUniqueCategoryAlternatives(category, dayNum = null) {
        const list = [];
        if (!allOptions) return list;

        allOptions.forEach(opt => {
            opt.packages.forEach((pkg, classIdx) => {
                if (category === 'hotel') {
                    if (pkg.hotel_nama_real && !list.some(item => item.nama === pkg.hotel_nama_real)) {
                        list.push({
                            nama: pkg.hotel_nama_real,
                            harga: pkg.hotel_harga,
                            cost: pkg.cost_akomodasi,
                            lat: pkg.hotel_lat || 0,
                            lon: pkg.hotel_lon || 0,
                            className: (pkg.kategori || 'Hemat').toLowerCase(),
                            classIdx: classIdx
                        });
                    }
                } else if (category === 'wisata') {
                    if (pkg.itinerary && dayNum) {
                        const dayItin = pkg.itinerary.find(item => item.day === dayNum);
                        if (dayItin && !list.some(item => item.nama === dayItin.wisata)) {
                            list.push({
                                nama: dayItin.wisata,
                                harga: dayItin.wisata_harga,
                                lat: dayItin.wisata_lat || 0,
                                lon: dayItin.wisata_lon || 0,
                                className: (pkg.kategori || 'Hemat').toLowerCase(),
                                classIdx: classIdx
                            });
                        }
                    } else if (dayNum === 1 || !pkg.itinerary || pkg.itinerary.length === 0) {
                        if (pkg.wisata_nama && !list.some(item => item.nama === pkg.wisata_nama)) {
                            list.push({
                                nama: pkg.wisata_nama,
                                harga: pkg.wisata_harga,
                                lat: pkg.wisata_lat || 0,
                                lon: pkg.wisata_lon || 0,
                                className: (pkg.kategori || 'Hemat').toLowerCase(),
                                classIdx: classIdx
                            });
                        }
                    }
                } else if (category === 'kuliner') {
                    if (pkg.itinerary && dayNum) {
                        const dayItin = pkg.itinerary.find(item => item.day === dayNum);
                        if (dayItin && !list.some(item => item.nama === dayItin.kuliner)) {
                            list.push({
                                nama: dayItin.kuliner,
                                harga: dayItin.kuliner_harga,
                                lat: dayItin.kuliner_lat || 0,
                                lon: dayItin.kuliner_lon || 0,
                                className: (pkg.kategori || 'Hemat').toLowerCase(),
                                classIdx: classIdx
                            });
                        }
                    } else if (dayNum === 1 || !pkg.itinerary || pkg.itinerary.length === 0) {
                        if (pkg.kuliner_nama && !list.some(item => item.nama === pkg.kuliner_nama)) {
                            list.push({
                                nama: pkg.kuliner_nama,
                                harga: pkg.kuliner_harga,
                                lat: pkg.kuliner_lat || 0,
                                lon: pkg.kuliner_lon || 0,
                                className: (pkg.kategori || 'Hemat').toLowerCase(),
                                classIdx: classIdx
                            });
                        }
                    }
                }
            });
        });

        // Fallbacks if list is empty
        if (list.length === 0 && activeOptionPackages && activeOptionPackages.length > 0) {
            const pkg = activeOptionPackages[0];
            if (category === 'hotel') {
                list.push({
                    nama: pkg.hotel_nama,
                    harga: pkg.hotel_harga,
                    cost: pkg.cost_akomodasi,
                    lat: pkg.hotel_lat || 0,
                    lon: pkg.hotel_lon || 0,
                    className: 'hemat',
                    classIdx: 0
                });
            } else if (category === 'wisata') {
                const d = dayNum || 1;
                const dayItin = pkg.itinerary ? pkg.itinerary.find(item => item.day === d) : null;
                const wNama = dayItin ? dayItin.wisata : pkg.wisata_nama;
                const wHarga = dayItin ? dayItin.wisata_harga : pkg.wisata_harga;
                const wLat = dayItin ? dayItin.wisata_lat : (pkg.wisata_lat || 0);
                const wLon = dayItin ? dayItin.wisata_lon : (pkg.wisata_lon || 0);
                if (wNama) {
                    list.push({
                        nama: wNama,
                        harga: wHarga,
                        lat: wLat,
                        lon: wLon,
                        className: 'hemat',
                        classIdx: 0
                    });
                }
            } else if (category === 'kuliner') {
                const d = dayNum || 1;
                const dayItin = pkg.itinerary ? pkg.itinerary.find(item => item.day === d) : null;
                const kNama = dayItin ? dayItin.kuliner : pkg.kuliner_nama;
                const kHarga = dayItin ? dayItin.kuliner_harga : pkg.kuliner_harga;
                const kLat = dayItin ? dayItin.kuliner_lat : (pkg.kuliner_lat || 0);
                const kLon = dayItin ? dayItin.kuliner_lon : (pkg.kuliner_lon || 0);
                if (kNama) {
                    list.push({
                        nama: kNama,
                        harga: kHarga,
                        lat: kLat,
                        lon: kLon,
                        className: 'hemat',
                        classIdx: 0
                    });
                }
            }
        }
        return list;
    }    // Day-by-Day Wizard Step Renderer
    function renderPlannerStep() {
        const wizardContainer = document.getElementById('planner-wizard-container');
        if (!wizardContainer) return;

        const persons = activeOptionPackages[0].num_persons;
        let ratePerKm = 2250;
        let vehDesc = "Motor (GoRide)";
        if (persons <= 1) {
            ratePerKm = 2250;
            vehDesc = "Motor (1 orang)";
        } else if (persons <= 4) {
            ratePerKm = 5150;
            vehDesc = "Mobil GoCar (2-4 orang)";
        } else {
            ratePerKm = 6000;
            vehDesc = "Mobil GoCar XL (5-6 orang)";
        }

        const duration = activeOptionPackages[0].duration;
        const nights = duration - 1;
        const classNames = activeOptionPackages.map(pkg => (pkg.kategori || 'Hemat').toLowerCase());
        const classLabels = activeOptionPackages.map(pkg => (pkg.kategori || 'HEMAT').toUpperCase());

        // Calculate Budget limit
        let budgetLimit = 0;
        if (activeWorkflow === 'budget') {
            budgetLimit = getRawBudget('b-budget');
        } else if (activeWorkflow === 'destination') {
            budgetLimit = getRawBudget('d-budget');
        }
        const hasBudget = budgetLimit > 0;

        const hasStartedCustomizing = (selectedHotel !== null) ||
            (Object.keys(selectedHotelsByNight).length > 0) ||
            (Object.keys(selectedDays).length > 0);

        // Helper to predict total cost if choosing a specific option index at current step
        function predictTotalCostForOption(type, idx, curStepDef) {
            const persons = activeOptionPackages[0].num_persons;
            const duration = activeOptionPackages[0].duration;
            const nights = duration - 1;

            let optAccommodationCost = 0;
            let optTotalWisataCost = 0;
            let optTotalKulinerCost = 0;
            let optTotalDistance = 0;

            // 1. Calculate accommodation cost for this prospective choice
            if (nights > 0) {
                if (hotelMode === 'same') {
                    if (type === 'hotel') {
                        optAccommodationCost = activeOptionPackages[idx].cost_akomodasi;
                    } else {
                        optAccommodationCost = selectedHotel ? selectedHotel.cost : activeOptionPackages[idx].cost_akomodasi;
                    }
                } else {
                    for (let n = 1; n <= nights; n++) {
                        if (type === 'split-hotel' && curStepDef.nightNum === n) {
                            optAccommodationCost += activeOptionPackages[idx].hotel_harga * activeOptionPackages[idx].num_rooms;
                        } else {
                            const activeN = selectedHotelsByNight[n];
                            if (activeN) {
                                optAccommodationCost += activeN.cost;
                            } else {
                                optAccommodationCost += activeOptionPackages[idx].hotel_harga * activeOptionPackages[idx].num_rooms;
                            }
                        }
                    }
                }
            }

            // 2. Calculate day costs (wisata + kuliner + distance)
            for (let dNum = 1; dNum <= duration; dNum++) {
                let dayPlan = null;
                if (type === 'day' && curStepDef.dayNum === dNum) {
                    const pkg = activeOptionPackages[idx];
                    let dayItin = pkg.itinerary?.find(item => item.day === dNum) || {
                        wisata: pkg.wisata_nama,
                        wisata_harga: pkg.wisata_harga,
                        wisata_lat: pkg.wisata_lat || 0,
                        wisata_lon: pkg.wisata_lon || 0,
                        kuliner: pkg.kuliner_nama,
                        kuliner_harga: pkg.kuliner_harga,
                        kuliner_lat: pkg.kuliner_lat || 0,
                        kuliner_lon: pkg.kuliner_lon || 0,
                        kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
                        kuliner_pagi_harga: pkg.kuliner_pagi_harga || 0,
                        kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0,
                        kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
                        kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A',
                        kuliner_malam_harga: pkg.kuliner_malam_harga || 0,
                        kuliner_malam_lat: pkg.kuliner_malam_lat || 0,
                        kuliner_malam_lon: pkg.kuliner_malam_lon || 0
                    };
                    dayPlan = {
                        wisata_harga: dayItin.wisata_harga !== undefined ? dayItin.wisata_harga : pkg.wisata_harga,
                        wisata_lat: dayItin.wisata_lat || pkg.wisata_lat || 0,
                        wisata_lon: dayItin.wisata_lon || pkg.wisata_lon || 0,
                        kuliner_harga: dayItin.kuliner_harga !== undefined ? dayItin.kuliner_harga : pkg.kuliner_harga,
                        kuliner_lat: dayItin.kuliner_lat || pkg.kuliner_lat || 0,
                        kuliner_lon: dayItin.kuliner_lon || pkg.kuliner_lon || 0,
                        kuliner_pagi_harga: dayItin.kuliner_pagi_harga !== undefined ? dayItin.kuliner_pagi_harga : 0,
                        kuliner_pagi_lat: dayItin.kuliner_pagi_lat || 0,
                        kuliner_pagi_lon: dayItin.kuliner_pagi_lon || 0,
                        kuliner_malam_harga: dayItin.kuliner_malam_harga !== undefined ? dayItin.kuliner_malam_harga : (pkg.kuliner_malam_harga || 0),
                        kuliner_malam_lat: dayItin.kuliner_malam_lat || pkg.kuliner_malam_lat || 0,
                        kuliner_malam_lon: dayItin.kuliner_malam_lon || pkg.kuliner_malam_lon || 0
                    };
                } else {
                    dayPlan = selectedDays[dNum];
                    if (!dayPlan) {
                        let pkg = activeOptionPackages[idx];
                        let defaultItin = pkg.itinerary?.find(it => it.day === dNum);
                        dayPlan = {
                            wisata_harga: defaultItin?.wisata_harga !== undefined ? defaultItin.wisata_harga : (pkg.wisata_harga || 0),
                            wisata_lat: defaultItin?.wisata_lat || pkg.wisata_lat || 0,
                            wisata_lon: defaultItin?.wisata_lon || pkg.wisata_lon || 0,
                            kuliner_harga: defaultItin?.kuliner_harga !== undefined ? defaultItin.kuliner_harga : (pkg.kuliner_harga || 0),
                            kuliner_lat: defaultItin?.kuliner_lat || pkg.kuliner_lat || 0,
                            kuliner_lon: defaultItin?.kuliner_lon || pkg.kuliner_lon || 0,
                            kuliner_pagi_harga: defaultItin?.kuliner_pagi_harga || 0,
                            kuliner_malam_harga: defaultItin?.kuliner_malam_harga !== undefined ? defaultItin.kuliner_malam_harga : (pkg.kuliner_malam_harga || 0),
                            kuliner_pagi_lat: defaultItin?.kuliner_pagi_lat || 0,
                            kuliner_pagi_lon: defaultItin?.kuliner_pagi_lon || 0,
                            kuliner_malam_lat: defaultItin?.kuliner_malam_lat || pkg.kuliner_malam_lat || 0,
                            kuliner_malam_lon: defaultItin?.kuliner_malam_lon || pkg.kuliner_malam_lon || 0
                        };
                    }
                }

                if (dayPlan) {
                    optTotalWisataCost += dayPlan.wisata_harga * persons;
                    optTotalKulinerCost += ((dayPlan.kuliner_pagi_harga || 0) + dayPlan.kuliner_harga + (dayPlan.kuliner_malam_harga || 0)) * persons;

                    // Hotel Anchors for distance calculation
                    let currentHotel = null;
                    let nextHotel = null;
                    if (nights > 0) {
                        if (hotelMode === 'same') {
                            if (type === 'hotel') {
                                currentHotel = { nama: activeOptionPackages[idx].hotel_nama, lat: activeOptionPackages[idx].hotel_lat || 0, lon: activeOptionPackages[idx].hotel_lon || 0 };
                                nextHotel = currentHotel;
                            } else {
                                currentHotel = selectedHotel;
                                nextHotel = selectedHotel;
                            }
                        } else {
                            const getHotelN = (n) => {
                                if (type === 'split-hotel' && curStepDef.nightNum === n) {
                                    return { nama: activeOptionPackages[idx].hotel_nama, lat: activeOptionPackages[idx].hotel_lat || 0, lon: activeOptionPackages[idx].hotel_lon || 0 };
                                }
                                return selectedHotelsByNight[n] || null;
                            };
                            currentHotel = getHotelN(dNum - 1) || getHotelN(dNum);
                            nextHotel = getHotelN(dNum) || getHotelN(dNum - 1);
                        }
                    }

                    const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                    const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                    const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                    const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                    const kpLat = dayPlan.kuliner_pagi_lat || 0;
                    const kpLon = dayPlan.kuliner_pagi_lon || 0;
                    const wLat = dayPlan.wisata_lat || 0;
                    const wLon = dayPlan.wisata_lon || 0;
                    const ksLat = dayPlan.kuliner_lat || 0;
                    const ksLon = dayPlan.kuliner_lon || 0;
                    const kmLat = dayPlan.kuliner_malam_lat || 0;
                    const kmLon = dayPlan.kuliner_malam_lon || 0;

                    if (duration === 1 || !currentHotel || !chLat) {
                        const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                        const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                        optTotalDistance += d1 + d2;
                    } else if (dNum === 1) {
                        const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                        const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                        const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                        const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                        const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                        optTotalDistance += d1 + d2 + d3 + d4 + d5;
                    } else if (dNum === duration) {
                        const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                        const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                        const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                        optTotalDistance += d1 + d2 + d3;
                    } else {
                        const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                        const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                        const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                        const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                        const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                        const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                        optTotalDistance += d1 + d2 + d3 + d4 + d5 + d6;
                    }
                }
            }

            // ratePerKm is defined globally above

            const optTransportCost = optTotalDistance > 0 ? Math.round(optTotalDistance * ratePerKm) : 0;
            return optAccommodationCost + optTotalWisataCost + optTotalKulinerCost + optTransportCost;
        }

        // Force hotelMode to same if nights <= 1 (2-day trip)
        if (nights <= 1 && hotelMode !== 'same') {
            hotelMode = 'same';
            selectedHotelsByNight = {};
        }

        // 1. Generate Stepper Steps Dynamically
        const steps = [];
        if (nights > 0) {
            if (hotelMode === 'same') {
                steps.push({ stepIdx: 0, type: 'hotel', label: 'Akomodasi', icon: 'hotel', isCompleted: !!selectedHotel });
            } else {
                for (let n = 1; n <= nights; n++) {
                    steps.push({ stepIdx: n - 1, type: 'split-hotel', nightNum: n, label: `Malam ${n}`, icon: 'hotel', isCompleted: !!selectedHotelsByNight[n] });
                }
            }
        }

        const startDayStep = (nights > 0 && hotelMode === 'split') ? nights : 1;
        for (let d = 1; d <= duration; d++) {
            const stepIdx = (nights > 0 && hotelMode === 'split') ? (nights + d - 1) : d;
            steps.push({ stepIdx: stepIdx, type: 'day', dayNum: d, label: `Hari ${d}`, icon: 'calendar_month', isCompleted: !!selectedDays[d] });
        }

        // Validate active step boundaries
        const totalStepsCount = steps.length;
        if (currentStep >= totalStepsCount) {
            currentStep = totalStepsCount - 1;
        }

        // Generate Stepper HTML with dynamic connectors
        let stepperHTML = `<div class="planner-stepper">`;
        steps.forEach((step, i) => {
            const isActive = currentStep === step.stepIdx;
            const isComp = step.isCompleted;

            if (i > 0) {
                const prevStep = steps[i - 1];
                const isConnectorCompleted = prevStep.isCompleted;
                stepperHTML += `<div class="stepper-connector ${isConnectorCompleted ? 'completed' : ''}"></div>`;
            }

            stepperHTML += `
                <div class="stepper-step ${isActive ? 'active' : (isComp ? 'completed' : '')}" data-step="${step.stepIdx}">
                    <span class="material-symbols-outlined" style="font-size:16px;">${step.icon}</span>
                    <span>${step.label}</span>
                </div>
            `;
        });
        stepperHTML += `</div>`;

        // Hotel Mode Toggle HTML (rendered for hotel or split-hotel steps, only if nights > 1)
        let modeToggleHTML = '';
        if (nights > 1) {
            modeToggleHTML = `
                <div class="hotel-mode-toggle-wrap">
                    <button class="hotel-mode-btn ${hotelMode === 'same' ? 'active' : ''}" data-mode="same">
                        Satu Hotel (Sama)
                    </button>
                    <button class="hotel-mode-btn ${hotelMode === 'split' ? 'active' : ''}" data-mode="split">
                        Ganti Hotel Tiap Malam
                    </button>
                </div>
            `;
        }

        // 2. Generate Options Column HTML Based on Current Step Definition
        let optionsHTML = '';
        const curStepDef = steps.find(s => s.stepIdx === currentStep) || steps[0];

        // Sync history selections back to interactive chosen states
        if (curStepDef) {
            const stepChanged = lastRenderedStep !== currentStep;
            if (stepChanged) {
                lastRenderedStep = currentStep;
                chosenStepPackageIdx = null; // Unconditionally reset chosen package for the new step
            }

            if (curStepDef.type === 'hotel') {
                if (selectedHotel && (chosenStepPackageIdx === null || stepChanged)) {
                    chosenStepPackageIdx = selectedHotel.classIdx;
                }
            } else if (curStepDef.type === 'split-hotel') {
                const nNum = curStepDef.nightNum;
                if (selectedHotelsByNight[nNum] && (chosenStepPackageIdx === null || stepChanged)) {
                    chosenStepPackageIdx = selectedHotelsByNight[nNum].classIdx;
                }
            } else if (curStepDef.type === 'day') {
                const dNum = curStepDef.dayNum;
                if (selectedDays[dNum] && (chosenStepPackageIdx === null || stepChanged)) {
                    chosenStepPackageIdx = selectedDays[dNum].classIdx;
                    stepWisataSelected[dNum] = true;
                    stepKulinerSelected[dNum] = true;
                }
            }
        }

        if (curStepDef.type === 'hotel') {
            optionsHTML = `
                <h3 style="font-size:16px; font-weight:800; color:var(--slate-700); margin: 0 0 16px;">🏨 Pilih Akomodasi Perjalanan:</h3>
                ${modeToggleHTML}
                <div class="custom-cards-grid">
            `;

            activeOptionPackages.forEach((pkg, idx) => {
                const classIdx = (pkg.cluster_id !== undefined) ? pkg.cluster_id : idx;
                const cls = classNames[classIdx];
                const label = classLabels[classIdx];
                const isSelected = selectedHotel && selectedHotel.classIdx === idx;
                const hFolder = pkg.hotel_nama_real ? pkg.hotel_nama_real.trim().replace(/ /g, '_') : '';

                // Handle visual locking of non-selected package cards
                const predictedCost = predictTotalCostForOption('hotel', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''} ${chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx ? 'locked-card-overlay' : ''}" data-type="hotel" data-idx="${idx}">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo">
                            <span class="material-symbols-outlined">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Akomodasi</span>
                        </div>
                        <div class="pkg-body card-body-fixed">
                            <div class="hotel-img-container shadow-sm img-h100">
                                <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(pkg.hotel_nama)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                            </div>
                            
                            <!-- Hotel Dropdown Selector -->
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">🏨 Pilih Hotel Alternatif:</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" data-class-idx="${idx}" data-type="hotel">
                                        <span class="custom-select-trigger-text">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    `}
                                </div>
                            </div>

                            <div class="custom-card-divider"></div>
                            
                            <div class="custom-card-meta-simple">
                                <div class="meta-row">
                                    <span>Tarif Kamar:</span>
                                    <span>${fmtRp(pkg.hotel_harga)} /malam</span>
                                </div>
                                <div class="meta-row">
                                    <span>Jumlah Kamar:</span>
                                    <span>${pkg.num_rooms} Kamar</span>
                                </div>
                                <div class="meta-row">
                                    <span>Durasi:</span>
                                    <span>${pkg.nights} Malam</span>
                                </div>
                                <div class="meta-row highlight">
                                    <span class="text-teal" style="font-weight:750;">Total Akomodasi:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(pkg.cost_akomodasi)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn btn-dark-full" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div class="btn-group-col">
                                <button class="finalize-btn select-option-btn btn-confirm-step" data-type="hotel" data-idx="${idx}">
                                    ${isSelected ? 'Akomodasi Terpilih' : 'Konfirmasi Akomodasi & Lanjutkan'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn btn-outline-cancel" data-idx="${idx}">
                                    Batalkan Pilihan / Ganti Paket
                                </button>
                            </div>
                            `}
                        </div>
                    </div>
                `;
            });
            optionsHTML += `</div>`;

        } else if (curStepDef.type === 'split-hotel') {
            const nightNum = curStepDef.nightNum;
            optionsHTML = `
                <h3 style="font-size:16px; font-weight:800; color:var(--slate-700); margin: 0 0 16px;">🏨 Pilih Akomodasi Malam ${nightNum}:</h3>
                ${modeToggleHTML}
                <div class="custom-cards-grid">
            `;

            activeOptionPackages.forEach((pkg, idx) => {
                const classIdx = (pkg.cluster_id !== undefined) ? pkg.cluster_id : idx;
                const cls = classNames[classIdx];
                const label = classLabels[classIdx];
                const activeNightHotel = selectedHotelsByNight[nightNum];
                const isSelected = activeNightHotel && activeNightHotel.classIdx === idx;
                const hFolder = pkg.hotel_nama_real ? pkg.hotel_nama_real.trim().replace(/ /g, '_') : '';
                const hotelAlts = getAlternatives('hotel', classIdx);

                // Handle visual locking of non-selected package cards
                const predictedCost = predictTotalCostForOption('split-hotel', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''} ${chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx ? 'locked-card-overlay' : ''}" data-type="split-hotel" data-idx="${idx}">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo">
                            <span class="material-symbols-outlined">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Malam ${nightNum}</span>
                        </div>
                        <div class="pkg-body card-body-fixed">
                            <div class="hotel-img-container shadow-sm img-h100">
                                <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(pkg.hotel_nama)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                            </div>
                            
                            <!-- Split Hotel Dropdown Selector -->
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">🏨 Pilih Hotel Alternatif:</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" data-class-idx="${idx}" data-night="${nightNum}" data-type="split-hotel">
                                        <span class="custom-select-trigger-text">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    `}
                                </div>
                            </div>

                            <div class="custom-card-divider"></div>
                            
                            <div class="custom-card-meta-simple">
                                <div class="meta-row">
                                    <span>Tarif Kamar:</span>
                                    <span>${fmtRp(pkg.hotel_harga)} /malam</span>
                                </div>
                                <div class="meta-row">
                                    <span>Jumlah Kamar:</span>
                                    <span>${pkg.num_rooms} Kamar</span>
                                </div>
                                <div class="meta-row">
                                    <span>Durasi Malam Ini:</span>
                                    <span>1 Malam</span>
                                </div>
                                <div class="meta-row highlight">
                                    <span class="text-teal" style="font-weight:750;">Total Malam Ini:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(pkg.hotel_harga * pkg.num_rooms)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn btn-dark-full" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div class="btn-group-col">
                                <button class="finalize-btn select-option-btn btn-confirm-step" data-type="split-hotel" data-idx="${idx}">
                                    ${isSelected ? 'Akomodasi Terpilih' : 'Pilih Akomodasi Ini'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn btn-outline-cancel" data-idx="${idx}">
                                    Batalkan Pilihan / Ganti Paket
                                </button>
                            </div>
                            `}
                        </div>
                    </div>
                `;
            });
            optionsHTML += `</div>`;

        } else if (curStepDef.type === 'day') {
            const d = curStepDef.dayNum;
            optionsHTML = `
                <h3 style="font-size:16px; font-weight:800; color:var(--slate-700); margin: 0 0 16px;">🌲 Kustomisasi & Rute Hari ${d}:</h3>
                <div class="custom-cards-grid">
            `;

            activeOptionPackages.forEach((pkg, idx) => {
                const classIdx = (pkg.cluster_id !== undefined) ? pkg.cluster_id : idx;
                const cls = classNames[classIdx];
                const label = classLabels[classIdx];
                const isSelected = selectedDays[d] && selectedDays[d].classIdx === idx;

                // Read or default Day d itinerary
                let dayItin = pkg.itinerary.find(item => item.day === d);
                if (!dayItin) {
                    dayItin = {
                        wisata: pkg.wisata_nama,
                        wisata_harga: pkg.wisata_harga,
                        wisata_lat: pkg.wisata_lat || 0,
                        wisata_lon: pkg.wisata_lon || 0,
                        kuliner: pkg.kuliner_nama,
                        kuliner_harga: pkg.kuliner_harga,
                        kuliner_lat: pkg.kuliner_lat || 0,
                        kuliner_lon: pkg.kuliner_lon || 0,
                        kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
                        kuliner_pagi_harga: pkg.kuliner_pagi_harga || 0,
                        kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0,
                        kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
                        kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A',
                        kuliner_malam_harga: pkg.kuliner_malam_harga || 0,
                        kuliner_malam_lat: pkg.kuliner_malam_lat || 0,
                        kuliner_malam_lon: pkg.kuliner_malam_lon || 0
                    };
                }

                const wFolder = dayItin.wisata ? dayItin.wisata.trim().replace(/ /g, '_') : '';
                const kFolder = dayItin.kuliner ? dayItin.kuliner.trim().replace(/ /g, '_') : '';
                const kpFolder = dayItin.kuliner_pagi ? dayItin.kuliner_pagi.trim().replace(/ /g, '_') : '';
                const kmFolder = dayItin.kuliner_malam ? dayItin.kuliner_malam.trim().replace(/ /g, '_') : '';

                const dayWisataCost = (d === 1) ? dayItin.wisata_harga * pkg.num_persons : 0;
                const isCheckoutOrODT = (duration === 1 || d === duration);
                const numMeals = isCheckoutOrODT ? 2 : 3;
                const dayKulinerCost = ((dayItin.kuliner_pagi_harga || 0) + dayItin.kuliner_harga + (isCheckoutOrODT ? 0 : (dayItin.kuliner_malam_harga || 0))) * pkg.num_persons;

                // Dynamically compute legs for this specific option
                let currentHotel = null;
                let nextHotel = null;
                if (nights > 0) {
                    if (hotelMode === 'same') {
                        currentHotel = selectedHotel || { nama: pkg.hotel_nama, lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                        nextHotel = currentHotel;
                    } else {
                        const getHotelN = (n) => { return selectedHotelsByNight[n] || { nama: pkg.hotel_nama, lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 }; };
                        currentHotel = getHotelN(d - 1) || getHotelN(d);
                        nextHotel = getHotelN(d) || getHotelN(d - 1);
                    }
                }
                const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                const kpLat = dayItin.kuliner_pagi_lat || 0;
                const kpLon = dayItin.kuliner_pagi_lon || 0;
                const wLat = dayItin.wisata_lat || 0;
                const wLon = dayItin.wisata_lon || 0;
                const ksLat = dayItin.kuliner_lat || 0;
                const ksLon = dayItin.kuliner_lon || 0;
                const kmLat = dayItin.kuliner_malam_lat || 0;
                const kmLon = dayItin.kuliner_malam_lon || 0;

                const cardLegs = [];
                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    cardLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d1 });
                    cardLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d2 });
                } else if (d === 1) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    cardLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d1 });
                    cardLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d2 });
                    cardLegs.push({ from: 'Makan Siang', to: 'Hotel', dist: d3 });
                    cardLegs.push({ from: 'Hotel', to: 'Makan Malam', dist: d4 });
                    cardLegs.push({ from: 'Makan Malam', to: 'Hotel', dist: d5 });
                } else if (d === duration) {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    cardLegs.push({ from: 'Hotel', to: 'Makan Pagi', dist: d1 });
                    cardLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d2 });
                    cardLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d3 });
                } else {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    cardLegs.push({ from: 'Hotel', to: 'Makan Pagi', dist: d1 });
                    cardLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d2 });
                    cardLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d3 });
                    cardLegs.push({ from: 'Makan Siang', to: 'Hotel', dist: d4 });
                    cardLegs.push({ from: 'Hotel', to: 'Makan Malam', dist: d5 });
                    cardLegs.push({ from: 'Makan Malam', to: 'Hotel', dist: d6 });
                }

                let legsHTML = `<div class="legs-recap-container">`;
                let dayTransportCost = 0;
                cardLegs.forEach(leg => {
                    const cost = Math.round(leg.dist * ratePerKm);
                    dayTransportCost += cost;
                    legsHTML += `
                        <div class="leg-recap-row">
                            <span class="leg-recap-text">${leg.from} → ${leg.to} (${leg.dist.toFixed(1)} km)</span>
                            <span class="leg-recap-cost">${fmtRp(cost)}</span>
                        </div>
                    `;
                });
                legsHTML += `</div>`;
                const dayTotal = dayWisataCost + dayKulinerCost + dayTransportCost;

                const wisataAlts = getWisataAlternativesForTier(classIdx, d);
                const kulinerAlts = getKulinerAlternativesForTier(classIdx, d);

                // Handle visual locking of non-selected package cards
                const predictedCost = predictTotalCostForOption('day', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''} ${chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx ? 'locked-card-overlay' : ''}" data-type="day" data-idx="${idx}" style="min-width: 0;">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo">
                            <span class="material-symbols-outlined">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Hari ${d}</span>
                        </div>
                        <div class="pkg-body card-body-fixed">
                            <div class="card-img-row">
                                <div class="wisata-img-container shadow-sm img-h80">
                                    <img src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" alt="${escapeHtmlAttr(dayItin.wisata)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'landscape')" />
                                </div>
                                <div class="kuliner-img-container shadow-sm img-h80">
                                    <img src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" alt="${escapeHtmlAttr(dayItin.kuliner)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'restaurant')" />
                                </div>
                            </div>
                            
                            <!-- Wisata Dropdown Split -->
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">🌲 Pilih Wisata:</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${dayItin.wisata || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : (activeWorkflow === 'destination' && d === 1) ? `
                                    <div class="custom-select-trigger-locked" title="Dikunci dari input pencarian destinasi awal">
                                        <span class="custom-select-trigger-text">🔒 ${dayItin.wisata || ''} (Locked)</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="wisata">
                                        <span class="custom-select-trigger-text">${dayItin.wisata || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    `}
                                </div>
                            </div>

                            <!-- Kuliner Pagi Dropdown Split -->
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">☕ Pilih Kuliner Pagi (Sarapan):</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner_pagi || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner_pagi">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner_pagi || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive dashed" title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span class="custom-select-trigger-text font-locked">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>

                            <!-- Kuliner Dropdown Split -->
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">🍜 Pilih Kuliner Siang:</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive dashed" title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span class="custom-select-trigger-text font-locked">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>
                            
                            <!-- Kuliner Malam Dropdown Split -->
                            ${(!isCheckoutOrODT) ? `
                            <div class="custom-dropdown-wrap dropdown-mb-0">
                                <label class="custom-dropdown-label">🌙 Pilih Kuliner Malam:</label>
                                <div class="custom-select-wrapper">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" title="Pilih paket terlebih dahulu untuk merancang">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner_malam || dayItin.kuliner_malam_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner_malam">
                                        <span class="custom-select-trigger-text">${dayItin.kuliner_malam || dayItin.kuliner_malam_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown"></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive dashed" title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span class="custom-select-trigger-text font-locked">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow custom-select-trigger-icon">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>
                            ` : ''}

                            <div class="custom-card-divider"></div>
                            
                            <div class="custom-card-meta-simple">
                                <div class="meta-row">
                                    <span>Tiket Wisata:</span>
                                    <span>${fmtRp(dayWisataCost)}</span>
                                </div>
                                <div class="meta-row">
                                    <span>Kuliner (${numMeals}x):</span>
                                    <span>${fmtRp(dayKulinerCost)}</span>
                                </div>
                                <div class="meta-row" title="${vehDesc}">
                                    <span>Transportasi (${vehDesc.split(' ')[0]}):</span>
                                    <span>${fmtRp(dayTransportCost)}</span>
                                </div>
                                ${legsHTML}
                                <div class="meta-row highlight">
                                    <span class="text-teal" style="font-weight:750;">Subtotal Hari ${d}:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(dayTotal)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn btn-dark-full" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div class="btn-group-col">
                                <button class="finalize-btn select-option-btn btn-confirm-step" data-type="day" data-idx="${idx}">
                                    ${isSelected ? 'Rute Terpilih' : 'Pilih Rute Hari Ini'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn btn-outline-cancel" data-idx="${idx}">
                                    Batalkan Pilihan / Ganti Paket
                                </button>
                            </div>
                            `}
                        </div>
                    </div>
                `;
            });
            optionsHTML += `</div>`;
        }

        // 3. Spatiotemporal Proactive Baseline Cost Computations
        const activePkgIdx = chosenStepPackageIdx !== null ? chosenStepPackageIdx : 0;
        const pkg = activeOptionPackages[activePkgIdx];
        // persons already declared globally for this function
        let accommodationCost = 0;
        let totalWisataCost = 0;
        let totalKulinerCost = 0;
        let totalDistance = 0;
        let transportCost = 0;

        // Calculate baseline Accommodation cost
        if (nights > 0) {
            if (hotelMode === 'same') {
                if (selectedHotel) {
                    accommodationCost = selectedHotel.cost;
                } else {
                    accommodationCost = pkg.cost_akomodasi;
                }
            } else {
                for (let n = 1; n <= nights; n++) {
                    const activeN = selectedHotelsByNight[n];
                    if (activeN) {
                        accommodationCost += activeN.cost;
                    } else {
                        accommodationCost += pkg.hotel_harga * pkg.num_rooms;
                    }
                }
            }
        }

        // Calculate baseline Wisata, baseline Kuliner, and baseline Leg Spasial Distances
        const legs = [];
        for (let dNum = 1; dNum <= duration; dNum++) {
            let dayPlan = selectedDays[dNum];
            if (!dayPlan) {
                let dayItin = pkg.itinerary?.find(item => item.day === dNum) || {
                    wisata: pkg.wisata_nama,
                    wisata_harga: pkg.wisata_harga,
                    wisata_lat: pkg.wisata_lat || 0,
                    wisata_lon: pkg.wisata_lon || 0,
                    kuliner: pkg.kuliner_nama,
                    kuliner_harga: pkg.kuliner_harga,
                    kuliner_lat: pkg.kuliner_lat || 0,
                    kuliner_lon: pkg.kuliner_lon || 0,
                    kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
                    kuliner_pagi_harga: pkg.kuliner_pagi_harga || 0,
                    kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0,
                    kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
                    kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A',
                    kuliner_malam_harga: pkg.kuliner_malam_harga || 0,
                    kuliner_malam_lat: pkg.kuliner_malam_lat || 0,
                    kuliner_malam_lon: pkg.kuliner_malam_lon || 0
                };
                dayPlan = {
                    wisata: dayItin.wisata || dayItin.wisata_nama || pkg.wisata_nama,
                    wisata_harga: dayItin.wisata_harga !== undefined ? dayItin.wisata_harga : pkg.wisata_harga,
                    wisata_lat: dayItin.wisata_lat || pkg.wisata_lat || 0,
                    wisata_lon: dayItin.wisata_lon || pkg.wisata_lon || 0,
                    kuliner: dayItin.kuliner || dayItin.kuliner_nama || pkg.kuliner_nama,
                    kuliner_harga: dayItin.kuliner_harga !== undefined ? dayItin.kuliner_harga : pkg.kuliner_harga,
                    kuliner_lat: dayItin.kuliner_lat || pkg.kuliner_lat || 0,
                    kuliner_lon: dayItin.kuliner_lon || pkg.kuliner_lon || 0,
                    kuliner_pagi: dayItin.kuliner_pagi || 'N/A',
                    kuliner_pagi_harga: dayItin.kuliner_pagi_harga !== undefined ? dayItin.kuliner_pagi_harga : 0,
                    kuliner_pagi_lat: dayItin.kuliner_pagi_lat || 0,
                    kuliner_pagi_lon: dayItin.kuliner_pagi_lon || 0,
                    kuliner_malam: dayItin.kuliner_malam || 'N/A',
                    kuliner_malam_harga: dayItin.kuliner_malam_harga !== undefined ? dayItin.kuliner_malam_harga : 0,
                    kuliner_malam_lat: dayItin.kuliner_malam_lat || 0,
                    kuliner_malam_lon: dayItin.kuliner_malam_lon || 0
                };
            }

            // Sesuai rumus skripsi (uji_gabungan.py & recommender.py), tiket wisata hanya dihitung 1x (hari pertama)
            if (dNum === 1) {
                totalWisataCost = dayPlan.wisata_harga * persons;
            }
            const isCheckoutOrODT = (duration === 1 || dNum === duration);
            totalKulinerCost += ((dayPlan.kuliner_pagi_harga || 0) + dayPlan.kuliner_harga + (isCheckoutOrODT ? 0 : (dayPlan.kuliner_malam_harga || 0))) * persons;

            // Determine hotel anchors for the day (with baseline substitution)
            let currentHotel = null;
            let nextHotel = null;
            if (nights > 0) {
                if (hotelMode === 'same') {
                    if (selectedHotel) {
                        currentHotel = selectedHotel;
                        nextHotel = selectedHotel;
                    } else {
                        currentHotel = { nama: pkg.hotel_nama, lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                        nextHotel = currentHotel;
                    }
                } else {
                    const getHotelN = (n) => {
                        return selectedHotelsByNight[n] || { nama: pkg.hotel_nama, lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                    };
                    currentHotel = getHotelN(dNum - 1) || getHotelN(dNum);
                    nextHotel = getHotelN(dNum) || getHotelN(dNum - 1);
                }
            }

            // Spatial legs Haversine (with baseline substitution)
            const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
            const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
            const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
            const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

            const kpLat = dayPlan.kuliner_pagi_lat || 0;
            const kpLon = dayPlan.kuliner_pagi_lon || 0;
            const wLat = dayPlan.wisata_lat || 0;
            const wLon = dayPlan.wisata_lon || 0;
            const ksLat = dayPlan.kuliner_lat || 0;
            const ksLon = dayPlan.kuliner_lon || 0;
            const kmLat = dayPlan.kuliner_malam_lat || 0;
            const kmLon = dayPlan.kuliner_malam_lon || 0;

            if (duration === 1 || !currentHotel || !chLat) {
                const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                totalDistance += d1 + d2; // Accumulate circular route distance
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d1, from_coords: [kpLat, kpLon], to_coords: [wLat, wLon], from_type: 'kuliner-pagi', to_type: 'wisata' });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d2, from_coords: [wLat, wLon], to_coords: [ksLat, ksLon], from_type: 'wisata', to_type: 'kuliner-siang' });
            } else if (dNum === 1) {
                const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                totalDistance += d1 + d2 + d3 + d4 + d5;
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d1, from_coords: [kpLat, kpLon], to_coords: [wLat, wLon], from_type: 'kuliner-pagi', to_type: 'wisata' });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d2, from_coords: [wLat, wLon], to_coords: [ksLat, ksLon], from_type: 'wisata', to_type: 'kuliner-siang' });
                legs.push({ from: dayPlan.kuliner, to: nextHotel.nama, distance: d3, from_coords: [ksLat, ksLon], to_coords: [nhLat, nhLon], from_type: 'kuliner-siang', to_type: 'hotel' });
                legs.push({ from: nextHotel.nama, to: dayPlan.kuliner_malam, distance: d4, from_coords: [nhLat, nhLon], to_coords: [kmLat, kmLon], from_type: 'hotel', to_type: 'kuliner-malam' });
                legs.push({ from: dayPlan.kuliner_malam, to: nextHotel.nama, distance: d5, from_coords: [kmLat, kmLon], to_coords: [nhLat, nhLon], from_type: 'kuliner-malam', to_type: 'hotel' });
            } else if (dNum === duration) {
                const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                totalDistance += d1 + d2 + d3;
                legs.push({ from: currentHotel.nama, to: dayPlan.kuliner_pagi, distance: d1, from_coords: [chLat, chLon], to_coords: [kpLat, kpLon], from_type: 'hotel', to_type: 'kuliner-pagi' });
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d2, from_coords: [kpLat, kpLon], to_coords: [wLat, wLon], from_type: 'kuliner-pagi', to_type: 'wisata' });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d3, from_coords: [wLat, wLon], to_coords: [ksLat, ksLon], from_type: 'wisata', to_type: 'kuliner-siang' });
            } else {
                const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                totalDistance += d1 + d2 + d3 + d4 + d5 + d6;
                legs.push({ from: currentHotel.nama, to: dayPlan.kuliner_pagi, distance: d1, from_coords: [chLat, chLon], to_coords: [kpLat, kpLon], from_type: 'hotel', to_type: 'kuliner-pagi' });
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d2, from_coords: [kpLat, kpLon], to_coords: [wLat, wLon], from_type: 'kuliner-pagi', to_type: 'wisata' });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d3, from_coords: [wLat, wLon], to_coords: [ksLat, ksLon], from_type: 'wisata', to_type: 'kuliner-siang' });
                legs.push({ from: dayPlan.kuliner, to: nextHotel.nama, distance: d4, from_coords: [ksLat, ksLon], to_coords: [nhLat, nhLon], from_type: 'kuliner-siang', to_type: 'hotel' });
                legs.push({ from: nextHotel.nama, to: dayPlan.kuliner_malam, distance: d5, from_coords: [nhLat, nhLon], to_coords: [kmLat, kmLon], from_type: 'hotel', to_type: 'kuliner-malam' });
                legs.push({ from: dayPlan.kuliner_malam, to: nextHotel.nama, distance: d6, from_coords: [kmLat, kmLon], to_coords: [nhLat, nhLon], from_type: 'kuliner-malam', to_type: 'hotel' });
            }
        }

        // ratePerKm and vehDesc are defined globally above
        transportCost = totalDistance > 0 ? Math.round(totalDistance * ratePerKm) : 0;
        const runningCost = accommodationCost + totalWisataCost + totalKulinerCost + transportCost;

        // Visible (confirmed-only) Cost Computations (Starts from 0)
        let accommodationCostVisible = 0;
        let totalWisataCostVisible = 0;
        let totalKulinerCostVisible = 0;
        let totalDistanceVisible = 0;
        let transportCostVisible = 0;

        if (nights > 0) {
            if (hotelMode === 'same') {
                if (selectedHotel) {
                    accommodationCostVisible = selectedHotel.cost;
                }
            } else {
                for (let n = 1; n <= nights; n++) {
                    const activeN = selectedHotelsByNight[n];
                    if (activeN) {
                        accommodationCostVisible += activeN.cost;
                    }
                }
            }
        }

        for (let dNum = 1; dNum <= duration; dNum++) {
            const dayPlan = selectedDays[dNum];
            if (dayPlan) {
                totalWisataCostVisible += dayPlan.wisata_harga * persons;
                const isCheckoutOrODT = (duration === 1 || dNum === duration);
                totalKulinerCostVisible += ((dayPlan.kuliner_pagi_harga || 0) + dayPlan.kuliner_harga + (isCheckoutOrODT ? 0 : (dayPlan.kuliner_malam_harga || 0))) * persons;

                // Distance calculation for visible path
                let currentHotel = null;
                let nextHotel = null;
                if (nights > 0) {
                    if (hotelMode === 'same') {
                        currentHotel = selectedHotel;
                        nextHotel = selectedHotel;
                    } else {
                        currentHotel = selectedHotelsByNight[dNum - 1] || selectedHotelsByNight[dNum] || null;
                        nextHotel = selectedHotelsByNight[dNum] || selectedHotelsByNight[dNum - 1] || null;
                    }
                }

                const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                const kpLat = dayPlan.kuliner_pagi_lat || 0;
                const kpLon = dayPlan.kuliner_pagi_lon || 0;
                const wLat = dayPlan.wisata_lat || 0;
                const wLon = dayPlan.wisata_lon || 0;
                const ksLat = dayPlan.kuliner_lat || 0;
                const ksLon = dayPlan.kuliner_lon || 0;
                const kmLat = dayPlan.kuliner_malam_lat || 0;
                const kmLon = dayPlan.kuliner_malam_lon || 0;

                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    totalDistanceVisible += d1 + d2;
                } else if (dNum === 1) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    totalDistanceVisible += d1 + d2 + d3 + d4 + d5;
                } else if (dNum === duration) {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    totalDistanceVisible += d1 + d2 + d3;
                } else {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    totalDistanceVisible += d1 + d2 + d3 + d4 + d5 + d6;
                }
            }
        }

        transportCostVisible = totalDistanceVisible > 0 ? Math.round(totalDistanceVisible * ratePerKm) : 0;
        const runningCostVisible = accommodationCostVisible + totalWisataCostVisible + totalKulinerCostVisible + transportCostVisible;

        // Generate Itemized Day-by-Day Summary HTML
        let daysSummaryHTML = '';
        for (let dNum = 1; dNum <= duration; dNum++) {
            const dayPlan = selectedDays[dNum];
            if (dayPlan) {
                // Determine day-specific hotel name and cost
                let hotelName = 'Checkout';
                let hotelHarga = 0;
                let hotelCost = 0;

                if (nights > 0 && dNum <= nights) {
                    if (hotelMode === 'same') {
                        if (selectedHotel) {
                            hotelName = selectedHotel.nama;
                            hotelHarga = selectedHotel.harga;
                            hotelCost = selectedHotel.harga * activeOptionPackages[0].num_rooms;
                        } else {
                            hotelName = 'Belum memilih hotel';
                            hotelHarga = 0;
                            hotelCost = 0;
                        }
                    } else {
                        const activeN = selectedHotelsByNight[dNum];
                        if (activeN) {
                            hotelName = activeN.nama;
                            hotelHarga = activeN.harga;
                            hotelCost = activeN.harga * activeOptionPackages[0].num_rooms;
                        } else {
                            hotelName = 'Belum memilih hotel';
                            hotelHarga = 0;
                            hotelCost = 0;
                        }
                    }
                }

                // Determine day-specific spatial leg distance
                let dayDistance = 0;
                let currentHotel = null;
                let nextHotel = null;
                if (nights > 0) {
                    if (hotelMode === 'same') {
                        currentHotel = selectedHotel || { nama: pkg.hotel_nama, lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                        nextHotel = currentHotel;
                    } else {
                        currentHotel = selectedHotelsByNight[dNum - 1] || selectedHotelsByNight[dNum] || null;
                        nextHotel = selectedHotelsByNight[dNum] || selectedHotelsByNight[dNum - 1] || null;
                    }
                }

                const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                const kpLat = dayPlan.kuliner_pagi_lat || 0;
                const kpLon = dayPlan.kuliner_pagi_lon || 0;
                const wLat = dayPlan.wisata_lat || 0;
                const wLon = dayPlan.wisata_lon || 0;
                const ksLat = dayPlan.kuliner_lat || 0;
                const ksLon = dayPlan.kuliner_lon || 0;
                const kmLat = dayPlan.kuliner_malam_lat || 0;
                const kmLon = dayPlan.kuliner_malam_lon || 0;

                const trackerLegs = [];
                if (duration === 1 || !currentHotel || !chLat) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    dayDistance = d1 + d2;
                    trackerLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d1 });
                    trackerLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d2 });
                } else if (dNum === 1) {
                    const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    dayDistance = d1 + d2 + d3 + d4 + d5;
                    trackerLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d1 });
                    trackerLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d2 });
                    trackerLegs.push({ from: 'Makan Siang', to: 'Hotel', dist: d3 });
                    trackerLegs.push({ from: 'Hotel', to: 'Makan Malam', dist: d4 });
                    trackerLegs.push({ from: 'Makan Malam', to: 'Hotel', dist: d5 });
                } else if (dNum === duration) {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    dayDistance = d1 + d2 + d3;
                    trackerLegs.push({ from: 'Hotel', to: 'Makan Pagi', dist: d1 });
                    trackerLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d2 });
                    trackerLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d3 });
                } else {
                    const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                    const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                    const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                    const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                    const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                    const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                    dayDistance = d1 + d2 + d3 + d4 + d5 + d6;
                    trackerLegs.push({ from: 'Hotel', to: 'Makan Pagi', dist: d1 });
                    trackerLegs.push({ from: 'Makan Pagi', to: 'Wisata', dist: d2 });
                    trackerLegs.push({ from: 'Wisata', to: 'Makan Siang', dist: d3 });
                    trackerLegs.push({ from: 'Makan Siang', to: 'Hotel', dist: d4 });
                    trackerLegs.push({ from: 'Hotel', to: 'Makan Malam', dist: d5 });
                    trackerLegs.push({ from: 'Makan Malam', to: 'Hotel', dist: d6 });
                }

                // Calculate detailed transport cost legs for live tracker
                let legsHTML = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--slate-200); font-size: 10px; color: var(--slate-500); display: flex; flex-direction: column; gap: 4px;">`;
                let dayTransportCost = 0;
                trackerLegs.forEach(leg => {
                    const cost = Math.round(leg.dist * ratePerKm);
                    dayTransportCost += cost;
                    legsHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px;">
                            <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.3;">${leg.from} → ${leg.to} (${leg.dist.toFixed(1)} km)</span>
                            <span style="font-weight: 600; color: var(--slate-600); flex-shrink: 0; text-align: right; padding-left: 4px;">${fmtRp(cost)}</span>
                        </div>
                    `;
                });
                legsHTML += `</div>`;

                // Wisata cost
                const wisataCost = dayPlan.wisata_harga * persons;
                const wisataCostForSubtotal = wisataCost;
                const isCheckoutOrODT = (duration === 1 || dNum === duration);
                const numMeals = isCheckoutOrODT ? 2 : 3;
                const kulinerCost = ((dayPlan.kuliner_pagi_harga || 0) + dayPlan.kuliner_harga + (isCheckoutOrODT ? 0 : (dayPlan.kuliner_malam_harga || 0))) * persons;

                // Day Subtotal
                const daySubtotal = hotelCost + wisataCostForSubtotal + kulinerCost + dayTransportCost;

                // Brief Route Legs
                let legsBrief = '';
                if (duration === 1 || !currentHotel) {
                    legsBrief = 'Makan Pagi ➔ Wisata ➔ Makan Siang';
                } else if (dNum === 1) {
                    legsBrief = 'Makan Pagi ➔ Wisata ➔ Makan Siang ➔ Hotel ➔ Makan Malam ➔ Hotel';
                } else if (dNum === duration) {
                    legsBrief = 'Hotel ➔ Makan Pagi ➔ Wisata ➔ Makan Siang';
                } else {
                    legsBrief = 'Hotel ➔ Makan Pagi ➔ Wisata ➔ Makan Siang ➔ Hotel ➔ Makan Malam ➔ Hotel';
                }

                daysSummaryHTML += `
                    <div class="pkg-subsequent-day-row" style="background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.015); transition: all 0.2s; margin-top: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-size: 10.5px; font-weight: 800; color: var(--teal-600); display: flex; align-items: center; gap: 6px; letter-spacing: 0.5px;">
                                <span class="material-symbols-outlined" style="font-size: 14px;">calendar_month</span>
                                <span>HARI ${dNum} (${dayPlan.className.toUpperCase()})</span>
                            </div>
                            <span class="pkg-badge ${dayPlan.className}" style="font-size: 9px; padding: 2px 6px; font-weight: 800; text-transform: uppercase;">
                                ${dayPlan.className}
                            </span>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--slate-600); border-bottom: 1px dashed var(--slate-200); padding-bottom: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">hotel</span>
                                    <span>Hotel: <span style="color: var(--slate-800); font-weight: 750; max-width: 140px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${hotelName}</span></span>
                                </div>
                                <span style="color: var(--slate-50); font-size: 10.5px; flex-shrink: 0; background: var(--slate-500); padding: 1px 5px; border-radius: 6px; font-weight: 700;">
                                    ${hotelHarga > 0 ? `${fmtRp(hotelHarga)}/m` : 'Rp 0'}
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">landscape</span>
                                    <span>Wisata: <span style="color: var(--slate-800); font-weight: 750; max-width: 140px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${dayPlan.wisata}</span></span>
                                </div>
                                <span style="color: var(--slate-500); font-size: 10.5px; flex-shrink: 0;">${fmtRp(dayPlan.wisata_harga)} /org</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">coffee</span>
                                    <span>Makan Pagi: <span style="color: var(--slate-800); font-weight: 750; max-width: 130px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${dayPlan.kuliner_pagi || 'N/A'}</span></span>
                                </div>
                                <span style="color: var(--slate-500); font-size: 10.5px; flex-shrink: 0;">${fmtRp(dayPlan.kuliner_pagi_harga || 0)} /org</span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">sunny</span>
                                    <span>Makan Siang: <span style="color: var(--slate-800); font-weight: 750; max-width: 130px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${dayPlan.kuliner}</span></span>
                                </div>
                                <span style="color: var(--slate-500); font-size: 10.5px; flex-shrink: 0;">${fmtRp(dayPlan.kuliner_harga)} /org</span>
                            </div>
                            ${(!isCheckoutOrODT) ? `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">dark_mode</span>
                                    <span>Makan Malam: <span style="color: var(--slate-800); font-weight: 750; max-width: 130px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${dayPlan.kuliner_malam}</span></span>
                                </div>
                                <span style="color: var(--slate-500); font-size: 10.5px; flex-shrink: 0;">${fmtRp(dayPlan.kuliner_malam_harga)} /org</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div style="font-size: 10px; color: var(--teal-600); display: flex; align-items: center; justify-content: space-between; font-weight: 800; background: rgba(13,148,136,0.05); padding: 5px 8px; border-radius: 8px; border: 1px solid rgba(13,148,136,0.1);">
                            <div style="display: flex; align-items: center; gap: 4px; overflow: hidden;">
                                <span class="material-symbols-outlined" style="font-size: 13px; flex-shrink: 0;">route</span>
                                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${legsBrief}</span>
                            </div>
                            <span style="flex-shrink: 0; margin-left: 4px;">${dayDistance.toFixed(1)} km</span>
                        </div>
 
                        <!-- Real-time Cost Calculation -->
                        <div style="font-size: 10.5px; color: var(--slate-500); display: flex; flex-direction: column; gap: 3.5px; padding-top: 4px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Kamar Hotel (${hotelHarga > 0 ? `${activeOptionPackages[0].num_rooms} Kamar` : '0 Malam'})</span>
                                <span>${fmtRp(hotelCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Tiket Wisata (${persons} Orang)</span>
                                <span>${fmtRp(wisataCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Kuliner (${persons} Orang × ${numMeals}x Makan)</span>
                                <span>${fmtRp(kulinerCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Transportasi (${vehDesc.split(' ')[0]})</span>
                                <span>${fmtRp(dayTransportCost)}</span>
                            </div>
                            ${legsHTML}
                            <div style="display: flex; justify-content: space-between; font-weight: 750; color: var(--slate-750); margin-top: 2px; padding-top: 4px; border-top: 1px solid var(--slate-200);">
                                <span>Subtotal Hari ${dNum}:</span>
                                <span>${fmtRp(daySubtotal)}</span>
                            </div>
                        </div>
                        </div>

                        <!-- Real-time Cost Calculation -->
                        <div style="font-size: 10.5px; color: var(--slate-500); display: flex; flex-direction: column; gap: 3.5px; padding-top: 4px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Kamar Hotel (${hotelHarga > 0 ? `${activeOptionPackages[0].num_rooms} Kamar` : '0 Malam'})</span>
                                <span>${fmtRp(hotelCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Tiket Wisata (${persons} Orang)</span>
                                <span>${fmtRp(wisataCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Kuliner (${persons} Orang × ${numMeals}x Makan)</span>
                                <span>${fmtRp(kulinerCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Transportasi (${vehDesc.split(' ')[0]})</span>
                                <span>${fmtRp(dayTransportCost)}</span>
                            </div>
                            ${legsHTML}
                            <div style="display: flex; justify-content: space-between; font-weight: 750; color: var(--slate-750); margin-top: 2px; padding-top: 4px; border-top: 1px solid var(--slate-200);">
                                <span>Subtotal Hari ${dNum}:</span>
                                <span style="font-weight: 800; color: var(--slate-800);">${fmtRp(daySubtotal)}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // If hotel is selected but day itinerary not yet selected, show dynamic hotel inclusion
                let prefilledHotelHTML = '';
                let prefilledHotelCost = 0;
                let hotelName = 'Checkout';
                let hotelHarga = 0;

                if (nights > 0 && dNum <= nights) {
                    if (hotelMode === 'same') {
                        if (selectedHotel) {
                            hotelName = selectedHotel.nama;
                            hotelHarga = selectedHotel.harga;
                            prefilledHotelCost = selectedHotel.harga * activeOptionPackages[0].num_rooms;
                        } else {
                            hotelName = 'Belum memilih hotel';
                        }
                    } else {
                        const activeN = selectedHotelsByNight[dNum];
                        if (activeN) {
                            hotelName = activeN.nama;
                            hotelHarga = activeN.harga;
                            prefilledHotelCost = activeN.harga * activeOptionPackages[0].num_rooms;
                        } else {
                            hotelName = 'Belum memilih hotel';
                        }
                    }
                }

                if (hotelHarga > 0) {
                    prefilledHotelHTML = `
                        <div style="width: 100%; border-top: 1px dashed var(--slate-200); margin-top: 8px; padding-top: 6px; font-size: 11px; display: flex; justify-content: space-between; color: var(--slate-500); font-weight: 600;">
                            <span>🏨 Akomodasi (${activeOptionPackages[0].num_rooms} Kamar):</span>
                            <span style="color: var(--slate-700); font-weight: 700;">${fmtRp(prefilledHotelCost)}</span>
                        </div>
                    `;
                }

                daysSummaryHTML += `
                    <div class="pkg-subsequent-day-row" style="background: rgba(248,250,252,0.55); border: 1.5px dashed var(--slate-200); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; margin-top: 12px; min-height: 100px;">
                        <span class="material-symbols-outlined" style="font-size: 24px; color: var(--slate-300);">calendar_today</span>
                        <div style="font-size: 12px; font-weight: 750; color: var(--slate-450);">HARI ${dNum}</div>
                        <div style="font-size: 10.5px; color: var(--slate-400); max-width: 220px; line-height: 1.4;">Pilih rute Hari ${dNum} pada pilihan di samping untuk melihat rute spasial.</div>
                        ${prefilledHotelHTML}
                    </div>
                `;
            }
        }

        const budgetPercent = hasBudget ? Math.min(100, (runningCostVisible / budgetLimit) * 100) : 0;
        const isOverBudget = hasBudget && runningCostVisible > budgetLimit;
        const remaining = hasBudget ? budgetLimit - runningCostVisible : 0;

        let budgetOverageHTML = '';
        if (hasBudget) {
            budgetOverageHTML = `
                <div class="panel-divider"></div>
                <div class="budget-progress-container">
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700;">
                        <span style="color:var(--slate-500)">Progress Anggaran</span>
                        <span style="color:${isOverBudget ? '#dc2626' : 'var(--teal-600)'}">${budgetPercent.toFixed(0)}%</span>
                    </div>
                    <div class="budget-progress-bar-wrap">
                        <div class="budget-progress-bar-fill ${isOverBudget ? 'over' : ''}" style="width: ${budgetPercent}%"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-top:8px;">
                        <span style="color:var(--slate-500)">${isOverBudget ? 'Kelebihan Anggaran' : 'Sisa Anggaran'}</span>
                        <span style="color:${isOverBudget ? '#dc2626' : 'var(--teal-600)'}">${fmtRp(Math.abs(remaining))}</span>
                    </div>
                </div>
            `;
        }

        // Stepper finish conditions
        const isAkomodasiFinished = nights === 0 || (hotelMode === 'same' ? !!selectedHotel : Object.keys(selectedHotelsByNight).length === nights);
        const isStepperFinished = isAkomodasiFinished && Object.keys(selectedDays).length === duration;

        let summaryPanelHTML = `
            <div class="planner-summary-panel">
                <h4 class="summary-panel-title">
                    <span class="material-symbols-outlined" style="color:var(--teal-600)">analytics</span>
                    <span>Live Tracker Rencana</span>
                </h4>
                <div class="summary-header-meta">👥 ${persons} Orang | 📅 ${duration} Hari</div>
                
                <div class="panel-divider summary-section-divider-sm"></div>
                ${daysSummaryHTML}
                
                <div class="panel-divider summary-section-divider-lg"></div>
                <div class="summary-category-title">Subtotal Per Kategori</div>
                <div class="selected-day-row" style="margin-bottom: 4px;">
                    <span>🏨 Total Akomodasi (${nights > 0 ? nights + ' Malam' : '0 Malam'})</span>
                    <span>${fmtRp(accommodationCostVisible)}</span>
                </div>
                <div class="selected-day-row" style="margin-bottom: 4px;">
                    <span>🌲 Total Tiket Wisata</span>
                    <span>${fmtRp(totalWisataCostVisible)}</span>
                </div>
                <div class="selected-day-row" style="margin-bottom: 4px;">
                    <span>🍜 Total Konsumsi & Kuliner</span>
                    <span>${fmtRp(totalKulinerCostVisible)}</span>
                </div>
                <div class="selected-day-row" style="margin-bottom: 4px;">
                    <span>🚗 Total Transportasi (${vehDesc.split(' ')[0]})</span>
                    <span>${fmtRp(transportCostVisible)}</span>
                </div>
                <div style="font-size:11.5px; color:var(--slate-500); font-weight:700; display:flex; align-items:center; gap:4px; margin-bottom: 8px;">
                    <span class="material-symbols-outlined" style="font-size:14px;color:var(--teal-600)">route</span>
                    <span>Total Jarak Spasial: <span style="color:var(--slate-700)">${totalDistanceVisible.toFixed(1)} km</span></span>
                </div>
                
                <div class="panel-divider"></div>
                <div class="summary-total-row">
                    <span style="font-size:12.5px; font-weight:800; color:var(--slate-750);">ESTIMASI TOTAL</span>
                    <strong class="summary-total-val">${fmtRp(runningCostVisible)}</strong>
                </div>
                ${budgetOverageHTML}

                <button type="button" class="preview-gmaps-btn" id="preview-custom-maps-btn" style="margin-top: 18px;">
                    <span class="material-symbols-outlined">map</span>
                    Preview Rute di Maps
                </button>
                <button class="finalize-btn" id="finalize-plan-btn" ${isStepperFinished ? '' : 'disabled'} style="margin-top: 10px;">
                    <span class="material-symbols-outlined">bookmark_added</span>
                    <span>Kunci & Simpan Rencana</span>
                </button>
            </div>
        `;

        // 4. Assemble the whole Wizard Layout
        wizardContainer.innerHTML = `
            ${stepperHTML}
            <div class="planner-layout">
                <div class="planner-options-col" id="planner-options-col">
                    ${optionsHTML}
                </div>
                <div id="planner-summary-col">
                    ${summaryPanelHTML}
                </div>
            </div>
        `;

        // 5. Attach wizard interaction events
        // Click on stepper steps directly
        wizardContainer.querySelectorAll('.stepper-step').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const targetStep = parseInt(stepEl.dataset.step);
                currentStep = targetStep;
                renderPlannerStep();
            });
        });

        // Click on Hotel Mode buttons
        wizardContainer.querySelectorAll('.hotel-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                hotelMode = btn.dataset.mode;
                selectedHotel = null;
                selectedHotelsByNight = {};
                currentStep = 0;
                renderPlannerStep();
            });
        });

        // Toggle dropdown open/close on clicking custom select triggers
        wizardContainer.querySelectorAll('.custom-select-trigger').forEach(triggerEl => {
            triggerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdownEl = triggerEl.closest('.custom-select-wrapper')?.querySelector('.custom-search-select-dropdown');
                if (!dropdownEl) return;

                const isOpen = dropdownEl.style.display === 'block';

                // Close other open custom select dropdowns
                wizardContainer.querySelectorAll('.custom-search-select-dropdown').forEach(d => {
                    if (d !== dropdownEl) d.style.display = 'none';
                });

                if (!isOpen) {
                    renderSearchSelectSuggestions(triggerEl);
                } else {
                    dropdownEl.style.display = 'none';
                }
            });
        });


        // Confirmation clicks on select-option buttons
        wizardContainer.querySelectorAll('.select-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const idx = parseInt(btn.dataset.idx);
                const pkg = activeOptionPackages[idx];

                if (type === 'hotel') {
                    selectedHotel = {
                        classIdx: idx,
                        className: classNames[idx],
                        nama: pkg.hotel_nama,
                        harga: pkg.hotel_harga,
                        cost: pkg.cost_akomodasi,
                        lat: pkg.hotel_lat || 0,
                        lon: pkg.hotel_lon || 0
                    };
                    btn.closest('.pkg-card').classList.add('selected');
                    setTimeout(() => {
                        currentStep = 1;
                        renderPlannerStep();
                    }, 300);
                } else if (type === 'split-hotel') {
                    const nightNum = curStepDef.nightNum;
                    selectedHotelsByNight[nightNum] = {
                        classIdx: idx,
                        className: classNames[idx],
                        nama: pkg.hotel_nama_real || pkg.hotel_nama,
                        harga: pkg.hotel_harga,
                        cost: pkg.hotel_harga * pkg.num_rooms,
                        lat: pkg.hotel_lat || 0,
                        lon: pkg.hotel_lon || 0
                    };
                    btn.closest('.pkg-card').classList.add('selected');
                    setTimeout(() => {
                        if (currentStep < nights - 1) {
                            currentStep++;
                        } else {
                            currentStep = nights; // Go to Day 1 step
                        }
                        renderPlannerStep();
                    }, 300);
                } else if (type === 'day') {
                    const d = curStepDef.dayNum;
                    let dayItin = pkg.itinerary.find(item => item.day === d) || {
                        wisata: pkg.wisata_nama,
                        kuliner: pkg.kuliner_nama,
                        wisata_harga: pkg.wisata_harga,
                        kuliner_harga: pkg.kuliner_harga,
                        wisata_lat: pkg.wisata_lat || 0,
                        wisata_lon: pkg.wisata_lon || 0,
                        kuliner_lat: pkg.kuliner_lat || 0,
                        kuliner_lon: pkg.kuliner_lon || 0,
                        kuliner_pagi: pkg.kuliner_pagi_nama || pkg.kuliner_pagi || 'N/A',
                        kuliner_pagi_harga: pkg.kuliner_pagi_harga || 0,
                        kuliner_pagi_lat: pkg.kuliner_pagi_lat || 0,
                        kuliner_pagi_lon: pkg.kuliner_pagi_lon || 0,
                        kuliner_malam: pkg.kuliner_malam_nama || pkg.kuliner_malam || 'N/A',
                        kuliner_malam_harga: pkg.kuliner_malam_harga || 0,
                        kuliner_malam_lat: pkg.kuliner_malam_lat || 0,
                        kuliner_malam_lon: pkg.kuliner_malam_lon || 0
                    };

                    let anchorLat = 0, anchorLon = 0;
                    if (hotelMode === 'same') {
                        anchorLat = selectedHotel ? selectedHotel.lat : (pkg.hotel_lat || 0);
                        anchorLon = selectedHotel ? selectedHotel.lon : (pkg.hotel_lon || 0);
                    } else {
                        const activeN = selectedHotelsByNight[d];
                        anchorLat = activeN ? activeN.lat : (pkg.hotel_lat || 0);
                        anchorLon = activeN ? activeN.lon : (pkg.hotel_lon || 0);
                    }
                    const distance = haversineDist(anchorLat, anchorLon, dayItin.wisata_lat, dayItin.wisata_lon);

                    const title = `Konfirmasi Pilihan Hari ${d}`;
                    let message = `Pilih rute Hari ${d} (${classNames[idx].toUpperCase()})?<br><br>`;
                    message += `☕ Makan Pagi: <strong>${dayItin.kuliner_pagi || 'N/A'}</strong><br>`;
                    message += `🌲 Wisata: <strong>${dayItin.wisata}</strong><br>`;
                    message += `☀️ Makan Siang: <strong>${dayItin.kuliner}</strong><br>`;
                    if (duration > 1 && d < duration) {
                        message += `🌙 Makan Malam: <strong>${dayItin.kuliner_malam || 'N/A'}</strong><br>`;
                    }

                    const ticketCost = (dayItin.wisata_harga || 0) * pkg.num_persons;
                    const mealsCost = ((dayItin.kuliner_pagi_harga || 0) + dayItin.kuliner_harga + (duration > 1 && d < duration ? (dayItin.kuliner_malam_harga || 0) : 0)) * pkg.num_persons;
                    message += `<br>💰 Total HTM & Makan: <strong>${fmtRp(ticketCost + mealsCost)}</strong>`;

                    showSpatialConfirmationModal(title, message, () => {
                        const dayWisataCost = (dayItin.wisata_harga || 0) * pkg.num_persons;
                        const dayKulinerCost = ((dayItin.kuliner_pagi_harga || 0) + dayItin.kuliner_harga + (duration > 1 && d < duration ? (dayItin.kuliner_malam_harga || 0) : 0)) * pkg.num_persons;

                        // Calculate actual route distance for dayTransportCost calculation
                        let dayDistance = 0;
                        let currentHotel = null;
                        let nextHotel = null;
                        if (nights > 0) {
                            if (hotelMode === 'same') {
                                currentHotel = selectedHotel || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 };
                                nextHotel = currentHotel;
                            } else {
                                const getHotelN = (n) => { return selectedHotelsByNight[n] || { lat: pkg.hotel_lat || 0, lon: pkg.hotel_lon || 0 }; };
                                currentHotel = getHotelN(d - 1) || getHotelN(d);
                                nextHotel = getHotelN(d) || getHotelN(d - 1);
                            }
                        }
                        const chLat = currentHotel ? (currentHotel.lat || 0) : 0;
                        const chLon = currentHotel ? (currentHotel.lon || 0) : 0;
                        const nhLat = nextHotel ? (nextHotel.lat || 0) : chLat;
                        const nhLon = nextHotel ? (nextHotel.lon || 0) : chLon;
                        const kpLat = dayItin.kuliner_pagi_lat || 0;
                        const kpLon = dayItin.kuliner_pagi_lon || 0;
                        const wLat = dayItin.wisata_lat || 0;
                        const wLon = dayItin.wisata_lon || 0;
                        const ksLat = dayItin.kuliner_lat || 0;
                        const ksLon = dayItin.kuliner_lon || 0;
                        const kmLat = dayItin.kuliner_malam_lat || 0;
                        const kmLon = dayItin.kuliner_malam_lon || 0;

                        if (duration === 1 || !currentHotel || !chLat) {
                            const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                            dayDistance = d1 + d2;
                        } else if (d === 1) {
                            const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                            const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                            const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                            const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                            dayDistance = d1 + d2 + d3 + d4 + d5;
                        } else if (d === duration) {
                            const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                            const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                            dayDistance = d1 + d2 + d3;
                        } else {
                            const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                            const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                            const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                            const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                            const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                            const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                            dayDistance = d1 + d2 + d3 + d4 + d5 + d6;
                        }

                        const dayTransportCost = Math.round(dayDistance * ratePerKm);
                        const dayTotal = dayWisataCost + dayKulinerCost + dayTransportCost;

                        selectedDays[d] = {
                            classIdx: idx,
                            className: classNames[idx],
                            wisata: dayItin.wisata,
                            wisata_harga: dayItin.wisata_harga,
                            wisata_lat: dayItin.wisata_lat || 0,
                            wisata_lon: dayItin.wisata_lon || 0,
                            kuliner_pagi: dayItin.kuliner_pagi || 'N/A',
                            kuliner_pagi_harga: dayItin.kuliner_pagi_harga || 0,
                            kuliner_pagi_lat: dayItin.kuliner_pagi_lat || 0,
                            kuliner_pagi_lon: dayItin.kuliner_pagi_lon || 0,
                            kuliner: dayItin.kuliner,
                            kuliner_harga: dayItin.kuliner_harga,
                            kuliner_lat: dayItin.kuliner_lat || 0,
                            kuliner_lon: dayItin.kuliner_lon || 0,
                            kuliner_malam: duration > 1 && d < duration ? (dayItin.kuliner_malam || 'N/A') : 'N/A',
                            kuliner_malam_harga: duration > 1 && d < duration ? (dayItin.kuliner_malam_harga || 0) : 0,
                            kuliner_malam_lat: duration > 1 && d < duration ? (dayItin.kuliner_malam_lat || 0) : 0,
                            kuliner_malam_lon: duration > 1 && d < duration ? (dayItin.kuliner_malam_lon || 0) : 0,
                            cost: dayTotal
                        };
                        btn.closest('.pkg-card').classList.add('selected');

                        setTimeout(() => {
                            const nextStepExists = steps.find(s => s.stepIdx === currentStep + 1);
                            if (nextStepExists) {
                                currentStep++;
                                renderPlannerStep();
                            } else {
                                renderPlannerStep(); // stay to show completed final trackers recap
                            }
                        }, 300);
                    });
                }
            });
        });

        // Click on start-draft-btn (Rancang Paket)
        wizardContainer.querySelectorAll('.start-draft-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                chosenStepPackageIdx = idx;

                // If it's a day step, determine initial wisata selection lock state
                if (curStepDef.type === 'day') {
                    const d = curStepDef.dayNum;
                    if (activeWorkflow === 'destination' && d === 1) {
                        stepWisataSelected[d] = true;
                    } else {
                        stepWisataSelected[d] = false;
                    }
                }

                renderPlannerStep();
            });
        });

        // Click on cancel-draft-btn (Batalkan / Ganti Paket)
        wizardContainer.querySelectorAll('.cancel-draft-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                chosenStepPackageIdx = null;

                // Clear any committed selections for this step when canceled
                if (curStepDef.type === 'hotel') {
                    selectedHotel = null;
                } else if (curStepDef.type === 'split-hotel') {
                    delete selectedHotelsByNight[curStepDef.nightNum];
                } else if (curStepDef.type === 'day') {
                    delete selectedDays[curStepDef.dayNum];
                    stepWisataSelected[curStepDef.dayNum] = false;
                    stepKulinerSelected[curStepDef.dayNum] = false;
                }

                renderPlannerStep();
            });
        });

        // Preview Custom Maps Button listener
        document.getElementById('preview-custom-maps-btn')?.addEventListener('click', () => {
            if (legs && legs.length > 0) {
                openCustomDetailModal(legs, accommodationCost, totalWisataCost, totalKulinerCost, transportCost, runningCost, totalDistance, duration, persons, vehDesc, pkg);
            } else {
                alert("Pilih minimal akomodasi atau 1 destinasi terlebih dahulu untuk melihat rute.");
            }
        });

        // Finalize Plan Button listener
        document.getElementById('finalize-plan-btn')?.addEventListener('click', () => {
            finalizeTravelPlan(runningCost, legs, totalDistance, transportCost, vehDesc);
        });

        // Auto scroll active step into view inside horizontal scrollable container
        const activeStepEl = wizardContainer.querySelector('.stepper-step.active');
        if (activeStepEl) {
            setTimeout(() => {
                activeStepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }, 100);
        }
    }

    // Finalize Travel Plan logic
    async function finalizeTravelPlan(totalCost, legs, totalDistance, transportCost, vehDesc) {
        if (!window.currentUser) {
            alert("Silakan masuk (login) terlebih dahulu untuk menyimpan rencana perjalanan Anda ke Dashboard.");
            if (typeof window.openAuthModal === 'function') {
                window.openAuthModal();
            }
            return;
        }
        const btn = document.getElementById('finalize-plan-btn');
        const originalText = btn ? btn.innerHTML : '';

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span><span>Menghitung Rute OSRM...</span>`;
            }

            // 1. Build unique coordinate sequence for OSRM
            const routeCoords = [];
            legs.forEach((leg) => {
                if (leg.from_coords && (leg.from_coords[0] !== 0 || leg.from_coords[1] !== 0)) {
                    if (routeCoords.length === 0 || routeCoords[routeCoords.length - 1][0] !== leg.from_coords[0] || routeCoords[routeCoords.length - 1][1] !== leg.from_coords[1]) {
                        routeCoords.push(leg.from_coords);
                    }
                }
                if (leg.to_coords && (leg.to_coords[0] !== 0 || leg.to_coords[1] !== 0)) {
                    if (routeCoords.length === 0 || routeCoords[routeCoords.length - 1][0] !== leg.to_coords[0] || routeCoords[routeCoords.length - 1][1] !== leg.to_coords[1]) {
                        routeCoords.push(leg.to_coords);
                    }
                }
            });

            // 2. Fetch Distance riil dari OSRM
            let finalDistance = totalDistance;
            let finalTransportCost = transportCost;
            let finalTotalCost = totalCost;
            let osrmSuccess = false;

            if (routeCoords.length >= 2) {
                const coordsStr = routeCoords.map(c => `${c[1]},${c[0]}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false`;

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 6000);
                    const res = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    const data = await res.json();
                    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                        finalDistance = data.routes[0].distance / 1000.0;
                        osrmSuccess = true;
                    }
                } catch (e) {
                    console.warn("OSRM Fetch Failed, fallback to Haversine");
                }
            }

            const duration = activeOptionPackages[0].duration;
            const persons = activeOptionPackages[0].num_persons;

            // 3. Recalculate & Skalakan Ulang Legs sesuai OSRM Distance
            let ratePerKm = 2250;
            if (persons <= 1) ratePerKm = 2250;
            else if (persons <= 4) ratePerKm = 5150;
            else ratePerKm = 6000;

            if (osrmSuccess) {
                finalTransportCost = Math.round(finalDistance * ratePerKm);
                const distScale = totalDistance > 0 ? (finalDistance / totalDistance) : 0;
                const costScale = totalDistance > 0 ? (finalTransportCost / totalDistance) : 0;

                let accCost = 0;
                legs.forEach(leg => {
                    leg.distance = leg.distance * distScale;
                    leg.cost = Math.round(leg.distance * costScale);
                    accCost += leg.cost;
                });
                if (legs.length > 0 && finalTransportCost > 0) {
                    legs[legs.length - 1].cost += (finalTransportCost - accCost);
                }
                finalTotalCost = (totalCost - transportCost) + finalTransportCost;
            } else {
                let accCost = 0;
                legs.forEach(leg => {
                    leg.cost = Math.round(leg.distance * ratePerKm);
                    accCost += leg.cost;
                });
                if (legs.length > 0 && transportCost > 0) {
                    legs[legs.length - 1].cost += (transportCost - accCost);
                }
            }

            const formattedLegs = legs.map(l => ({
                from: l.from,
                to: l.to,
                from_coords: l.from_coords ? `${l.from_coords[0]},${l.from_coords[1]}` : "",
                to_coords: l.to_coords ? `${l.to_coords[0]},${l.to_coords[1]}` : "",
                distance: l.distance,
                cost: l.cost
            }));

            // Build the days summary array
            const daysArr = [];
            for (let d = 1; d <= duration; d++) {
                daysArr.push({
                    day: d,
                    className: selectedDays[d].className,
                    wisata: selectedDays[d].wisata,
                    kuliner: selectedDays[d].kuliner
                });
            }

            // Build travel plan object
            const newPlan = {
                id: 'mraya_' + Date.now(),
                title: `Rencana Kustom Wisata Malang (${duration} Hari)`,
                persons: persons,
                duration: duration,
                totalCost: finalTotalCost,
                hotelMode: hotelMode,
                hotel: selectedHotel ? {
                    nama: selectedHotel.nama,
                    harga: selectedHotel.harga,
                    cost: selectedHotel.cost,
                    className: selectedHotel.className
                } : null,
                hotelsByNight: selectedHotelsByNight,
                days: daysArr,
                legs: formattedLegs,
                totalDistance: finalDistance,
                transportCost: finalTransportCost,
                vehDesc: vehDesc
            };

            // Add to bookmark list
            bookmarkList.unshift(newPlan);
            localStorage.setItem(getMrayaKey(), JSON.stringify(bookmarkList));

            // Sync UI
            updateBookmarkUI();

            // Show Confetti Success Splash overlay
            showSuccessSplash();

        } catch (error) {
            console.error("Gagal Finalize", error);
            alert("Terjadi kesalahan saat mengkalkulasi dan menyimpan rencana.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }

    // Drawer triggers
    document.getElementById('nav-bookmark-btn')?.addEventListener('click', () => {
        document.getElementById('bookmark-drawer')?.classList.add('open');
        document.getElementById('bookmark-drawer-overlay')?.classList.add('open');
    });

    document.getElementById('mobile-nav-bookmark-btn')?.addEventListener('click', () => {
        document.getElementById('bookmark-drawer')?.classList.add('open');
        document.getElementById('bookmark-drawer-overlay')?.classList.add('open');
    });

    document.getElementById('drawer-close-btn')?.addEventListener('click', () => {
        document.getElementById('bookmark-drawer')?.classList.remove('open');
        document.getElementById('bookmark-drawer-overlay')?.classList.remove('open');
    });

    document.getElementById('bookmark-drawer-overlay')?.addEventListener('click', () => {
        document.getElementById('bookmark-drawer')?.classList.remove('open');
        document.getElementById('bookmark-drawer-overlay')?.classList.remove('open');
    });

    // Initial load UI sync
    updateBookmarkUI();

    // Handle URL parameters for pre-filled destination-first workflow
    const urlParams = new URLSearchParams(window.location.search);
    const paramWorkflow = urlParams.get('workflow');
    const paramDestId = urlParams.get('dest_id');
    const paramDestName = urlParams.get('dest_name');

    if (paramWorkflow === 'destination' && paramDestId) {
        // Trigger click on destination tab
        document.getElementById('tab-destination')?.click();

        // Populate search input and hidden id input
        const destInp = document.getElementById('d-dest-search-input');
        const destIdInp = document.getElementById('d-dest-id');
        if (destInp) {
            destInp.value = paramDestName ? decodeURIComponent(paramDestName) : '';
        }
        if (destIdInp) {
            destIdInp.value = paramDestId;
        }

        // Scroll to form card
        const formCard = document.getElementById('main-card');
        if (formCard) {
            setTimeout(() => {
                formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
});

/* ═══════════════════════════════════════════════════════════════════════════
   FITUR: TAMBAH DESTINASI WISATA HARIAN (Multi-Destinasi)
   Fungsi ini dipanggil dari event listener ".btn-add-dest" di buildPkgCard()
   ═══════════════════════════════════════════════════════════════════════════ */
function fmtRpGlobal(val) {
    if (val === null || val === undefined) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
}

async function openAddDestinationModal(pkg, card, pkgUid) {
    // Kumpulkan existing IDs (wisata utama dari seluruh hari itinerary + wisata tambahan)
    const extraDests = card._extraDestinations || [];
    const itineraryMainIds = (pkg.itinerary || []).map(day => day.wisata_id).filter(Boolean);
    const existingIds = [pkg.wisata_id].concat(itineraryMainIds).concat(extraDests.map(d => d.id)).filter(Boolean).join(',');

    // Hitung sisa budget setelah wahana dan extra transport
    const wahanaCost = (card._selectedFacilities || []).reduce((s, f) => s + f.cost_per_person * pkg.num_persons, 0);
    const extraTicketsSoFar = extraDests.reduce((s, d) => s + d.total_ticket_cost, 0);
    const effectiveBudgetRemaining = (pkg.budget_remaining || 0) - wahanaCost - (card._extraTransportCost || 0) - extraTicketsSoFar;

    // MAX: 1 wisata tambahan per hari
    const MAX_EXTRA = pkg.duration;

    // Guard: jangan buka kalau sudah penuh
    if (extraDests.length >= MAX_EXTRA) return;

    // Buat atau ambil modal overlay
    let modal = document.getElementById('add-dest-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-dest-modal';
        modal.className = 'add-dest-modal-overlay';
        modal.innerHTML = `
            <div class="add-dest-modal-box">
                <div class="add-dest-modal-header">
                    <div>
                        <div class="add-dest-modal-title">
                            <span class="material-symbols-outlined" style="font-size:18px;color:var(--teal-500);">add_location_alt</span>
                            Tambah Wisata Hari ${extraDests.length + 1}
                        </div>
                        <div class="add-dest-modal-sub" id="add-dest-modal-sub"></div>
                    </div>
                    <button class="add-dest-modal-close" id="add-dest-modal-close">&times;</button>
                </div>
                <div class="add-dest-modal-body" id="add-dest-modal-body">
                    <div class="add-dest-loading">
                        <span class="material-symbols-outlined" style="font-size:32px;color:var(--teal-400);animation:spin 1s linear infinite;">progress_activity</span>
                        <p>Mencari destinasi terdekat...</p>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    } else {
        // Update judul jika modal sudah ada
        const titleEl = modal.querySelector('.add-dest-modal-title');
        if (titleEl) titleEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;color:var(--teal-500);">add_location_alt</span> Tambah Wisata Hari ${extraDests.length + 1}`;
    }

    // Show modal
    modal.style.display = 'flex';
    const subEl = document.getElementById('add-dest-modal-sub');
    if (subEl) subEl.textContent = `Sisa budget: ${fmtRpGlobal(effectiveBudgetRemaining)} — slot Hari ${extraDests.length + 1} dari ${MAX_EXTRA}`;

    document.getElementById('add-dest-modal-close').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    // Koordinat jangkar: wisata utama hari yang sedang ditambah
    const activeDayIdx = extraDests.length;
    const activeDay = pkg.itinerary && pkg.itinerary[activeDayIdx] ? pkg.itinerary[activeDayIdx] : null;
    const searchLat = activeDay ? (activeDay.wisata_lat || pkg.wisata_lat) : (pkg.wisata_lat || 0);
    const searchLon = activeDay ? (activeDay.wisata_lon || pkg.wisata_lon) : (pkg.wisata_lon || 0);

    // Fetch candidates
    const bodyEl = document.getElementById('add-dest-modal-body');
    bodyEl.innerHTML = `<div class="add-dest-loading"><span class="material-symbols-outlined" style="font-size:32px;color:var(--teal-400);animation:spin 1s linear infinite;">progress_activity</span><p>Mencari destinasi terdekat...</p></div>`;

    try {
        const resp = await fetch('/api/add-destination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' },
            body: JSON.stringify({
                lat: searchLat,
                lon: searchLon,
                budget_remaining: effectiveBudgetRemaining,
                persons: pkg.num_persons,
                existing_ids: existingIds,
                max_results: 12,
                max_dist_km: 20,
            }),
        });
        const data = await resp.json();

        if (data.status !== 'success' || !data.candidates || data.candidates.length === 0) {
            bodyEl.innerHTML = `<div class="add-dest-empty"><span class="material-symbols-outlined" style="font-size:36px;color:var(--slate-300);">location_off</span><p>Tidak ada destinasi tambahan yang terjangkau di sekitar sini.</p></div>`;
            return;
        }

        // Render candidates list
        bodyEl.innerHTML = data.candidates.map((c, ci) => `
            <div class="add-dest-candidate" id="add-dest-cand-${ci}" data-idx="${ci}">
                <div class="add-dest-cand-info">
                    <div class="add-dest-cand-name">${c.nama}</div>
                    <div class="add-dest-cand-meta">
                        <span class="add-dest-tag">${c.kategori}</span>
                        <span class="add-dest-dist"><span class="material-symbols-outlined" style="font-size:12px;">near_me</span>${c.distance_km} km</span>
                        ${c.rating > 0 ? `<span class="add-dest-rating">⭐ ${c.rating.toFixed(1)}</span>` : ''}
                        ${c.has_additional_cost ? `<span class="add-dest-tag" style="background:#fef3c7;color:#b45309;">+ Wahana</span>` : ''}
                    </div>
                    ${c.has_additional_cost && c.additional_cost_label ? `
                    <div style="font-size:11px;color:var(--amber-600);margin-top:3px;">
                        ⚡ ${c.additional_cost_label}: estimasi Rp ${(c.additional_cost_min || 0).toLocaleString('id-ID')}–${(c.additional_cost_max || 0).toLocaleString('id-ID')}/org
                    </div>` : ''}
                </div>
                <div class="add-dest-cand-price">
                    <div class="add-dest-cand-ticket">${fmtRpGlobal(c.harga_tiket)}/org</div>
                    <div class="add-dest-cand-total">Total: ${fmtRpGlobal(c.total_ticket_cost)}</div>
                    <button class="btn-pick-dest" data-ci="${ci}">Pilih</button>
                </div>
            </div>
        `).join('');

        // Pilih destinasi
        bodyEl.querySelectorAll('.btn-pick-dest').forEach(btn => {
            btn.addEventListener('click', () => {
                const ci = parseInt(btn.dataset.ci, 10);
                const chosen = data.candidates[ci];
                const dayNum = activeDayIdx + 1;

                if (!card._extraDestinations) card._extraDestinations = [];
                card._extraDestinations.push({
                    id: chosen.id,
                    nama: chosen.nama,
                    harga_tiket: chosen.harga_tiket,
                    lat: chosen.lat,
                    lon: chosen.lon,
                    total_ticket_cost: chosen.total_ticket_cost,
                    distance_km: chosen.distance_km,
                    dayNum: dayNum,
                    has_additional_cost: chosen.has_additional_cost || 0,
                    additional_cost_label: chosen.additional_cost_label || '',
                    additional_cost_min: chosen.additional_cost_min || 0,
                    additional_cost_max: chosen.additional_cost_max || 0,
                });

                // Transport PP dari wisata utama ke extra wisata (x2 untuk pulang-pergi)
                const addTransport = Math.round(chosen.distance_km * 500 * 2);
                card._extraTransportCost = (card._extraTransportCost || 0) + addTransport;

                modal.style.display = 'none';

                // Refresh semua tampilan card secara real-time
                _refreshExtraDestUI(pkg, card, pkgUid, MAX_EXTRA);
            });
        });

    } catch (err) {
        bodyEl.innerHTML = `<div class="add-dest-empty"><span class="material-symbols-outlined" style="font-size:36px;color:var(--slate-300);">wifi_off</span><p>Gagal memuat kandidat. Coba lagi.</p></div>`;
        console.error('[addDestination] error:', err);
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: Refresh SEMUA tampilan card setelah extra wisata berubah
   (tambah / hapus / ganti) — single source of truth untuk update UI
   ───────────────────────────────────────────────────────────────────────────── */
function _refreshExtraDestUI(pkg, card, pkgUid, MAX_EXTRA) {
    const extraDests = card._extraDestinations || [];

    // 1. Render daftar extra-dest-added dengan tombol Hapus & Ganti
    const addedEl = document.getElementById(`extra-dest-added-${pkgUid}`);
    if (addedEl) {
        addedEl.innerHTML = extraDests.length === 0 ? '' : extraDests.map((d, i) => `
            <div class="extra-dest-item" data-extra-idx="${i}" style="display:flex;align-items:flex-start;gap:8px;padding:8px;background:rgba(13,148,136,0.04);border-radius:8px;margin-bottom:4px;">
                <span class="material-symbols-outlined" style="font-size:14px;color:var(--teal-500);flex-shrink:0;margin-top:2px;">check_circle</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:12.5px;color:var(--slate-800);">Hari ${d.dayNum}: <span style="color:var(--teal-700);">${d.nama}</span></div>
                    <div style="font-size:11px;color:var(--slate-400);margin-top:1px;">${d.distance_km} km dari wisata utama &bull; Tiket: ${fmtRpGlobal(d.total_ticket_cost)}</div>
                    ${d.has_additional_cost && d.additional_cost_label ? `<div style="font-size:11px;color:var(--amber-600);">⚡ ${d.additional_cost_label}: Rp ${(d.additional_cost_min || 0).toLocaleString('id-ID')}–${(d.additional_cost_max || 0).toLocaleString('id-ID')}/org</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
                    <button class="btn-change-extra-dest" data-extra-idx="${i}" style="background:var(--slate-100);border:1px solid var(--slate-300);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;color:var(--slate-600);display:flex;align-items:center;gap:2px;white-space:nowrap;">
                        <span class="material-symbols-outlined" style="font-size:12px;">swap_horiz</span>Ganti
                    </button>
                    <button class="btn-remove-extra-dest" data-extra-idx="${i}" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;color:#dc2626;display:flex;align-items:center;gap:2px;white-space:nowrap;">
                        <span class="material-symbols-outlined" style="font-size:12px;">delete</span>Hapus
                    </button>
                </div>
            </div>
        `).join('');

        // Event: Hapus
        addedEl.querySelectorAll('.btn-remove-extra-dest').forEach(rmBtn => {
            rmBtn.addEventListener('click', () => {
                const idx = parseInt(rmBtn.dataset.extraIdx, 10);
                const removed = card._extraDestinations.splice(idx, 1)[0];
                card._extraTransportCost = Math.max(0, (card._extraTransportCost || 0) - Math.round(removed.distance_km * 500 * 2));
                _refreshExtraDestUI(pkg, card, pkgUid, MAX_EXTRA);
            });
        });

        // Event: Ganti
        addedEl.querySelectorAll('.btn-change-extra-dest').forEach(chBtn => {
            chBtn.addEventListener('click', () => {
                const idx = parseInt(chBtn.dataset.extraIdx, 10);
                const removed = card._extraDestinations.splice(idx, 1)[0];
                card._extraTransportCost = Math.max(0, (card._extraTransportCost || 0) - Math.round(removed.distance_km * 500 * 2));
                // Refresh dulu, lalu buka modal (slot kosong lagi)
                _refreshExtraDestUI(pkg, card, pkgUid, MAX_EXTRA);
                openAddDestinationModal(pkg, card, pkgUid);
            });
        });
    }

    // 2. Hitung ulang semua biaya
    const newWahana = (card._selectedFacilities || []).reduce((s, f) => s + f.cost_per_person * pkg.num_persons, 0);
    const extraTickets = extraDests.reduce((s, d) => s + d.total_ticket_cost, 0);
    const newTotal = pkg.total_cost + newWahana + extraTickets + (card._extraTransportCost || 0);

    // 3. Update total
    const totalEl = document.getElementById(`total-display-${pkgUid}`);
    if (totalEl) totalEl.textContent = fmtRpGlobal(newTotal);

    // 4. Update wisata breakdown
    const wisataEl = document.getElementById(`wisata-display-${pkgUid}`);
    if (wisataEl) wisataEl.textContent = fmtRpGlobal(pkg.cost_wisata + newWahana + extraTickets);

    const wisataLabelEl = document.getElementById(`wisata-label-${pkgUid}`);
    if (wisataLabelEl) {
        const totalWisata = pkg.duration + extraDests.length;
        let lbl = `🎯 Tiket Wisata (${pkg.num_persons} orang × ${totalWisata} wisata)`;
        if (newWahana > 0) lbl += " + Tambahan";
        wisataLabelEl.textContent = lbl;
    }

    // 5. Update transport breakdown
    const transportEl = document.getElementById(`transport-display-${pkgUid}`);
    if (transportEl) transportEl.textContent = fmtRpGlobal(pkg.cost_transport + (card._extraTransportCost || 0));

    // 6. Update transport legs (teks rute per leg termasuk extra wisata)
    const legsEl = document.getElementById(`transport-legs-${pkgUid}`);
    if (legsEl) legsEl.innerHTML = _buildExtraLegsRows(pkg, extraDests);

    // 7. Update sisa / remaining budget
    const budgetInput = pkg.budget_input || 0;
    const newRemaining = budgetInput > 0 ? budgetInput - newTotal : null;
    const remainEl = document.getElementById(`remain-display-${pkgUid}`);
    if (remainEl && newRemaining !== null) {
        const isOver = newRemaining < 0;
        remainEl.innerHTML = `<div class="pkg-sisa ${isOver ? 'over' : 'ok'}">${isOver ? '⚠ Melebihi budget ' + fmtRpGlobal(Math.abs(newRemaining)) : '✓ Sisa ' + fmtRpGlobal(newRemaining)}</div>`;
        const tbox = document.getElementById(`pkg-total-box-${pkgUid}`);
        if (tbox) tbox.className = `pkg-total ${isOver ? 'over' : 'ok'}`;
        const ticon = document.getElementById(`total-icon-${pkgUid}`);
        if (ticon) { ticon.textContent = isOver ? 'warning' : 'check_circle'; ticon.style.color = isOver ? '#dc2626' : 'var(--teal-400)'; }
    }

    // 8. Update tombol tambah wisata
    const infoEl = document.getElementById(`extra-dest-info-${pkgUid}`);
    const addBtn = document.getElementById(`btn-add-dest-${pkgUid}`);
    const effectiveRem = newRemaining !== null
        ? newRemaining
        : (pkg.budget_remaining || 0) - newWahana - (card._extraTransportCost || 0) - extraTickets;

    if (extraDests.length >= MAX_EXTRA) {
        if (addBtn) addBtn.style.display = 'none';
        if (infoEl) infoEl.textContent = `Batas maksimal ${MAX_EXTRA} wisata tambahan (1 per hari) tercapai.`;
    } else if (effectiveRem >= 5000) {
        if (addBtn) {
            addBtn.style.display = '';
            addBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:15px;">add</span> Tambah Wisata Hari ${extraDests.length + 1}`;
        }
        if (infoEl) infoEl.textContent = `Sisa ${fmtRpGlobal(effectiveRem)} — tambah wisata untuk Hari ${extraDests.length + 1}!`;
    } else {
        if (addBtn) addBtn.style.display = 'none';
        if (infoEl) infoEl.textContent = 'Budget tidak mencukupi untuk menambah wisata lagi.';
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: Bangun inner HTML untuk #transport-legs-{uid}
   Memuat semua original legs dari backend + baris tambahan untuk setiap extra wisata
   ───────────────────────────────────────────────────────────────────────────── */
function _buildExtraLegsRows(pkg, extraDests) {
    const legs = pkg.transport_detail?.legs || [];
    // Baris asli dari backend
    let rows = legs.map(l =>
        `<div class="transport-leg-row" style="align-items:flex-start;gap:4px;">
            <span style="flex:1;min-width:0;word-break:break-word;line-height:1.3;">${l.from} → ${l.to} (${l.distance_km?.toFixed(1)} km)</span>
            <span style="flex-shrink:0;">${fmtRpGlobal(l.cost)}</span>
         </div>`
    ).join('');

    // Baris tambahan untuk setiap extra wisata (pulang-pergi dari wisata utama hari itu)
    extraDests.forEach(d => {
        const legCost = Math.round(d.distance_km * 500 * 2);
        rows += `
            <div class="transport-leg-row" style="align-items:flex-start;gap:4px;background:rgba(13,148,136,0.05);border-radius:6px;padding:3px 6px;margin-top:2px;">
                <span style="flex:1;min-width:0;word-break:break-word;line-height:1.4;color:var(--teal-700);">
                    <span class="material-symbols-outlined" style="font-size:11px;vertical-align:middle;">add_location_alt</span>
                    Wisata Utama → ${d.nama} → Wisata Utama (Hari ${d.dayNum}, PP ~${(d.distance_km * 2).toFixed(1)} km)
                </span>
                <span style="flex-shrink:0;color:var(--teal-700);">${fmtRpGlobal(legCost)}</span>
            </div>`;
    });

    return rows;
}