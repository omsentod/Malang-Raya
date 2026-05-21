// ─────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────
const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

// ─────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────
document.getElementById('hamburger-btn')?.addEventListener('click', () => {
    const m = document.getElementById('mobile-menu');
    m.classList.toggle('open');
    document.querySelector('#hamburger-btn .material-symbols-outlined').textContent =
        m.classList.contains('open') ? 'close' : 'menu';
});

// ─────────────────────────────────────────────────
// Scroll reveal
// ─────────────────────────────────────────────────
new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); } });
}, { threshold: 0.1 }).observe(document.querySelector('.recom-hero'));

// ─────────────────────────────────────────────────
// Workflow Tab Switching
// ─────────────────────────────────────────────────
let activeWorkflow = 'budget';
document.querySelectorAll('.wf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const wf = tab.dataset.wf;
        if (wf === activeWorkflow) return;
        activeWorkflow = wf;

        document.querySelectorAll('.wf-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.wf-panel').forEach(p => p.style.display = 'none');
        document.getElementById('wf-' + wf).style.display = 'block';

        hideResults();
        hideError();
    });
});

// ─────────────────────────────────────────────────
// Counter helper
// ─────────────────────────────────────────────────
function setupCounter(inputId, minusId, plusId, min = 1) {
    const inp  = document.getElementById(inputId);
    const plus = document.getElementById(plusId);
    const minus= document.getElementById(minusId);
    if (!inp) return;
    minus.addEventListener('click', () => { if (+inp.value > min) inp.value = +inp.value - 1; onBudgetChange(); });
    plus.addEventListener('click',  () => { inp.value = +inp.value + 1; onBudgetChange(); });
    inp.addEventListener('change', onBudgetChange);
}
setupCounter('b-persons',  'b-persons-minus',  'b-persons-plus');
setupCounter('b-duration', 'b-duration-minus', 'b-duration-plus');
setupCounter('f-persons',  'f-persons-minus',  'f-persons-plus');
setupCounter('f-duration', 'f-duration-minus', 'f-duration-plus');
setupCounter('d-persons',  'd-persons-minus',  'd-persons-plus');
setupCounter('d-duration', 'd-duration-minus', 'd-duration-plus');

// ─────────────────────────────────────────────────
// Budget Input Formatting
// ─────────────────────────────────────────────────
function formatBudgetInput(el) {
    el.addEventListener('input', e => {
        let raw = e.target.value.replace(/\D/g,'');
        e.target.value = raw ? parseInt(raw).toLocaleString('id-ID') : '';
        onBudgetChange();
    });
}
formatBudgetInput(document.getElementById('b-budget'));
formatBudgetInput(document.getElementById('d-budget'));

function getRawBudget(elId) {
    const raw = document.getElementById(elId)?.value.replace(/\./g,'').replace(/,/g,'') || '0';
    return parseFloat(raw) || 0;
}

