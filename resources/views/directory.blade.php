<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Eksplorasi seluruh direktori pariwisata Malang Raya — wisata, hotel, dan kuliner terkurasi AI." />
    <title>Direktori Destinasi — Malang Raya Tourism</title>
    <link rel="icon" type="image/png" href="{{ asset('assets/GAMBAR/logo-tree.png') }}" />

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-2.js') }}" defer></script>

    <link rel="stylesheet" href="{{ asset('assets/css/directory-custom.css') }}" />
</head>
<body>
    @include('preloader')

    <!-- ===================== NAVBAR ===================== -->
    <div class="g-nav-wrapper" id="main-nav-wrapper">
        <nav class="g-navbar light" id="main-navbar">
            <div class="g-navbar-inner">
                <!-- Brand -->
                <a class="g-nav-brand" href="/"><img src="{{ asset('assets/GAMBAR/logo-tree.png') }}" alt="Logo" />Malang Raya</a>

                <!-- Center Links -->
                <div class="g-nav-center">
                    <a class="g-nav-link" href="/">Home</a>
                    <a class="g-nav-link" href="/recommender">Explore</a>
                    <a class="g-nav-link" href="/how-it-works">How It Works</a>
                    <a class="g-nav-link active" href="/directory">Directory</a>
                </div>

                <!-- Right Actions -->
                <div class="g-nav-right">
                    <button class="g-nav-bookmark-btn" id="nav-bookmark-btn" title="Rencana Perjalanan Saya">
                        <span class="material-symbols-outlined">bookmarks</span>
                        <span class="bookmark-label">Rencana Saya</span>
                        <span class="bookmark-badge" id="bookmark-badge-count">0</span>
                    </button>
                    <div id="nav-profile-container" style="display: flex; align-items: center;"></div>
                    <button class="g-nav-hamburger" id="hamburger-btn" aria-label="Menu">
                        <span class="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </div>
        </nav>
        <!-- Mobile Menu -->
        <div class="g-mobile-menu" id="mobile-menu">
            <a class="g-mobile-link" href="/">Home</a>
            <a class="g-mobile-link" href="/recommender">Explore</a>
            <a class="g-mobile-link" href="/how-it-works">How It Works</a>
            <a class="g-mobile-link active" href="/directory">Directory</a>
        </div>
    </div>

    <main>
        <!-- ===================== EXPLORER BANNER ===================== -->
        <section class="ota-catalog-section" style="padding-bottom: 0; padding-top: 4rem;">
            <div class="gallery-header reveal">
                <h1 class="section-title" style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; margin-bottom: 0.5rem;">
                    Direktori <span class="section-title-accent">Eksplorasi</span>
                </h1>
                <p class="section-subtitle" style="margin: 0; text-align: left;">Jelajahi seluruh daftar tempat wisata, hotel, dan kuliner terkurasi di wilayah Malang Raya.</p>
            </div>
        </section>

        <!-- ===================== MAIN GRID LAYOUT ===================== -->
        <div class="directory-layout">
            
            <!-- SIDEBAR FILTERS -->
            <aside class="filter-sidebar reveal">
                
                <!-- Filter Section: Search -->
                <div class="filter-section">
                    <div class="filter-title">
                        <span class="material-symbols-outlined">search</span>
                        Cari Nama
                    </div>
                    <div class="sidebar-search-wrap">
                        <span class="material-symbols-outlined sidebar-search-icon">search</span>
                        <input type="text" placeholder="Ketik nama tempat..." id="dir-search-input" autocomplete="off" />
                    </div>
                </div>

                <!-- Filter Section: Category -->
                <div class="filter-section">
                    <div class="filter-title">
                        <span class="material-symbols-outlined">category</span>
                        Kategori
                    </div>
                    <div class="filter-btn-group">
                        <button class="filter-opt-btn active" data-cat="Semua">
                            <span class="material-symbols-outlined">explore</span>
                            Semua Kategori
                        </button>
                        <button class="filter-opt-btn" data-cat="Wisata">
                            <span class="material-symbols-outlined">landscape</span>
                            Wisata 🌲
                        </button>
                        <button class="filter-opt-btn" data-cat="Hotel">
                            <span class="material-symbols-outlined">hotel</span>
                            Hotel 🏨
                        </button>
                        <button class="filter-opt-btn" data-cat="Kuliner">
                            <span class="material-symbols-outlined">restaurant</span>
                            Kuliner 🍜
                        </button>
                    </div>
                </div>

                <!-- Filter Section: Location -->
                <div class="filter-section">
                    <div class="filter-title">
                        <span class="material-symbols-outlined">location_on</span>
                        Wilayah
                    </div>
                    <div class="filter-btn-group">
                        <button class="filter-opt-btn active" data-loc="Semua">
                            <span class="material-symbols-outlined">map</span>
                            Semua Wilayah
                        </button>
                        <button class="filter-opt-btn" data-loc="Batu">
                            <span class="material-symbols-outlined">terrain</span>
                            Kota Batu
                        </button>
                        <button class="filter-opt-btn" data-loc="Kota Malang">
                            <span class="material-symbols-outlined">location_city</span>
                            Kota Malang
                        </button>
                        <button class="filter-opt-btn" data-loc="Kab. Malang">
                            <span class="material-symbols-outlined">nature_people</span>
                            Kab. Malang
                        </button>
                    </div>
                </div>

                <!-- Filter Section: Estimasi Harga -->
                <div class="filter-section">
                    <div class="filter-title">
                        <span class="material-symbols-outlined">payments</span>
                        Estimasi Harga
                    </div>
                    <div class="filter-btn-group" id="price-tier-group">
                        <button class="filter-opt-btn active" data-price-tier="Semua">
                            <span class="material-symbols-outlined">sell</span>
                            <span>Semua Harga</span>
                        </button>
                        <button class="filter-opt-btn" data-price-tier="Hemat">
                            <span class="material-symbols-outlined">savings</span>
                            <span class="tier-label" id="tier-label-hemat">Hemat (< Rp 50k)</span>
                        </button>
                        <button class="filter-opt-btn" data-price-tier="Menengah">
                            <span class="material-symbols-outlined">account_balance_wallet</span>
                            <span class="tier-label" id="tier-label-menengah">Menengah (50k - 250k)</span>
                        </button>
                        <button class="filter-opt-btn" data-price-tier="Premium">
                            <span class="material-symbols-outlined">diamond</span>
                            <span class="tier-label" id="tier-label-premium">Premium (> Rp 250k)</span>
                        </button>
                    </div>
                    
                    <!-- Custom Price Range Inputs -->
                    <div style="margin-top: 1.25rem;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-slate-500); text-transform: uppercase; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.25rem;">
                            <span class="material-symbols-outlined" style="font-size: 14px;">tune</span>
                            Rentang Kustom (Rp)
                        </div>
                        <div class="price-range-inputs">
                            <input type="text" id="price-min-input" placeholder="Min" class="price-input" autocomplete="off" />
                            <span style="color: var(--color-slate-400); font-size: 0.75rem;">-</span>
                            <input type="text" id="price-max-input" placeholder="Max" class="price-input" autocomplete="off" />
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button id="btn-apply-price" class="btn-price-action">
                                <span class="material-symbols-outlined" style="font-size: 14px;">check</span>
                                Terapkan
                            </button>
                            <button id="btn-clear-price" class="btn-price-action">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- EXPLORER GRID CONTENT -->
            <section class="reveal reveal-delay-1">
                <div class="results-header-row">
                    <div class="results-count shimmer-bg" id="results-count-label" style="width: 240px; height: 18px; border-radius: var(--radius-sm);"></div>
                    
                    <!-- Custom Premium Sorting Dropdown -->
                    <div class="custom-sort-dropdown" id="custom-sort-dropdown">
                        <button class="sort-trigger-btn" id="sort-trigger-btn" type="button" aria-expanded="false" aria-label="Urutkan Katalog">
                            <span class="material-symbols-outlined sort-icon">sort</span>
                            <span class="selected-sort-label" id="selected-sort-label">Rekomendasi</span>
                            <span class="material-symbols-outlined dropdown-arrow" id="sort-arrow">expand_more</span>
                        </button>
                        <ul class="sort-options-list" id="sort-options-list">
                            <li class="sort-opt-item active" data-value="default">
                                <span class="material-symbols-outlined opt-icon">auto_awesome</span>
                                Rekomendasi
                            </li>
                            <li class="sort-opt-item" data-value="price-asc">
                                <span class="material-symbols-outlined opt-icon">trending_up</span>
                                Harga: Terendah ↑
                            </li>
                            <li class="sort-opt-item" data-value="price-desc">
                                <span class="material-symbols-outlined opt-icon">trending_down</span>
                                Harga: Tertinggi ↓
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- CARDS GRID -->
                <div class="directory-grid" id="directory-grid">
                    <!-- Skeleton Shimmer Placeholders (will be cleared by JS renderGrid()) -->
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                    <div class="ota-shimmer-card">
                        <div class="ota-card-img-wrapper shimmer-bg"></div>
                        <div class="ota-card-body">
                            <div class="shimmer-line shimmer-subcat"></div>
                            <div class="shimmer-line shimmer-title"></div>
                            <div class="shimmer-line shimmer-price"></div>
                        </div>
                    </div>
                </div>

                <!-- PAGINATION CONTROLS -->
                <div class="pagination-container" id="pagination-controls">
                    <!-- Dynamic rendering by JS -->
                </div>
            </section>
        </div>
    </main>

    <!-- ===================== FOOTER ===================== -->
    <footer class="g-footer light">
        <div class="g-footer-inner">
            <div>
                <span class="g-footer-brand">Malang Raya</span>
                <p class="g-footer-copy">© 2024 Malang Raya Tourism Authority. Intelligence by FCM Clustering.</p>
            </div>
            <div class="g-footer-links">
                <span style="color:var(--color-slate-400); font-size:0.875rem;">Sistem Pendukung Keputusan</span>
                <a class="g-footer-link" href="/">Home</a>
                <a class="g-footer-link" href="/recommender">Explore</a>
                <a class="g-footer-link" href="/how-it-works">How It Works</a>
            </div>
        </div>
    </footer>

    <!-- ===================== PREMIUM DETAIL MODAL (SAME AS HOMEPAGE) ===================== -->
    <div class="ota-modal-overlay" id="ota-detail-modal">
        <div class="ota-modal-content">
            <div class="ota-modal-gallery">
                <button class="ota-modal-close-btn" onclick="closeOtaDetail()" aria-label="Close">
                    <span class="material-symbols-outlined">close</span>
                </button>
                
                <button class="ota-modal-gallery-nav prev" id="modal-gallery-prev" aria-label="Previous image">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
                
                <div class="ota-modal-gallery-track" id="modal-gallery-track">
                    <!-- Injected dynamically -->
                </div>
                
                <button class="ota-modal-gallery-nav next" id="modal-gallery-next" aria-label="Next image">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
                
                <div class="ota-modal-gallery-indicators" id="modal-gallery-indicators">
                    <!-- Injected dynamically -->
                </div>
            </div>
            
            <div class="ota-modal-body">
                <div class="ota-modal-header-row">
                    <div>
                        <h3 class="ota-modal-title" id="modal-place-title">Nama Tempat</h3>
                        <div class="ota-modal-badges">
                            <span class="ota-modal-badge" id="modal-place-cat">Wisata</span>
                            <span class="ota-modal-badge hotel-badge" id="modal-place-subcat">Nature</span>
                        </div>
                    </div>
                    <div class="ota-modal-rating-badge">
                        <span class="material-symbols-outlined">star</span>
                        <span id="modal-place-rating">4.8</span>
                    </div>
                </div>
                
                <div class="ota-modal-info-grid">
                    <div class="ota-modal-info-item">
                        <span class="ota-modal-info-label" id="modal-price-label">Tiket Masuk</span>
                        <span class="ota-modal-info-val" id="modal-place-price">Rp 15.000</span>
                    </div>
                    <div class="ota-modal-info-item">
                        <span class="ota-modal-info-label">Jumlah Ulasan</span>
                        <span class="ota-modal-info-val" id="modal-place-reviews">1.250 ulasan</span>
                    </div>
                </div>
                
                <div class="ota-modal-desc-box">
                    <p id="modal-place-desc">
                        Nikmati pesona alam Malang Raya yang memikat dengan fasilitas premium. Tempat ini dikurasi secara cerdas menggunakan Fuzzy C-Means Clustering untuk menjamin kepuasan kunjungan Anda.
                    </p>
                </div>
                
                <div class="ota-modal-actions">
                    <a href="#" target="_blank" class="ota-modal-btn-primary" id="modal-gmaps-link">
                        <span class="material-symbols-outlined">map</span>
                        Buka Rute di Google Maps
                    </a>
                    <a href="#" class="ota-modal-btn-primary" id="modal-package-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); display: none; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                        <span class="material-symbols-outlined">auto_awesome</span>
                        Buat Paket Wisata
                    </a>
                    <button class="ota-modal-btn-secondary" id="modal-save-btn" onclick="savePlaceToggle()" aria-label="Save place">
                        <span class="material-symbols-outlined" id="modal-save-icon">bookmark</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- ===================== JAVASCRIPT DIRECTORY ENGINE ===================== -->
    <script src="{{ asset('assets/js/directory-custom.js') }}"></script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
