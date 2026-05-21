<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Sistem Rekomendasi Paket Wisata Malang Raya — pilih workflow sesuai kebutuhanmu." />
    <title>Rekomendasi Wisata — Malang Raya AI</title>

    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />

    <meta name="csrf-token" content="{{ csrf_token() }}" />

    <link rel="stylesheet" href="{{ asset('assets/css/recom.css') }}" />
</head>
<body>

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <a class="g-nav-brand" href="/">Malang Raya</a>
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link active" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link" href="/directory">Directory</a>
                </div>
                <div class="g-nav-right">
                    <a href="/how-it-works" class="g-nav-btn">Cara Kerja AI</a>
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
                            <div class="input-wrap">
                                <span class="input-prefix">
                                    <span class="material-symbols-outlined">payments</span>
                                    <span class="input-prefix-text">Rp</span>
                                </span>
                                <input type="text" class="form-input" id="b-budget" placeholder="Contoh: 3.000.000" autocomplete="off" required />
                            </div>
                            <span class="form-hint">Budget total untuk seluruh perjalanan (akomodasi + wisata + kuliner + transport)</span>
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
                        <div class="form-group">
                            <label class="form-label">
                                <span class="material-symbols-outlined">location_on</span>
                                Pilih Destinasi Wisata <span class="req">*</span>
                            </label>
                            <select class="form-input form-input-select no-prefix" id="d-dest-id" required>
                                <option value="">— Pilih destinasi wisata —</option>
                                @foreach($wisataList as $w)
                                    <option value="{{ $w['Id_Tempat'] }}">{{ $w['Nama_Tempat'] }}</option>
                                @endforeach
                            </select>
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
                        <div class="form-group">
                            <label class="form-label">
                                <span class="material-symbols-outlined">payments</span>
                                Budget Total <span style="color:var(--slate-400);font-weight:500">(Opsional)</span>
                            </label>
                            <div class="input-wrap">
                                <span class="input-prefix">
                                    <span class="material-symbols-outlined">payments</span>
                                    <span class="input-prefix-text">Rp</span>
                                </span>
                                <input type="text" class="form-input" id="d-budget" placeholder="Kosongkan untuk Kondisi A (tanpa budget)" autocomplete="off" />
                            </div>
                            <span class="form-hint">Jika diisi → validasi budget real-time (Kondisi B). Jika kosong → eksplorasi harga (Kondisi A).</span>
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

<script src="{{ asset('assets/js/recom.js') }}"></script>
</body>
</html>