function checkMinBudget(personsId, durationId, budgetId, warningBoxId) {
    const persons  = +document.getElementById(personsId)?.value || 1;
    const duration = +document.getElementById(durationId)?.value || 1;
    const budget   = getRawBudget(budgetId);
    const box      = document.getElementById(warningBoxId);
    
    if (!box) return;
    
    if (budget === 0) {
        box.style.display = 'none';
        return;
    }

    // Min Hotel: Rp 100.000 / malam / kamar
    const minHotel = duration > 1 ? 100000 * (duration - 1) * Math.ceil(persons / 2) : 0;
    // Min Wisata: Rp 5.000 / orang
    const minWisata = 5000 * persons;
    // Min Kuliner: Rp 15.000 / orang / porsi (3x sehari)
    const minKuliner = 15000 * persons * 3 * duration;
    // Min Transportasi: Rp 20.000 flat minimum
    const minTransport = 20000;
    
    const minBudget = minHotel + minWisata + minKuliner + minTransport;

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
    // Tab Budget-First
    const budget   = getRawBudget('b-budget');
    const persons  = +document.getElementById('b-persons')?.value || 1;
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
onBudgetChange();

document.getElementById('b-transport')?.addEventListener('change', onBudgetChange);
document.getElementById('d-transport')?.addEventListener('change', onBudgetChange);

// ─────────────────────────────────────────────────
// UI State Helpers
// ─────────────────────────────────────────────────
function showLoading() {
    document.querySelectorAll('.wf-panel').forEach(p => p.style.display = 'none');
    hideResults();
    hideError();
    const lo = document.getElementById('loading-overlay');
    lo.classList.add('visible');
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
    document.getElementById('loading-overlay').classList.remove('visible');
    clearInterval(window._loadInterval);
    document.getElementById('wf-' + activeWorkflow).style.display = 'block';
}

function showError(msg) {
    const box = document.getElementById('error-box');
    document.getElementById('error-msg').textContent = msg;
    box.classList.add('visible');
}
function hideError() { document.getElementById('error-box').classList.remove('visible'); }

function hideResults() { document.getElementById('results-section').classList.remove('visible'); }

let allOptions = [];

function showResults(options, workflowLabel) {
    const sec = document.getElementById('results-section');
    const tabsContainer = document.getElementById('options-tabs-container');
    const tabsEl = document.getElementById('options-tabs');
    grid = document.getElementById('packages-grid');
    
    allOptions = options;

    // Render dynamic option tabs if more than 1 option is returned
    if (options && options.length > 1) {
        tabsEl.innerHTML = options.map((opt, i) => `
            <button class="opt-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
                <span class="material-symbols-outlined">auto_awesome</span>
                Opsi Alternatif ${opt.option_index}
            </button>
        `).join('');
        tabsContainer.style.display = 'flex';

        // Attach click events
        document.querySelectorAll('.opt-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.opt-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const idx = parseInt(tab.dataset.idx);
                renderPackages(allOptions[idx].packages);
            });
        });
    } else {
        tabsContainer.style.display = 'none';
    }

    // Render the first option's packages initially
    const initialPackages = options && options[0] ? options[0].packages : [];
    renderPackages(initialPackages);

    document.getElementById('results-title').textContent = workflowLabel;
    document.getElementById('results-sub').textContent = `${options.length} pilihan alternatif paket ditemukan`;
    sec.classList.add('visible');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPackages(packages) {
    const grid = document.getElementById('packages-grid');
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
    const budget = getRawBudget('b-budget') || getRawBudget('d-budget') || 0;
    const remaining = budget > 0 ? budget - pkg.total_cost : null;
    const isOver = remaining !== null && remaining < 0;

    const legs = pkg.transport_detail?.legs || [];
    const legHTML = legs.length > 0
        ? `<div class="transport-legs">
            ${legs.map(l => `<div class="transport-leg-row"><span>${l.from}→${l.to} (${l.distance_km?.toFixed(1)} km)</span><span>${fmtRp(l.cost)}</span></div>`).join('')}
           </div>` : '';

    const remainHTML = remaining !== null
        ? `<div class="pkg-sisa ${isOver ? 'over' : 'ok'}">${isOver ? '⚠ Melebihi budget ' + fmtRp(Math.abs(remaining)) : '✓ Sisa ' + fmtRp(remaining)}</div>` : '';

    const isOneDay = pkg.nights === 0 || pkg.cost_akomodasi === 0 || pkg.duration === 1;

    const hotelItemHTML = !isOneDay ? `
            <div class="pkg-item">
                <div class="pkg-item-icon hotel"><span class="material-symbols-outlined">hotel</span></div>
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
                <div class="pkg-item-icon wisata"><span class="material-symbols-outlined">landscape</span></div>
                <div class="pkg-item-info">
                    <div class="pkg-item-cat">Destinasi Wisata</div>
                    <div class="pkg-item-name">${pkg.wisata_nama}</div>
                    <div class="pkg-item-price">${fmtRp(pkg.wisata_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/tiket</span></div>
                </div>
            </div>
            <div class="pkg-item">
                <div class="pkg-item-icon kuliner"><span class="material-symbols-outlined">restaurant</span></div>
                <div class="pkg-item-info">
                    <div class="pkg-item-cat">Kuliner</div>
                    <div class="pkg-item-name">${pkg.kuliner_nama}</div>
                    <div class="pkg-item-price">${fmtRp(pkg.kuliner_harga)} <span style="font-size:11px;font-weight:500;color:var(--slate-400)">/porsi</span></div>
                </div>
            </div>

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

            <div class="pkg-total ${isOver ? 'over' : 'ok'}">
                <div>
                    <div class="total-label">TOTAL PAKET</div>
                    <div class="total-amount">${fmtRp(pkg.total_cost)}</div>
                </div>
                <span class="material-symbols-outlined" style="font-size:28px;color:${isOver ? '#dc2626' : 'var(--teal-400)'}">
                    ${isOver ? 'warning' : 'check_circle'}
                </span>
            </div>
            ${remainHTML}
        </div>
        <div class="pkg-footer">
            <button class="pkg-btn-detail">Lihat Detail & Rute</button>
        </div>
    `;

    const btn = card.querySelector('.pkg-btn-detail');
    if(btn) {
        btn.addEventListener('click', () => {
            openDetailModal(pkg);
        });
    }

    return card;
}

