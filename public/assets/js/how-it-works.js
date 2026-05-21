const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

// Navbar
document.getElementById('hamburger-btn')?.addEventListener('click', () => {
    const m = document.getElementById('mobile-menu');
    m.classList.toggle('open');
    document.querySelector('#hamburger-btn .material-symbols-outlined').textContent =
        m.classList.contains('open') ? 'close' : 'menu';
});

// Collapse/expand sections
function toggleSection(id) {
    document.getElementById(id).classList.toggle('open');
}

// Counter
function cc(inpId, minusId, plusId, min=1) {
    const inp = document.getElementById(inpId);
    document.getElementById(minusId).addEventListener('click', () => { if(+inp.value > min) inp.value = +inp.value - 1; });
    document.getElementById(plusId).addEventListener('click',  () => { inp.value = +inp.value + 1; });
}
cc('sim-persons','sp-minus','sp-plus');
cc('sim-duration','sd-minus','sd-plus');

// Budget formatting
const simBudget = document.getElementById('sim-budget');
simBudget.addEventListener('input', e => {
    let raw = e.target.value.replace(/\D/g,'');
    e.target.value = raw ? parseInt(raw).toLocaleString('id-ID') : '';
});
function getRawBudget() {
    return parseFloat(document.getElementById('sim-budget').value.replace(/\./g,'').replace(/,/g,'')) || 3000000;
}

// ─── Loading State ───
let loadStep = 0, loadInterval = null;
function showLoading() {
    document.getElementById('global-loading').classList.add('visible');
    document.getElementById('global-error').style.display = 'none';
    document.getElementById('results-all').style.display = 'none';
    loadStep = 1;
    document.querySelectorAll('.ls').forEach(s => s.classList.remove('active'));
    clearInterval(loadInterval);
    loadInterval = setInterval(() => {
        document.querySelectorAll('.ls').forEach(s => s.classList.remove('active'));
        const el = document.getElementById('sl-' + loadStep);
        if (el) el.classList.add('active');
        if (++loadStep > 5) clearInterval(loadInterval);
    }, 1400);
}
function hideLoading() {
    document.getElementById('global-loading').classList.remove('visible');
    clearInterval(loadInterval);
}
function showError(msg) {
    const box = document.getElementById('global-error');
    document.getElementById('global-error-msg').textContent = msg;
    box.style.display = 'flex';
}

