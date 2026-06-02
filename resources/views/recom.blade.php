<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Sistem Rekomendasi Paket Wisata Malang Raya — pilih workflow sesuai kebutuhanmu." />
    <title>Rekomendasi Wisata — Malang Raya AI</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />

    <meta name="csrf-token" content="{{ csrf_token() }}" />

    <link rel="stylesheet" href="{{ asset('assets/css/recom.css') }}" />
</head>
<body>

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link active" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
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
            <a class="g-mobile-link active" href="/recommender">Explore</a>
            <a class="g-mobile-link" href="/how-it-works">How It Works</a>
            <a class="g-mobile-link" href="/directory">Directory</a>
        </div>
    </div>

    <main class="recom-page">

        <!-- Hero -->
        <div class="recom-hero">
            <div class="recom-hero-badge">
                <span class="material-symbols-outlined" style="font-size:16px">auto_awesome</span>
                FCM Clustering Intelligence
            </div>
            <h1>Rencanakan Perjalanan<br /><span>Impian Anda</span></h1>
            <p>Tiga workflow cerdas berbasis Fuzzy C-Means — pilih sesuai kebutuhan perjalananmu ke Malang Raya.</p>
        </div>

        <!-- Main content -->
        <div class="workflow-section">

            <!-- Workflow Tabs -->
            <div class="workflow-tabs" id="workflow-tabs">
                <button class="wf-tab active" data-wf="budget" id="tab-budget">
                    <span class="material-symbols-outlined tab-icon">account_balance_wallet</span>
                    <span class="tab-label">Budget-First</span>
                    <span class="tab-sub">Punya anggaran, ingin paket paling optimal</span>
                </button>
                <button class="wf-tab" data-wf="flexible" id="tab-flexible">
                    <span class="material-symbols-outlined tab-icon">explore</span>
                    <span class="tab-label">Flexible Explore</span>
                    <span class="tab-sub">Belum punya budget, ingin lihat pilihan</span>
                </button>
                <button class="wf-tab" data-wf="destination" id="tab-destination">
                    <span class="material-symbols-outlined tab-icon">location_on</span>
                    <span class="tab-label">Destination-First</span>
                    <span class="tab-sub">Sudah ada destinasi, optimalkan sisanya</span>
                </button>
            </div>

            <!-- ═══ FORM CARD ═══ -->
            <div class="form-card" id="main-card">

                <!-- ── BUDGET-FIRST FORM ── -->
                <div id="wf-budget" class="wf-panel">
                    <div class="form-card-header">
                        <div class="form-card-icon"><span class="material-symbols-outlined">calculate</span></div>
                        <div>
                            <div class="form-card-title">Budget-First Workflow</div>
                            <div class="form-card-sub">Masukkan total anggaran → AI menemukan paket Hemat / Balanced / Premium</div>
                        </div>
                    </div>
                    <div class="wf-info-box">
                        <span class="material-symbols-outlined">info</span>
                        <span>FCM akan dijalankan secara <strong>real-time</strong> menggunakan budgetmu sebagai anchor centroid (0.6× Hemat, 1.0× Balanced, 1.4× Premium). Tiga paket terbaik akan ditampilkan.</span>
                    </div>
                    <form class="form-body" id="form-budget" novalidate>
                        <div class="form-group">
                            <label class="form-label">
                                <span class="material-symbols-outlined">payments</span>
                                Total Anggaran <span class="req">*</span>
                            </label>
                            <div class="ota-slider-container">
                                <div class="ota-slider-header" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                                    <span class="ota-slider-val" id="b-budget-val">Rp 1.000.000</span>
                                    <div class="manual-input-wrapper">
                                        <span class="manual-currency">Rp</span>
                                        <input type="number" id="b-budget-manual" class="budget-manual-input" placeholder="Input manual" />
                                    </div>
                                </div>
                                <input type="range" class="ota-slider-input" id="b-budget" min="100000" max="10000000" step="50000" value="1000000" />
                                <div class="ota-slider-labels">
                                    <span id="b-budget-min-label">Min: Rp 100.000</span>
                                    <span id="b-budget-max-label">Max: Rp 10.000.000</span>
                                </div>
                            </div>
                            <span class="form-hint">Geser untuk mengatur budget total perjalanan (akomodasi + wisata + kuliner + transport)</span>
                            <div id="b-warning-box" class="budget-warning-box" style="display:none;"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">group</span>
                                    Jumlah Peserta <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="b-persons-minus">−</button>
                                    <input type="number" class="counter-input" id="b-persons" value="2" min="1" max="20" />
                                    <button type="button" class="counter-btn" id="b-persons-plus">+</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                    Durasi (Hari) <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="b-duration-minus">−</button>
                                    <input type="number" class="counter-input" id="b-duration" value="2" min="1" max="30" />
                                    <button type="button" class="counter-btn" id="b-duration-plus">+</button>
                                </div>
                            </div>
                        </div>

                        <!-- Moda Transportasi (Hybrid Selection) -->
                        <div class="form-group" style="margin-top: 4px;">
                            <label class="form-label">
                                <span class="material-symbols-outlined">directions_car</span>
                                Moda Transportasi
                            </label>
                            <select class="form-input form-input-select no-prefix" id="b-transport">
                                <option value="">Otomatis (Rekomendasi Sesuai Peserta)</option>
                                <option value="motor">Motor (GoRide — Maks. 1 orang)</option>
                                <option value="mobil">Mobil Standard (GoCar — Maks. 4 orang)</option>
                                <option value="mobil_xl">Mobil XL (GoCar XL — Maks. 6 orang)</option>
                            </select>
                            <span class="form-hint">Pilih kustomisasi moda transportasi atau biarkan otomatis dioptimalkan AI</span>
                            <div id="b-capacity-warning" class="budget-warning-box" style="display:none;"></div>
                        </div>

                        <!-- Kebijakan Akomodasi (Stay Policy) -->
                        <div class="form-group" id="b-hotel-mode-group" style="margin-top: 4px; display: none;">
                            <label class="form-label">
                                <span class="material-symbols-outlined">hotel_class</span>
                                Kebijakan Akomodasi
                            </label>
                            <select class="form-input form-input-select no-prefix" id="b-hotel-mode">
                                <option value="same">Tetap di Hotel yang Sama (Rekomendasi Utama)</option>
                                <option value="split">Pindah Hotel Setiap Malam (Eksplorasi Variatif)</option>
                            </select>
                            <span class="form-hint">Pilih apakah ingin menginap di satu hotel saja atau mencoba hotel berbeda setiap malam</span>
                        </div>

                        <!-- Auto Calc Panel -->
                        <div class="budget-calc-panel" id="b-calc-panel">
                            <div class="calc-item">
                                <div class="calc-label">Budget/Orang</div>
                                <div class="calc-val" id="b-per-person">Rp 0</div>
                            </div>
                            <div class="calc-item">
                                <div class="calc-label">Kamar Hotel</div>
                                <div class="calc-val" id="b-rooms">1 kamar</div>
                            </div>
                            <div class="calc-item">
                                <div class="calc-label">Total Makan</div>
                                <div class="calc-val" id="b-meals">12 kali</div>
                            </div>
                        </div>

                        <button type="submit" class="submit-btn" id="b-submit">
                            <span class="material-symbols-outlined">search</span>
                            <span>Cari Paket Wisata</span>
                        </button>
                    </form>
                </div>

                <!-- ── FLEXIBLE FORM ── -->
                <div id="wf-flexible" class="wf-panel" style="display:none">
                    <div class="form-card-header">
                        <div class="form-card-icon" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed)">
                            <span class="material-symbols-outlined">explore</span>
                        </div>
                        <div>
                            <div class="form-card-title">Flexible Exploration Workflow</div>
                            <div class="form-card-sub">Tanpa budget → lihat estimasi rentang harga paket wisata Malang Raya</div>
                        </div>
                    </div>
                    <div class="wf-info-box" style="background:#f5f3ff;border-color:#ddd6fe;color:#7c3aed">
                        <span class="material-symbols-outlined">info</span>
                        <span>Sistem menggunakan <strong>Offline FCM</strong> berbasis persentil dataset (Q1/Median/Q3). Kamu akan melihat estimasi biaya paket Hemat, Balanced, dan Premium untuk merencanakan budget.</span>
                    </div>
                    <form class="form-body" id="form-flexible" novalidate>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">group</span>
                                    Jumlah Peserta <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="f-persons-minus">−</button>
                                    <input type="number" class="counter-input" id="f-persons" value="2" min="1" max="20" />
                                    <button type="button" class="counter-btn" id="f-persons-plus">+</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                    Durasi (Hari) <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="f-duration-minus">−</button>
                                    <input type="number" class="counter-input" id="f-duration" value="2" min="1" max="30" />
                                    <button type="button" class="counter-btn" id="f-duration-plus">+</button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="submit-btn" id="f-submit" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);box-shadow:0 4px 16px rgba(124,58,237,.3)">
                            <span class="material-symbols-outlined">travel_explore</span>
                            <span>Jelajahi Pilihan Paket</span>
                        </button>
                    </form>
                </div>

                <!-- ── DESTINATION-FIRST FORM ── -->
                <div id="wf-destination" class="wf-panel" style="display:none">
                    <div class="form-card-header">
                        <div class="form-card-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
                            <span class="material-symbols-outlined">location_on</span>
                        </div>
                        <div>
                            <div class="form-card-title">Destination-First Workflow</div>
                            <div class="form-card-sub">Kunci 1 destinasi wisata → AI optimalkan hotel & kuliner pendukungnya</div>
                        </div>
                    </div>
                    <div class="wf-info-box" style="background:#fffbeb;border-color:#fde68a;color:#b45309">
                        <span class="material-symbols-outlined">info</span>
                        <span>Sistem mengunci destinasi pilihanmu, lalu menjalankan FCM untuk hotel dan kuliner. Jika budget diisi, sistem memvalidasi apakah paket sesuai anggaran (Kondisi B). Tanpa budget → eksplorasi 3 tingkat harga (Kondisi A).</span>
                    </div>
                    <form class="form-body" id="form-destination" novalidate>
                        <div class="form-group" style="position: relative;">
                            <label class="form-label">
                                <span class="material-symbols-outlined">location_on</span>
                                Cari Destinasi Wisata <span class="req">*</span>
                            </label>
                            <input type="text" class="form-input" id="d-dest-search-input" placeholder="Ketik nama wisata (contoh: Jatim Park)..." autocomplete="off" required style="width: 100%; box-sizing: border-box;" />
                            <input type="hidden" id="d-dest-id" name="dest_id" required />
                            <div class="search-autocomplete-dropdown" id="d-dest-autocomplete-dropdown" style="
                                position: absolute;
                                top: 100%; left: 0; right: 0;
                                background: #fff;
                                border: 1.5px solid var(--slate-200);
                                border-radius: 12px;
                                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
                                z-index: 1000;
                                max-height: 280px;
                                overflow-y: auto;
                                margin-top: 4px;
                            "></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">group</span>
                                    Jumlah Peserta <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="d-persons-minus">−</button>
                                    <input type="number" class="counter-input" id="d-persons" value="2" min="1" max="20" />
                                    <button type="button" class="counter-btn" id="d-persons-plus">+</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <span class="material-symbols-outlined">calendar_month</span>
                                    Durasi (Hari) <span class="req">*</span>
                                </label>
                                <div class="counter-wrap">
                                    <button type="button" class="counter-btn" id="d-duration-minus">−</button>
                                    <input type="number" class="counter-input" id="d-duration" value="2" min="1" max="30" />
                                    <button type="button" class="counter-btn" id="d-duration-plus">+</button>
                                </div>
                            </div>
                        </div>

                        <!-- Moda Transportasi (Hybrid Selection) -->
                        <div class="form-group" style="margin-top: 4px;">
                            <label class="form-label">
                                <span class="material-symbols-outlined">directions_car</span>
                                Moda Transportasi
                            </label>
                            <select class="form-input form-input-select no-prefix" id="d-transport">
                                <option value="">Otomatis (Rekomendasi Sesuai Peserta)</option>
                                <option value="motor">Motor (GoRide — Maks. 1 orang)</option>
                                <option value="mobil">Mobil Standard (GoCar — Maks. 4 orang)</option>
                                <option value="mobil_xl">Mobil XL (GoCar XL — Maks. 6 orang)</option>
                            </select>
                            <span class="form-hint">Pilih kustomisasi moda transportasi atau biarkan otomatis dioptimalkan AI</span>
                            <div id="d-capacity-warning" class="budget-warning-box" style="display:none;"></div>
                        </div>

                        <!-- Kebijakan Akomodasi (Stay Policy) -->
                        <div class="form-group" id="d-hotel-mode-group" style="margin-top: 4px; display: none;">
                            <label class="form-label">
                                <span class="material-symbols-outlined">hotel_class</span>
                                Kebijakan Akomodasi
                            </label>
                            <select class="form-input form-input-select no-prefix" id="d-hotel-mode">
                                <option value="same">Tetap di Hotel yang Sama (Rekomendasi Utama)</option>
                                <option value="split">Pindah Hotel Setiap Malam (Eksplorasi Variatif)</option>
                            </select>
                            <span class="form-hint">Pilih apakah ingin menginap di satu hotel saja atau mencoba hotel berbeda setiap malam</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <span class="material-symbols-outlined">payments</span>
                                Budget Total <span style="color:var(--slate-400);font-weight:500">(Opsional)</span>
                            </label>
                            <div class="ota-slider-container">
                                <div class="ota-slider-header" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;">
                                    <span class="ota-slider-val" id="d-budget-val">Tanpa Batasan Anggaran (Kondisi A)</span>
                                    <div class="manual-input-wrapper">
                                        <span class="manual-currency">Rp</span>
                                        <input type="number" id="d-budget-manual" class="budget-manual-input" placeholder="Input manual" />
                                    </div>
                                </div>
                                <input type="range" class="ota-slider-input" id="d-budget" min="100000" max="10000000" step="50000" value="0" />
                                <div class="ota-slider-labels">
                                    <span id="d-budget-min-label">Tanpa Budget / Min: Rp 100.000</span>
                                    <span id="d-budget-max-label">Max: Rp 10.000.000</span>
                                </div>
                            </div>
                            <span class="form-hint">Geser untuk memvalidasi budget (Kondisi B), atau geser mentok kiri untuk eksplorasi bebas (Kondisi A)</span>
                            <div id="d-warning-box" class="budget-warning-box" style="display:none;"></div>
                        </div>
                        <button type="submit" class="submit-btn" id="d-submit" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 16px rgba(245,158,11,.3)">
                            <span class="material-symbols-outlined">search</span>
                            <span>Cari Paket Wisata</span>
                        </button>
                    </form>
                </div>

                <!-- ── LOADING ── -->
                <div class="loading-overlay" id="loading-overlay">
                    <div class="loading-ring"></div>
                    <div class="loading-title">AI Sedang Menganalisis...</div>
                    <p style="font-size:13px;color:var(--slate-500)">Fuzzy C-Means Clustering sedang bekerja</p>
                    <div class="loading-steps">
                        <div class="loading-step active" id="ls-1">
                            <span class="material-symbols-outlined">database</span> Memuat dataset destinasi
                        </div>
                        <div class="loading-step" id="ls-2">
                            <span class="material-symbols-outlined">hub</span> Menjalankan algoritma FCM
                        </div>
                        <div class="loading-step" id="ls-3">
                            <span class="material-symbols-outlined">route</span> Menghitung biaya transportasi
                        </div>
                        <div class="loading-step" id="ls-4">
                            <span class="material-symbols-outlined">verified</span> Memvalidasi & meranking paket
                        </div>
                    </div>
                </div>

                <!-- ── ERROR ── -->
                <div class="error-box" id="error-box">
                    <span class="material-symbols-outlined">error</span>
                    <div>
                        <strong>Terjadi Kesalahan</strong>
                        <div id="error-msg" style="margin-top:4px"></div>
                    </div>
                </div>

                <!-- ── RESULTS ── -->
                <div class="results-section" id="results-section">
                    <div class="results-header-bar">
                        <div>
                            <div class="results-badge">
                                <span class="material-symbols-outlined" style="font-size:14px">check_circle</span>
                                Rekomendasi Ditemukan
                            </div>
                            <div class="results-title" id="results-title">Paket Wisata untuk Anda</div>
                            <div class="results-sub" id="results-sub">Berdasarkan input Anda</div>
                        </div>
                        <button class="reset-btn" id="reset-btn">
                            <span class="material-symbols-outlined" style="font-size:18px">refresh</span>
                            Coba Lagi
                        </button>
                    </div>
                    
                    <!-- Dual-Mode Selector (Otomatis vs Kustom) -->
                    <div class="mode-toggle-container" id="mode-toggle-container" style="display: none;">
                        <button class="mode-btn active" id="mode-btn-auto">
                            <span class="material-symbols-outlined">auto_awesome</span>
                            <span>Mode Otomatis (Paket AI)</span>
                        </button>
                        <button class="mode-btn" id="mode-btn-custom">
                            <span class="material-symbols-outlined">architecture</span>
                            <span>Mode Kustom (Rancang Sendiri)</span>
                        </button>
                    </div>

                    <!-- Dynamic Multi-Option Tabs (Centroid Proximity Projections) -->
                    <div class="options-tabs-container" id="options-tabs-container" style="display: none;">
                        <div class="options-tabs-label">
                            <span class="material-symbols-outlined" style="font-size:16px;color:var(--teal-500);">auto_awesome</span>
                            Pilihan Alternatif Paket Wisata:
                        </div>
                        <div class="options-tabs" id="options-tabs">
                            <!-- Injected dynamically via recom.js -->
                        </div>
                    </div>
                    <!-- Interactive Day-by-Day Selection Board (Wizard) -->
                    <div class="planner-wizard-container" id="planner-wizard-container" style="display: none;"></div>
                    <div class="packages-grid" id="packages-grid"></div>
                </div>

            </div><!-- /form-card -->
        </div><!-- /workflow-section -->
    </main>

    <!-- ===================== FOOTER ===================== -->
    <footer class="g-footer light">
        <div class="g-footer-inner">
            <div>
                <span class="g-footer-brand">Malang Raya</span>
                <p class="g-footer-copy">© 2026 Sistem Rekomendasi Wisata. Intelligence by FCM Clustering.</p>
            </div>
            <div class="g-footer-links">
                <a class="g-footer-link" href="/how-it-works">Cara Kerja AI</a>
                <a class="g-footer-link" href="/directory">Directory</a>
            </div>
        </div>
    </footer>

    <!-- ROUTE DETAIL MODAL -->
    <div class="modal-overlay" id="route-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Detail & Rute Perjalanan</h3>
                <button class="modal-close" id="modal-close-btn"><span class="material-symbols-outlined" style="font-size:24px">close</span></button>
            </div>
            <div class="modal-body" id="modal-body-content">
                <!-- Injected via JS -->
            </div>
        </div>
    </div>

    <!-- BOOKMARK DRAWER (CART) -->
    <div class="bookmark-drawer-overlay" id="bookmark-drawer-overlay"></div>
    <div class="bookmark-drawer" id="bookmark-drawer">
        <div class="drawer-header">
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="material-symbols-outlined" style="color:var(--teal-600); font-size:24px;">bookmarks</span>
                <h3 style="margin:0; font-size:18px; font-weight:800; color:var(--slate-800);">Rencana Perjalanan Saya</h3>
            </div>
            <button class="drawer-close-btn" id="drawer-close-btn">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="drawer-body" id="bookmark-drawer-body">
            <!-- Dynamically populated via JS from localStorage -->
            <div class="empty-drawer-state">
                <span class="material-symbols-outlined" style="font-size:48px; color:var(--slate-300); margin-bottom:12px;">shopping_bag</span>
                <p style="margin:0; color:var(--slate-400); font-size:14px; font-weight:500;">Belum ada rencana perjalanan yang disimpan.</p>
                <p style="margin:4px 0 0; color:var(--slate-400); font-size:12px;">Gunakan alur kerja pencarian untuk merancang rute perjalanan kustom Anda.</p>
            </div>
        </div>
    </div>

    <script>
        window.wisataCatalog = {!! json_encode($wisataList) !!};
    </script>
<script src="{{ asset('assets/js/recom.js') }}"></script>
@include('auth-modal-and-dropdown')
</body>
</html>