// ─────────────────────────────────────────────────
// Route Detail Modal
// ─────────────────────────────────────────────────
function openDetailModal(pkg) {
    const modal = document.getElementById('route-modal');
    const body = document.getElementById('modal-body-content');
    const legs = pkg.transport_detail?.legs || [];
    
    if(legs.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--slate-500)">Data rute tidak tersedia untuk paket ini.</div>`;
    } else {
        let html = '<div class="timeline">';
        const isOneDay = pkg.nights === 0 || pkg.cost_akomodasi === 0 || pkg.duration === 1;
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
                    <span>Jarak: ${leg.distance_km?.toFixed(1) || '?'} km</span>
                    <span style="margin-left:auto">${fmtRp(leg.cost)}</span>
                </div>`;
            }
        }
        html += '</div>';

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
    document.getElementById('route-modal').classList.remove('show');
});

// ─────────────────────────────────────────────────
// API Call
// ─────────────────────────────────────────────────
async function callRecommend(payload, workflowLabel) {
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
document.getElementById('form-budget').addEventListener('submit', e => {
    e.preventDefault();
    const budget   = getRawBudget('b-budget');
    const persons  = +document.getElementById('b-persons').value;
    const duration = +document.getElementById('b-duration').value;
    const transport = document.getElementById('b-transport')?.value || '';

    if (!budget || budget < 100000) { showError('Masukkan total anggaran minimal Rp 100.000'); return; }
    callRecommend({ workflow: 'budget', budget, persons, duration, transport },
        `Budget Rp ${budget.toLocaleString('id-ID')} — ${persons} orang, ${duration} hari`);
});

document.getElementById('form-flexible').addEventListener('submit', e => {
    e.preventDefault();
    const persons  = +document.getElementById('f-persons').value;
    const duration = +document.getElementById('f-duration').value;
    callRecommend({ workflow: 'flexible', persons, duration },
        `Flexible Explore — ${persons} orang, ${duration} hari`);
});

document.getElementById('form-destination').addEventListener('submit', e => {
    e.preventDefault();
    const destId   = document.getElementById('d-dest-id').value;
    const persons  = +document.getElementById('d-persons').value;
    const duration = +document.getElementById('d-duration').value;
    const budget   = getRawBudget('d-budget');
    const transport = document.getElementById('d-transport')?.value || '';

    if (!destId) { showError('Pilih destinasi wisata terlebih dahulu.'); return; }
    callRecommend({ workflow: 'destination', dest_id: destId, persons, duration, budget: budget || null, transport },
        `Destination-First — ${document.getElementById('d-dest-id').selectedOptions[0]?.text}`);
});

// ─────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
    hideResults();
    document.getElementById('wf-' + activeWorkflow).style.display = 'block';
});