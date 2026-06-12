<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Cara kerja algoritma Fuzzy C-Means — simulasi interaktif pipeline FCM secara lengkap." />
    <title>How It Works — FCM Pipeline Visualizer</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />

    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/how-it-works.css') }}" />
</head>
<body>
    @include('preloader')

    <!-- ── NAVBAR ── -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar dark" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link active" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/directory">Directory</a>
                </div>
                <div class="g-nav-right">
                    <button class="g-nav-bookmark-btn" id="nav-bookmark-btn" title="Rencana Perjalanan Saya">
                        <span class="material-symbols-outlined">bookmarks</span>
                        <span class="bookmark-label">Rencana Saya</span>
                        <span class="bookmark-badge" id="bookmark-badge-count">0</span>
                    </button>
                    <div id="nav-profile-container" style="display: flex; align-items: center;"></div>
                    <button class="g-nav-hamburger" id="hamburger-btn">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </nav>
        <div class="g-mobile-menu" id="mobile-menu">
            <a class="g-mobile-link" href="/">Home</a>
            <a class="g-mobile-link" href="/recommender">Explore</a>
            <a class="g-mobile-link active" href="/how-it-works">How It Works</a>
            <a class="g-mobile-link" href="/directory">Directory</a>
        </div>
    </div>

    <!-- ── HERO ── -->
    <div class="hiw-hero">
        <div class="hiw-badge"><span class="material-symbols-outlined" style="font-size:16px">science</span> FCM Pipeline Visualizer</div>
        <h1>Cara Kerja<br /><span>Algoritma FCM</span></h1>
        <p>Simulasikan pipeline lengkap Fuzzy C-Means secara real-time. Lihat setiap langkah — dari dataset, XBI validation, hingga paket rekomendasi akhir.</p>
    </div>


    <!-- ── INPUT PANEL ── -->
    <div class="sim-panel">
        <div class="input-card">
            <div class="input-card-title">
                <span class="material-symbols-outlined">tune</span>
                Parameter Simulasi
            </div>
            <div class="input-fields">
                <div class="inp-group">
                    <label>Total Budget</label>
                    <div class="inp-wrap">
                        <span class="inp-prefix">Rp</span>
                        <input type="text" class="sim-input" id="sim-budget" value="3.000.000" />
                    </div>
                </div>
                <div class="inp-group">
                    <label>Peserta</label>
                    <div class="inp-wrap counter-ctrl">
                        <button class="cc-btn" id="sp-minus">−</button>
                        <input type="number" class="sim-input" id="sim-persons" value="2" min="1" max="20" style="text-align:center;width:60px;flex:unset" />
                        <button class="cc-btn" id="sp-plus">+</button>
                    </div>
                </div>
                <div class="inp-group">
                    <label>Durasi (Hari)</label>
                    <div class="inp-wrap counter-ctrl">
                        <button class="cc-btn" id="sd-minus">−</button>
                        <input type="number" class="sim-input" id="sim-duration" value="2" min="1" max="30" style="text-align:center;width:60px;flex:unset" />
                        <button class="cc-btn" id="sd-plus">+</button>
                    </div>
                </div>
                <button class="run-btn" id="run-btn">
                    <span class="material-symbols-outlined">play_arrow</span>
                    Jalankan Simulasi
                </button>
            </div>
        </div>
    </div>

    <!-- ── CONTENT ── -->
    <div class="hiw-content">

        <!-- GLOBAL LOADING -->
        <div class="global-loading" id="global-loading">
            <div class="loading-ring"></div>
            <div style="font-size:18px;font-weight:800">Menjalankan Pipeline FCM...</div>
            <p style="font-size:13px;color:var(--slate-400)">Python sedang bekerja. Estimasi 5–15 detik.</p>
            <div class="loading-steps-list">
                <div class="ls active" id="sl-1"><span class="material-symbols-outlined">database</span> Memuat & menganalisis dataset</div>
                <div class="ls" id="sl-2"><span class="material-symbols-outlined">hub</span> Menghitung XBI untuk c=2,3,4,5</div>
                <div class="ls" id="sl-3"><span class="material-symbols-outlined">bar_chart</span> Validasi 5 skema ratio centroid</div>
                <div class="ls" id="sl-4"><span class="material-symbols-outlined">cluster</span> Clustering final + transportasi</div>
                <div class="ls" id="sl-5"><span class="material-symbols-outlined">verified</span> Menyiapkan visualisasi</div>
            </div>
        </div>

        <!-- ERROR -->
        <div id="global-error" style="display:none;max-width:860px;margin:0 auto 32px;background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.3);border-radius:14px;padding:20px;display:none;gap:12px;align-items:flex-start">
            <span class="material-symbols-outlined" style="color:var(--rose-500);font-size:22px">error</span>
            <div>
                <div style="font-weight:800;color:var(--rose-500)">Simulasi Gagal</div>
                <div id="global-error-msg" style="font-size:13px;color:var(--slate-400);margin-top:4px"></div>
            </div>
        </div>

        <!-- RESULTS WRAPPER (hidden until run) -->
        <div id="results-all" style="display:none">

            <!-- ── STEP 1: Dataset Stats ── -->
            <div class="viz-section s1 open" id="sec-1">
                <div class="viz-section-head" onclick="toggleSection('sec-1')">
                    <div class="viz-step-num">1</div>
                    <div>
                        <div class="viz-step-title">Statistik Dataset</div>
                        <div class="viz-step-sub">Distribusi harga destinasi wisata, hotel, dan kuliner di Malang Raya</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-1">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">bar_chart</span>
                        <p>Jalankan simulasi untuk melihat statistik dataset.</p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 2: Budget Allocation ── -->
            <div class="viz-section s2 open" id="sec-2">
                <div class="viz-section-head" onclick="toggleSection('sec-2')">
                    <div class="viz-step-num">2</div>
                    <div>
                        <div class="viz-step-title">Alokasi Budget & Anchor Centroid</div>
                        <div class="viz-step-sub">Distribusi budget ke 4 komponen + inisialisasi centroid 0.5×/1.0×/1.5×</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-2">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">account_balance_wallet</span>
                        <p>Jalankan simulasi untuk melihat alokasi budget.</p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 3: XBI per c ── -->
            <div class="viz-section s3 open" id="sec-3">
                <div class="viz-section-head" onclick="toggleSection('sec-3')">
                    <div class="viz-step-num">3</div>
                    <div>
                        <div class="viz-step-title">Validasi Xie-Beni Index (c = 2,3,4,5)</div>
                        <div class="viz-step-sub">Mencari jumlah klaster optimal — nilai XBI terkecil = klaster terbaik</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-3">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">functions</span>
                        <p>Jalankan simulasi untuk melihat tabel XBI.</p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 4: Ratio Validation ── -->
            <div class="viz-section s4" id="sec-4">
                <div class="viz-section-head" onclick="toggleSection('sec-4')">
                    <div class="viz-step-num">4</div>
                    <div>
                        <div class="viz-step-title">Validasi 5 Skema Rasio Centroid (A–E)</div>
                        <div class="viz-step-sub">Membandingkan kualitas clustering untuk skema 0.5×–2.0×</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-4">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">tune</span>
                        <p>Jalankan simulasi untuk melihat validasi skema rasio.</p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 5: Clustering Result ── -->
            <div class="viz-section s5" id="sec-5">
                <div class="viz-section-head" onclick="toggleSection('sec-5')">
                    <div class="viz-step-num">5</div>
                    <div>
                        <div class="viz-step-title">Hasil Clustering Akhir (c=3, Skema A)</div>
                        <div class="viz-step-sub">Distribusi Hemat / Balanced / Premium per kategori data</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-5">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">scatter_plot</span>
                        <p>Jalankan simulasi untuk melihat hasil clustering.</p>
                    </div>
                </div>
            </div>

            <!-- ── STEP 6: Recommendation Packages ── -->
            <div class="viz-section s1" id="sec-6">
                <div class="viz-section-head" onclick="toggleSection('sec-6')">
                    <div class="viz-step-num">6</div>
                    <div>
                        <div class="viz-step-title">Hasil Rekomendasi Paket Wisata</div>
                        <div class="viz-step-sub">Output akhir: paket Hemat / Balanced / Premium sesuai budget simulasi</div>
                    </div>
                    <span class="material-symbols-outlined viz-section-chevron">expand_more</span>
                </div>
                <div class="viz-body" id="body-6">
                    <div class="placeholder-box">
                        <span class="material-symbols-outlined">luggage</span>
                        <p>Jalankan simulasi untuk melihat rekomendasi paket.</p>
                    </div>
                </div>
            </div>

        </div><!-- /results-all -->
    </div><!-- /hiw-content -->

<script src="{{ asset('assets/js/how-it-works.js') }}"></script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
