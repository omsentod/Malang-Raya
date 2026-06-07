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
                    <button type="button" class="custom-select-item ${isSelected ? 'active' : ''}" data-value="${opt.value}" style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        width: 100%;
                        padding: 10px 14px;
                        font-size: 13px;
                        font-weight: 750;
                        color: ${isSelected ? 'var(--teal-700)' : 'var(--slate-600)'};
                        background: ${isSelected ? 'rgba(20, 184, 166, 0.08)' : 'transparent'};
                        border-radius: 10px;
                        border: none;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        text-align: left;
                        margin-bottom: 2px;
                        font-family: inherit;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                            ${optGraphic ? optGraphic : ''}
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${opt.text}</span>
                        </div>
                        ${isSelected ? '<span class="material-symbols-outlined" style="font-size: 16px; color: var(--teal-600); flex-shrink: 0;">check_circle</span>' : ''}
                    </button>
                `;
            }).join('');
            
            container.innerHTML = `
                <button type="button" class="custom-select-trigger" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--slate-700);
                    background: var(--slate-50);
                    border: 1.5px solid var(--slate-200);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    font-family: inherit;
                ">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <span class="trigger-prefix-icon" style="display:flex; align-items:center; flex-shrink:0;">
                            ${activeGraphic ? activeGraphic : ''}
                        </span>
                        <span class="custom-select-trigger-text" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${selectedLabel}</span>
                    </div>
                    <span class="material-symbols-outlined select-arrow-icon" style="color: var(--slate-400); font-size: 18px; transition: transform 0.2s;">expand_more</span>
                </button>
                
                <div class="custom-select-menu" style="
                    position: absolute;
                    top: calc(100% + 6px);
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1.5px solid var(--slate-200);
                    border-radius: 14px;
                    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
                    z-index: 1500;
                    display: none;
                    flex-direction: column;
                    padding: 6px;
                    box-sizing: border-box;
                ">
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
                    if (m !== menuList) m.classList.remove('open');
                });
                document.querySelectorAll('.select-arrow-icon').forEach(a => {
                    if (a !== arrowIcon) a.style.transform = 'rotate(0deg)';
                });
                
                if (isOpen) {
                    menuList.classList.remove('open');
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
                } else {
                    menuList.classList.add('open');
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(180deg)';
                }
            });
            
            menuList.querySelectorAll('.custom-select-item').forEach((itemEl, idx) => {
                itemEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuList.classList.remove('open');
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
                        btn.style.color = 'var(--slate-600)';
                        btn.style.background = 'transparent';
                        const checkIcon = btn.querySelector('.material-symbols-outlined');
                        checkIcon?.remove();
                    });
                    itemEl.classList.add('active');
                    itemEl.style.color = 'var(--teal-700)';
                    itemEl.style.background = 'rgba(20, 184, 166, 0.08)';
                    
                    const checkSpan = document.createElement('span');
                    checkSpan.className = 'material-symbols-outlined';
                    checkSpan.style.cssText = 'font-size: 16px; color: var(--teal-600); flex-shrink: 0;';
                    checkSpan.textContent = 'check_circle';
                    itemEl.appendChild(checkSpan);
                    
                    selectEl.selectedIndex = idx;
                    selectEl.dispatchEvent(new Event('change'));
                });
            });
        });
        
        // Document click to close all custom select menus
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-menu').forEach(m => m.classList.remove('open'));
            document.querySelectorAll('.select-arrow-icon').forEach(a => a.style.transform = 'rotate(0deg)');
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

            // Urutkan ulang: opsi yang aman budget-nya ditaruh di atas, yang over budget dilempar ke bawah
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
                <div class="autocomplete-empty" style="padding: 16px; text-align: center; color: var(--slate-400);">
                    <span class="material-symbols-outlined" style="font-size: 24px; margin-bottom: 6px;">search_off</span>
                    <h5 style="margin: 0 0 2px; font-size: 12px; font-weight: 700; color: var(--slate-700);">Tidak Ada Pilihan</h5>
                    <p style="margin: 0; font-size: 11px;">Tidak ditemukan alternatif yang cocok.</p>
                </div>
            `;
            return;
        }

        html += `<div class="autocomplete-section-title" style="padding: 8px 12px 4px; font-size: 10px; font-weight: 800; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.5px;">Pilihan Alternatif</div>`;

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
                    <div class="suggestion-thumb-wrap" style="width: 32px; height: 32px; border-radius: 6px; overflow: hidden; flex-shrink: 0;">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'hotel')" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                `;
            } else if (type === 'wisata') {
                const wFolder = item.nama.trim().replace(/ /g, '_');
                imgHTML = `
                    <div class="suggestion-thumb-wrap" style="width: 32px; height: 32px; border-radius: 6px; overflow: hidden; flex-shrink: 0;">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'landscape')" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                `;
            } else {
                const kFolder = item.nama.trim().replace(/ /g, '_');
                imgHTML = `
                    <div class="suggestion-thumb-wrap" style="width: 32px; height: 32px; border-radius: 6px; overflow: hidden; flex-shrink: 0;">
                        <img class="suggestion-thumb" src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" alt="${escapeHtmlAttr(item.nama)}" onerror="handleImgErrorRecom(this, 'restaurant')" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                `;
            }

            html += `
                <div class="autocomplete-suggestion custom-suggestion-item" 
                     data-name="${escapeHtmlAttr(item.nama)}"
                     style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid var(--slate-100);">
                    ${imgHTML}
                    <div class="suggestion-info" style="flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;">
                        <div class="suggestion-title" style="font-size: 12px; font-weight: 700; color: var(--slate-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nama}</div>
                        <div class="suggestion-meta" style="font-size: 10.5px; color: var(--slate-400); display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                            ${item.isOverBudget ? '<span class="suggestion-badge" style="background:#fecaca; color:#dc2626; padding: 1px 4px; border-radius: 3px; font-weight: 700; font-size: 9px; border:1px solid #fee2e2;">⚠️ BUDGET OVER</span>' : '<span class="suggestion-badge" style="background:#ccfbf1; color:#0d9488; padding: 1px 4px; border-radius: 3px; font-weight: 700; font-size: 9px; border:1px solid #e2fbf7;">✓ AMAN</span>'}
                            ${distSuffix ? `<span>• 📍 ${distSuffix}</span>` : ''}
                        </div>
                    </div>
                    <div class="suggestion-price" style="font-size: 11.5px; font-weight: 700; color: var(--teal-600); flex-shrink: 0;">${priceFormatted}</div>
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

                        const dayWisataCost = (dNum === 1) ? targetDPlan.wisata_harga * persons : 0;
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
    function setupCounter(inputId, minusId, plusId, min = 1) {
        const inp = document.getElementById(inputId);
        const plus = document.getElementById(plusId);
        const minus = document.getElementById(minusId);
        if (!inp || !plus || !minus) return;
        minus.addEventListener('click', () => { if (+inp.value > min) { inp.value = +inp.value - 1; updateBudgetSliders(); fetchApiMinMaxUpdate(); onBudgetChange(); } });
        plus.addEventListener('click', () => { inp.value = +inp.value + 1; updateBudgetSliders(); fetchApiMinMaxUpdate(); onBudgetChange(); });
        inp.addEventListener('input', () => { updateBudgetSliders(); fetchApiMinMaxUpdate(); onBudgetChange(); });
        inp.addEventListener('change', () => { updateBudgetSliders(); fetchApiMinMaxUpdate(); onBudgetChange(); });
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
    function calculateScaledMinBudget(persons, duration, hotelMode = 'same') {
        let ratePerKm = 2250;
        if (persons > 4) ratePerKm = 6000;
        else if (persons > 1) ratePerKm = 5150;

        const minHotelPrice = 50000;
        const minWisataPrice = 0;
        const avgWisataPrice = 5000;
        const minKulinerPrice = 8000;
        const avgKulinerPrice = 10000;

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
        if (duration === 1) minDistanceBase = 10;
        else if (duration === 2) minDistanceBase = 20 + 10;
        else minDistanceBase = 20 + 20 * (duration - 2) + 10;

        // Ekstra mobilitas / jarak untuk perpindahan lokasi hotel baru
        if (hotelMode === 'split' && duration > 2) minDistanceBase += (15 * (duration - 2));

    const costTransport = Math.round(minDistanceBase * ratePerKm);

    const totalMin = costHotel + costWisata + costKuliner + costTransport;
        return Math.ceil((totalMin * 1.30) / 50000) * 50000;
    }

    function calculateScaledMaxBudget(persons, duration, hotelMode = 'same') {
        let ratePerKm = 2250;
        if (persons > 4) ratePerKm = 6000;
        else if (persons > 1) ratePerKm = 5150;

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

        const bMin = calculateScaledMinBudget(bPersons, bDuration, bHotelMode);
        const bMax = calculateScaledMaxBudget(bPersons, bDuration, bHotelMode);

        // Show/hide b-hotel-mode-group depending on bDuration > 2
        const bHotelGroup = document.getElementById('b-hotel-mode-group');
        if (bHotelGroup) {
            bHotelGroup.style.display = bDuration > 2 ? 'block' : 'none';
        }

        const bSlider = document.getElementById('b-budget');
        if (bSlider) {
            bSlider.min = 0; // Biarkan slider fisik bebas mentok 0 demi UX yang smooth
            bSlider.dataset.aiMin = bMin; // Simpan batas AI secara gaib
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

        const dMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode);
        const dMax = calculateScaledMaxBudget(dPersons, dDuration, dHotelMode);

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
            dSlider.dataset.aiMin = dMin; // Simpan batas AI secara gaib
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

        let dMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode);
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
                let targetDMin = calculateScaledMinBudget(dPersons, dDuration, dHotelMode);
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
            let minBudget = calculateScaledMinBudget(persons, duration, hotelMode);
            const slider = document.getElementById('d-budget');
            if (slider && slider.dataset.aiMin) minBudget = parseInt(slider.dataset.aiMin);
            if (val < minBudget) return 0; // return 0 for "No Budget"
        }
        return val;
    }

    function checkMinBudget(personsId, durationId, budgetId, warningBoxId, hotelModeId) {
        const persons = +document.getElementById(personsId)?.value || 1;
        const duration = +document.getElementById(durationId)?.value || 1;
        const hotelMode = document.getElementById(hotelModeId)?.value || 'same';
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
                <span>Sedang mensinkronkan batas anggaran minimum dengan AI...</span>
            `;
            box.style.display = 'flex';
            return;
        }

        // Ambil nilai AI pintar dari label (jika ada), sehingga kotak peringatan responsif terhadap Python AI
        let minBudget = calculateScaledMinBudget(persons, duration, hotelMode);
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

    async function fetchBudgetRange(persons, duration) {
        try {
            const fd = new FormData();
            fd.append('persons', persons);
            fd.append('duration', duration);
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

        // ── Fetch untuk Destination-First (pakai nilai d- bukan b-) ──
        const dPersons = +document.getElementById('d-persons')?.value || 1;
        const dDuration = +document.getElementById('d-duration')?.value || 1;

        // Fetch keduanya paralel
        const [bRange, dRange] = await Promise.all([
            fetchBudgetRange(bPersons, bDuration),
            fetchBudgetRange(dPersons, dDuration)
        ]);

        if (seq !== budgetFetchSeq) return;

        isSyncingBudget = false;

        // ── Update b-slider ──
        if (bRange) {
            const bSlider = document.getElementById('b-budget');
            if (bSlider) {
                bSlider.dataset.aiMin = bRange.min_budget;
                const oldVal = parseInt(bSlider.value) || bRange.min_budget;
                
                const safeMax = Math.max(bRange.min_budget + 50000, bRange.max_budget);
                bSlider.max = safeMax;
                bSlider.min = 0; // Biarkan slider tetap di 0
                bSlider.step = 10000;

                let newVal = Math.max(0, Math.min(safeMax, oldVal));
                bSlider.value = newVal;

                document.getElementById('b-budget-val')?.textContent !== undefined &&
                    (document.getElementById('b-budget-val').textContent = fmtRp(newVal));
                document.getElementById('b-budget-min-label') &&
                    (document.getElementById('b-budget-min-label').textContent = "Min: Rp 0");
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

        // Enable/disable submit buttons based on capacity checks
        const bSubmit = document.getElementById('b-submit');
        if (bSubmit) bSubmit.disabled = !isBudgetCapValid;

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

        // Render dynamic option select dropdown if more than 1 option is returned
        if (options && options.length > 1 && tabsEl && tabsContainer) {
            let visibleOptions = options;
            const needsViewAll = options.length > 5;
            const isShowingAll = showingAllAIAlternatives;

            if (needsViewAll && !isShowingAll) {
                visibleOptions = options.slice(0, 5);
            }

            const activeOpt = options.find(opt => opt.active) || options[0];
            const activeFirstPkg = activeOpt.packages && activeOpt.packages[0];
            const activeWName = activeFirstPkg ? activeFirstPkg.wisata_nama : '';
            const activeWFolder = activeWName ? (activeWName.includes(' & ') ? activeWName.split(' & ')[0] : activeWName).trim().replace(/ /g, '_') : '';
            const activeImgUrl = activeWFolder ? `/assets/GAMBAR/wisata/${activeWFolder}/${activeWFolder}-1.jpg` : '';

            let dropdownHTML = `
                <div class="custom-select-dropdown-container" style="position: relative; max-width: 380px; width: 100%; margin-top: 8px; margin-bottom: 8px; z-index: 50;">
                    <button type="button" class="custom-select-trigger" id="ai-alternatives-trigger" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        width: 100%;
                        padding: 8px 14px;
                        font-size: 13.5px;
                        font-weight: 800;
                        color: var(--slate-800);
                        background: #fff;
                        border: 1.5px solid var(--slate-200);
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                        text-align: left;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                            <div class="suggestion-thumb-wrap" style="width: 38px; height: 38px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: var(--slate-100); border: 1px solid var(--slate-200);">
                                <img class="suggestion-thumb" id="ai-alternatives-trigger-img" src="${activeImgUrl}" alt="${escapeHtmlAttr(activeWName)}" onerror="handleImgErrorRecom(this, 'landscape')" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                                <span class="custom-select-trigger-text" style="font-size: 13px; font-weight: 800; color: var(--slate-800);">Opsi Alternatif ${activeOpt.option_index}</span>
                                <span class="custom-select-trigger-sub" style="font-size: 11px; color: var(--slate-500); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
                                    📍 ${activeWName || 'Wisata'}
                                </span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined select-arrow-icon" style="color: var(--slate-400); font-size: 18px; transition: transform 0.2s; margin-left: 8px;">expand_more</span>
                    </button>
                    
                    <div class="custom-select-menu" id="ai-alternatives-menu" style="
                        position: absolute;
                        top: calc(100% + 6px);
                        left: 0;
                        right: 0;
                        background: rgba(255, 255, 255, 0.98);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1.5px solid var(--slate-200);
                        border-radius: 14px;
                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.1);
                        z-index: 1500;
                        display: none;
                        flex-direction: column;
                        overflow-y: auto;
                        max-height: 250px;
                        padding: 6px;
                        box-sizing: border-box;
                    ">
            `;

            dropdownHTML += visibleOptions.map((opt, i) => {
                const isSelected = opt.active;
                const firstPkg = opt.packages && opt.packages[0];
                const wName = firstPkg ? firstPkg.wisata_nama : '';
                const wFolder = wName ? (wName.includes(' & ') ? wName.split(' & ')[0] : wName).trim().replace(/ /g, '_') : '';
                const imgUrl = wFolder ? `/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg` : '';
                return `
                        <button type="button" class="custom-select-item ${isSelected ? 'active' : ''}" data-idx="${i}" style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            width: 100%;
                            padding: 10px 14px;
                            font-size: 13px;
                            font-weight: 700;
                            color: ${isSelected ? 'var(--teal-700)' : 'var(--slate-600)'};
                            background: ${isSelected ? 'rgba(20, 184, 166, 0.08)' : 'transparent'};
                            border-radius: 10px;
                            border: none;
                            cursor: pointer;
                            transition: all 0.15s ease;
                            text-align: left;
                            margin-bottom: 2px;
                        ">
                            <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                                <div class="suggestion-thumb-wrap" style="width: 42px; height: 42px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--slate-100); border: 1px solid var(--slate-200);">
                                    <img class="suggestion-thumb" src="${imgUrl}" alt="${escapeHtmlAttr(wName)}" onerror="handleImgErrorRecom(this, 'landscape')" style="width: 100%; height: 100%; object-fit: cover;" />
                                </div>
                                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                                    <span style="font-size: 13px; font-weight: 800; color: ${isSelected ? 'var(--teal-700)' : 'var(--slate-700)'};">Opsi Alternatif ${opt.option_index}</span>
                                    <span style="font-size: 11px; color: var(--slate-500); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
                                        📍 ${wName || 'Wisata'}
                                    </span>
                                </div>
                            </div>
                            ${isSelected ? '<span class="material-symbols-outlined" style="font-size: 16px; color: var(--teal-600); margin-left: 8px;">check_circle</span>' : ''}
                        </button>
                `;
            }).join('');

            if (needsViewAll && !isShowingAll) {
                dropdownHTML += `
                        <button type="button" class="custom-select-item view-all-trigger" style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            width: 100%;
                            padding: 10px 14px;
                            font-size: 13px;
                            font-weight: 700;
                            color: var(--teal-600);
                            background: transparent;
                            border-radius: 10px;
                            border: none;
                            cursor: pointer;
                            transition: all 0.15s ease;
                            text-align: left;
                            margin-top: 4px;
                            border-top: 1px solid var(--slate-100);
                        ">
                            <span class="material-symbols-outlined" style="font-size: 16px;">search</span>
                            <span>Lihat Semua (${options.length} Opsi)...</span>
                        </button>
                `;
            }

            dropdownHTML += `
                    </div>
                </div>
            `;

            tabsEl.innerHTML = dropdownHTML;
            tabsContainer.style.display = 'flex';

            // Attach event listeners for custom select
            const triggerBtn = document.getElementById('ai-alternatives-trigger');
            const menuList = document.getElementById('ai-alternatives-menu');
            const arrowIcon = triggerBtn?.querySelector('.select-arrow-icon');

            triggerBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = menuList.classList.contains('open');
                
                // Close other open custom select menus
                document.querySelectorAll('.custom-select-menu').forEach(m => {
                    if (m !== menuList) m.classList.remove('open');
                });
                
                if (isOpen) {
                    menuList.classList.remove('open');
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
                } else {
                    menuList.classList.add('open');
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(180deg)';
                }
            });

            // Close menu on clicking outside
            document.addEventListener('click', () => {
                if (menuList) menuList.classList.remove('open');
                if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
            });

            menuList?.querySelectorAll('.custom-select-item').forEach(itemEl => {
                itemEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuList.classList.remove('open');
                    if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';

                    if (itemEl.classList.contains('view-all-trigger')) {
                        showingAllAIAlternatives = true;
                        showResults(options, workflowLabel);
                        // Auto-open menu again to show all options
                        setTimeout(() => {
                            const m = document.getElementById('ai-alternatives-menu');
                            const t = document.getElementById('ai-alternatives-trigger');
                            if (m) m.classList.add('open');
                            if (t) {
                                const arr = t.querySelector('.select-arrow-icon');
                                if (arr) arr.style.transform = 'rotate(180deg)';
                            }
                        }, 50);
                        return;
                    }

                    const idx = parseInt(itemEl.dataset.idx);
                    options.forEach((opt, i) => opt.active = (i === idx));

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
                });
            });
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
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                    <h3>Tidak Ada Paket Sesuai Budget</h3>
                    <p>Coba naikkan budget atau kurangi durasi. Budget minimal ±Rp 500.000 untuk 1 hari 1 orang.</p>
                </div>`;
        } else {
            packages.forEach(pkg => grid.appendChild(buildPkgCard(pkg)));
        }
    }

    // ─────────────────────────────────────────────────
    // Build Package Card
    // ─────────────────────────────────────────────────
    function buildPkgCard(pkg) {
        const kat = (pkg.kategori || 'Hemat').toLowerCase();
        const katMap = { hemat: 'hemat', balanced: 'balanced', premium: 'premium' };
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
            ? `<div class="transport-legs">
                ${legs.map(l => `<div class="transport-leg-row"><span>${l.from}→${l.to} (${l.distance_km?.toFixed(1)} km)</span><span>${fmtRp(l.cost)}</span></div>`).join('')}
               </div>` : '';

        const remainHTML = remaining !== null
            ? `<div class="pkg-sisa ${isOver ? 'over' : 'ok'}">${isOver ? '⚠ Melebihi budget ' + fmtRp(Math.abs(remaining)) : '✓ Sisa ' + fmtRp(remaining)}</div>` : '';

        const getFolder = name => {
            if (!name) return '';
            const cleanName = name.includes(' & ') ? name.split(' & ')[0] : name;
            return cleanName.trim().replace(/ /g, '_');
        };
        const hFolder = getFolder(pkg.hotel_nama_real || pkg.hotel_nama);
        const wFolder = getFolder(pkg.wisata_nama);
        const kpFolder = getFolder(pkg.kuliner_pagi_nama);
        const kFolder = getFolder(pkg.kuliner_nama);

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
                const wisataCost = 0; // Sesuai rumus skripsi, tiket hanya dihitung 1x di Hari 1
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
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">hotel</span>
                                        <span>Hotel: <span style="color: var(--slate-800); font-weight: 700;">${hasHotel ? day.hotel : 'Checkout'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">
                                        ${hasHotel ? `${fmtRp(day.hotel_harga)} /malam ${isPindah ? '<span class="pkg-badge hemat" style="font-size: 9px; padding: 1px 4px; font-weight: 700; margin-left: 4px;">Pindah</span>' : '<span class="pkg-badge balanced" style="font-size: 9px; padding: 1px 4px; font-weight: 700; margin-left: 4px;">Sama</span>'}` : 'Rp 0'}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">landscape</span>
                                        <span>Wisata: <span style="color: var(--slate-800); font-weight: 700;">${day.wisata}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">${fmtRp(day.wisata_harga || 0)} /orang</span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">wb_twilight</span>
                                        <span>Makan Pagi: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner_pagi || 'N/A'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">${fmtRp(day.kuliner_pagi_harga || 0)} /org</span>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">sunny</span>
                                        <span>Makan Siang: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">${fmtRp(day.kuliner_harga || 0)} /org</span>
                                </div>
                                ${(pkg.duration === 1 || day.day === pkg.duration) ? '' : `
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">dark_mode</span>
                                        <span>Makan Malam: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner_malam || 'N/A'}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">${fmtRp(day.kuliner_malam_harga || 0)} /org</span>
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
                                    <span>• Tiket Wisata (${pkg.num_persons} Orang) <span style="font-size: 8.5px; color:var(--slate-400); font-weight:500;">(Hari 1)</span></span>
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
                        <div class="pkg-item-name">${pkg.wisata_nama}</div>
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
                        <div class="pkg-item-name">${pkg.kuliner_nama}</div>
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
                        <span>🎯 Tiket Wisata (${pkg.num_persons} orang)</span>
                        <span>${fmtRp(pkg.cost_wisata)}</span>
                    </div>
                    <div class="pkg-breakdown-row">
                        <span>🍜 Kuliner (${pkg.num_persons} orang × ${pkg.duration === 1 ? 2 : (3 * (pkg.duration - 1) + 2)} makan)</span>
                        <span>${fmtRp(pkg.cost_kuliner)}</span>
                    </div>
                    <div class="pkg-breakdown-row transport-row">
                        <span>🚗 Transportasi (${legs[0]?.vehicle || 'Otomatis'})</span>
                        <span>${fmtRp(pkg.cost_transport)}</span>
                    </div>
                    ${legHTML}
                </div>

                <div class="pkg-total ${remaining !== null ? (isOver ? 'over' : 'ok') : 'neutral'}">
                    <div>
                        <div class="total-label">TOTAL PAKET</div>
                        <div class="total-amount">${fmtRp(pkg.total_cost)}</div>
                    </div>
                    ${remaining !== null ? `
                    <span class="material-symbols-outlined" style="font-size:28px;color:${isOver ? '#dc2626' : 'var(--teal-400)'}">
                        ${isOver ? 'warning' : 'check_circle'}
                    </span>` : ''}
                </div>
                ${remainHTML}
            </div>
            <div class="pkg-footer" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <button class="pkg-btn-detail" style="flex:1;">Lihat Detail & Rute</button>
                <button class="pkg-btn-save" style="flex:1; background:var(--teal-600); color:#fff; border:none; padding:10px 14px; border-radius:10px; font-weight:800; cursor:pointer; font-size:12.5px; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:background 0.2s;">
                     <span class="material-symbols-outlined" style="font-size:16px;">bookmark</span>
                     <span>Simpan Rencana</span>
                </button>
            </div>
        `;

        const btn = card.querySelector('.pkg-btn-detail');
        if (btn) {
            btn.addEventListener('click', () => {
                openDetailModal(pkg);
            });
        }

        const saveBtn = card.querySelector('.pkg-btn-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
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
                    totalCost: pkg.total_cost,
                    hotel: pkg.duration > 1 ? {
                        nama: pkg.hotel_nama_real || pkg.hotel_nama,
                        harga: pkg.hotel_harga,
                        cost: pkg.cost_akomodasi,
                        className: (pkg.kategori || 'Hemat').toLowerCase()
                    } : null,
                    days: days,
                    legs: (pkg.transport_detail?.legs || []).map(l => ({
                        from: resolveRealName(l.from, pkg),
                        to: resolveRealName(l.to, pkg),
                        from_coords: resolveCoords(l.from, pkg),
                        to_coords: resolveCoords(l.to, pkg),
                        distance: l.distance_km
                    })),
                    totalDistance: pkg.transport_detail?.total_distance_km || 0,
                    transportCost: pkg.cost_transport || 0,
                    vehDesc: pkg.transport_detail?.legs?.[0]?.vehicle || 'Otomatis'
                };
                bookmarkList.unshift(newPlan);
                localStorage.setItem('mraya_bookmarks', JSON.stringify(bookmarkList));
                updateBookmarkUI();
                showSuccessSplash();
            });
        }

        return card;
    }

    // ─────────────────────────────────────────────────
    // Route Detail Modal with Day-by-Day Itinerary
    // ─────────────────────────────────────────────────
    function openDetailModal(pkg) {
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

        // Extract ordered route points (hanya hapus duplikat berurutan untuk menjaga rute pulang-pergi hotel)
        const uniqueRealNames = [];
        const uniqueRealCoords = [];
        if (legs.length > 0) {
            const realNames = legs.map(leg => resolveRealName(leg.from, pkg));
            const realCoords = legs.map(leg => resolveCoords(leg.from, pkg));
            realNames.push(resolveRealName(legs[legs.length - 1].to, pkg));
            realCoords.push(resolveCoords(legs[legs.length - 1].to, pkg));

            realNames.forEach((name, idx) => {
                const cleanName = name ? name.trim() : "";
                const coord = realCoords[idx];
                if (cleanName && cleanName !== 'N/A' && cleanName !== 'Checkout' && coord) {
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== cleanName) {
                        uniqueRealNames.push(cleanName);
                        uniqueRealCoords.push(coord);
                    }
                }
            });
        } else {
            if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
                uniqueRealNames.push(pkg.hotel_nama_real || pkg.hotel_nama);
                uniqueRealCoords.push(`${pkg.hotel_lat || 0},${pkg.hotel_lon || 0}`);
            }
            pkg.itinerary?.forEach(day => {
                if (day.kuliner_pagi && day.kuliner_pagi !== 'N/A') {
                    const clean = day.kuliner_pagi.trim();
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== clean) {
                        uniqueRealNames.push(clean);
                        uniqueRealCoords.push(`${day.kuliner_pagi_lat || 0},${day.kuliner_pagi_lon || 0}`);
                    }
                }
                if (day.wisata && day.wisata !== 'N/A') {
                    const clean = day.wisata.trim();
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== clean) {
                        uniqueRealNames.push(clean);
                        uniqueRealCoords.push(`${day.wisata_lat || 0},${day.wisata_lon || 0}`);
                    }
                }
                if (day.kuliner && day.kuliner !== 'N/A') {
                    const clean = day.kuliner.trim();
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== clean) {
                        uniqueRealNames.push(clean);
                        uniqueRealCoords.push(`${day.kuliner_lat || 0},${day.kuliner_lon || 0}`);
                    }
                }
                if (day.kuliner_malam && day.kuliner_malam !== 'N/A') {
                    const clean = day.kuliner_malam.trim();
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== clean) {
                        uniqueRealNames.push(clean);
                        uniqueRealCoords.push(`${day.kuliner_malam_lat || 0},${day.kuliner_malam_lon || 0}`);
                    }
                }
                if (day.hotel && day.hotel !== 'Checkout') {
                    const clean = day.hotel.trim();
                    if (uniqueRealNames.length === 0 || uniqueRealNames[uniqueRealNames.length - 1] !== clean) {
                        uniqueRealNames.push(clean);
                        uniqueRealCoords.push(`${day.hotel_lat || pkg.hotel_lat || 0},${day.hotel_lon || pkg.hotel_lon || 0}`);
                    }
                }
            });
        }

        // Generate Maps directions URL & embed map URL menggunakan koordinat agar sangat akurat
        let mapEmbedUrl = "";
        let mapsUrl = "";
        if (uniqueRealCoords.length >= 2) {
            const originSearch = uniqueRealCoords[0];
            const embedDAddr = uniqueRealCoords.slice(1).map(w => encodeURIComponent(w)).join("+to:");
            mapEmbedUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(originSearch)}&daddr=${embedDAddr}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
            
            const destName = uniqueRealCoords[uniqueRealCoords.length - 1];
            const waypointsNames = uniqueRealCoords.slice(1, -1).join('|');
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originSearch)}&destination=${encodeURIComponent(destName)}&waypoints=${encodeURIComponent(waypointsNames)}&travelmode=driving`;
        } else if (uniqueRealCoords.length === 1) {
            const searchQ = uniqueRealCoords[0];
            mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQ)}&hl=id&z=15&t=&ie=UTF8&iwloc=&output=embed`;
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQ)}`;
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

        if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
            addPic(pkg.hotel_nama_real || pkg.hotel_nama, 'hotel', 'Hotel');
        }

        pkg.itinerary?.forEach(day => {
            addPic(day.wisata, 'wisata', 'Wisata');
            addPic(day.kuliner_pagi, 'makan', 'Makan Pagi');
            addPic(day.kuliner, 'makan', 'Makan Siang');
            addPic(day.kuliner_malam, 'makan', 'Makan Malam');
        });

        const imagesGridHTML = uniquePics.slice(0, 4).map(pic => {
            let errorIcon = 'restaurant';
            if (pic.cat === 'hotel') errorIcon = 'hotel';
            if (pic.cat === 'wisata') errorIcon = 'landscape';
            
            return `
                <div style="position:relative; border-radius:12px; overflow:hidden; border:1px solid var(--slate-200); aspect-ratio:4/3; background:var(--slate-50);" title="${pic.name}">
                    <img src="${pic.picPath}" alt="${escapeHtmlAttr(pic.name)}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s;" onerror="handleImgErrorRecom(this, '${errorIcon}')" />
                    <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding:8px; color:#fff;">
                        <span style="font-size:9px; font-weight:700; text-transform:uppercase; color:var(--teal-400); display:block; letter-spacing:0.5px;">${pic.label}</span>
                        <span style="font-size:11px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; margin-top:1px;">${pic.name}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Build accommodation cost breakdown HTML
        let accommodationBreakdownHTML = '';
        if (pkg.duration > 1 && pkg.hotel_nama && pkg.hotel_nama !== 'Tanpa Akomodasi (One Day Trip)') {
            accommodationBreakdownHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:1px dashed var(--slate-200);">
                    <div>
                        <strong style="font-size:13.5px; color:var(--slate-700); display:block;">🏨 Akomodasi Hotel</strong>
                        <span style="font-size:11.5px; color:var(--slate-400); font-weight:600;">
                            ${pkg.nights} malam × ${pkg.num_rooms} kamar
                        </span>
                    </div>
                    <div style="text-align:right;">
                        <strong style="font-size:14.5px; color:var(--slate-800);">${fmtRp(pkg.cost_akomodasi)}</strong>
                        <span style="font-size:11px; color:var(--slate-400); display:block;">@ ${fmtRp(pkg.hotel_harga)}/malam</span>
                    </div>
                </div>
            `;
        }

        // Calculate meals count
        const mealsCount = pkg.duration === 1 ? 2 : (3 * (pkg.duration - 1) + 2);

        // Build daily timeline cards
        const timelineHTML = (pkg.itinerary || []).map(day => {
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

        // Put everything together
        body.innerHTML = `
            <div class="pkg-detail-premium" style="font-family:'Manrope', sans-serif; color:var(--slate-800); text-align:left;">
                <!-- 1. Header Banner -->
                <div style="background:linear-gradient(135deg, var(--teal-700), var(--teal-900)); color:#fff; padding:24px; border-radius:16px; margin-bottom:24px; position:relative; overflow:hidden; box-shadow:0 10px 25px rgba(13,148,136,0.15);">
                    <div style="position:relative; z-index:10;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:30px;">
                                Paket ${pkg.kategori || 'Hemat'}
                            </span>
                            <span style="font-size:12px; font-weight:700; opacity:0.9;">
                                👥 ${pkg.num_persons} Peserta · 📅 ${pkg.duration} Hari
                            </span>
                        </div>
                        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:#fff; letter-spacing:-0.5px;">Rencana Perjalanan Cerdas FCM</h2>
                        <p style="margin:0; font-size:13px; opacity:0.85; font-weight:500;">
                            Kombinasi destinasi, penginapan, dan kuliner terklaster dengan jarak spasial terpendek.
                        </p>
                    </div>
                    <div style="position:absolute; right:-50px; bottom:-50px; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,0.08); z-index:1;"></div>
                </div>

                <!-- 2. Visual Gallery of the Package (Gambar Tempat) -->
                <div style="margin-bottom:24px;">
                    <h4 style="font-size:14.5px; font-weight:800; color:var(--slate-800); margin:0 0 12px; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">gallery_thumbnail</span>
                        Galeri Destinasi & Akomodasi Pilihan
                    </h4>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
                        ${imagesGridHTML}
                    </div>
                </div>

                <!-- 3. Rincian Anggaran (Semua Hitungannya) -->
                <div style="background:var(--slate-50); border:1.5px solid var(--slate-200); border-radius:16px; padding:18px; margin-bottom:24px;">
                    <h4 style="font-size:14.5px; font-weight:800; color:var(--slate-800); margin:0 0 14px; display:flex; align-items:center; gap:8px; border-bottom:1.5px solid var(--slate-200); padding-bottom:8px;">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">receipt_long</span>
                        Kalkulasi Transparan & Rincian Biaya Paket
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${accommodationBreakdownHTML}
                        
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:1px dashed var(--slate-200);">
                            <div>
                                <strong style="font-size:13.5px; color:var(--slate-700); display:block;">🌲 Tiket Masuk Wisata</strong>
                                <span style="font-size:11.5px; color:var(--slate-400); font-weight:600;">
                                    1x Tiket Hari 1 (sesuai rumus skripsi) × ${pkg.num_persons} orang
                                </span>
                            </div>
                            <div style="text-align:right;">
                                <strong style="font-size:14.5px; color:var(--slate-800);">${fmtRp(pkg.cost_wisata)}</strong>
                                <span style="font-size:11px; color:var(--slate-400); display:block;">@ ${fmtRp(pkg.wisata_harga)}/org</span>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:1px dashed var(--slate-200);">
                            <div>
                                <strong style="font-size:13.5px; color:var(--slate-700); display:block;">🍜 Konsumsi & Kuliner</strong>
                                <span style="font-size:11.5px; color:var(--slate-400); font-weight:600;">
                                    Makan ${pkg.num_persons} orang × ${mealsCount} porsi makan
                                </span>
                            </div>
                            <div style="text-align:right;">
                                <strong style="font-size:14.5px; color:var(--slate-800);">${fmtRp(pkg.cost_kuliner)}</strong>
                                <span style="font-size:11px; color:var(--slate-400); display:block;">Pagi, siang, malam</span>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; border-bottom:1px dashed var(--slate-200);">
                            <div>
                                <strong style="font-size:13.5px; color:var(--slate-700); display:block;">🚗 Transportasi Darat</strong>
                                <span style="font-size:11.5px; color:var(--slate-400); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; display:block;">
                                    ${pkg.transport_detail?.legs?.[0]?.vehicle || 'Otomatis'}
                                </span>
                            </div>
                            <div style="text-align:right;">
                                <strong style="font-size:14.5px; color:var(--slate-800);">${fmtRp(pkg.cost_transport)}</strong>
                                <span style="font-size:11px; color:var(--slate-400); display:block;">
                                    📏 ${pkg.transport_detail?.total_distance_km?.toFixed(1) || '?'} km
                                </span>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:12px; border-top:2px solid var(--slate-300);">
                            <strong style="font-size:14.5px; color:var(--slate-800);">Total Estimasi Gabungan:</strong>
                            <strong style="font-size:18px; color:var(--teal-700); font-weight:900;">${fmtRp(pkg.total_cost)}</strong>
                        </div>
                    </div>
                </div>

                <!-- 4. Google Maps Route Embed (Potongan Rute) -->
                <div style="margin-bottom:24px;">
                    <h4 style="font-size:14.5px; font-weight:800; color:var(--slate-800); margin:0 0 12px; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">map</span>
                        Potongan Peta Rute Perjalanan Spasial
                    </h4>
                    <div style="width:100%; height:260px; border-radius:14px; overflow:hidden; border:1px solid var(--slate-200); box-shadow:0 4px 12px rgba(0,0,0,0.05); background:var(--slate-100);">
                        <iframe 
                            src="${mapEmbedUrl}"
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="lazy">
                        </iframe>
                    </div>
                </div>

                <!-- 5. Day-by-Day Timeline -->
                <div style="margin-bottom:24px;">
                    <h4 style="font-size:14.5px; font-weight:800; color:var(--slate-800); margin:0 0 12px; display:flex; align-items:center; gap:8px;">
                        <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:20px;">calendar_today</span>
                        Rencana Perjalanan Harian
                    </h4>
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${timelineHTML}
                    </div>
                </div>

                <!-- 6. Action Button (Google Maps Redirect) -->
                <div style="margin-top:20px; border-top:1.5px solid var(--slate-100); padding-top:20px; display:flex; gap:12px;">
                    <a href="${mapsUrl}" target="_blank" class="gmaps-btn" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--teal-600); color:#fff; text-decoration:none; padding:14px; border-radius:12px; font-weight:800; text-align:center; box-shadow:0 4px 12px rgba(13,148,136,0.25); transition:all 0.2s;">
                        <span class="material-symbols-outlined">map</span>
                        Navigasi Rute di Google Maps
                    </a>
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

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
            showError('Koneksi ke server gagal. Pastikan PHP artisan serve berjalan.');
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
    let bookmarkList = JSON.parse(localStorage.getItem('mraya_bookmarks') || '[]');
    let selectedHotel = null;
    let selectedHotelsByNight = {};
    let selectedDays = {};
    let showingAllAlternatives = {};
    let showingAllAIAlternatives = false;
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

                // Urutkan ulang: opsi yang aman budget-nya ditaruh di atas, yang over budget dilempar ke bawah
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
                    localStorage.setItem('mraya_bookmarks', JSON.stringify(bookmarkList));
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

    // Modal view for saved plan details
    function openBookmarkedPlanDetails(plan) {
        const modal = document.getElementById('route-modal');
        const body = document.getElementById('modal-body-content');
        if (!modal || !body) return;

        let html = `
            <div style="text-align:left;">
                <div style="background:rgba(13,148,136,0.08); border:1.5px solid rgba(13,148,136,0.15); border-radius:16px; padding:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:var(--slate-800);">${plan.title}</h4>
                        <span style="font-size:12px; color:var(--slate-500); font-weight:600;">👥 ${plan.persons} Orang | 📅 ${plan.duration} Hari</span>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <span style="font-size:10px; color:var(--slate-400); font-weight:800; display:block; letter-spacing:0.5px;">ESTIMASI GABUNGAN</span>
                        <strong style="font-size:18px; color:var(--teal-700); font-weight:900;">${fmtRp(plan.totalCost)}</strong>
                    </div>
                </div>
        `;

        // Render Hotel same mode
        if (plan.hotelMode === 'same' || !plan.hotelMode) {
            if (plan.hotel) {
                const hFolder = plan.hotel.nama.trim().replace(/ /g, '_');
                html += `
                    <div style="font-weight: 800; font-size: 14.5px; color: var(--slate-800); margin-bottom: 12px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 6px;">🏨 Akomodasi Terpilih (Satu Hotel)</div>
                    <div class="pkg-item" style="margin-bottom:20px; border:1px solid var(--slate-200); border-radius:12px; padding:12px; display:flex; gap:12px; align-items:center; background:#fff;">
                        <div class="pkg-item-icon hotel-img-container" style="position:relative; overflow:hidden; width:80px; height:60px; border-radius:8px; flex-shrink:0;">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${plan.hotel.nama}" class="pkg-thumb-img" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="pkg-item-info">
                            <div class="pkg-item-cat" style="font-size:11px; font-weight:700; color:var(--teal-600); margin-bottom:2px;">Hotel / Homestay (${plan.hotel.className.toUpperCase()})</div>
                            <div class="pkg-item-name" style="font-weight:800; font-size:13.5px; color:var(--slate-800);">${plan.hotel.nama}</div>
                            <div class="pkg-item-price" style="font-size:12px; color:var(--slate-500); font-weight:600;">${fmtRp(plan.hotel.harga)} <span style="font-size:10px;color:var(--slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Render split hotels night by night
            html += `<div style="font-weight: 800; font-size: 14.5px; color: var(--slate-800); margin-bottom: 12px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 6px;">🏨 Akomodasi Terpilih (Split Malam)</div>`;
            const nightKeys = Object.keys(plan.hotelsByNight || {});
            nightKeys.forEach(n => {
                const hot = plan.hotelsByNight[n];
                const hFolder = hot.nama.trim().replace(/ /g, '_');
                html += `
                    <div class="pkg-item" style="margin-bottom:10px; border:1px solid var(--slate-200); border-radius:12px; padding:10px; display:flex; gap:12px; align-items:center; background:#fff;">
                        <div class="pkg-item-icon hotel-img-container" style="position:relative; overflow:hidden; width:64px; height:48px; border-radius:6px; flex-shrink:0;">
                            <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${hot.nama}" class="pkg-thumb-img" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'hotel')" />
                        </div>
                        <div class="pkg-item-info">
                            <div class="pkg-item-cat" style="font-size:10px; font-weight:700; color:var(--teal-600); margin-bottom:2px;">Hotel Malam ${n} (${hot.className.toUpperCase()})</div>
                            <div class="pkg-item-name" style="font-weight:800; font-size:12.5px; color:var(--slate-800);">${hot.nama}</div>
                            <div class="pkg-item-price" style="font-size:11.5px; color:var(--slate-500); font-weight:600;">${fmtRp(hot.harga)} <span style="font-size:9.5px;color:var(--slate-400)">/malam</span></div>
                        </div>
                    </div>
                `;
            });
        }

        html += `<div style="font-weight: 800; font-size: 14.5px; color: var(--slate-800); margin: 20px 0 12px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 6px;">📅 Rencana Perjalanan Harian</div>`;
        html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:24px;">`;

        plan.days.forEach((day, dIdx) => {
            html += `
                <div style="background:var(--slate-50); border:1.5px solid var(--slate-200); border-radius:14px; padding:14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:11px; font-weight:800; color:var(--teal-600); letter-spacing:0.5px; text-transform:uppercase;">HARI ${day.day}</span>
                        <span class="pkg-badge ${day.className}" style="font-size:9.5px; padding:2px 8px; border-radius:10px; font-weight:800;">${day.className.toUpperCase()}</span>
                    </div>
                    <div style="font-size:14px; font-weight:800; color:var(--slate-800); margin-bottom:4px;">🌲 Wisata: ${day.wisata}</div>
                    <div style="font-size:12.5px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">☀️ Makan Siang: ${day.kuliner} <span style="font-size:11px; color:var(--slate-400);">(${fmtRp(day.kuliner_harga || 0)})</span></div>
                    <div style="font-size:12.5px; font-weight:600; color:var(--slate-500); margin-bottom:6px;">🌙 Makan Malam: ${day.kuliner_malam || 'N/A'} <span style="font-size:11px; color:var(--slate-400);">(${fmtRp(day.kuliner_malam_harga || 0)})</span></div>
            `;

            // If the plan has exact leg distances calculated
            if (plan.legs && plan.legs.length > 0) {
                const isOneDay = plan.duration === 1;
                const legsPerDay = isOneDay ? 2 : 4;
                const dayLegs = plan.legs.slice(dIdx * legsPerDay, dIdx * legsPerDay + legsPerDay);
                if (dayLegs.length > 0) {
                    html += `
                        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--slate-200);">
                            <div style="font-size:10px; font-weight:800; color:var(--slate-400); margin-bottom:4px; letter-spacing:0.5px;">RUTE SPASIAL HARIAN:</div>
                    `;
                    dayLegs.forEach(leg => {
                        html += `
                            <div class="recap-dist-row">
                                <span class="material-symbols-outlined">directions_car</span>
                                <span style="font-size:11.5px; font-weight:600; color:var(--slate-600);">${leg.from} → ${leg.to} <strong style="color:var(--teal-600); margin-left:4px;">(${leg.distance?.toFixed(1) || '?'} km)</strong></span>
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
                <div class="success-splash-content">
                    <div class="success-splash-icon">
                        <span class="material-symbols-outlined">auto_awesome</span>
                    </div>
                    <h3 style="margin:0 0 10px; font-size:20px; font-weight:900; color:var(--slate-800);">Rencana Perjalanan Disimpan!</h3>
                    <p style="margin:0 0 24px; font-size:13.5px; color:var(--slate-500); line-height:1.5;">Perjalanan impian Anda telah berhasil dirancang secara kustom dan disimpan ke menu Rencana Saya.</p>
                    <button class="finalize-btn" id="close-splash-btn" style="background:var(--teal-600); box-shadow:0 4px 12px rgba(13,148,136,0.2);">
                        Buka Rencana Saya
                    </button>
                </div>
            `;
            document.body.appendChild(splash);
        }

        splash.classList.add('show');

        document.getElementById('close-splash-btn')?.addEventListener('click', () => {
            splash.classList.remove('show');
            // Auto open bookmark drawer
            document.getElementById('bookmark-drawer')?.classList.add('open');
            document.getElementById('bookmark-drawer-overlay')?.classList.add('open');
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
        modal.style = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(8px);
            z-index: 110000;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.25s ease;
            font-family: 'Manrope', sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: #fff;
                border-radius: 24px;
                padding: 28px 24px;
                width: 90%;
                max-width: 420px;
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
                transform: scale(0.9) translateY(10px);
                transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex; flex-direction: column; gap: 16px;
            ">
                <div style="display: flex; align-items: center; gap: 12px; color: var(--teal-600);">
                    <span class="material-symbols-outlined" style="font-size: 32px; background: rgba(13,148,136,0.1); padding: 8px; border-radius: 50%;">spatial_tracking</span>
                    <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--slate-800);">${title}</h4>
                </div>
                <div style="font-size: 13.5px; color: var(--slate-600); line-height: 1.6; font-weight: 600; background: var(--slate-50); padding: 16px; border-radius: 12px; border: 1.5px solid var(--slate-150);">
                    ${message}
                </div>
                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button id="spatial-cancel-btn" style="
                        flex: 1; padding: 12px; border-radius: 12px; border: 1.5px solid var(--slate-200);
                        background: #fff; color: var(--slate-600); font-weight: 750; cursor: pointer; font-size: 13px;
                        transition: all 0.2s;
                    ">Batal</button>
                    <button id="spatial-confirm-btn" style="
                        flex: 1; padding: 12px; border-radius: 12px; border: none;
                        background: linear-gradient(135deg, var(--teal-500), var(--teal-700)); color: #fff;
                        font-weight: 800; cursor: pointer; font-size: 13px;
                        box-shadow: 0 4px 15px rgba(13,148,136,0.3);
                        transition: all 0.2s;
                    ">Konfirmasi</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('div').style.transform = 'scale(1) translateY(0)';
        }, 10);

        const closeModal = () => {
            modal.style.opacity = '0';
            modal.querySelector('div').style.transform = 'scale(0.9) translateY(10px)';
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
                            className: ['hemat', 'balanced', 'premium'][classIdx],
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
                                className: ['hemat', 'balanced', 'premium'][classIdx],
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
                                className: ['hemat', 'balanced', 'premium'][classIdx],
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
                                className: ['hemat', 'balanced', 'premium'][classIdx],
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
                                className: ['hemat', 'balanced', 'premium'][classIdx],
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
        const classNames = ['hemat', 'balanced', 'premium'];
        const classLabels = ['HEMAT', 'BALANCED', 'PREMIUM'];

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
                    if (dNum === 1) {
                        optTotalWisataCost += dayPlan.wisata_harga * persons;
                    }
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
                <div class="hotel-mode-toggle-wrap" style="margin-bottom: 20px; background: var(--slate-100); padding: 4px; border-radius: 12px; display: inline-flex; gap: 4px;">
                    <button class="hotel-mode-btn ${hotelMode === 'same' ? 'active' : ''}" data-mode="same" style="border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${hotelMode === 'same' ? '#fff' : 'transparent'}; color: ${hotelMode === 'same' ? 'var(--teal-600)' : 'var(--slate-500)'}; box-shadow: ${hotelMode === 'same' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'};">
                        Satu Hotel (Sama)
                    </button>
                    <button class="hotel-mode-btn ${hotelMode === 'split' ? 'active' : ''}" data-mode="split" style="border: none; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: ${hotelMode === 'split' ? '#fff' : 'transparent'}; color: ${hotelMode === 'split' ? 'var(--teal-600)' : 'var(--slate-500)'}; box-shadow: ${hotelMode === 'split' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'};">
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
                let cardStyle = "position:relative; overflow:visible !important;";
                if (chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx) {
                    cardStyle += " opacity: 0.25; filter: grayscale(95%) blur(1.5px); pointer-events: none; transition: all 0.3s;";
                }

                const predictedCost = predictTotalCostForOption('hotel', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''}" data-type="hotel" data-idx="${idx}" style="${cardStyle}">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo" style="position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; padding: 6px 12px; font-size: 10.5px; font-weight: 850; border-radius: 30px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); z-index: 99; display: flex; align-items: center; gap: 4px; border: 1.5px solid #fff; letter-spacing: 0.5px;">
                            <span class="material-symbols-outlined" style="font-size: 13px; font-weight: 800;">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Akomodasi</span>
                        </div>
                        <div class="pkg-body" style="padding:16px; display:flex; flex-direction:column; gap:12px; height: calc(100% - 40px);">
                            <div class="hotel-img-container shadow-sm" style="position:relative; overflow:hidden; height:100px; border-radius:8px;">
                                <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(pkg.hotel_nama)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                            </div>
                            
                            <!-- Hotel Dropdown Selector -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🏨 Pilih Hotel Alternatif:</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 12px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-type="hotel" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 12px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    `}
                                </div>
                            </div>

                            <div class="custom-card-divider" style="margin: 8px 0;"></div>
                            
                            <div class="custom-card-meta-simple" style="font-size:11px; gap:4px; margin-top:auto;">
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
                                <div class="meta-row highlight" style="margin-top:2px; padding-top:6px;">
                                    <span class="text-teal" style="font-weight:750;">Total Akomodasi:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(pkg.cost_akomodasi)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn" style="margin-top:12px; padding:10px; font-size:12px; background: var(--slate-800); border-color: var(--slate-800);" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
                                <button class="finalize-btn select-option-btn" style="padding:10px; font-size:12px;" data-type="hotel" data-idx="${idx}">
                                    ${isSelected ? 'Akomodasi Terpilih' : 'Konfirmasi Akomodasi & Lanjutkan'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn" style="padding:8px; font-size:12px; background:transparent; border:1.5px solid var(--slate-300); color:var(--slate-600);" data-idx="${idx}">
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
                let cardStyle = "position:relative; overflow:visible !important;";
                if (chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx) {
                    cardStyle += " opacity: 0.25; filter: grayscale(95%) blur(1.5px); pointer-events: none; transition: all 0.3s;";
                }

                const predictedCost = predictTotalCostForOption('split-hotel', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''}" data-type="split-hotel" data-idx="${idx}" style="${cardStyle}">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo" style="position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; padding: 6px 12px; font-size: 10.5px; font-weight: 850; border-radius: 30px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); z-index: 99; display: flex; align-items: center; gap: 4px; border: 1.5px solid #fff; letter-spacing: 0.5px;">
                            <span class="material-symbols-outlined" style="font-size: 13px; font-weight: 800;">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Malam ${nightNum}</span>
                        </div>
                        <div class="pkg-body" style="padding:16px; display:flex; flex-direction:column; gap:12px; height: calc(100% - 40px);">
                            <div class="hotel-img-container shadow-sm" style="position:relative; overflow:hidden; height:100px; border-radius:8px;">
                                <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" alt="${escapeHtmlAttr(pkg.hotel_nama)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'hotel')" />
                            </div>
                            
                            <!-- Split Hotel Dropdown Selector -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🏨 Pilih Hotel Alternatif:</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 12px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-night="${nightNum}"
                                         data-type="split-hotel" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 12px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${pkg.hotel_nama_real || pkg.hotel_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    `}
                                </div>
                            </div>

                            <div class="custom-card-divider" style="margin: 8px 0;"></div>
                            
                            <div class="custom-card-meta-simple" style="font-size:11px; gap:4px; margin-top:auto;">
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
                                <div class="meta-row highlight" style="margin-top:2px; padding-top:6px;">
                                    <span class="text-teal" style="font-weight:750;">Total Malam Ini:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(pkg.hotel_harga * pkg.num_rooms)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn" style="margin-top:12px; padding:10px; font-size:12px; background: var(--slate-800); border-color: var(--slate-800);" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
                                <button class="finalize-btn select-option-btn" style="padding:10px; font-size:12px;" data-type="split-hotel" data-idx="${idx}">
                                    ${isSelected ? 'Akomodasi Terpilih' : 'Pilih Akomodasi Ini'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn" style="padding:8px; font-size:12px; background:transparent; border:1.5px solid var(--slate-300); color:var(--slate-600);" data-idx="${idx}">
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

                let legsHTML = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--slate-200); font-size: 10px; color: var(--slate-500); display: flex; flex-direction: column; gap: 4px;">`;
                let dayTransportCost = 0;
                cardLegs.forEach(leg => {
                    const cost = Math.round(leg.dist * ratePerKm);
                    dayTransportCost += cost;
                    legsHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${leg.from} → ${leg.to} (${leg.dist.toFixed(1)} km)</span>
                            <span style="font-weight: 600; color: var(--slate-600);">${fmtRp(cost)}</span>
                        </div>
                    `;
                });
                legsHTML += `</div>`;
                const dayTotal = dayWisataCost + dayKulinerCost + dayTransportCost;

                const wisataAlts = getWisataAlternativesForTier(classIdx, d);
                const kulinerAlts = getKulinerAlternativesForTier(classIdx, d);

                // Handle visual locking of non-selected package cards
                let cardStyle = "position:relative; overflow:visible !important;";
                if (chosenStepPackageIdx !== null && idx !== chosenStepPackageIdx) {
                    cardStyle += " opacity: 0.25; filter: grayscale(95%) blur(1.5px); pointer-events: none; transition: all 0.3s;";
                }

                const predictedCost = predictTotalCostForOption('day', idx, curStepDef);
                const isOptionOverBudget = hasBudget && predictedCost > budgetLimit;

                optionsHTML += `
                    <div class="pkg-card interactive-card ${cls} ${isSelected ? 'selected' : ''}" data-type="day" data-idx="${idx}" style="${cardStyle}">
                        <div class="selected-overlay"><span class="material-symbols-outlined">check</span></div>
                        ${isOptionOverBudget ? `
                        <div class="over-budget-badge-promo" style="position: absolute; top: -10px; right: -10px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; padding: 6px 12px; font-size: 10.5px; font-weight: 850; border-radius: 30px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); z-index: 99; display: flex; align-items: center; gap: 4px; border: 1.5px solid #fff; letter-spacing: 0.5px;">
                            <span class="material-symbols-outlined" style="font-size: 13px; font-weight: 800;">warning</span>
                            <span>OVER BUDGET</span>
                        </div>
                        ` : ''}
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Hari ${d}</span>
                        </div>
                        <div class="pkg-body" style="padding:16px; display:flex; flex-direction:column; gap:12px; height: calc(100% - 40px);">
                            <div style="display:flex; gap:8px;">
                                <div class="wisata-img-container shadow-sm" style="position:relative; overflow:hidden; height:80px; flex:1; border-radius:8px;">
                                    <img src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" alt="${escapeHtmlAttr(dayItin.wisata)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'landscape')" style="width:100%; height:100%; object-fit:cover;" />
                                </div>
                                <div class="kuliner-img-container shadow-sm" style="position:relative; overflow:hidden; height:80px; flex:1; border-radius:8px;">
                                    <img src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" alt="${escapeHtmlAttr(dayItin.kuliner)}" class="pkg-thumb-img" onerror="handleImgErrorRecom(this, 'restaurant')" style="width:100%; height:100%; object-fit:cover;" />
                                </div>
                            </div>
                            
                            <!-- Wisata Dropdown Split -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🌲 Pilih Wisata:</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.wisata || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : (activeWorkflow === 'destination' && d === 1) ? `
                                    <div class="custom-select-trigger-locked" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: var(--slate-100); color: var(--slate-500); cursor: not-allowed; user-select: none;"
                                         title="Dikunci dari input pencarian destinasi awal">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px); font-weight: 600;">🔒 ${dayItin.wisata || ''} (Locked)</span>
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--slate-400);">lock</span>
                                    </div>
                                    ` : `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="wisata" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.wisata || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    `}
                                </div>
                            </div>

                            <!-- Kuliner Pagi Dropdown Split -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">☕ Pilih Kuliner Pagi (Sarapan):</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner_pagi || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner_pagi" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner_pagi || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px dashed var(--slate-300); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px); font-weight: 600; color: var(--slate-450);">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>

                            <!-- Kuliner Dropdown Split -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🍜 Pilih Kuliner Siang:</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px dashed var(--slate-300); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px); font-weight: 600; color: var(--slate-450);">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>
                            
                            <!-- Kuliner Malam Dropdown Split -->
                            ${(!isCheckoutOrODT) ? `
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🌙 Pilih Kuliner Malam:</label>
                                <div class="custom-select-wrapper" style="position: relative;">
                                    ${chosenStepPackageIdx === null ? `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih paket terlebih dahulu untuk merancang">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner_malam || dayItin.kuliner_malam_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    ` : (stepWisataSelected[d] || (activeWorkflow === 'destination' && d === 1)) ? `
                                    <div class="custom-select-trigger" 
                                         data-class-idx="${idx}" 
                                         data-day="${d}"
                                         data-type="kuliner_malam" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; background: #fff; cursor: pointer; user-select: none;">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px);">${dayItin.kuliner_malam || dayItin.kuliner_malam_nama || ''}</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-400);">unfold_more</span>
                                    </div>
                                    <div class="custom-search-select-dropdown" style="
                                        position: absolute;
                                        top: 100%; left: 0; right: 0;
                                        background: rgba(255, 255, 255, 0.98);
                                        backdrop-filter: blur(20px);
                                        -webkit-backdrop-filter: blur(20px);
                                        border: 1px solid rgba(0, 101, 101, 0.15);
                                        border-radius: 12px;
                                        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                        z-index: 1000;
                                        max-height: 250px;
                                        overflow-y: auto;
                                        display: none;
                                        margin-top: 4px;
                                    "></div>
                                    ` : `
                                    <div class="custom-select-trigger-inactive" 
                                         style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1.5px dashed var(--slate-300); border-radius: 8px; font-size: 11.5px; background: var(--slate-50); color: var(--slate-400); cursor: not-allowed; user-select: none;"
                                         title="Pilih wisata terlebih dahulu untuk membuka kuliner">
                                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 20px); font-weight: 600; color: var(--slate-450);">🔒 Pilih Wisata Terlebih Dahulu</span>
                                        <span class="material-symbols-outlined select-arrow" style="font-size: 16px; color: var(--slate-300);">lock</span>
                                    </div>
                                    `}
                                </div>
                            </div>
                            ` : ''}

                            <div class="custom-card-divider" style="margin: 8px 0;"></div>
                            
                            <div class="custom-card-meta-simple" style="font-size:11px; gap:4px; margin-top:auto;">
                                <div class="meta-row">
                                    <span>Tiket Wisata:</span>
                                    <span>${fmtRp(dayWisataCost)}</span>
                                </div>
                                <div class="meta-row">
                                    <span>Kuliner (${numMeals}x):</span>
                                    <span>${fmtRp(dayKulinerCost)}</span>
                                </div>
                                <div class="meta-row" title="${vehDesc}">
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">Transportasi (${vehDesc.split(' ')[0]}):</span>
                                    <span>${fmtRp(dayTransportCost)}</span>
                                </div>
                                ${legsHTML}
                                <div class="meta-row highlight" style="margin-top:2px; padding-top:6px;">
                                    <span class="text-teal" style="font-weight:750;">Subtotal Hari ${d}:</span>
                                    <strong class="text-teal" style="font-weight:800;">${fmtRp(dayTotal)}</strong>
                                </div>
                            </div>
                            
                            ${chosenStepPackageIdx === null ? `
                            <button class="finalize-btn start-draft-btn" style="margin-top:12px; padding:10px; font-size:12px; background: var(--slate-800); border-color: var(--slate-800);" data-idx="${idx}">
                                Rancang Paket ${label}
                            </button>
                            ` : `
                            <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
                                <button class="finalize-btn select-option-btn" style="padding:10px; font-size:12px;" data-type="day" data-idx="${idx}">
                                    ${isSelected ? 'Rute Terpilih' : 'Pilih Rute Hari Ini'}
                                </button>
                                <button class="finalize-btn cancel-draft-btn" style="padding:8px; font-size:12px; background:transparent; border:1.5px solid var(--slate-300); color:var(--slate-600);" data-idx="${idx}">
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
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d1 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d2 });
            } else if (dNum === 1) {
                const d1 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d2 = haversineDist(wLat, wLon, ksLat, ksLon);
                const d3 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                const d4 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                const d5 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                totalDistance += d1 + d2 + d3 + d4 + d5;
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d1 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d2 });
                legs.push({ from: dayPlan.kuliner, to: nextHotel.nama, distance: d3 });
                legs.push({ from: nextHotel.nama, to: dayPlan.kuliner_malam, distance: d4 });
                legs.push({ from: dayPlan.kuliner_malam, to: nextHotel.nama, distance: d5 });
            } else if (dNum === duration) {
                const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                totalDistance += d1 + d2 + d3;
                legs.push({ from: currentHotel.nama, to: dayPlan.kuliner_pagi, distance: d1 });
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d2 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d3 });
            } else {
                const d1 = haversineDist(chLat, chLon, kpLat, kpLon);
                const d2 = haversineDist(kpLat, kpLon, wLat, wLon);
                const d3 = haversineDist(wLat, wLon, ksLat, ksLon);
                const d4 = haversineDist(ksLat, ksLon, nhLat, nhLon);
                const d5 = haversineDist(nhLat, nhLon, kmLat, kmLon);
                const d6 = haversineDist(kmLat, kmLon, nhLat, nhLon);
                totalDistance += d1 + d2 + d3 + d4 + d5 + d6;
                legs.push({ from: currentHotel.nama, to: dayPlan.kuliner_pagi, distance: d1 });
                legs.push({ from: dayPlan.kuliner_pagi, to: dayPlan.wisata, distance: d2 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d3 });
                legs.push({ from: dayPlan.kuliner, to: nextHotel.nama, distance: d4 });
                legs.push({ from: nextHotel.nama, to: dayPlan.kuliner_malam, distance: d5 });
                legs.push({ from: dayPlan.kuliner_malam, to: nextHotel.nama, distance: d6 });
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
                if (dNum === 1) {
                    totalWisataCostVisible = dayPlan.wisata_harga * persons;
                }
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
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${leg.from} → ${leg.to} (${leg.dist.toFixed(1)} km)</span>
                            <span style="font-weight: 600; color: var(--slate-600);">${fmtRp(cost)}</span>
                        </div>
                    `;
                });
                legsHTML += `</div>`;

                // Wisata cost (Day 1 only for final total matching)
                const wisataCost = dayPlan.wisata_harga * persons;
                const wisataCostForSubtotal = (dNum === 1) ? wisataCost : 0;
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
                                <span>• Tiket Wisata (${persons} Orang)${dNum > 1 ? ' <span style="font-size: 8.5px; color:var(--slate-400); font-weight:500;">(Hari 1)</span>' : ''}</span>
                                <span>${fmtRp(dNum === 1 ? wisataCost : 0)}</span>
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
                                <span>• Tiket Wisata (${persons} Orang)${dNum > 1 ? ' <span style="font-size: 8.5px; color:var(--slate-400); font-weight:500;">(Hari 1)</span>' : ''}</span>
                                <span>${fmtRp(dNum === 1 ? wisataCost : 0)}</span>
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
                <div style="font-size:12px; color:var(--slate-400); margin-bottom:12px; font-weight:600;">👥 ${persons} Orang | 📅 ${duration} Hari</div>
                
                <div class="panel-divider" style="margin-bottom: 4px;"></div>
                ${daysSummaryHTML}
                
                <div class="panel-divider"></div>
                <div class="selected-day-row" style="margin-bottom: 4px;">
                    <span>🚗 Transportasi (${vehDesc})</span>
                    <span>${fmtRp(transportCostVisible)}</span>
                </div>
                <div style="font-size:11.5px; color:var(--slate-500); font-weight:700; display:flex; align-items:center; gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:14px;color:var(--teal-600)">route</span>
                    <span>Jarak Spasial: <span style="color:var(--slate-700)">${totalDistanceVisible.toFixed(1)} km</span></span>
                </div>
                
                <div class="panel-divider"></div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:12.5px; font-weight:800; color:var(--slate-750);">ESTIMASI TOTAL</span>
                    <strong style="font-size:18px; font-weight:900; color:var(--teal-700);">${fmtRp(runningCostVisible)}</strong>
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

        // Close searchable suggestions on clicking outside
        document.addEventListener('click', (e) => {
            wizardContainer.querySelectorAll('.custom-search-select-dropdown').forEach(dropdownEl => {
                const triggerEl = dropdownEl.closest('.custom-select-wrapper')?.querySelector('.custom-select-trigger');
                if (dropdownEl && triggerEl && !triggerEl.contains(e.target) && !dropdownEl.contains(e.target)) {
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
                    
                    const ticketCost = (d === 1) ? dayItin.wisata_harga * pkg.num_persons : 0;
                    const mealsCost = ((dayItin.kuliner_pagi_harga || 0) + dayItin.kuliner_harga + (duration > 1 && d < duration ? (dayItin.kuliner_malam_harga || 0) : 0)) * pkg.num_persons;
                    message += `<br>💰 Total HTM & Makan: <strong>${fmtRp(ticketCost + mealsCost)}</strong>`;

                    showSpatialConfirmationModal(title, message, () => {
                        const dayWisataCost = (d === 1) ? dayItin.wisata_harga * pkg.num_persons : 0;
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
            let routeStops = [];
            if (legs && legs.length > 0) {
                const resolvedStops = legs.map(leg => leg.from);
                resolvedStops.push(legs[legs.length - 1].to);
                
                resolvedStops.forEach(name => {
                    const cleanName = name ? name.trim() : "";
                    // Bersihkan duplikat berurutan agar rute Google Maps tidak error
                    if (cleanName && cleanName !== 'N/A' && cleanName !== 'Checkout') {
                        if (routeStops.length === 0 || routeStops[routeStops.length - 1] !== cleanName) {
                            routeStops.push(cleanName);
                        }
                    }
                });
            }

            if (routeStops.length >= 2) {
                const originSearch = routeStops[0];
                const destName = routeStops[routeStops.length - 1];
                const waypointsNames = routeStops.slice(1, -1).join('|');
                
                let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originSearch)}&destination=${encodeURIComponent(destName)}`;
                if (waypointsNames) {
                    mapsUrl += `&waypoints=${encodeURIComponent(waypointsNames)}`;
                }
                mapsUrl += `&travelmode=driving`;
                window.open(mapsUrl, '_blank');
            } else if (routeStops.length === 1) {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(routeStops[0])}`, '_blank');
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
    function finalizeTravelPlan(totalCost, legs, totalDistance, transportCost, vehDesc) {
        const duration = activeOptionPackages[0].duration;
        const persons = activeOptionPackages[0].num_persons;

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
            totalCost: totalCost,
            hotelMode: hotelMode,
            hotel: selectedHotel ? {
                nama: selectedHotel.nama,
                harga: selectedHotel.harga,
                cost: selectedHotel.cost,
                className: selectedHotel.className
            } : null,
            hotelsByNight: selectedHotelsByNight,
            days: daysArr,
            legs: legs,
            totalDistance: totalDistance,
            transportCost: transportCost,
            vehDesc: vehDesc
        };

        // Add to bookmark list
        bookmarkList.unshift(newPlan);
        localStorage.setItem('mraya_bookmarks', JSON.stringify(bookmarkList));

        // Sync UI
        updateBookmarkUI();

        // Show Confetti Success Splash overlay
        showSuccessSplash();
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