// ─── RENDER STEP 1: Dataset Stats ───
function renderStats(stats) {
    const catColor = { wisata: 'wisata', hotel: 'hotel', kuliner: 'kuliner' };
    const catLabel = { wisata: '🌿 Wisata', hotel: '🏨 Hotel', kuliner: '🍜 Kuliner' };
    let html = '<div class="stats-grid">';
    for (const [cat, s] of Object.entries(stats)) {
        html += `
        <div class="stat-card">
            <div class="stat-cat ${catColor[cat]}">${catLabel[cat]}</div>
            <div class="stat-row"><span class="stat-label">Total Data</span><span class="stat-val">${s.total.toLocaleString()} entri</span></div>
            <div class="stat-row"><span class="stat-label">Harga Min</span><span class="stat-val">${fmtRp(s.min)}</span></div>
            <div class="stat-row"><span class="stat-label">Harga Max</span><span class="stat-val">${fmtRp(s.max)}</span></div>
            <div class="stat-row"><span class="stat-label">Rata-rata</span><span class="stat-val">${fmtRp(s.mean)}</span></div>
            <div class="stat-row"><span class="stat-label">Median</span><span class="stat-val">${fmtRp(s.median)}</span></div>
            <div class="stat-row"><span class="stat-label">Std Dev</span><span class="stat-val">±${fmtRp(s.std)}</span></div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('body-1').innerHTML = html;
}

// ─── RENDER STEP 2: Budget Allocation ───
function renderBudgetAlloc(input) {
    const alloc = input.budget_alloc;
    const anchors = input.budget_anchors;
    const budget = input.budget;
    const pcts = { akomodasi:35, wisata:15, kuliner:30, transportasi:20 };
    const icons = { akomodasi:'🏨', wisata:'🎯', kuliner:'🍜', transportasi:'🚗' };

    let html = `
    <div class="info-box">
        <span class="material-symbols-outlined">info</span>
        Budget <strong>${fmtRp(budget)}</strong> dibagi proporsional ke 4 komponen (35% akomodasi, 15% wisata, 30% kuliner, 20% transportasi). 
        Anchor centroid = budget per unit item, digunakan untuk inisialisasi centroid FCM per kategori.
    </div>
    <div class="stats-grid">
        ${Object.entries(alloc).map(([k,v]) => `
        <div class="stat-card">
            <div class="stat-cat" style="color:var(--teal-400)">${icons[k]} ${k.charAt(0).toUpperCase()+k.slice(1)}</div>
            <div class="stat-row"><span class="stat-label">Alokasi</span><span class="stat-val">${fmtRp(v)}</span></div>
            <div class="stat-row"><span class="stat-label">Persentase</span><span class="stat-val">${pcts[k]}%</span></div>
            ${anchors[k] !== undefined ? `<div class="stat-row"><span class="stat-label">Anchor/Unit</span><span class="stat-val" style="color:var(--teal-400)">${fmtRp(anchors[k])}</span></div>` : ''}
        </div>`).join('')}
    </div>
    <div class="terminal" style="margin-top:20px">
<span class="comment"># Inisialisasi centroid berbasis budget (Skema B: 0.6×/1.0×/1.4×)</span>
<span class="kw">for</span> cat, anchor <span class="kw">in</span> budget_anchors.items():
    init_centers = [
        anchor <span class="num">* 0.6</span>,  <span class="comment"># Titik Hemat</span>
        anchor <span class="num">* 1.0</span>,  <span class="comment"># Titik Balanced</span>
        anchor <span class="num">* 1.4</span>,  <span class="comment"># Titik Premium</span>
    ]
    result = <span class="fn">run_budget_anchored_fcm</span>(prices, anchor, scheme=<span class="str">"B"</span>)</div>`;
    document.getElementById('body-2').innerHTML = html;
}

// ─── RENDER STEP 3: XBI Table ───
function renderXBI(xbiData) {
    const catColor = { wisata:'wisata', hotel:'hotel', kuliner:'kuliner' };
    const catLabel = { wisata:'🌿 Wisata', hotel:'🏨 Hotel', kuliner:'🍜 Kuliner' };

    let html = `
    <div class="info-box">
        <span class="material-symbols-outlined">info</span>
        Xie-Beni Index (XBI) = rasio compactness ÷ separation. Nilai <strong>lebih kecil = lebih baik</strong>. 
        Baris hijau menunjukkan nilai XBI terkecil (klaster optimal) untuk setiap kategori.
    </div>
    <div class="xbi-tables">`;

    for (const [cat, rows] of Object.entries(xbiData)) {
        const validRows = rows.filter(r => r.xbi !== null);
        const minXBI = Math.min(...validRows.map(r => r.xbi));
        html += `
        <div class="xbi-card">
            <div class="xbi-head ${catColor[cat]}">${catLabel[cat]}</div>
            <table class="xbi-tbl">
                <thead><tr><th>c</th><th>Nilai XBI</th><th>Centroid (Rp)</th></tr></thead>
                <tbody>
                ${rows.map(r => `
                    <tr class="${r.xbi === minXBI ? 'optimal' : ''}">
                        <td>c = ${r.c}${r.xbi === minXBI ? '<span class="badge-opt">OPTIMAL</span>':''}</td>
                        <td>${r.xbi !== null ? r.xbi.toFixed(4) : 'error'}</td>
                        <td style="font-size:11px">${r.centroids ? r.centroids.map(c=>fmtRp(c)).join(' / ') : '-'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }
    html += '</div>';
    document.getElementById('body-3').innerHTML = html;
}

// ─── RENDER STEP 4: Ratio Validation ───
function renderRatio(ratioData) {
    const catLabel = { wisata:'🌿 Wisata', hotel:'🏨 Hotel', kuliner:'🍜 Kuliner' };
    const catCls   = { wisata:'wisata', hotel:'hotel', kuliner:'kuliner' };
    const schemeDesc = {
        A:'0.5× / 1.0× / 1.5× (Lebar)',
        B:'0.6× / 1.0× / 1.4× (Moderat) ★',
        C:'0.7× / 1.0× / 1.3× (Sempit)',
        D:'0.5× / 1.0× / 2.0× (Ekstrem)',
        E:'0.8× / 1.0× / 1.2× (Sangat Sempit)',
    };
    let html = `
    <div class="info-box">
        <span class="material-symbols-outlined">info</span>
        Lima skema rasio diuji untuk mencari inisialisasi centroid terbaik. Skema <strong>B (0.6×/1.0×/1.4×)</strong> dipilih sebagai default karena memberikan separasi yang moderat dan XBI terkecil pada mayoritas dataset.
    </div>
    <div class="ratio-section">`;

    for (const [cat, rows] of Object.entries(ratioData)) {
        const validRows = rows.filter(r => r.xbi !== null);
        const minXBI = Math.min(...validRows.map(r => r.xbi));
        html += `
        <div>
            <div class="ratio-cat-title ${catCls[cat]}">${catLabel[cat]}</div>
            <table class="ratio-tbl">
                <thead><tr><th>Skema</th><th>Rasio</th><th>XBI</th><th>Distribusi (H/B/P)</th></tr></thead>
                <tbody>
                ${rows.map(r => `
                    <tr class="${r.xbi === minXBI ? 'best-scheme' : ''}">
                        <td><span class="scheme-badge">${r.scheme}</span></td>
                        <td style="font-size:12px;color:var(--slate-400)">${schemeDesc[r.scheme]||r.scheme}</td>
                        <td>
                            <div class="bar-cell">
                                <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100,(minXBI/r.xbi)*100)}%"></div></div>
                                ${r.xbi !== null ? r.xbi.toFixed(4) : 'error'}
                            </div>
                        </td>
                        <td style="font-size:12px">${r.dist ? `${r.dist.hemat} / ${r.dist.balanced} / ${r.dist.premium}` : '-'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }
    html += '</div>';
    document.getElementById('body-4').innerHTML = html;
}

// ─── RENDER STEP 5: Clustering Result ───
function renderClustering(clusterData) {
    const catLabel  = { wisata:'🌿 Wisata', hotel:'🏨 Hotel', kuliner:'🍜 Kuliner' };
    const catCls    = { wisata:'wisata', hotel:'hotel', kuliner:'kuliner' };

    let html = '<div class="cluster-grid">';
    for (const [cat, d] of Object.entries(clusterData)) {
        if (d.error) { html += `<div class="stat-card"><div style="color:var(--rose-500)">${cat}: ${d.error}</div></div>`; continue; }
        const total = d.distribution.hemat + d.distribution.balanced + d.distribution.premium;
        const pHemat    = (d.distribution.hemat    / total * 100).toFixed(0);
        const pBalanced = (d.distribution.balanced / total * 100).toFixed(0);
        const pPremium  = (d.distribution.premium  / total * 100).toFixed(0);
        html += `
        <div class="cluster-card">
            <div class="cluster-head ${catCls[cat]}">
                <span>${catLabel[cat]}</span>
                <span style="font-size:11px;opacity:.7">XBI: ${d.xbi}</span>
            </div>
            <div class="cluster-body">
                <div class="cluster-tier">
                    <div class="tier-label"><div class="tier-dot hemat"></div>Hemat</div>
                    <div style="text-align:right">
                        <div class="tier-price">${fmtRp(d.centroids.hemat)}</div>
                        <div class="tier-cnt">${d.distribution.hemat} data (${pHemat}%)</div>
                    </div>
                </div>
                <div class="cluster-tier">
                    <div class="tier-label"><div class="tier-dot balanced"></div>Balanced</div>
                    <div style="text-align:right">
                        <div class="tier-price">${fmtRp(d.centroids.balanced)}</div>
                        <div class="tier-cnt">${d.distribution.balanced} data (${pBalanced}%)</div>
                    </div>
                </div>
                <div class="cluster-tier">
                    <div class="tier-label"><div class="tier-dot premium"></div>Premium</div>
                    <div style="text-align:right">
                        <div class="tier-price">${fmtRp(d.centroids.premium)}</div>
                        <div class="tier-cnt">${d.distribution.premium} data (${pPremium}%)</div>
                    </div>
                </div>
                <div class="cluster-bar">
                    <div class="cluster-bar-seg hemat"    style="flex:${d.distribution.hemat}"></div>
                    <div class="cluster-bar-seg balanced" style="flex:${d.distribution.balanced}"></div>
                    <div class="cluster-bar-seg premium"  style="flex:${d.distribution.premium}"></div>
                </div>
            </div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('body-5').innerHTML = html;
}

// ─── RENDER STEP 6: Packages ───
function renderPackages(packages, budget) {
    if (!packages || packages.length === 0) {
        document.getElementById('body-6').innerHTML = `
            <div class="placeholder-box">
                <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                <p>Tidak ada paket yang memenuhi budget ini. Coba naikkan budget.</p>
            </div>`;
        return;
    }
    const catCls = { Hemat:'hemat', HEMAT:'hemat', Balanced:'balanced', BALANCED:'balanced', Premium:'premium', PREMIUM:'premium' };
    let html = `<div class="pkgs-grid">`;
    packages.forEach(pkg => {
        const cls = catCls[pkg.kategori] || 'hemat';
        const remaining = budget - pkg.total_cost;
        html += `
        <div class="pkg-card">
            <div class="pkg-banner ${cls}">
                <span class="pkg-badge ${cls}">${pkg.kategori}</span>
                <span style="font-size:11px;color:var(--slate-400)">FCM Optimal</span>
            </div>
            <div class="pkg-body">
                <div class="pkg-row">
                    <div class="pkg-icon hotel"><span class="material-symbols-outlined">hotel</span></div>
                    <div>
                        <div class="pkg-info-cat">Hotel</div>
                        <div class="pkg-info-name">${pkg.hotel_nama}</div>
                        <div class="pkg-info-price">${fmtRp(pkg.hotel_harga)}<span style="font-size:11px;color:var(--slate-400)">/malam</span></div>
                    </div>
                </div>
                <div class="pkg-row">
                    <div class="pkg-icon wisata"><span class="material-symbols-outlined">landscape</span></div>
                    <div>
                        <div class="pkg-info-cat">Wisata</div>
                        <div class="pkg-info-name">${pkg.wisata_nama}</div>
                        <div class="pkg-info-price">${fmtRp(pkg.wisata_harga)}<span style="font-size:11px;color:var(--slate-400)">/tiket</span></div>
                    </div>
                </div>
                <div class="pkg-row">
                    <div class="pkg-icon kuliner"><span class="material-symbols-outlined">restaurant</span></div>
                    <div>
                        <div class="pkg-info-cat">Kuliner</div>
                        <div class="pkg-info-name">${pkg.kuliner_nama}</div>
                        <div class="pkg-info-price">${fmtRp(pkg.kuliner_harga)}<span style="font-size:11px;color:var(--slate-400)">/porsi</span></div>
                    </div>
                </div>
                <div class="pkg-total-bar">
                    <div>
                        <div class="pkg-total-label">TOTAL PAKET</div>
                        <div class="pkg-total-val">${fmtRp(pkg.total_cost)}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:11px;color:var(--slate-500)">Sisa budget</div>
                        <div style="font-size:14px;font-weight:800;color:${remaining>=0?'var(--emerald-400)':'var(--rose-500)'}">${remaining>=0?'+':'-'}${fmtRp(Math.abs(remaining))}</div>
                    </div>
                </div>
                <div style="font-size:11px;color:var(--slate-500);margin-top:10px;text-align:center">
                    🚗 Transportasi: ${fmtRp(pkg.cost_transport)} | 📏 ${pkg.transport_detail?.total_distance_km?.toFixed(1)||'?'} km
                </div>
            </div>
        </div>`;
    });
    html += '</div>';
    document.getElementById('body-6').innerHTML = html;
}

// ─── Main Run ───
document.getElementById('run-btn').addEventListener('click', async () => {
    const budget   = getRawBudget();
    const persons  = +document.getElementById('sim-persons').value;
    const duration = +document.getElementById('sim-duration').value;
    const btn = document.getElementById('run-btn');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin .6s linear infinite">refresh</span> Berjalan...';
    showLoading();

    try {
        const fd = new FormData();
        fd.append('budget',   budget);
        fd.append('persons',  persons);
        fd.append('duration', duration);

        const res = await fetch('/api/how-it-works', {
            method: 'POST', body: fd,
            headers: { 'X-CSRF-TOKEN': csrfToken() }
        });
        const data = await res.json();

        hideLoading();

        if (!res.ok || data.status !== 'success') {
            showError(data.error || data.message || 'Server error.');
            return;
        }

        document.getElementById('results-all').style.display = 'block';

        renderStats(data.dataset_stats);
        renderBudgetAlloc(data.input);
        renderXBI(data.xbi_per_c);
        renderRatio(data.ratio_validation);
        renderClustering(data.clustering_result);
        renderPackages(data.packages, budget);

        // open all sections
        ['sec-1','sec-2','sec-3','sec-4','sec-5','sec-6'].forEach(id => {
            document.getElementById(id).classList.add('open');
        });

        document.getElementById('results-all').scrollIntoView({ behavior:'smooth', block:'start' });

    } catch(e) {
        hideLoading();
        showError('Koneksi gagal: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Jalankan Simulasi';
    }
});