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
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

    <!-- CSS -->
    <link rel="stylesheet" href="{{ asset('assets/css/global.css') }}" />
    <link rel="stylesheet" href="{{ asset('assets/css/code-2.css') }}" />

    <!-- JS -->
    <script src="{{ asset('assets/js/code-2.js') }}" defer></script>

    <style>
        .directory-layout {
            max-width: 80rem;
            margin: 0 auto;
            padding: 3rem 2rem 6rem;
            display: grid;
            grid-template-columns: 1fr;
            gap: 2.5rem;
        }

        @media (min-width: 1024px) {
            .directory-layout {
                grid-template-columns: 280px 1fr;
            }
        }

        /* Filter Sidebar Card */
        .filter-sidebar {
            position: sticky;
            top: calc(var(--nav-height) + 1.5rem);
            height: fit-content;
            background: #ffffff;
            border: 1px solid var(--color-surface-container-high);
            border-radius: var(--radius-xl);
            padding: 1.75rem;
            box-shadow: var(--shadow-sm);
        }

        @media (max-width: 1023px) {
            .filter-sidebar {
                position: relative !important;
                top: 0 !important;
                height: auto !important;
                margin-bottom: 0;
            }
        }

        .filter-section {
            margin-bottom: 2rem;
        }

        .filter-section:last-child {
            margin-bottom: 0;
        }

        .filter-title {
            font-family: var(--font-headline);
            font-size: 0.875rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-slate-700);
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .filter-title .material-symbols-outlined {
            font-size: 1.125rem;
            color: var(--color-primary);
        }

        /* Search input inside sidebar */
        .sidebar-search-wrap {
            position: relative;
            width: 100%;
        }

        .sidebar-search-wrap input {
            width: 100%;
            padding: 0.65rem 1rem 0.65rem 2.25rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-surface-container-high);
            background: var(--color-surface);
            font-family: var(--font-body);
            font-size: 0.875rem;
            outline: none;
            transition: var(--transition-normal);
        }

        .sidebar-search-wrap input:focus {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(0, 101, 101, 0.15);
            background: #ffffff;
        }

        .sidebar-search-icon {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1rem;
            color: var(--color-slate-400);
        }

        /* Sidebar Option Buttons */
        .filter-btn-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .filter-opt-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.625rem 0.875rem;
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--color-slate-600);
            transition: var(--transition-fast);
            text-align: left;
        }

        .filter-opt-btn:hover {
            background: var(--color-surface-container-low);
            color: var(--color-primary);
        }

        .filter-opt-btn.active {
            background: rgba(0, 101, 101, 0.08);
            color: var(--color-primary);
            font-weight: 700;
        }

        .filter-opt-btn .material-symbols-outlined {
            font-size: 1.125rem;
        }

        /* Grid results & count */
        .results-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .results-count {
            font-size: 0.9375rem;
            color: var(--color-slate-500);
            font-weight: 500;
        }

        .directory-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 2rem;
        }

        /* Pagination styles */
        .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            margin-top: 4rem;
            flex-wrap: wrap;
        }

        .pagination-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2.5rem;
            height: 2.5rem;
            padding: 0 0.5rem;
            border-radius: var(--radius-md);
            background: #ffffff;
            border: 1px solid var(--color-surface-container-high);
            color: var(--color-slate-600);
            font-size: 0.875rem;
            font-weight: 700;
            transition: var(--transition-fast);
            cursor: pointer;
        }

        .pagination-btn:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
            background: rgba(0, 101, 101, 0.04);
        }

        .pagination-btn.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 101, 101, 0.25);
        }

        .pagination-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            pointer-events: none;
        }

        .empty-results {
            grid-column: 1 / -1;
            text-align: center;
            padding: 6rem 2rem;
            background: #ffffff;
            border: 1px solid var(--color-surface-container-high);
            border-radius: var(--radius-xl);
            color: var(--color-slate-400);
        }

        .empty-results-icon {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            color: var(--color-slate-300);
        }

        .empty-results h4 {
            font-family: var(--font-headline);
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--color-slate-700);
            margin-bottom: 0.5rem;
        }

        /* Price Filter Specifics */
        .price-range-inputs {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .price-input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--color-surface-container-high);
            background: var(--color-surface);
            font-family: var(--font-body);
            font-size: 0.8125rem;
            outline: none;
            transition: var(--transition-normal);
        }

        .price-input:focus {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(0, 101, 101, 0.15);
            background: #ffffff;
        }

        .btn-price-action {
            padding: 0.5rem;
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            transition: var(--transition-fast);
        }

        #btn-apply-price {
            flex: 2;
            background: var(--color-primary);
            color: #ffffff;
        }

        #btn-apply-price:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        #btn-clear-price {
            flex: 1;
            background: var(--color-surface-container-high);
            color: var(--color-slate-600);
        }

        #btn-clear-price:hover {
            background: var(--color-surface-container-highest);
            color: var(--color-slate-800);
        }

        /* Premium Custom Dropdown styling */
        .custom-sort-dropdown {
            position: relative;
            display: inline-block;
            z-index: 100;
        }

        .sort-trigger-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid var(--color-surface-container-high);
            border-radius: var(--radius-lg);
            padding: 0.5rem 1rem;
            box-shadow: 0 4px 16px rgba(0, 101, 101, 0.04);
            cursor: pointer;
            transition: all var(--transition-normal);
            font-family: var(--font-body);
            font-size: 0.875rem;
            font-weight: 700;
            color: var(--color-slate-700);
            outline: none;
            width: auto;
            border-style: solid;
        }

        .sort-trigger-btn:hover {
            border-color: var(--color-primary);
            background: #ffffff;
            box-shadow: 0 6px 20px rgba(0, 101, 101, 0.08);
            transform: translateY(-1px);
        }

        .sort-trigger-btn:focus-visible {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(0, 101, 101, 0.15);
        }

        .sort-trigger-btn .sort-icon {
            font-size: 1.125rem;
            color: var(--color-primary);
        }

        .sort-trigger-btn .dropdown-arrow {
            font-size: 1.25rem;
            color: var(--color-slate-400);
            transition: transform var(--transition-fast);
            margin-left: 0.25rem;
        }

        .custom-sort-dropdown.open .dropdown-arrow {
            transform: rotate(180deg);
            color: var(--color-primary);
        }

        /* Dropdown options list styling */
        .sort-options-list {
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            background: #ffffff;
            border: 1px solid var(--color-surface-container-high);
            border-radius: var(--radius-lg);
            box-shadow: 0 10px 30px rgba(0, 101, 101, 0.12);
            padding: 0.5rem;
            margin: 0;
            list-style: none;
            width: 200px;
            display: none;
            flex-direction: column;
            gap: 0.25rem;
            transform-origin: top right;
            animation: dropdownScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes dropdownScaleIn {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(-5px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .custom-sort-dropdown.open .sort-options-list {
            display: flex;
        }

        .sort-opt-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            border-radius: var(--radius-md);
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--color-slate-600);
            cursor: pointer;
            transition: var(--transition-fast);
        }

        .sort-opt-item:hover {
            background: rgba(0, 101, 101, 0.05);
            color: var(--color-primary);
        }

        .sort-opt-item.active {
            background: rgba(0, 101, 101, 0.08);
            color: var(--color-primary);
            font-weight: 700;
        }

        .sort-opt-item .opt-icon {
            font-size: 1rem;
            color: var(--color-slate-400);
        }

        .sort-opt-item.active .opt-icon {
            color: var(--color-primary);
        }

        /* Responsive styling */
        @media (max-width: 640px) {
            .results-header-row {
                flex-direction: column;
                align-items: stretch;
                gap: 0.75rem;
            }
            .results-count {
                text-align: center;
                font-size: 0.875rem;
            }
            .custom-sort-dropdown {
                width: 100%;
            }
            .sort-trigger-btn {
                width: 100%;
                justify-content: center;
            }
            .sort-options-list {
                width: 100%;
                left: 0;
                right: 0;
                transform-origin: top center;
            }
        }
    </style>
</head>
<body>

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
                    <div class="results-count" id="results-count-label">Menghubungkan data...</div>
                    
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
                    <!-- Dynamic rendering by JS -->
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
                <span style="color:var(--color-slate-400); font-size:0.875rem;">12.4k pengunjung bulan ini</span>
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
    <script>
        // 2. IMAGE FALLBACK ERROR HANDLER
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

        // 3. EXPLORER SYSTEM MAIN ENGINE
        let searchIndex = [];
        let filteredIndex = [];
        let currentPage = 1;
        const itemsPerPage = 12;

        let activeCatFilter = 'Semua';
        let activeLocFilter = 'Semua';
        let searchQuery = '';

        // Price Filter State
        let activePriceTier = 'Semua';
        let customMinPrice = null;
        let customMaxPrice = null;
        let activeSortOption = 'default';

        // Dynamic price tier configurations matching our dataset statistics
        const priceTierConfigs = {
            'Semua': {
                Hemat: { label: 'Hemat (< Rp 50k)', min: 0, max: 50000 },
                Menengah: { label: 'Menengah (50k - 250k)', min: 50000, max: 250000 },
                Premium: { label: 'Premium (> Rp 250k)', min: 250000, max: Infinity }
            },
            'Wisata': {
                Hemat: { label: 'Hemat (< Rp 10k)', min: 0, max: 10000 },
                Menengah: { label: 'Menengah (10k - 50k)', min: 10000, max: 50000 },
                Premium: { label: 'Premium (> Rp 50k)', min: 50000, max: Infinity }
            },
            'Hotel': {
                Hemat: { label: 'Hemat (< Rp 150k)', min: 0, max: 150000 },
                Menengah: { label: 'Menengah (150k - 350k)', min: 150000, max: 350000 },
                Premium: { label: 'Premium (> Rp 350k)', min: 350000, max: Infinity }
            },
            'Kuliner': {
                Hemat: { label: 'Hemat (< Rp 15k)', min: 0, max: 15000 },
                Menengah: { label: 'Menengah (15k - 35k)', min: 15000, max: 35000 },
                Premium: { label: 'Premium (> Rp 35k)', min: 35000, max: Infinity }
            }
        };

        function updatePriceTierLabels(category) {
            const config = priceTierConfigs[category] || priceTierConfigs['Semua'];
            const hematLabel = document.getElementById('tier-label-hemat');
            const menengahLabel = document.getElementById('tier-label-menengah');
            const premiumLabel = document.getElementById('tier-label-premium');
            
            if (hematLabel) hematLabel.textContent = config.Hemat.label;
            if (menengahLabel) menengahLabel.textContent = config.Menengah.label;
            if (premiumLabel) premiumLabel.textContent = config.Premium.label;
        }

        const gridElement = document.getElementById('directory-grid');
        const countLabel = document.getElementById('results-count-label');
        const paginationControls = document.getElementById('pagination-controls');
        const searchInput = document.getElementById('dir-search-input');

        // Fetch dataset index dynamically
        fetch('/assets/search_index.json')
            .then(res => res.json())
            .then(data => {
                searchIndex = data;
                
                // Parse URL query parameter for search if exists!
                const urlParams = new URLSearchParams(window.location.search);
                const searchParam = urlParams.get('search') || urlParams.get('q');
                if (searchParam && searchInput) {
                    searchInput.value = searchParam;
                    searchQuery = searchParam.toLowerCase().trim();
                }
                
                applyFilters();
            })
            .catch(err => {
                console.error("Error loading directory index:", err);
                countLabel.textContent = "Gagal memuat data direktori.";
            });

        // Search Input listener
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                applyFilters();
            });
        }

        // Category buttons listeners
        const catButtons = document.querySelectorAll('[data-cat]');
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCatFilter = btn.dataset.cat;
                updatePriceTierLabels(activeCatFilter);
                applyFilters();
            });
        });

        // Location buttons listeners
        const locButtons = document.querySelectorAll('[data-loc]');
        locButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                locButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeLocFilter = btn.dataset.loc;
                applyFilters();
            });
        });

        // Price Tier buttons listeners
        const priceTierButtons = document.querySelectorAll('[data-price-tier]');
        priceTierButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                priceTierButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activePriceTier = btn.dataset.priceTier;
                
                // Clear custom price inputs when a quick tier is chosen
                const minInput = document.getElementById('price-min-input');
                const maxInput = document.getElementById('price-max-input');
                if (minInput) minInput.value = '';
                if (maxInput) maxInput.value = '';
                customMinPrice = null;
                customMaxPrice = null;
                
                applyFilters();
            });
        });

        // Format number helper (adds dots as thousands separators)
        function formatNumberInput(value) {
            let clean = value.replace(/\D/g, '');
            if (!clean) return '';
            return Number(clean).toLocaleString('id-ID');
        }

        // Custom price inputs formatting listeners
        const minInput = document.getElementById('price-min-input');
        const maxInput = document.getElementById('price-max-input');
        if (minInput && maxInput) {
            [minInput, maxInput].forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const cursorPosition = e.target.selectionStart;
                    const originalLength = e.target.value.length;
                    const formatted = formatNumberInput(e.target.value);
                    e.target.value = formatted;
                    
                    // Adjust cursor position to handle inserted dots
                    const newLength = formatted.length;
                    e.target.setSelectionRange(
                        cursorPosition + (newLength - originalLength),
                        cursorPosition + (newLength - originalLength)
                    );
                });
            });
        }

        // Apply custom price filter
        const btnApplyPrice = document.getElementById('btn-apply-price');
        if (btnApplyPrice) {
            btnApplyPrice.addEventListener('click', () => {
                const minVal = minInput ? minInput.value.replace(/\D/g, '') : '';
                const maxVal = maxInput ? maxInput.value.replace(/\D/g, '') : '';
                
                customMinPrice = minVal ? Number(minVal) : null;
                customMaxPrice = maxVal ? Number(maxVal) : null;
                
                // Deactivate tier buttons if custom prices are specified
                priceTierButtons.forEach(b => b.classList.remove('active'));
                
                // If custom range is applied, activePriceTier is Kustom
                activePriceTier = 'Kustom';
                
                applyFilters();
            });
        }

        // Reset price filters
        const btnClearPrice = document.getElementById('btn-clear-price');
        if (btnClearPrice) {
            btnClearPrice.addEventListener('click', () => {
                if (minInput) minInput.value = '';
                if (maxInput) maxInput.value = '';
                customMinPrice = null;
                customMaxPrice = null;
                
                priceTierButtons.forEach(b => b.classList.remove('active'));
                const allPriceBtn = document.querySelector('[data-price-tier="Semua"]');
                if (allPriceBtn) allPriceBtn.classList.add('active');
                
                activePriceTier = 'Semua';
                applyFilters();
            });
        }

        // Custom Premium Dropdown Event Listeners
        const customSortDropdown = document.getElementById('custom-sort-dropdown');
        const sortTriggerBtn = document.getElementById('sort-trigger-btn');
        const sortOptionsList = document.getElementById('sort-options-list');
        const selectedSortLabel = document.getElementById('selected-sort-label');
        const sortOptItems = document.querySelectorAll('.sort-opt-item');

        if (sortTriggerBtn && customSortDropdown) {
            // Toggle open on click
            sortTriggerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                customSortDropdown.classList.toggle('open');
                
                // Toggle accessibility attributes
                const isOpen = customSortDropdown.classList.contains('open');
                sortTriggerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!customSortDropdown.contains(e.target)) {
                    customSortDropdown.classList.remove('open');
                    sortTriggerBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // Option selection click handler
            sortOptItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = item.dataset.value;
                    
                    let cleanText = 'Rekomendasi';
                    if (val === 'price-asc') cleanText = 'Harga: Terendah ↑';
                    else if (val === 'price-desc') cleanText = 'Harga: Tertinggi ↓';
                    
                    if (selectedSortLabel) selectedSortLabel.textContent = cleanText;

                    sortOptItems.forEach(opt => opt.classList.remove('active'));
                    item.classList.add('active');

                    activeSortOption = val;
                    customSortDropdown.classList.remove('open');
                    sortTriggerBtn.setAttribute('aria-expanded', 'false');
                    applyFilters();
                });
            });
        }

        function applyFilters() {
            currentPage = 1;

            filteredIndex = searchIndex.filter(item => {
                // Category filter
                const matchesCat = (activeCatFilter === 'Semua' || item.Kategori === activeCatFilter);

                // Location filter
                let matchesLoc = true;
                if (activeLocFilter !== 'Semua') {
                    const link = (item.Link || "").toLowerCase();
                    const subcat = (item.Sub_Kategori || "").toLowerCase();
                    const name = (item.Nama_Tempat || "").toLowerCase();
                    const lat = Number(item.Latitude);
                    const lng = Number(item.Longitude);

                    // High-precision geographic coordinate classification for Malang Raya
                    // 1. Kota Malang: Central dense urban area
                    const isKotaMalangCoords = (lat <= -7.91 && lat >= -8.04 && lng >= 112.58 && lng <= 112.69);
                    
                    // 2. Kota Batu: Northwest mountainous area (excluding western districts Pujon/Ngantang/Kasembon)
                    const isBatuCoords = (lat <= -7.74 && lat >= -7.92 && lng >= 112.475 && lng <= 112.578);

                    // Default to Kabupaten Malang (since it surrounds both Kota Malang and Batu)
                    let itemLoc = "Kab. Malang";
                    
                    if (isKotaMalangCoords && !name.includes("kabupaten") && !link.includes("kabupaten")) {
                        itemLoc = "Kota Malang";
                    } else if (isBatuCoords || name.includes("batu") || link.includes("batu") || subcat.includes("batu")) {
                        // Exclude western districts (Pujon, Ngantang, Kasembon) which are Kabupaten Malang
                        const isWesternKabMalang = (lng < 112.47 || name.includes("pujon") || name.includes("ngantang") || name.includes("kasembon") || link.includes("pujon") || link.includes("ngantang") || link.includes("kasembon"));
                        if (!isWesternKabMalang) {
                            itemLoc = "Batu";
                        }
                    }

                    // Apply filter based on target active location
                    if (activeLocFilter === 'Batu') {
                        matchesLoc = (itemLoc === "Batu");
                    } else if (activeLocFilter === 'Kota Malang') {
                        matchesLoc = (itemLoc === "Kota Malang");
                    } else if (activeLocFilter === 'Kab. Malang') {
                        matchesLoc = (itemLoc === "Kab. Malang");
                    }
                }

                // Search query filter
                const matchesSearch = (searchQuery === '' || 
                    item.Nama_Tempat.toLowerCase().includes(searchQuery) || 
                    item.Sub_Kategori.toLowerCase().includes(searchQuery) ||
                    item.Kategori.toLowerCase().includes(searchQuery)
                );

                // Price filter
                let matchesPrice = true;
                if (customMinPrice !== null || customMaxPrice !== null) {
                    const price = item.Estimasi_Harga || 0;
                    const min = customMinPrice !== null ? customMinPrice : 0;
                    const max = customMaxPrice !== null ? customMaxPrice : Infinity;
                    matchesPrice = (price >= min && price <= max);
                } else if (activePriceTier !== 'Semua') {
                    const price = item.Estimasi_Harga || 0;
                    const catConfig = priceTierConfigs[activeCatFilter] || priceTierConfigs['Semua'];
                    const tier = catConfig[activePriceTier];
                    if (tier) {
                        matchesPrice = (price >= tier.min && price <= tier.max);
                    }
                }

                return matchesCat && matchesLoc && matchesSearch && matchesPrice;
            });

            // Apply sorting
            if (activeSortOption === 'price-asc') {
                filteredIndex.sort((a, b) => (a.Estimasi_Harga || 0) - (b.Estimasi_Harga || 0));
            } else if (activeSortOption === 'price-desc') {
                filteredIndex.sort((a, b) => (b.Estimasi_Harga || 0) - (a.Estimasi_Harga || 0));
            }

            // Update header count
            countLabel.textContent = `Menampilkan ${filteredIndex.length} dari ${searchIndex.length} objek terkurasi`;

            renderGrid();
        }

        function fmtRupiah(num) {
            return 'Rp ' + Math.round(num).toLocaleString('id-ID');
        }

        function renderGrid() {
            if (!gridElement) return;
            gridElement.innerHTML = '';

            if (filteredIndex.length === 0) {
                gridElement.innerHTML = `
                    <div class="empty-results">
                        <span class="material-symbols-outlined empty-results-icon">sentiment_dissatisfied</span>
                        <h4>Destinasi Tidak Ditemukan</h4>
                        <p>Cobalah menyaring dengan kata kunci lain atau ubah filter kategori/wilayah Anda.</p>
                    </div>
                `;
                paginationControls.innerHTML = '';
                return;
            }

            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, filteredIndex.length);
            const paginatedItems = filteredIndex.slice(startIndex, endIndex);

            paginatedItems.forEach(item => {
                const hasImg = item.Gambar && item.Gambar.length > 0;
                const imgHTML = hasImg
                    ? `<img class="ota-card-img" src="${item.Gambar[0]}" alt="${item.Nama_Tempat}" onerror="handleImgError(this)" />`
                    : `<div class="ota-shimmer-placeholder">
                           <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                           <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                       </div>`;

                const priceLabel = item.Kategori === 'Wisata' ? 'Tiket Masuk' : (item.Kategori === 'Hotel' ? 'Per Malam' : 'Menu Porsi');
                const priceFormatted = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';

                gridElement.innerHTML += `
                    <div class="ota-carousel-card" style="width:100%; min-width:unset" onclick="openOtaDetail(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <div class="ota-card-img-wrapper">
                            ${imgHTML}
                            <span class="ota-card-badge">${item.Kategori}</span>
                            <span class="ota-card-rating">
                                <span class="material-symbols-outlined star-icon">star</span>
                                ${Number(item.Rating).toFixed(1)}
                            </span>
                        </div>
                        <div class="ota-card-body">
                            <div class="ota-card-subcat">${item.Sub_Kategori}</div>
                            <h4 class="ota-card-title">${item.Nama_Tempat}</h4>
                            <div class="ota-card-footer">
                                <div>
                                    <div class="ota-card-price-label">${priceLabel}</div>
                                    <div class="ota-card-price-value">${priceFormatted}</div>
                                </div>
                                <button class="ota-card-btn">
                                    Detail
                                    <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            renderPaginationControls();
        }

        function renderPaginationControls() {
            if (!paginationControls) return;
            paginationControls.innerHTML = '';

            const totalPages = Math.ceil(filteredIndex.length / itemsPerPage);
            if (totalPages <= 1) return;

            // Previous Button
            paginationControls.innerHTML += `
                <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" onclick="changePage(${currentPage - 1})">
                    <span class="material-symbols-outlined">chevron_left</span>
                </button>
            `;

            // Max visible page numbers = 5
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            if (startPage > 1) {
                paginationControls.innerHTML += `
                    <button class="pagination-btn" onclick="changePage(1)">1</button>
                    ${startPage > 2 ? '<span style="color:var(--color-slate-400);padding:0 4px">...</span>' : ''}
                `;
            }

            for (let i = startPage; i <= endPage; i++) {
                paginationControls.innerHTML += `
                    <button class="pagination-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
                `;
            }

            if (endPage < totalPages) {
                paginationControls.innerHTML += `
                    ${endPage < totalPages - 1 ? '<span style="color:var(--color-slate-400);padding:0 4px">...</span>' : ''}
                    <button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>
                `;
            }

            // Next Button
            paginationControls.innerHTML += `
                <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" onclick="changePage(${currentPage + 1})">
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            `;
        }

        window.changePage = function(page) {
            currentPage = page;
            renderGrid();
            
            // Smooth scroll grid to top
            window.scrollTo({
                top: document.querySelector('.directory-layout').offsetTop - 100,
                behavior: 'smooth'
            });
        };


        // 4. DETAILED MODAL ENGINE (COPY-PASTE COMPATIBILITY FROM HOMEPAGE)
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

            document.getElementById('modal-place-title').textContent = item.Nama_Tempat;
            document.getElementById('modal-place-cat').textContent = item.Kategori;
            document.getElementById('modal-place-subcat').textContent = item.Sub_Kategori;
            document.getElementById('modal-place-rating').textContent = Number(item.Rating).toFixed(1);
            document.getElementById('modal-place-reviews').textContent = item.Jumlah_Ulasan.toLocaleString('id-ID') + ' ulasan';
            
            const priceLabel = document.getElementById('modal-price-label');
            if (item.Kategori === 'Wisata') {
                priceLabel.textContent = 'Tiket Masuk';
            } else if (item.Kategori === 'Hotel') {
                priceLabel.textContent = 'Per Malam';
            } else {
                priceLabel.textContent = 'Menu Porsi';
            }

            document.getElementById('modal-place-price').textContent = item.Estimasi_Harga > 0 ? fmtRupiah(item.Estimasi_Harga) : 'Gratis';

            let desc = `Jelajahi keindahan ${item.Nama_Tempat} di Malang Raya. Destinasi spektakuler dengan kategori ${item.Kategori} (${item.Sub_Kategori}) ini dikurasi secara cerdas menggunakan algoritma Fuzzy C-Means Clustering untuk memastikan keharmonisan perjalanan Anda sesuai anggaran.`;
            if (item.Kategori === 'Hotel') {
                desc = `Temukan kenyamanan menginap premium di ${item.Nama_Tempat}. Akomodasi ideal di Malang Raya ini terpilih secara cerdas oleh kecerdasan FCM untuk menghadirkan kenyamanan beristirahat dengan harga yang paling proporsional untuk Anda.`;
            } else if (item.Kategori === 'Kuliner') {
                desc = `Nikmati cita rasa kuliner terbaik di ${item.Nama_Tempat}. Tempat makan favorit ini menyajikan menu lezat khas ${item.Sub_Kategori} yang melengkapi kepuasan perjalanan kuliner Anda selama menjelajahi wilayah Malang Raya.`;
            }
            document.getElementById('modal-place-desc').textContent = desc;

            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.Nama_Tempat + " Malang")}`;
            document.getElementById('modal-gmaps-link').href = mapsUrl;

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

            // Check bookmark
            const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
            const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
            const uniqueId = `${item.Kategori}_${item.Id_Tempat}`;
            const isSaved = saved.some(id => id === uniqueId || id === item.Id_Tempat);
            const saveIcon = document.getElementById('modal-save-icon');
            if (saveIcon) {
                saveIcon.textContent = isSaved ? 'bookmark_added' : 'bookmark';
                saveIcon.style.color = isSaved ? 'var(--color-primary)' : 'inherit';
            }

            renderModalSlideshow();
            detailModal.classList.add('show');
        };

        window.closeOtaDetail = function() {
            detailModal.classList.remove('show');
            clearInterval(modalSlideInterval);
        };

        function renderModalSlideshow() {
            modalTrack.innerHTML = '';
            modalIndicators.innerHTML = '';
            
            const imgs = activePlace.Gambar || [];
            
            if (imgs.length === 0) {
                modalTrack.innerHTML = `
                    <div class="ota-modal-gallery-slide">
                        <div class="ota-shimmer-placeholder">
                            <span class="material-symbols-outlined ota-shimmer-icon">image_not_supported</span>
                            <span class="ota-shimmer-text">Gambar Tidak Tersedia</span>
                        </div>
                    </div>
                `;
                modalPrev.style.display = 'none';
                modalNext.style.display = 'none';
                return;
            }

            modalPrev.style.display = imgs.length > 1 ? 'flex' : 'none';
            modalNext.style.display = imgs.length > 1 ? 'flex' : 'none';

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

            slideModalTo(0);
            
            clearInterval(modalSlideInterval);
            if (imgs.length > 1) {
                modalSlideInterval = setInterval(() => {
                    slideModalNext();
                }, 3500);
            }
        }

        function slideModalTo(index) {
            const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
            if (count <= 1) return;

            modalImgIndex = index;
            modalTrack.style.transform = `translateX(-${index * 100}%)`;

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
            slideModalTo(nextIdx);
        }

        function slideModalPrev() {
            const count = activePlace.Gambar ? activePlace.Gambar.length : 0;
            if (count <= 1) return;
            const prevIdx = (modalImgIndex - 1 + count) % count;
            slideModalTo(prevIdx);
        }

        if (modalPrev) modalPrev.addEventListener('click', () => { slideModalPrev(); clearInterval(modalSlideInterval); });
        if (modalNext) modalNext.addEventListener('click', () => { slideModalNext(); clearInterval(modalSlideInterval); });

        window.savePlaceToggle = function() {
            if (!activePlace) return;
            const savedPlacesKey = typeof window.getSavedPlacesKey === 'function' ? window.getSavedPlacesKey() : 'saved_places';
            const saved = JSON.parse(localStorage.getItem(savedPlacesKey) || '[]');
            const uniqueId = `${activePlace.Kategori}_${activePlace.Id_Tempat}`;
            const index = saved.findIndex(id => id === uniqueId || id === activePlace.Id_Tempat);
            const saveIcon = document.getElementById('modal-save-icon');

            if (index > -1) {
                saved.splice(index, 1);
                saveIcon.textContent = 'bookmark';
                saveIcon.style.color = 'inherit';
            } else {
                saved.push(uniqueId);
                saveIcon.textContent = 'bookmark_added';
                saveIcon.style.color = 'var(--color-primary)';
            }
            localStorage.setItem(savedPlacesKey, JSON.stringify(saved));
            if (window.updateNavbarBookmarkBadge) window.updateNavbarBookmarkBadge();
        };

        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal) closeOtaDetail();
            });
        }
    </script>
    @include('bookmark-drawer-and-modal')
    <script src="{{ asset('assets/js/bookmark-drawer.js') }}"></script>
    @include('auth-modal-and-dropdown')
</body>
</html>
