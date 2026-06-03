// ─────────────────────────────────────────────────
// Utilities (Globally accessible)
// ─────────────────────────────────────────────────
const fmtRp = n => {
    if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
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
        } else if (type === 'kuliner') {
            alts = getKulinerAlternativesForTier(classIdx, dayNum);
        }

        let anchorLat = 0, anchorLon = 0, anchorName = '';
        const pkg = activeOptionPackages[classIdx];
        if (!pkg) return;

        const duration = pkg.duration;
        const persons = pkg.num_persons;
        const nights = duration - 1;

        if (type === 'wisata') {
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
                const activeN = selectedHotelsByNight[dayNum];
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
        } else if (type === 'kuliner') {
            const dayPlan = selectedDays[dayNum];
            if (dayPlan) {
                anchorLat = dayPlan.wisata_lat;
                anchorLon = dayPlan.wisata_lon;
                anchorName = dayPlan.wisata;
            } else {
                const dayItin = pkg.itinerary?.find(item => item.day === dayNum);
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

        let visibleAlts = JSON.parse(JSON.stringify(alts));

        visibleAlts.forEach(item => {
            const itemLat = item.lat || item.Latitude || 0;
            const itemLon = item.lon || item.Longitude || 0;
            if (anchorLat && anchorLon && itemLat && itemLon) {
                item.distFromAnchor = haversineDist(anchorLat, anchorLon, itemLat, itemLon);
            } else {
                item.distFromAnchor = 9999;
            }

            // Calculate distance to hotel for kuliner alternatives
            if (type === 'kuliner') {
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
                        const activeN = selectedHotelsByNight[dayNum] || selectedHotelsByNight[dayNum - 1] || null;
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

                // 3. Calculate Kuliner cost
                for (let d = 1; d <= duration; d++) {
                    if (type === 'kuliner' && dayNum === d) {
                        hypKulCost += itemHarga * persons * 3;
                    } else {
                        const dayPlan = selectedDays[d];
                        if (dayPlan) {
                            hypKulCost += dayPlan.kuliner_harga * persons * 3;
                        }
                    }
                }

                // 4. Calculate spatial distance and transport costs
                let hypTotalDistance = 0;
                for (let dNum = 1; dNum <= duration; dNum++) {
                    let dPlan = null;
                    if (dNum === dayNum && (type === 'wisata' || type === 'kuliner')) {
                        const itemLat = item.lat || item.Latitude || 0;
                        const itemLon = item.lon || item.Longitude || 0;
                        const activeD = selectedDays[dNum];
                        
                        let dayItin = pkg.itinerary?.find(it => it.day === dayNum) || {
                            wisata: pkg.wisata_nama,
                            wisata_harga: pkg.wisata_harga,
                            wisata_lat: pkg.wisata_lat || 0,
                            wisata_lon: pkg.wisata_lon || 0,
                            kuliner: pkg.kuliner_nama,
                            kuliner_harga: pkg.kuliner_harga,
                            kuliner_lat: pkg.kuliner_lat || 0,
                            kuliner_lon: pkg.kuliner_lon || 0
                        };

                        dPlan = {
                            wisata_lat: type === 'wisata' ? itemLat : (activeD ? activeD.wisata_lat : (dayItin.wisata_lat || pkg.wisata_lat || 0)),
                            wisata_lon: type === 'wisata' ? itemLon : (activeD ? activeD.wisata_lon : (dayItin.wisata_lon || pkg.wisata_lon || 0)),
                            kuliner_lat: type === 'kuliner' ? itemLat : (activeD ? activeD.kuliner_lat : (dayItin.kuliner_lat || pkg.kuliner_lat || 0)),
                            kuliner_lon: type === 'kuliner' ? itemLon : (activeD ? activeD.kuliner_lon : (dayItin.kuliner_lon || pkg.kuliner_lon || 0)),
                        };
                    } else {
                        dPlan = selectedDays[dNum];
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
                                    curHotel = selectedHotel;
                                    nexHotel = selectedHotel;
                                }
                            } else {
                                const getHotelN = (n) => {
                                    if (type === 'split-hotel' && nightNum === n) return item;
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
                            hypTotalDistance += d1 * 2;
                        } else {
                            const d1 = haversineDist(chLat, chLon, dPlan.wisata_lat, dPlan.wisata_lon);
                            const d2 = haversineDist(dPlan.wisata_lat, dPlan.wisata_lon, dPlan.kuliner_lat, dPlan.kuliner_lon);
                            const d3 = haversineDist(dPlan.kuliner_lat, dPlan.kuliner_lon, nhLat, nhLon);
                            hypTotalDistance += d1 + d2 + d3;
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
            if (item.distFromAnchor && item.distFromAnchor !== 9999) {
                if (type === 'wisata') {
                    distSuffix = `${item.distFromAnchor.toFixed(1)} km dari Hotel`;
                } else if (type === 'kuliner') {
                    if (item.distToHotel) {
                        distSuffix = `${item.distFromAnchor.toFixed(1)} km dari Wisata & ${item.distToHotel.toFixed(1)} km ke Hotel`;
                    } else {
                        distSuffix = `${item.distFromAnchor.toFixed(1)} km dari Wisata`;
                    }
                } else {
                    distSuffix = `${item.distFromAnchor.toFixed(1)} km`;
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

                    if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                        selectedDays[dayNum].wisata = chosen.nama;
                        selectedDays[dayNum].wisata_harga = chosen.harga;
                        selectedDays[dayNum].wisata_lat = chosen.lat;
                        selectedDays[dayNum].wisata_lon = chosen.lon;

                        const dayWisataCost = (dayNum === 1) ? chosen.harga * activeOptionPackages[0].num_persons : 0;
                        const dayKulinerCost = selectedDays[dayNum].kuliner_harga * activeOptionPackages[0].num_persons * 3;
                        const dayTransportCost = activeOptionPackages[classIdx].cost_transport / activeOptionPackages[0].duration;
                        selectedDays[dayNum].cost = dayWisataCost + dayKulinerCost + dayTransportCost;
                    }
                    renderPlannerStep();
                },
                () => {
                    const dayItin = activeOptionPackages[classIdx].itinerary.find(item => item.day === dayNum);
                    if (spanEl) spanEl.textContent = dayItin ? dayItin.wisata : pkg.wisata_nama;
                }
            );
        } else if (type === 'kuliner') {
            let dayItin = activeOptionPackages[classIdx].itinerary.find(item => item.day === dayNum);
            if (!dayItin) {
                dayItin = { day: dayNum };
                activeOptionPackages[classIdx].itinerary.push(dayItin);
            }
            dayItin.kuliner = chosen.nama;
            dayItin.kuliner_harga = chosen.harga;
            dayItin.kuliner_lat = chosen.lat;
            dayItin.kuliner_lon = chosen.lon;

            if (selectedDays[dayNum] && selectedDays[dayNum].classIdx == classIdx) {
                selectedDays[dayNum].kuliner = chosen.nama;
                selectedDays[dayNum].kuliner_harga = chosen.harga;
                selectedDays[dayNum].kuliner_lat = chosen.lat;
                selectedDays[dayNum].kuliner_lon = chosen.lon;

                const dayWisataCost = (dayNum === 1) ? selectedDays[dayNum].wisata_harga * activeOptionPackages[0].num_persons : 0;
                const dayKulinerCost = chosen.harga * activeOptionPackages[0].num_persons * 3;
                const dayTransportCost = activeOptionPackages[classIdx].cost_transport / activeOptionPackages[0].duration;
                selectedDays[dayNum].cost = dayWisataCost + dayKulinerCost + dayTransportCost;
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
        minus.addEventListener('click', () => { if (+inp.value > min) inp.value = +inp.value - 1; onBudgetChange(); });
        plus.addEventListener('click', () => { inp.value = +inp.value + 1; onBudgetChange(); });
        inp.addEventListener('change', onBudgetChange);
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
    function calculateScaledMinBudget(persons, duration) {
        let ratePerKm = 2250;
        if (persons > 4) {
            ratePerKm = 6000;
        } else if (persons > 1) {
            ratePerKm = 5150;
        }

        const minHotel = duration > 1 ? 170000 * (duration - 1) * Math.ceil(persons / 2) : 0;
        const minWisata = 10000 * persons;
        const minKuliner = 13250 * persons * 3 * duration;
        const minTransport = Math.round(2.5 * ratePerKm * duration);

        // Return the sum of absolute component minimums (actual database cheapest package price)
        return minHotel + minWisata + minKuliner + minTransport;
    }

    function updateBudgetSliders() {
        // --- 1. Tab Budget-First ---
        const bPersons = +document.getElementById('b-persons')?.value || 1;
        const bDuration = +document.getElementById('b-duration')?.value || 1;

        const bMin = calculateScaledMinBudget(bPersons, bDuration);

        // Show/hide b-hotel-mode-group depending on bDuration > 2
        const bHotelGroup = document.getElementById('b-hotel-mode-group');
        if (bHotelGroup) {
            bHotelGroup.style.display = bDuration > 2 ? 'block' : 'none';
        }

        // Dynamic database-aligned max budget limit calculation:
        const bMaxHotel = bDuration > 1 ? 4305000 * (bDuration - 1) * Math.ceil(bPersons / 2) : 0;
        const bMaxWisata = 275000 * bPersons;
        const bMaxKuliner = 150000 * bPersons * 3 * bDuration;
        const bMaxTransport = 300000;
        const bMax = Math.ceil((bMaxHotel + bMaxWisata + bMaxKuliner + bMaxTransport) / 10000) * 10000;

        const bSlider = document.getElementById('b-budget');
        if (bSlider) {
            bSlider.min = bMin;
            bSlider.max = bMax;
            bSlider.step = 10000;

            let curVal = parseInt(bSlider.value) || 1000000;
            if (curVal < bMin) curVal = bMin;
            if (curVal > bMax) curVal = bMax;
            bSlider.value = curVal;

            const valEl = document.getElementById('b-budget-val');
            if (valEl) valEl.textContent = fmtRp(curVal);

            const minLbl = document.getElementById('b-budget-min-label');
            if (minLbl) minLbl.textContent = "Min: " + fmtRp(bMin);

            const maxLbl = document.getElementById('b-budget-max-label');
            if (maxLbl) maxLbl.textContent = "Max: " + fmtRp(bMax);

            const manualInp = document.getElementById('b-budget-manual');
            if (manualInp) {
                if (document.activeElement !== manualInp) {
                    manualInp.value = curVal;
                }
                manualInp.min = bMin;
                manualInp.max = bMax;
            }
        }

        // --- 2. Tab Destination-First ---
        const dPersons = +document.getElementById('d-persons')?.value || 1;
        const dDuration = +document.getElementById('d-duration')?.value || 1;

        const dMin = calculateScaledMinBudget(dPersons, dDuration);

        // Show/hide d-hotel-mode-group depending on dDuration > 2
        const dHotelGroup = document.getElementById('d-hotel-mode-group');
        if (dHotelGroup) {
            dHotelGroup.style.display = dDuration > 2 ? 'block' : 'none';
        }

        const dMaxHotel = dDuration > 1 ? 4305000 * (dDuration - 1) * Math.ceil(dPersons / 2) : 0;
        const dMaxWisata = 275000 * dPersons;
        const dMaxKuliner = 150000 * dPersons * 3 * dDuration;
        const dMaxTransport = 300000;
        const dMax = Math.ceil((dMaxHotel + dMaxWisata + dMaxKuliner + dMaxTransport) / 10000) * 10000;

        const dSlider = document.getElementById('d-budget');
        if (dSlider) {
            // Set slider minimum 1 step below dMin to represent "No Budget"
            const dSliderMin = dMin - 10000;
            dSlider.min = dSliderMin;
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
            if (minLbl) minLbl.textContent = "Tanpa Budget / Min: " + fmtRp(dMin);

            const maxLbl = document.getElementById('d-budget-max-label');
            if (maxLbl) maxLbl.textContent = "Max: " + fmtRp(dMax);

            const manualInp = document.getElementById('d-budget-manual');
            if (manualInp) {
                if (document.activeElement !== manualInp) {
                    manualInp.value = isNoBudget ? "" : curVal;
                }
                manualInp.min = dMin;
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

        const dMin = calculateScaledMinBudget(dPersons, dDuration);

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

            let val = parseInt(e.target.value);
            if (isNaN(val)) return;

            const bPersons = +document.getElementById('b-persons')?.value || 1;
            const bDuration = +document.getElementById('b-duration')?.value || 1;
            const bMin = calculateScaledMinBudget(bPersons, bDuration);

            const bMaxHotel = bDuration > 1 ? 4305000 * (bDuration - 1) * Math.ceil(bPersons / 2) : 0;
            const bMaxWisata = 275000 * bPersons;
            const bMaxKuliner = 150000 * bPersons * 3 * bDuration;
            const bMaxTransport = 300000;
            const bMax = Math.ceil((bMaxHotel + bMaxWisata + bMaxKuliner + bMaxTransport) / 10000) * 10000;

            // Only synchronize to slider and trigger calculation if the value is within range
            if (val >= bMin && val <= bMax) {
                slider.value = val;
                const valEl = document.getElementById('b-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
                onBudgetChange();
            }
        });

        bManual.addEventListener('blur', e => {
            const slider = document.getElementById('b-budget');
            if (!slider) return;

            let val = parseInt(e.target.value);
            if (isNaN(val)) return; // Allow empty

            const bPersons = +document.getElementById('b-persons')?.value || 1;
            const bDuration = +document.getElementById('b-duration')?.value || 1;
            const bMin = calculateScaledMinBudget(bPersons, bDuration);

            const bMaxHotel = bDuration > 1 ? 4305000 * (bDuration - 1) * Math.ceil(bPersons / 2) : 0;
            const bMaxWisata = 275000 * bPersons;
            const bMaxKuliner = 150000 * bPersons * 3 * bDuration;
            const bMaxTransport = 300000;
            const bMax = Math.ceil((bMaxHotel + bMaxWisata + bMaxKuliner + bMaxTransport) / 10000) * 10000;

            if (val > bMax) {
                val = bMax;
                e.target.value = val;
            }

            // Only synchronize slider if >= bMin
            if (val >= bMin) {
                slider.value = val;
                const valEl = document.getElementById('b-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
            }
            onBudgetChange();
        });
    }

    const dManual = document.getElementById('d-budget-manual');
    if (dManual) {
        dManual.addEventListener('input', e => {
            const slider = document.getElementById('d-budget');
            if (!slider) return;

            let val = parseInt(e.target.value);
            if (isNaN(val)) return;

            const dPersons = +document.getElementById('d-persons')?.value || 1;
            const dDuration = +document.getElementById('d-duration')?.value || 1;
            const dMin = calculateScaledMinBudget(dPersons, dDuration);

            const dMaxHotel = dDuration > 1 ? 4305000 * (dDuration - 1) * Math.ceil(dPersons / 2) : 0;
            const dMaxWisata = 275000 * dPersons;
            const dMaxKuliner = 150000 * dPersons * 3 * dDuration;
            const dMaxTransport = 300000;
            const dMax = Math.ceil((dMaxHotel + dMaxWisata + dMaxKuliner + dMaxTransport) / 10000) * 10000;

            // Only synchronize to slider and trigger calculation if the value is within range
            if (val >= dMin && val <= dMax) {
                slider.value = val;
                const valEl = document.getElementById('d-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
                onBudgetChange();
            }
        });

        dManual.addEventListener('blur', e => {
            const slider = document.getElementById('d-budget');
            if (!slider) return;

            let val = parseInt(e.target.value);
            if (isNaN(val)) {
                // Empty means No Budget
                const dPersons = +document.getElementById('d-persons')?.value || 1;
                const dDuration = +document.getElementById('d-duration')?.value || 1;
                const dMin = calculateScaledMinBudget(dPersons, dDuration);
                slider.value = dMin - 10000;
                const valEl = document.getElementById('d-budget-val');
                if (valEl) valEl.textContent = "Tanpa Batasan Anggaran ";
                onBudgetChange();
                return;
            }

            const dPersons = +document.getElementById('d-persons')?.value || 1;
            const dDuration = +document.getElementById('d-duration')?.value || 1;
            const dMin = calculateScaledMinBudget(dPersons, dDuration);

            const dMaxHotel = dDuration > 1 ? 4305000 * (dDuration - 1) * Math.ceil(dPersons / 2) : 0;
            const dMaxWisata = 275000 * dPersons;
            const dMaxKuliner = 150000 * dPersons * 3 * dDuration;
            const dMaxTransport = 300000;
            const dMax = Math.ceil((dMaxHotel + dMaxWisata + dMaxKuliner + dMaxTransport) / 10000) * 10000;

            if (val > dMax) {
                val = dMax;
                e.target.value = val;
            }

            if (val >= dMin) {
                slider.value = val;
                const valEl = document.getElementById('d-budget-val');
                if (valEl) valEl.textContent = fmtRp(val);
            }
            onBudgetChange();
        });
    }

    function getRawBudget(elId) {
        const manual = document.getElementById(elId + '-manual');
        if (manual) {
            const rawText = manual.value.trim();
            if (rawText === "") return 0;
            const manualVal = parseFloat(rawText);
            if (!isNaN(manualVal)) return manualVal;
        }

        const slider = document.getElementById(elId);
        if (!slider) return 0;
        const val = parseFloat(slider.value) || 0;

        if (elId === 'd-budget') {
            const persons = +document.getElementById('d-persons')?.value || 1;
            const duration = +document.getElementById('d-duration')?.value || 1;
            const minBudget = calculateScaledMinBudget(persons, duration);
            if (val < minBudget) return 0; // return 0 for "No Budget"
        }
        return val;
    }

    function checkMinBudget(personsId, durationId, budgetId, warningBoxId) {
        const persons = +document.getElementById(personsId)?.value || 1;
        const duration = +document.getElementById(durationId)?.value || 1;
        const budget = getRawBudget(budgetId);
        const box = document.getElementById(warningBoxId);

        if (!box) return;

        if (budget === 0) {
            box.style.display = 'none';
            return;
        }

        const minBudget = calculateScaledMinBudget(persons, duration);

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

    function onBudgetChange() {
        // Re-calculate ranges of sliders based on current days and persons
        updateBudgetSliders();

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
            mealsEl.textContent = (persons * duration * 3) + ' kali';
        }

        checkMinBudget('b-persons', 'b-duration', 'b-budget', 'b-warning-box');

        // Tab Destination-First
        checkMinBudget('d-persons', 'd-duration', 'd-budget', 'd-warning-box');

        // Run capacity checks
        const isBudgetCapValid = checkCapacity('b-persons', 'b-transport', 'b-capacity-warning');
        const isDestCapValid = checkCapacity('d-persons', 'd-transport', 'd-capacity-warning');

        // Enable/disable submit buttons based on capacity checks
        const bSubmit = document.getElementById('b-submit');
        if (bSubmit) bSubmit.disabled = !isBudgetCapValid;

        const dSubmit = document.getElementById('d-submit');
        if (dSubmit) dSubmit.disabled = !isDestCapValid;
    }

    document.getElementById('b-transport')?.addEventListener('change', onBudgetChange);
    document.getElementById('d-transport')?.addEventListener('change', onBudgetChange);

    // Initial budget calculation
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
            const activeWFolder = activeWName ? activeWName.trim().replace(/ /g, '_') : '';
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
                const wFolder = wName ? wName.trim().replace(/ /g, '_') : '';
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

        const getFolder = name => name ? name.trim().replace(/ /g, '_') : '';
        const hFolder = getFolder(pkg.hotel_nama_real || pkg.hotel_nama);
        const wFolder = getFolder(pkg.wisata_nama);
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
                const wisataCost = (day.wisata_harga || 0) * pkg.num_persons;
                const kulinerCost = (day.kuliner_harga || 0) * pkg.num_persons * 3;
                const transportCost = Math.round(pkg.cost_transport / pkg.duration);
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
                                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">restaurant</span>
                                        <span>Kuliner: <span style="color: var(--slate-800); font-weight: 700;">${day.kuliner}</span></span>
                                    </div>
                                    <span style="color: var(--slate-500); font-size: 11px;">${fmtRp(day.kuliner_harga || 0)} /porsi</span>
                                </div>
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
                                    <span>• Kuliner (${pkg.num_persons} Orang × 3x Makan)</span>
                                    <span>${fmtRp(kulinerCost)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>• Transportasi (Porsi Harian Flat)</span>
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
                        <div class="pkg-item-cat">Kuliner</div>
                        <div class="pkg-item-name">${pkg.kuliner_nama}</div>
                        <div class="pkg-item-price">${fmtRp(pkg.kuliner_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/porsi</span></div>
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
                        <span>🍜 Kuliner (${pkg.num_persons}×${pkg.duration}×3 makan)</span>
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
                    days: days
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

        if (legs.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--slate-500)">Data rute tidak tersedia untuk paket ini.</div>`;
        } else {
            const getFolder = name => name ? name.trim().replace(/ /g, '_') : '';
            const hFolder = getFolder(pkg.hotel_nama_real || pkg.hotel_nama);
            const wFolder = getFolder(pkg.wisata_nama);
            const kFolder = getFolder(pkg.kuliner_nama);
            const isOneDay = pkg.nights === 0 || pkg.cost_akomodasi === 0 || pkg.duration === 1;

            let html = '';
            if (!isOneDay) {
                html += `
                <div style="display:flex; gap:12px; margin-bottom:20px;">
                    <div style="flex:1; height:90px; border-radius:10px; overflow:hidden; position:relative; border:1px solid var(--slate-200);">
                        <img src="/assets/GAMBAR/hotel/${hFolder}/${hFolder}-1.jpg" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'hotel')" />
                    </div>
                    <div style="flex:1; height:90px; border-radius:10px; overflow:hidden; position:relative; border:1px solid var(--slate-200);">
                        <img src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'landscape')" />
                    </div>
                    <div style="flex:1; height:90px; border-radius:10px; overflow:hidden; position:relative; border:1px solid var(--slate-200);">
                        <img src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'restaurant')" />
                    </div>
                </div>`;
            } else {
                html += `
                <div style="display:flex; gap:12px; margin-bottom:20px;">
                    <div style="flex:1; height:90px; border-radius:10px; overflow:hidden; position:relative; border:1px solid var(--slate-200);">
                        <img src="/assets/GAMBAR/wisata/${wFolder}/${wFolder}-1.jpg" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'landscape')" />
                    </div>
                    <div style="flex:1; height:90px; border-radius:10px; overflow:hidden; position:relative; border:1px solid var(--slate-200);">
                        <img src="/assets/GAMBAR/makan/${kFolder}/${kFolder}-1.jpg" style="width:100%; height:100%; object-fit:cover;" onerror="handleImgErrorRecom(this, 'restaurant')" />
                    </div>
                </div>`;
            }

            // A. Tampilkan Rute Utama Melingkar (Spatial Routing)
            html += '<div style="font-weight: 800; font-size: 15px; color: var(--slate-800); margin-bottom: 12px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 6px;">🎯 Outline Rute Spasial Harian</div>';
            html += '<div class="timeline">';
            const hotelNameReal = pkg.hotel_nama_real || pkg.hotel_nama;

            const places = isOneDay ? [
                { name: pkg.kuliner_nama, cat: '📍 Titik Mulai (Basecamp / Kuliner)' },
                { name: pkg.wisata_nama, cat: '🎯 Destinasi Wisata' },
                { name: pkg.kuliner_nama, cat: '📍 Titik Selesai (Basecamp / Kuliner)' }
            ] : [
                { name: hotelNameReal, cat: '🏨 Hotel (Mulai)' },
                { name: pkg.wisata_nama, cat: '🎯 Destinasi Wisata' },
                { name: pkg.kuliner_nama, cat: '🍜 Tempat Makan' },
                { name: hotelNameReal, cat: '🏨 Hotel (Selesai)' }
            ];

            for (let i = 0; i < places.length; i++) {
                html += `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-title">${places[i].name}</div>
                    <div class="timeline-desc">${places[i].cat}</div>
                </div>`;

                if (i < legs.length) {
                    const leg = legs[i];
                    html += `
                    <div class="timeline-leg">
                        <span class="material-symbols-outlined" style="font-size:16px">directions_car</span>
                        <span>Jarak Rata-rata: ${leg.distance_km?.toFixed(1) || '?'} km</span>
                        <span style="margin-left:auto">${fmtRp(leg.cost)}</span>
                    </div>`;
                }
            }
            html += '</div>';

            // B. Tampilkan Day-by-Day Itinerary Cerdas (Jika durasi > 1 hari)
            if (pkg.itinerary && pkg.itinerary.length > 0) {
                html += `
                <div style="font-weight: 800; font-size: 15px; color: var(--slate-800); margin: 24px 0 12px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 6px;">
                    📅 Rencana Perjalanan Harian (Variasi Klaster FCM)
                </div>
                <div class="ota-itinerary-list" style="display:flex; flex-direction:column; gap:10px; margin-bottom: 24px;">
                    ${pkg.itinerary.map(day => `
                        <div style="background:var(--slate-50); border:1.5px solid var(--slate-200); border-radius:12px; padding:12px 16px;">
                            <div style="font-size:11px; font-weight:800; color:var(--teal-600); letter-spacing:0.5px; text-transform:uppercase;">HARI ${day.day}</div>
                            <div style="font-size:14px; font-weight:700; color:var(--slate-800); margin:4px 0 2px;">🎯 Wisata: ${day.wisata}</div>
                            <div style="font-size:12.5px; font-weight:500; color:var(--slate-500);">🍜 Makan: ${day.kuliner}</div>
                        </div>
                    `).join('')}
                </div>
                `;
            }

            // Google Maps URL (waypoints delimited by |)
            const mapsUrl = isOneDay
                ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pkg.kuliner_nama)}&destination=${encodeURIComponent(pkg.kuliner_nama)}&waypoints=${encodeURIComponent(pkg.wisata_nama)}&travelmode=driving`
                : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(hotelNameReal)}&destination=${encodeURIComponent(hotelNameReal)}&waypoints=${encodeURIComponent(`${pkg.wisata_nama}|${pkg.kuliner_nama}`)}&travelmode=driving`;

            html += `
            <a href="${mapsUrl}" target="_blank" class="gmaps-btn">
                <span class="material-symbols-outlined">map</span>
                Buka Rute di Google Maps
            </a>`;

            body.innerHTML = html;
        }

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

        const bMin = calculateScaledMinBudget(persons, duration);

        if (!budget) {
            showError('Masukkan total anggaran terlebih dahulu.');
            return;
        }
        if (budget < bMin) {
            showError(`Anggaran minimal untuk ${persons} orang, ${duration} hari adalah ${fmtRp(bMin)}. Silakan masukkan budget di atas nilai tersebut.`);
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

        const dMin = calculateScaledMinBudget(persons, duration);
        const sliderVal = parseFloat(document.getElementById('d-budget')?.value) || 0;
        const isNoBudget = sliderVal < dMin;

        if (!isNoBudget && budget > 0 && budget < dMin) {
            showError(`Anggaran minimal untuk ${persons} orang, ${duration} hari adalah ${fmtRp(dMin)} (atau kosongkan untuk Tanpa Batasan Anggaran).`);
            return;
        }

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
                                kuliner_lon: selectedDays[dNum] ? selectedDays[dNum].kuliner_lon : 0
                            };
                        } else if (type === 'kuliner' && context.dayNum === dNum) {
                            dPlan = {
                                wisata_harga: selectedDays[dNum] ? selectedDays[dNum].wisata_harga : 0,
                                wisata_lat: selectedDays[dNum] ? selectedDays[dNum].wisata_lat : 0,
                                wisata_lon: selectedDays[dNum] ? selectedDays[dNum].wisata_lon : 0,
                                kuliner_harga: itemHarga,
                                kuliner_lat: item.lat || item.Latitude || 0,
                                kuliner_lon: item.lon || item.Longitude || 0
                            };
                        } else {
                            dPlan = selectedDays[dNum];
                        }

                        if (dPlan) {
                            if (dNum === 1) {
                                hypWisCost += dPlan.wisata_harga * persons;
                            }
                            hypKulCost += dPlan.kuliner_harga * persons * 3;

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
                                hypTotalDistance += d1 * 2;
                            } else {
                                const d1 = haversineDist(chLat, chLon, dPlan.wisata_lat, dPlan.wisata_lon);
                                const d2 = haversineDist(dPlan.wisata_lat, dPlan.wisata_lon, dPlan.kuliner_lat, dPlan.kuliner_lon);
                                const d3 = haversineDist(dPlan.kuliner_lat, dPlan.kuliner_lon, nhLat, nhLon);
                                hypTotalDistance += d1 + d2 + d3;
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
                    <div style="font-size:12.5px; font-weight:600; color:var(--slate-500); margin-bottom:6px;">🍜 Makan: ${day.kuliner}</div>
            `;

            // If the plan has exact leg distances calculated
            if (plan.legs && plan.legs.length > 0) {
                const dayLegs = plan.legs.slice(dIdx * 3, dIdx * 3 + 3);
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
        let origin = plan.hotel ? plan.hotel.nama : (plan.days[0] ? plan.days[0].wisata : "");
        if (plan.hotelMode === 'split' && plan.hotelsByNight && plan.hotelsByNight[1]) {
            origin = plan.hotelsByNight[1].nama;
        }

        let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(origin)}`;
        if (plan.days.length > 0) {
            let waypoints = plan.days.map(d => `${d.wisata}|${d.kuliner}`).join('|');
            mapsUrl += `&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
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
            const dayKulinerCost = day.kuliner_harga * persons * 3;
            const dayTransportCost = Math.round(plan.transportCost / duration);
            const daySubtotal = dayWisataCost + dayKulinerCost + dayTransportCost;

            itineraryHTML += `
                <div class="day-card">
                    <div class="day-header">
                        <span class="day-title">HARI ${day.day} (${day.className.toUpperCase()})</span>
                        <span class="day-badge">${day.className}</span>
                    </div>
                    <div class="day-wisata">🌲 Wisata: ${day.wisata} <span style="font-weight:600; font-size:12px; color:#64748b;">(Tiket: ${day.day === 1 ? fmtRp(day.wisata_harga) + '/org' : 'Gratis (Sudah di Hari 1)'})</span></div>
                    <div class="day-kuliner">🍜 Kuliner: ${day.kuliner} <span style="font-weight:600; font-size:12px; color:#64748b;">(Harga: ${fmtRp(day.kuliner_harga)} /porsi × 3x makan)</span></div>
            `;

            if (plan.legs && plan.legs.length > 0) {
                const dayLegs = plan.legs.slice(dIdx * 3, dIdx * 3 + 3);
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
                        <div class="item-cat">Transportasi Darat (${plan.vehDesc})</div>
                        <div class="item-name">Total Jarak Tempuh Spasial: ${plan.totalDistance.toFixed(1)} km</div>
                        <div class="item-price">Menggunakan tarif transportasi kustom: ${fmtRp(plan.transportCost)}</div>
                    </div>
                </div>

                <div class="total-row">
                    <span>ESTIMASI GABUNGAN BIAYA RUTE KUSTOM:</span>
                    <span style="color:#0f766e; font-size:22px; font-weight:900;">${fmtRp(plan.totalCost)}</span>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 300);
                    };
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

    // Helper Haversine Spasial Distance
    function haversineDist(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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
                        optAccommodationCost = selectedHotel ? selectedHotel.cost : 0;
                    }
                } else {
                    for (let n = 1; n <= nights; n++) {
                        if (type === 'split-hotel' && curStepDef.nightNum === n) {
                            optAccommodationCost += activeOptionPackages[idx].hotel_harga * activeOptionPackages[idx].num_rooms;
                        } else {
                            const activeN = selectedHotelsByNight[n];
                            if (activeN) {
                                optAccommodationCost += activeN.cost;
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
                        kuliner_lon: pkg.kuliner_lon || 0
                    };
                    dayPlan = {
                        wisata_harga: dayItin.wisata_harga !== undefined ? dayItin.wisata_harga : pkg.wisata_harga,
                        wisata_lat: dayItin.wisata_lat || pkg.wisata_lat || 0,
                        wisata_lon: dayItin.wisata_lon || pkg.wisata_lon || 0,
                        kuliner_harga: dayItin.kuliner_harga !== undefined ? dayItin.kuliner_harga : pkg.kuliner_harga,
                        kuliner_lat: dayItin.kuliner_lat || pkg.kuliner_lat || 0,
                        kuliner_lon: dayItin.kuliner_lon || pkg.kuliner_lon || 0
                    };
                } else {
                    dayPlan = selectedDays[dNum];
                }

                if (dayPlan) {
                    if (dNum === 1) {
                        optTotalWisataCost += dayPlan.wisata_harga * persons;
                    }
                    optTotalKulinerCost += dayPlan.kuliner_harga * persons * 3;

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

                    let d1 = 0, d2 = 0, d3 = 0;
                    const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                    const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                    const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                    const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                    if (duration === 1 || !currentHotel || !chLat) {
                        d1 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                        optTotalDistance += d1 * 2;
                    } else {
                        d1 = haversineDist(chLat, chLon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                        d2 = haversineDist(dayPlan.wisata_lat, dayPlan.wisata_lon, dayPlan.kuliner_lat, dayPlan.kuliner_lon);
                        d3 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, nhLat, nhLon);
                        optTotalDistance += d1 + d2 + d3;
                    }
                }
            }

            let ratePerKm = 2250;
            if (persons <= 1) {
                ratePerKm = 2250;
            } else if (persons <= 4) {
                ratePerKm = 5150;
            } else {
                ratePerKm = 6000;
            }

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
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Akomodasi</span>
                            ${isOptionOverBudget ? `<span class="pkg-badge error" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; padding: 2px 8px; font-weight: 800; border-radius: 6px; margin-left: auto; display: inline-flex; align-items: center; gap: 2px;">⚠️ Over Budget</span>` : ''}
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
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Malam ${nightNum}</span>
                            ${isOptionOverBudget ? `<span class="pkg-badge error" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; padding: 2px 8px; font-weight: 800; border-radius: 6px; margin-left: auto; display: inline-flex; align-items: center; gap: 2px;">⚠️ Over Budget</span>` : ''}
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
                        kuliner_lon: pkg.kuliner_lon || 0
                    };
                }

                const wFolder = dayItin.wisata ? dayItin.wisata.trim().replace(/ /g, '_') : '';
                const kFolder = dayItin.kuliner ? dayItin.kuliner.trim().replace(/ /g, '_') : '';
                const dayWisataCost = dayItin.wisata_harga * pkg.num_persons;
                const dayKulinerCost = dayItin.kuliner_harga * pkg.num_persons * 3;
                const dayTransportCost = pkg.cost_transport / pkg.duration;
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
                        <div class="pkg-banner ${cls}">
                            <span class="pkg-badge ${cls}">${label}</span>
                            <span class="pkg-xbi">Hari ${d}</span>
                            ${isOptionOverBudget ? `<span class="pkg-badge error" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 10px; padding: 2px 8px; font-weight: 800; border-radius: 6px; margin-left: auto; display: inline-flex; align-items: center; gap: 2px;">⚠️ Over Budget</span>` : ''}
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

                            <!-- Kuliner Dropdown Split -->
                            <div class="custom-dropdown-wrap" style="margin-bottom:0; position: relative;">
                                <label class="custom-dropdown-label" style="font-size:11px; font-weight:700;">🍜 Pilih Kuliner:</label>
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

                            <div class="custom-card-divider" style="margin: 8px 0;"></div>
                            
                            <div class="custom-card-meta-simple" style="font-size:11px; gap:4px; margin-top:auto;">
                                <div class="meta-row">
                                    <span>Tiket Wisata:</span>
                                    <span>${fmtRp(dayWisataCost)}</span>
                                </div>
                                <div class="meta-row">
                                    <span>Kuliner (3×):</span>
                                    <span>${fmtRp(dayKulinerCost)}</span>
                                </div>
                                <div class="meta-row">
                                    <span>Transportasi:</span>
                                    <span>${fmtRp(dayTransportCost)}</span>
                                </div>
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
        const persons = pkg.num_persons;
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
                };
            }

            // Sesuai rumus skripsi (uji_gabungan.py & recommender.py), tiket wisata hanya dihitung 1x (hari pertama)
            if (dNum === 1) {
                totalWisataCost = dayPlan.wisata_harga * persons;
            }
            totalKulinerCost += dayPlan.kuliner_harga * persons * 3;

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
            let d1 = 0, d2 = 0, d3 = 0;
            const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
            const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
            const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
            const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

            if (duration === 1 || !currentHotel || !chLat) {
                d1 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                totalDistance += d1 * 2; // Accumulate circular route distance
                legs.push({ from: dayPlan.kuliner, to: dayPlan.wisata, distance: d1 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d1 });
            } else {
                d1 = haversineDist(chLat, chLon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                d2 = haversineDist(dayPlan.wisata_lat, dayPlan.wisata_lon, dayPlan.kuliner_lat, dayPlan.kuliner_lon);
                d3 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, nhLat, nhLon);
                totalDistance += d1 + d2 + d3; // Accumulate spatial route distance per day
                legs.push({ from: currentHotel.nama, to: dayPlan.wisata, distance: d1 });
                legs.push({ from: dayPlan.wisata, to: dayPlan.kuliner, distance: d2 });
                legs.push({ from: dayPlan.kuliner, to: (nextHotel || currentHotel).nama, distance: d3 });
            }
        }

        // Flat Rates Transport (only when we actually calculated distance, else 0)
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
                totalKulinerCostVisible += dayPlan.kuliner_harga * persons * 3;

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

                let d1 = 0, d2 = 0, d3 = 0;
                const chLat = currentHotel ? (currentHotel.lat || currentHotel.Latitude || 0) : 0;
                const chLon = currentHotel ? (currentHotel.lon || currentHotel.Longitude || 0) : 0;
                const nhLat = nextHotel ? (nextHotel.lat || nextHotel.Latitude || 0) : chLat;
                const nhLon = nextHotel ? (nextHotel.lon || nextHotel.Longitude || 0) : chLon;

                if (duration === 1 || !currentHotel || !chLat) {
                    d1 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                    totalDistanceVisible += d1 * 2;
                } else {
                    d1 = haversineDist(chLat, chLon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                    d2 = haversineDist(dayPlan.wisata_lat, dayPlan.wisata_lon, dayPlan.kuliner_lat, dayPlan.kuliner_lon);
                    d3 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, nhLat, nhLon);
                    totalDistanceVisible += d1 + d2 + d3;
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
                let isPindah = false;

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

                            if (dNum > 1) {
                                const prevN = selectedHotelsByNight[dNum - 1];
                                if (prevN && prevN.nama !== activeN.nama) {
                                    isPindah = true;
                                }
                            }
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
                        currentHotel = selectedHotel;
                        nextHotel = selectedHotel;
                    } else {
                        currentHotel = selectedHotelsByNight[dNum - 1] || selectedHotelsByNight[dNum] || null;
                        nextHotel = selectedHotelsByNight[dNum] || selectedHotelsByNight[dNum - 1] || null;
                    }
                }

                if (duration === 1 || !currentHotel) {
                    const d1 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                    dayDistance = d1 * 2;
                } else {
                    const d1 = haversineDist(currentHotel.lat, currentHotel.lon, dayPlan.wisata_lat, dayPlan.wisata_lon);
                    const d2 = haversineDist(dayPlan.wisata_lat, dayPlan.wisata_lon, dayPlan.kuliner_lat, dayPlan.kuliner_lon);
                    const d3 = haversineDist(dayPlan.kuliner_lat, dayPlan.kuliner_lon, (nextHotel || currentHotel).lat, (nextHotel || currentHotel).lon);
                    dayDistance = d1 + d2 + d3;
                }

                // Flat transportation cost portion per day
                const dayTransportCost = Math.round(transportCost / duration);

                // Wisata cost (Day 1 only for final total matching)
                const wisataCost = dayPlan.wisata_harga * persons;
                const wisataCostForSubtotal = (dNum === 1) ? wisataCost : 0;
                const kulinerCost = dayPlan.kuliner_harga * persons * 3;

                // Day Subtotal
                const daySubtotal = hotelCost + wisataCostForSubtotal + kulinerCost + dayTransportCost;

                // Brief Route Legs
                let legsBrief = '';
                if (duration === 1 || !currentHotel) {
                    legsBrief = 'Wisata ➔ Kuliner ➔ Pulang';
                } else {
                    const fromLabel = (hotelMode === 'same') ? 'Hotel' : `Malam ${dNum - 1 || 1}`;
                    const toLabel = (dNum === duration) ? 'Checkout' : ((hotelMode === 'same') ? 'Hotel' : `Malam ${dNum}`);
                    legsBrief = `${fromLabel} ➔ Wisata ➔ Kuliner ➔ ${toLabel}`;
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
                                    <span class="material-symbols-outlined" style="font-size: 14px; color: var(--teal-500);">restaurant</span>
                                    <span>Kuliner: <span style="color: var(--slate-800); font-weight: 750; max-width: 140px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;">${dayPlan.kuliner}</span></span>
                                </div>
                                <span style="color: var(--slate-500); font-size: 10.5px; flex-shrink: 0;">${fmtRp(dayPlan.kuliner_harga)} /porsi</span>
                            </div>
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
                                <span>• Kuliner (${persons} Orang × 3x Makan)</span>
                                <span>${fmtRp(kulinerCost)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>• Transportasi (Porsi Harian Flat)</span>
                                <span>${fmtRp(dayTransportCost)}</span>
                            </div>
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

                <button class="finalize-btn" id="finalize-plan-btn" ${isStepperFinished ? '' : 'disabled'}>
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
                        kuliner_lon: pkg.kuliner_lon || 0
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
                    const message = `Pilih rute Hari ${d} (${classNames[idx].toUpperCase()})?<br><br>🌲 Wisata: <strong>${dayItin.wisata}</strong> (${distance.toFixed(1)} km dari hotel)<br>🍜 Kuliner: <strong>${dayItin.kuliner}</strong><br>💰 Total HTM & Makan: <strong>${fmtRp(dayItin.wisata_harga * pkg.num_persons + dayItin.kuliner_harga * pkg.num_persons * 3)}</strong>`;

                    showSpatialConfirmationModal(title, message, () => {
                        const dayWisataCost = dayItin.wisata_harga * pkg.num_persons;
                        const dayKulinerCost = dayItin.kuliner_harga * pkg.num_persons * 3;
                        const dayTransportCost = pkg.cost_transport / pkg.duration;
                        const dayTotal = dayWisataCost + dayKulinerCost + dayTransportCost;

                        selectedDays[d] = {
                            classIdx: idx,
                            className: classNames[idx],
                            wisata: dayItin.wisata,
                            wisata_harga: dayItin.wisata_harga,
                            wisata_lat: dayItin.wisata_lat || 0,
                            wisata_lon: dayItin.wisata_lon || 0,
                            kuliner: dayItin.kuliner,
                            kuliner_harga: dayItin.kuliner_harga,
                            kuliner_lat: dayItin.kuliner_lat || 0,
                            kuliner_lon: dayItin.kuliner_lon || 0,
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